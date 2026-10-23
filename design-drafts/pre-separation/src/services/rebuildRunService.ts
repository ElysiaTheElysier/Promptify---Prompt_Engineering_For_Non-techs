import {validateLearnerSettings} from './learnerSettingsService.js';
import {codelabAvailable} from './codelabLifecycleService.js';
import { createClient } from '@supabase/supabase-js';
import { assertAiLessonAccess, ApiAccessError } from './apiAuthorizationService.js';
import { handleGenerateRequest, handleEvaluateRequest } from './apiServerService.js';
import { productionGenerate, productionEvaluate } from './productionAiService.js';
import { piiSignals } from './piiGuardService.js';
import { DEFAULT_RUBRIC, validateRubric } from './weightedRubricService.js';

async function context(authorization: string, classId: string, lessonId: string) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(lessonId || '')) throw new ApiAccessError('Bài học cần UUID canonical.', 422);
  await assertAiLessonAccess({ authorization, classId, lessonId });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !key) throw new ApiAccessError('Rebuild backend chưa cấu hình server persistence.', 503);
  const token = authorization.replace(/^Bearer\s+/i, '');
  const reader = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: identity, error: authError } = await reader.auth.getUser(token);
  if (authError || !identity.user) throw new ApiAccessError('Phiên đăng nhập không hợp lệ.', 401);
  // Authorization above uses only public lesson identifiers; private teaching
  // content is loaded on the server after that scope has been verified.
  const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: lesson, error } = await server.from('lessons').select('*, lesson_resources(*), lesson_rubric_criteria(*)').eq('id', lessonId).eq('status', 'published').single();
  if (error || !lesson) throw new ApiAccessError('Không tải được bài học đã xuất bản.', 403);
  const {data:sops,error:sopError}=await reader.rpc('rebuild_class_sops',{p_class:classId,p_lesson:lessonId});
  if(sopError)throw new ApiAccessError('Chưa tải được SOP canonical. Kiểm tra schema và quyền truy cập.',503);
  const sourceText=(sops||[]).map((s:any)=>`${s.citation} ${s.title}\n${s.content}`).join('\n\n');
  if(sourceText.length>100000)throw new ApiAccessError('Tài liệu SOP của bài vượt giới hạn 100000 ký tự. Giảng viên cần thu gọn nguồn.',422);
  lesson.rebuild_sop_versions=sops||[];
  lesson.sample_input_context=[lesson.sample_input_context,sourceText].filter(Boolean).join('\n\n');
  const { data: studio, error: studioError } = await server.from('product_studio').select('config,revision').eq('class_id', classId).eq('lesson_id', lessonId).maybeSingle();
  if (studioError) throw new ApiAccessError('Production curriculum schema is unavailable.', 503);
  if(!codelabAvailable(lesson.status,studio?.config))throw new ApiAccessError('This Codelab is outside its published schedule.',403);
  lesson.production_rubric = validateRubric(studio?.config?.rubric || DEFAULT_RUBRIC);
  lesson.production_revision = studio?.revision || 0;
  const threshold = Number(studio?.config?.awards?.passThreshold ?? 8);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 10) throw new ApiAccessError('Invalid passing threshold.', 422);
  lesson.production_pass_threshold = threshold;
  return { reader, server, lesson, subject: identity.user.id };
}
export function createRebuildRunService(resolve=context, generate=productionGenerate, evaluate: (body: any) => Promise<any> = productionEvaluate) {
async function generateSavedRun(authorization: string, body: any) {
  const c = await resolve(authorization, body.classId, body.lessonId);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 24000) throw new ApiAccessError('Prompt phải có 1–24000 ký tự.', 422);
  if (piiSignals(prompt).length) throw new ApiAccessError('Remove personal information before running AI.', 422);
  let settings;try{settings=validateLearnerSettings(body.settings);}catch(e){throw new ApiAccessError((e as Error).message,422);}
  if(piiSignals(settings.personalInstruction||'').length)throw new ApiAccessError('Remove personal information from the learner instruction.',422);
  if(settings.model&&![process.env.GEMINI_MODEL||'gemini-2.5-flash',process.env.GEMINI_FALLBACK_MODEL].includes(settings.model))throw new ApiAccessError('Model is not enabled by the administrator.',422);
  const ids=body.contextIds||[];if(!Array.isArray(ids)||ids.length>5||ids.some(id=>typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)))throw new ApiAccessError('Invalid uploaded-context selection.',422);
  let extra='';if(ids.length){const {data:user}=await c.server.from('users').select('id').eq('auth_provider_id',c.subject).single();const {data:files,error:filesError}=await c.server.from('product_learner_context').select('id,content').eq('owner_id',user?.id).eq('class_id',body.classId).eq('lesson_id',body.lessonId).in('id',ids);if(filesError||files?.length!==new Set(ids).size)throw new ApiAccessError('Private context scope denied.',403);extra=files.map(f=>`Learner-provided untrusted input [${f.id}]:\n${f.content}`).join('\n');}
  c.lesson.generation_settings=settings;c.lesson.learner_context_ids=ids;
  c.lesson.sample_input_context=[c.lesson.sample_input_context,extra].filter(Boolean).join('\n\n');
  const resourceText = [...(c.lesson.lesson_resources || [])].sort((a:any,b:any)=>a.position-b.position).map((r:any)=>r.content).filter(Boolean).join('\n\n');
  const inputContext = [c.lesson.sample_input_context, resourceText].filter(Boolean).join('\n\n');
  if(inputContext.length>100000)throw new ApiAccessError('Selected context is too large.',422);
  const key = body.requestId;
  if (!/^[0-9a-f-]{36}$/i.test(key || '')) throw new ApiAccessError('Thiếu request ID.', 422);
  const { data: begin, error: beginError } = await c.server.rpc('rebuild_begin_run', { p_subject: c.subject, p_class: body.classId, p_lesson: body.lessonId, p_request: key, p_prompt: prompt, p_snapshot: c.lesson });
  if(beginError&&/quota exceeded/i.test(beginError.message||''))throw new ApiAccessError('Your execution quota has been reached. Basic allows 10 executions per day.',429);
  if (beginError) throw new ApiAccessError('Không thể bắt đầu/lặp lại run. Kiểm tra enrollment hoặc request đang xử lý.', 409);
  if (begin.result) return begin.result;
  const result = await generate({ prompt, lessonId: body.lessonId, classId: body.classId, systemInstruction: c.lesson.system_instruction || undefined, settings, inputContext });
  const { data: saved, error } = await c.server.rpc('rebuild_finish_run', { p_subject: c.subject, p_request: key, p_result: result });
  if (error || !saved?.attempt) throw new ApiAccessError('AI đã tạo kết quả nhưng chưa lưu được. Không tự chạy lại để tránh gọi AI trùng; liên hệ trainer với request ID.', 503);
  return { ...result, saved };
}
async function evaluateSavedRun(authorization: string, body: any) {
  const c = await resolve(authorization, body.classId, body.lessonId);
  const { data: attempt, error } = await c.reader.from('prompt_attempts').select('*').eq('id', body.attemptId).eq('class_id', body.classId).eq('lesson_ref_id', body.lessonId).single();
  const { data: learner } = await c.reader.from('learners').select('id').eq('user_id', (await c.reader.from('users').select('id').eq('auth_provider_id', c.subject).single()).data?.id).single();
  if (error || !attempt || !learner || attempt.learner_id !== learner.id) throw new ApiAccessError('Attempt không thuộc người học hiện tại.', 403);
  const { data: run } = await c.server.from('rebuild_runs').select('snapshot').eq('attempt_id', attempt.id).eq('subject', c.subject).single();
  if (!run) throw new ApiAccessError('Attempt thiếu snapshot server; không chấm dữ liệu do client gửi.', 409);
  if (attempt.evaluation_json) return attempt.evaluation_json;
  const s = run.snapshot;
  const claimId = crypto.randomUUID();
  const { data: claim, error: claimError } = await c.server.rpc('rebuild_claim_judge', { p_subject: c.subject, p_attempt: attempt.id, p_claim: claimId });
  if (claimError || !claim) throw new ApiAccessError('Chưa xác nhận được lượt chấm điểm trên server.', 503);
  if (claim.status === 'complete') return claim.evaluation;
  if (claim.status !== 'claimed') throw new ApiAccessError('Judge đang xử lý hoặc chưa rõ kết quả. Liên hệ giảng viên trước khi chấm lại.', 409);
  let evaluation;try{evaluation = await evaluate({ learnerPrompt: attempt.prompt_text, generatedOutput: attempt.ai_output, scenario: s.scenario, taskRequirement: s.task_goal, controlData: s.sample_input_context, lessonRubric: s.production_rubric || s.lesson_rubric_criteria, language: body.language === 'en' ? 'en' : 'vi' });}catch(error){if([429,502].includes((error as any)?.statusCode)){await c.server.from('rebuild_judge_claims').delete().eq('attempt_id',attempt.id).eq('subject',c.subject).eq('claim_id',claimId).is('completed_at',null);}throw error;}
  const { error: saveError } = await c.server.rpc('rebuild_finish_judge', { p_subject: c.subject, p_attempt: attempt.id, p_claim: claimId, p_evaluation: evaluation });
  if (saveError) throw new ApiAccessError('Chưa lưu được điểm. Lượt Judge đã nhận; liên hệ giảng viên kiểm tra trước khi chấm lại.', 503);
  return evaluation;
}

return { generateSavedRun, evaluateSavedRun };
}
export const {generateSavedRun,evaluateSavedRun}=createRebuildRunService();
