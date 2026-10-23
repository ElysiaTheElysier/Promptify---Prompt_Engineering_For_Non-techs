import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { productionEvaluate, productionGenerate } from '../src/services/productionAiService.js';
import { AiServerError } from '../src/services/apiServerService.js';
import { DEFAULT_RUBRIC } from '../src/services/weightedRubricService.js';

export const CAPACITY_TARGET = 100;
export const CAPACITY_MODEL = 'gemini-3.8-flash';
// Match DEFAULT_LEARNER_SETTINGS.maxOutputTokens; a smaller value can turn normal output into MAX_TOKENS failures.
export const GENERATION_MAX_OUTPUT_TOKENS = 4096;
export const MAX_PROVIDER_ATTEMPTS_PER_PIPELINE = 13;
export const MAX_PROVIDER_ATTEMPTS = CAPACITY_TARGET * MAX_PROVIDER_ATTEMPTS_PER_PIPELINE;
export const MAX_OUTPUT_TOKENS_PER_PIPELINE = GENERATION_MAX_OUTPUT_TOKENS + 2 * (1024 + 5 * 1536);
export const MAX_OUTPUT_TOKENS = CAPACITY_TARGET * MAX_OUTPUT_TOKENS_PER_PIPELINE;
export const MAX_CONCURRENT_GENERATION_CALLS = CAPACITY_TARGET;
export const MAX_CONCURRENT_JUDGE_CALLS = CAPACITY_TARGET * 5;
// Every pipeline awaits generation before entering Judge, so the phases cannot stack per pipeline.
export const MAX_CONCURRENT_PROVIDER_CALLS = MAX_CONCURRENT_JUDGE_CALLS;

type CapacityCase = {
  id: string;
  prompt: string;
  scenario: string;
  taskRequirement: string;
  controlData: string;
};

type GenerateResult = { output: string; model: string; latencyMs?: number; tokens?: number };
type JudgeResult = {
  total: number;
  judge?: { version?: string; taskAttempt?: boolean; model?: string; providerAttempts?: number; timedOutAttempts?: number; stages?: Array<{ stage?: string; attempts?: number; tokens?: number }> };
};
type ProviderPhase = 'generation' | 'judgeSupervisor' | 'judgeCriteria' | 'unknown';
type PhaseMetadata = { calls: number; statuses: Record<string, number>; finishReasons: Record<string, number>; totalTokens: number; promptTokens: number; candidateTokens: number; callsMissingUsage: number; metadataErrors: number };
type PipelineOutcome = {
  ok: boolean;
  totalMs: number;
  generateMs?: number;
  judgeMs?: number;
  generationModel?: string;
  judgeModel?: string;
  score?: number;
  generationTokens?: number;
  judgeTokens?: number;
  judgeProviderAttempts?: number;
  judgeTimedOutAttempts?: number;
  failedPhase?: 'generation' | 'judge';
  status?: number;
  stoppedBeforeJudge?: boolean;
};
type LatencySummary = { count: number; p50: number | null; p95: number | null; p99: number | null; max: number | null };

function phaseMetadata(): PhaseMetadata {
  return { calls: 0, statuses: {}, finishReasons: {}, totalTokens: 0, promptTokens: 0, candidateTokens: 0, callsMissingUsage: 0, metadataErrors: 0 };
}

function phaseForRequest(init?: RequestInit): ProviderPhase {
  const body = typeof init?.body === 'string' ? init.body : '';
  const maxOutputTokens = Number(body.match(/"maxOutputTokens"\s*:\s*(\d+)/)?.[1]);
  if (maxOutputTokens === GENERATION_MAX_OUTPUT_TOKENS) return 'generation';
  if (maxOutputTokens === 1024) return 'judgeSupervisor';
  if (maxOutputTokens === 1536) return 'judgeCriteria';
  return 'unknown';
}

const scenario = 'Fictional delivery support ticket for internal load testing only.';
const taskRequirement = 'Write a concise delivery-status update. Use only the approved fictional service rules and state the update deadline.';
const approvedRules = 'FICTIONAL QA RULES: Acknowledge a delayed delivery within 15 minutes. Provide the next update within 2 business days. Never invent tracking events.';

export function buildCapacityCases(): CapacityCase[] {
  return Array.from({ length: CAPACITY_TARGET }, (_, index) => {
    const ordinal = String(index + 1).padStart(3, '0');
    return {
      id: `QA-${ordinal}`,
      prompt: `[Role]: Delivery support analyst. [Task]: For fictional ticket QA-${ordinal}, draft a delivery-status update using the approved rules. [Constraint]: Do not invent tracking events. [Format]: Two short sentences.`,
      scenario,
      taskRequirement,
      controlData: `${approvedRules}\nSynthetic ticket: QA-${ordinal}. Status: delayed. No tracking event is available.`,
    };
  });
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

function summarize(values: number[]): LatencySummary {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted.at(-1) ?? null,
  };
}

function errorStatus(error: unknown): number {
  if (error instanceof AiServerError) return error.statusCode;
  const status = Number((error as { statusCode?: unknown } | null)?.statusCode);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : 0;
}

export function assertCapacityEnvironment(env: NodeJS.ProcessEnv): void {
  const checks: Array<[boolean, string]> = [
    [env.CAPACITY_HARNESS_SCOPE === 'staging', 'CAPACITY_HARNESS_SCOPE must be staging'],
    [env.CAPACITY_HARNESS_CONFIRM === 'RUN_100', 'Explicit RUN_100 confirmation is required'],
    [env.GOOGLE_CLOUD_PROJECT === 'ai-transformation-510302', 'Unexpected Google Cloud project'],
    [env.AI_PROVIDER === 'vertex', 'AI_PROVIDER must use Vertex AI'],
    [env.VERTEX_LOCATION === 'global', 'VERTEX_LOCATION must be global'],
    [env.GEMINI_MODEL === CAPACITY_MODEL, 'GEMINI_MODEL must be gemini-3.8-flash'],
    [env.JUDGE_STRATEGY === 'parallel-v1', 'JUDGE_STRATEGY must be parallel-v1'],
    [!env.GEMINI_FALLBACK_MODEL, 'Fallback models are not permitted'],
    [!env.GEMINI_API_KEY && !env.GOOGLE_API_KEY, 'Provider API keys are not permitted; use runtime ADC'],
    [!env.DATABASE_URL && !env.PGHOST && !env.PGDATABASE && !env.PGUSER && !env.PGPASSWORD, 'Database connection environment must be absent'],
  ];
  const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
  if (failures.length) throw new Error(`Capacity harness preflight failed: ${failures.join('; ')}`);
}

export async function runCapacityBatch(options: {
  cases?: CapacityCase[];
  generate: (input: { prompt: string; inputContext: string; systemInstruction: string; settings: { temperature: number; topP: number; maxOutputTokens: number; stopSequences: string[]; searchGrounding: boolean; model: string } }) => Promise<GenerateResult>;
  judge: (input: { learnerPrompt: string; generatedOutput: string; scenario: string; taskRequirement: string; controlData: string; lessonRubric: typeof DEFAULT_RUBRIC; language: 'en' }) => Promise<JudgeResult>;
  now?: () => number;
}): Promise<{
  startedAt: string;
  wallMs: number;
  target: number;
  completed: number;
  succeeded: number;
  failed: number;
  generation: LatencySummary;
  judge: LatencySummary;
  pipeline: LatencySummary;
  activeHighWater: { pipelines: number; generation: number; judging: number; providerCalls: number };
  provider: { attemptsObserved: number; timedOutAttemptsObserved: number; failedJudgeEvents: number; httpRequestsObserved: number; knownTokens: number; stoppedBeforeJudge: number; capacityRejected: boolean; stageAttempts: { generation: number; supervisor: number; criteria: number; unknown: number }; phases: Record<ProviderPhase, PhaseMetadata>; models: string[] };
  judgeOutcomes: { taskAttempt: number; supervisorOnly: number; completedCriteria: number };
  errors: Array<{ phase: 'generation' | 'judge'; status: number; count: number }>;
  scores: { count: number; min: number | null; max: number | null; mean: number | null };
  scope: string;
}> {
  const cases = options.cases ?? buildCapacityCases();
  if (cases.length !== CAPACITY_TARGET) throw new Error(`Exactly ${CAPACITY_TARGET} fixed capacity cases are required.`);

  const startedAt = new Date().toISOString();
  const now = options.now ?? (() => performance.now());
  const wallStarted = now();
  const generationTimes: number[] = [];
  const judgeTimes: number[] = [];
  const pipelineTimes: number[] = [];
  const outcomes: PipelineOutcome[] = [];
  const scores: number[] = [];
  const models = new Set<string>();
  const errors = new Map<string, { phase: 'generation' | 'judge'; status: number; count: number }>();
  let activePipelines = 0, activeGeneration = 0, activeJudging = 0;
  const activeHighWater = { pipelines: 0, generation: 0, judging: 0 };
  let failedJudgeEvents = 0, failedJudgeAttempts = 0, failedJudgeTimeouts = 0;
  let providerCapacityRejected = false, stoppedBeforeJudge = 0;
  let activeProviderCalls = 0, providerCallHighWater = 0, http429Responses = 0;
  const phases: Record<ProviderPhase, PhaseMetadata> = {
    generation: phaseMetadata(), judgeSupervisor: phaseMetadata(), judgeCriteria: phaseMetadata(), unknown: phaseMetadata(),
  };
  const judgeOutcomes = { taskAttempt: 0, supervisorOnly: 0, completedCriteria: 0 };
  const stageAttempts = { generation: 0, supervisor: 0, criteria: 0, unknown: 0 };
  const countStageAttempt = (stage: unknown, attempts: unknown) => {
    const count = Math.max(0, Number(attempts) || 0);
    const name = String(stage || '');
    if (name === 'supervisor') stageAttempts.supervisor += count;
    else if (name.startsWith('criterion:')) stageAttempts.criteria += count;
    else stageAttempts.unknown += count;
  };

  const originalWarn = console.warn;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isModelRequest = /^https:\/\/aiplatform\.googleapis\.com\/v1\/projects\/[^/]+\/locations\/global\/publishers\/google\/models\/gemini-3\.8-flash:generateContent(?:\?|$)/.test(requestUrl);
    if (!isModelRequest) return originalFetch(input, init);
    const phase = phaseForRequest(init);
    const metadata = phases[phase];
    metadata.calls++;
    activeProviderCalls++;
    providerCallHighWater = Math.max(providerCallHighWater, activeProviderCalls);
    try {
      const response = await originalFetch(input, init);
      const status = String(response.status);
      metadata.statuses[status] = (metadata.statuses[status] || 0) + 1;
      if (response.status === 429) {
        http429Responses++;
        providerCapacityRejected = true;
      }
      try {
        // Parse only metadata from a clone. Never retain or emit candidate text, prompts, or source content.
        const data = await response.clone().json() as any;
        const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
        for (const candidate of candidates) {
          const reason = typeof candidate?.finishReason === 'string' ? candidate.finishReason : 'MISSING';
          metadata.finishReasons[reason] = (metadata.finishReasons[reason] || 0) + 1;
        }
        const usage = data?.usageMetadata;
        if (usage && Number.isFinite(Number(usage.totalTokenCount))) {
          metadata.totalTokens += Number(usage.totalTokenCount) || 0;
          metadata.promptTokens += Number(usage.promptTokenCount) || 0;
          metadata.candidateTokens += Number(usage.candidatesTokenCount) || 0;
        } else metadata.callsMissingUsage++;
      } catch {
        metadata.metadataErrors++;
        metadata.callsMissingUsage++;
      }
      return response;
    } catch (error) {
      metadata.statuses.NETWORK_ERROR = (metadata.statuses.NETWORK_ERROR || 0) + 1;
      metadata.callsMissingUsage++;
      throw error;
    } finally {
      activeProviderCalls--;
    }
  };
  console.warn = (...args: unknown[]) => {
    const message = args.find(value => typeof value === 'string');
    if (typeof message === 'string') {
      try {
        const data = JSON.parse(message);
        if (data?.event === 'parallel_judge_failure') {
          failedJudgeEvents++;
          failedJudgeAttempts += Number(data.providerAttempts) || 0;
          failedJudgeTimeouts += Number(data.timedOutAttempts) || 0;
          for (const stage of Array.isArray(data.stages) ? data.stages : []) countStageAttempt(stage?.stage, stage?.attempts);
          if (Array.isArray(data.stages) && data.stages.some((stage: any) => stage?.status === 429)) providerCapacityRejected = true;
          return;
        }
      } catch { /* Preserve unrelated warnings without parsing their content. */ }
    }
    originalWarn(...args);
  };

  try {
    await Promise.all(cases.map(async sample => {
      const pipelineStarted = now();
      let phase: 'generation' | 'judge' = 'generation';
      let generationMs: number | undefined, judgeMs: number | undefined;
      let stoppedForCapacity = false;
      let generationTokens = 0;
      activePipelines++;
      activeHighWater.pipelines = Math.max(activeHighWater.pipelines, activePipelines);
      try {
        activeGeneration++;
        activeHighWater.generation = Math.max(activeHighWater.generation, activeGeneration);
        const generationStarted = now();
        stageAttempts.generation++;
        let generated: GenerateResult;
        try {
          generated = await options.generate({
            prompt: sample.prompt,
            inputContext: sample.controlData,
            systemInstruction: 'Use only the approved fictional reference. Keep the answer concise and never invent delivery events.',
            settings: { temperature: 0, topP: 0.9, maxOutputTokens: GENERATION_MAX_OUTPUT_TOKENS, stopSequences: [], searchGrounding: false, model: CAPACITY_MODEL },
          });
        } finally {
          generationMs = Math.round(now() - generationStarted);
          generationTimes.push(generationMs);
          activeGeneration--;
        }
        generationTokens = Number(generated.tokens) || 0;
        if (generated.model !== CAPACITY_MODEL || typeof generated.output !== 'string' || !generated.output.trim()) throw new Error('Unexpected generation response contract.');
        models.add(generated.model);
        phase = 'judge';
        if (providerCapacityRejected) {
          stoppedBeforeJudge++;
          stoppedForCapacity = true;
          throw new AiServerError('New Judge phases stopped after a provider capacity rejection.', 429);
        }
        activeJudging++;
        activeHighWater.judging = Math.max(activeHighWater.judging, activeJudging);
        const judgeStarted = now();
        try {
          const evaluation = await options.judge({
            learnerPrompt: sample.prompt,
            generatedOutput: generated.output,
            scenario: sample.scenario,
            taskRequirement: sample.taskRequirement,
            controlData: sample.controlData,
            lessonRubric: DEFAULT_RUBRIC,
            language: 'en',
          });
          const stageNames = (evaluation.judge?.stages || []).map(stage => stage.stage);
          const criterionStages = DEFAULT_RUBRIC.map(criterion => `criterion:${criterion.key}`);
          const expectedStages = evaluation.judge?.taskAttempt ? ['supervisor', ...criterionStages] : ['supervisor'];
          const providerAttempts = Number(evaluation.judge?.providerAttempts);
          if (evaluation.judge?.version !== 'parallel-v1'
            || evaluation.judge.model !== CAPACITY_MODEL
            || !Number.isInteger(providerAttempts) || providerAttempts < expectedStages.length || providerAttempts > 12
            || stageNames.length !== expectedStages.length
            || expectedStages.some(stage => !stageNames.includes(stage))) {
            throw new AiServerError('Judge response did not prove the configured parallel Gemini engine contract.', 502);
          }
          if (evaluation.judge.taskAttempt) {
            judgeOutcomes.taskAttempt++;
            judgeOutcomes.completedCriteria += criterionStages.length;
          } else judgeOutcomes.supervisorOnly++;
          judgeMs = Math.round(now() - judgeStarted);
          judgeTimes.push(judgeMs);
          if (evaluation.judge?.model) models.add(evaluation.judge.model);
          scores.push(evaluation.total);
          const judgeTokens = (evaluation.judge?.stages || []).reduce((sum, stage) => sum + (Number(stage.tokens) || 0), 0);
          for (const stage of evaluation.judge?.stages || []) countStageAttempt(stage.stage, stage.attempts ?? 1);
          outcomes.push({ ok: true, totalMs: Math.round(now() - pipelineStarted), generateMs: generationMs, judgeMs, generationModel: generated.model, judgeModel: evaluation.judge.model, score: evaluation.total, generationTokens: Number(generated.tokens) || 0, judgeTokens, judgeProviderAttempts: providerAttempts, judgeTimedOutAttempts: Number(evaluation.judge.timedOutAttempts) || 0 });
        } finally {
          if (judgeMs === undefined) {
            judgeMs = Math.round(now() - judgeStarted);
            judgeTimes.push(judgeMs);
          }
          activeJudging--;
        }
      } catch (error) {
        const status = errorStatus(error);
        const key = `${phase}:${status}`;
        const existing = errors.get(key) || { phase, status, count: 0 };
        existing.count++;
        errors.set(key, existing);
        outcomes.push({ ok: false, totalMs: Math.round(now() - pipelineStarted), generateMs: generationMs, judgeMs, generationTokens, failedPhase: phase, status, stoppedBeforeJudge: stoppedForCapacity });
        if (status === 429) providerCapacityRejected = true;
      } finally {
        pipelineTimes.push(Math.round(now() - pipelineStarted));
        activePipelines--;
      }
    }));
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
  }

  const succeeded = outcomes.filter(outcome => outcome.ok).length;
  const responseTokenTotal = Object.values(phases).reduce((sum, phase) => sum + phase.totalTokens, 0);
  const generationTokenTotal = outcomes.reduce((sum, outcome) => sum + (outcome.generationTokens || 0), 0);
  const judgeTokenTotal = outcomes.reduce((sum, outcome) => sum + (outcome.judgeTokens || 0), 0);
  const successfulJudgeReportedAttempts = outcomes.reduce((sum, outcome) => sum + (outcome.judgeProviderAttempts || 0), 0);
  const successfulJudgeTimeouts = outcomes.reduce((sum, outcome) => sum + (outcome.judgeTimedOutAttempts || 0), 0);
  const failures = outcomes.length - succeeded;
  return {
    startedAt,
    wallMs: Math.round(now() - wallStarted),
    target: CAPACITY_TARGET,
    completed: outcomes.length,
    succeeded,
    failed: failures,
    generation: summarize(generationTimes),
    judge: summarize(judgeTimes),
    pipeline: summarize(pipelineTimes),
    activeHighWater: { ...activeHighWater, providerCalls: providerCallHighWater },
    provider: {
      attemptsObserved: CAPACITY_TARGET + successfulJudgeReportedAttempts + failedJudgeAttempts,
      timedOutAttemptsObserved: successfulJudgeTimeouts + failedJudgeTimeouts,
      failedJudgeEvents,
      http429Responses,
      httpRequestsObserved: Object.values(phases).reduce((sum, phase) => sum + phase.calls, 0),
      knownTokens: responseTokenTotal || generationTokenTotal + judgeTokenTotal,
      failedJudgeAggregatesWithUnknownUsage: failedJudgeEvents,
      failedGenerationCallsWithUnknownUsage: outcomes.filter(outcome => !outcome.ok && outcome.failedPhase === 'generation').length,
      stoppedBeforeJudge,
      capacityRejected: providerCapacityRejected,
      stageAttempts,
      phases,
      models: [...models].sort(),
    },
    judgeOutcomes,
    errors: [...errors.values()].sort((a, b) => a.phase.localeCompare(b.phase) || a.status - b.status),
    scores: { count: scores.length, min: scores.length ? Math.min(...scores) : null, max: scores.length ? Math.max(...scores) : null, mean: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null },
    scope: '100 logical synthetic pipelines through shared generation and automatic-Judge engine; no Firebase actors, SQL, learner quota, API endpoint, or learner score/award writes. This is service-engine capacity evidence, not 100-user admission acceptance.',
  };
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  assertCapacityEnvironment(env);
  const report = await runCapacityBatch({
    generate: input => productionGenerate(input),
    judge: input => productionEvaluate(input),
  });
  console.log(JSON.stringify({
    ...report,
    limits: {
      maxConcurrentPipelines: CAPACITY_TARGET,
      maxConcurrentGenerationCalls: MAX_CONCURRENT_GENERATION_CALLS,
      maxConcurrentJudgeCalls: MAX_CONCURRENT_JUDGE_CALLS,
      maxConcurrentProviderCalls: MAX_CONCURRENT_PROVIDER_CALLS,
      maxProviderAttempts: MAX_PROVIDER_ATTEMPTS,
      maxConfiguredOutputTokens: MAX_OUTPUT_TOKENS,
      outputTokenLimitIsNotCostCap: true,
      noHarnessRetries: true,
    },
  }));
  if (report.completed !== CAPACITY_TARGET || report.failed > 0 || report.provider.attemptsObserved > MAX_PROVIDER_ATTEMPTS) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    const message = error instanceof Error && error.message.startsWith('Capacity harness preflight failed:') ? error.message : 'Capacity harness stopped before a complete aggregate report.';
    console.error(JSON.stringify({ event: 'capacity_harness_stopped', message }));
    process.exitCode = 1;
  });
}
