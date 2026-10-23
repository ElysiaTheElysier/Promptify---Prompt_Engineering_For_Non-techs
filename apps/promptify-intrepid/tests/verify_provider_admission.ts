import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {runWithProviderAdmission,withProviderScope,estimateProviderTokens,admissionRetryDelay,AdmissionError} from '../src/services/providerAdmissionService';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {productionGenerate} from '../src/services/productionAiService';
import {readProviderOperations} from '../src/services/providerOperationsService';

const db=new PGlite();
await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
await db.exec(fs.readFileSync('gcp/sql/013_provider_admission.sql','utf8'));
const functions={enqueue:'product_provider_enqueue',acquire:'product_provider_acquire',settle:'product_provider_settle'};
const store={async call(name:string,args:unknown[]){
 const fn=functions[name as keyof typeof functions];assert.ok(fn);
 const r=await db.query(`SELECT ${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args);return (r.rows[0] as any).value;
}};
const enqueue=async(tenant:string,tokens=100,id=randomUUID())=>{
 assert.equal(await store.call('enqueue',[id,tenant,randomUUID(),tokens,60]),'queued');return id;
};
const reset=async()=>{await db.exec('TRUNCATE product_provider_calls; UPDATE product_provider_budget SET concurrency=2,tokens_per_minute=1000,max_backlog=10,tenant_backlog=5,consecutive_failures=0,breaker_until=NULL');};
await reset();
const a=await enqueue('a'),b=await enqueue('b'),c=await enqueue('c');
assert.equal((await store.call('acquire',[c,30])).status,'wait','only the bounded batch of oldest tenant heads is eligible');
const first=await store.call('acquire',[a,30]);assert.equal(first.status,'admitted');
assert.equal((await store.call('acquire',[a,30])).status,'running','duplicate dispatch gets no second permit');
const second=await store.call('acquire',[b,30]);assert.equal(second.status,'admitted');
assert.equal((await store.call('acquire',[c,30])).status,'wait','global concurrency limit');
assert.equal(await store.call('settle',[a,first.fence+1,200,10]),false,'fencing rejects stale owner');
assert.equal(await store.call('settle',[a,first.fence,200,10]),true);
assert.equal(await store.call('settle',[a,first.fence,200,10]),false,'duplicate settle is a no-op');
assert.equal((await store.call('acquire',[c,30])).status,'admitted');

await reset();
const heavy=await enqueue('a',700),light=await enqueue('b',400);
const h=await store.call('acquire',[heavy,30]);assert.equal(h.status,'admitted');
await store.call('settle',[heavy,h.fence,200,20]);
assert.equal((await store.call('acquire',[light,30])).status,'wait','conservative token reservation not refunded');
await db.query("UPDATE product_provider_calls SET admitted_at=clock_timestamp()-interval '61 seconds' WHERE id=$1",[heavy]);
assert.equal((await store.call('acquire',[light,30])).status,'wait','a long-running call retains its token reservation for a minute after settlement');
await db.query("UPDATE product_provider_calls SET settled_at=clock_timestamp()-interval '61 seconds' WHERE id=$1",[heavy]);
assert.equal((await store.call('acquire',[light,30])).status,'admitted');

await reset();
// Tenant A cannot monopolize capacity when B arrives: last-served fairness precedes FIFO.
const a1=await enqueue('a'),a2=await enqueue('a'),b1=await enqueue('b');
await db.exec("UPDATE product_provider_calls SET queued_at='2026-10-23T00:00:00Z'");
const aa=await store.call('acquire',[a1,30]);assert.equal(aa.status,'admitted');
assert.equal((await store.call('acquire',[a2,30])).status,'wait');
assert.equal((await store.call('acquire',[b1,30])).status,'admitted');
await db.query("UPDATE product_provider_calls SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[a1]);
assert.equal((await store.call('acquire',[a2,30])).status,'admitted','expired lease releases concurrency');
assert.equal((await store.call('acquire',[a1,30])).status,'expired','uncertain expired call never reissued');
assert.equal(await store.call('settle',[a1,aa.fence,200,10]),false);

await reset();
for(let i=0;i<5;i++)await enqueue('a');
assert.equal(await store.call('enqueue',[randomUUID(),'a',randomUUID(),100,60]),'backpressure');
assert.equal(await store.call('enqueue',[randomUUID(),'b',randomUUID(),1001,60]),'oversize');
assert.equal(await store.call('enqueue',[randomUUID(),'b',randomUUID(),100,0]),'oversize');
await reset();
for(let i=0;i<3;i++){const id=await enqueue('a');const lease=await store.call('acquire',[id,30]);assert.equal(lease.status,'admitted');await store.call('settle',[id,lease.fence,429,null]);}
const open=await enqueue('b');assert.equal((await store.call('acquire',[open,30])).status,'circuit_open');
await db.exec("UPDATE product_provider_budget SET breaker_until=clock_timestamp()-interval '1 second'");
assert.equal((await store.call('acquire',[open,30])).status,'admitted','breaker recovers under global concurrency cap');
await reset();
const dead=await enqueue('a');await db.query("UPDATE product_provider_calls SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[dead]);
assert.equal((await store.call('acquire',[dead,30])).status,'expired');
// RLS and grants: authenticated user cannot read capacity table or call security-definer functions.
await db.exec('SET ROLE authenticated');
await assert.rejects(()=>db.query('SELECT * FROM product_provider_calls'));
await assert.rejects(()=>db.query('SELECT product_provider_acquire($1,30)',[dead]));
await db.exec('RESET ROLE');

const old=process.env.PROVIDER_ADMISSION_MODE;process.env.PROVIDER_ADMISSION_MODE='sql';
try{
 let bypass=0;process.env.PROVIDER_ADMISSION_MODE='invalid';
 await assert.rejects(()=>runWithProviderAdmission({},5000,async()=>{bypass++;return new Response('{}');}),(e:any)=>e.code==='admission_unavailable');
 assert.equal(bypass,0,'invalid admission mode must not silently bypass the global limiter');process.env.PROVIDER_ADMISSION_MODE='sql';
 let metricClock=0;const spans:any[]=[];
 await runWithProviderAdmission({},5000,async()=>{metricClock+=20;return new Response('{}');},{now:()=>metricClock,log:e=>spans.push(e),store:{async call(name){if(name==='enqueue')return 'queued';if(name==='acquire')return {status:'admitted',fence:1};metricClock+=10;return true;}}});
 assert.equal(spans[0].providerMs,20);assert.equal(spans[0].settlementMs,10,'slow SQL settlement must not be counted as provider latency');
 await reset();await db.exec('UPDATE product_provider_budget SET tokens_per_minute=200000');
 const events:any[]=[];let sends=0;
 const result=await withProviderScope({tenant:'scoped',correlationId:randomUUID()},()=>runWithProviderAdmission({contents:'fictional'},5000,async()=>{
  sends++;return new Response(JSON.stringify({usageMetadata:{totalTokenCount:42},candidates:[]}));
 },{store,log:e=>events.push(e)}));
 assert.equal(result.status,200);assert.equal(sends,1);assert.equal(events[0].actualTokens,42);
 assert.equal((await db.query("SELECT tenant FROM product_provider_calls WHERE status='succeeded'")).rows[0].tenant,'scoped');
 assert.ok(!JSON.stringify(events).includes('fictional'),'logs omit payload');
 await assert.rejects(()=>runWithProviderAdmission({},5000,async()=>{sends++;throw Error('must not send');},{store:{async call(){throw Error('DB down');}},log:()=>{}}),(e:any)=>e instanceof AdmissionError&&e.code==='admission_unavailable');
 assert.equal(sends,1,'fail closed if admission store fails');
 await reset();await db.exec('UPDATE product_provider_budget SET tokens_per_minute=200000');
 await assert.rejects(()=>runWithProviderAdmission({},5000,async()=>{throw Error('network uncertain');},{store,log:()=>{}}));
 assert.equal((await db.query("SELECT status FROM product_provider_calls")).rows[0].status,'running','uncertain outcome retains permit');
 const lowThinking={contents:[{parts:[{text:'Tiếng Việt'}]}],generationConfig:{maxOutputTokens:4096,thinkingConfig:{thinkingLevel:'LOW'}}};
 assert.equal(estimateProviderTokens(lowThinking),Buffer.byteLength(JSON.stringify(lowThinking),'utf8')+4096,'thinking is inside the configured output ceiling, not an extra 32k reservation');
 const explicitThinking={...lowThinking,generationConfig:{maxOutputTokens:65536,thinkingConfig:{thinkingBudget:32768}}};
 assert.equal(estimateProviderTokens(explicitThinking),Buffer.byteLength(JSON.stringify(explicitThinking),'utf8')+65536);
 assert.throws(()=>estimateProviderTokens({generationConfig:{maxOutputTokens:0}}),AdmissionError);
 assert.equal(admissionRetryDelay(50,()=>1),5000);
 // Exercise the actual production adapter + SQL pool, not just an injected admission store.
 await reset();await db.exec('UPDATE product_provider_budget SET tokens_per_minute=200000');
 process.env.NODE_ENV='test';let held=0;
 configureSqlPoolForTests({async connect(){held++;return {async query(sql:string,args:unknown[]=[]){const r=await db.query(sql,args);return {rows:r.rows};},release(){held--;}};}});
 const envNames=['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FALLBACK_MODEL','AI_PROVIDER'] as const;
 const savedEnv=Object.fromEntries(envNames.map(n=>[n,process.env[n]])),originalFetch=globalThis.fetch;let transportCalls=0;
 try{
  delete process.env.AI_PROVIDER;delete process.env.GEMINI_FALLBACK_MODEL;
  process.env.GEMINI_API_KEY='offline-only';process.env.GEMINI_MODEL='gemini-3.8-flash';
  globalThis.fetch=async()=>{
   assert.equal(held,0,'SQL pool connection released before actual provider transport');transportCalls++;
   return transportCalls===1?new Response('{}',{status:503,headers:{'retry-after':'0'}})
    :new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'Fictional output'}]}}],usageMetadata:{totalTokenCount:42}}));
  };
  const generated=await productionGenerate({prompt:'Describe the fictional procedure.'} as any);
  assert.equal(generated.output,'Fictional output');assert.equal(transportCalls,2);
  assert.equal((await db.query('SELECT count(*)::int n FROM product_provider_calls WHERE admitted_at IS NOT NULL')).rows[0].n,2,'each real retry acquires a separate global permit');
  const operations=await readProviderOperations();assert.equal(operations.providerCompletionRate,.5);assert.equal(Number(operations.known_tokens),42);assert.equal(operations.unknown_usage,1);assert.equal(operations.costPerGrade,null);
  assert.equal(held,0);
 }finally{globalThis.fetch=originalFetch;for(const n of envNames){if(savedEnv[n]===undefined)delete process.env[n];else process.env[n]=savedEnv[n];}}
}finally{if(old===undefined)delete process.env.PROVIDER_ADMISSION_MODE;else process.env.PROVIDER_ADMISSION_MODE=old;}
await db.exec(fs.readFileSync('gcp/sql/rollback/013_provider_admission.sql','utf8'));
await db.close();
console.log('Provider admission PASS: real SQL global cap/token window/fairness/backpressure/RLS/fencing/circuit recovery; fake provider and uncertainty retention. OFFLINE only.');
