import assert from 'node:assert/strict';
import {
  DEFAULT_RUBRIC,
  validateWeightedEvaluation,
} from '../src/services/weightedRubricService';

// Base helper to construct a valid evaluation payload
function createValidPayload(criterionOverrides: Array<{ key: string; score: number; reason?: string }>) {
  return {
    contract: 'weighted-v1',
    total: 0,
    criteria: criterionOverrides.map((c) => ({
      key: c.key,
      score: c.score,
      reason: c.reason ?? `Evaluation for ${c.key}`,
    })),
    strengths: ['Clear structure and concise responses'],
    improvements: ['Include deeper context citations'],
    nextHint: 'Review SOP section 3.2 for further guidance.',
  };
}

// 1. Acceptance: Valid all-zero criterion evaluation totals zero
{
  const allZeroPayload = createValidPayload(
    DEFAULT_RUBRIC.map((c) => ({ key: c.key, score: 0 }))
  );
  const result = validateWeightedEvaluation(allZeroPayload, DEFAULT_RUBRIC);
  assert.equal(result.total, 0, 'Total score should be exactly 0 when all criterion scores are 0');
  for (const criterion of result.criteria) {
    assert.equal(criterion.score, 0, `Criterion ${criterion.key} score should be 0`);
  }
}

// 2. Acceptance: Supplied top-level total of 10 cannot override criterion sum zero
{
  const payloadWithMismatchedTotal = {
    ...createValidPayload(DEFAULT_RUBRIC.map((c) => ({ key: c.key, score: 0 }))),
    total: 10,
  };
  const result = validateWeightedEvaluation(payloadWithMismatchedTotal, DEFAULT_RUBRIC);
  assert.equal(
    result.total,
    0,
    'Top-level supplied total (10) must be ignored and recomputed from criterion scores (0)'
  );
}

// 3. Acceptance: Negative, NaN and Infinity scores reject
{
  const testInvalidScores = [-1, -0.01, NaN, Infinity, -Infinity];

  for (const invalidScore of testInvalidScores) {
    const invalidPayload = createValidPayload(
      DEFAULT_RUBRIC.map((c, idx) => ({
        key: c.key,
        score: idx === 0 ? invalidScore : 0,
      }))
    );

    assert.throws(
      () => validateWeightedEvaluation(invalidPayload, DEFAULT_RUBRIC),
      {
        name: 'Error',
        message: 'Judge criterion score is invalid.',
      },
      `Should reject score: ${invalidScore}`
    );
  }
}

// 4. Acceptance: Missing criterion rejects
{
  // Missing one criterion entirely (only 4 criteria provided instead of 5)
  const missingOneCriterionPayload = createValidPayload(
    DEFAULT_RUBRIC.slice(0, 4).map((c) => ({ key: c.key, score: 0 }))
  );

  assert.throws(
    () => validateWeightedEvaluation(missingOneCriterionPayload, DEFAULT_RUBRIC),
    {
      name: 'Error',
      message: 'Judge criteria do not match the saved rubric.',
    },
    'Should reject when a criterion is missing from the payload'
  );
}
