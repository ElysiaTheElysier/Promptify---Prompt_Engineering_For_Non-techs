import assert from 'node:assert/strict';
import {
  assertCapacityEnvironment,
  buildCapacityCases,
  CAPACITY_MODEL,
  CAPACITY_TARGET,
  GENERATION_MAX_OUTPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
  MAX_CONCURRENT_PROVIDER_CALLS,
  MAX_PROVIDER_ATTEMPTS,
  runCapacityBatch,
} from '../scripts/staging_capacity_engine';
import { AiServerError } from '../src/services/apiServerService';
import { DEFAULT_RUBRIC } from '../src/services/weightedRubricService';

const cases = buildCapacityCases();
assert.equal(CAPACITY_TARGET, 100);
assert.equal(cases.length, 100);
assert.equal(new Set(cases.map(sample => sample.id)).size, 100);
assert.equal(cases[0].id, 'QA-001');
assert.equal(cases[99].id, 'QA-100');
assert.ok(cases.every(sample => /fictional/i.test(sample.prompt) && sample.controlData.includes('FICTIONAL QA RULES')));
assert.equal(GENERATION_MAX_OUTPUT_TOKENS, 4096);
assert.equal(MAX_PROVIDER_ATTEMPTS, 1300);
assert.equal(MAX_OUTPUT_TOKENS, 2_150_400);
assert.equal(MAX_CONCURRENT_PROVIDER_CALLS, 500);

const env: NodeJS.ProcessEnv = {
  CAPACITY_HARNESS_SCOPE: 'staging',
  CAPACITY_HARNESS_CONFIRM: 'RUN_100',
  GOOGLE_CLOUD_PROJECT: 'ai-transformation-510302',
  AI_PROVIDER: 'vertex',
  VERTEX_LOCATION: 'global',
  GEMINI_MODEL: CAPACITY_MODEL,
  JUDGE_STRATEGY: 'parallel-v1',
};
assert.doesNotThrow(() => assertCapacityEnvironment(env));
for (const invalid of [
  { ...env, CAPACITY_HARNESS_SCOPE: 'production' },
  { ...env, CAPACITY_HARNESS_CONFIRM: undefined },
  { ...env, GEMINI_MODEL: 'gemini-2.5-flash' },
  { ...env, JUDGE_STRATEGY: 'single' },
  { ...env, GEMINI_FALLBACK_MODEL: 'gemini-3.8-flash' },
  { ...env, GEMINI_API_KEY: 'must-not-exist' },
  { ...env, PGHOST: '/cloudsql/staging' },
]) assert.throws(() => assertCapacityEnvironment(invalid));

let active = { pipelines: 0, generation: 0, judging: 0 };
let peak = { pipelines: 0, generation: 0, judging: 0 };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const complete = await runCapacityBatch({
  cases,
  generate: async () => {
    active.generation++;
    peak.generation = Math.max(peak.generation, active.generation);
    await tick();
    active.generation--;
    return { output: 'Fictional status update.', model: CAPACITY_MODEL, tokens: 8 };
  },
  judge: async () => {
    active.judging++;
    peak.judging = Math.max(peak.judging, active.judging);
    await tick();
    active.judging--;
    return { total: 9, judge: { version: 'parallel-v1', taskAttempt: true, model: CAPACITY_MODEL, providerAttempts: 6, timedOutAttempts: 0, stages: [{ stage: 'supervisor', attempts: 1, tokens: 5 }, ...DEFAULT_RUBRIC.map(criterion => ({ stage: `criterion:${criterion.key}`, attempts: 1, tokens: 5 }))] } };
  },
});
assert.equal(complete.completed, 100);
assert.equal(complete.succeeded, 100);
assert.equal(complete.failed, 0);
assert.deepEqual(complete.activeHighWater, { pipelines: 100, generation: peak.generation, judging: peak.judging, providerCalls: 0 });
assert.equal(complete.generation.count, 100);
assert.equal(complete.judge.count, 100);
assert.equal(complete.pipeline.count, 100);
assert.equal(complete.provider.attemptsObserved, 700);
assert.equal(complete.provider.knownTokens, 3800);
assert.deepEqual(complete.provider.stageAttempts, { generation: 100, supervisor: 100, criteria: 500, unknown: 0 });
assert.deepEqual(complete.provider.models, [CAPACITY_MODEL]);
assert.equal(complete.scores.count, 100);
assert.equal(complete.scores.mean, 9);
assert.match(complete.scope, /not 100-user admission acceptance/i);
assert.equal(JSON.stringify(complete).includes(cases[0].prompt), false, 'summary must not contain prompts or generated output');
assert.deepEqual(complete.judgeOutcomes, { taskAttempt: 100, supervisorOnly: 0, completedCriteria: 500 });

// Exercise metadata-only Vertex response instrumentation. The response contains a private text
// canary that must never appear in the aggregate report.
const originalFetch = globalThis.fetch;
const privateCanary = 'PRIVATE_OUTPUT_CANARY_DO_NOT_LOG';
globalThis.fetch = async () => new Response(JSON.stringify({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: privateCanary }] } }],
  usageMetadata: { totalTokenCount: 13, promptTokenCount: 8, candidatesTokenCount: 5 },
}), { status: 200, headers: { 'content-type': 'application/json' } });
let telemetry: Awaited<ReturnType<typeof runCapacityBatch>>;
try {
  telemetry = await runCapacityBatch({
    cases,
    generate: async () => {
      await fetch('https://aiplatform.googleapis.com/v1/projects/staging/locations/global/publishers/google/models/gemini-3.8-flash:generateContent', { method: 'POST', body: JSON.stringify({ generationConfig: { maxOutputTokens: 4096 } }) });
      return { output: 'Fictional status update.', model: CAPACITY_MODEL };
    },
    judge: async () => {
      await fetch('https://aiplatform.googleapis.com/v1/projects/staging/locations/global/publishers/google/models/gemini-3.8-flash:generateContent', { method: 'POST', body: JSON.stringify({ generationConfig: { maxOutputTokens: 1024 } }) });
      for (let index = 0; index < DEFAULT_RUBRIC.length; index++) {
        await fetch('https://aiplatform.googleapis.com/v1/projects/staging/locations/global/publishers/google/models/gemini-3.8-flash:generateContent', { method: 'POST', body: JSON.stringify({ generationConfig: { maxOutputTokens: 1536 } }) });
      }
      return { total: 9, judge: { version: 'parallel-v1', taskAttempt: true, model: CAPACITY_MODEL, providerAttempts: 6, timedOutAttempts: 0, stages: [{ stage: 'supervisor', attempts: 1, tokens: 5 }, ...DEFAULT_RUBRIC.map(criterion => ({ stage: `criterion:${criterion.key}`, attempts: 1, tokens: 5 }))] } };
    },
  });
} finally {
  globalThis.fetch = originalFetch;
}
assert.equal(telemetry!.succeeded, 100);
assert.equal(telemetry!.provider.httpRequestsObserved, 700);
assert.equal(telemetry!.provider.knownTokens, 9_100);
assert.equal(telemetry!.provider.phases.generation.finishReasons.STOP, 100);
assert.equal(telemetry!.provider.phases.generation.totalTokens, 1_300);
assert.equal(telemetry!.provider.phases.judgeSupervisor.calls, 100);
assert.equal(telemetry!.provider.phases.judgeCriteria.calls, 500);
assert.equal(JSON.stringify(telemetry).includes(privateCanary), false, 'response text must not leak into the aggregate report');

const legacyJudge = await runCapacityBatch({
  cases,
  generate: async () => ({ output: 'Fictional status update.', model: CAPACITY_MODEL }),
  judge: async () => ({ total: 10 }),
});
assert.equal(legacyJudge.succeeded, 0, 'legacy single-call Judge metadata cannot count as parallel-engine evidence');
assert.equal(legacyJudge.failed, 100);
assert.equal(legacyJudge.errors.find(error => error.status === 502)?.count, 100);

// A provider 429 stops newly arriving Judge phases in the already-started wave.
let releaseRemaining!: () => void;
const waitRemaining = new Promise<void>(resolve => { releaseRemaining = resolve; });
let judgeCalls = 0;
const stopOn429 = runCapacityBatch({
  cases,
  generate: async input => {
    if (input.prompt.includes('QA-001')) return { output: 'Fictional status update.', model: CAPACITY_MODEL };
    await waitRemaining;
    return { output: 'Fictional status update.', model: CAPACITY_MODEL };
  },
  judge: async () => {
    judgeCalls++;
    console.warn(JSON.stringify({ event: 'parallel_judge_failure', providerAttempts: 1, timedOutAttempts: 0, stages: [{ stage: 'criterion:groundedness', attempts: 1, status: 429 }] }));
    throw new AiServerError('Provider capacity rejected the Judge request.', 429);
  },
});
await tick();
releaseRemaining();
const capacityRejected = await stopOn429;
assert.equal(judgeCalls, 1);
assert.equal(capacityRejected.completed, 100);
assert.equal(capacityRejected.succeeded, 0);
assert.equal(capacityRejected.provider.capacityRejected, true);
assert.equal(capacityRejected.provider.stoppedBeforeJudge, 99);
assert.equal(capacityRejected.provider.attemptsObserved, 101);
assert.deepEqual(capacityRejected.provider.stageAttempts, { generation: 100, supervisor: 0, criteria: 1, unknown: 0 });
assert.equal(capacityRejected.errors.find(error => error.status === 429)?.count, 100);

console.log('Staging capacity engine offline contract PASS: fixed 100-case scope, strict staging/ADC/no-DB preflight, hard request/token envelope, aggregate-only metrics, and Judge circuit stop on provider 429.');
