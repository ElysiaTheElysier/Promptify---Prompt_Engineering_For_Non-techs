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
let revokeAfterChunkRead=false;
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);if(revokeAfterChunkRead&&sql.includes('product_sop_chunks')&&sql.includes('embedding')&&/^SELECT/i.test(sql.trim())){revokeAfterChunkRead=false;await db.query('DELETE FROM rebuild_sop_bindings WHERE class_id=$1 AND lesson_id=$2',[id(6),id(9)]);}return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
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
for(const [cls,doc,version] of [[6,90,91],[7,92,93]]){
 await db.query('INSERT INTO rebuild_sop_documents(id,class_id,title,created_by) VALUES($1,$2,$3,$4)',[id(doc),id(cls),`Class ${cls} SOP`,id(23)]);
 await db.query('INSERT INTO rebuild_sop_versions(id,document_id,version,content,created_by) VALUES($1,$2,1,$3,$4)',[id(version),id(doc),`Private source for class ${cls}`,id(23)]);
 await db.query('INSERT INTO rebuild_sop_bindings(class_id,lesson_id,document_id,version_id) VALUES($1,$2,$3,$4)',[id(cls),id(9),id(doc),id(version)]);
}
for(const [n,owner,cls] of [[100,1,6],[101,24,6],[102,24,7]])await db.query('INSERT INTO product_sop_contributions(id,actor_id,request_id,class_id,lesson_id,title,content,metadata,chunks) VALUES($1,$2,$1,$3,$4,$5,$6,$7,$8)',[id(n),id(owner),id(cls),id(9),'Pending source',`Unpublished ${n}`,'{}','[]']);
const learner=await handleProductRequest('Bearer offline-learner',{action:'snapshot',classId:id(6)});
assert.deepEqual(learner.contributions.map((r:any)=>r.id),[id(100)],'learner contribution list excludes peer and foreign rows');
assert.deepEqual(learner.sops.map((r:any)=>r.id),[id(91)],'published bindings stay class scoped');
for(const action of ['reviewSop','reviewSopPreview'])await assert.rejects(()=>handleProductRequest('Bearer offline-learner',{action,classId:id(6),contributionId:id(100),decision:'approve'}),(e:any)=>e.statusCode===403,'learner cannot self-approve or preview manager route');
for(const versionId of [id(93),id(100),id(999)])await assert.rejects(()=>handleProductRequest('Bearer offline-learner',{action:'sourceDownload',classId:id(6),versionId}),(e:any)=>e.statusCode===403,'foreign version, pending contribution and guessed UUID cannot reach signing');
await assert.rejects(()=>handleProductRequest('Bearer offline-learner',{action:'searchSop',classId:id(6),lessonId:id(999),query:'probe'}),(e:any)=>e.statusCode===403,'foreign lesson fails before embeddings');
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status,position) VALUES($1,$2,'EMPTY','No bindings','published',2)",[id(110),id(8)]);
assert.deepEqual(await handleProductRequest('Bearer offline-learner',{action:'searchSop',classId:id(6),lessonId:id(110),query:'probe'}),[],'no binding means no retrieval or embedding call');
await assert.rejects(()=>handleProductRequest('Bearer offline-head',{action:'reviewSopPreview',classId:id(7),contributionId:id(102)}),(e:any)=>e.statusCode===403,'Head cannot inspect unassigned class source');
const adminPreview=await handleProductRequest('Bearer offline-admin',{action:'reviewSopPreview',classId:id(6),contributionId:id(100)});
await assert.rejects(()=>handleProductRequest('Bearer offline-learner',{action:'inspectWorkspaceSource',classId:id(6),url:'https://docs.google.com/spreadsheets/d/synthetic/edit',tab:'Table'}),(e:any)=>e.statusCode===403,'learner cannot use Workspace identity through a supplied file ID');
assert.equal(adminPreview.content,'Unpublished 100','assigned admin preview returns canonical pending content');
for(const [action,payload] of [['saveSheet',{url:'https://docs.google.com/spreadsheets/d/foreign-sheet/edit',name:'Unapproved',mapping:{}}],['listDriveFolder',{url:'https://drive.google.com/drive/folders/foreign-folder'}],['submitSop',{requestId:id(200),lessonId:id(9),title:'Unapproved source',driveUrl:'https://drive.google.com/file/d/foreign-file/view'}]] as const)await assert.rejects(()=>handleProductRequest('Bearer offline-admin',{action,classId:id(6),...payload}),(e:any)=>e.statusCode===403,'even admin supplied IDs require an explicit class source binding before Workspace reads');
await db.query('INSERT INTO product_sop_chunks(version_id,position,content,embedding) VALUES($1,1,$2,$3)',[id(91),'Revocable source canary',JSON.stringify(Array(768).fill(0))]);
const beforeRevocation=await handleProductRequest('Bearer offline-learner',{action:'searchSop',classId:id(6),lessonId:id(9)});
assert.equal(beforeRevocation.length,1,'bound canonical source is initially searchable');
revokeAfterChunkRead=true;
const afterRevocation=await handleProductRequest('Bearer offline-learner',{action:'searchSop',classId:id(6),lessonId:id(9)});
assert.equal(revokeAfterChunkRead,false,'race actually revoked binding after chunk read');
assert.deepEqual(afterRevocation,[],'source removed while retrieval is in flight must not be returned');
for(let n=0;n<40;n++)await db.query('INSERT INTO product_sandbox_runs(actor_id,request_id,class_id,lesson_id,prompt,snapshot) VALUES($1,$2,$3,$4,$5,$6)',[id(23),id(500+n),id(6),id(9),'Offline quota fixture','{}']);
await assert.rejects(()=>handleProductRequest('Bearer offline-admin',{action:'sandboxGenerate',classId:id(6),lessonId:id(9),requestId:id(600),prompt:'Quota regression'}),(e:any)=>e.statusCode===429,'hourly admission limit returns an actionable quota status before provider invocation');
await db.close();console.log('SOP authorization PASS: actual handler+SQL, own/peer/class snapshots, learner self-review denial, foreign/pending download denial, lesson binding and manager scope. Offline identities only; no cloud/provider calls.');

