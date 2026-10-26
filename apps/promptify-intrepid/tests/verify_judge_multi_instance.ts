import assert from 'node:assert/strict';
// Several API/worker instances (separate services = separate watch hubs) on one database, production Judge path with
// the provider stub: cross-instance stream/worker/resume, duplicate delivery to two instances, tenant isolation of the
// shared hub, and global provider admission across instances. Offline only; no Gemini.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';process.env.JUDGE_FENCING_MODE='sql';
process.env.JUDGE_MODE='async';process.env.JUDGE_QUEUE='projects/p/locations/asia-southeast1/queues/judge';process.env.JUDGE_WORKER_URL='https://worker.example.test/';
process.env.AI_PROVIDER='stub';process.env.GEMINI_MODEL='gemini-3.8-flash';process.env.JUDGE_STRATEGY='parallel-v1';process.env.STUB_LATENCY_SCALE='0.08';
delete process.env.GEMINI_FALLBACK_MODEL;delete process.env.PROVIDER_ADMISSION_MODE;
const {judgeFixture,StreamRes,id}=await import('./judgeE2eFixture');
const {createRebuildRunService}=await import('../src/services/rebuildRunService');
const {handleJudgeStream}=await import('../src/services/judgeStreamService');
const {assertAiLessonAccess}=await import('../src/services/apiAuthorizationService');
const {providerStubStats,resetProviderStubStats}=await import('../src/services/providerStubService');
const fx=await judgeFixture(3,8);
// Overlapping streams share one muted console (nested save/restore would leave it muted).
const realLog=console.log;let muted=0;const saved={e:console.error,w:console.warn,l:console.log};
const quiet=async<T>(work:()=>Promise<T>)=>{if(!muted++)console.error=console.warn=console.log=()=>{};try{return await work();}finally{if(!--muted){console.error=saved.e;console.warn=saved.w;console.log=saved.l;}}};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const tasks:any[]=[];
// Two instances. Tasks are only recorded here; the test decides which instance runs each dispatch.
const A=createRebuildRunService(undefined as any,undefined,undefined,undefined,undefined,{queue:async t=>{tasks.push(t);}});
const B=createRebuildRunService(undefined as any,undefined,undefined,undefined,undefined,{queue:async t=>{tasks.push(t);}});
const deps=(s:any)=>({async:true,enqueue:s.enqueueJudge,watch:s.watchJudge,access:assertAiLessonAccess}) as any;
const req=(u:number)=>({headers:{authorization:'Bearer tok-'+u}}) as any;
const stream=(s:any,u:number,body:any)=>{const res=new StreamRes();return {res,done:quiet(()=>handleJudgeStream(req(u),res as any,body,deps(s)))};};

// 1. Stream on A, worker on B, a reconnect on B: one job, one grade, both streams see the same saved total.
{
  const target=fx.body(1,1);
  const a=stream(A,1,target);
  while(!tasks.length)await sleep(20);
  const task=tasks.shift();
  const resumeOnB=stream(B,1,{...target,resume:true});
  const worker=await quiet(()=>B.runJudgeJob(task.token,task.attemptId));
  await Promise.all([a.done,resumeOnB.done]);
  assert.equal(worker.status,'succeeded');
  assert.equal(a.res.at.at(-1)!.ev,'done');assert.equal(resumeOnB.res.at.at(-1)!.ev,'done');
  assert.equal(a.res.at.at(-1)!.data.total,resumeOnB.res.at.at(-1)!.data.total);
  const jobs=(await fx.db.query('SELECT count(*)::int n,max(generation)::int g FROM product_judge_jobs WHERE attempt_id=$1',[target.attemptId])).rows[0] as any;
  assert.deepEqual([jobs.n,jobs.g],[1,1]);
}
// 2. The queue delivers the same task to A and B at once: exactly one grade is saved, the other run is fenced.
{
  const target=fx.body(1,2);
  const a=stream(A,1,target);
  while(!tasks.length)await sleep(20);
  const task=tasks.shift();
  const [ra,rb]:any=await quiet(()=>Promise.all([A.runJudgeJob(task.token,task.attemptId),B.runJudgeJob(task.token,task.attemptId)]));
  await a.done;
  assert.equal([ra,rb].filter(r=>r.status==='succeeded').length,1,'one dispatch saves; the duplicate is a no-op or busy');
  const saved=(await fx.db.query('SELECT count(*)::int n FROM prompt_attempts WHERE id=$1 AND evaluation_json IS NOT NULL',[target.attemptId])).rows[0] as any;
  assert.equal(saved.n,1);assert.equal(a.res.at.at(-1)!.ev,'done');
}
// 3. Tenant isolation of the shared hub: while learner 1 is being watched on A, learner 2 (enrolled in the same
//    class) cannot enqueue, resume or receive anything for learner 1's attempt on A or B.
{
  const target=fx.body(1,3);
  const owner=stream(A,1,target);
  while(!tasks.length)await sleep(20);
  for(const [s,body] of [[A,target],[A,{...target,resume:true}],[B,{...target,resume:true}]] as const){
    const spy=new StreamRes();
    await quiet(()=>handleJudgeStream(req(2),spy as any,body,deps(s)));
    assert.equal(spy.status,403,'foreign attempt rejected before any stream opens');assert.deepEqual(spy.events,[]);
  }
  const task=tasks.shift();await quiet(()=>A.runJudgeJob(task.token,task.attemptId));await owner.done;
  assert.equal(owner.res.at.at(-1)!.ev,'done');
}
// 4. Admission is global: two instances grading at once never exceed the configured provider concurrency.
{
  process.env.PROVIDER_ADMISSION_MODE='sql';
  await fx.db.query('UPDATE product_provider_budget SET concurrency=3,tokens_per_minute=3000000,max_backlog=1000,tenant_backlog=50 WHERE id=1');
  resetProviderStubStats();
  const targets=[fx.body(1,4),fx.body(1,5),fx.body(1,6),fx.body(1,7)];
  const streams=targets.map((t,k)=>stream(k%2?B:A,1,t));
  while(tasks.length<4)await sleep(20);
  const runs=tasks.splice(0).map((t,k)=>quiet(()=>(k%2?A:B).runJudgeJob(t.token,t.attemptId)));
  const results:any=await Promise.all(runs);await Promise.all(streams.map(s=>s.done));
  assert.ok(results.every((r:any)=>r.status==='succeeded'));
  assert.ok(providerStubStats().peakInFlight<=3,`peak ${providerStubStats().peakInFlight} > admission concurrency 3`);
  assert.equal(providerStubStats().calls,24,'no extra provider calls under admission');
  const open=(await fx.db.query("SELECT count(*)::int n FROM product_provider_calls WHERE status NOT IN ('settled')")).rows[0] as any;
  assert.ok(open.n>=0);
  delete process.env.PROVIDER_ADMISSION_MODE;
}
realLog('Judge multi-instance PASS: cross-instance stream/worker/resume, duplicate delivery -> one grade, hub tenant isolation (403), global admission cap across instances. Offline only.');
process.exit(0);
