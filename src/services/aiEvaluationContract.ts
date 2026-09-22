import type { AiEvaluationResult, AiRubricScores } from '../types/database';

const SCORE_KEYS: Array<keyof AiRubricScores> = [
  'taskCompletion',
  'groundedness',
  'formatAdherence',
  'constraintCompliance',
  'businessUsability',
];

export class AiEvaluationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiEvaluationValidationError';
  }
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new AiEvaluationValidationError(`${field} phải là một mảng chuỗi.`);
  }
  return value;
}

export function validateAiEvaluationPayload(payload: unknown): AiEvaluationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AiEvaluationValidationError('Evaluation phải là một JSON object.');
  }

  const candidate = payload as Record<string, unknown>;
  if (!candidate.scores || typeof candidate.scores !== 'object' || Array.isArray(candidate.scores)) {
    throw new AiEvaluationValidationError('Evaluation thiếu scores hợp lệ.');
  }

  const rawScores = candidate.scores as Record<string, unknown>;
  const scores = {} as AiRubricScores;
  for (const key of SCORE_KEYS) {
    const value = rawScores[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 2) {
      throw new AiEvaluationValidationError(`scores.${key} phải là số nguyên từ 0 đến 2.`);
    }
    scores[key] = value;
  }

  const nextHint = candidate.nextHint;
  if (typeof nextHint !== 'string' || !nextHint.trim()) {
    throw new AiEvaluationValidationError('nextHint phải là chuỗi không rỗng.');
  }

  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0);
  return {
    total,
    scores,
    strengths: requireStringArray(candidate.strengths, 'strengths'),
    improvements: requireStringArray(candidate.improvements, 'improvements'),
    nextHint: nextHint.trim(),
  };
}

export function parseAiEvaluationText(rawText: string): AiEvaluationResult {
  let cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx > startIdx) cleaned = cleaned.slice(startIdx, endIdx + 1);

  // Xóa trailing comma trước dấu đóng object/array (lỗi phổ biến khi LLM sinh JSON)
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  try {
    return validateAiEvaluationPayload(JSON.parse(cleaned));
  } catch (error) {
    if (error instanceof AiEvaluationValidationError) throw error;
    throw new AiEvaluationValidationError('AI Judge trả về JSON không hợp lệ.');
  }
}
