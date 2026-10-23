import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createGenerationTask,generationAsyncEnabled,newGenerationToken} from '../src/services/generationQueueService';
import {cloudHandler} from '../src/services/cloudRunServer';
const env={GENERATION_MODE:'async',GENERATION_QUEUE:'projects/offline-test/locations/asia-southeast1/queues/existing-fixture',GENERATION_WORKER_URL:'https://example.test/'};
assert.equal(generationAsyncEnabled({}),false);assert.equal(generationAsyncEnabled(env),true);
assert.equal(generationAsyncEnabled({...env,GENERATION_WORKER_URL:'http://example.test'}),false);
const token=newGenerationToken();const task={subject:'00000000-0000-4000-8000-000000000001',requestId:'00000000-0000-4000-8000-000000000002',generation:1,token:token.token};let requests=0;
await createGenerationTask(task,env,async(url,options)=>{requests++;const body=JSON.parse(options!.body as string);assert.equal(body.task.name,env.GENERATION_QUEUE+'/tasks/generation-'+task.subject+'-'+task.requestId+'-g1');assert.equal(body.task.httpRequest.url,'https://example.test/internal/generation');assert.deepEqual(JSON.parse(Buffer.from(body.task.httpRequest.body,'base64').toString()),{subject:task.subject,requestId:task.requestId});return new Response('{}',{status:409});},async()=>'offline-fixture');assert.equal(requests,1);
await assert.rejects(()=>createGenerationTask({...task,token:'bad'},env),/Invalid/);
async function request(url:string,method='POST',body='{}'){let status=0;const req:any={url,method,headers:{},async *[Symbol.asyncIterator](){yield Buffer.from(body);}};const res:any={headersSent:false,setHeader(){},writeHead(code:number){status=code;this.headersSent=true;},end(){}};await cloudHandler(req,res);return status;}
Object.assign(process.env,env,{NODE_ENV:'test',RUNTIME_MODE:'ai-worker',AI_WORKER_ISOLATED:'true'});
assert.equal(await request('/api/product'),404);assert.equal(await request('/internal/generation'),401);assert.equal(await request('/internal/generation','GET'),405);assert.equal(await request('/internal/generation','POST','x'.repeat(4097)),413);
process.env.RUNTIME_MODE='api';process.env.AI_WORKER_ISOLATED='true';assert.equal(await request('/internal/generation'),404);
assert.equal(await request('/api/generate'),401,'legacy Generation entry still authenticates before async routing');
assert.equal(await request('/api/evaluate'),401,'legacy Judge entry still authenticates before async routing');
console.log('PASS generation Cloud Tasks contract and API/AI-worker separation; no network calls');

// Source wiring contract; authenticated runtime behavior is covered by SQL/service tests.
const product=fs.readFileSync(new URL('../src/services/productionServerService.ts',import.meta.url),'utf8');
assert.match(product,/GENERATION_MODE==='async'\|\|process\.env\.AI_WORKER_ISOLATED==='true'\)&&!generationAsyncEnabled\(\)/,'misconfigured async mode or isolation must fail closed');
for(const file of ['generate','evaluate']){
 const source=fs.readFileSync(new URL('../api/'+file+'.ts',import.meta.url),'utf8');
 assert.match(source,/AI_WORKER_ISOLATED==='true'\)&&!asyncMode/,'compatibility entry cannot bypass isolation');
 assert.ok(source.indexOf('await assertAiLessonAccess')<source.indexOf('const asyncMode='),'authorization precedes routing');
}
for(const action of ['sandboxGenerate','sandboxJudge']){
 const start=product.indexOf("case '"+action+"': {");assert.ok(start>=0);
 assert.match(product.slice(start,start+400),/AI_WORKER_ISOLATED==='true'.*503/,'isolated API rejects long Studio AI previews');
}
