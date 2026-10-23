import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {createRebuildRunService} from '../src/services/rebuildRunService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';
import {AiServerError} from '../src/services/apiServerService';
import {DEFAULT_RUBRIC,validateWeightedEvaluation} from '../src/services/weightedRubricService';
import {createJudgeTask,judgeAsyncEnabled,JUDGE_JOB_DEADLINE_MS,type JudgeTask} from '../src/services/judgeQueueService';

// Asynchronous AI Judge on real SQL (001 + 005 + 012): one score per attempt, bounded retries, clean expiry. Offline only.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
process.env.JUDGE_FENCING_MODE='sql';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql','012_judge_jobs.sql','015_judge_dispatch_fencing.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000003`;
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Learner','learner',$2,now()),($3,'peer@example.test','Peer','learner',$4,now())",[id(1),id(2),id(20),id(21)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2),($3,$4)',[id(3),id(1),id(22),id(20)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-A',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2),($3,$2)',[id(3),id(6),id(22)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(9),id(8)]);
for(const n of [30,31,32,33,34,35,36,37,38,39]){
  await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output) VALUES($1,$2,$3,'L1',$4,$5,'Task prompt','Saved output')",[id(n),id(3),id(6),id(9),n]);
  await db.query("INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id) VALUES($1,$2,$3,$4,'Task prompt','{}',$5)",[id(2),id(n),id(6),id(9),id(n)]);
}
const server=createDatabaseClient();
const actor=(subject:string)=>({subject,reader:server,server,lesson:{}});
const graded=validateWeightedEvaluation({criteria:DEFAULT_RUBRIC.map(c=>({key:c.key,score:c.weight/10,reason:'Supported.'})),strengths:['Clear task.'],improvements:[],nextHint:'Keep this structure.'},DEFAULT_RUBRIC);
let script:Array<'ok'|504|429|502>=[];let deadlines:number[]=[];let evaluations=0;
const evaluate=async(_input:any,deadline?:number)=>{evaluations++;deadlines.push(deadline!);const next=script.shift()||'ok';if(next==='ok')return graded;throw new AiServerError('Offline provider outcome',next);};
const tasks:JudgeTask[]=[];let queueFails=false;
const queue=async(task:JudgeTask)=>{if(queueFails)throw Error('Offline queue down');tasks.push(task);};
let clock=Date.now();
const make=(subject=id(2),srv:any=server)=>createRebuildRunService(async()=>({...actor(subject),server:srv}) as any,undefined,evaluate,undefined,()=>clock,{queue,identify:async()=>actor(subject) as any,workerServer:()=>server});
const service=make();
const body=(n:number)=>({classId:id(6),lessonId:id(9),attemptId:id(n)});
const job=async(n:number)=>(await db.query('SELECT status,generation,dispatch_count FROM product_judge_jobs WHERE attempt_id=$1',[id(n)])).rows[0] as any;
const claims=async(n:number)=>((await db.query('SELECT count(*)::int n FROM rebuild_judge_claims WHERE attempt_id=$1 AND completed_at IS NULL',[id(n)])).rows[0] as any).n;
const budget=async()=>((await db.query("SELECT coalesce(sum(count),0)::int n FROM product_request_budgets WHERE actor_id=$1 AND operation='ai.judge'",[id(1)])).rows[0] as any).n;

// 1. Enqueue is idempotent while active: one job, one task, one budget unit.
assert.deepEqual(await service.enqueueJudge('learner',body(30)),{async:true,status:'queued'});
assert.deepEqual(await service.enqueueJudge('learner',body(30)),{async:true,status:'queued'});
assert.equal(tasks.length,1);assert.equal(await budget(),1);assert.equal((await job(30)).status,'queued');
assert.equal((await service.judgeStatus('learner',body(30))).status,'queued');

// 2. Only the job's own token can dispatch it; success saves exactly one score with the worker deadline.
assert.equal((await service.runJudgeJob('f'.repeat(64),id(30))).http,401);
const first=tasks[0];
assert.deepEqual(await service.runJudgeJob(first.token,id(30)),{http:200,status:'succeeded'});
assert.deepEqual(deadlines,[JUDGE_JOB_DEADLINE_MS],'worker grades with the long async deadline');
const done=await service.judgeStatus('learner',body(30));
assert.equal(done.status,'succeeded');assert.equal((done as any).evaluation.total,10);
assert.deepEqual(await service.runJudgeJob(first.token,id(30)),{http:200,status:'succeeded'},'duplicate delivery is a no-op');
assert.equal(evaluations,1,'no second grade');
assert.equal((await service.enqueueJudge('learner',body(30))).total,10,'graded attempt replays its score');

// 3. Provider capacity errors retry through the queue, then fail cleanly after the dispatch cap.
script=[504,429,503 as any];
await service.enqueueJudge('learner',body(31));const t31=tasks.at(-1)!;
assert.deepEqual(await service.runJudgeJob(t31.token,id(31)),{http:503,status:'retry_wait'});
assert.equal((await service.judgeStatus('learner',body(31))).status,'retry_wait');
assert.deepEqual(await service.enqueueJudge('learner',body(31)),{async:true,status:'retry_wait'},'no user-forced duplicate while retrying');
assert.deepEqual(await service.runJudgeJob(t31.token,id(31)),{http:503,status:'retry_wait'});
assert.deepEqual(await service.runJudgeJob(t31.token,id(31)),{http:200,status:'failed'},'third dispatch is final');
assert.equal(await claims(31),0,'failed job releases its claim');
const failed=await service.judgeStatus('learner',body(31));assert.equal(failed.status,'failed');assert.equal(failed.errorCode,'provider_503');
assert.deepEqual(await service.enqueueJudge('learner',body(31)),{async:true,status:'queued'},'user can request a new grade');
assert.equal(tasks.at(-1)!.generation,2);
assert.deepEqual(await service.runJudgeJob(t31.token,id(31)),{http:401,status:'denied'},'old generation token cannot dispatch');
assert.deepEqual(await service.runJudgeJob(tasks.at(-1)!.token,id(31)),{http:200,status:'succeeded'});

// 4. Invalid provider output is terminal at once.
script=[502];await service.enqueueJudge('learner',body(32));
assert.deepEqual(await service.runJudgeJob(tasks.at(-1)!.token,id(32)),{http:200,status:'failed'});
assert.equal(await claims(32),0);

// 5. A job nobody dispatched expires cleanly, from status polling or from a late dispatch.
await service.enqueueJudge('learner',body(33));const t33=tasks.at(-1)!;
await db.query("UPDATE product_judge_jobs SET expires_at=now()-interval '1 second' WHERE attempt_id=$1",[id(33)]);
clock=Date.now()+1000;
assert.equal((await service.judgeStatus('learner',body(33))).status,'expired');
assert.equal(await claims(33),0,'expiry releases the claim');
assert.deepEqual(await service.runJudgeJob(t33.token,id(33)),{http:200,status:'expired'});
clock=Date.now();

// 6. A concurrent second dispatch of a running job is told to retry later.
let hold!:()=>void;const gate=new Promise<void>(resolve=>{hold=resolve;});
const slow=createRebuildRunService(async()=>actor(id(2)) as any,undefined,async()=>{await gate;return graded;},undefined,()=>clock,{queue,identify:async()=>actor(id(2)) as any,workerServer:()=>server});
await slow.enqueueJudge('learner',body(34));const t34=tasks.at(-1)!;
const running=slow.runJudgeJob(t34.token,id(34));
await new Promise(resolve=>setTimeout(resolve,50));
assert.deepEqual(await slow.runJudgeJob(t34.token,id(34)),{http:503,status:'busy'});
hold();assert.equal((await running).status,'succeeded');

// 7. A live synchronous claim is respected; a peer cannot see or request another learner's grade.
await db.query('INSERT INTO rebuild_judge_claims(attempt_id,subject,claim_id) VALUES($1,$2,$3)',[id(35),id(2),id(90)]);
await assert.rejects(()=>service.enqueueJudge('learner',body(35)),(e:any)=>e.statusCode===409);
const peer=make(id(21));
await assert.rejects(()=>peer.judgeStatus('peer',body(30)),(e:any)=>e.statusCode===403);
await assert.rejects(()=>peer.enqueueJudge('peer',body(36)),(e:any)=>e.statusCode===403);

// 8. Queue or budget failure never leaves a stuck job or claim.
queueFails=true;
await assert.rejects(()=>service.enqueueJudge('learner',body(36)),(e:any)=>e.statusCode===503);
assert.equal((await job(36)).status,'failed');assert.equal(await claims(36),0);
queueFails=false;
const noBudget={from:server.from.bind(server),rpc:async(name:string,args:any)=>name==='product_take_budget'?{data:false,error:null}:server.rpc(name,args)};
await assert.rejects(()=>make(id(2),noBudget).enqueueJudge('learner',body(37)),(e:any)=>e.statusCode===429);
assert.equal((await job(37)).status,'failed');assert.equal(await claims(37),0);

// 9. Queue configuration and Cloud Tasks request shape (mocked fetch and token).
const env={JUDGE_MODE:'async',JUDGE_QUEUE:'projects/p-1/locations/asia-southeast1/queues/promptify-judge-staging',JUDGE_WORKER_URL:'https://api-example.a.run.app/'} as any;
assert.equal(judgeAsyncEnabled(env),true);
assert.equal(judgeAsyncEnabled({...env,JUDGE_MODE:'sync'}),false);assert.equal(judgeAsyncEnabled({...env,JUDGE_WORKER_URL:'http://x.run.app/'}),false);
assert.equal(judgeAsyncEnabled({}),false,'sync is the default');
let sent:any;
await createJudgeTask({attemptId:id(30),generation:2,token:'a'.repeat(64)},env,(async(url:string,init:any)=>{sent={url,body:JSON.parse(init.body)};return new Response('{}',{status:409});}) as any,async()=>'offline-token');
assert.equal(sent.url,'https://cloudtasks.googleapis.com/v2/'+env.JUDGE_QUEUE+'/tasks');
assert.equal(sent.body.task.name,env.JUDGE_QUEUE+'/tasks/judge-'+id(30)+'-g2');
assert.equal(sent.body.task.httpRequest.url,'https://api-example.a.run.app/internal/judge');
assert.deepEqual(JSON.parse(Buffer.from(sent.body.task.httpRequest.body,'base64').toString()),{attemptId:id(30)},'task payload carries IDs only');
await assert.rejects(()=>createJudgeTask({attemptId:id(30),generation:2,token:'a'.repeat(64)},env,(async()=>new Response('{}',{status:403})) as any,async()=>'offline-token'));
// 10. A worker resuming after its lease was superseded cannot save or settle the new dispatch.
let releaseOld!:()=>void,oldStarted!:()=>void;
const oldGate=new Promise<void>(r=>{releaseOld=r;}),started=new Promise<void>(r=>{oldStarted=r;});
const staleWorker=createRebuildRunService(async()=>actor(id(2)) as any,undefined,async()=>{oldStarted();await oldGate;return graded;},undefined,()=>clock,{queue,identify:async()=>actor(id(2)) as any,workerServer:()=>server});
await staleWorker.enqueueJudge('learner',body(38));const t38=tasks.at(-1)!;
const oldDispatch=staleWorker.runJudgeJob(t38.token,id(38));await started;
await db.query("UPDATE product_judge_jobs SET lease_until=now()-interval '1 second' WHERE attempt_id=$1",[id(38)]);
assert.equal((await service.runJudgeJob(t38.token,id(38))).status,'succeeded');
releaseOld();assert.equal((await oldDispatch).status,'stale','late writer is fenced out atomically');
assert.equal((await job(38)).dispatch_count,2);assert.equal((await job(38)).status,'succeeded');
assert.equal((await db.query('SELECT product_settle_judge_dispatch($1,1,1,\'failed\',\'stale\',NULL) result',[id(38)])).rows[0].result.status,'stale');
await db.exec('SET ROLE authenticated');
await assert.rejects(()=>db.query('SELECT product_finish_judge_dispatch($1,1,2,$2)',[id(38),graded]));
await db.exec('RESET ROLE');
await service.enqueueJudge('learner',body(39));const t39=tasks.at(-1)!,priorEvaluations=evaluations;
await db.query("UPDATE product_judge_jobs SET status='running',dispatch_count=3,lease_until=now()-interval '1 second' WHERE attempt_id=$1",[id(39)]);
assert.equal((await service.runJudgeJob(t39.token,id(39))).status,'failed','SQL retry budget also bounds crashed worker reclaims');
assert.equal(evaluations,priorEvaluations);assert.equal(await claims(39),0);
await db.exec(fs.readFileSync('gcp/sql/rollback/015_judge_dispatch_fencing.sql','utf8'));
assert.equal((await db.query('SELECT evaluation_json FROM prompt_attempts WHERE id=$1',[id(38)])).rows[0].evaluation_json.total,10,'rollback retains grades');
await db.close();
console.log('Async Judge jobs PASS: idempotent enqueue, token-bound dispatch, one score, queue-owned retries capped at 3, clean expiry/failure, busy lease, sync claim respected, owner-only, queue shape. Offline only.');
