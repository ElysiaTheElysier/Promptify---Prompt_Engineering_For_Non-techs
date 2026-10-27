import {identity} from './firebaseIdentityService';
import type { ProductSnapshot } from '../types/production';
import { getProductLanguage, productText, productErrorText } from './productI18nService';

export class ProductRequestError extends Error {
  constructor(message: string, public status: number, public requestId?: string) { super(message); }
}
export async function productRequest<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await identity.auth.getSession();
  if (!session) throw new ProductRequestError(productText('signIn'), 401);
  let response: Response;
  try {
    response = await fetch('/api/product', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...payload, action, language: getProductLanguage() }), signal: AbortSignal.timeout(65000) });
  } catch { throw new ProductRequestError(productText('unknownOutcome'), 0, payload.requestId as string); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = ['judge','generate'].includes(action) && response.status !== 500 && typeof result.error === 'string' ? result.error.slice(0,1000) : '';
    throw new ProductRequestError(detail ? `${productErrorText(response.status,getProductLanguage(),result.error)} ${detail}` : productErrorText(response.status,getProductLanguage(),result.error), response.status, payload.requestId as string);
  }
  return result as T;
}
export type JudgeProgress = 'queued' | 'running' | 'retry_wait';
type JudgeTarget = { classId?: string; lessonId: string; attemptId: string };
const judgeActive = (status: unknown): status is JudgeProgress => status === 'queued' || status === 'running' || status === 'retry_wait';
const judgeMessage = (status: string, errorCode?: string) => {
  const en = getProductLanguage() === 'en';
  if (status === 'expired') return en ? 'AI Judge could not finish in time because AI is busy. Your output is saved; retry AI Judge later.' : 'AI Judge chưa thể chấm kịp vì AI đang quá tải. Kết quả đã được lưu; hãy thử chấm lại sau.';
  if (status === 'none') return en ? 'No AI Judge request is active for this attempt. Retry AI Judge.' : 'Lần thử này chưa có yêu cầu chấm nào. Hãy thử chấm lại.';
  return (en ? 'AI Judge could not grade this attempt. Your output is saved; retry AI Judge.' : 'AI Judge chưa chấm được lần thử này. Kết quả đã được lưu; hãy thử chấm lại.') + (errorCode ? ` (${errorCode})` : '');
};
/** Polls an asynchronous AI Judge job until it finishes: every 3s for 30s, then every 10s, paused while the tab is hidden. */
export async function waitForJudge(target: JudgeTarget, onStatus?: (status: JudgeProgress) => void, signal?: AbortSignal, maxMs = 15 * 60 * 1000, onCriterion?: (row: JudgeCriterionProgress) => void, onProgress?: (graded: number) => void) {
  const started = Date.now();
  const sleep = (ms: number) => new Promise<void>((resolve, reject) => {
    if(signal?.aborted){reject(new DOMException('Stopped','AbortError'));return;}
    const abort=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
    signal?.addEventListener('abort',abort,{once:true});
  });
  while (Date.now() - started < maxMs) {
    // Fast Judge should not spend up to 3s waiting for its first visible scorecard.
    await sleep(Date.now() - started < 10000 ? 1000 : Date.now() - started < 30000 ? 3000 : 10000);
    if (typeof document !== 'undefined' && document.hidden) continue;
    let result: { status: string; evaluation?: unknown; errorCode?: string; criteria?: JudgeCriterionProgress[]; graded?: number };
    try { result = await productRequest('judgeStatus', target); }
    catch (cause) { if (cause instanceof ProductRequestError && [0, 502, 503, 504].includes(cause.status)) continue; throw cause; }
    if (result.status === 'succeeded') return result.evaluation;
    if (judgeActive(result.status)) { onStatus?.(result.status); if (!signal?.aborted) { result.criteria?.forEach(row => onCriterion?.(row)); if (result.graded) onProgress?.(result.graded); } continue; }
    throw new ProductRequestError(judgeMessage(result.status, result.errorCode), 409);
  }
  throw new ProductRequestError(judgeMessage('expired'), 504);
}
/** Requests AI Judge. Synchronous mode returns the grade; JUDGE_MODE=async returns a queued job that is then polled. */
export async function requestJudge(target: JudgeTarget, onStatus?: (status: JudgeProgress) => void, signal?: AbortSignal, onCriterion?: (row: JudgeCriterionProgress) => void, onProgress?: (graded: number) => void) {
  const result = await productRequest<{ async?: boolean; status?: string }>('judge', target);
  if (!result?.async) return result;
  if (judgeActive(result.status)) onStatus?.(result.status);
  return waitForJudge(target, onStatus, signal, undefined, onCriterion, onProgress);
}
export const loadProduct = async (classId?: string, onboarding = new URLSearchParams(location.search).get('ui') === '02') => {
  const invitedClass=new URLSearchParams(location.search).get('classId');if(!classId&&invitedClass&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(invitedClass))classId=invitedClass;
  if(localStorage.getItem('promptify-basic-enrollment')==='requested'){
    try {
      const enrollment=await productRequest<{classId:string}>('enrollBasic');
      localStorage.removeItem('promptify-basic-enrollment');
      classId=enrollment.classId;
    } catch(error) {
      // Existing staff keep their assigned workspace; only a definitive role denial
      // cancels the Basic request. Transient errors remain retryable.
      if(!(error instanceof ProductRequestError)||error.status!==403)throw error;
      localStorage.removeItem('promptify-basic-enrollment');
    }
  }
  return productRequest<ProductSnapshot>('snapshot',{classId,onboarding});
};

export type GenerationProgress='queued'|'generating'|'retry_wait';
type GenerationTarget={classId:string;lessonId:string;requestId:string};
export const pendingGenerationKey=(subject:string,classId:string,lessonId:string)=>`promptify-generation:${subject}:${classId}:${lessonId}`;
async function generationStorageKey(target:GenerationTarget){const {data:{session}}=await identity.auth.getSession();return session?pendingGenerationKey(session.user.id,target.classId,target.lessonId):undefined;}
export async function waitForGeneration<T=any>(target:GenerationTarget,onStatus?:(status:GenerationProgress)=>void,signal?:AbortSignal,maxMs=15*60*1000):Promise<T>{
 const start=Date.now();
 while(Date.now()-start<maxMs){
  if(signal?.aborted)throw new DOMException('Stopped','AbortError');
  if(typeof document==='undefined'||!document.hidden){
   let result:any;
   try{result=await productRequest('generationStatus',target);}catch(cause){if(cause instanceof ProductRequestError&&cause.status===404){const key=await generationStorageKey(target);if(key)sessionStorage.removeItem(key);throw new ProductRequestError(productText('unknownOutcome'),0,target.requestId);}if(!(cause instanceof ProductRequestError)||![0,502,503,504].includes(cause.status))throw cause;}
   if(result&&['generated','judging','completed'].includes(result.status)){
    const key=await generationStorageKey(target);if(key)sessionStorage.removeItem(key);return result.result;
   }
   if(result&&['queued','generating','retry_wait'].includes(result.status))onStatus?.(result.status);
   else if(result){const key=await generationStorageKey(target);if(key)sessionStorage.removeItem(key);throw new ProductRequestError(getProductLanguage()==='en'?'Generation could not finish. Review this request before starting a new Run.':'Generation chưa hoàn tất. Kiểm tra yêu cầu này trước khi chạy Run mới.',409,target.requestId);}
  }
  await new Promise<void>((resolve,reject)=>{const done=()=>{signal?.removeEventListener('abort',abort);resolve();};const timer=setTimeout(done,Date.now()-start<30000?3000:10000);const abort=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));};signal?.addEventListener('abort',abort,{once:true});});
 }
 throw new ProductRequestError(productText('unknownOutcome'),504,target.requestId);
}
function generationError(status:number,result:any,requestId?:string){
 const detail=status!==500&&typeof result?.error==='string'?result.error.slice(0,1000):'';
 return new ProductRequestError(detail?`${productErrorText(status,getProductLanguage(),result.error)} ${detail}`:productErrorText(status,getProductLanguage(),result?.error),status,requestId);
}
/** TC-PLAY-02: build-time Cloud Run origin for token streaming (Hosting buffers responses). Unset keeps the JSON path. */
const streamOrigin=String(import.meta.env?.VITE_STREAM_API_URL||'').replace(/\/+$/,'');
export const generationStreamAvailable=()=>/^https:\/\/[^/\s]+$/.test(streamOrigin);
/** Streams visible output while the server runs the normal saved Run; returns the same saved result as requestGeneration. */
export async function requestGenerationStream<T=any>(payload:GenerationTarget&Record<string,unknown>,onDelta:(text:string)=>void,onStatus?:(status:GenerationProgress)=>void):Promise<T>{
 const {data:{session}}=await identity.auth.getSession();
 if(!session)throw new ProductRequestError(productText('signIn'),401);
 let response:Response;
 try{response=await fetch(streamOrigin+'/api/stream',{method:'POST',mode:'cors',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({...payload,language:getProductLanguage()}),signal:AbortSignal.timeout(300000)});}
 // Blocked preflight or network failure: retry on the JSON path with the same request ID, which never runs twice.
 catch{return requestGeneration<T>(payload,onStatus);}
 if(response.status===404)return requestGeneration<T>(payload,onStatus);
 if(!(response.headers.get('content-type')||'').includes('text/event-stream')){
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw generationError(response.status,result,payload.requestId);
  return result as T;
 }
 try{
  const result=await readSse(response,(event,message)=>{
   if(event==='delta'&&typeof message.text==='string')onDelta(message.text);
   else if(event==='done')return message as T;
   else if(event==='error')throw generationError(Number(message.status)||502,message,payload.requestId);
  });
  if(result!==undefined)return result;
 }catch(cause){if(cause instanceof ProductRequestError)throw cause;}
 // No final event: the server keeps running and may have saved this Run. Refresh before retrying.
 throw new ProductRequestError(productText('unknownOutcome'),0,payload.requestId);
}
/** Reads SSE blocks and resolves with the first value `handle` returns, or undefined when the stream ends first. */
async function readSse<T>(response:Response,handle:(event:string,message:any)=>T|undefined):Promise<T|undefined>{
 const reader=response.body!.getReader(),decoder=new TextDecoder();let buffer='';
 for(;;){
  const {done,value}=await reader.read();
  buffer+=decoder.decode(value,{stream:!done});
  let end;
  while((end=buffer.search(/\r?\n\r?\n/))>=0){
   const block=buffer.slice(0,end);buffer=buffer.slice(end).replace(/^\r?\n\r?\n/,'');
   let event='message',data='';
   for(const line of block.split(/\r?\n/)){if(line.startsWith('event:'))event=line.slice(6).trim();else if(line.startsWith('data:'))data+=line.slice(5).trim();}
   if(!data)continue;
   const result=handle(event,JSON.parse(data));
   if(result!==undefined)return result;
  }
  if(done)return undefined;
 }
}
export type JudgeCriterionProgress={key:string;label?:string;score:number;max:number;reasonEn:string;reasonVi:string};
/** On-demand AI Judge: provisional criteria arrive as each one is graded; resolves with the saved grade.
 * resume=true only follows an existing job (after reload) and never starts or charges a new grade.
 * Without the stream route (unset origin, 404, blocked preflight) it uses requestJudge/waitForJudge; a dropped or
 * ended stream continues by polling the same durable job. The server claim prevents double grading. */
export async function requestJudgeStream(target:JudgeTarget,onCriterion:(row:JudgeCriterionProgress)=>void,onStatus?:(status:JudgeProgress)=>void,signal?:AbortSignal,resume=false,onProgress?:(graded:number)=>void){
 const fallback=()=>resume?waitForJudge(target,onStatus,signal,undefined,onCriterion,onProgress):requestJudge(target,onStatus,signal,onCriterion,onProgress);
 const poll=()=>waitForJudge(target,onStatus,signal,undefined,onCriterion,onProgress);
 if(!generationStreamAvailable())return fallback();
 const {data:{session}}=await identity.auth.getSession();
 if(!session)throw new ProductRequestError(productText('signIn'),401);
 let response:Response;
 // The server bounds one watch window (~4 min) and then sends `resume`; this timeout only catches a stuck connection.
 const timeout=AbortSignal.timeout(300000),abort=signal?(AbortSignal as any).any?.([signal,timeout])||timeout:timeout;
 try{response=await fetch(streamOrigin+'/api/judge-stream',{method:'POST',mode:'cors',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({...target,language:getProductLanguage(),...(resume?{resume:true}:{})}),signal:abort});}
 catch(cause){if(signal?.aborted)throw cause;return fallback();}
 if(response.status===404)return fallback();
 if(!(response.headers.get('content-type')||'').includes('text/event-stream')){
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw generationError(response.status,result);
  return result;
 }
 try{
  const grade=await readSse(response,(event,message)=>{
   if(signal?.aborted)throw new DOMException('Stopped','AbortError');
   if(event==='criterion')onCriterion(message);
   else if(event==='status'&&judgeActive(message.status))onStatus?.(message.status);
   else if(event==='progress'&&Number.isInteger(message.graded))onProgress?.(message.graded);
   else if(event==='done')return message;
   else if(event==='resume')return null;
   else if(event==='error')throw message.judgeStatus?new ProductRequestError(judgeMessage(message.judgeStatus,message.errorCode),409):generationError(Number(message.status)||502,message);
  });
  if(grade)return grade;
 }catch(cause){if(cause instanceof ProductRequestError||signal?.aborted)throw cause;}
 // `resume`, or the connection dropped: the durable job keeps grading; follow it by polling (reconnect-safe).
 return poll();
}
/** Stores only request metadata in this tab. Refresh resumes polling and never submits another Run. */
export async function requestGeneration<T=any>(payload:GenerationTarget&Record<string,unknown>,onStatus?:(status:GenerationProgress)=>void,signal?:AbortSignal):Promise<T>{
 const key=await generationStorageKey(payload);
 if(key){const pending=sessionStorage.getItem(key);if(pending&&pending!==payload.requestId)return waitForGeneration<T>({...payload,requestId:pending},onStatus,signal);sessionStorage.setItem(key,payload.requestId);}
 let result:any;
 try{result=await productRequest('generate',payload);}catch(cause){if(key&&cause instanceof ProductRequestError&&![0,503,504].includes(cause.status))sessionStorage.removeItem(key);throw cause;}
 if(!result?.async){if(key)sessionStorage.removeItem(key);return result;}
 if(['queued','generating','retry_wait'].includes(result.status))onStatus?.(result.status);
 return waitForGeneration<T>(payload,onStatus,signal);
}
