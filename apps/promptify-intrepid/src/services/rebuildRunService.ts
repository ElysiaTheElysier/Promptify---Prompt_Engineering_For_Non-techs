import {createGenerationTask,newGenerationToken,generationTokenSha,type GenerationTask} from './generationQueueService';
import {withProviderScope} from './providerAdmissionService';
import {leaseJudgeDispatch,finishJudgeDispatch,settleJudgeDispatch,recoverLostJudgeDispatch} from './judgeFencingService';
import {bindPromptVariables} from './promptVariableService';
import {resolveClassLesson} from './classLessonConfigService.js';
import {retrieveBigqueryContext,retrievePgvectorContext} from './cloudSopRetrievalService';
import {createHash} from 'node:crypto';
import {validateLearnerSettings} from './learnerSettingsService.js';
import {codelabAvailable} from './codelabLifecycleService.js';
import {createDatabaseClient,requireCloudDatabase} from './cloudDatabaseService';
import { assertAiLessonAccess, ApiAccessError } from './apiAuthorizationService.js';
import { handleGenerateRequest, handleEvaluateRequest, AiServerError } from './apiServerService.js';
import { productionGenerate, productionGenerateStream, productionEvaluate } from './productionAiService.js';
import {preflightRun,chargeSession,runTokens,sessionTokenCap,accessExpiryEnabled,userIdForSubject,assertWritableAccess} from './learnerSafeguardService';
import { piiSignals } from './piiGuardService.js';
import { DEFAULT_RUBRIC, validateRubric } from './weightedRubricService.js';
import { createJudgeTask, newJudgeToken, judgeTokenSha, JUDGE_JOB_DEADLINE_MS, JUDGE_JOB_LEASE_SECONDS, JUDGE_JOB_TTL_SECONDS, JUDGE_MAX_DISPATCHES, type JudgeTask } from './judgeQueueService.js';

async function context(authorization: string, classId: string, lessonId: string) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(lessonId || '')) throw new ApiAccessError('Bài học cần UUID canonical.', 422);
  await assertAiLessonAccess({ authorization, classId, lessonId });
  try{requireCloudDatabase();}catch{throw new ApiAccessError('Cloud SQL persistence is not configured.',503);}
  const token=authorization.replace(/^Bearer\s+/i,'');
  const reader=createDatabaseClient(authorization);
  const { data: identity, error: authError } = await reader.auth.getUser(token);
  if (authError || !identity.user) throw new ApiAccessError('Phiên đăng nhập không hợp lệ.', 401);
  // Authorization above uses only public lesson identifiers; private teaching
  // content is loaded on the server after that scope has been verified.
  const server=createDatabaseClient();
  const { data: lesson, error } = await server.from('lessons').select('*, lesson_resources(*), lesson_rubric_criteria(*)').eq('id', lessonId).single();
  if (error || !lesson) throw new ApiAccessError('Không tải được bài học đã xuất bản.', 403);
  const { data: studio, error: studioError } = await server.from('product_studio').select('config,revision').eq('class_id', classId).eq('lesson_id', lessonId).maybeSingle();
  if (studioError) throw new ApiAccessError('Production curriculum schema is unavailable.', 503);
  Object.assign(lesson,resolveClassLesson(lesson,studio?.config));
  const {data:classInfo,error:classError}=await server.from('classes').select('class_code').eq('id',classId).single();
  if(classError||!classInfo)throw new ApiAccessError('Class configuration unavailable.',503);
  if(!codelabAvailable(lesson.status,studio?.config,Date.now(),classInfo.class_code==='PUBLIC-BASIC'?'BASIC Free':'ADVANCE Paid'))throw new ApiAccessError('This Codelab is outside its published schedule.',403);
  const {data:sops,error:sopError}=await reader.rpc('rebuild_class_sops',{p_class:classId,p_lesson:lessonId});
  if(sopError)throw new ApiAccessError('Chưa tải được SOP canonical. Kiểm tra schema và quyền truy cập.',503);
  const sourceText=(sops||[]).map((s:any)=>`${s.citation} ${s.title}\n${s.content}`).join('\n\n');
  if(sourceText.length>100000)throw new ApiAccessError('Tài liệu SOP của bài vượt giới hạn 100000 ký tự. Giảng viên cần thu gọn nguồn.',422);
  lesson.rebuild_sop_versions=sops||[];
  lesson.base_input_context=lesson.sample_input_context;
  lesson.sample_input_context=[lesson.sample_input_context,sourceText].filter(Boolean).join('\n\n');
  lesson.production_rubric = validateRubric(studio?.config?.rubric || DEFAULT_RUBRIC);
  lesson.production_revision = studio?.revision || 0;
  lesson.prompt_variables=studio?.config?.variables||[];
  lesson.allow_adversarial_practice=studio?.config?.allowAdversarialPractice===true;
  const threshold = Number(studio?.config?.awards?.passThreshold ?? 8);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 10) throw new ApiAccessError('Invalid passing threshold.', 422);
  lesson.production_pass_threshold = threshold;
  return { reader, server, lesson, subject: identity.user.id };
}
/** A claim older than any possible request lifetime (Cloud Run timeout 300s) has no live writer. */
export const JUDGE_CLAIM_STALE_MS=6*60*1000;
/** Removes an unfinished claim whose writer can no longer exist. finish_judge requires the same claim_id, so a removed claim can never be completed twice. */
async function releaseStaleClaim(server:any,subject:string,attemptId:string,at:number){
  try{
  const {data,error}=await server.from('rebuild_judge_claims').select('claim_id,claimed_at,completed_at').eq('attempt_id',attemptId).eq('subject',subject).maybeSingle();
  if(error||!data||data.completed_at||!(at-Date.parse(data.claimed_at)>JUDGE_CLAIM_STALE_MS))return false;
  const removed=await server.from('rebuild_judge_claims').delete().eq('attempt_id',attemptId).eq('subject',subject).eq('claim_id',data.claim_id).is('completed_at',null).select('attempt_id').maybeSingle();
  if(removed.error)return false;
  if(removed.data)console.warn(JSON.stringify({event:'judge_stale_claim_released',ageMs:at-Date.parse(data.claimed_at)}));
  return true;
  }catch{return false;}
}
function beginRunError(message:string){
  if(/^AI run quota exceeded/i.test(message))return new ApiAccessError('Your AI run limit has been reached (40 per hour, 200 per day). Try again after the limit resets.',429);
  if(/Basic daily execution quota exceeded/i.test(message))return new ApiAccessError('Your execution quota has been reached. Basic allows 10 executions per day.',429);
  if(/Access denied/i.test(message))return new ApiAccessError('This lesson is not available for your active enrollment.',403);
  if(/Request key conflict/i.test(message))return new ApiAccessError('This run request was already used with different input. Run the prompt again.',409);
  if(/processing or uncertain/i.test(message))return new ApiAccessError('This run is still processing or its outcome is unknown. Refresh saved attempts before running again.',409);
  return new ApiAccessError('Không thể bắt đầu/lặp lại run. Kiểm tra enrollment hoặc request đang xử lý.', 409);
}
/** Server-frozen generation evidence for grading; never data sent by the client. */
function judgeEvidence(s:any){
  const controlData=s.actual_generation_context??s.sample_input_context;
  if(s.actual_generation_context!==undefined&&(typeof controlData!=='string'||
    createHash('sha256').update(controlData,'utf8').digest('hex')!==s.actual_generation_context_hash))
    throw new ApiAccessError('Generation evidence is inconsistent; contact the trainer before judging.',409);
  return controlData;
}
function judgeInput(attempt:any,s:any,controlData:string,language?:string){
  return { learnerPrompt: attempt.prompt_text, generatedOutput: attempt.ai_output, scenario: s.scenario, taskRequirement: s.task_goal, controlData, lessonRubric: s.production_rubric || s.lesson_rubric_criteria, language: language === 'en' ? 'en' : 'vi' };
}
/** Signed-in identity only (no lesson/SOP load): cheap enough for Judge status polling. */
async function identifyLearner(authorization:string){
  try{requireCloudDatabase();}catch{throw new ApiAccessError('Cloud SQL persistence is not configured.',503);}
  const reader=createDatabaseClient(authorization);
  const {data,error}=await reader.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
  if(error||!data.user)throw new ApiAccessError('Phiên đăng nhập không hợp lệ.',401);
  return {reader,server:createDatabaseClient(),subject:data.user.id};
}
/** The attempt must belong to the signed-in learner, in the stated class and lesson. */
async function ownedAttempt(c:{reader:any;subject:string},body:any){
  const { data: attempt, error } = await c.reader.from('prompt_attempts').select('*').eq('id', body.attemptId).eq('class_id', body.classId).eq('lesson_ref_id', body.lessonId).single();
  const { data: owner } = await c.reader.from('users').select('id').eq('auth_provider_id', c.subject).single();
  const { data: learner } = await c.reader.from('learners').select('id').eq('user_id', owner?.id).single();
  if (error || !attempt || !learner || attempt.learner_id !== learner.id) throw new ApiAccessError('Attempt không thuộc người học hiện tại.', 403);
  return {attempt,owner};
}
/** Lease JUDGE_JOB_LEASE_SECONDS outlives the worker deadline, so a running job whose lease expired
 * (plus grace) has no live worker: the dispatch crashed. Fail it cleanly so the claim is released and the
 * learner can request a new grade, instead of waiting for job expiry. A late zombie cannot save: its claim is gone. */
export const JUDGE_LOST_WORKER_GRACE_MS=30000;
async function recoverLostJudgeWorker(attemptId:string,subject:string,at:number){
  const settled=await recoverLostJudgeDispatch(attemptId,subject,at,JUDGE_LOST_WORKER_GRACE_MS);
  if(settled.error||settled.data?.status!=='failed')return false;
  console.warn(JSON.stringify({event:'judge_worker_lost',job:createHash('sha256').update(attemptId).digest('hex').slice(0,12)}));
  return true;
}
type JudgeServiceOptions={generationQueue?:(task:GenerationTask)=>Promise<void>;queue?:(task:JudgeTask)=>Promise<void>;identify?:typeof identifyLearner;workerServer?:()=>any;streamGenerate?:typeof productionGenerateStream};
/** TC-AUTH-04: an expired learner keeps read access but cannot start AI work. */
async function assertNotReadOnly(subject:string,classId:string){if(accessExpiryEnabled())await assertWritableAccess(await userIdForSubject(subject),classId);}
export function createRebuildRunService(resolve=context, generate=productionGenerate, evaluate: (body: any, deadlineMs?: number) => Promise<any> = productionEvaluate,
  retrieval={pgvector:retrievePgvectorContext,bigquery:retrieveBigqueryContext}, now=()=>Date.now(), options:JudgeServiceOptions={}) {
const queue=options.queue||createJudgeTask, identify=options.identify||identifyLearner, workerServer=options.workerServer||(()=>createDatabaseClient());
/** onDelta streams provider text (TC-PLAY-02); the saved result and all checks are identical to the JSON path. */
async function generateSavedRun(authorization: string, body: any, queueOnly=false, onDelta?:(text:string)=>void) {
  const c = await resolve(authorization, body.classId, body.lessonId);
  const template = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const binding=bindPromptVariables(template,c.lesson.prompt_variables||[],body.variableValues||{});
  const prompt=binding.prompt;
  c.lesson.prompt_template=template;c.lesson.prompt_variable_values=binding.values;
  if (!prompt || prompt.length > 24000) throw new ApiAccessError('Prompt phải có 1–24000 ký tự.', 422);
  if (piiSignals(prompt).length) throw new ApiAccessError('Remove personal information before running AI.', 422);
  let settings;try{settings=validateLearnerSettings(body.settings);}catch(e){throw new ApiAccessError((e as Error).message,422);}
  if(piiSignals(settings.personalInstruction||'').length)throw new ApiAccessError('Remove personal information from the learner instruction.',422);
  const safeguardUser=await preflightRun({subject:c.subject,classId:body.classId,lessonId:body.lessonId,requestId:/^[0-9a-f-]{36}$/i.test(body.requestId||'')?body.requestId:undefined,prompt,instruction:settings.personalInstruction,allowPractice:c.lesson.allow_adversarial_practice===true});
  if(settings.model&&![process.env.GEMINI_MODEL||'gemini-2.5-flash',process.env.GEMINI_FALLBACK_MODEL].includes(settings.model))throw new ApiAccessError('Model is not enabled by the administrator.',422);
  const ids=body.contextIds||[];if(!Array.isArray(ids)||ids.length>5||ids.some(id=>typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)))throw new ApiAccessError('Invalid uploaded-context selection.',422);
  let extra='';if(ids.length){const {data:user}=await c.server.from('users').select('id').eq('auth_provider_id',c.subject).single();const {data:files,error:filesError}=await c.server.from('product_learner_context').select('id,content').eq('owner_id',user?.id).eq('class_id',body.classId).eq('lesson_id',body.lessonId).in('id',ids);if(filesError||files?.length!==new Set(ids).size)throw new ApiAccessError('Private context scope denied.',403);extra=files.map((f:any)=>`Learner-provided untrusted input [${f.id}]:\n${f.content}`).join('\n');}
  c.lesson.generation_settings=settings;c.lesson.learner_context_ids=ids;c.lesson.learner_context_text=extra;
  c.lesson.sample_input_context=[c.lesson.sample_input_context,extra].filter(Boolean).join('\n\n');
  const resourceText = [...(c.lesson.lesson_resources || [])].sort((a:any,b:any)=>a.position-b.position).map((r:any)=>r.content).filter(Boolean).join('\n\n');
  let inputContext = [c.lesson.sample_input_context, resourceText].filter(Boolean).join('\n\n');
  if(inputContext.length>100000)throw new ApiAccessError('Selected context is too large.',422);
  // Begin with canonical evidence so completed requests can replay without retrieval.
  // A claimed run freezes its final retrieved context below, before calling the provider.
  c.lesson.actual_generation_context=inputContext;
  c.lesson.actual_generation_context_hash=createHash('sha256').update(inputContext,'utf8').digest('hex');
  const key = body.requestId;
  if (!/^[0-9a-f-]{36}$/i.test(key || '')) throw new ApiAccessError('Thiếu request ID.', 422);
  if(!queueOnly){
  const { data: begin, error: beginError } = await c.server.rpc('rebuild_begin_run', { p_subject: c.subject, p_class: body.classId, p_lesson: body.lessonId, p_request: key, p_prompt: prompt, p_snapshot: c.lesson });
  if(beginError)throw beginRunError(beginError.message||'');
  if (begin.result) return begin.result;
  }
  if(queueOnly)c.lesson.generation_rag_mode=process.env.GCP_VECTOR_MODE||'';
  if(!queueOnly&&['bigquery','pgvector'].includes(process.env.GCP_VECTOR_MODE||'')&&c.lesson.rebuild_sop_versions?.length){
   try{const admitted=c.lesson.rebuild_sop_versions.map((v:any)=>v.version_id||v.id);const rag=process.env.GCP_VECTOR_MODE==='pgvector'?await retrieval.pgvector(c.reader,body.classId,body.lessonId,prompt,admitted):await retrieval.bigquery(c.reader,c.server,body.classId,body.lessonId,prompt,admitted);
    c.lesson.rag_query=rag.query;c.lesson.rag_query_policy='first-1000-codepoints-v1';
    c.lesson.rag_chunks=rag.chunks.map(({content,...reference}:any)=>reference);
    if(rag.context){c.lesson.sample_input_context=[c.lesson.base_input_context,rag.context,c.lesson.learner_context_text].filter(Boolean).join('\n\n');c.lesson.rag_status=process.env.GCP_VECTOR_MODE;}
    else c.lesson.rag_status='fallback-canonical';
   }catch{c.lesson.rag_status='fallback-canonical';}
   // Fallback preserves the admitted, authorized canonical context rather than generating without evidence.
   // Recheck class/SOP access even on fallback before a provider call.
   const stillAllowed=await c.reader.rpc('rebuild_class_sops',{p_class:body.classId,p_lesson:body.lessonId});
   if(stillAllowed.error)throw new ApiAccessError('SOP/class access changed before generation.',403);
   const versions=new Set((stillAllowed.data||[]).map((v:any)=>v.version_id||v.id));
   if(c.lesson.rebuild_sop_versions.some((v:any)=>!versions.has(v.version_id||v.id)))throw new ApiAccessError('SOP context changed; reload the lesson.',409);
   inputContext=[c.lesson.sample_input_context,resourceText].filter(Boolean).join('\n\n');
   if(inputContext.length>100000)throw new ApiAccessError('Selected context is too large.',422);
   c.lesson.actual_generation_context=inputContext;
   c.lesson.actual_generation_context_hash=createHash('sha256').update(inputContext,'utf8').digest('hex');
   if(!queueOnly){const frozen=await c.server.from('rebuild_runs').update({snapshot:c.lesson}).eq('subject',c.subject).eq('request_id',key).is('result',null);
   if(frozen.error)throw new ApiAccessError('Retrieval evidence could not be saved.',503);}
  }

  if(queueOnly){
    const {token,sha}=newGenerationToken();
    const {data:job,error}=await c.server.rpc('product_enqueue_generation',{p_subject:c.subject,p_class:body.classId,p_lesson:body.lessonId,p_request:key,p_prompt:prompt,p_snapshot:c.lesson,p_token_sha:sha});
    if(error){if(/backlog full/i.test(error.message||''))throw new ApiAccessError('Generation queue is full. Retry this request shortly.',503);throw beginRunError(error.message||'');}
    if(job.result)return job.result;
    if(job.created){try{await (options.generationQueue||createGenerationTask)({subject:c.subject,requestId:key,generation:job.generation,token});
      const confirmed=await c.server.rpc('product_confirm_generation_dispatch',{p_subject:c.subject,p_request:key,p_generation:job.generation});if(confirmed.error)throw Error('Dispatch confirmation unavailable');}
      catch{throw new ApiAccessError('Your generation request is saved. Retry the same request after 30 seconds to restore dispatch.',503);}}
    return {async:true,status:job.status,requestId:key};
  }
  const request={ prompt, lessonId: body.lessonId, classId: body.classId, systemInstruction: c.lesson.system_instruction || undefined, settings, inputContext };
  const result = await withProviderScope({tenant:c.subject,correlationId:key},()=>onDelta?(options.streamGenerate||productionGenerateStream)(request,onDelta):generate(request));
  const { data: saved, error } = await c.server.rpc('rebuild_finish_run', { p_subject: c.subject, p_request: key, p_result: result });
  if (error || !saved?.attempt) throw new ApiAccessError('AI đã tạo kết quả nhưng chưa lưu được. Không tự chạy lại để tránh gọi AI trùng; liên hệ trainer với request ID.', 503);
  if(safeguardUser)await chargeSession(safeguardUser,body.classId,body.lessonId,key,runTokens(result,prompt,inputContext));
  return { ...result, saved };
}
async function evaluateSavedRun(authorization: string, body: any) {
  const c = await resolve(authorization, body.classId, body.lessonId);
  await assertNotReadOnly(c.subject,body.classId);
  const { data: attempt, error } = await c.reader.from('prompt_attempts').select('*').eq('id', body.attemptId).eq('class_id', body.classId).eq('lesson_ref_id', body.lessonId).single();
  const { data: owner } = await c.reader.from('users').select('id').eq('auth_provider_id', c.subject).single();
  const { data: learner } = await c.reader.from('learners').select('id').eq('user_id', owner?.id).single();
  if (error || !attempt || !learner || attempt.learner_id !== learner.id) throw new ApiAccessError('Attempt không thuộc người học hiện tại.', 403);
  const { data: run } = await c.server.from('rebuild_runs').select('snapshot').eq('attempt_id', attempt.id).eq('subject', c.subject).single();
  if (!run) throw new ApiAccessError('Attempt thiếu snapshot server; không chấm dữ liệu do client gửi.', 409);
  if (attempt.evaluation_json) return attempt.evaluation_json;
  const s = run.snapshot;
  const controlData=judgeEvidence(s);
  const claimId = crypto.randomUUID();
  const takeClaim=async()=>{
    const { data, error: claimError } = await c.server.rpc('rebuild_claim_judge', { p_subject: c.subject, p_attempt: attempt.id, p_claim: claimId });
    if (claimError || !data) throw new ApiAccessError('Chưa xác nhận được lượt chấm điểm trên server.', 503);
    return data;
  };
  let claim=await takeClaim();
  if (claim.status === 'complete') return claim.evaluation;
  if (claim.status !== 'claimed' && await releaseStaleClaim(c.server, c.subject, attempt.id, now())) claim=await takeClaim();
  if (claim.status === 'complete') return claim.evaluation;
  if (claim.status !== 'claimed') throw new ApiAccessError('Judge đang xử lý lần chấm này. Chờ một lát rồi tải lại; nếu sau vài phút vẫn chưa có điểm, bạn có thể chấm lại. (AI Judge is still grading this attempt; retry is allowed if it stays ungraded after a few minutes.)', 409);
  const release=()=>c.server.from('rebuild_judge_claims').delete().eq('attempt_id',attempt.id).eq('subject',c.subject).eq('claim_id',claimId).is('completed_at',null);
  const budget=await c.server.rpc('product_take_budget',{p_actor:owner.id,p_operation:'ai.judge',p_limit:40});
  if(budget.error||typeof budget.data!=='boolean')throw new ApiAccessError('Judge budget could not be confirmed; contact the trainer before retrying.',503);
  if(!budget.data){
    const released=await c.server.from('rebuild_judge_claims').delete().eq('attempt_id',attempt.id).eq('subject',c.subject).eq('claim_id',claimId).is('completed_at',null).select('attempt_id').maybeSingle();
    if(released.error||!released.data)throw new ApiAccessError('Judge quota reached and claim recovery is uncertain; contact the trainer.',503);
    throw new ApiAccessError('Judge quota reached: 40 grading attempts per hour. Try again next hour.',429);
  }
  let evaluation;try{evaluation = await withProviderScope({tenant:c.subject,correlationId:attempt.id},()=>evaluate(judgeInput(attempt,s,controlData,body.language)));}
  catch(error){
    // The provider work for this claim has settled and no score was saved under claimId, so no later
    // writer can finish it: releasing is safe even for an uncertain 504 (only provider billing is unknown).
    // Retries still consume the Judge budget. A failed release falls back to stale-claim recovery.
    try{await release();}catch{}
    if((error as any)?.statusCode===504)throw new AiServerError('AI Judge timed out before a score was confirmed. No score was saved; you can retry AI Judge now.',504);
    throw error;
  }
  const { error: saveError } = await c.server.rpc('rebuild_finish_judge', { p_subject: c.subject, p_attempt: attempt.id, p_claim: claimId, p_evaluation: evaluation });
  if (saveError) throw new ApiAccessError('Chưa lưu được điểm. Lượt Judge đã nhận; liên hệ giảng viên kiểm tra trước khi chấm lại.', 503);
  return evaluation;
}

/** JUDGE_MODE=async: same authorization and evidence checks, then a durable job instead of a synchronous grade. */
async function enqueueJudge(authorization: string, body: any) {
  const c = await resolve(authorization, body.classId, body.lessonId);
  await assertNotReadOnly(c.subject,body.classId);
  const {attempt,owner}=await ownedAttempt(c,body);
  const { data: run } = await c.server.from('rebuild_runs').select('snapshot').eq('attempt_id', attempt.id).eq('subject', c.subject).single();
  if (!run) throw new ApiAccessError('Attempt thiếu snapshot server; không chấm dữ liệu do client gửi.', 409);
  if (attempt.evaluation_json) return attempt.evaluation_json;
  judgeEvidence(run.snapshot);
  await recoverLostJudgeWorker(attempt.id,c.subject,now());
  const {token,sha}=newJudgeToken();
  const {data:job,error}=await c.server.rpc('product_enqueue_judge',{p_subject:c.subject,p_attempt:attempt.id,p_claim:crypto.randomUUID(),p_token_sha:sha,p_ttl_seconds:JUDGE_JOB_TTL_SECONDS});
  if(error||!job)throw new ApiAccessError('AI Judge queue could not record this request. Try again shortly.',503);
  if(job.status==='complete')return job.evaluation;
  if(job.status==='busy')throw new ApiAccessError('Judge đang xử lý lần chấm này. Chờ một lát rồi tải lại. (AI Judge is still grading this attempt.)',409);
  if(!job.created)return {async:true,status:job.status};
  const settleFailed=(code:string)=>c.server.rpc('product_settle_judge',{p_attempt:attempt.id,p_generation:job.generation,p_outcome:'failed',p_error:code,p_upstream:null});
  const budget=await c.server.rpc('product_take_budget',{p_actor:owner.id,p_operation:'ai.judge',p_limit:40});
  if(budget.error||typeof budget.data!=='boolean'){await settleFailed('budget_unknown');throw new ApiAccessError('Judge budget could not be confirmed; try again shortly.',503);}
  if(!budget.data){await settleFailed('budget_exhausted');throw new ApiAccessError('Judge quota reached: 40 grading attempts per hour. Try again next hour.',429);}
  try{await queue({attemptId:attempt.id,generation:job.generation,token});}
  catch{await settleFailed('enqueue_failed');throw new ApiAccessError('AI Judge queue is unavailable. Your output is saved; try again shortly.',503);}
  return {async:true,status:'queued'};
}
/** Polling: owner-only, no budget, no lesson/SOP load. Lazily expires a job nobody dispatched. */
async function judgeStatus(authorization: string, body: any) {
  const c=await identify(authorization);
  const {attempt}=await ownedAttempt(c,body);
  if(attempt.evaluation_json)return {status:'succeeded',evaluation:attempt.evaluation_json};
  if(await recoverLostJudgeWorker(attempt.id,c.subject,now()))return {status:'failed',errorCode:'worker_lost'};
  const {data:job,error}=await c.server.from('product_judge_jobs').select('status,generation,expires_at,last_error_code,last_upstream_status,updated_at').eq('attempt_id',attempt.id).eq('subject',c.subject).maybeSingle();
  if(error)throw new ApiAccessError('AI Judge status is unavailable.',503);
  if(!job)return {status:'none'};
  let status=job.status;
  if(['queued','running','retry_wait'].includes(status)&&Date.parse(job.expires_at)<=now()){
    await c.server.rpc('product_settle_judge',{p_attempt:attempt.id,p_generation:job.generation,p_outcome:'expired',p_error:'expired',p_upstream:null});
    status='expired';
  }
  return {status,updatedAt:job.updated_at,errorCode:job.last_error_code||undefined,upstreamStatus:job.last_upstream_status||undefined};
}
/** Cloud Tasks worker: one dispatch of one job. Returns the HTTP status the queue should see
 * (2xx = finished, 503 = retry later). Never fabricates or partially saves a score. */
async function runJudgeJob(token: string, attemptId: string): Promise<{http:number;status:string}> {
  if(!/^[0-9a-f]{64}$/.test(token||'')||!/^[0-9a-f-]{36}$/i.test(attemptId||''))return {http:401,status:'denied'};
  const server=workerServer();
  const fenced=process.env.JUDGE_FENCING_MODE==='sql';
  const leasedAt=now(),metric=(outcome:string,extra:Record<string,unknown>={})=>console.log(JSON.stringify({event:'judge_job_metrics',job:createHash('sha256').update(attemptId).digest('hex').slice(0,12),generation:lease.generation,dispatch:lease.dispatch_count,outcome,...extra}));
  const {data:lease,error:leaseError}=await (fenced?leaseJudgeDispatch(attemptId,judgeTokenSha(token),JUDGE_JOB_LEASE_SECONDS):server.rpc('product_lease_judge',{p_attempt:attemptId,p_token_sha:judgeTokenSha(token),p_lease_seconds:JUDGE_JOB_LEASE_SECONDS}));
  if(leaseError||!lease)return {http:503,status:'lease_unavailable'};
  if(lease.status==='denied')return {http:401,status:'denied'};
  if(lease.status!=='leased')return {http:lease.status==='busy'?503:200,status:lease.status};
  const settle=(outcome:string,code:string|null=null,upstream:number|null=null)=>fenced
   ?settleJudgeDispatch(attemptId,lease.generation,lease.dispatch_count,outcome,code,upstream)
   :server.rpc('product_settle_judge',{p_attempt:attemptId,p_generation:lease.generation,p_outcome:outcome,p_error:code,p_upstream:upstream});
  const {data:attempt}=await server.from('prompt_attempts').select('*').eq('id',attemptId).single();
  const {data:run}=await server.from('rebuild_runs').select('snapshot').eq('attempt_id',attemptId).eq('subject',lease.subject).single();
  if(!attempt||!run){await settle('failed','evidence_missing');return {http:200,status:'failed'};}
  let controlData;try{controlData=judgeEvidence(run.snapshot);}catch{await settle('failed','evidence_inconsistent');return {http:200,status:'failed'};}
  let evaluation;
  const {data:jobRow}=await server.from('product_judge_jobs').select('created_at').eq('attempt_id',attemptId).maybeSingle();
  const queueWaitMs=jobRow?.created_at?leasedAt-Date.parse(jobRow.created_at):null,evaluateStarted=now();
  try{evaluation=await withProviderScope({tenant:lease.subject,correlationId:attemptId},()=>evaluate(judgeInput(attempt,run.snapshot,controlData),JUDGE_JOB_DEADLINE_MS));}
  catch(error){
    const code=(error as any)?.statusCode,upstream=(error as any)?.upstreamStatus??null;
    metric('provider_error',{queueWaitMs,evaluateMs:now()-evaluateStarted,status:code??502,upstream});
    const reason=typeof (error as any)?.code==='string'&&(error as any).code.startsWith('admission_')?(error as any).code:typeof code==='number'?'provider_'+code:'invalid_result';
    if([429,503,504].includes(code)&&lease.dispatch_count<JUDGE_MAX_DISPATCHES){await settle('retry_wait',reason,upstream);return {http:503,status:'retry_wait'};}
    await settle('failed',reason,upstream);
    return {http:200,status:'failed'};
  }
  {const judge=(evaluation as any)?.judge||{};
   metric('evaluated',{queueWaitMs,evaluateMs:now()-evaluateStarted,strategy:judge.version,providerAttempts:judge.providerAttempts,timedOutAttempts:judge.timedOutAttempts,
    tokens:(judge.stages||[]).reduce((sum:number,st:any)=>sum+(st.tokens||0),0),stages:(judge.stages||[]).map((st:any)=>({stage:st.stage,ms:st.ms,tokens:st.tokens,attempts:st.attempts}))});}
  if(fenced){
   const saved=await finishJudgeDispatch(attemptId,lease.generation,lease.dispatch_count,evaluation);
   return {http:saved.error?503:200,status:saved.error?'save_unconfirmed':saved.data?.status||'stale'};
  }
  const {error:saveError}=await server.rpc('rebuild_finish_judge',{p_subject:lease.subject,p_attempt:attemptId,p_claim:lease.claim_id,p_evaluation:evaluation});
  // Unknown persistence: keep the lease; a later dispatch or expiry resolves it. No second score is possible.
  if(saveError)return {http:503,status:'save_unconfirmed'};
  await settle('succeeded');
  return {http:200,status:'succeeded'};
}

/** Owner-scoped status lookup. Never re-runs generation or consumes identity quota. */
async function generationStatus(authorization:string,body:any){
 const c=await identify(authorization);
 const {data:status,error}=await c.server.rpc('product_generation_status',{p_subject:c.subject,p_request:body.requestId,p_class:body.classId,p_lesson:body.lessonId});
 // The new client also preserves uncertain synchronous requests. Keep flag-OFF deployments
 // compatible before migration014: recover the owner-scoped saved run without calling AI.
 if(error?.code==='42883'){
  const {data:legacy,error:readError}=await c.server.from('rebuild_runs').select('result').eq('subject',c.subject).eq('request_id',body.requestId).eq('class_id',body.classId).eq('lesson_id',body.lessonId).maybeSingle();
  if(readError)throw new ApiAccessError('Generation status unavailable.',503);
  if(!legacy)throw new ApiAccessError('Generation request not found.',404);
  return legacy.result?{status:'generated',result:legacy.result}:{status:'generating',errorCode:'legacy_outcome_unknown'};
 }
 if(error||!status)throw new ApiAccessError('Generation status unavailable.',503);
 if(status.status==='missing')throw new ApiAccessError('Generation request not found.',404);
 if(status.recoverDispatch){
  const {data:run}=await c.server.from('rebuild_runs').select('prompt,snapshot').eq('subject',c.subject).eq('request_id',body.requestId).single();
  if(run){const {token,sha}=newGenerationToken();
   const {data:job,error:queueError}=await c.server.rpc('product_enqueue_generation',{p_subject:c.subject,p_class:body.classId,p_lesson:body.lessonId,p_request:body.requestId,p_prompt:run.prompt,p_snapshot:run.snapshot,p_token_sha:sha});
   if(!queueError&&job?.created){try{await (options.generationQueue||createGenerationTask)({subject:c.subject,requestId:body.requestId,generation:job.generation,token});
    await c.server.rpc('product_confirm_generation_dispatch',{p_subject:c.subject,p_request:body.requestId,p_generation:job.generation});}catch{/* Next owner poll safely restores dispatch after 30s. */}}
  }
 }
 return {status:status.status,result:status.result,errorCode:status.errorCode||undefined};
}
async function runGenerationJob(token:string,subject:string,requestId:string):Promise<{http:number;status:string}>{
 if(!/^[0-9a-f]{64}$/.test(token||'')||!/^[0-9a-f-]{36}$/i.test(subject||'')||!/^[0-9a-f-]{36}$/i.test(requestId||''))return {http:401,status:'denied'};
 const server=workerServer(),fence=crypto.randomUUID();
 const {data:lease,error}=await server.rpc('product_lease_generation',{p_subject:subject,p_request:requestId,p_token_sha:generationTokenSha(token),p_fence:fence});
 if(error||!lease)return {http:503,status:'lease_unavailable'};
 if(lease.status==='denied')return {http:401,status:'denied'};
 if(lease.status!=='leased')return {http:lease.status==='busy'?503:200,status:lease.status};
 let s=lease.snapshot;let result,usage:ReturnType<typeof runTokens>|undefined;
 try{
  const assertCurrentCodelab=async()=>{
  const [{data:lesson,error:lessonError},{data:studio,error:studioError},{data:cls,error:classError}]=await Promise.all([
   server.from('lessons').select('status').eq('id',lease.lesson_id).single(),
   server.from('product_studio').select('config').eq('class_id',lease.class_id).eq('lesson_id',lease.lesson_id).maybeSingle(),
   server.from('classes').select('class_code').eq('id',lease.class_id).single()
  ]);
  if(lessonError||studioError||classError||!lesson||!cls)throw new ApiAccessError('Delayed generation access could not be confirmed.',503);
  if(!codelabAvailable(resolveClassLesson(lesson,studio?.config).status,studio?.config,now(),cls.class_code==='PUBLIC-BASIC'?'BASIC Free':'ADVANCE Paid'))throw new ApiAccessError('Codelab is no longer available.',403);
  };
  await assertCurrentCodelab();
  if(['bigquery','pgvector'].includes(s.generation_rag_mode||'')&&s.rebuild_sop_versions?.length&&!s.generation_rag_frozen){
   // This reader grants only two existing RAG RPCs under this live lease's frozen class/lesson scope.
   const reader={async rpc(name:string,args:Record<string,any>){
    if(!['rebuild_class_sops','intrepid_search_sop'].includes(name)||args.p_class!==lease.class_id||args.p_lesson!==lease.lesson_id)return {data:null,error:{message:'Generation retrieval scope denied'}};
    return server.rpc('product_generation_retrieve',{p_subject:subject,p_request:requestId,p_fence:fence,p_operation:name==='rebuild_class_sops'?'sops':'search',p_versions:args.p_versions||[],p_vector:args.p_vector||null});
   }} as unknown as ReturnType<typeof createDatabaseClient>;
   try{
    const admitted=s.rebuild_sop_versions.map((v:any)=>v.version_id||v.id);
    const rag=await withProviderScope({tenant:subject,correlationId:requestId},()=>s.generation_rag_mode==='pgvector'?retrieval.pgvector(reader,lease.class_id,lease.lesson_id,lease.prompt,admitted):retrieval.bigquery(reader,server,lease.class_id,lease.lesson_id,lease.prompt,admitted));
    s.rag_query=rag.query;s.rag_query_policy='first-1000-codepoints-v1';s.rag_chunks=rag.chunks.map(({content,...reference}:any)=>reference);
    if(rag.context){s.sample_input_context=[s.base_input_context,rag.context,s.learner_context_text].filter(Boolean).join('\n\n');s.rag_status=s.generation_rag_mode;}
    else s.rag_status='fallback-canonical';
   }catch{s.rag_status='fallback-canonical';}
   // The same post-retrieval source check applies to successful retrieval and canonical fallback.
   const stillAllowed=await reader.rpc('rebuild_class_sops',{p_class:lease.class_id,p_lesson:lease.lesson_id});
   if(stillAllowed.error)throw new ApiAccessError('SOP/class access changed before generation.',403);
   const versions=new Set((stillAllowed.data||[]).map((v:any)=>v.version_id||v.id));
   if(s.rebuild_sop_versions.some((v:any)=>!versions.has(v.version_id||v.id)))throw new ApiAccessError('SOP context changed before generation.',409);
   const resources=[...(s.lesson_resources||[])].sort((a:any,b:any)=>a.position-b.position).map((r:any)=>r.content).filter(Boolean).join('\n\n');
   s.actual_generation_context=[s.sample_input_context,resources].filter(Boolean).join('\n\n');
   if(s.actual_generation_context.length>100000)throw new ApiAccessError('Selected context is too large.',422);
   s.actual_generation_context_hash=createHash('sha256').update(s.actual_generation_context,'utf8').digest('hex');
   const {data:frozen,error:freezeError}=await server.rpc('product_freeze_generation_context',{p_subject:subject,p_request:requestId,p_fence:fence,p_evidence:s});
   if(freezeError||frozen?.status!=='frozen')throw new ApiAccessError('Retrieval evidence could not be saved under this lease.',409);
   s=frozen.snapshot;
   // Retrieval may take tens of seconds; a class-specific schedule can close meanwhile.
   await assertCurrentCodelab();
  }
  const inputContext=judgeEvidence(s);
  const remaining=Math.min(240000,Date.parse(lease.lease_until)-now()-15000);
  if(!Number.isFinite(remaining)||remaining<1000)throw new ApiAccessError('Generation lease has insufficient time remaining.',503);
  result=await withProviderScope({tenant:subject,correlationId:requestId},()=>generate({prompt:lease.prompt,classId:lease.class_id,lessonId:lease.lesson_id,settings:s.generation_settings,inputContext,systemInstruction:s.system_instruction||undefined},remaining));
  usage=runTokens(result,lease.prompt,inputContext);
 }catch(cause){
  const code=(cause as any)?.statusCode;
  // A timeout may have been billed. Never automatically repeat an uncertain generation.
  const retry=[429,503].includes(code)&&lease.dispatch_count<3;
  const {error:settleError}=await server.rpc('product_fail_generation',{p_subject:subject,p_request:requestId,p_fence:fence,p_retry:retry,p_error:typeof (cause as any)?.code==='string'&&(cause as any).code.startsWith('admission_')?(cause as any).code:typeof code==='number'?'provider_'+code:'invalid_result'});
  return {http:settleError?503:retry?503:200,status:settleError?'settle_unconfirmed':retry?'retry_wait':'failed'};
 }
 const {data:saved,error:saveError}=await server.rpc('product_finish_generation',{p_subject:subject,p_request:requestId,p_fence:fence,p_result:result});
 if(!saveError&&usage&&sessionTokenCap()){const user=await userIdForSubject(subject).catch(()=>undefined);if(user)await chargeSession(user,lease.class_id,lease.lesson_id,requestId,usage);}
 return {http:saveError?503:200,status:saveError?'save_unconfirmed':saved?.status||'stale'};
}
return { generateSavedRun, evaluateSavedRun, enqueueJudge, judgeStatus, runJudgeJob, generationStatus, runGenerationJob };
}
export const {generateSavedRun,evaluateSavedRun,enqueueJudge,judgeStatus,runJudgeJob,generationStatus,runGenerationJob}=createRebuildRunService();
