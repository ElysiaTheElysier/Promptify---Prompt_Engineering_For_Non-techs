import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {handleProductRequest} from '../src/services/productionServerService';

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
  if(token!=='offline-learner')throw Error('Unknown offline identity');
  return {subject:id(2),email:'learner@example.test',firebaseUid:'offline-learner'};
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
await db.query("INSERT INTO product_sop_contributions(id,actor_id,request_id,class_id,lesson_id,title,content,metadata,chunks) VALUES($1,$2,$3,$4,$5,'Offline SOP','Saved source','{}','[]')",[id(10),id(1),id(11),id(6),id(9)]);
const request={action:'submitSop',classId:id(6),lessonId:id(9),requestId:id(11),title:'Offline SOP'};
assert.deepEqual(await handleProductRequest('Bearer offline-learner',request),{id:id(10)},'same class retry remains idempotent');
await assert.rejects(()=>handleProductRequest('Bearer offline-learner',{...request,classId:id(7)}),(error:any)=>error.statusCode===409&&/Contribution request conflict/.test(error.message),'shared lesson does not permit cross-class request replay');
const fresh={...request,requestId:id(12),classId:id(7)};
// With an admitted lesson the request reaches payload validation, without invoking ingestion.
await assert.rejects(()=>handleProductRequest('Bearer offline-learner',fresh),/Invalid file payload/);
for(const config of [
  {state:'ACTIVE',awards:{accessTier:'ADVANCE Paid'}},
  {state:'SCHEDULED',startTime:'2099-01-01T00:00:00Z',endTime:'2099-01-02T00:00:00Z'},
  {state:'ARCHIVED'},
]){
  const validConfig={pillar:'Offline',branch:'',competencies:'',startTime:'',endTime:'',departments:[],objectives:[],variables:[],scaffold:[],materials:[],awards:{},...config};
  await db.query('INSERT INTO product_studio(class_id,lesson_id,config,updated_by) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(class_id,lesson_id) DO UPDATE SET config=excluded.config',[id(7),id(9),JSON.stringify(validConfig),id(1)]);
  await assert.rejects(()=>handleProductRequest('Bearer offline-learner',fresh),(error:any)=>error.statusCode===403&&/Lesson scope denied/.test(error.message),'locked lessons reject before parsing/uploading source');
}
assert.equal((await db.query('SELECT count(*)::int total FROM product_sop_contributions')).rows[0].total,1);
await db.close();
console.log('SOP submission scope PASS: class-bound replay, admitted lesson, paid/scheduled/archived denial; no external calls.');
