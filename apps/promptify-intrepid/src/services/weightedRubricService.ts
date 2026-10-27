import type { RubricCriterion, WeightedEvaluation } from '../types/production';

export const DEFAULT_RUBRIC: RubricCriterion[] = [
  { key: 'groundedness', label: 'Groundedness & SOP Citation', description: 'Use only authorized source facts and exact document citations.', weight: 30, active: true },
  { key: 'persona', label: 'Task & Role Persona', description: 'Complete the task using the requested business role.', weight: 20, active: true },
  { key: 'format', label: 'Format Adherence', description: 'Follow the required Markdown table or specified output format.', weight: 20, active: true },
  { key: 'oneshot', label: 'One-Shot Pattern Compliance', description: 'Follow the configured example pattern.', weight: 15, active: true },
  { key: 'actionability', label: 'Business Actionability & SLA Window', description: 'Provide the authorized business action and applicable SLA.', weight: 15, active: true },
];
/** Temporary bound on Judge fan-out: each active criterion is one provider call. Mirrored in SQL 021. */
export const RUBRIC_MAX_CRITERIA = 8;
/** parallel-v1 grades at most this many criteria at once; a larger rubric runs in extra rounds. */
export const JUDGE_WORKER_CONCURRENCY = 5;
/** Lowercase letters and _ only: Judge stage rows are named 'criterion:<key>' and 020 checks '^[a-z]+(:[a-z_]+)?$'. */
export const RUBRIC_KEY_PATTERN = /^[a-z][a-z_]{1,39}$/;
export function validateRubric(criteria: RubricCriterion[]): RubricCriterion[] {
  if (!Array.isArray(criteria) || criteria.length < 1 || criteria.length > RUBRIC_MAX_CRITERIA || criteria.some(c=>!c||typeof c!=='object')) throw new Error(`A rubric needs 1-${RUBRIC_MAX_CRITERIA} criteria.`);
  if (new Set(criteria.map(c => c.key)).size !== criteria.length) throw new Error('Rubric criterion keys must be unique.');
  if (criteria.some(c => typeof c.key!=='string' || !RUBRIC_KEY_PATTERN.test(c.key) || typeof c.label!=='string' || !c.label.trim() || c.label.length>200 || typeof c.description!=='string' || c.description.length>4000 || typeof c.active!=='boolean' || !Number.isFinite(c.weight) || c.weight < 0 || c.weight > 100 || !c.active && c.weight !== 0)) throw new Error('Invalid rubric criterion.');
  if (Math.abs(criteria.reduce((sum, c) => sum + c.weight, 0) - 100) > 0.001) throw new Error('Active rubric weights must total 100%.');
  return criteria;
}
/** New criterion key that satisfies RUBRIC_KEY_PATTERN and is unique within the rubric. */
export function newCriterionKey(criteria: RubricCriterion[]): string {
  for (;;) {
    const key = 'c_' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => String.fromCharCode(97 + b % 26)).join('');
    if (!criteria.some(c => c.key === key)) return key;
  }
}
/** Scales active weights to whole percentages summing to 100 (after add/remove/toggle); inactive weights become 0. */
export function normalizeRubric(criteria: RubricCriterion[]): RubricCriterion[] {
  const next = criteria.map(c => ({ ...c, weight: c.active ? c.weight : 0 }));
  const active = next.filter(c => c.active);
  if (!active.length) return next;
  const sum = active.reduce((total, c) => total + c.weight, 0);
  let remaining = 100;
  active.forEach((c, i) => { c.weight = i === active.length - 1 ? remaining : Math.min(remaining, Math.round(sum ? c.weight / sum * 100 : 100 / active.length)); remaining -= c.weight; });
  return next;
}
export function validateWeightedEvaluation(payload: unknown, rubric: RubricCriterion[]): WeightedEvaluation {
  validateRubric(rubric);
  const data = payload as any;
  if (!data || !Array.isArray(data.criteria)) throw new Error('Judge returned no criterion scores.');
  const active = rubric.filter(c => c.active && c.weight > 0);
  if (data.criteria.length !== active.length || new Set(data.criteria.map((c: any) => c.key)).size !== active.length) throw new Error('Judge criteria do not match the saved rubric.');
  const criteria = active.map(c => {
    const result = data.criteria.find((r: any) => r.key === c.key);
    const max = c.weight / 10;
    if (!result || typeof result.score !== 'number' || !Number.isFinite(result.score) || result.score < 0 || result.score > max || typeof result.reason !== 'string') throw new Error('Judge criterion score is invalid.');
    return { ...c, score: Math.round(result.score * 100) / 100, max, reason: result.reason };
  });
  for (const field of ['strengths', 'improvements']) if (!Array.isArray(data[field]) || data[field].some((s: unknown) => typeof s !== 'string')) throw new Error('Judge feedback is invalid.');
  if (typeof data.nextHint !== 'string' || !data.nextHint.trim()) throw new Error('Judge revision hint is missing.');
  return { contract: 'weighted-v1', total: Math.round(criteria.reduce((sum, c) => sum + c.score, 0) * 100) / 100, criteria, strengths: data.strengths, improvements: data.improvements, nextHint: data.nextHint };
}
export function rebalanceRubric(criteria: RubricCriterion[], changedKey: string, weight: number): RubricCriterion[] {
  const next = criteria.map(c => ({ ...c }));
  const changed = next.find(c => c.key === changedKey);
  if (!changed?.active) return next;
  const others = next.filter(c => c.active && c.key !== changedKey);
  changed.weight = others.length ? Math.max(0, Math.min(100, Math.round(weight))) : 100;
  const target = 100 - changed.weight, previous = others.reduce((sum, c) => sum + c.weight, 0);
  let remaining = target;
  others.forEach((c, i) => { c.weight = i === others.length - 1 ? remaining : Math.min(remaining, Math.round(previous ? c.weight / previous * target : target / others.length)); remaining -= c.weight; });
  next.filter(c => !c.active).forEach(c => c.weight = 0);
  return next;
}
