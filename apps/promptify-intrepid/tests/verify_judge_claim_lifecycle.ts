import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {createRebuildRunService,JUDGE_CLAIM_STALE_MS} from '../src/services/rebuildRunService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';
import {AiServerError} from '../src/services/apiServerService';
import {DEFAULT_RUBRIC,validateWeightedEvaluation} from '../src/services/weightedRubricService';

// Real SQL claim lifecycle: no Judge 409 can outlive its writer, and no attempt is scored twice. Offline only.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
await db.exec(fs.readFileSync('gcp/sql/001_baseline.sql','utf8'));
await db.exec(fs.readFileSync('gcp/sql/005_department_correction_auto_approval.sql','utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000002`;
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Offline learner','learner',$2,now())",[id(1),id(2)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(3),id(1)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Offline client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-L',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(3),id(6)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(9),id(8)]);
for(const attempt of [30,31,32,33]){
  await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output) VALUES($1,$2,$3,'L1',$4,$5,'Task prompt','Saved output')",[id(attempt),id(3),id(6),id(9),attempt-29]);
  await db.query("INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id) VALUES($1,$2,$3,$4,'Task prompt','{}',$5)",[id(2),id(attempt),id(6),id(9),id(attempt)]);
}
const server=createDatabaseClient();
const resolver:any=async()=>({subject:id(2),reader:server,server,lesson:{}});
const body=(attempt:number)=>({attemptId:id(attempt),classId:id(6),lessonId:id(9)});
const claims=async(attempt:number)=>(await db.query('SELECT count(*)::int n FROM rebuild_judge_claims WHERE attempt_id=$1',[id(attempt)])).rows[0] as {n:number};
const graded=validateWeightedEvaluation({criteria:DEFAULT_RUBRIC.map(c=>({key:c.key,score:c.weight/10,reason:'Supported.'})),strengths:['Clear task.'],improvements:[],nextHint:'Keep this structure.'},DEFAULT_RUBRIC);
let calls=0,mode:'timeout'|'ok'|'setup'='timeout';
const evaluate=async()=>{calls++;if(mode==='timeout')throw new AiServerError('The provider outcome is uncertain.',504);if(mode==='setup')throw new AiServerError('AI provider is not configured.',503);return graded;};
const service=createRebuildRunService(resolver,undefined,evaluate);

// 1. A provider timeout settles server-side; the claim is released so an immediate retry is possible.
await assert.rejects(()=>service.evaluateSavedRun('learner',body(30)),(e:any)=>e.statusCode===504&&/retry AI Judge now/.test(e.message));
assert.equal((await claims(30)).n,0,'Settled uncertain Judge releases its own claim');
const score=await service.evaluateSavedRun('learner',body(30)).then(()=>null,e=>e);
assert.equal(score?.statusCode,504,'Retry still reaches the provider (not a stuck 409)');
mode='ok';
assert.equal((await service.evaluateSavedRun('learner',body(30))).total,10,'Retry after timeout persists the real grade');
assert.equal(calls,3);
assert.equal((await service.evaluateSavedRun('learner',body(30))).total,10,'Graded attempt replays without another provider call');
assert.equal(calls,3);

// 2. A definite configuration failure also releases the claim.
mode='setup';
await assert.rejects(()=>service.evaluateSavedRun('learner',body(31)),(e:any)=>e.statusCode===503);
assert.equal((await claims(31)).n,0);

// 3. A fresh foreign claim (live writer possible) stays busy and never calls the provider.
mode='ok';
await db.query("INSERT INTO rebuild_judge_claims(attempt_id,subject,claim_id,claimed_at) VALUES($1,$2,$3,now()-interval '1 minute')",[id(32),id(2),id(40)]);
const before=calls;
await assert.rejects(()=>service.evaluateSavedRun('learner',body(32)),(e:any)=>e.statusCode===409);
assert.equal(calls,before,'Busy claim cannot call the provider');
assert.equal((await claims(32)).n,1,'Fresh claim is preserved');

// 4. The same claim after its writer can no longer exist is taken over exactly once.
const later=createRebuildRunService(resolver,undefined,evaluate,undefined,()=>Date.now()+JUDGE_CLAIM_STALE_MS+60000);
assert.equal((await later.evaluateSavedRun('learner',body(32))).total,10,'Stale claim recovers to a real grade');
const stored=(await db.query('SELECT claim_id::text,completed_at FROM rebuild_judge_claims WHERE attempt_id=$1',[id(32)])).rows[0] as any;
assert.notEqual(stored.claim_id,id(40),'Old claim id can never finish');
assert.ok(stored.completed_at,'New claim completed');
await assert.rejects(()=>db.query("SELECT rebuild_finish_judge($1,$2,$3,'{}'::jsonb)",[id(2),id(32),id(40)]),'Old writer cannot save a second score');

// 5. Unknown budget outcome keeps the claim (conservative), but it recovers once stale instead of a permanent 409.
const failedBudget={from:server.from.bind(server),rpc:async(name:string,args:any)=>name==='product_take_budget'?{data:null,error:{message:'Offline budget unavailable'}}:server.rpc(name,args)};
const noBudget=createRebuildRunService(async()=>({...await resolver(),server:failedBudget}) as any,undefined,evaluate);
await assert.rejects(()=>noBudget.evaluateSavedRun('learner',body(33)),(e:any)=>e.statusCode===503);
assert.equal((await claims(33)).n,1);
await assert.rejects(()=>service.evaluateSavedRun('learner',body(33)),(e:any)=>e.statusCode===409,'Recent unknown claim stays busy');
assert.equal((await later.evaluateSavedRun('learner',body(33))).total,10,'Stale unknown claim no longer blocks grading');
await db.close();
console.log('Judge claim lifecycle PASS: settled 504/503 release, retry grades once, fresh claim busy, stale claim takeover with old writer fenced, budget-unknown recovers. Offline only.');
