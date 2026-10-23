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

for(const [n,email,role,subject] of [[20,'head@example.test','head',21],[23,'admin@example.test','admin',22],[24,'peer@example.test','learner',25]] as const)await db.query('INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,$2,$2,$3,$4,now())',[id(n),email,role,id(subject)]);
await db.query("INSERT INTO product_class_grants(user_id,class_id,permission) VALUES($1,$2,'head')",[id(20),id(6)]);
const entries:{id:string;owner:number;status:string;cls:number}[]=[];let next=40;
for(const owner of [1,20,24])for(const status of ['personal','pending','approved','rejected'])for(const cls of [6,7]){const entry={id:id(next++),owner,status,cls};entries.push(entry);await db.query('INSERT INTO product_prompt_library(id,owner_id,class_id,lesson_id,request_id,title,prompt,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[entry.id,id(owner),id(cls),id(9),entry.id,`${owner} ${status}`,`Private prompt ${owner} ${status}`,status]);}
for(const [token,actor] of [['offline-learner',1],['offline-head',20],['offline-admin',23]] as const){const state=await handleProductRequest(`Bearer ${token}`,{action:'snapshot',classId:id(6)});const expected=entries.filter(row=>row.cls===6&&(actor===23||row.owner===actor||row.status==='approved'||actor===20&&row.status==='pending')).map(row=>row.id).sort();assert.deepEqual(state.promptLibrary.map((row:any)=>row.id).sort(),expected,`${token}: exact own/shared/review visibility and class isolation`);}
await assert.rejects(()=>handleProductRequest('Bearer offline-head',{action:'snapshot',classId:id(7)}),(error:any)=>error.statusCode===403,'Head cannot read unassigned class');
await assert.rejects(()=>handleProductRequest('Bearer offline-learner',{action:'reviewPromptLibrary',classId:id(6),entryId:entries[0].id,decision:'approve',reason:'Unauthorized review'}),(error:any)=>error.statusCode===403,'Learner cannot moderate');
await db.close();
console.log('Library visibility PASS: owner, peer learner, assigned/unassigned head, admin, class isolation; offline verifier only.');
