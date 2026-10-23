import {createHash} from 'node:crypto';
import {sqlTransaction} from './cloudPostgresService';
import {ApiAccessError} from './apiAuthorizationService.js';
import {injectionSignals,type InjectionSignal} from './promptInjectionService';

/** Learner safeguards from the reference test log (migration 016). Every feature is off unless its flag is set:
 * ACCESS_EXPIRY_MODE=enforce (TC-AUTH-04), SESSION_TOKEN_CAP=<tokens> (TC-SEC-03), INJECTION_GUARD=block|log (TC-SEC-04). */
export function accessExpiryEnabled(){return process.env.ACCESS_EXPIRY_MODE==='enforce';}
export function sessionTokenCap(){const cap=Number(process.env.SESSION_TOKEN_CAP);return Number.isInteger(cap)&&cap>=1000&&cap<=10000000?cap:0;}
export function injectionGuardMode():'off'|'log'|'block'{const mode=process.env.INJECTION_GUARD;return mode==='block'||mode==='log'?mode:'off';}
export function safeguardsEnabled(){return accessExpiryEnabled()||sessionTokenCap()>0||injectionGuardMode()!=='off';}
/** Days before expiry at which the workspace shows an advance warning banner. */
export const ACCESS_EXPIRY_WARNING_DAYS=7;

const rows=<T=any>(query:string,values:any[]=[])=>sqlTransaction(undefined,async db=>(await db.query(query,values)).rows as T[]);
/** 016 not applied yet: behave as if the feature were off rather than breaking Runs. */
const schemaMissing=(error:unknown)=>['42P01','42703'].includes((error as any)?.code);

export async function userIdForSubject(subject:string){
 const [row]=await rows<{id:string}>('SELECT id FROM public.users WHERE auth_provider_id=$1',[subject]);
 if(!row)throw new ApiAccessError('Signed-in learner profile was not found.',403);
 return row.id;
}

export type LearnerAccess={expiresAt:string|null;readOnly:boolean};
export async function learnerAccess(userId:string,classId:string,at=Date.now()):Promise<LearnerAccess>{
 if(!accessExpiryEnabled())return {expiresAt:null,readOnly:false};
 try{
  const [row]=await rows<{access_expires_at:string|Date|null}>('SELECT e.access_expires_at FROM public.enrollments e JOIN public.learners l ON l.id=e.learner_id WHERE l.user_id=$1 AND e.class_id=$2',[userId,classId]);
  const value=row?.access_expires_at;if(!value)return {expiresAt:null,readOnly:false};
  const expiresAt=new Date(value).toISOString();
  return {expiresAt,readOnly:Date.parse(expiresAt)<=at};
 }catch(error){if(schemaMissing(error))return {expiresAt:null,readOnly:false};throw error;}
}
export function accessExpiredError(expiresAt:string){
 return Object.assign(new ApiAccessError(`Your access to this class expired on ${expiresAt.slice(0,10)}. The workspace is read-only; contact your L&D administrator to extend access.`,403),{code:'access_expired'});
}
export async function assertWritableAccess(userId:string,classId:string,at=Date.now()){
 const access=await learnerAccess(userId,classId,at);
 if(access.readOnly&&access.expiresAt)throw accessExpiredError(access.expiresAt);
 return access;
}

export type AiSession={lessonId:string;sessionNo:number;tokensUsed:number;cap:number};
export async function aiSessions(userId:string,classId:string):Promise<AiSession[]>{
 const cap=sessionTokenCap();if(!cap)return [];
 try{return (await rows<any>('SELECT lesson_id,session_no,tokens_used FROM public.product_ai_sessions WHERE user_id=$1 AND class_id=$2',[userId,classId])).map(r=>({lessonId:r.lesson_id,sessionNo:r.session_no,tokensUsed:r.tokens_used,cap}));}
 catch(error){if(schemaMissing(error))return [];throw error;}
}
export async function assertSessionBudget(userId:string,classId:string,lessonId:string){
 const cap=sessionTokenCap();if(!cap)return;
 let used=0;
 try{used=(await rows<{tokens_used:number}>('SELECT tokens_used FROM public.product_ai_sessions WHERE user_id=$1 AND class_id=$2 AND lesson_id=$3',[userId,classId,lessonId]))[0]?.tokens_used||0;}
 catch(error){if(schemaMissing(error))return;throw error;}
 if(used>=cap)throw Object.assign(new ApiAccessError(`This lesson session has used ${used.toLocaleString('en-US')} of its ${cap.toLocaleString('en-US')} AI tokens. Start a new session to continue, or contact your L&D administrator.`,429),{code:'session_token_cap'});
}
/** Provider usage when reported, otherwise ~4 characters per token over prompt, context and output. */
export function runTokens(result:{tokens?:unknown;output?:unknown},prompt:string,context:string){
 const reported=Number(result?.tokens);
 if(Number.isInteger(reported)&&reported>=0)return {tokens:reported,estimated:false};
 return {tokens:Math.ceil((prompt.length+context.length+String(result?.output??'').length)/4),estimated:true};
}
/** Idempotent per request: a replayed save never charges twice. Never throws; a saved Run must not fail here. */
export async function chargeSession(userId:string,classId:string,lessonId:string,requestId:string,usage:{tokens:number;estimated:boolean}){
 if(!sessionTokenCap())return false;
 try{return await sqlTransaction(undefined,async db=>{
  await db.query('INSERT INTO public.product_ai_sessions(user_id,class_id,lesson_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[userId,classId,lessonId]);
  const session=(await db.query('SELECT session_no FROM public.product_ai_sessions WHERE user_id=$1 AND class_id=$2 AND lesson_id=$3 FOR UPDATE',[userId,classId,lessonId])).rows[0];
  const charged=await db.query('INSERT INTO public.product_ai_session_charges(user_id,request_id,class_id,lesson_id,session_no,tokens,estimated) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING tokens',[userId,requestId,classId,lessonId,session.session_no,usage.tokens,usage.estimated]);
  if(!charged.rows.length)return false;
  await db.query('UPDATE public.product_ai_sessions SET tokens_used=LEAST(2000000000,tokens_used+$4),updated_at=now() WHERE user_id=$1 AND class_id=$2 AND lesson_id=$3',[userId,classId,lessonId,usage.tokens]);
  return true;
 });}catch(error){console.warn(JSON.stringify({event:'session_charge_failed',code:(error as any)?.code||'unknown'}));return false;}
}
export async function resetAiSession(userId:string,classId:string,lessonId:string){
 if(!sessionTokenCap())throw new ApiAccessError('Session token budgets are not enabled.',409);
 const [row]=await rows<any>(`INSERT INTO public.product_ai_sessions(user_id,class_id,lesson_id,session_no) VALUES($1,$2,$3,2)
  ON CONFLICT(user_id,class_id,lesson_id) DO UPDATE SET session_no=product_ai_sessions.session_no+1,tokens_used=0,started_at=now(),updated_at=now()
  RETURNING session_no,tokens_used`,[userId,classId,lessonId]);
 console.log(JSON.stringify({event:'ai_session_reset',sessionNo:row.session_no}));
 return {lessonId,sessionNo:row.session_no,tokensUsed:row.tokens_used,cap:sessionTokenCap()};
}

export async function recordSecurityEvent(event:{userId:string;classId:string;lessonId:string;requestId?:string;action:'blocked'|'allowed_practice'|'logged';signals:InjectionSignal[];prompt:string}){
 const promptSha=createHash('sha256').update(event.prompt,'utf8').digest('hex');
 console.warn(JSON.stringify({event:'security_event',kind:'prompt_injection',action:event.action,signals:event.signals,promptSha:promptSha.slice(0,16)}));
 try{await rows('INSERT INTO public.product_security_events(user_id,class_id,lesson_id,request_id,kind,action,signals,prompt_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[event.userId,event.classId,event.lessonId,event.requestId||null,'prompt_injection',event.action,event.signals,promptSha]);}
 catch(error){if(!schemaMissing(error))throw error;}
}
/** TC-SEC-04. Lessons whose Studio enables adversarial practice log the attempt but still run. */
export async function screenPromptInjection(input:{userId:string;classId:string;lessonId:string;requestId?:string;prompt:string;instruction?:string;allowPractice:boolean}){
 const mode=injectionGuardMode();if(mode==='off')return [];
 const signals=injectionSignals(input.prompt,input.instruction);if(!signals.length)return [];
 const action=mode==='log'?'logged':input.allowPractice?'allowed_practice':'blocked';
 await recordSecurityEvent({...input,action,signals,prompt:[input.prompt,input.instruction||''].join('\n')});
 if(action==='blocked')throw Object.assign(new ApiAccessError('This prompt looks like an attempt to override the AI system instructions ('+signals.join(', ')+'). It was blocked and logged. Rewrite the prompt as a normal task request.',422),{code:'prompt_injection_blocked'});
 return signals;
}
/** All pre-provider learner checks for one Run. Skips the identity lookup when every safeguard is off. */
export async function preflightRun(input:{subject:string;classId:string;lessonId:string;requestId?:string;prompt:string;instruction?:string;allowPractice:boolean}){
 if(!safeguardsEnabled())return undefined;
 const userId=await userIdForSubject(input.subject);
 await assertWritableAccess(userId,input.classId);
 await assertSessionBudget(userId,input.classId,input.lessonId);
 await screenPromptInjection({...input,userId});
 return userId;
}

/** Trainer/admin action; the change and its actor are written to product_audit in the same transaction. */
export async function setAccessExpiry(classId:string,learnerId:string,expiresAt:string|null,actorId:string){
 if(expiresAt!==null&&(typeof expiresAt!=='string'||!Number.isFinite(Date.parse(expiresAt))))throw new ApiAccessError('Invalid access expiry date.',422);
 const value=expiresAt===null?null:new Date(expiresAt).toISOString();
 try{return await sqlTransaction(undefined,async db=>{
  const row=(await db.query('UPDATE public.enrollments SET access_expires_at=$3,updated_at=now() WHERE class_id=$1 AND learner_id=$2 RETURNING learner_id,access_expires_at',[classId,learnerId,value])).rows[0];
  if(!row)throw new ApiAccessError('Learner is not enrolled in this class.',404);
  await db.query('INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES($1,$2,$3,$4)',[classId,actorId,'access.expiry',learnerId+' / '+(value||'none')]);
  return {learnerId:row.learner_id,accessExpiresAt:row.access_expires_at?new Date(row.access_expires_at).toISOString():null};
 });}catch(error){if(schemaMissing(error))throw new ApiAccessError('The learner safeguards schema upgrade (016) has not been applied.',503);throw error;}
}
/** Lesson must belong to the class's course; used before resetting a session. */
export async function lessonInClass(classId:string,lessonId:string){
 return (await rows('SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE l.id=$1 AND c.id=$2',[lessonId,classId])).length>0;
}
export async function classAccessExpiries(classId:string):Promise<Record<string,string>>{
 try{return Object.fromEntries((await rows<any>('SELECT learner_id,access_expires_at FROM public.enrollments WHERE class_id=$1 AND access_expires_at IS NOT NULL',[classId])).map(r=>[r.learner_id,new Date(r.access_expires_at).toISOString()]));}
 catch(error){if(schemaMissing(error))return {};throw error;}
}
