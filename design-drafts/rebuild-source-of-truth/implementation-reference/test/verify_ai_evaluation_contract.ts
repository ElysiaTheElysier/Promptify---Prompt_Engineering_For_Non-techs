import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  AiEvaluationValidationError,
  parseAiEvaluationText,
  validateAiEvaluationPayload,
} from '../src/services/aiEvaluationContract';
import { mapAiEvaluationToRubricAudit } from '../src/services/llmService';

const validPayload = {
  scores: {
    taskCompletion: 2,
    groundedness: 1,
    formatAdherence: 2,
    constraintCompliance: 1,
    businessUsability: 2,
  },
  strengths: ['Rõ nhiệm vụ'],
  improvements: ['Làm rõ thêm căn cứ'],
  nextHint: 'Bổ sung nguồn dữ liệu.',
};

const valid = validateAiEvaluationPayload(validPayload);
assert.equal(valid.total, 8);
assert.deepEqual(Object.values(valid.scores), [2, 1, 2, 1, 2]);
assert.equal(mapAiEvaluationToRubricAudit(valid).totalScore, 80);
assert.deepEqual(JSON.parse(JSON.stringify(valid)), { total: 8, ...validPayload });

assert.throws(
  () => validateAiEvaluationPayload({ strengths: [], improvements: [], nextHint: 'Retry' }),
  AiEvaluationValidationError,
);
assert.throws(
  () => validateAiEvaluationPayload({ ...validPayload, scores: { ...validPayload.scores, groundedness: '1' } }),
  AiEvaluationValidationError,
);
assert.throws(
  () => validateAiEvaluationPayload({ ...validPayload, scores: { ...validPayload.scores, groundedness: 3 } }),
  AiEvaluationValidationError,
);
assert.throws(() => parseAiEvaluationText('{malformed'), AiEvaluationValidationError);

const actualZero = validateAiEvaluationPayload({
  ...validPayload,
  scores: {
    taskCompletion: 0,
    groundedness: 0,
    formatAdherence: 0,
    constraintCompliance: 0,
    businessUsability: 0,
  },
});
assert.equal(actualZero.total, 0, 'A valid all-zero evaluation must remain a real 0/10');

const serverSource = await readFile('src/services/apiServerService.ts', 'utf8');
assert.ok(serverSource.includes("type: 'json_schema'"));
assert.ok(serverSource.includes('strict: true'));
assert.ok(!serverSource.includes('const clamp ='));
assert.ok(!serverSource.includes("['Đã thể hiện được nỗ lực"));

const hybridSource = await readFile('src/components/hybrid/HybridView.tsx', 'utf8');
assert.ok(hybridSource.includes('AI chưa thể đánh giá lần này.'));
assert.ok(hybridSource.includes('Thử chấm lại'));
assert.ok(hybridSource.includes('evaluation_json: evalResult'));
assert.ok(!hybridSource.includes('evalResult = evaluatePromptRubric'));

console.log('Strict AI evaluation contract, real zero, failure state, retry, and persistence verification passed.');
