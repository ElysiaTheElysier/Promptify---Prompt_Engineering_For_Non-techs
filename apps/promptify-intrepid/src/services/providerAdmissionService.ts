import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {getSqlPool} from './cloudPostgresService';

type Scope={tenant:string;correlationId:string};
const scope=new AsyncLocalStorage<Scope>();
export function withProviderScope<T>(value:Scope,work:()=>Promise<T>){return scope.run(value,work);}
export class AdmissionError extends Error {
 readonly statusCode=503;
 constructor(readonly code:'admission_backpressure'|'admission_expired'|'admission_unavailable'){super(code);}
}
export function admissionRetryDelay(attempt:number,random=Math.random){
 return Math.round(random()*Math.min(5000,100*2**Math.min(attempt,6)));
}
/** Bytes conservatively bound input text tokenization. maxOutputTokens already caps
 * generated thinking + visible output; adding a phantom 32768 double-counted it.
 * https://ai.google.dev/gemini-api/docs/generate-content/thinking#token-limits-and-max_output_tokens
 * Actual total usage is still reconciled at settlement; unknown calls retain their reservation. */
export function estimateProviderTokens(payload:unknown){
 const body=payload as any,config=body?.generationConfig||{};
 const output=Number(config.maxOutputTokens??8192);
 if(!Number.isInteger(output)||output<1||output>65536)throw new AdmissionError('admission_backpressure');
 return Buffer.byteLength(JSON.stringify(payload),'utf8')+output;
}
type Store={call(name:string,args:unknown[]):Promise<any>};
/** Dedicated short transaction: never borrows an ambient API service transaction. */
export const sqlAdmissionStore:Store={async call(name,args){
 const allowed:Record<string,string>={enqueue:'product_provider_enqueue',acquire:'product_provider_acquire',settle:'product_provider_settle'};
 const fn=allowed[name];if(!fn)throw new AdmissionError('admission_unavailable');
 const client=await getSqlPool().connect();
 try{
  await client.query('BEGIN');await client.query('SET LOCAL ROLE service_role');
  await client.query("SET LOCAL statement_timeout='2000'");
  const result=await client.query(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS result`,args);
  await client.query('COMMIT');return result.rows[0]?.result;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release?.();}
}};
type Dependencies={store?:Store;now?:()=>number;sleep?:(ms:number)=>Promise<void>;random?:()=>number;log?:(data:Record<string,unknown>)=>void;stream?:boolean};
/** Last totalTokenCount in a provider body; for SSE the final chunk carries the run total. */
function reportedUsage(text:string){const matches=[...text.matchAll(/"totalTokenCount"\s*:\s*(\d+)/g)];const n=Number(matches[matches.length-1]?.[1]);return Number.isInteger(n)&&n>=0?n:undefined;}
/** One permit per actual transport attempt. Provider transport retries belong to the caller.
 * Lease lasts beyond transport deadline; an unknown transport outcome keeps its reservation
 * until lease expiry, rather than admitting replacement work while the provider may run. */
export async function runWithProviderAdmission(payload:unknown,timeoutMs:number,send:(timeoutMs:number)=>Promise<Response>,deps:Dependencies={}){
 const mode=process.env.PROVIDER_ADMISSION_MODE;
 if(!mode||mode==='disabled')return send(timeoutMs);
 if(mode!=='sql')throw new AdmissionError('admission_unavailable');
 if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw new AdmissionError('admission_expired');
 const store=deps.store||sqlAdmissionStore,now=deps.now||Date.now,sleep=deps.sleep||(ms=>new Promise(r=>setTimeout(r,ms)));
 const log=deps.log||(data=>console.log(JSON.stringify(data))),random=deps.random||Math.random;
 const current=scope.getStore();
 // All unscoped operations share a bounded tenant; callers cannot invent unlimited tenants.
 const tenant=current?.tenant||'unscoped',correlationId=current?.correlationId||randomUUID(),id=randomUUID();
 const started=now(),deadline=started+timeoutMs,tokens=estimateProviderTokens(payload);
 let admission:any;
 try{
  const queued=await store.call('enqueue',[id,tenant,correlationId,tokens,Math.max(1,Math.ceil(timeoutMs/1000))]);
  if(queued!=='queued')throw new AdmissionError('admission_backpressure');
  for(let attempt=0;attempt<Math.ceil(timeoutMs/100)+1;attempt++){
   const remaining=deadline-now();if(remaining<1000)throw new AdmissionError('admission_expired');
   admission=await store.call('acquire',[id,Math.ceil(remaining/1000)+30]);
   if(admission?.status==='admitted')break;
   if(!['wait','circuit_open'].includes(admission?.status))throw new AdmissionError('admission_expired');
   // Admission polling is not a failed provider retry. Long exponential sleeps here
   // leave FIFO's next eligible tenant asleep and waste global capacity.
   await sleep(Math.min(remaining,admission.status==='circuit_open'?1000+Math.round(random()*500):100+Math.round(random()*150)));
  }
  if(admission?.status!=='admitted')throw new AdmissionError('admission_expired');
 }catch(error){
  log({event:'provider_admission',correlationId,status:error instanceof AdmissionError?error.code:'admission_unavailable',queueMs:now()-started});
  if(error instanceof AdmissionError)throw error;throw new AdmissionError('admission_unavailable');
 }
 const admitted=now();
 try{
  const response=await send(Math.max(1,deadline-now()));
  // Streaming (TC-PLAY-02): the permit stays held until the provider stream ends, then settles once.
  if(deps.stream&&response.ok&&response.body){
   const reader=response.body.getReader(),decoder=new TextDecoder();let tail='',settled=false;
   const finish=async(outcome:'complete'|'uncertain')=>{
    if(settled)return;settled=true;
    if(outcome==='uncertain'){log({event:'provider_call',correlationId,queueMs:admitted-started,providerMs:now()-admitted,status:'uncertain',reservationHeld:true,stream:true});return;}
    const received=now(),usage=reportedUsage(tail);
    const saved=await store.call('settle',[id,admission.fence,response.status,usage??null]).catch(()=>false);
    log({event:'provider_call',correlationId,queueMs:admitted-started,providerMs:received-admitted,settlementMs:now()-received,settlementStatus:saved?'saved':'stale',upstreamStatus:response.status,
     estimatedTokens:tokens,actualTokens:usage??null,cost:null,costStatus:'pricing_not_configured',stream:true});
   };
   const body=new ReadableStream<Uint8Array>({
    async pull(controller){
     try{const {done,value}=await reader.read();
      if(done){await finish('complete');controller.close();return;}
      tail=(tail+decoder.decode(value,{stream:true})).slice(-16384);controller.enqueue(value);
     }catch(error){await finish('uncertain');controller.error(error);}
    },
    async cancel(reason){await finish('uncertain');await reader.cancel(reason).catch(()=>{});}
   });
   return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
  }
  // Consume the body under the permit: fetch resolves at headers, before provider work ends.
  const bytes=await response.arrayBuffer();
  const received=now();
  let usage:number|undefined;
  try{const data=JSON.parse(Buffer.from(bytes).toString('utf8'));const n=data?.usageMetadata?.totalTokenCount;if(Number.isInteger(n)&&n>=0)usage=n;}catch{}
  const settled=await store.call('settle',[id,admission.fence,response.status,usage??null]);
  log({event:'provider_call',correlationId,queueMs:admitted-started,providerMs:received-admitted,settlementMs:now()-received,settlementStatus:settled?'saved':'stale',upstreamStatus:response.status,
   estimatedTokens:tokens,actualTokens:usage??null,cost:null,costStatus:'pricing_not_configured'});
  return new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers});
 }catch(error){
  // No automatic retry, refund or lease release after uncertain transport / failed persistence.
  log({event:'provider_call',correlationId,queueMs:admitted-started,providerMs:now()-admitted,status:'uncertain',reservationHeld:true});
  throw error;
 }
}
