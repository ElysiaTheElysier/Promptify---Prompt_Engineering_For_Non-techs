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
        ? 'OPENAI_API_KEY on the server is invalid or unauthorized for the Judge model.'
        : response.status === 429
          ? 'OpenAI Judge rate limit exceeded. Please try again.'
          : 'OpenAI Judge service temporarily unavailable. Please try again.',
      response.status === 429 ? 503 : 502,
    );
  }

  const data = await response.json() as any;
  const outputText = data.output_text
    || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
  if (!outputText) throw new AiServerError('OpenAI Judge did not return a valid response.', 502);
  return outputText;
}

async function callOpenAiGenerate(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
): Promise<{ output: string; model: string; tokens?: number }> {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const instructions = systemInstruction?.trim()
    || 'You are a professional AI assistant. Only follow the user\'s explicit instructions; do not assume facts, extrapolate ungrounded details, or silently perform tasks not requested in the prompt. Respond in clear, professional English unless explicitly instructed otherwise.';
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
        ? 'OPENAI_API_KEY on the server is invalid or unauthorized for the configured model.'
        : response.status === 429
          ? 'OpenAI rate limit exceeded. Please try again in a few moments.'
          : 'OpenAI service is temporarily unavailable. Please try again.',
      response.status === 429 ? 503 : 502,
    );
  }

  const data = await response.json() as any;
  const output = data.output_text
    || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
  if (!output) throw new AiServerError('OpenAI did not return a valid response.', 502);
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
              ? 'The AI service rate limit has been exceeded. Please try again in a few moments.'
              : 'The AI service is temporarily overloaded. Please try again.',
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
                ? `Gemini rejected the request${upstreamMessage ? `: ${upstreamMessage}` : '.'}`
                : isLeaked
                  ? 'Your API Key was disabled because Google detected a leaked key. Please update your API Key.'
                  : response.status === 401 || response.status === 403
                    ? `GEMINI_API_KEY is invalid or rejected (${upstreamMessage || 'Permission Denied'}).`
                    : 'Unable to receive a valid response from the AI service.',
              response.status === 400 ? 400 : 502,
            );
          }
          break; // Không retry nếu là lỗi client
        }
      } catch (err: any) {
        lastError = new AiServerError(
          err?.name === 'TimeoutError' || err?.name === 'AbortError'
            ? 'AI service timed out. Please try again.'
            : 'Unable to connect to AI service. Please try again.',
          503,
        );
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
        }
      }
    }
  }

  throw lastError || new Error('Unable to connect to AI service. Please try again in a moment.');
}

/**
 * Xử lý yêu cầu POST /api/generate
 */
export async function handleGenerateRequest(body: GenerateRequestBody): Promise<GenerateResponseBody> {
  const { prompt, systemInstruction, inputContext } = body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new AiServerError('Prompt cannot be empty.', 400);
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
        parts: [{ text: systemInstruction?.trim() || 'You are a professional AI assistant. Only follow the user\'s explicit instructions; do not assume facts, extrapolate ungrounded details, or silently perform tasks not requested in the prompt. Respond in clear, professional English unless explicitly instructed otherwise.' }]
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
      throw new Error('The model did not return a valid response.');
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

  throw new AiServerError('Server is not configured with OPENAI_API_KEY or GEMINI_API_KEY.', 503);
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
    throw new AiServerError('Learner prompt cannot be empty for evaluation.', 400);
  }

  const openAiApiKey = getOpenAiApiKey();
  const geminiApiKey = getGeminiApiKey();

  if (!openAiApiKey && !geminiApiKey) {
    throw new AiServerError(
      'No AI API key configured on the server. Please set OPENAI_API_KEY or GEMINI_API_KEY.',
      503
    );
  }

  const rubricDescription = lessonRubric 
    ? typeof lessonRubric === 'string' ? lessonRubric : JSON.stringify(lessonRubric, null, 2)
    : 'Standard criteria: Role adherence, strictly grounded in source data, structured tabular or clean formatting, no conversational fluff.';

  const evaluationPrompt = `You are an expert AI Judge. Objectively evaluate the learner prompt and the resulting AI output according to the assignment requirements.
Each rubric dimension must be an integer from 0 to 2: taskCompletion, groundedness, formatAdherence, constraintCompliance, businessUsability.
Scale: 0 = not met; 1 = partially met; 2 = fully met. Do not output any chain-of-thought or reasoning text outside the JSON. All text in strengths, improvements, and nextHint MUST be written in clear, concise, professional business English.

SCENARIO: ${scenario || 'None'}
CONTROL DATA: ${controlData || 'None'}
TASK: ${taskRequirement || 'None'}
LESSON RUBRIC: ${rubricDescription}
LEARNER PROMPT: ${learnerPrompt}
AI OUTPUT: ${generatedOutput || '(No output provided)'}

Return ONLY valid JSON matching the exact schema. No markdown wrapping, no additional keys, and do not default to generic scores.`;

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
        ? `AI Judge returned an invalid evaluation: ${parseErr.message}`
        : 'Unable to parse AI Judge response. Please try evaluating again.',
      502,
    );
  }
}
