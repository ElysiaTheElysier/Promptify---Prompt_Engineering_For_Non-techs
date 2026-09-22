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

function sanitizeJsonString(jsonStr: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        result += ch;
        isEscaped = false;
      } else if (ch === '\\') {
        result += ch;
        isEscaped = true;
      } else if (ch === '"') {
        result += ch;
        inString = false;
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }

  return result;
}

function extractEvaluationFallback(text: string): AiEvaluationResult {
  const scores: Partial<AiRubricScores> = {};

  for (const key of SCORE_KEYS) {
    const regex = new RegExp(`"${key}"\\s*:\\s*([0-2])\\b`, 'i');
    const match = text.match(regex);
    if (!match) {
      throw new AiEvaluationValidationError('AI Judge trả về JSON không hợp lệ.');
    }
    scores[key] = parseInt(match[1], 10);
  }

  const validScores = scores as AiRubricScores;
  const total = SCORE_KEYS.reduce((sum, key) => sum + validScores[key], 0);

  // Trích xuất strengths
  const strengths: string[] = [];
  const strengthsMatch = text.match(/"strengths"\s*:\s*\[([\s\S]*?)\]/);
  if (strengthsMatch) {
    const rawItems = strengthsMatch[1].match(/"([^"]+)"/g);
    if (rawItems) {
      for (const item of rawItems) {
        const cleaned = item.slice(1, -1).trim();
        if (cleaned) strengths.push(cleaned);
      }
    }
  }
  if (strengths.length === 0) {
    strengths.push('Đã nắm được cấu trúc nhiệm vụ ban đầu.');
  }

  // Trích xuất improvements
  const improvements: string[] = [];
  const improvementsMatch = text.match(/"improvements"\s*:\s*\[([\s\S]*?)\]/);
  if (improvementsMatch) {
    const rawItems = improvementsMatch[1].match(/"([^"]+)"/g);
    if (rawItems) {
      for (const item of rawItems) {
        const cleaned = item.slice(1, -1).trim();
        if (cleaned) improvements.push(cleaned);
      }
    }
  }
  if (improvements.length === 0) {
    improvements.push('Cần tiếp tục hoàn thiện theo yêu cầu bài học.');
  }

  // Trích xuất nextHint
  let nextHint = 'Rà soát lại câu lệnh và hoàn thiện thêm các chi tiết theo rubric.';
  const hintMatch = text.match(/"nextHint"\s*:\s*"([\s\S]*?)"(?:\s*[,}])/);
  if (hintMatch && hintMatch[1].trim()) {
    nextHint = hintMatch[1].trim();
  }

  return {
    total,
    scores: validScores,
    strengths,
    improvements,
    nextHint,
  };
}

export function parseAiEvaluationText(rawText: string): AiEvaluationResult {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  // Xóa trailing comma trước dấu đóng object/array
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  // Chuẩn hóa unescaped newlines/tabs trong string literals
  const sanitized = sanitizeJsonString(cleaned);

  try {
    return validateAiEvaluationPayload(JSON.parse(sanitized));
  } catch (error) {
    if (error instanceof AiEvaluationValidationError && error.message.includes('phải là số nguyên từ 0 đến 2')) {
      throw error;
    }
    // Cố gắng cứu vãn bằng fallback parser nếu JSON có lỗi cú pháp nhưng chứa đủ dữ liệu
    try {
      return extractEvaluationFallback(rawText);
    } catch {
      if (error instanceof AiEvaluationValidationError) throw error;
      throw new AiEvaluationValidationError('AI Judge trả về JSON không hợp lệ.');
    }
  }
}

