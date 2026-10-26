import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {evaluateParallel,type CriterionProgress,type JudgeStrategy,type JudgeStageStore} from '../src/services/parallelJudgeService';
import {handleJudgeStream,judgeStreamEnabled} from '../src/services/judgeStreamService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
import {ApiAccessError} from '../src/services/apiAuthorizationService';
import {AiServerError} from '../src/services/apiServerService';

// On-demand AI Judge: per-criterion streaming, stage reuse and the async SSE route. Mocked provider and HTTP only.
const base={learnerPrompt:'Classify ticket 42 with the SOP.',generatedOutput:'| 42 | normal |',taskRequirement:'Classify.',scenario:'Fictional',controlData:'[SOP:QA:v1]',language:'en' as const};
const reply=(value:unknown)=>({output:JSON.stringify(value),model:'gemini-3.8-flash',tokens:1});
const row=(c:any)=>({score:c.weight/10,reasonEn:'Ok.',reasonVi:'Ổn.',improvementEn:'Keep.',improvementVi:'Giữ.'});
const all=(cs:any[])=>Object.fromEntries(cs.map(c=>[c.key,row(c)]));
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const stageOf=(payload:any)=>{const input=JSON.parse(payload.contents[0].parts[0].text);return input.criterion?'criterion:'+input.criterion.key:input.stage;};
const model=(offTask:boolean,supervisorMs:number,log:string[])=>async(payload:any)=>{
 const input=JSON.parse(payload.contents[0].parts[0].text),sup={taskAttempt:!offTask,summaryEn:'S.',summaryVi:'T.'};
 if(input.stage==='supervisor'){await wait(supervisorMs);log.push('supervisor');return reply(sup);}
 if(input.stage==='criterion'){log.push('worker');return reply({key:input.criterion.key,...row(input.criterion)});}
 if(input.stage==='criteria')return reply({criteria:all(input.criteria)});
 return reply({...sup,criteria:all(input.rubric)});
};
const quiet=async<T>(work:()=>Promise<T>)=>{const warn=console.warn,error=console.error;console.warn=console.error=()=>{};try{return await work();}finally{console.warn=warn;console.error=error;}};
const memoryStore=()=>{const rows:Record<string,{sha:string;result:unknown;view:any}>={};let saves=0;
 const store:JudgeStageStore={async load(){return Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,{sha:v.sha,result:v.result}]));},async save(stage,sha,result,view){saves++;rows[stage]={sha,result,view};}};
 return {store,rows,saves:()=>saves};};

// 1. Rows stream only after the task-attempt verdict, match the saved grade, and never appear for off-task prompts.
for(const strategy of ['parallel-v1','consolidated-v1','integrated-v1'] as JudgeStrategy[]){
 const log:string[]=[],rows:CriterionProgress[]=[];
 const grade:any=await evaluateParallel(base,DEFAULT_RUBRIC,model(false,20,log),50000,strategy,{onCriterion:r=>{log.push('emit');rows.push(r);}});
 assert.equal(rows.length,5,strategy+' streams every criterion');
 for(const r of rows)assert.equal(r.score,grade.criteria.find((c:any)=>c.key===r.key).score,strategy+' streamed score equals saved score');
 if(strategy!=='integrated-v1')assert.ok(log.indexOf('supervisor')<log.indexOf('emit'),strategy+' holds rows until the supervisor verdict');
 const offRows:CriterionProgress[]=[];
 const off:any=await evaluateParallel(base,DEFAULT_RUBRIC,model(true,0,[]),50000,strategy,{onCriterion:r=>offRows.push(r)});
 assert.equal(offRows.length,0,strategy+' streams nothing for an off-task prompt');assert.equal(off.total,0);
}
{
 const grade:any=await evaluateParallel(base,DEFAULT_RUBRIC,model(false,0,[]),50000,'parallel-v1',{onCriterion:()=>{throw Error('ui');}});
 assert.equal(grade.criteria.length,5,'a throwing listener cannot break grading');
 const rows:CriterionProgress[]=[];
 const failing=async(payload:any)=>{if(stageOf(payload)==='criterion:format')throw new AiServerError('bad',502);return model(false,0,[])(payload);};
 await assert.rejects(quiet(()=>evaluateParallel(base,DEFAULT_RUBRIC,failing,50000,'parallel-v1',{onCriterion:r=>rows.push(r)})),(e:any)=>e.statusCode===502);
 assert.ok(rows.length>0&&rows.every(r=>r.key!=='format'),'provisional rows only; no score recorded');
}

// 2. Stage persistence: a redispatch grades only the unfinished stage; identical results; changed evidence re-grades.
{
 const {store,rows,saves}=memoryStore();const calls:string[]=[];
 const flaky=async(payload:any)=>{const stage=stageOf(payload);calls.push(stage);if(stage==='criterion:format')throw new AiServerError('capacity',503);return model(false,0,[])(payload);};
 await assert.rejects(quiet(()=>evaluateParallel(base,DEFAULT_RUBRIC,flaky,50000,'parallel-v1',{stages:store})),(e:any)=>e.statusCode===503);
 assert.equal(calls.filter(s=>s==='criterion:format').length,2,'one jittered stage retry, never more');
 assert.deepEqual(Object.keys(rows).sort(),['criterion:actionability','criterion:groundedness','criterion:oneshot','criterion:persona','supervisor'],'finished stages are stored even when the grade fails');
 assert.equal(rows.supervisor.view.taskAttempt,true);assert.equal(rows['criterion:persona'].view.max,2);
 calls.length=0;
 const resumed:any=await evaluateParallel(base,DEFAULT_RUBRIC,async payload=>{calls.push(stageOf(payload));return model(false,0,[])(payload);},270000,'parallel-v1',{stages:store});
 assert.deepEqual(calls,['criterion:format'],'redispatch calls the provider only for the missing stage');
 assert.equal(resumed.total,10);assert.equal(resumed.judge.providerAttempts,1);
 assert.equal(resumed.judge.stages.filter((s:any)=>s.attempts===0).length,5,'reused stages are visible in diagnostics');
 const fresh:any=await evaluateParallel(base,DEFAULT_RUBRIC,model(false,0,[]),50000);
 assert.deepEqual(resumed.criteria,fresh.criteria,'reused stages give the same weighted-v1 result');
 calls.length=0;const before=saves();
 await evaluateParallel({...base,generatedOutput:'different output'},DEFAULT_RUBRIC,async payload=>{calls.push(stageOf(payload));return model(false,0,[])(payload);},50000,'parallel-v1',{stages:store});
 // The supervisor never sees the generated output, so its identical payload is reused; every criterion is re-graded.
 assert.deepEqual(calls.sort(),['criterion:actionability','criterion:format','criterion:groundedness','criterion:oneshot','criterion:persona'],'a different payload never reuses a stored stage');assert.equal(saves()-before,5);
 // A corrupt stored row is ignored and graded again; an unreadable store disables reuse but not grading.
 rows['criterion:format'].result={key:'format',score:999};
 calls.length=0;
 await evaluateParallel({...base,generatedOutput:'different output'},DEFAULT_RUBRIC,async payload=>{calls.push(stageOf(payload));return model(false,0,[])(payload);},50000,'parallel-v1',{stages:store});
 assert.deepEqual(calls,['criterion:format']);
 const broken:JudgeStageStore={load:async()=>{throw Error('42P01 missing table');},save:async()=>{throw Error('42P01');}};
 assert.equal((await quiet(()=>evaluateParallel(base,DEFAULT_RUBRIC,model(false,0,[]),50000,'parallel-v1',{stages:broken})) as any).total,10,'020 not applied: grading still works');
}

// 3. Concurrency: 30 grades at once with random latency and capacity errors stay bounded (no retry storm).
{
 let inFlight=0,peak=0,attempts=0;const perGrade:number[]=[];
 const results=await quiet(()=>Promise.allSettled(Array.from({length:30},async(_,n)=>{
  let mine=0;
  const call=async(payload:any)=>{mine++;attempts++;inFlight++;peak=Math.max(peak,inFlight);
   try{await wait(5+((n*7+mine*13)%40));if((n+mine)%9===0)throw new AiServerError('capacity',429);return model(n%10===0,0,[])(payload);}finally{inFlight--;}};
  try{return await evaluateParallel(base,DEFAULT_RUBRIC,call,50000);}finally{perGrade.push(mine);}
 })));
 assert.ok(perGrade.every(n=>n<=12),'never more than two attempts per stage');
 assert.ok(attempts<=30*12);assert.ok(peak<=30*6,'no more than one in-flight attempt per stage without hedging');
 for(const r of results)if(r.status==='fulfilled')assert.equal((r.value as any).criteria.length,5);else assert.equal((r.reason as any).statusCode,429);
 assert.ok(results.some(r=>r.status==='fulfilled'),'most grades recover with stage-only retries');
}

// 4. HTTP route. Async: enqueue then watch; resume never enqueues; denials keep JSON status; terminal states map to events.
class FakeRes extends EventEmitter{status=0;headers:Record<string,string>={};chunks:string[]=[];headersSent=false;writableEnded=false;
 writeHead(status:number,headers:Record<string,string>={}){this.status=status;this.headersSent=true;for(const [k,v] of Object.entries(headers))this.headers[k.toLowerCase()]=v;return this;}
 write(chunk:string){this.chunks.push(chunk);return true;}
 end(chunk?:string){if(chunk)this.chunks.push(chunk);this.writableEnded=true;}
 get events(){return this.chunks.join('').split('\n\n').filter(b=>b.startsWith('event:')).map(b=>({event:/event: (\w+)/.exec(b)?.[1],data:JSON.parse(/data: (.*)/.exec(b)![1])}));}}
const req={headers:{authorization:'Bearer offline'}} as any;
const ids={classId:'11111111-1111-4111-8111-111111111111',lessonId:'22222222-2222-4222-8222-222222222222',attemptId:'33333333-3333-4333-8333-333333333333'};
const allow=async()=>({}) as any;
{
 let enqueued=0;const enqueue=async()=>{enqueued++;return {async:true,status:'queued'};};
 const watch=(async(_a:string,body:any,o:any)=>{assert.equal(body.attemptId,ids.attemptId);o.onStatus('queued');o.onStatus('running');o.onProgress(2);o.onCriterion({key:'format',score:2});o.onCriterion({key:'persona',score:2});return {status:'succeeded',evaluation:{total:9}};}) as any;
 const res=new FakeRes();
 await handleJudgeStream(req,res as any,{...ids,language:'en'},{async:true,enqueue,watch,access:allow});
 assert.equal(res.status,200);assert.match(res.headers['content-type'],/text\/event-stream/);assert.equal(enqueued,1);
 // queued is sent as soon as the job exists (before the first status read) and not repeated by the watcher.
 assert.deepEqual(res.events.map(e=>e.event),['status','status','progress','criterion','criterion','done']);assert.deepEqual(res.events.at(-1)!.data,{total:9});
 assert.deepEqual(res.events.slice(0,3).map(e=>e.data),[{status:'queued'},{status:'running'},{graded:2}],'progress carries a count only, never keys or scores');
 const resumed=new FakeRes();
 await handleJudgeStream(req,resumed as any,{...ids,resume:true},{async:true,enqueue,watch,access:allow});
 assert.equal(enqueued,1,'resume only watches: no new job, no budget');assert.equal(resumed.events.at(-1)!.event,'done');
 assert.equal(resumed.events[0].event,'status','resume reports the watched status');
 const graded=new FakeRes();
 await handleJudgeStream(req,graded as any,ids,{async:true,enqueue:async()=>({total:7}),watch,access:allow});
 assert.deepEqual(graded.events,[{event:'done',data:{total:7}}],'an already graded attempt replays its score');
 const busy=new FakeRes();
 await quiet(()=>handleJudgeStream(req,busy as any,ids,{async:true,enqueue:async()=>{throw new ApiAccessError('Judge quota reached',429);},watch,access:allow}));
 assert.equal(busy.status,429);assert.match(busy.headers['content-type'],/application\/json/);
 const failed=new FakeRes();
 await quiet(()=>handleJudgeStream(req,failed as any,ids,{async:true,enqueue,watch:(async()=>({status:'failed',errorCode:'provider_429'})) as any,access:allow}));
 assert.deepEqual(failed.events.at(-1),{event:'error',data:{status:409,judgeStatus:'failed',errorCode:'provider_429',error:'AI Judge did not finish.'}});
 // Resume ownership denial happens before the first event: JSON 403, no stream opened.
 const foreign=new FakeRes();
 await quiet(()=>handleJudgeStream(req,foreign as any,{...ids,resume:true},{async:true,enqueue,watch:(async()=>{throw new ApiAccessError('Attempt không thuộc người học hiện tại.',403);}) as any,access:allow}));
 assert.equal(foreign.status,403);assert.match(foreign.headers['content-type'],/application\/json/);assert.deepEqual(foreign.events,[]);
 const window=new FakeRes();
 await handleJudgeStream(req,window as any,ids,{async:true,enqueue,watch:(async()=>({status:'watching'})) as any,access:allow});
 assert.equal(window.events.at(-1)!.event,'resume','watch window end tells the client to keep polling');
 // Disconnect: the watch is aborted (the queued job is untouched) and nothing more is written.
 const gone=new FakeRes();let aborted=false;
 await handleJudgeStream(req,gone as any,ids,{async:true,enqueue,watch:(async(_a:string,_b:any,o:any)=>{gone.emit('close');aborted=o.signal.aborted;o.onCriterion({key:'format'});return {status:'running'};}) as any,access:allow});
 assert.equal(aborted,true);assert.deepEqual(gone.events.map(e=>e.event),['status'],'only the enqueue status; nothing after the disconnect');
}
{
 const res=new FakeRes();let called=false;
 await quiet(()=>handleJudgeStream(req,res as any,{...ids,attemptId:'x'},{async:true,enqueue:async()=>{called=true;},access:allow}));
 assert.equal(res.status,400);assert.equal(called,false,'invalid ids never reach grading');
 const denied=new FakeRes();
 await quiet(()=>handleJudgeStream(req,denied as any,ids,{async:true,enqueue:async()=>{called=true;},access:async()=>{throw new ApiAccessError('Not enrolled',403);}}));
 assert.equal(denied.status,403);assert.equal(called,false);
 // Synchronous Judge (async not configured) keeps the direct path.
 const sync=new FakeRes();
 await handleJudgeStream(req,sync as any,ids,{async:false,evaluate:async(_a,_b,onCriterion)=>{onCriterion({key:'format'});return {total:1};},access:allow});
 assert.deepEqual(sync.events.map(e=>e.event),['criterion','done']);
 const late=new FakeRes();
 await quiet(()=>handleJudgeStream(req,late as any,ids,{async:false,evaluate:async(_a,_b,onCriterion)=>{onCriterion({key:'format'});throw new AiServerError('AI Judge timed out',504);},access:allow}));
 assert.deepEqual(late.events.map(e=>e.event),['criterion','error']);assert.equal(late.events[1].data.status,504);
}

// 5. Flags: off by default; on for async only with a valid queue; never on workers.
const saved={...process.env};
try{
 for(const k of ['JUDGE_STREAM','JUDGE_MODE','JUDGE_QUEUE','JUDGE_WORKER_URL','RUNTIME_MODE','AI_WORKER_ISOLATED'])delete process.env[k];
 assert.equal(judgeStreamEnabled(),false,'off by default');
 process.env.JUDGE_STREAM='true';assert.equal(judgeStreamEnabled(),true,'synchronous Judge');
 process.env.JUDGE_MODE='async';assert.equal(judgeStreamEnabled(),false,'misconfigured async stays off');
 process.env.JUDGE_QUEUE='projects/p/locations/asia-southeast1/queues/judge';process.env.JUDGE_WORKER_URL='https://worker.example.test/';
 assert.equal(judgeStreamEnabled(),true,'async Judge streams via the queue');
 process.env.RUNTIME_MODE='ai-worker';assert.equal(judgeStreamEnabled(),false);
}finally{process.env=saved;}
console.log('Judge stream PASS: verdict-gated rows, stage reuse on redispatch, bounded concurrency, async SSE enqueue/resume/terminal events, flags.');
