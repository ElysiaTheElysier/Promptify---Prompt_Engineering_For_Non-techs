/** Loopback-only capacity benchmark. Real migration 013 SQL, FAKE Vertex; NOT real app/RLS/Cloud SQL load. */
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {runWithProviderAdmission,withProviderScope,admissionRetryDelay} from '../src/services/providerAdmissionService';

process.env.PROVIDER_ADMISSION_MODE='sql';
const db=new PGlite();await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;');
await db.exec(fs.readFileSync('gcp/sql/013_provider_admission.sql','utf8'));
await db.exec("CREATE TABLE benchmark_runs(id uuid PRIMARY KEY,status text NOT NULL,dispatches integer NOT NULL DEFAULT 0)");
const names={enqueue:'product_provider_enqueue',acquire:'product_provider_acquire',settle:'product_provider_settle'};
let queries=0,dbMs=0,active=0,peak=0,providerCalls=0,duplicates=0;
let dbTimings:number[]=[];
const query=async(sql:string,args:unknown[]=[])=>{queries++;const start=performance.now();try{return await db.query(sql,args);}finally{const elapsed=performance.now()-start;dbMs+=elapsed;dbTimings.push(elapsed);}};
const store={async call(name:string,args:unknown[]){const fn=names[name as keyof typeof names];assert.ok(fn);return (await query(`SELECT ${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;}};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const promises=new Map<string,Promise<void>>();let events:any[]=[];const errors:string[]=[];
const pipeline=process.argv.includes('--pipeline');
let workerActive=0;const waiting:Array<()=>void>=[];let jobQueueMs:number[]=[];
async function stage(id:string,ordinal:number,phase=0){
 for(let attempt=0;attempt<3;attempt++){
  await query('UPDATE benchmark_runs SET dispatches=dispatches+1 WHERE id=$1',[id]);
  try{
   const response=await withProviderScope({tenant:id,correlationId:id},()=>runWithProviderAdmission({contents:'Fictional benchmark input',generationConfig:{maxOutputTokens:64,thinkingConfig:{thinkingBudget:0}}},30000,async()=>{
    active++;peak=Math.max(peak,active);providerCalls++;
    try{await sleep(20);return new Response(JSON.stringify({usageMetadata:{totalTokenCount:40},candidates:[]}),{status:ordinal%11===0&&attempt===0&&phase===(pipeline?3:0)?429:200});}
    finally{active--;}
   },{store,log:e=>events.push(e)}));
   if(response.status===200)return true;
   if(response.status!==429&&response.status!==503)break;
   await sleep(admissionRetryDelay(attempt));
  }catch(error){errors.push((error as Error).message);break;}
 }
 return false;
}
async function work(id:string,ordinal:number){
 const queued=performance.now();
 // Model four active durable job deliveries; ALL 100 HTTP submissions still return immediately.
 // This is fixture scheduling, not a substitute for production SQL job/lease recovery tests.
 if(pipeline){if(workerActive>=4)await new Promise<void>(resolve=>waiting.push(resolve));else workerActive++;}
 jobQueueMs.push(performance.now()-queued);
 try{
  await query("UPDATE benchmark_runs SET status='running' WHERE id=$1",[id]);
  let ok=await stage(id,ordinal);
  if(ok&&pipeline)ok=(await Promise.all([1,2,3,4,5,6].map(phase=>stage(id,ordinal,phase)))).every(Boolean);
  await query("UPDATE benchmark_runs SET status=$2 WHERE id=$1",[id,ok?'completed':'failed']);
 }finally{if(pipeline){const next=waiting.shift();if(next)next();else workerActive--;}}
}
const server=createServer(async(req,res)=>{
 const url=new URL(req.url||'/','http://127.0.0.1');
 if(req.method==='POST'&&url.pathname==='/runs'){
  let text='';for await(const chunk of req){text+=chunk;if(text.length>1024){res.writeHead(413);res.end();return;}}
  let body:any;try{body=JSON.parse(text);}catch{res.writeHead(400);res.end();return;}
  if(!/^[0-9a-f-]{36}$/.test(body.id)){res.writeHead(400);res.end();return;}
  const r=await query("INSERT INTO benchmark_runs(id,status) VALUES($1,'queued') ON CONFLICT DO NOTHING RETURNING id",[body.id]);
  if(r.rows.length){const p=work(body.id,body.ordinal||1);promises.set(body.id,p);}else duplicates++;
  res.writeHead(202,{'content-type':'application/json'});res.end(JSON.stringify({id:body.id}));return;
 }
 if(req.method==='GET'&&url.pathname.startsWith('/runs/')){
  const id=url.pathname.slice(6);if(!/^[0-9a-f-]{36}$/.test(id)){res.writeHead(400);res.end();return;}
  const r=await query('SELECT status FROM benchmark_runs WHERE id=$1',[id]);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(r.rows[0]||{}));return;
 }
 res.writeHead(404);res.end();
});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as any,base=`http://127.0.0.1:${address.port}`;
if(process.argv.includes('--serve')){
 await db.exec('UPDATE product_provider_budget SET concurrency=4,tokens_per_minute=500000,max_backlog=256,tenant_backlog=20');
 console.log('OFFLINE fake-provider fixture: '+base);
 await new Promise<void>(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
 await Promise.allSettled(promises.values());await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();process.exit(0);
}
const percentile=(values:number[],p:number)=>{const s=[...values].sort((a,b)=>a-b);return Math.round((s[Math.max(0,Math.ceil(s.length*p)-1)]||0)*100)/100;};
const inProcess=process.argv.includes('--in-process');
const request:typeof fetch=inProcess?(async(url:any,init:any={})=>new Promise<Response>((resolve,reject)=>{
 const req={url:new URL(String(url)).pathname,method:init.method||'GET',async *[Symbol.asyncIterator](){if(init.body)yield init.body;}};
 let status=200,headers:any={};const res={writeHead(code:number,h:any={}){status=code;headers=h;},end(body=''){resolve(new Response(body,{status,headers}));}};
 const handler=server.listeners('request')[0];Promise.resolve(handler(req,res)).catch(reject);
})) as typeof fetch:fetch;
const rows:any[]=[];
try{
 for(const concurrency of [10,25,50,100]){
  await db.exec('TRUNCATE benchmark_runs,product_provider_calls;UPDATE product_provider_budget SET concurrency=4,tokens_per_minute=500000,max_backlog=256,tenant_backlog=20,breaker_until=NULL,consecutive_failures=0');
  queries=0;dbMs=0;dbTimings=[];active=0;peak=0;providerCalls=0;duplicates=0;events=[];jobQueueMs=[];errors.length=0;promises.clear();
  const start=performance.now(),apiMs:number[]=[],completionMs:number[]=[];
  const runs=Array.from({length:concurrency},(_,i)=>({id:randomUUID(),ordinal:i+1}));
  await Promise.all(runs.map(async body=>{
   const at=performance.now();const response=await request(base+'/runs',{method:'POST',body:JSON.stringify(body)});assert.equal(response.status,202);await response.text();apiMs.push(performance.now()-at);
   // Simulate an HTTP retry/refresh of the same durable request, without launching a second provider call.
   const duplicate=await request(base+'/runs',{method:'POST',body:JSON.stringify(body)});assert.equal(duplicate.status,202);await duplicate.text();
   await promises.get(body.id);completionMs.push(performance.now()-at);
  }));
  const statuses=await query('SELECT status,count(*)::int n FROM benchmark_runs GROUP BY status');
  const complete=Number(statuses.rows.find((r:any)=>r.status==='completed')?.n||0);
  const provider=events.filter(e=>e.event==='provider_call');
  assert.equal(complete,concurrency);assert.ok(peak<=4);assert.equal(duplicates,concurrency);
  assert.equal(providerCalls,concurrency*(pipeline?7:1)+Math.floor(concurrency/11),'only deliberate 429 retries send extra requests');
  rows.push({concurrency,completed:complete,apiP95Ms:percentile(apiMs,.95),queueP95Ms:percentile(provider.map(e=>e.queueMs),.95),providerP95Ms:percentile(provider.map(e=>e.providerMs),.95),completionP95Ms:percentile(completionMs,.95),wallMs:Math.round(performance.now()-start),peakProviderCalls:peak,providerCalls,provider429:provider.filter(e=>e.upstreamStatus===429).length,duplicateRequestsSuppressed:duplicates,sqlStatements:queries,sqlRoundtripP95Ms:percentile(dbTimings,.95),dbAggregateMs:Math.round(dbMs),errors:[...errors]});
  Object.assign(rows.at(-1),{callsPerPipeline:pipeline?7:1,jobQueueP95Ms:percentile(jobQueueMs,.95)});
  console.log(JSON.stringify(rows.at(-1)));
 }
 fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/admission-offline-'+(pipeline?'pipeline-':'')+'benchmark.json',JSON.stringify({evidence:'OFFLINE',provider:'fake Vertex 20ms; one injected 429 per 11 runs',pipeline:pipeline?'Generation 1 then Judge 6 parallel calls; fixture has 4 active job workers':'1 provider call microbenchmark',database:'PGlite single process; NOT Cloud SQL connection/load evidence',api:'isolated benchmark fixture; NOT authenticated application API',transport:inProcess?'in-process request adapter; localhost sockets denied by sandbox':'loopback HTTP',runner:'Node (k6 unavailable / download DNS blocked)',rows},null,2));
}finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await db.close();}
