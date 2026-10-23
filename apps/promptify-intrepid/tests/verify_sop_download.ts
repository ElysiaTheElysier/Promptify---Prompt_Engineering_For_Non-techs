import assert from 'node:assert/strict';
import {Storage} from '@google-cloud/storage';
import {cloudStorage} from '../src/services/cloudStorageService';
process.env.GCP_SOP_BUCKET='offline-private-bucket';
const original=Storage.prototype.bucket;
const requests:any[]=[];
Storage.prototype.bucket=function(name:string){assert.equal(name,'offline-private-bucket');return {file(path:string){return {async getSignedUrl(options:any){requests.push({path,options});return ['https://example.test/offline-signed'];}};}};} as any;
try {
const store=cloudStorage.from('product-sop-originals');
const before=Date.now();
assert.equal((await store.createSignedUrl('actor/class/source.txt',900,{download:true})).error,null);
assert.equal(requests[0].options.action,'read');
assert.match(requests[0].options.responseDisposition,/^attachment; filename="source.txt"; filename\*=UTF-8''source.txt$/);
assert.ok(requests[0].options.expires>=before+299000&&requests[0].options.expires<=Date.now()+300000);
await store.createSignedUrl('actor/class/source.txt',300,{download:'Tài liệu "x"\r\n.txt'});
const disposition=requests[1].options.responseDisposition;
assert.ok(!/[\r\n]/.test(disposition));
assert.ok(disposition.includes("filename*=UTF-8''T%C3%A0i%20li%E1%BB%87u%20_x___.txt"));
await store.createSignedUrl('actor/class/source.txt',300);
assert.equal(requests[2].options.responseDisposition,undefined,'ordinary signed views preserve previous behavior');
assert.ok((await store.createSignedUrl('../source.txt',300,{download:true})).error);
assert.equal(requests.length,3,'invalid paths never reach signing');
assert.throws(()=>cloudStorage.from('public'));
console.log('SOP download PASS: attachment, safe UTF-8 filename, expiry cap, path/bucket guards; no cloud calls.');
} finally {Storage.prototype.bucket=original;}

