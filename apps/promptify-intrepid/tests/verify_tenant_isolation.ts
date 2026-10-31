import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {handleProductRequest} from '../src/services/productionServerService';

// TM-001 (docs/evidence/promptify-intrepid-threat-model.md): company A actors must never read or change company B.
// Real SQL (all migrations PGlite can load: 004 needs pgvector, 007 uses CREATE INDEX CONCURRENTLY), offline verifier.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of fs.readdirSync('gcp/sql').filter(f=>/^\d{3}_.*\.sql$/.test(f)&&!/^00[47]_/.test(f)).sort())await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
const actors:Record<string,{user:number;subject:number;email:string;role:string}>={
  'learner-a':{user:1,subject:2,email:'learner@alpha.test',role:'learner'},
  'trainer-a':{user:30,subject:31,email:'trainer@alpha.test',role:'instructor'},
  'head-a':{user:32,subject:33,email:'head@alpha.test',role:'head'},
  'learner-b':{user:11,subject:12,email:'learner@beta.test',role:'learner'},
  'trainer-b':{user:40,subject:41,email:'trainer@beta.test',role:'instructor'},
  'admin':{user:50,subject:51,email:'admin@alpha.test',role:'admin'},
};
configureFirebaseVerifierForTests(async token=>{
  const actor=actors[token];if(!actor)throw Error('Unknown offline identity');
  return {subject:id(actor.subject),email:actor.email,firebaseUid:token};
});
for(const actor of Object.values(actors))await db.query('INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,$2,$2,$3,$4,now())',[id(actor.user),actor.email,actor.role,id(actor.subject)]);

// Two companies, each with its own client, domain, course, lesson and class.
const A={client:4,course:5,module:8,lesson:9,cls:6,learner:3,domain:'alpha.test'},B={client:14,course:15,module:18,lesson:19,cls:16,learner:13,domain:'beta.test'};
for(const [t,learnerUser] of [[A,1],[B,11]] as const){
  await db.query("INSERT INTO clients(id,name,industry) VALUES($1,$2,'Testing')",[id(t.client),'Company '+t.domain]);
  await db.query('INSERT INTO product_domains(client_id,domain,active,updated_by) VALUES($1,$2,true,$3)',[id(t.client),t.domain,id(50)]);
  await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,$2,'published')",[id(t.course),'Course '+t.domain]);
  await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(t.module),id(t.course)]);
  await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(t.lesson),id(t.module)]);
  await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,$2,$3,$4,'Ops',now()-interval '1 day',now()+interval '30 days')",[id(t.cls),'CLASS-'+t.domain,id(t.course),id(t.client)]);
  await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(t.learner),id(learnerUser)]);
  await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(t.learner),id(t.cls)]);
}
await db.query("INSERT INTO course_instructors(course_id,user_id,permission) VALUES($1,$2,'editor'),($3,$4,'editor')",[id(A.course),id(30),id(B.course),id(40)]);
await db.query("INSERT INTO product_class_grants(user_id,class_id,permission) VALUES($1,$2,'head')",[id(32),id(A.cls)]);

// Company B's confidential rows that every probe below targets.
const SECRET='B-CONFIDENTIAL-PROCEDURE';
const b={attempt:60,contribution:61,hint:63,access:65,award:66,sheet:67,message:68,document:70,library:71};
await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,prompt_text,ai_output,lesson_ref_id) VALUES($1,$2,$3,'L1',$4,$4,$5)",[id(b.attempt),id(B.learner),id(B.cls),SECRET+' prompt',id(B.lesson)]);
await db.query("INSERT INTO product_sop_contributions(id,actor_id,request_id,class_id,lesson_id,title,content,metadata,chunks,status) VALUES($1,$2,$3,$4,$5,'B secret SOP',$6,'{}','[]','pending')",[id(b.contribution),id(40),id(62),id(B.cls),id(B.lesson),SECRET]);
await db.query("INSERT INTO product_hint_requests(id,learner_id,class_id,lesson_id,request_id,reason) VALUES($1,$2,$3,$4,$5,'Need help with company B lesson')",[id(b.hint),id(B.learner),id(B.cls),id(B.lesson),id(64)]);
await db.query("INSERT INTO product_access_requests(id,subject,email,class_id,message) VALUES($1,'b-subject','someone@beta.test',$2,'Please grant access to class B')",[id(b.access),id(B.cls)]);
await db.query("INSERT INTO product_awards(id,class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence) VALUES($1,$2,$3,$4,'pass','badge','B badge','Company B','{}')",[id(b.award),id(B.cls),id(B.lesson),id(B.learner)]);
await db.query("INSERT INTO product_sheet_connections(id,class_id,sheet_id,name,column_mapping,created_by) VALUES($1,$2,'sheetB','B roster','{}',$3)",[id(b.sheet),id(B.cls),id(40)]);
await db.query("INSERT INTO workshop_messages(id,class_id,trainer_id,request_id,message) VALUES($1,$2,$3,$4,'B workshop notice')",[id(b.message),id(B.cls),id(40),id(69)]);
await db.query("INSERT INTO rebuild_sop_documents(id,class_id,title,created_by) VALUES($1,$2,'B document',$3)",[id(b.document),id(B.cls),id(40)]);
await db.query("INSERT INTO product_prompt_library(id,owner_id,class_id,lesson_id,request_id,title,prompt,status) VALUES($1,$2,$3,$4,$5,'B prompt',$6,'pending')",[id(b.library),id(11),id(B.cls),id(B.lesson),id(72),SECRET]);

const scopedTables=['enrollments','prompt_attempts','product_sop_contributions','product_hint_requests','product_access_requests','product_awards','product_sheet_connections','product_sync_logs','workshop_messages','rebuild_sop_documents','rebuild_sop_bindings','product_prompt_library','product_attendance','trainer_hints','product_audit','product_studio'];
async function companyB(){
  const state:Record<string,unknown>={};
  for(const table of scopedTables)state[table]=(await db.query(`SELECT * FROM public.${table} WHERE class_id=$1 ORDER BY 1`,[id(B.cls)])).rows;
  state.receipts=(await db.query('SELECT * FROM public.workshop_message_receipts WHERE message_id=$1',[id(b.message)])).rows;
  return JSON.parse(JSON.stringify(state));
}
const before=await companyB();
const call=(token:string,body:Record<string,unknown>)=>handleProductRequest(`Bearer ${token}`,body);
async function denied(token:string,body:Record<string,unknown>,statuses:number[]){
  let outcome:unknown;
  try{outcome=await call(token,body);}catch(error:any){
    assert.ok(statuses.includes(error.statusCode),`${token} ${body.action}: expected ${statuses.join('/')}, got ${error.statusCode} ${error.message}`);
    assert.ok(!String(error.message).includes(SECRET),`${token} ${body.action}: error leaks company B data`);
    return;
  }
  assert.fail(`${token} ${body.action}: company B request succeeded: ${JSON.stringify(outcome).slice(0,200)}`);
}

// Sanity: the fixture really grants each A actor its own class, so the denials below are about tenancy, not setup.
for(const token of ['learner-a','trainer-a','head-a']){
  const state=await call(token,{action:'snapshot',classId:id(A.cls)});
  assert.equal(state.selectedClass?.id,id(A.cls),`${token} reads its own class`);
  assert.deepEqual(state.classes.map((row:any)=>row.id),[id(A.cls)],`${token} lists only company A classes`);
  assert.ok(!JSON.stringify(state).includes(SECRET),`${token} own snapshot excludes company B data`);
}
assert.equal((await call('trainer-a',{action:'snapshot',classId:id(A.cls)})).selectedClass.can_manage,true,'trainer A manages class A');
assert.equal((await call('learner-b',{action:'snapshot',classId:id(B.cls)})).selectedClass?.id,id(B.cls),'learner B reads class B');

// 1. Every class-scoped action, for every company A role, with company B's classId. Actions are read from the
// handler source so a newly added action is covered automatically.
const source=fs.readFileSync('src/services/productionServerService.ts','utf8');
const switchActions=[...source.slice(source.indexOf('switch (body.action)')).matchAll(/case '(\w+)'/g)].map(match=>match[1]);
assert.ok(switchActions.length>=50,`expected the full action switch, parsed ${switchActions.length}`);
const classActions=['snapshot','analytics',...switchActions];
for(const token of ['learner-a','trainer-a','head-a'])for(const action of classActions)await denied(token,{action,classId:id(B.cls)},[403]);

// 2. Own class A, but nested IDs that belong to company B (second-order IDOR).
const fresh=(n:number)=>id(900+n);
const nested:Array<[string,Record<string,unknown>]>=[
  ['trainer-a',{action:'reviewSopPreview',contributionId:id(b.contribution)}],
  ['trainer-a',{action:'reviewSop',contributionId:id(b.contribution),decision:'reject',reason:'Cross-tenant probe'}],
  ['trainer-a',{action:'sourceDownload',versionId:id(b.contribution)}],
  ['trainer-a',{action:'trainerAction',attemptId:id(b.attempt),requestId:fresh(1),kind:'flag',reason:'Cross-tenant probe'}],
  ['trainer-a',{action:'privateHint',learnerId:id(B.learner),message:'Cross-tenant probe'}],
  ['trainer-a',{action:'setAccessExpiry',learnerId:id(B.learner),expiresAt:'2030-01-01T00:00:00Z'}],
  ['trainer-a',{action:'recordAttendance',lessonId:id(B.lesson),learnerId:id(B.learner),present:true,reason:'Cross-tenant probe'}],
  ['trainer-a',{action:'reviewHintRequest',hintRequestId:id(b.hint),decision:'approve',note:'Cross-tenant probe'}],
  ['trainer-a',{action:'downloadAward',awardId:id(b.award)}],
  ['trainer-a',{action:'setSheetAutoSync',connectionId:id(b.sheet),enabled:true}],
  ['trainer-a',{action:'syncSheet',connectionId:id(b.sheet),requestId:fresh(2)}],
  ['trainer-a',{action:'publishSop',documentId:id(b.document),title:'Cross-tenant probe',content:'Overwrite attempt',lessonId:id(A.lesson)}],
  ['trainer-a',{action:'saveStudio',lessonId:id(B.lesson),expectedRevision:0,config:{state:'DRAFT',awards:{badges:[]},rubric:[]}}],
  ['head-a',{action:'reviewPromptLibrary',entryId:id(b.library),decision:'approve',reason:'Cross-tenant probe'}],
  ['learner-a',{action:'ackMessage',messageId:id(b.message)}],
  ['learner-a',{action:'savePromptLibrary',lessonId:id(A.lesson),attemptId:id(b.attempt),requestId:fresh(3),title:'Probe',prompt:'Probe prompt'}],
  ['learner-a',{action:'judgeStatus',lessonId:id(B.lesson),attemptId:id(b.attempt)}],
  ['learner-a',{action:'requestHint',lessonId:id(B.lesson),requestId:fresh(4),reason:'Cross-tenant probe reason'}],
  ['learner-a',{action:'profileCorrection',department:'Ops',sourceClassId:id(B.cls),requestId:fresh(5),reason:'Cross-tenant probe',fullName:'Learner A'}],
];
for(const [token,body] of nested)await denied(token,{classId:id(A.cls),...body},[403,404,409,422]);
// Resolving an access request is an idempotent UPDATE scoped by class: it may return, but must change nothing.
await call('trainer-a',{action:'reviewAccessRequest',classId:id(A.cls),requestId:id(b.access)}).catch(()=>undefined);
const inbox=await call('trainer-a',{action:'accessRequests',classId:id(A.cls)});
assert.ok(!JSON.stringify(inbox).includes('someone@beta.test'),'trainer A inbox excludes company B access requests');

// 3. Company A's own reports never aggregate company B.
const report=await call('head-a',{action:'analytics'});
assert.ok((report.classes||[]).every((row:any)=>row.id!==id(B.cls)),'head A analytics exclude class B');

assert.deepEqual(await companyB(),before,'no probe changed any company B row');
await db.close();
console.log(`Tenant isolation PASS: ${classActions.length} class-scoped actions x 3 company A roles denied on company B; ${nested.length+1} nested company B IDs rejected; company B rows unchanged; offline verifier only.`);
