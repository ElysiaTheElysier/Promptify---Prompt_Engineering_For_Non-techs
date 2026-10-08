import { createClient } from '@supabase/supabase-js';
import { assertAiLessonAccess, ApiAccessError } from './apiAuthorizationService.js';
import { handleGenerateRequest, handleEvaluateRequest } from './apiServerService.js';

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
  const { data: lesson, error } = await reader.from('lessons').select('*, lesson_resources(*), lesson_rubric_criteria(*)').eq('id', lessonId).eq('status', 'published').single();
  if (error || !lesson) throw new ApiAccessError('Không tải được bài học đã xuất bản.', 403);
  const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return { reader, server, lesson, subject: identity.user.id };
}
export function createRebuildRunService(resolve=context, generate=handleGenerateRequest, evaluate=handleEvaluateRequest) {
async function generateSavedRun(authorization: string, body: any) {
  const c = await resolve(authorization, body.classId, body.lessonId);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 24000) throw new ApiAccessError('Prompt phải có 1–24000 ký tự.', 422);
  const key = body.requestId;
  if (!/^[0-9a-f-]{36}$/i.test(key || '')) throw new ApiAccessError('Thiếu request ID.', 422);
  const { data: begin, error: beginError } = await c.server.rpc('rebuild_begin_run', { p_subject: c.subject, p_class: body.classId, p_lesson: body.lessonId, p_request: key, p_prompt: prompt, p_snapshot: c.lesson });
  if (beginError) throw new ApiAccessError('Không thể bắt đầu/lặp lại run. Kiểm tra enrollment hoặc request đang xử lý.', 409);
  if (begin.result) return begin.result;
  const resourceText = [...(c.lesson.lesson_resources || [])].sort((a:any,b:any)=>a.position-b.position).map((r:any)=>r.content).filter(Boolean).join('\n\n');
  const result = await generate({ prompt, lessonId: body.lessonId, classId: body.classId, systemInstruction: c.lesson.system_instruction || undefined, inputContext: [c.lesson.sample_input_context, resourceText].filter(Boolean).join('\n\n') });
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
  const evaluation = await evaluate({ learnerPrompt: attempt.prompt_text, generatedOutput: attempt.ai_output, scenario: s.scenario, taskRequirement: s.task_goal, controlData: s.sample_input_context, lessonRubric: s.lesson_rubric_criteria });
  const { error: saveError } = await c.server.rpc('rebuild_finish_judge', { p_subject: c.subject, p_attempt: attempt.id, p_claim: claimId, p_evaluation: evaluation });
  if (saveError) throw new ApiAccessError('Chưa lưu được điểm. Lượt Judge đã nhận; liên hệ giảng viên kiểm tra trước khi chấm lại.', 503);
  return evaluation;
}

return { generateSavedRun, evaluateSavedRun };
}
export const {generateSavedRun,evaluateSavedRun}=createRebuildRunService();
