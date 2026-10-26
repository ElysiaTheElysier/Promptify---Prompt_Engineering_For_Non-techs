import assert from 'node:assert/strict';
// Fault injection through the real async Judge path (SSE handler -> enqueue -> Cloud Tasks stub -> worker ->
// parallel-v1 engine -> SQL stage store -> watcher): hang/hedge, 429 stage retry, persistent 429 -> queue retry
// with stage reuse, 504 timeout retry, and invalid output. Offline only; no Gemini.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';process.env.JUDGE_FENCING_MODE='sql';
process.env.JUDGE_MODE='async';process.env.JUDGE_QUEUE='projects/p/locations/asia-southeast1/queues/judge';process.env.JUDGE_WORKER_URL='https://worker.example.test/';
const {judgeFixture,StreamRes,answer,stageOf,reply}=await import('./judgeE2eFixture');
const {createRebuildRunService}=await import('../src/services/rebuildRunService');
const {handleJudgeStream}=await import('../src/services/judgeStreamService');
const {assertAiLessonAccess}=await import('../src/services/apiAuthorizationService');
const {evaluateParallel,JUDGE_HEDGE_AFTER_MS}=await import('../src/services/parallelJudgeService');
const {AiServerError}=await import('../src/services/apiServerService');
const {DEFAULT_RUBRIC}=await import('../src/services/weightedRubricService');
const fx=await judgeFixture(2,8);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
type Fault=(stage:string,attempt:number)=>Promise<'ok'|number|'bad'|'hang'>;
let fault:Fault=async()=>'ok';const calls:string[]=[];const seen=new Map<string,number>();
const call=async(payload:any)=>{
  const stage=stageOf(payload),n=(seen.get(stage)||0)+1;seen.set(stage,n);calls.push(stage);
  const f=await fault(stage,n);
  if(f==='hang'){await sleep(JUDGE_HEDGE_AFTER_MS+2500);return answer(payload);}
  if(f==='bad')return reply({key:'format',score:0.37,reasonEn:'x',reasonVi:'y',improvementEn:'z',improvementVi:'w'});
  if(typeof f==='number')throw new AiServerError('injected '+f,f);
  await sleep(30);return answer(payload);
};
const evaluate=(input:any,deadline?:number,hooks?:any)=>evaluateParallel({...input,taskRequirement:'Task',learnerPrompt:'Task prompt',generatedOutput:'Saved output'},DEFAULT_RUBRIC,call,deadline,'parallel-v1',hooks);
const dispatches:Array<{http:number;status:string}>=[];let service:any;
// Cloud Tasks stub: dispatch, and redispatch after a 503 (the real queue backs off >=30s; 1 s here).
const dispatch=async(t:any)=>{const r=await service.runJudgeJob(t.token,t.attemptId);dispatches.push(r);if(r.http===503)setTimeout(()=>void dispatch(t),1000);};
service=createRebuildRunService(undefined as any,undefined,evaluate,undefined,undefined,{queue:async t=>{setTimeout(()=>void dispatch(t),20);}});
const deps={async:true,enqueue:service.enqueueJudge,watch:service.watchJudge,access:assertAiLessonAccess} as any;
const quiet=async<T>(work:()=>Promise<T>)=>{const e=console.error,w=console.warn,l=console.log;console.error=console.warn=console.log=()=>{};try{return await work();}finally{console.error=e;console.warn=w;console.log=l;}};
const run=async(g:number,f:Fault)=>{fault=f;calls.length=0;seen.clear();dispatches.length=0;const res=new StreamRes();
  await quiet(()=>handleJudgeStream({headers:{authorization:'Bearer tok-1'}} as any,res as any,fx.body(1,g),deps));
  const metrics=(await fx.db.query('SELECT status,dispatch_count,generation FROM product_judge_jobs WHERE attempt_id=$1',[fx.body(1,g).attemptId])).rows[0] as any;
  return {res,calls:[...calls],dispatches:[...dispatches],job:metrics};};
const done=(r:any)=>r.res.at.at(-1);

// 1. Hang: one criterion never answers in time -> hedged at 10 s, first answer wins, one dispatch, 7 calls.
{
  const r=await run(1,async(stage,n)=>stage==='criterion:format'&&n===1?'hang':'ok');
  assert.equal(done(r).ev,'done');assert.equal(done(r).data.total,10);
  assert.equal(r.calls.filter(s=>s==='criterion:format').length,2);assert.equal(r.calls.length,7);
  assert.ok(done(r).ms>=JUDGE_HEDGE_AFTER_MS&&done(r).ms<JUDGE_HEDGE_AFTER_MS+2000,'grade at the hedge, not at the 25 s cap');
  assert.deepEqual([r.job.status,r.job.dispatch_count],['succeeded',1]);
}
// 2. One 429: only that stage retries (jittered); no queue retry. Hedging then pauses for the cooldown.
{
  const r=await run(2,async(stage,n)=>stage==='supervisor'&&n===1?429:'ok');
  assert.equal(done(r).data.total,10);assert.equal(r.calls.length,7);
  assert.deepEqual([r.job.status,r.job.dispatch_count],['succeeded',1]);
}
// 3. Persistent 429 on one criterion: job -> retry_wait (stream shows it), redispatch grades only that criterion.
{
  const r=await run(3,async(stage)=>stage==='criterion:persona'&&!dispatches.length?429:'ok');
  assert.equal(done(r).ev,'done');assert.equal(done(r).data.total,10);
  assert.ok(r.res.at.some(e=>e.ev==='status'&&e.data.status==='retry_wait'),'learner sees the automatic retry');
  assert.ok(r.res.at.some(e=>e.ev==='progress'&&e.data.graded>=4),'finished criteria are counted while waiting');
  assert.deepEqual(r.dispatches.map(d=>d.status),['retry_wait','succeeded']);
  assert.equal(r.calls.filter(s=>s==='criterion:persona').length,3,'2 attempts in dispatch 1, 1 in dispatch 2');
  assert.equal(r.calls.length,8,'dispatch 2 reused supervisor + 4 criteria (no re-grade)');
  assert.deepEqual([r.job.status,r.job.dispatch_count],['succeeded',2]);
}
// 4. 504 timeout on first try: immediate stage retry, grade succeeds in one dispatch.
{
  const r=await run(4,async(stage,n)=>stage==='criterion:oneshot'&&n===1?504:'ok');
  assert.equal(done(r).data.total,10);assert.equal(r.calls.length,7);assert.deepEqual([r.job.status,r.job.dispatch_count],['succeeded',1]);
}
// 5. Invalid model output is never retried and never saved: the job fails cleanly, no score.
{
  const r=await run(5,async(stage)=>stage==='criterion:format'?'bad':'ok');
  assert.equal(done(r).ev,'error');assert.equal(done(r).data.judgeStatus,'failed');
  assert.equal(r.calls.filter(s=>s==='criterion:format').length,1);
  assert.equal(((await fx.db.query('SELECT evaluation_json FROM prompt_attempts WHERE id=$1',[fx.body(1,5).attemptId])).rows[0] as any).evaluation_json,null);
}
// 6. Two dispatches of the same job at once (duplicate delivery): one score, fenced.
{
  fault=async()=>'ok';
  const res=new StreamRes();let firstTask:any;
  const twin=createRebuildRunService(undefined as any,undefined,evaluate,undefined,undefined,{queue:async t=>{firstTask=t;}});
  await quiet(()=>handleJudgeStream({headers:{authorization:'Bearer tok-1'}} as any,res as any,fx.body(1,6),{...deps,enqueue:twin.enqueueJudge,watch:async()=>({status:'watching'})}));
  const [a,b]=await quiet(()=>Promise.all([twin.runJudgeJob(firstTask.token,firstTask.attemptId),twin.runJudgeJob(firstTask.token,firstTask.attemptId)]));
  assert.equal([a,b].filter((r:any)=>r.status==='succeeded').length,1,'exactly one dispatch saves the grade');
  assert.equal(((await fx.db.query('SELECT count(*)::int n FROM prompt_attempts WHERE id=$1 AND evaluation_json IS NOT NULL',[fx.body(1,6).attemptId])).rows[0] as any).n,1);
}
console.log('Judge fault injection PASS: hang->hedge at 10 s, 429->stage retry, persistent 429->retry_wait+stage reuse, 504->retry, invalid output->clean fail, duplicate delivery->one score. Offline only.');
process.exit(0);
