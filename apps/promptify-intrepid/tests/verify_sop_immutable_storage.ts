import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Storage} from '@google-cloud/storage';
import {cloudStorage} from '../src/services/cloudStorageService';

process.env.GCP_SOP_BUCKET='offline-private-bucket';
const original=Storage.prototype.bucket;
const bytes=Buffer.from('immutable private SOP bytes');
const sha256=createHash('sha256').update(bytes).digest('hex');
const calls:any[]=[];
let existing:any={size:String(bytes.length),contentType:'text/plain',metadata:{sha256}};
let duplicate=false;
Storage.prototype.bucket=function(name:string){assert.equal(name,'offline-private-bucket');return {file(path:string){return {
 async save(value:Buffer,options:any){calls.push({path,bytes:Buffer.from(value),options});if(duplicate){const error:any=new Error('precondition failed');error.code=412;throw error;}},
 async getMetadata(){return [existing];}
};}};} as any;
try{
 const store=cloudStorage.from('product-sop-originals');
 const result=await store.putImmutableOriginal('drive-snapshots/classA/fileA/'+sha256+'/source.txt',bytes,{sha256,contentType:'text/plain'});
 assert.equal(result.error,null);assert.equal(result.data?.path,'drive-snapshots/classA/fileA/'+sha256+'/source.txt');
 assert.equal(calls[0].options.preconditionOpts.ifGenerationMatch,0,'writes must be create-only');assert.equal(calls[0].options.metadata.metadata.sha256,sha256);assert.deepEqual(calls[0].bytes,bytes);
 await store.putImmutableOriginal('drive-snapshots/classA/fileA/'+sha256+'/source.txt',bytes,{sha256,contentType:'text/plain'});
 assert.equal(calls.length,2);
 duplicate=true;assert.equal((await store.putImmutableOriginal('drive-snapshots/classA/fileA/'+sha256+'/source.txt',bytes,{sha256,contentType:'text/plain'})).error,null,'identical existing object is safely reusable');
 existing={size:'1',contentType:'text/plain',metadata:{sha256:'0'.repeat(64)}};
 assert.ok((await store.putImmutableOriginal('drive-snapshots/classA/fileA/'+sha256+'/source.txt',bytes,{sha256,contentType:'text/plain'})).error,'conflicting existing object must fail closed');
 assert.ok((await store.putImmutableOriginal('drive-snapshots/classA/fileA/'+sha256+'/source.txt',bytes,{sha256:'0'.repeat(64),contentType:'text/plain'})).error,'provided hash must match actual bytes');
 assert.throws(()=>cloudStorage.from('public'));
 console.log('SOP immutable storage PASS: create-only writes, byte/hash validation, identical duplicate reuse, conflict rejection; no cloud calls.');
}finally{Storage.prototype.bucket=original;}
