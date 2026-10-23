import assert from 'node:assert/strict';
import {createRebuildRunService} from '../src/services/rebuildRunService';

// rebuild_begin_run errors map to the real cause, never to a generic 409 or the wrong quota. Offline only.
const id='a5000000-0000-4000-8000-000000000003';
const input={classId:id,lessonId:id,requestId:id,prompt:'Perform the fictional task.'};
let providers=0;
const run=(message:string)=>createRebuildRunService(async()=>({subject:id,lesson:{},server:{rpc:async()=>({data:null,error:{message}})}} as any),async()=>{providers++;return {output:'never'} as any;}).generateSavedRun('Bearer offline',input);
const cases:Array<[string,number,RegExp]>=[
  ['AI run quota exceeded',429,/40 per hour, 200 per day/],
  ['Basic daily execution quota exceeded',429,/Basic allows 10/],
  ['Access denied',403,/not available for your active enrollment/],
  ['Request key conflict',409,/different input/],
  ['Request processing or uncertain; inspect before retry',409,/still processing/],
];
for(const [message,status,text] of cases)await assert.rejects(()=>run(message),(e:any)=>e.statusCode===status&&text.test(e.message),message);
assert.equal(providers,0,'A refused run never reaches the provider');
console.log('Run begin errors PASS: 40/h and Basic quotas distinguished, enrollment 403, key conflict and processing 409. Offline only.');
