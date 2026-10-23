import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {Storage} from '@google-cloud/storage';
import {extractDriveSop} from '../src/services/sopIngestionService';

const previousFetch=globalThis.fetch,previousAccount=process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const previousBucket=process.env.GCP_SOP_BUCKET,originalStorageBucket=Storage.prototype.bucket;
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({type:'service_account',client_email:'snapshot-test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'}).toString(),private_key_id:'snapshot-test-key'});
const raw=Buffer.from('Approved response time: 15 minutes.');
const digest=await import('node:crypto').then(({createHash})=>createHash('sha256').update(raw).digest('hex'));
let writes:Array<{path:string;bytes:Buffer;contentType:string;sha256:string}>=[];
const cloudWrites:any[]=[],cloudObjects=new Map<string,any>();
let metadata={id:'driveFile_test1',name:'SOP.txt',mimeType:'text/plain',size:String(raw.length)};
let media=raw;
globalThis.fetch=(async(input:any)=>{
 const url=String(input);
 if(url==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({access_token:'offline-test-token',expires_in:3600}),{status:200});
 if(url.includes('/files/driveFile_test1?fields='))return new Response(JSON.stringify(metadata),{status:200});
 if(url.includes('/files/driveFile_test1?alt=media'))return new Response(media,{status:200,headers:{'content-length':String(media.length)}});
 if(url.includes('/files/driveFile_test1/export?'))return new Response(media,{status:200,headers:{'content-length':String(media.length)}});
 throw new Error(`Unexpected offline fetch: ${url}`);
}) as typeof fetch;
process.env.GCP_SOP_BUCKET='offline-private-originals';
Storage.prototype.bucket=function(name:string){assert.equal(name,'offline-private-originals');return {file(path:string){return {
 async save(bytes:Buffer,options:any){cloudWrites.push({path,options});cloudObjects.set(path,{size:String(bytes.length),contentType:options.metadata.contentType,metadata:options.metadata.metadata,generation:'99'});},
 async getMetadata(){return [cloudObjects.get(path)];}
};}};} as any;
const storeOriginal=async(path:string,bytes:Buffer,contentType:string,sha256:string)=>{writes.push({path,bytes:Buffer.from(bytes),contentType,sha256});return {path,generation:'17'};};
try{
 const url='https://drive.google.com/file/d/driveFile_test1/view';
 const stored=await extractDriveSop(url,{classId:'class_test1',expectedSha256:digest,storeOriginal});
 assert.equal(stored.metadata.sha256,digest);assert.equal(stored.metadata.storageBucket,'product-sop-originals');
 assert.equal(stored.metadata.storagePath,`drive-snapshots/class_test1/driveFile_test1/${digest}/SOP.txt`);
 assert.equal(stored.metadata.snapshotGeneration,'17');assert.equal(stored.metadata.sourceMimeType,'text/plain');
 assert.equal(writes.length,1);assert.deepEqual(writes[0].bytes,raw);assert.equal(writes[0].contentType,'text/plain');
 assert.equal(Object.values(stored).some(value=>Buffer.isBuffer(value)),false,'raw byte buffers must not be returned');

 writes=[];await assert.rejects(()=>extractDriveSop(url,{classId:'class_test1',expectedSha256:'0'.repeat(64),storeOriginal}), (error:any)=>error.statusCode===409);
 assert.equal(writes.length,0,'changed Drive bytes must fail before any snapshot write');

 metadata={id:'driveFile_test1',name:'Operations Guide',mimeType:'application/vnd.google-apps.document',size:'0'};
 media=Buffer.from('Google document exported content.');writes=[];
 const native=await extractDriveSop('https://docs.google.com/document/d/driveFile_test1/edit',{classId:'class_test1',storeOriginal});
 assert.equal(native.metadata.filename,'Operations Guide.txt');assert.equal(native.metadata.snapshotKind,'google-doc-export-txt');
 assert.equal(native.metadata.sourceMimeType,'application/vnd.google-apps.document');assert.equal(writes[0].contentType,'text/plain');
 assert.ok(native.metadata.storagePath?.endsWith('/Operations Guide.txt'));

 metadata={id:'driveFile_test1',name:'SOP.txt',mimeType:'text/plain',size:String(raw.length)};media=raw;
 const defaultStored=await extractDriveSop(url,{classId:'class_test1',expectedSha256:digest});
 assert.equal(defaultStored.metadata.snapshotGeneration,'99','default private GCS path propagates the stored object generation');
 assert.equal(cloudWrites.length,1);assert.equal(cloudWrites[0].options.preconditionOpts.ifGenerationMatch,0,'default store remains create-only');

 metadata={id:'driveFile_other',name:'renamed.txt',mimeType:'text/plain',size:String(raw.length)};
 await assert.rejects(()=>extractDriveSop(url,{classId:'class_test1',storeOriginal}), (error:any)=>error.statusCode===502);
 console.log('Drive SOP snapshot PASS: deterministic private snapshot metadata, exact-hash gate before write, safe native export naming and MIME; no live Google or storage calls.');
}finally{
 globalThis.fetch=previousFetch;
 Storage.prototype.bucket=originalStorageBucket;
 if(previousBucket===undefined)delete process.env.GCP_SOP_BUCKET;else process.env.GCP_SOP_BUCKET=previousBucket;
 if(previousAccount===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;else process.env.GOOGLE_SERVICE_ACCOUNT_JSON=previousAccount;
}
