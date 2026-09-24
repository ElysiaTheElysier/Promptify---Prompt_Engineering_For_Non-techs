import { ApiConfig, LabStep, PromptRun, RubricAudit } from '../types';
import { AiEvaluationResult } from '../types/database';
import { supabase } from './supabaseClient';
import { validateAiEvaluationPayload } from './aiEvaluationContract';

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

import { detectPiiEntities } from './labComplianceService';

/**
 * Đánh giá fallback cục bộ nếu máy chủ gặp sự cố
 */
export function evaluatePromptRubric(
  promptText: string, 
  lab?: LabStep | { id?: string; title?: string; taskGoal?: string }
): RubricAudit {
  const text = promptText.toLowerCase();

  // 0. Kiểm tra Zero-tolerance về PII nếu là bài Lab 1 hoặc có chứa dữ liệu PII
  const piiCheck = detectPiiEntities(promptText);
  const isPiiLesson = Boolean(
    (lab?.id && (lab.id.includes('1') || lab.id.includes('pii'))) ||
    (lab?.title && lab.title.toLowerCase().includes('pii')) ||
    promptText.includes('Nguyễn Văn Tèo') ||
    promptText.includes('034091002847')
  );
  const isPiiViolation = isPiiLesson && piiCheck.hasPii;
  
  // 1. Vai trò (Role / Persona) - max 20
  let personaScore = 5;
  let personaNote = 'Chưa thiết lập vai trò chuyên môn rõ ràng.';
  if (text.includes('bạn là') || text.includes('vai trò') || text.includes('chuyên viên') || text.includes('chuyên gia')) {
    personaScore = 20;
    personaNote = 'Xuất sắc: Thiết lập vai trò chuyên gia đúng ngữ cảnh nghiệp vụ.';
  } else if (text.includes('đóng vai') || text.includes('tư cách')) {
    personaScore = 15;
    personaNote = 'Khá: Đã có định vị vai trò nhưng có thể cụ thể hóa chức danh.';
  }

  // 2. Nhiệm vụ (Task / Goal) - max 20
  let taskScore = 8;
  let taskNote = 'Nhiệm vụ còn sơ sài hoặc chưa rõ động từ hành động.';
  if (text.includes('hãy') || text.includes('phân tích') || text.includes('nhiệm vụ') || text.includes('trích xuất') || text.includes('soạn thảo')) {
    taskScore = 20;
    taskNote = 'Rõ ràng: Đầy đủ mục tiêu và động từ hành động nghiệp vụ.';
  }

  // 3. Ràng buộc & Tiêu cực (Constraints / Guardrails) - max 20
  let guardrailsScore = 5;
  let guardrailsNote = 'Thiếu ràng buộc tiêu cực hoặc giới hạn hành vi (rất dễ bị AI bịa đặt hoặc văn phong đàm thoại).';
  if (isPiiViolation) {
    guardrailsScore = 0;
    guardrailsNote = 'THẺ ĐỎ: Vi phạm nghiêm trọng an toàn dữ liệu khách hàng Agribank (gửi PII thật lên AI).';
  } else if (text.includes('tuyệt đối không') || text.includes('không được') || text.includes('chỉ') || text.includes('không dùng') || text.includes('nguyên tắc')) {
    guardrailsScore = 20;
    guardrailsNote = 'Vững chắc: Có hàng rào kiểm soát chặt chẽ, chống ảo giác và ngôn từ cảm tính.';
  } else if (text.includes('lưu ý') || text.includes('giới hạn') || text.includes('dưới')) {
    guardrailsScore = 14;
    guardrailsNote = 'Đã có giới hạn nhưng nên bổ sung thêm nguyên tắc cấm đoán (Negative Prompting).';
  }

  // 4. Bám sát Dữ liệu / Biến số (Groundedness / Variable) - max 20
  let variableScore = 5;
  let variableNote = 'Dữ liệu đầu vào chưa được neo chặt hoặc còn để lộ thông tin nhạy cảm.';
  if (isPiiViolation) {
    variableScore = 0;
    variableNote = `THẺ ĐỎ VI PHẠM NGHỊ ĐỊNH 13: Còn tồn tại ${piiCheck.piiItems.length} thông tin PII thật chưa khử (${piiCheck.piiItems.map(i => `${i.label} "${i.value}"`).join(', ')}).`;
  } else if ((text.includes('{{') && text.includes('}}')) || (text.includes('[') && text.includes(']') && text.includes('khách_hàng'))) {
    variableScore = 20;
    variableNote = 'Chuẩn hóa: Đã ẩn danh hóa dữ liệu bằng biến giữ chỗ an toàn và neo chặt vào bối cảnh.';
  } else if (text.includes('dữ liệu') || text.includes('trích lục') || text.includes('hồ sơ') || text.includes('tài liệu')) {
    variableScore = 15;
    variableNote = 'Đã dẫn xuất dữ liệu đầu vào, khuyến khích dùng biến giữ chỗ {{BIẾN}} để tăng bảo mật.';
  }

  // 5. Định dạng đầu ra (Format Adherence) - max 20
  let formatScore = 5;
  let formatNote = 'Chưa chỉ định khuôn dạng đầu ra cụ thể, kết quả có thể khó tái sử dụng.';
  if (text.includes('bảng') || text.includes('markdown') || text.includes('cột') || text.includes('3 góc') || text.includes('gồm:')) {
    formatScore = 20;
    formatNote = 'Chuẩn xác: Yêu cầu định dạng bảng biểu hoặc danh sách mục sẵn sàng ứng dụng.';
  } else if (text.includes('đoạn văn') || text.includes('danh sách') || text.includes('tiêu đề')) {
    formatScore = 15;
    formatNote = 'Đã có yêu cầu định dạng, có thể cụ thể hóa tên từng cột hoặc khuôn mẫu.';
  }

  const totalScore = isPiiViolation 
    ? Math.min(30, personaScore + taskScore + formatScore)
    : (personaScore + taskScore + guardrailsScore + variableScore + formatScore);
  
  let actionableAdvice = '';
  if (isPiiViolation) {
    actionableAdvice = 'THẺ ĐỎ VI PHẠM NGHỊ ĐỊNH 13: Còn tồn tại thông tin PII thật trong câu lệnh. Bấm nút "Tự động Bút xóa PII 1-chạm" để khử định danh trước khi nộp bài!';
  } else if (totalScore >= 80) {
    actionableAdvice = 'Prompt đạt chuẩn cấp độ Chuyên gia! Đầy đủ vai trò, kiểm soát rủi ro và định dạng tối ưu.';
  } else if (totalScore >= 50) {
    actionableAdvice = 'Prompt mức Khá. Hãy bổ sung thêm các ràng buộc tiêu cực (Không suy diễn, Không dùng từ cảm tính) và yêu cầu khuôn bảng biểu Markdown.';
  } else {
    actionableAdvice = 'Prompt còn ở mức cơ bản. Cần bổ sung Vai trò (Role), Ràng buộc (Constraints) và mẫu Định dạng cụ thể để AI không suy đoán ngẫu nhiên.';
  }

  return {
    personaScore,
    taskScore,
    guardrailsScore,
    variableScore,
    formatScore,
    totalScore,
    personaNote,
    taskNote,
    guardrailsNote,
    variableNote,
    formatNote,
    actionableAdvice
  };
}

/**
 * Trình sinh kết quả mô phỏng (Simulated Engine) mượt mà với streaming tự nhiên
 */
export async function executeSimulatedPromptStream(
  promptText: string,
  lab: LabStep,
  onChunk: (chunk: string) => void,
  startTime: number = performance.now()
): Promise<{ output: string; tokenCount: number; latencyMs: number; mode: 'simulated'; model: string }> {
  const text = promptText.toLowerCase();
  const isImproved = 
    promptText.length > 200 ||
    text.includes('bảng') ||
    text.includes('markdown') ||
    text.includes('vai trò') ||
    text.includes('bạn là') ||
    text.includes('{{') ||
    text.includes('ràng buộc') ||
    text.includes('tuyệt đối không') ||
    text.includes('chỉ');

  const targetOutput = isImproved && lab.simulatedImprovedOutput
    ? lab.simulatedImprovedOutput
    : (lab.simulatedBaselineOutput || 'Đang tạo câu trả lời mẫu cho bài thực hành...');

  // Giả lập streaming từng từ với hiệu ứng gõ chữ tự nhiên
  const words = targetOutput.split(' ');
  let accumulated = '';
  const step = Math.max(1, Math.floor(words.length / 35));

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + step).join(' ');
    accumulated += (accumulated ? ' ' : '') + chunk;
    onChunk(accumulated);
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  onChunk(targetOutput);

  const latencyMs = Math.round(performance.now() - startTime);
  const tokenCount = Math.round(targetOutput.length / 3.8);

  return {
    output: targetOutput,
    tokenCount,
    latencyMs,
    mode: 'simulated',
    model: 'Mô phỏng Nghiệp vụ'
  };
}

/**
 * Thực thi gọi Prompt qua Serverless Backend Endpoint POST /api/generate
 * Chỉ sử dụng Simulated Engine khi người dùng chủ động chọn chế độ Mô phỏng.
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

  // 1. Chế độ Mô phỏng (Simulated Engine) - Chỉ chạy khi người dùng chủ động chọn chế độ simulated
  if (apiConfig.mode === 'simulated') {
    return executeSimulatedPromptStream(promptText, lab, onChunk, startTime);
  }

  // 2. Chế độ Live AI - Gọi trực tiếp Server Endpoint POST /api/generate
  const headers = await getAuthenticatedApiHeaders();
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      lessonId: lab.id,
      classId,
      prompt: promptText,
      systemInstruction,
      inputContext: lab.sampleInputContext,
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
  const model = data.model || 'gemini-2.5-flash';

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
    mode: model.toLowerCase().includes('gpt') ? 'openai' : 'gemini',
    model
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
  return validateAiEvaluationPayload(result);
}

