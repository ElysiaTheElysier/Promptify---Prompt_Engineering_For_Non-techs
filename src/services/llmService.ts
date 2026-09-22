import { ApiConfig, LabStep, PromptRun, RubricAudit } from '../types';
import { AiEvaluationResult } from '../types/database';
import { supabase } from './supabaseClient';

async function getAuthenticatedApiHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Bạn cần đăng nhập và được ghi danh để sử dụng chức năng AI.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Chuyển đổi kết quả AI Evaluation 5 tiêu chuẩn (0–2 điểm mỗi tiêu chí, tổng 0–10)
 * sang định dạng RubricAudit hiển thị trực quan trên giao diện
 */
export function mapAiEvaluationToRubricAudit(evalResult: AiEvaluationResult): RubricAudit {
  const { scores, total, strengths, improvements, nextHint } = evalResult;

  // Quy đổi thang 0–2 sang thang 0–20 (Tổng 0–10 -> Tổng 0–100)
  const taskScore = scores.taskCompletion * 10;
  const variableScore = scores.groundedness * 10; // Groundedness
  const formatScore = scores.formatAdherence * 10;
  const guardrailsScore = scores.constraintCompliance * 10;
  const personaScore = scores.businessUsability * 10; // Business Usability

  return {
    personaScore,
    taskScore,
    guardrailsScore,
    variableScore,
    formatScore,
    totalScore: total * 10,
    personaNote: `Khả năng ứng dụng nghiệp vụ: ${scores.businessUsability}/2 điểm.`,
    taskNote: `Mức độ hoàn thành nhiệm vụ: ${scores.taskCompletion}/2 điểm.`,
    guardrailsNote: `Tuân thủ ràng buộc và điều cấm: ${scores.constraintCompliance}/2 điểm.`,
    variableNote: `Mức độ bám sát dữ liệu (Groundedness): ${scores.groundedness}/2 điểm.`,
    formatNote: `Tuân thủ định dạng yêu cầu: ${scores.formatAdherence}/2 điểm.`,
    actionableAdvice: nextHint || (improvements.length > 0 ? improvements.join('. ') : 'Tiếp tục phát huy phong cách prompt chuẩn.')
  };
}

/**
 * Đánh giá fallback cục bộ nếu máy chủ gặp sự cố
 */
export function evaluatePromptRubric(promptText: string): RubricAudit {
  const text = promptText.toLowerCase();
  
  let personaScore = text.includes('bạn là') || text.includes('vai trò') ? 15 : 5;
  let taskScore = text.includes('hãy') || text.includes('phân tích') || text.includes('nhiệm vụ') ? 15 : 8;
  let guardrailsScore = text.includes('tuyệt đối không') || text.includes('không được') || text.includes('chỉ') ? 15 : 5;
  let variableScore = text.includes('{{') || text.includes('dữ liệu') ? 15 : 5;
  let formatScore = text.includes('bảng') || text.includes('markdown') ? 15 : 5;

  const totalScore = personaScore + taskScore + guardrailsScore + variableScore + formatScore;
  return {
    personaScore,
    taskScore,
    guardrailsScore,
    variableScore,
    formatScore,
    totalScore,
    personaNote: 'Vai trò chuyên môn.',
    taskNote: 'Mô tả nhiệm vụ.',
    guardrailsNote: 'Ràng buộc tiêu cực.',
    variableNote: 'Dữ liệu đầu vào.',
    formatNote: 'Định dạng đầu ra.',
    actionableAdvice: totalScore >= 70 ? 'Prompt đã khá tốt!' : 'Nên bổ sung thêm vai trò và định dạng bảng.'
  };
}

/**
 * Thực thi gọi Prompt qua Serverless Backend Endpoint POST /api/generate
 * Bảo vệ an toàn tuyệt đối API Key trên server.
 */
export async function executePromptStream(
  promptText: string,
  systemInstruction: string,
  lab: LabStep,
  apiConfig: ApiConfig,
  onChunk: (chunk: string) => void,
  classId?: string,
): Promise<{ output: string; tokenCount: number; latencyMs: number; mode: 'gemini' | 'simulated' | 'openai'; model: string }> {
  const startTime = performance.now();
  const headers = await getAuthenticatedApiHeaders();

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      lessonId: lab.id,
      classId,
      prompt: promptText,
      context: lab.sampleInputContext
    })
  });

  if (!response.ok) {
    let errorMsg = `Lỗi máy chủ (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const realOutput = data.output || '';
  const latencyMs = data.latencyMs || Math.round(performance.now() - startTime);
  const tokenCount = Math.round(realOutput.length / 3.8);

  // Hiệu ứng streaming chữ mượt mà trên dữ liệu thật trả về từ LLM
  const words = realOutput.split(' ');
  let accumulated = '';
  const step = Math.max(1, Math.floor(words.length / 40));

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + step).join(' ');
    accumulated += (accumulated ? ' ' : '') + chunk;
    onChunk(accumulated);
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  onChunk(realOutput);

  return {
    output: realOutput,
    tokenCount,
    latencyMs,
    mode: 'openai',
    model: data.model || 'openai'
  };
}

/**
 * Chấm điểm câu lệnh và kết quả thông qua endpoint POST /api/evaluate
 */
export async function evaluatePromptLive(params: {
  lessonId: string;
  classId?: string;
  scenario: string;
  controlData?: string;
  taskRequirement: string;
  lessonRubric?: any;
  learnerPrompt: string;
  generatedOutput: string;
}): Promise<AiEvaluationResult> {
  const headers = await getAuthenticatedApiHeaders();
  const response = await fetch('/api/evaluate', {
    method: 'POST',
    headers,
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    let errorMsg = `Lỗi máy chủ đánh giá (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  const result: AiEvaluationResult = await response.json();
  return result;
}
