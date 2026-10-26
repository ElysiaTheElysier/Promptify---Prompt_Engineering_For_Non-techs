import {createHash} from 'node:crypto';
/** Refused or unsupported stub use; vertexAiService reports it as a ProviderSetupError (definite, nothing sent). */
export class ProviderStubError extends Error {}

/** STAGING LOAD TESTS ONLY. With AI_PROVIDER=stub, generateContent / streamGenerateContent are answered in-process
 * with Gemini-shaped bodies, modelled latency, a capacity limit (429 RESOURCE_EXHAUSTED) and optional hangs, so load
 * tests exercise admission, provider retries, Judge, worker, SQL and SSE without calling Gemini. Everything before the
 * network call is the production path. Refused unless NODE_ENV=test, or the staging project with an explicit ack.
 * Embeddings are not stubbed. Grades produced are synthetic: use synthetic learners/classes only.
 *   STUB_CAPACITY      concurrent calls this process accepts before 429s (0 = unlimited); 429 chance rises to 1 at 2x
 *   STUB_LATENCY_SCALE multiplier on staging-measured latencies (default 1)
 *   STUB_429_RATE      extra random 429 rate (0..1)      STUB_HANG_RATE  share of calls that never answer (0..1)
 *   STUB_SEED          deterministic random sequence */
export const STAGING_PROJECT='ai-transformation-510302';
export function providerStubEnabled(env=process.env){return env.AI_PROVIDER==='stub';}
export function assertProviderStubAllowed(env=process.env){
 if(env.NODE_ENV==='test')return;
 if(env.GOOGLE_CLOUD_PROJECT===STAGING_PROJECT&&env.PROVIDER_STUB_ACK==='staging-load-test-only')return;
 throw new ProviderStubError('Provider stub is restricted to staging load tests');
}
const stats={calls:0,ok:0,rejected429:0,hung:0,peakInFlight:0,inFlight:0};
export function providerStubStats(){return {...stats};}
export function resetProviderStubStats(){Object.assign(stats,{calls:0,ok:0,rejected429:0,hung:0,peakInFlight:0,inFlight:0});}
let seed=Number(process.env.STUB_SEED||7);
const rand=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const lognormal=(p50:number,p95:number)=>{const s=Math.log(p95/p50)/1.645,z=Math.sqrt(-2*Math.log(rand()||1e-9))*Math.cos(2*Math.PI*rand());return p50*Math.exp(s*z);};
const num=(v:string|undefined,d:number)=>{const n=Number(v);return v!==undefined&&v!==''&&Number.isFinite(n)?n:d;};
function timeoutError(){const e=new Error('The operation was aborted due to timeout');e.name='TimeoutError';return e;}
const wait=(ms:number,timeout:number)=>new Promise<void>((resolve,reject)=>{if(ms>=timeout){setTimeout(()=>reject(timeoutError()),timeout);return;}setTimeout(resolve,ms);});

/** Stage answers follow the request schema; anchor level per stage is a stable hash so totals vary but repeat. */
function answer(payload:any){
 let input:any={};try{input=JSON.parse(payload?.contents?.[0]?.parts?.[0]?.text||'{}');}catch{}
 const level=(key:string)=>[0.5,0.75,1][createHash('sha256').update(JSON.stringify(input.learnerPrompt||'')+key).digest()[0]%3];
 const row=(c:any)=>({score:Math.round(c.maxScore*level(c.key)*100)/100,reasonEn:'Stub reason.',reasonVi:'Lý do (stub).',improvementEn:'Stub hint.',improvementVi:'Gợi ý (stub).'});
 const sup={taskAttempt:true,summaryEn:'Stub alignment.',summaryVi:'Căn chỉnh (stub).'};
 const stage=input.stage;
 if(stage==='supervisor')return {stage,text:JSON.stringify(sup),ms:lognormal(2151,3250)};
 if(stage==='criterion')return {stage,text:JSON.stringify({key:input.criterion.key,...row(input.criterion)}),ms:lognormal(2279,3592)};
 if(stage==='criteria')return {stage,text:JSON.stringify({criteria:Object.fromEntries(input.criteria.map((c:any)=>[c.key,row(c)]))}),ms:lognormal(5000,8000)};
 if(stage==='integrated')return {stage,text:JSON.stringify({...sup,criteria:Object.fromEntries(input.rubric.map((c:any)=>[c.key,row(c)]))}),ms:lognormal(5500,8500)};
 return {stage:'generation',text:'Stub response for load testing. No model was called.',ms:lognormal(2800,4000)};
}
export async function stubModelRequest(model:string,operation:string,payload:unknown,timeout:number):Promise<Response>{
 assertProviderStubAllowed();
 if(operation==='predict')throw new ProviderStubError('Embeddings are not stubbed');
 const env=process.env,capacity=num(env.STUB_CAPACITY,0),scale=num(env.STUB_LATENCY_SCALE,1);
 stats.calls++;stats.inFlight++;stats.peakInFlight=Math.max(stats.peakInFlight,stats.inFlight);
 try{
  if(capacity>0&&stats.inFlight>capacity&&rand()<Math.min(1,(stats.inFlight-capacity)/capacity)||rand()<num(env.STUB_429_RATE,0)){
   await wait(150,timeout);stats.rejected429++;
   return new Response(JSON.stringify({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'stub capacity'}}),{status:429,headers:{'Content-Type':'application/json'}});
  }
  if(rand()<num(env.STUB_HANG_RATE,0)){stats.hung++;await wait(Number.MAX_SAFE_INTEGER,timeout);}
  const a=answer(payload);
  await wait(a.ms*scale,timeout);
  stats.ok++;
  const usageMetadata={promptTokenCount:900,candidatesTokenCount:400,totalTokenCount:1300};
  const chunk=(text:string,last:boolean)=>({candidates:[{content:{role:'model',parts:[{text}]},...(last?{finishReason:'STOP'}:{})}],...(last?{usageMetadata}:{}),modelVersion:model});
  if(operation==='streamGenerateContent'){
   const half=Math.ceil(a.text.length/2);
   const sse=`data: ${JSON.stringify(chunk(a.text.slice(0,half),false))}\r\n\r\ndata: ${JSON.stringify(chunk(a.text.slice(half),true))}\r\n\r\n`;
   return new Response(sse,{status:200,headers:{'Content-Type':'text/event-stream'}});
  }
  return new Response(JSON.stringify(chunk(a.text,true)),{status:200,headers:{'Content-Type':'application/json'}});
 }finally{stats.inFlight--;}
}
