import assert from 'node:assert/strict';
import { productText, productErrorText, getProductLanguage, setProductLanguage } from '../src/services/productI18nService';
import { DEFAULT_RUBRIC, validateRubric, validateWeightedEvaluation, rebalanceRubric } from '../src/services/weightedRubricService';

assert.equal(productText('save', 'en'), 'Save');
assert.equal(productText('save', 'vi'), 'Lưu');
for (const status of [0, 400, 401, 403, 409, 422, 429, 500, 502, 503, 504]) {
  assert.notEqual(productErrorText(status, 'en'), productErrorText(status, 'vi'));
}
setProductLanguage('en'); assert.equal(getProductLanguage(), 'en'); assert.equal(productText('saving'), 'Saving…');
setProductLanguage('vi'); assert.equal(productText('saving'), 'Đang lưu…');
assert.equal(validateRubric(DEFAULT_RUBRIC).length, 5);
for (const weight of [0, 1, 30, 99, 100]) {
  assert.equal(rebalanceRubric(DEFAULT_RUBRIC, 'groundedness', weight).reduce((sum, c) => sum + c.weight, 0), 100);
}
const payload = { criteria: DEFAULT_RUBRIC.map(c => ({key: c.key, score: c.weight / 20, reason: 'Canonical evidence'})), total: 10, strengths: [], improvements: [], nextHint: 'Revise source citations.' };
assert.equal(validateWeightedEvaluation(payload, DEFAULT_RUBRIC).total, 5, 'Recompute score; reject model total as authority');
assert.throws(() => validateWeightedEvaluation({...payload, criteria: [...payload.criteria.slice(1), payload.criteria[1]]}, DEFAULT_RUBRIC));
assert.throws(() => validateWeightedEvaluation({...payload, criteria: payload.criteria.map(c => ({...c, score: 99}))}, DEFAULT_RUBRIC));
assert.throws(() => validateRubric(DEFAULT_RUBRIC.map(c => ({...c, weight: 20, active: false}))));
console.log('EN/VI error coverage, shared language selection and weighted rubric integrity passed. No live AI or database calls.');
