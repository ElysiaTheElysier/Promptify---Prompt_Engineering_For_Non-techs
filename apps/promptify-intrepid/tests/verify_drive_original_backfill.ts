import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {Storage} from '@google-cloud/storage';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {handleProductRequest} from '../src/services/productionServerService';

process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
const db=new PGlite();
await db.exec(fs.readFileSync('gcp/sql/001_baseline.sql','utf8'));
await db.exec(fs.readFileSync('gcp/sql/005_department_correction_auto_approval.sql','utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};}});
configureFirebaseVerifierForTests(async token=>{
 if(!['offline-backfill-admin','offline-backfill-learner'].includes(token))throw Error('Unknown offline identity');
 return token==='offline-backfill-admin'?{subject:id(22),email:'admin@example.test',firebaseUid:token}:{subject:id(23),email:'learner@example.test',firebaseUid:token};
});

await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'admin@example.test','Offline admin','admin',$2,now()),($3,'learner@example.test','Offline learner','learner',$4,now())",[id(1),id(22),id(2),id(23)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(3),id(2)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Offline client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Offline course','published')",[id(5)]);
for(const [classId,code] of [[id(6),'CLASS-A'],[id(7),'CLASS-B']]){
 await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,$2,$3,$4,'Offline',now()-interval '1 day',now()+interval '1 day')",[classId,code,id(5),id(4)]);
 await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(3),classId]);
}
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'SHARED','Shared lesson','published')",[id(9),id(8)]);
for(const [doc,version,cls,title,content] of [[90,91,6,'Canonical source','Canonical content remains unchanged.'],[92,93,7,'Foreign source','Foreign content.'],[94,95,6,'Unbound source','Unbound content.']] as const){
 await db.query('INSERT INTO rebuild_sop_documents(id,class_id,title,created_by) VALUES($1,$2,$3,$4)',[id(doc),id(cls),title,id(1)]);
 await db.query('INSERT INTO rebuild_sop_versions(id,document_id,version,content,created_by) VALUES($1,$2,1,$3,$4)',[id(version),id(doc),content,id(1)]);
}
await db.query('INSERT INTO rebuild_sop_bindings(class_id,lesson_id,document_id,version_id) VALUES($1,$2,$3,$4),($5,$2,$6,$7)',[id(6),id(9),id(90),id(91),id(7),id(92),id(93)]);
const sourceText='Original indexed file bytes remain exact.\n';
const sourceBytes=Buffer.from(sourceText),sha256=createHash('sha256').update(sourceBytes).digest('hex');
const sourceMetadata={filename:'Canonical Name.txt',type:'TXT',pages:null,bytes:sourceBytes.length,sha256,driveFileId:'driveFile_test1',sourceMimeType:'text/plain',snapshotKind:'drive-original'};
const chunks=[{position:1,page:null,content:'Canonical indexed chunk.'}];
for(const [n,cls,version,status,metadata,content] of [[100,6,91,'published',sourceMetadata,'Canonical content remains unchanged.'],[101,7,93,'published',{...sourceMetadata,filename:'Foreign.txt',sha256:'f'.repeat(64)},'Foreign content.'],[102,6,null,'pending',sourceMetadata,'Pending content.'],[103,6,95,'published',sourceMetadata,'Unbound content.']] as const){
 await db.query('INSERT INTO product_sop_contributions(id,actor_id,request_id,class_id,lesson_id,title,content,metadata,chunks,status,version_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)',[id(n),id(1),id(200+n),id(cls),id(9),`Source ${n}`,content,JSON.stringify(metadata),JSON.stringify(chunks),status,version===null?null:id(version)]);
}
process.env.WORKSPACE_SOURCE_BINDINGS_JSON=JSON.stringify({[id(6)]:{files:['driveFile_test1']}});

const oldAccount=process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({type:'service_account',client_email:'backfill-test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'}).toString(),private_key_id:'backfill-test-key'});
const oldFetch=globalThis.fetch;let driveReads=0,media=sourceBytes;
globalThis.fetch=(async(input:any)=>{
 const url=String(input);
 if(url==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({access_token:'offline-backfill-token',expires_in:3600}),{status:200});
 if(url.includes('/files/driveFile_test1?fields=')){driveReads++;return new Response(JSON.stringify({id:'driveFile_test1',name:'Renamed in Drive.txt',mimeType:'text/plain',size:String(media.length)}),{status:200});}
 if(url.includes('/files/driveFile_test1?alt=media')){driveReads++;return new Response(media,{status:200,headers:{'content-length':String(media.length)}});}
 throw new Error(`Unexpected offline fetch: ${url}`);
}) as typeof fetch;

process.env.GCP_SOP_BUCKET='offline-private-bucket';
const oldBucket=Storage.prototype.bucket;
const storageCalls:any[]=[];const objects=new Map<string,any>();const signedCalls:any[]=[];
Storage.prototype.bucket=function(name:string){assert.equal(name,'offline-private-bucket');return {file(path:string){return {
 async save(bytes:Buffer,options:any){storageCalls.push({path,bytes:Buffer.from(bytes),options});if(objects.has(path)){const error:any=new Error('precondition failed');error.code=412;throw error;}objects.set(path,{size:String(bytes.length),contentType:options.metadata.contentType,metadata:options.metadata.metadata,generation:'44'});},
 async getMetadata(){const value=objects.get(path);if(!value)throw new Error('object missing');return [value];},
 async getSignedUrl(options:any){signedCalls.push({path,options});return ['https://example.test/private-source'];}
};}};} as any;
try{
 const request=(action:string,token='offline-backfill-admin',payload:any={})=>handleProductRequest(`Bearer ${token}`,{action,classId:id(6),versionId:id(91),...payload});
 const before=driveReads;
 await assert.rejects(()=>request('backfillDriveOriginal','offline-backfill-learner',{expectedSha256:sha256}),(e:any)=>e.statusCode===403,'learners cannot backfill originals');
 for(const versionId of [id(93),id(102),id(103)])await assert.rejects(()=>request('backfillDriveOriginal','offline-backfill-admin',{versionId,expectedSha256:sha256}),(e:any)=>e.statusCode===403,'foreign, pending, and unbound versions cannot be backfilled');
 await assert.rejects(()=>request('backfillDriveOriginal','offline-backfill-admin',{expectedSha256:'0'.repeat(64)}),(e:any)=>e.statusCode===409,'wrong canonical expected hash is rejected');
 assert.equal(driveReads,before,'authorization and canonical hash failures happen before Drive reads');assert.equal(storageCalls.length,0);

 media=Buffer.from('Changed Drive bytes after indexing.');
 await assert.rejects(()=>request('backfillDriveOriginal','offline-backfill-admin',{expectedSha256:sha256}),(e:any)=>e.statusCode===409,'changed current Drive bytes cannot be backfilled');
 assert.equal(storageCalls.length,0,'changed hash must fail before private storage write');

 media=sourceBytes;
 const restored=await request('backfillDriveOriginal','offline-backfill-admin',{expectedSha256:sha256});
 assert.deepEqual(restored,{versionId:id(91),restored:true,sha256});assert.equal(storageCalls.length,1);assert.deepEqual(storageCalls[0].bytes,sourceBytes);
 const rowAfter=(await db.query('SELECT metadata,content,chunks FROM product_sop_contributions WHERE id=$1',[id(100)])).rows[0];
 assert.equal(rowAfter.metadata.filename,'Canonical Name.txt');assert.equal(rowAfter.metadata.type,'TXT');assert.equal(rowAfter.metadata.sha256,sha256);assert.equal(rowAfter.metadata.bytes,sourceBytes.length);
 assert.equal(rowAfter.content,'Canonical content remains unchanged.');assert.deepEqual(rowAfter.chunks,chunks);
 assert.equal(rowAfter.metadata.storageBucket,'product-sop-originals');assert.match(rowAfter.metadata.storagePath,/^drive-snapshots\//);
 const readsAfterRestore=driveReads;
 assert.deepEqual(await request('backfillDriveOriginal','offline-backfill-admin',{expectedSha256:sha256}),{versionId:id(91),restored:false});
 assert.equal(driveReads,readsAfterRestore,'already-restored versions are idempotent without another Drive read');assert.equal(storageCalls.length,1);
 const signed=await request('sourceDownload','offline-backfill-admin');
 assert.deepEqual(signed,{url:'https://example.test/private-source'});assert.equal(signedCalls.length,1);
 assert.equal(signedCalls[0].path,rowAfter.metadata.storagePath);assert.equal(signedCalls[0].options.responseDisposition.includes('filename="Canonical Name.txt"'),true,'download uses the canonical filename');
 assert.equal(driveReads,readsAfterRestore,'signed source download uses the immutable snapshot without Drive access');
 const learnerSigned=await request('sourceDownload','offline-backfill-learner');
 assert.deepEqual(learnerSigned,{url:'https://example.test/private-source'});assert.equal(signedCalls.length,2,'valid learner identity can download an enrolled class source');
 assert.equal(signedCalls[1].path,rowAfter.metadata.storagePath);assert.equal(driveReads,readsAfterRestore,'learner source download also uses only the stored snapshot');
 await db.close();
 console.log('Drive original backfill PASS: actual handler authorization, exact hash gate, changed-source rejection, pointer-only metadata, idempotent restoration, canonical-name signed download; no cloud/provider calls.');
}finally{
 globalThis.fetch=oldFetch;Storage.prototype.bucket=oldBucket;
 if(oldAccount===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;else process.env.GOOGLE_SERVICE_ACCOUNT_JSON=oldAccount;
}
