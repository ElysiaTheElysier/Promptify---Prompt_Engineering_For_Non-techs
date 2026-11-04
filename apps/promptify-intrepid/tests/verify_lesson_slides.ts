import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateKeyPairSync} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {PDFDocument} from 'pdf-lib';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {cloudStorage} from '../src/services/cloudStorageService';
import {handleProductRequest} from '../src/services/productionServerService';
import {resolveLessonSlides} from '../src/services/lessonSlidesService';

// 024 lecture slides: real SQL in PGlite through the real product handler. GCS is an in-memory bucket and Drive is a
// stubbed fetch; no network, no AI. Covers the acceptance matrix of docs/proposals/CLASS_LAB_SLIDES_2026-11-04.md.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of fs.readdirSync('gcp/sql').filter(f=>/^\d{3}_.*\.sql$/.test(f)&&!/^00[47]_/.test(f)).sort())await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000024`;
const actors:Record<string,{user:number;email:string;role:string}>={
  trainer:{user:30,email:'trainer@alpha.test',role:'instructor'},
  trainer2:{user:31,email:'trainer2@alpha.test',role:'instructor'},
  viewer:{user:32,email:'viewer@alpha.test',role:'instructor'},
  outsider:{user:33,email:'outsider@alpha.test',role:'instructor'},
  'learner-a':{user:1,email:'learner-a@alpha.test',role:'learner'},
  'learner-b':{user:2,email:'learner-b@alpha.test',role:'learner'},
  admin:{user:50,email:'admin@alpha.test',role:'admin'},
};
configureFirebaseVerifierForTests(async token=>{const a=actors[token];if(!a)throw Error('Unknown offline identity');return {subject:id(a.user+100),email:a.email,firebaseUid:token};});
for(const a of Object.values(actors))await db.query('INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,$2,$2,$3,$4,now())',[id(a.user),a.email,a.role,id(a.user+100)]);
// Classes A and B share one course (lessons L1, L2, L3); class C is another course with its own lesson LC.
const A=id(6),B=id(7),C=id(8),L1=id(11),L2=id(12),L3=id(13),LC=id(14);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Alpha','Testing')",[id(4)]);
await db.query("INSERT INTO product_domains(client_id,domain,active,updated_by) VALUES($1,'alpha.test',true,$2)",[id(4),id(50)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course',  'published'),($2,'Other','published')",[id(5),id(9)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published'),($3,$4,'Other','published')",[id(15),id(5),id(16),id(9)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status,position) VALUES($1,$5,'L1','Lesson 1','published',1),($2,$5,'L2','Lesson 2','published',2),($3,$5,'L3','Lesson 3','published',3),($4,$6,'LC','Other lesson','published',1)",[L1,L2,L3,LC,id(15),id(16)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-A',$4,$5,'Ops',now()-interval '1 day',now()+interval '30 days'),($2,'CLASS-B',$4,$5,'Ops',now()-interval '1 day',now()+interval '30 days'),($3,'CLASS-C',$6,$5,'Ops',now()-interval '1 day',now()+interval '30 days')",[A,B,C,id(5),id(4),id(9)]);
await db.query("INSERT INTO course_instructors(course_id,user_id,permission) VALUES($1,$2,'editor'),($1,$3,'editor'),($1,$4,'viewer'),($5,$6,'editor')",[id(5),id(30),id(31),id(32),id(9),id(33)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2),($3,$4)',[id(21),id(1),id(22),id(2)]);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2),($3,$4)',[id(21),A,id(22),B]);

// In-memory private bucket. The test plays the browser by writing bytes to the path the server signed.
const objects=new Map<string,Buffer>();
(cloudStorage as any).from=(bucket:string)=>{assert.equal(bucket,'product-lesson-slides','slides never touch the SOP bucket');return {
  async createSignedUploadUrl(path:string,options:{size:number}){return {data:{token:'https://storage.googleapis.com/offline/'+path+'?size='+options.size,signedUrl:''},error:null};},
  async download(path:string){const bytes=objects.get(path);return bytes?{data:new Blob([new Uint8Array(bytes)]),error:null,generation:'7'}:{data:null,error:Error('missing')};},
  async putImmutableOriginal(path:string,bytes:Buffer){const prior=objects.get(path);if(prior&&!prior.equals(bytes))return {data:null,error:Error('mismatch')};objects.set(path,Buffer.from(bytes));return {data:{path,generation:'8'},error:null};},
  async createSignedUrl(path:string,seconds:number){assert.ok(seconds<=300);return {data:{signedUrl:'https://storage.googleapis.com/offline/'+path+'?X-Goog-Signature=test'},error:null};},
};};
const pdf=async(pages:number)=>{const doc=await PDFDocument.create();for(let i=0;i<pages;i++)doc.addPage([320,180]);return Buffer.from(await doc.save({useObjectStreams:false}));};
const call=(token:string,action:string,payload:Record<string,unknown>={})=>handleProductRequest('Bearer '+token,{action,...payload});
let request=500;const nextRequest=()=>id(++request);
async function upload(token:string,classId:string,bytes:Buffer,extra:Record<string,unknown>){
  const requestId=nextRequest(),signed=await call(token,'prepareSlideUpload',{classId,requestId,size:bytes.length});
  assert.equal(signed.bucket,'product-lesson-slides');assert.ok(!signed.path.includes('..'));
  objects.set(signed.path,bytes);
  return {requestId,...await call(token,'completeSlideUpload',{classId,requestId,...extra})};
}
const lessonSlides=async(token:string,classId:string,lessonId:string)=>(await call(token,'snapshot',{classId})).lessons.find((l:any)=>l.id===lessonId)?.slides??null;

// 1. Nothing configured: labs behave as before, no slides tab, open is refused.
assert.equal(await lessonSlides('learner-a',A,L1),null);
await assert.rejects(()=>call('learner-a','openSlides',{classId:A,lessonId:L1}),/not available/);

// 2. Validation before anything is stored: fake, empty, oversize; viewer/learner cannot upload.
const fake=Buffer.from('not a pdf at all');
await assert.rejects(()=>upload('trainer',A,fake,{title:'Fake'}),/not a PDF/);
await assert.rejects(()=>call('trainer','prepareSlideUpload',{classId:A,requestId:nextRequest(),size:25*1024*1024+1}),/up to 25 MB/);
await assert.rejects(()=>call('trainer','prepareSlideUpload',{classId:A,requestId:nextRequest(),size:0}),/up to 25 MB/);
await assert.rejects(()=>call('trainer','completeSlideUpload',{classId:A,requestId:nextRequest(),title:'Never uploaded'}),/not received/);
const broken=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(64,1)]);
await assert.rejects(()=>upload('trainer',A,broken,{title:'Broken'}),/cannot be read/);
const encrypted=Buffer.from((await pdf(2)).toString('latin1').replace(/trailer\s*<</,'trailer\n<<\n/Encrypt 1 0 R'),'latin1');
await assert.rejects(()=>upload('trainer',A,encrypted,{title:'Locked'}),/password-protected/);
for(const token of ['viewer','learner-a'])await assert.rejects(()=>call(token,'prepareSlideUpload',{classId:A,requestId:nextRequest(),size:100}),/outside your assigned access/);
assert.equal((await db.query('SELECT count(*)::int n FROM product_slide_versions')).rows[0].n as any,0,'failed uploads leave no draft');

// 3. One class, one deck, two labs: upload once; L1 opens at 1, L2 at 13-24.
const deck30=await pdf(30);
const v1=await upload('trainer',A,deck30,{title:'Week 1 slides'});
assert.equal(v1.pageCount,30);
// Retry of the same request (double-click / network retry) returns the same draft.
assert.deepEqual(await call('trainer','completeSlideUpload',{classId:A,requestId:v1.requestId,title:'Week 1 slides'}),{deckId:v1.deckId,versionId:v1.versionId,pageCount:30});
assert.equal(await lessonSlides('learner-a',A,L1),null,'a draft is invisible to learners');
await assert.rejects(()=>call('trainer','setDefaultSlideDeck',{classId:A,deckId:v1.deckId}),/Publish the deck before/);
await assert.rejects(()=>call('viewer','publishSlideVersion',{classId:A,versionId:v1.versionId}),/outside your assigned access/);
assert.equal((await call('trainer','publishSlideVersion',{classId:A,versionId:v1.versionId})).versionId,v1.versionId);
assert.equal((await call('trainer','publishSlideVersion',{classId:A,versionId:v1.versionId})).unchanged,true,'re-publish is a no-op');
await call('trainer','setDefaultSlideDeck',{classId:A,deckId:v1.deckId});
await call('trainer','saveLessonSlides',{classId:A,lessonId:L2,mode:'inherit',startPage:13,endPage:24,expectedRevision:0});
assert.deepEqual(await lessonSlides('learner-a',A,L1),{deckId:v1.deckId,versionId:v1.versionId,title:'Week 1 slides',pageCount:30,startPage:1,endPage:30,ranged:false});
assert.deepEqual(await lessonSlides('learner-a',A,L2),{deckId:v1.deckId,versionId:v1.versionId,title:'Week 1 slides',pageCount:30,startPage:13,endPage:24,ranged:true});
const opened=await call('learner-a','openSlides',{classId:A,lessonId:L2});
assert.equal(opened.startPage,13);assert.match(opened.url,/^https:\/\/storage\.googleapis\.com\//);assert.ok(Date.parse(opened.expiresAt)-Date.now()<=300000);
// Range checks: beyond the deck, end before start, stale revision.
await assert.rejects(()=>call('trainer','saveLessonSlides',{classId:A,lessonId:L3,mode:'inherit',startPage:25,endPage:40,expectedRevision:0}),/Page range exceeds deck/);
await assert.rejects(()=>call('trainer','saveLessonSlides',{classId:A,lessonId:L3,mode:'inherit',startPage:9,endPage:3,expectedRevision:0}),/Invalid page range/);
await assert.rejects(()=>call('trainer','saveLessonSlides',{classId:A,lessonId:L2,mode:'inherit',startPage:2,expectedRevision:0}),/Revision conflict/);
// Start only = to the end of the deck.
await call('trainer','saveLessonSlides',{classId:A,lessonId:L3,mode:'inherit',startPage:28,expectedRevision:0});
assert.equal((await lessonSlides('learner-a',A,L3)).endPage,30);

// 4. A second deck for L2 only; changing the default later keeps L2's explicit choice.
const other=await upload('trainer',A,await pdf(5),{title:'Case study'});
await call('trainer','publishSlideVersion',{classId:A,versionId:other.versionId});
await call('trainer','saveLessonSlides',{classId:A,lessonId:L2,mode:'deck',deckId:other.deckId,startPage:2,endPage:4,expectedRevision:1});
assert.equal((await lessonSlides('learner-a',A,L2)).deckId,other.deckId);
assert.equal((await lessonSlides('learner-a',A,L1)).deckId,v1.deckId,'only L2 changed');
await assert.rejects(()=>call('trainer','setDefaultSlideDeck',{classId:A,deckId:other.deckId}),/Page range exceeds deck/,'L3 inherits 28-30, which does not fit 5 pages');

// 5. Two classes sharing the lesson: nothing of class A leaks to class B, even with guessed IDs.
assert.equal(await lessonSlides('learner-b',B,L1),null);
assert.deepEqual((await call('trainer','slideDecks',{classId:B})).decks,[]);
await assert.rejects(()=>call('learner-b','openSlides',{classId:A,lessonId:L1}),/outside your assigned access|Class access denied/);
await assert.rejects(()=>call('trainer','previewSlideVersion',{classId:B,versionId:v1.versionId}),/not available/);
await assert.rejects(()=>call('trainer','saveLessonSlides',{classId:B,lessonId:L1,mode:'deck',deckId:v1.deckId,expectedRevision:0}),/published deck of this class/);
await assert.rejects(()=>call('trainer','publishSlideVersion',{classId:B,versionId:v1.versionId}),/Slide version outside class/);
await assert.rejects(()=>call('trainer','setDefaultSlideDeck',{classId:B,deckId:v1.deckId}),/Publish the deck before/);
await assert.rejects(()=>call('trainer','removeSlideDeck',{classId:B,deckId:v1.deckId,confirmOff:true}),/Slide deck outside class/);
const small=await pdf(3);await assert.rejects(()=>upload('trainer',B,small,{deckId:v1.deckId}),/Slide deck outside class/);
await assert.rejects(()=>call('outsider','slideDecks',{classId:A}),/outside your assigned access/);
await assert.rejects(()=>call('trainer','saveLessonSlides',{classId:A,lessonId:LC,mode:'inherit',expectedRevision:0}),/Lesson outside course/);
// Database constraints hold even for a direct service write with a foreign deck.
await assert.rejects(()=>db.query("INSERT INTO product_lesson_slides(class_id,lesson_id,mode,deck_id) VALUES($1,$2,'deck',$3)",[B,L1,v1.deckId]),/foreign key/);
await assert.rejects(()=>db.query("UPDATE product_slide_decks SET published_version_id=$1 WHERE id=$2",[v1.versionId,other.deckId]),/foreign key/);
await assert.rejects(()=>db.query("INSERT INTO product_lesson_slides(class_id,lesson_id,mode) VALUES($1,$2,'inherit')",[C,L1]),/Lesson outside course/);
// The class B learner's own class gets its own configuration without touching class A.
const bDeck=await upload('trainer',B,await pdf(8),{title:'Class B deck'});
await call('trainer','publishSlideVersion',{classId:B,versionId:bDeck.versionId});await call('trainer','setDefaultSlideDeck',{classId:B,deckId:bDeck.deckId});
assert.equal((await lessonSlides('learner-b',B,L2)).deckId,bDeck.deckId);
assert.equal((await lessonSlides('learner-a',A,L2)).deckId,other.deckId);

// 6. Draft v2 while learners keep v1; publish blocks out-of-range labs; ranges and version change together.
const v2=await upload('trainer',A,await pdf(20),{deckId:v1.deckId});
assert.equal((await lessonSlides('learner-a',A,L1)).versionId,v1.versionId,'learners keep v1 during review');
assert.equal((await call('trainer','previewSlideVersion',{classId:A,versionId:v2.versionId})).url.includes('uploads/'),true,'editor previews the draft');
await assert.rejects(()=>call('trainer','publishSlideVersion',{classId:A,versionId:v2.versionId,expectedVersionId:v1.versionId}),/Page range exceeds deck/);
assert.equal((await lessonSlides('learner-a',A,L3)).versionId,v1.versionId,'failed publish changes nothing');
// Two editors publish against the same reviewed version: the first wins, the second must reload.
const v3=await upload('trainer2',A,await pdf(30),{deckId:v1.deckId});
const [first,second]=await Promise.allSettled([
  call('trainer','publishSlideVersion',{classId:A,versionId:v2.versionId,expectedVersionId:v1.versionId,ranges:[{lessonId:L3,start:18,end:20}]}),
  call('trainer2','publishSlideVersion',{classId:A,versionId:v3.versionId,expectedVersionId:v1.versionId})]);
assert.equal(first.status,'fulfilled');assert.equal(second.status,'rejected');assert.match(String((second as any).reason?.message),/Slide deck changed; reload/);
assert.deepEqual(await lessonSlides('learner-a',A,L3),{deckId:v1.deckId,versionId:v2.versionId,title:'Week 1 slides',pageCount:20,startPage:18,endPage:20,ranged:true});

// 7. Drive: approved folder only, PDF copied, Google Slides exported, size/permission failures keep the published version.
const previousFetch=globalThis.fetch,{privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({type:'service_account',client_email:'slides-test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'}).toString(),private_key_id:'k'});
process.env.WORKSPACE_SOURCE_BINDINGS_JSON=JSON.stringify({[A]:{folders:['folderA']},[B]:{folders:['folderB']}});
const drivePdf=await pdf(12),exported=await pdf(9);let revoked=false;
const listed=[{id:'pdfA1',name:'Week 2.pdf',mimeType:'application/pdf',size:String(drivePdf.length)},{id:'slidesA1',name:'Talk',mimeType:'application/vnd.google-apps.presentation'},{id:'bigA1',name:'Huge talk',mimeType:'application/vnd.google-apps.presentation'},{id:'pptxA1',name:'Old.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}];
globalThis.fetch=(async(input:any)=>{
  const url=String(input);
  if(url==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({access_token:'offline',expires_in:3600}));
  if(url.includes('/drive/v3/files?'))return new Response(JSON.stringify({files:url.includes('folderA')?listed:[{id:'pdfB1',name:'B.pdf',mimeType:'application/pdf',size:'10'}]}));
  const file=listed.find(f=>url.includes('/files/'+f.id));
  if(!file||revoked)return new Response('{}',{status:404});
  if(url.includes('?fields='))return new Response(JSON.stringify(file));
  if(file.id==='bigA1')return new Response(JSON.stringify({error:{errors:[{reason:'exportSizeLimitExceeded'}]}}),{status:403});
  return new Response(file.id==='pdfA1'?drivePdf:exported);
}) as typeof fetch;
try{
  const list=await call('trainer','listDriveSlides',{classId:A});
  assert.equal(list.configured,true);assert.deepEqual(list.files.map((f:any)=>f.id),['pdfA1','slidesA1','bigA1'],'PPTX is not offered');
  assert.equal((await call('outsider','listDriveSlides',{classId:C})).configured,false);
  const fromDrive=await call('trainer','importDriveSlides',{classId:A,requestId:nextRequest(),fileId:'pdfA1',title:'Week 2'});
  assert.equal(fromDrive.pageCount,12);
  const slides=await call('trainer','importDriveSlides',{classId:A,requestId:nextRequest(),fileId:'slidesA1',title:'Talk'});
  assert.equal(slides.pageCount,9);
  const kinds=(await db.query('SELECT source_kind,drive_file_id FROM product_slide_versions WHERE id IN ($1,$2) ORDER BY page_count',[fromDrive.versionId,slides.versionId])).rows as any[];
  assert.deepEqual(kinds,[{source_kind:'drive_slides',drive_file_id:'slidesA1'},{source_kind:'drive_pdf',drive_file_id:'pdfA1'}]);
  await assert.rejects(()=>call('trainer','importDriveSlides',{classId:A,requestId:nextRequest(),fileId:'bigA1',title:'Huge'}),/at most 10 MB/);
  await assert.rejects(()=>call('trainer','importDriveSlides',{classId:A,requestId:nextRequest(),fileId:'pdfB1',title:'Foreign'}),/not approved for this class/);
  await assert.rejects(()=>call('trainer','importDriveSlides',{classId:B,requestId:nextRequest(),fileId:'pdfA1',title:'Foreign'}),/not approved for this class/);
  await call('trainer','publishSlideVersion',{classId:A,versionId:fromDrive.versionId});
  // "Get latest from Drive" after the file was unshared: refused, the published version keeps serving.
  revoked=true;
  await assert.rejects(()=>call('trainer','importDriveSlides',{classId:A,requestId:nextRequest(),fileId:'pdfA1',deckId:fromDrive.deckId}),/not approved|no longer read/);
  assert.equal((await call('trainer','slideDecks',{classId:A})).decks.find((d:any)=>d.id===fromDrive.deckId).published_version_id,fromDrive.versionId);
}finally{globalThis.fetch=previousFetch;}

// 8. Removing decks: in use needs a replacement or explicit off; no broken link is left.
await assert.rejects(()=>call('trainer','removeSlideDeck',{classId:A,deckId:other.deckId}),/Choose a replacement deck or confirm/);
await call('trainer','removeSlideDeck',{classId:A,deckId:other.deckId,replacementDeckId:v1.deckId});
assert.deepEqual(await lessonSlides('learner-a',A,L2),{deckId:v1.deckId,versionId:v2.versionId,title:'Week 1 slides',pageCount:20,startPage:1,endPage:20,ranged:false},'moved to the replacement, whole deck');
await call('trainer','removeSlideDeck',{classId:A,deckId:v1.deckId,confirmOff:true});
for(const lesson of [L1,L2,L3])assert.equal(await lessonSlides('learner-a',A,lesson),null,'explicit and inheriting labs are off');
assert.equal((await db.query("SELECT count(*)::int n FROM product_lesson_slides WHERE class_id=$1 AND mode<>'off'",[A])).rows[0].n as any,0);

// 9. Locked lab: the learner cannot obtain a new read URL; admins may manage.
const g=await upload('admin',A,await pdf(4),{title:'Admin deck'});
await call('admin','publishSlideVersion',{classId:A,versionId:g.versionId});await call('admin','setDefaultSlideDeck',{classId:A,deckId:g.deckId});
await call('trainer','saveLessonSlides',{classId:A,lessonId:L1,mode:'inherit',expectedRevision:0});
assert.equal((await call('learner-a','openSlides',{classId:A,lessonId:L1})).pageCount,4);
await db.query("UPDATE lessons SET status='draft' WHERE id=$1",[L1]);
await assert.rejects(()=>call('learner-a','openSlides',{classId:A,lessonId:L1}),/Lesson scope denied/);
// Revoked access: an unenrolled learner is refused on the next open.
await db.query('DELETE FROM enrollments WHERE learner_id=$1',[id(21)]);
await assert.rejects(()=>call('learner-a','openSlides',{classId:A,lessonId:L2}),/outside your assigned access|Class access denied/);

// Pure resolver edge cases.
const decks=[{id:'d1',title:'D',is_default:true,published_version_id:'v1'},{id:'d2',title:'E',is_default:false,published_version_id:null}],versions=[{id:'v1',deck_id:'d1',page_count:10}];
assert.equal(resolveLessonSlides('x',decks,versions,[{lesson_id:'x',mode:'deck',deck_id:'d2',start_page:null,end_page:null,revision:1}]),null,'unpublished explicit deck hides the tab');
assert.equal(resolveLessonSlides('x',decks,versions,[{lesson_id:'x',mode:'off',deck_id:null,start_page:null,end_page:null,revision:1}]),null);
assert.deepEqual(resolveLessonSlides('x',decks,versions,[{lesson_id:'x',mode:'inherit',deck_id:null,start_page:40,end_page:60,revision:1}])?.startPage,10,'stale range is clamped, never past the deck');

// Rollback drops only slide metadata.
await db.exec(fs.readFileSync('gcp/sql/rollback/024_lesson_slides.sql','utf8'));
assert.equal((await db.query("SELECT count(*)::int n FROM pg_tables WHERE tablename LIKE 'product_%slide%'")).rows[0].n as any,0);
assert.equal(await lessonSlides('trainer',A,L2),null,'snapshot still works without 024');
console.log('verify_lesson_slides: PASS (upload/Drive/publish/default/ranges/removal, class isolation, drafts, concurrency, locks; offline)');
