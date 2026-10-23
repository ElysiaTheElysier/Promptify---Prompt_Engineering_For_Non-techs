import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {createRebuildRunService,JUDGE_LOST_WORKER_GRACE_MS} from '../src/services/rebuildRunService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';
import {DEFAULT_RUBRIC,validateWeightedEvaluation} from '../src/services/weightedRubricService';
import {judgeTokenSha,type JudgeTask} from '../src/services/judgeQueueService';
import {recoverLostJudgeDispatch} from '../src/services/judgeFencingService';

// Judge worker crash recovery and concurrent duplicate delivery on real SQL (001 + 005 + 012). Offline only.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';delete process.env.JUDGE_FENCING_MODE;
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql','012_judge_jobs.sql','015_judge_dispatch_fencing.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000004`;
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Learner','learner',$2,now())",[id(1),id(2)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(3),id(1)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-R',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(3),id(6)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(9),id(8)]);
for(const n of [30,50,51,52,53]){
  await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output) VALUES($1,$2,$3,'L1',$4,$5,'Task prompt','Saved output')",[id(n),id(3),id(6),id(9),n]);
  await db.query("INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id) VALUES($1,$2,$3,$4,'Task prompt','{}',$5)",[id(2),id(n),id(6),id(9),id(n)]);
}
const server=createDatabaseClient(),actor={subject:id(2),reader:server,server,lesson:{}};
const graded=validateWeightedEvaluation({criteria:DEFAULT_RUBRIC.map(c=>({key:c.key,score:c.weight/10,reason:'Supported.'})),strengths:['Clear.'],improvements:[],nextHint:'Keep it.'},DEFAULT_RUBRIC);
const tasks:JudgeTask[]=[];let calls=0;
const service=createRebuildRunService(async()=>actor as any,undefined,async()=>{calls++;await new Promise(r=>setTimeout(r,20+Math.random()*40));return graded;},undefined,()=>Date.now(),
  {queue:async t=>{tasks.push(t);},identify:async()=>actor as any,workerServer:()=>server});
const body=(n:number)=>({classId:id(6),lessonId:id(9),attemptId:id(n)});
const claims=async(n:number)=>((await db.query('SELECT count(*)::int n FROM rebuild_judge_claims WHERE attempt_id=$1 AND completed_at IS NULL',[id(n)])).rows[0] as any).n;
const quiet=async<T>(work:()=>Promise<T>)=>{const warn=console.warn;console.warn=()=>{};try{return await work();}finally{console.warn=warn;}};

// 1. A crashed dispatch (lease taken, never settled) is recovered as worker_lost once the lease plus grace expired.
await service.enqueueJudge('learner',body(30));const t30=tasks.at(-1)!;
await db.query('SELECT product_lease_judge($1,$2,290)',[id(30),judgeTokenSha(t30.token)]);
await db.query("UPDATE product_judge_jobs SET lease_until=now()-interval '31 seconds' WHERE attempt_id=$1",[id(30)]);
const reclaimed=(await db.query('SELECT product_lease_judge_dispatch($1,$2,290) value',[id(30),judgeTokenSha(t30.token)])).rows[0] as any;
assert.equal(reclaimed.value.dispatch_count,2);
assert.equal((await recoverLostJudgeDispatch(id(30),id(2),Date.now(),JUDGE_LOST_WORKER_GRACE_MS)).data.status,'stale','recovery cannot kill a fresh dispatch reclaimed after the old lease expired');
await db.query("UPDATE product_judge_jobs SET lease_until=now()-interval '31 seconds' WHERE attempt_id=$1",[id(30)]);
assert.equal((await recoverLostJudgeDispatch(id(30),id(99),Date.now(),JUDGE_LOST_WORKER_GRACE_MS)).data.status,'stale','recovery is owner-scoped');
await db.query("UPDATE product_judge_jobs SET lease_until=now()+interval '290 seconds' WHERE attempt_id=$1",[id(30)]);
const zombie=((await db.query('SELECT claim_id::text FROM product_judge_jobs WHERE attempt_id=$1',[id(30)])).rows[0] as any).claim_id;
assert.equal((await service.judgeStatus('learner',body(30))).status,'running','a live lease is never recovered');
await db.query('UPDATE product_judge_jobs SET lease_until=now()-make_interval(secs=>$2::int) WHERE attempt_id=$1',[id(30),JUDGE_LOST_WORKER_GRACE_MS/1000-5]);
assert.equal((await service.judgeStatus('learner',body(30))).status,'running','inside the grace window the job is kept');
await db.query("UPDATE product_judge_jobs SET lease_until=now()-interval '31 seconds' WHERE attempt_id=$1",[id(30)]);
const lost=await quiet(()=>service.judgeStatus('learner',body(30)));
assert.equal(lost.status,'failed');assert.equal(lost.errorCode,'worker_lost');
assert.equal(await claims(30),0,'lost worker releases the claim');
await assert.rejects(()=>db.query("SELECT rebuild_finish_judge($1,$2,$3,'{}'::jsonb)",[id(2),id(30),zombie]),'zombie worker cannot save a score');
assert.deepEqual(await service.enqueueJudge('learner',body(30)),{async:true,status:'queued'},'learner can request a new grade at once');
assert.equal(tasks.at(-1)!.generation,2);
assert.equal((await service.runJudgeJob(tasks.at(-1)!.token,id(30))).status,'succeeded');
assert.equal((await service.judgeStatus('learner',body(30))).status,'succeeded');

// 2. Concurrent jobs with duplicate concurrent delivery: exactly one provider grade and one score per attempt.
process.env.JUDGE_FENCING_MODE='sql';
const ids=[50,51,52,53];const issued:JudgeTask[]=[];calls=0;
for(const n of ids){await service.enqueueJudge('learner',body(n));issued.push(tasks.at(-1)!);}
const outcomes=await Promise.all(issued.flatMap(t=>[service.runJudgeJob(t.token,t.attemptId),service.runJudgeJob(t.token,t.attemptId)]));
assert.equal(outcomes.filter(o=>o.status==='succeeded').length,ids.length);
assert.equal(calls,ids.length,'duplicate concurrent delivery never grades twice');
for(const n of ids)assert.equal(((await db.query('SELECT (evaluation_json IS NOT NULL) g FROM prompt_attempts WHERE id=$1',[id(n)])).rows[0] as any).g,true);

// 3. Every Judge provider path carries an admission scope (tenant fairness in the global controller).
const src=fs.readFileSync('src/services/rebuildRunService.ts','utf8');
assert.match(src,/withProviderScope\(\{tenant:c\.subject,correlationId:attempt\.id\},\(\)=>evaluate\(/,'sync Judge is admission-scoped');
assert.match(src,/withProviderScope\(\{tenant:lease\.subject,correlationId:attemptId\},\(\)=>evaluate\(/,'async Judge is admission-scoped');
await db.close();
console.log('Judge worker recovery PASS: live lease kept, worker_lost after lease+grace releases claim and fences zombie, immediate re-grade, concurrent duplicate delivery grades once, both Judge paths admission-scoped. Offline only.');
