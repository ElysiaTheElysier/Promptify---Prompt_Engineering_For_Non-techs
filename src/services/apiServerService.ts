import type { AiEvaluationResult } from '../types/database.js';

export interface GenerateRequestBody {
  lessonId?: string;
  classId?: string;
  prompt: string;
  context?: string;
}

export interface GenerateResponseBody {
  output: string;
  model: string;
  latencyMs: number;
  tokens?: number;
}

export interface EvaluateRequestBody {
  lessonId?: string;
  classId?: string;
  scenario?: string;
  controlData?: string;
  taskRequirement?: string;
  lessonRubric?: any;
  learnerPrompt: string;
  generatedOutput: string;
}

export class AiServerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AiServerError';
    this.statusCode = statusCode;
  }
}

/**
 * Lấy API key từ biến môi trường máy chủ (Server-only environment variable)
 * Tuyệt đối không đọc từ biến client VITE_*
 */
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return key.trim();
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
}

function getOpenAiApiKey(): string {
  return (process.env.OPENAI_API_KEY || '').trim();
}

async function callOpenAiJudge(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: prompt,
      max_output_tokens: 600,
      store: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    console.error(`[OpenAI Judge] HTTP ${response.status}.`);
    throw new AiServerError(
      response.status === 401 || response.status === 403
        ? 'OPENAI_API_KEY trên máy chủ không hợp lệ hoặc không có quyền dùng model Judge.'
        : response.status === 429
          ? 'OpenAI Judge đang vượt giới hạn sử dụng. Vui lòng thử lại.'
          : 'OpenAI Judge tạm thời không khả dụng. Vui lòng thử lại.',
      response.status === 429 ? 503 : 502,
    );
  }

  const data = await response.json() as any;
  const outputText = data.output_text
    || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
  if (!outputText) throw new AiServerError('OpenAI Judge không trả về nội dung hợp lệ.', 502);
  return outputText;
}

/**
 * Trích xuất JSON an toàn ngay cả khi mô hình trả về chuỗi có ký tự nháy hoặc cấu trúc lỗi
 */
function parseJsonSafely(rawText: string): any {
  let cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AiServerError('AI Judge trả về dữ liệu không đúng định dạng. Vui lòng thử chấm lại.', 502);
  }
}

/**
 * Gọi Google Gemini API với cơ chế tự động thử lại (retry) và chuyển đổi dự phòng (fallback)
 * Ưu tiên các model Lite siêu tốc (800ms) để không bị nghẽn demand
 */
async function callGeminiWithFallback(
  apiKey: string,
  payload: any,
  options: { allowJudgeGemmaFallback?: boolean } = {},
): Promise<{ data: any; model: string }> {
  const candidateModels = options.allowJudgeGemmaFallback
    ? ['gemini-3-flash-preview', 'gemma-4-26b-a4b-it']
    : ['gemini-3-flash-preview', getGeminiModel(), 'gemini-flash-lite-latest'];
  // Loại bỏ model trùng lặp
  const models = Array.from(new Set(candidateModels));
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const modelPayload = model.startsWith('gemini-3')
          ? payload
          : {
              ...payload,
              generationConfig: payload.generationConfig
                ? Object.fromEntries(Object.entries(payload.generationConfig).filter(([key]) => (
                    key !== 'thinkingConfig' && (!model.startsWith('gemma-') || key !== 'responseMimeType')
                  )))
                : undefined,
            };
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelPayload),
          signal: AbortSignal.timeout(12_000),
        });

        if (response.ok) {
          const data = await response.json();
          return { data, model };
        }

        const errorBody = await response.json().catch(() => null) as any;
        const upstreamMessage = errorBody?.error?.message;

        // 503 (High demand) hoặc 429 (Rate limit) -> Thử model khác nhanh chóng
        if (response.status === 503 || response.status === 429) {
          lastError = new AiServerError(
            response.status === 429
              ? 'Dịch vụ AI đang vượt giới hạn sử dụng. Vui lòng thử lại sau ít phút.'
              : 'Dịch vụ AI tạm thời quá tải. Vui lòng thử lại.',
            503,
          );
          console.warn(`[Gemini API] Model ${model} trả về HTTP ${response.status} (attempt ${attempt}). Chuyển fallback...`);
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
            continue;
          }
        } else {
          console.error(`[Gemini API] Model ${model} trả về HTTP ${response.status}.`);
          // Giữ lỗi 503 có thể retry nếu các model fallback không tồn tại cho project này.
          if (!(lastError instanceof AiServerError && lastError.statusCode === 503 && response.status === 404)) {
            lastError = new AiServerError(
              response.status === 400
                ? `Gemini từ chối request${upstreamMessage ? `: ${upstreamMessage}` : '.'}`
                : response.status === 401 || response.status === 403
                  ? 'GEMINI_API_KEY trên máy chủ không hợp lệ hoặc không có quyền dùng model đã cấu hình.'
                  : 'Không thể nhận phản hồi hợp lệ từ dịch vụ AI.',
              response.status === 400 ? 400 : 502,
            );
          }
          break; // Không retry nếu là lỗi client
        }
      } catch (err: any) {
        lastError = new AiServerError(
          err?.name === 'TimeoutError' || err?.name === 'AbortError'
            ? 'Dịch vụ AI phản hồi quá chậm. Vui lòng thử lại.'
            : 'Không thể kết nối với dịch vụ AI. Vui lòng thử lại.',
          503,
        );
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
        }
      }
    }
  }

  throw lastError || new Error('Không thể kết nối với dịch vụ AI. Vui lòng thử lại sau giây lát.');
}

/**
 * Xử lý yêu cầu POST /api/generate
 */
export async function handleGenerateRequest(body: GenerateRequestBody): Promise<GenerateResponseBody> {
  const { prompt, context } = body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new AiServerError('Câu lệnh prompt không được để trống.', 400);
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new AiServerError('Máy chủ chưa cấu hình GEMINI_API_KEY cho môi trường deployment.', 503);
  }

  const startTime = performance.now();

  const userParts: { text: string }[] = [];
  if (context && context.trim()) {
    userParts.push({ text: `[DỮ LIỆU ĐẦU VÀO / NGỮ CẢNH CỐ ĐỊNH]:\n${context.trim()}\n\n---\n[CÂU LỆNH YÊU CẦU CỦA NGƯỜI DÙNG]:\n${prompt.trim()}` });
  } else {
    userParts.push({ text: prompt.trim() });
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: userParts
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: 'Bạn là trợ lý AI chuyên nghiệp hỗ trợ cán bộ ngân hàng và doanh nghiệp. Hãy thực hiện chính xác, súc tích và đúng trọng tâm yêu cầu được đưa ra trong câu lệnh của người dùng.'
        }
      ]
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    }
  };

  const { data, model: usedModel } = await callGeminiWithFallback(apiKey, payload);
  const candidate = data.candidates?.[0];
  const outputText = candidate?.content?.parts?.[0]?.text;

  if (!outputText) {
    throw new Error('Mô hình không trả về nội dung hợp lệ.');
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const tokens = data.usageMetadata?.totalTokenCount || Math.ceil(outputText.length / 4);

  return {
    output: outputText,
    model: usedModel,
    latencyMs,
    tokens
  };
}

/**
 * Xử lý yêu cầu POST /api/evaluate
 * Đánh giá khách quan câu lệnh và kết quả AI sinh ra dựa trên 5 tiêu chí Rubric MVP (0-2 điểm mỗi tiêu chí)
 */
export async function handleEvaluateRequest(body: EvaluateRequestBody): Promise<AiEvaluationResult> {
  const {
    scenario,
    controlData,
    taskRequirement,
    lessonRubric,
    learnerPrompt,
    generatedOutput
  } = body;

  if (!learnerPrompt || !learnerPrompt.trim()) {
    throw new AiServerError('Learner prompt không được để trống khi đánh giá.', 400);
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new AiServerError('Máy chủ chưa cấu hình GEMINI_API_KEY cho AI Evaluation.', 503);
  }

  const model = getGeminiModel();

  const rubricDescription = lessonRubric 
    ? typeof lessonRubric === 'string' ? lessonRubric : JSON.stringify(lessonRubric, null, 2)
    : 'Yêu cầu chuẩn: Đúng vai trò, bám sát dữ liệu đầu vào, xuất bảng hoặc định dạng chuẩn, không đàm thoại lan man.';

  const evaluationPrompt = `Bạn là AI Judge. Chấm learner prompt và AI output theo đúng bài tập.
Mỗi tiêu chí là số nguyên 0–2: taskCompletion, groundedness, formatAdherence, constraintCompliance, businessUsability.
0 = không đạt; 1 = đạt một phần; 2 = đạt đầy đủ. Không trả chain-of-thought.

SCENARIO: ${scenario || 'Không có'}
CONTROL DATA: ${controlData || 'Không có'}
TASK: ${taskRequirement || 'Không có'}
LESSON RUBRIC: ${rubricDescription}
LEARNER PROMPT: ${learnerPrompt}
AI OUTPUT: ${generatedOutput || '(Không có output)'}

Chỉ trả JSON hợp lệ, không markdown:
{"scores":{"taskCompletion":0,"groundedness":0,"formatAdherence":0,"constraintCompliance":0,"businessUsability":0},"strengths":["1–3 ý ngắn"],"improvements":["1–3 ý ngắn"],"nextHint":"một hành động cụ thể"}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: evaluationPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1, // Thấp để đảm bảo tính khách quan và nhất quán
      maxOutputTokens: 600, // Tối ưu token để phản hồi dưới 1 giây
      responseMimeType: 'application/json',
      thinkingConfig: {
        thinkingBudget: 0,
      },
    }
  };

  const openAiApiKey = getOpenAiApiKey();
  let rawText: string;
  if (openAiApiKey) {
    rawText = await callOpenAiJudge(openAiApiKey, evaluationPrompt);
  } else {
    const { data } = await callGeminiWithFallback(apiKey, payload, { allowJudgeGemmaFallback: true });
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  }

  try {
    const parsed = parseJsonSafely(rawText);

    const clamp = (val: any) => {
      const num = Number(val);
      if (isNaN(num)) return 1;
      return Math.max(0, Math.min(2, Math.round(num)));
    };

    const taskCompletion = clamp(parsed.scores?.taskCompletion);
    const groundedness = clamp(parsed.scores?.groundedness);
    const formatAdherence = clamp(parsed.scores?.formatAdherence);
    const constraintCompliance = clamp(parsed.scores?.constraintCompliance);
    const businessUsability = clamp(parsed.scores?.businessUsability);

    const total = taskCompletion + groundedness + formatAdherence + constraintCompliance + businessUsability;

    const evaluationResult: AiEvaluationResult = {
      scores: {
        taskCompletion,
        groundedness,
        formatAdherence,
        constraintCompliance,
        businessUsability
      },
      total,
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 
        ? parsed.strengths.slice(0, 3) 
        : ['Đã thể hiện được nỗ lực chỉ dẫn mô hình thực hiện công việc.'],
      improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0 
        ? parsed.improvements.slice(0, 3) 
        : ['Nên bổ sung thêm các ràng buộc tiêu cực và yêu cầu định dạng bảng cụ thể.'],
      nextHint: typeof parsed.nextHint === 'string' && parsed.nextHint.trim() 
        ? parsed.nextHint.trim() 
        : 'Hãy thử thêm vai trò chuyên gia cụ thể và yêu cầu cấu trúc bảng rõ ràng ở lần thử tiếp theo.'
    };

    return evaluationResult;
  } catch (parseErr) {
    console.error('Lỗi phân tích JSON từ AI Judge.');
    throw parseErr instanceof AiServerError
      ? parseErr
      : new AiServerError('Không thể phân tích kết quả AI Judge. Vui lòng thử lại.', 502);
  }
}
