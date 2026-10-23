import type { AiEvaluationResult } from '../types/database.js';
import { AiEvaluationValidationError, parseAiEvaluationText } from './aiEvaluationContract.js';

export interface GenerateRequestBody {
  lessonId?: string;
  classId?: string;
  prompt: string;
  systemInstruction?: string;
  inputContext?: string;
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
      text: {
        format: {
          type: 'json_schema',
          name: 'prompt_evaluation',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['scores', 'strengths', 'improvements', 'nextHint'],
            properties: {
              scores: {
                type: 'object',
                additionalProperties: false,
                required: ['taskCompletion', 'groundedness', 'formatAdherence', 'constraintCompliance', 'businessUsability'],
                properties: {
                  taskCompletion: { type: 'integer', minimum: 0, maximum: 2 },
                  groundedness: { type: 'integer', minimum: 0, maximum: 2 },
                  formatAdherence: { type: 'integer', minimum: 0, maximum: 2 },
                  constraintCompliance: { type: 'integer', minimum: 0, maximum: 2 },
                  businessUsability: { type: 'integer', minimum: 0, maximum: 2 },
                },
              },
              strengths: { type: 'array', items: { type: 'string' }, maxItems: 3 },
              improvements: { type: 'array', items: { type: 'string' }, maxItems: 3 },
              nextHint: { type: 'string' },
            },
          },
        },
      },
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

async function callOpenAiGenerate(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
): Promise<{ output: string; model: string; tokens?: number }> {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const instructions = systemInstruction?.trim()
    || 'Bạn là trợ lý AI chuyên nghiệp. Chỉ thực hiện yêu cầu người dùng cung cấp; không tự suy diễn dữ kiện hoặc âm thầm hoàn thành một bài tập không có trong prompt.';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions,
      input: prompt.trim(),
      max_output_tokens: 2048,
      store: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    console.error(`[OpenAI Generate] HTTP ${response.status}.`);
    throw new AiServerError(
      response.status === 401 || response.status === 403
        ? 'OPENAI_API_KEY trên máy chủ không hợp lệ hoặc không có quyền dùng model đã cấu hình.'
        : response.status === 429
          ? 'OpenAI đang vượt giới hạn sử dụng. Vui lòng thử lại.'
          : 'OpenAI tạm thời không khả dụng. Vui lòng thử lại.',
      response.status === 429 ? 503 : 502,
    );
  }

  const data = await response.json() as any;
  const output = data.output_text
    || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
  if (!output) throw new AiServerError('OpenAI không trả về nội dung hợp lệ.', 502);
  return { output, model, tokens: data.usage?.total_tokens };
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
    ? ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3-flash-preview', 'gemma-4-26b-a4b-it']
    : [getGeminiModel(), 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'];
  // Loại bỏ model trùng lặp
  const models = Array.from(new Set(candidateModels.filter(Boolean)));
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const supportsThinking = model.startsWith('gemini-2.5') || model.startsWith('gemini-3');
        const supportsJsonSchema = !model.startsWith('gemma-');
        const modelPayload = {
          ...payload,
          generationConfig: payload.generationConfig
            ? Object.fromEntries(Object.entries(payload.generationConfig).filter(([key]) => {
                if (key === 'thinkingConfig') return supportsThinking;
                if (key === 'responseSchema' || key === 'responseMimeType') return supportsJsonSchema;
                return true;
              }))
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
            const isLeaked = response.status === 403 && upstreamMessage?.toLowerCase().includes('leaked');
            lastError = new AiServerError(
              response.status === 400
                ? `Gemini từ chối request${upstreamMessage ? `: ${upstreamMessage}` : '.'}`
                : isLeaked
                  ? 'API Key của bạn đã bị vô hiệu hóa do Google phát hiện rò rỉ (leaked key). Vui lòng cập nhật API Key mới trong Cài đặt.'
                  : response.status === 401 || response.status === 403
                    ? `GEMINI_API_KEY không hợp lệ hoặc bị từ chối (${upstreamMessage || 'Permission Denied'}).`
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
  const { prompt, systemInstruction, inputContext } = body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new AiServerError('Câu lệnh prompt không được để trống.', 400);
  }

  const openAiApiKey = getOpenAiApiKey();
  const geminiApiKey = getGeminiApiKey();

  const startTime = performance.now();

  // Tách biệt rõ ràng bối cảnh dữ liệu bài tập và câu lệnh do người học viết
  const composedUserContent = inputContext?.trim()
    ? `CONTEXT / INPUT DATA:\n${inputContext.trim()}\n\nUSER PROMPT:\n${prompt.trim()}`
    : prompt.trim();

  // 1. Sử dụng OpenAI nếu có OpenAI key
  if (openAiApiKey) {
    const result = await callOpenAiGenerate(openAiApiKey, composedUserContent, systemInstruction);
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      output: result.output,
      model: result.model,
      latencyMs,
      tokens: result.tokens || Math.ceil(result.output.length / 4),
    };
  }

  // 2. Sử dụng Google Gemini nếu có Gemini key
  if (geminiApiKey) {
    const userParts: { text: string }[] = [{ text: composedUserContent }];

    const payload = {
      contents: [{ role: 'user', parts: userParts }],
      systemInstruction: {
        parts: [{ text: systemInstruction?.trim() || 'Bạn là trợ lý AI chuyên nghiệp. Chỉ thực hiện yêu cầu người dùng cung cấp; không tự suy diễn dữ kiện hoặc âm thầm hoàn thành một bài tập không có trong prompt.' }]
      },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    };

    const { data, model: usedModel } = await callGeminiWithFallback(geminiApiKey, payload);
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

  throw new AiServerError('Máy chủ chưa cấu hình OPENAI_API_KEY hoặc GEMINI_API_KEY cho môi trường deployment.', 503);
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

  const openAiApiKey = getOpenAiApiKey();
  const geminiApiKey = getGeminiApiKey();

  if (!openAiApiKey && !geminiApiKey) {
    throw new AiServerError(
      'Chưa cấu hình API_KEY trên máy chủ. Vui lòng thiết lập biến môi trường OPENAI_API_KEY hoặc GEMINI_API_KEY để thực hiện AI Evaluation.',
      503
    );
  }

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

Chỉ trả JSON theo schema đã yêu cầu. Không markdown, không thêm trường và không dùng điểm mặc định.`;

  let rawText: string;
  if (openAiApiKey) {
    rawText = await callOpenAiJudge(openAiApiKey, evaluationPrompt);
  } else {
    const payload = {
      contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 0,
        },
        responseSchema: {
          type: 'OBJECT',
          properties: {
            scores: {
              type: 'OBJECT',
              properties: {
                taskCompletion: { type: 'INTEGER' },
                groundedness: { type: 'INTEGER' },
                formatAdherence: { type: 'INTEGER' },
                constraintCompliance: { type: 'INTEGER' },
                businessUsability: { type: 'INTEGER' }
              },
              required: ['taskCompletion', 'groundedness', 'formatAdherence', 'constraintCompliance', 'businessUsability']
            },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            improvements: { type: 'ARRAY', items: { type: 'STRING' } },
            nextHint: { type: 'STRING' }
          },
          required: ['scores', 'strengths', 'improvements', 'nextHint']
        }
      }
    };
    const { data } = await callGeminiWithFallback(geminiApiKey, payload, { allowJudgeGemmaFallback: true });
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts = parts.filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim());
    rawText = textParts.map((p: any) => p.text).join('\n') || (parts[parts.length - 1]?.text ?? '{}');
  }

  try {
    return parseAiEvaluationText(rawText);
  } catch (parseErr) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[AI Judge] Evaluation validation failed:', parseErr instanceof Error ? parseErr.message : 'Unknown validation error');
    }
    throw new AiServerError(
      parseErr instanceof AiEvaluationValidationError
        ? `AI Judge trả về evaluation không hợp lệ: ${parseErr.message}`
        : 'Không thể phân tích kết quả AI Judge. Vui lòng thử chấm lại.',
      502,
    );
  }
}
