import assert from 'node:assert/strict';
// I05: a Judge job queued before the learner lost class access ends without a provider call. Real SQL + RLS, offline.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';process.env.JUDGE_FENCING_MODE='sql';
process.env.JUDGE_MODE='async';process.env.JUDGE_QUEUE='projects/p/locations/asia-southeast1/queues/judge';process.env.JUDGE_WORKER_URL='https://worker.example.test/';
const {judgeFixture,id,answer}=await import('./judgeE2eFixture');
const {createRebuildRunService}=await import('../src/services/rebuildRunService');
const {evaluateParallel}=await import('../src/services/parallelJudgeService');
const {DEFAULT_RUBRIC}=await import('../src/services/weightedRubricService');
const fx=await judgeFixture(2,2);
let calls=0;
const evaluate=(input:any,deadline?:number,hooks?:any)=>evaluateParallel({...input,taskRequirement:'Task',learnerPrompt:'Task prompt',generatedOutput:'Saved output'},DEFAULT_RUBRIC,async(payload:any)=>{calls++;return answer(payload);},deadline,'parallel-v1',hooks);
const tasks:any[]=[];
const service=createRebuildRunService(undefined as any,undefined,evaluate,undefined,undefined,{queue:async t=>{tasks.push(t);}});
const quiet=async<T>(work:()=>Promise<T>)=>{const e=console.error,w=console.warn,l=console.log;console.error=console.warn=console.log=()=>{};try{return await work();}finally{console.error=e;console.warn=w;console.log=l;}};
const job=async(g:number)=>(await fx.db.query('SELECT status,last_error_code FROM product_judge_jobs WHERE attempt_id=$1',[fx.body(1,g).attemptId])).rows[0] as any;

// Control: an enrolled learner's queued job is graded.
await quiet(()=>service.enqueueJudge('Bearer tok-1',fx.body(1,1)));
assert.deepEqual(await quiet(()=>service.runJudgeJob(tasks[0].token,tasks[0].attemptId)),{http:200,status:'succeeded'});
assert.ok(calls>0);

// Revoked while queued: the worker settles the job as failed with access_revoked and calls no provider.
await quiet(()=>service.enqueueJudge('Bearer tok-1',fx.body(1,2)));
await fx.db.query('DELETE FROM enrollments WHERE learner_id=$1',[id(300,1)]);
calls=0;
assert.deepEqual(await quiet(()=>service.runJudgeJob(tasks[1].token,tasks[1].attemptId)),{http:200,status:'failed'});
assert.equal(calls,0,'no provider call after revocation');
assert.deepEqual(await job(2),{status:'failed',last_error_code:'access_revoked'});
console.log('verify_delayed_job_access: PASS');
