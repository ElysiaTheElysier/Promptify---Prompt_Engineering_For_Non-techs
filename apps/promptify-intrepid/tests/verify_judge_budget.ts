import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {createRebuildRunService} from '../src/services/rebuildRunService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';
import {AiServerError} from '../src/services/apiServerService';

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
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
configureFirebaseVerifierForTests(async token=>{
  if(!['offline-learner','offline-head','offline-admin'].includes(token))throw Error('Unknown offline identity');
  return token==='offline-learner'?{subject:id(2),email:'learner@example.test',firebaseUid:token}:{subject:id(token==='offline-head'?21:22),email:token==='offline-head'?'head@example.test':'admin@example.test',firebaseUid:token};
});
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Offline learner','learner',$2,now())",[id(1),id(2)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(3),id(1)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Offline client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Shared course','published')",[id(5)]);
for(const [classId,code] of [[id(6),'CLASS-A'],[id(7),'PUBLIC-BASIC']]){
  await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,$2,$3,$4,'Offline',now()-interval '1 day',now()+interval '1 day')",[classId,code,id(5),id(4)]);
  await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(3),classId]);
}
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'SHARED','Shared lesson','published')",[id(9),id(8)]);


await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'peer@example.test','Peer','learner',$2,now())",[id(20),id(21)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(22),id(20)]);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(22),id(6)]);
const server=createDatabaseClient();
const resolver:any=async(token:string)=>({subject:token==='peer'?id(21):id(2),reader:server,server,lesson:{}});
let providerCalls=0;let hold=false;let started!:()=>void;let finish!:()=>void;
const provider:any=async()=>{providerCalls++;if(hold){started();await new Promise<void>(resolve=>{finish=resolve;});}throw new AiServerError('Explicit malformed completed provider response',502);};
const service=createRebuildRunService(resolver,undefined,provider);
for(const [attempt,learner,subject,cls] of [[30,3,2,6],[31,3,2,7],[32,22,21,6]]){
 await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output) VALUES($1,$2,$3,'SHARED',$4,1,'Task prompt','Saved output')",[id(attempt),id(learner),id(cls),id(9)]);
 await db.query("INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id) VALUES($1,$2,$3,$4,'Task prompt','{}',$5)",[id(subject),id(attempt),id(cls),id(9),id(attempt)]);
}
const body=(attempt:number,cls=6)=>({attemptId:id(attempt),classId:id(cls),lessonId:id(9)});
// One actor's retries across two classes share the same real SQL budget.
for(let n=0;n<40;n++)await assert.rejects(()=>service.evaluateSavedRun('owner',body(n%2?31:30,n%2?7:6)),(error:any)=>error.statusCode===502);
assert.equal(providerCalls,40);
await assert.rejects(()=>service.evaluateSavedRun('owner',body(30)),(error:any)=>error.statusCode===429);
assert.equal(providerCalls,40,'Quota denial cannot call provider');
assert.equal((await db.query('SELECT count(*)::int n FROM rebuild_judge_claims WHERE attempt_id=$1',[id(30)])).rows[0].n,0,'Budget denial releases only its acquired claim');
await db.query("UPDATE prompt_attempts SET evaluation_json='{\"total\":8}' WHERE id=$1",[id(30)]);
const before=(await db.query("SELECT count FROM product_request_budgets WHERE actor_id=$1 AND operation='ai.judge'",[id(1)])).rows[0].count;
assert.equal((await service.evaluateSavedRun('owner',body(30))).total,8,'Completed replay works while budget exhausted');
assert.equal((await db.query("SELECT count FROM product_request_budgets WHERE actor_id=$1 AND operation='ai.judge'",[id(1)])).rows[0].count,before,'Completed replay consumes no quota');
hold=true;const ready=new Promise<void>(resolve=>{started=resolve;});const running=service.evaluateSavedRun('peer',body(32));const rejected=assert.rejects(()=>running,(error:any)=>error.statusCode===502);await ready;
await assert.rejects(()=>service.evaluateSavedRun('peer',body(32)),(error:any)=>error.statusCode===409,'Concurrent duplicate is busy');
assert.equal((await db.query("SELECT count FROM product_request_budgets WHERE actor_id=$1 AND operation='ai.judge'",[id(20)])).rows[0].count,1,'Separate actor independent; busy replay consumes no quota');
finish();await rejected;assert.equal(providerCalls,41);
const failedBudget={from:server.from.bind(server),rpc:async(name:string,args:any)=>name==='product_take_budget'?{data:null,error:{message:'Offline budget unavailable'}}:server.rpc(name,args)};
const failClosed=createRebuildRunService(async()=>({...await resolver('owner'),server:failedBudget}) as any,undefined,provider);
await assert.rejects(()=>failClosed.evaluateSavedRun('owner',body(31,7)),(error:any)=>error.statusCode===503,'Budget persistence errors fail closed');
assert.equal((await db.query('SELECT count(*)::int n FROM rebuild_judge_claims WHERE attempt_id=$1',[id(31)])).rows[0].n,1,'Unknown budget outcome retains claim');
await db.query('DELETE FROM rebuild_judge_claims WHERE attempt_id=$1',[id(31)]);
const failedRelease={rpc:server.rpc.bind(server),from:(table:string)=>{if(table!=='rebuild_judge_claims')return server.from(table);const q:any={delete:()=>q,eq:()=>q,is:()=>q,select:()=>q,maybeSingle:async()=>({data:null,error:{message:'Offline release unavailable'}})};return q;}};
const uncertainRecovery=createRebuildRunService(async()=>({...await resolver('owner'),server:failedRelease}) as any,undefined,provider);
await assert.rejects(()=>uncertainRecovery.evaluateSavedRun('owner',body(31,7)),(error:any)=>error.statusCode===503,'Quota release error cannot claim safe recovery');
assert.equal(providerCalls,41,'Failure paths never call provider');
assert.equal((await db.query('SELECT count(*)::int n FROM rebuild_judge_claims WHERE attempt_id=$1',[id(31)])).rows[0].n,1,'Failed release retains acquired claim');
await db.close();
console.log('Judge budget PASS: real SQL 40/hour repeated502 cap, cross-class actor scope, completed/busy replay, independent actor; no provider calls.');

