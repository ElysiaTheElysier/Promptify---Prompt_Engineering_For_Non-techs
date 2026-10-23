import {sqlTransaction} from './cloudPostgresService';
import {ApiAccessError} from './apiAuthorizationService.js';

/** Facilitator-approved hint requests (migration 017). Learners ask with a reason; a class editor approves or declines.
 * Approval unlocks the lesson's hints (product_learner_support); the facilitator's note is shown inside that request. */
export type HintRequest={id:string;learnerId:string;lessonId:string;reason:string;status:'pending'|'approved'|'declined';note:string|null;createdAt:string;decidedAt:string|null;learnerName?:string;lessonTitle?:string};
const missing=(error:unknown)=>(error as any)?.code==='42P01';
/** Open requests one learner may keep per lesson. */
export const MAX_OPEN_HINT_REQUESTS=5;
const iso=(value:any)=>value?new Date(value).toISOString():null;
const shape=(r:any):HintRequest=>({id:r.id,learnerId:r.learner_id,lessonId:r.lesson_id,reason:r.reason,status:r.status,note:r.note,createdAt:iso(r.created_at)!,decidedAt:iso(r.decided_at),
 ...(r.full_name!==undefined?{learnerName:r.full_name||r.email,lessonTitle:r.lesson_title}:{})});
const schemaError=()=>new ApiAccessError('The hint request schema upgrade (017) has not been applied.',503);

/** The learner's own requests in this class (newest first). Empty before 017 is applied. */
export async function learnerHintRequests(learnerId:string,classId:string):Promise<HintRequest[]>{
 try{return await sqlTransaction(undefined,async db=>(await db.query('SELECT * FROM public.product_hint_requests WHERE learner_id=$1 AND class_id=$2 ORDER BY created_at DESC LIMIT 100',[learnerId,classId])).rows.map(shape));}
 catch(error){if(missing(error))return [];throw error;}
}
/** Trainer queue: pending first (oldest first), then the 30 most recent decisions. Active enrollments only. */
export async function classHintRequests(classId:string):Promise<HintRequest[]>{
 const query=`SELECT h.*,u.full_name,u.email,l.title AS lesson_title FROM public.product_hint_requests h
  JOIN public.learners le ON le.id=h.learner_id JOIN public.users u ON u.id=le.user_id JOIN public.lessons l ON l.id=h.lesson_id
  JOIN public.enrollments e ON e.learner_id=h.learner_id AND e.class_id=h.class_id AND e.status='active' WHERE h.class_id=$1`;
 try{return await sqlTransaction(undefined,async db=>{
  const pending=(await db.query(query+" AND h.status='pending' ORDER BY h.created_at LIMIT 100",[classId])).rows;
  const decided=(await db.query(query+" AND h.status<>'pending' ORDER BY h.decided_at DESC LIMIT 30",[classId])).rows;
  return [...pending,...decided].map(shape);
 });}catch(error){if(missing(error))return [];throw error;}
}
/** Idempotent per request ID; an open request for the same lesson is returned instead of a duplicate. */
export async function createHintRequest(userId:string,classId:string,lessonId:string,requestId:string,reason:string){
 const text=reason.trim();
 if(text.length<10||text.length>1000)throw new ApiAccessError('Explain why you need a hint in 10–1000 characters.',422);
 try{return await sqlTransaction(undefined,async db=>{
  const learner=(await db.query("SELECT le.id FROM public.learners le JOIN public.enrollments e ON e.learner_id=le.id AND e.class_id=$2 AND e.status='active' WHERE le.user_id=$1",[userId,classId])).rows[0];
  if(!learner)throw new ApiAccessError('Learner is not active in this class.',403);
  const same=(await db.query('SELECT * FROM public.product_hint_requests WHERE learner_id=$1 AND request_id=$2',[learner.id,requestId])).rows[0];
  if(same){if(same.class_id!==classId||same.lesson_id!==lessonId)throw new ApiAccessError('This request ID was already used for another lesson.',409);return shape(same);}
  // Several open requests per lesson are allowed (018), bounded so a learner cannot flood the facilitator queue.
  const open=Number((await db.query("SELECT count(*) AS n FROM public.product_hint_requests WHERE learner_id=$1 AND class_id=$2 AND lesson_id=$3 AND status='pending'",[learner.id,classId,lessonId])).rows[0].n);
  if(open>=MAX_OPEN_HINT_REQUESTS)throw new ApiAccessError(`You already have ${MAX_OPEN_HINT_REQUESTS} hint requests waiting for this lesson. Wait for your facilitator to review them.`,429);
  let row;
  try{row=(await db.query('INSERT INTO public.product_hint_requests(learner_id,class_id,lesson_id,request_id,reason) VALUES($1,$2,$3,$4,$5) RETURNING *',[learner.id,classId,lessonId,requestId,text])).rows[0];}
  catch(error){if((error as any)?.code==='23505')throw new ApiAccessError('A hint request for this lesson is already waiting for review.',409);throw error;}
  console.log(JSON.stringify({event:'hint_request',status:'pending'}));
  return shape(row);
 });}catch(error){if(missing(error))throw schemaError();throw error;}
}
/** Approve or decline once. Approval unlocks hints; the note is the facilitator hint shown in the request. Audited. */
export async function reviewHintRequest(classId:string,id:string,decision:'approve'|'decline',note:string,reviewerId:string){
 if(!['approve','decline'].includes(decision))throw new ApiAccessError('Decision must be approve or decline.',422);
 const reply=note.trim().slice(0,2000);
 try{return await sqlTransaction(undefined,async db=>{
  const row=(await db.query('SELECT h.*,l.title AS lesson_title FROM public.product_hint_requests h JOIN public.lessons l ON l.id=h.lesson_id WHERE h.id=$1 AND h.class_id=$2 FOR UPDATE OF h',[id,classId])).rows[0];
  if(!row)throw new ApiAccessError('Hint request not found in this class.',404);
  if(row.status!=='pending')throw new ApiAccessError('This hint request was already '+row.status+'.',409);
  const status=decision==='approve'?'approved':'declined';
  const saved=(await db.query('UPDATE public.product_hint_requests SET status=$2,reviewer_id=$3,note=$4,decided_at=now() WHERE id=$1 RETURNING *',[id,status,reviewerId,reply||null])).rows[0];
  if(status==='approved')await db.query("INSERT INTO public.product_learner_support(learner_id,class_id,lesson_id,kind) VALUES($1,$2,$3,'hints') ON CONFLICT DO NOTHING",[row.learner_id,classId,row.lesson_id]);
  // The facilitator's hint (note) is shown inside this request in the learner's Hints tab, not as an inbox message.
  await db.query('INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES($1,$2,$3,$4)',[classId,reviewerId,'hint.'+decision,id]);
  console.log(JSON.stringify({event:'hint_request',status}));
  return shape(saved);
 });}catch(error){if(missing(error))throw schemaError();throw error;}
}
