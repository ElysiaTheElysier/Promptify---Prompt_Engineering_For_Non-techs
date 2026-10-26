import assert from 'node:assert/strict';
// Async Judge stream through the REAL resolvers and SQL: one identity verification per stream, unchanged gates,
// idempotent enqueue without extra budget, and count-only progress before the task-alignment verdict. Offline only.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';process.env.JUDGE_FENCING_MODE='sql';
process.env.JUDGE_MODE='async';process.env.JUDGE_QUEUE='projects/p/locations/asia-southeast1/queues/judge';process.env.JUDGE_WORKER_URL='https://worker.example.test/';
const {judgeFixture,StreamRes,id,answer,stageOf}=await import('./judgeE2eFixture');
const {createRebuildRunService,judgeStageStore}=await import('../src/services/rebuildRunService');
const {handleJudgeStream}=await import('../src/services/judgeStreamService');
const {assertAiLessonAccess}=await import('../src/services/apiAuthorizationService');
const {evaluateParallel}=await import('../src/services/parallelJudgeService');
const {DEFAULT_RUBRIC}=await import('../src/services/weightedRubricService');
const {createDatabaseClient}=await import('../src/services/cloudDatabaseService');
const fx=await judgeFixture(2,6);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let supervisorMs=0;
const call=async(payload:any)=>{await sleep(stageOf(payload)==='supervisor'?supervisorMs:40);return answer(payload);};
const evaluate=(input:any,deadline?:number,hooks?:any)=>evaluateParallel({...input,taskRequirement:'Task',learnerPrompt:'Task prompt',generatedOutput:'Saved output'},DEFAULT_RUBRIC,call,deadline,'parallel-v1',hooks);
const tasks:any[]=[];let service:any;
// resolve left at its default: production context -> the light Judge gate.
service=createRebuildRunService(undefined as any,undefined,evaluate,undefined,undefined,{queue:async t=>{tasks.push(t);setTimeout(()=>void service.runJudgeJob(t.token,t.attemptId),30);}});
const deps={async:true,enqueue:service.enqueueJudge,watch:service.watchJudge,access:assertAiLessonAccess} as any;
const req=(u:number)=>({headers:{authorization:'Bearer tok-'+u}}) as any;
const budget=async(u:number)=>((await fx.db.query("SELECT coalesce(sum(count),0)::int n FROM product_request_budgets WHERE actor_id=$1 AND operation='ai.judge'",[id(100,u)])).rows[0] as any).n;
const quiet=async<T>(work:()=>Promise<T>)=>{const e=console.error,w=console.warn,l=console.log;console.error=console.warn=console.log=()=>{};try{return await work();}finally{console.error=e;console.warn=w;console.log=l;}};

// 1. One stream = one identity verification; status first; count-only progress precedes scored rows.
{
  supervisorMs=900;
  const before=fx.counts.firebase,res=new StreamRes();
  await quiet(()=>handleJudgeStream(req(1),res as any,fx.body(1,1),deps));
  assert.equal(res.status,200);assert.equal(fx.counts.firebase-before,1,'access + enqueue + watch share one verification');
  assert.equal(res.events[0],'status');assert.deepEqual(res.at[0].data,{status:'queued'});
  // Supervisor is the slowest stage here (as often on staging): no scored row can show before it, but the
  // graded count does. Scored rows, if any, only follow a progress event; the grade follows both.
  const firstProgress=res.events.indexOf('progress'),firstRow=res.events.indexOf('criterion'),done=res.events.indexOf('done');
  assert.ok(firstProgress>=0&&firstProgress<done,'graded count arrives while the verdict is still pending');
  assert.ok(res.at[firstProgress].ms<res.at[done].ms-300,'progress shows well before the grade');
  assert.ok(firstRow===-1||firstRow>firstProgress);
  for(const e of res.at.filter(e=>e.ev==='progress'))assert.deepEqual(Object.keys(e.data),['graded'],'progress never carries keys or scores');
  assert.equal(res.at.filter(e=>e.ev==='criterion').length+res.at.filter(e=>e.ev==='done').length>=1,true);
  assert.equal(res.at.at(-1)!.ev,'done');assert.equal(res.at.at(-1)!.data.total,10);
  assert.equal(tasks.length,1);assert.equal(await budget(1),1);
}
// 2. Polling status also carries the count, and scored rows only after a positive verdict.
{
  const target=fx.body(1,2);
  tasks.length=0;
  const s2=createRebuildRunService(undefined as any,undefined,evaluate,undefined,undefined,{queue:async t=>{tasks.push(t);}});
  assert.deepEqual(await s2.enqueueJudge('Bearer tok-1',target),{async:true,status:'queued'});
  const store=judgeStageStore(createDatabaseClient(),target.attemptId);
  await store.save('criterion:format','a'.repeat(64),{key:'format'},{key:'format',score:2,max:2,reasonEn:'Ok.',reasonVi:'Ổn.'});
  await store.save('criterion:persona','b'.repeat(64),{key:'persona'},{key:'persona',score:1,max:2,reasonEn:'Ok.',reasonVi:'Ổn.'});
  let st:any=await s2.judgeStatus('Bearer tok-1',target);
  assert.equal(st.status,'queued');assert.equal(st.graded,2);assert.equal(st.criteria,undefined,'no scores before the verdict');
  await store.save('supervisor','c'.repeat(64),{taskAttempt:false},{taskAttempt:false});
  st=await s2.judgeStatus('Bearer tok-1',target);assert.equal(st.graded,2);assert.equal(st.criteria,undefined,'no scores for an off-task prompt');
  await store.save('supervisor','d'.repeat(64),{taskAttempt:true},{taskAttempt:true});
  st=await s2.judgeStatus('Bearer tok-1',target);assert.deepEqual(st.criteria.map((r:any)=>r.key).sort(),['format','persona']);
  // Idempotent: a second click on the active job queues nothing and takes no budget.
  const used=await budget(1);
  const again=new StreamRes();
  await quiet(()=>handleJudgeStream(req(1),again as any,{...target,attemptId:id(1000+3,1)},{...deps,watch:async()=>({status:'watching'})}));
  const tasksAfterNew=tasks.length;
  const dup=new StreamRes();
  await quiet(()=>handleJudgeStream(req(1),dup as any,{...target,attemptId:id(1000+3,1)},{...deps,watch:async()=>({status:'watching'})}));
  assert.equal(tasks.length,tasksAfterNew,'duplicate click: no new task');assert.equal(await budget(1),used+1,'only the first click on attempt 3 took budget');
}
// 3. Gates unchanged: not enrolled, lesson outside the class, Codelab outside its schedule. No job, no budget.
{
  const jobs=async()=>((await fx.db.query('SELECT count(*)::int n FROM product_judge_jobs')).rows[0] as any).n;
  const n=await jobs();
  const outsider=new StreamRes();
  await quiet(()=>handleJudgeStream(req(2),outsider as any,fx.body(2,1),deps));
  assert.equal(outsider.status,403);
  const foreign=new StreamRes();
  await quiet(()=>handleJudgeStream(req(1),foreign as any,{...fx.body(1,4),lessonId:id(19)},deps));
  assert.equal(foreign.status,403);
  // Studio validation triggers need a full config; only the schedule state matters for this gate.
  await fx.db.exec('ALTER TABLE product_studio DISABLE TRIGGER USER');
  await fx.db.query("INSERT INTO product_studio(class_id,lesson_id,config,revision,updated_by) VALUES($1,$2,$3,1,$4)",[id(6),id(9),JSON.stringify({state:'DRAFT'}),id(100,1)]);
  const draft=new StreamRes();
  await quiet(()=>handleJudgeStream(req(1),draft as any,fx.body(1,4),deps));
  assert.equal(draft.status,403);assert.match(draft.chunks.join(''),/published schedule/);
  await fx.db.query('DELETE FROM product_studio WHERE class_id=$1',[id(6)]);
  assert.equal(await jobs(),n,'denied requests create no job');
}
// 4. Resume never enqueues: a graded attempt replays its grade, an unknown job ends without starting one.
{
  const t=tasks.length,res=new StreamRes();
  await quiet(()=>handleJudgeStream(req(1),res as any,{...fx.body(1,1),resume:true},deps));
  assert.deepEqual(res.events,['status','done']);assert.equal(res.at.at(-1)!.data.total,10);
  const none=new StreamRes();
  await quiet(()=>handleJudgeStream(req(1),none as any,{...fx.body(1,5),resume:true},deps));
  assert.equal(none.at.at(-1)!.ev,'error');assert.equal(none.at.at(-1)!.data.judgeStatus,'none');assert.equal(tasks.length,t);
}
// 5. Shared watch hub: 15 open streams on 3 jobs read stage rows about once per 250 ms tick in total,
//    not once per stream per tick (SSE polling must not exhaust the connection pool).
{
  const s3=createRebuildRunService(undefined as any,undefined,evaluate,undefined,undefined,{queue:async()=>{}});
  for(const g of [4,5,6])await s3.enqueueJudge('Bearer tok-1',fx.body(1,g));
  const before=fx.counts.stageReads,started=Date.now();
  const results=await Promise.all([4,5,6].flatMap(g=>Array.from({length:5},()=>s3.watchJudge('Bearer tok-1',fx.body(1,g),{onCriterion:()=>{},maxMs:1500}))));
  const ticks=Math.ceil((Date.now()-started)/250)+1,reads=fx.counts.stageReads-before;
  assert.ok(results.every((r:any)=>r.status==='watching'));
  assert.ok(reads<=15+ticks+2,`stage reads ${reads} for 15 streams over ${ticks} ticks`);
  assert.ok(reads<15*ticks/2,'far below one read per stream per tick');
}
console.log('Judge enqueue path PASS: one identity check per stream, status first, count-only progress before verdict, gates/idempotency/budget unchanged, resume never enqueues, shared watch hub bounds DB reads. Offline only.');
process.exit(0);
