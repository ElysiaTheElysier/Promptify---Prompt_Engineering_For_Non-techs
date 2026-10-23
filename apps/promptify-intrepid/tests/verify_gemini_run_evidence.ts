import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRebuildRunService } from '../src/services/rebuildRunService';

const originalEnv = { ...process.env };
process.env.NODE_ENV = 'test';

try {
  const id = 'a5000000-0000-4000-8000-000000000001';
  const reqId1 = 'b1000000-0000-4000-8000-000000000001';
  const reqId2 = 'b2000000-0000-4000-8000-000000000002';
  const reqId3 = 'b3000000-0000-4000-8000-000000000003';
  const attemptId1 = 'c1000000-0000-4000-8000-000000000001';
  const attemptId2 = 'c2000000-0000-4000-8000-000000000002';
  const attemptId3 = 'c3000000-0000-4000-8000-000000000003';
  const attemptId4 = 'c4000000-0000-4000-8000-000000000004';

  const baseInput = {
    classId: id,
    lessonId: id,
    requestId: reqId1,
    prompt: 'regression prompt'
  };

  // 1 & 2: Exact Generate input persists as actual_generation_context with correct sha256 before begin_run
  // and Injected pgvector retrieval changes sample_input_context but cannot misrepresent exact Generate input
  process.env.GCP_VECTOR_MODE = 'pgvector';

  let beginRunSnapshot: any = null;
  let generateCallArgs: any = null;
  let pgvectorCalled = false;
  let generateCallCount = 0;

  const mockLesson1: any = {
    system_instruction: 'SYS INSTR',
    sample_input_context: 'CANONICAL SAMPLE',
    base_input_context: 'BASE INPUT',
    rebuild_sop_versions: [{ version_id: 'v1' }],
    lesson_resources: [
      { content: 'RESOURCE 2', position: 2 },
      { content: 'RESOURCE 1', position: 1 }
    ]
  };

  const expectedInitialInputContext = 'CANONICAL SAMPLE\n\nRESOURCE 1\n\nRESOURCE 2';
  const expectedFinalInputContext='BASE INPUT\n\nRETRIEVED VECTOR CONTEXT\n\nRESOURCE 1\n\nRESOURCE 2';
  const expectedFinalHash=createHash('sha256').update(expectedFinalInputContext,'utf8').digest('hex');
  const expectedHash = createHash('sha256').update(expectedInitialInputContext, 'utf8').digest('hex');

  const createMockDb = (tableResolver: (table: string) => any) => {
    return {
      from: (table: string) => {
        const query: any = {
          select: () => query,
          update: () => query,
          eq: () => query,
          is: () => query,
          in: () => query,
          single: async () => tableResolver(table),
          maybeSingle: async () => tableResolver(table)
        };
        return query;
      }
    };
  };

  const resolve1: any = async () => ({
    subject: id,
    lesson: mockLesson1,
    reader: {
      rpc: async (name: string) => {
        if (name === 'rebuild_class_sops') {
          return { data: [{ version_id: 'v1' }], error: null };
        }
        return { data: null, error: null };
      }
    },
    server: {
      rpc: async (name: string, params: any) => {
        if (name === 'rebuild_begin_run') {
          // Deep clone snapshot at the moment begin_run is called
          beginRunSnapshot = JSON.parse(JSON.stringify(params.p_snapshot));
          return { data: { result: null }, error: null };
        }
        if (name === 'rebuild_finish_run') {
          return { data: { attempt: { id: attemptId1 } }, error: null };
        }
        return { data: null, error: null };
      },
      ...createMockDb(() => ({ error: null, data: null }))
    }
  });

  const provider1: any = async (args: any) => {
    generateCallCount++;
    generateCallArgs = args;
    return { output: 'generated output 1', model: 'gemini-2.5-flash', latencyMs: 50 };
  };

  const retrievalMock: any = {
    pgvector: async () => {
      pgvectorCalled = true;
      return {
        query: 'regression prompt',
        chunks: [{ content: 'CHUNK_CONTENT', id: 'chunk1' }],
        context: 'RETRIEVED VECTOR CONTEXT'
      };
    },
    bigquery: async () => ({
      query: 'bq query',
      chunks: [],
      context: 'BQ CONTEXT'
    })
  };

  const svc1 = createRebuildRunService(resolve1, provider1, undefined as any, retrievalMock);
  const genResult = await svc1.generateSavedRun('Bearer test-token', baseInput);

  assert.equal(generateCallCount, 1, 'Generate provider should be called exactly once');
  assert.equal(pgvectorCalled, true, 'Injected pgvector retrieval callback should be invoked');
  assert.equal(
    beginRunSnapshot.actual_generation_context,
    expectedInitialInputContext,
    'Exact Generate input persists as actual_generation_context before begin_run'
  );
  assert.equal(
    beginRunSnapshot.actual_generation_context_hash,
    expectedHash,
    'Correct sha256 hash persisted before begin_run'
  );
  assert.equal(
    mockLesson1.actual_generation_context,
    expectedFinalInputContext,
    'actual_generation_context remains frozen and not mutated by retrieval'
  );
  assert.equal(
    mockLesson1.actual_generation_context_hash,
    expectedFinalHash,
    'actual_generation_context_hash remains intact'
  );
  assert.equal(
    mockLesson1.sample_input_context,
    'BASE INPUT\n\nRETRIEVED VECTOR CONTEXT',
    'Injected pgvector retrieval changes sample_input_context'
  );
  assert.equal(
    generateCallArgs.inputContext,
    expectedFinalInputContext,
    'Provider receives frozen inputContext, not misrepresented by later retrieval'
  );
  assert.equal(genResult.output, 'generated output 1');

  // 3: Duplicate request replay returns persisted result without another provider call
  let replayBeginCalled = false;
  const resolveReplay: any = async () => ({
    subject: id,
    lesson: { ...mockLesson1 },
    reader: { rpc: async () => ({ data: [], error: null }) },
    server: {
      rpc: async (name: string) => {
        if (name === 'rebuild_begin_run') {
          replayBeginCalled = true;
          return { data: { result: { output: 'cached replay output', saved: { attempt: { id: attemptId1 } } } }, error: null };
        }
        return { data: null, error: null };
      }
    }
  });

  const providerReplay: any = async () => {
    assert.fail('Provider should never be called when replay result exists');
  };

  const svcReplay = createRebuildRunService(resolveReplay, providerReplay, undefined as any, retrievalMock);
  const replayResult = await svcReplay.generateSavedRun('Bearer test-token', { ...baseInput, requestId: reqId2 });
  assert.equal(replayBeginCalled, true);
  assert.equal(replayResult.output, 'cached replay output');
  assert.equal(generateCallCount, 1, 'Provider call count must not increase on replay');

  // 4: Judge uses frozen actual context plus resources rather than later retrieval context
  let evaluatedControlData: any = null;
  let judgeEvaluatorCalled = false;
  let claimJudgeCalled = false;

  const mockRunSnapshotWithFrozenEvidence = {
    scenario: 'DIAGNOSTIC SCENARIO',
    task_goal: 'DIAGNOSTIC GOAL',
    sample_input_context: 'LATER RETRIEVAL CONTEXT',
    actual_generation_context: expectedInitialInputContext,
    actual_generation_context_hash: expectedHash,
    production_rubric: [{ criterion: 'accuracy', weight: 1 }]
  };

  const clientDbForJudge: any = {
    ...createMockDb((table: string) => {
      if (table === 'prompt_attempts') {
        return {
          data: {
            id: attemptId1,
            learner_id: 'learner-uuid',
            prompt_text: 'user prompt text',
            ai_output: 'ai generated output'
          },
          error: null
        };
      }
      if (table === 'users') {
        return { data: { id: 'user-uuid' }, error: null };
      }
      if (table === 'learners') {
        return { data: { id: 'learner-uuid' }, error: null };
      }
      if (table === 'rebuild_runs') {
        return {
          data: {
            snapshot: mockRunSnapshotWithFrozenEvidence
          },
          error: null
        };
      }
      return { data: null, error: null };
    }),
    rpc: async (name: string) => {
      if (name === 'product_take_budget') return { data: true, error: null };
      if (name === 'rebuild_claim_judge') {
        claimJudgeCalled = true;
        return { data: { status: 'claimed' }, error: null };
      }
      if (name === 'rebuild_finish_judge') {
        return { data: {}, error: null };
      }
      return { data: null, error: null };
    }
  };

  const evaluateMock: any = async (evalBody: any) => {
    judgeEvaluatorCalled = true;
    evaluatedControlData = evalBody.controlData;
    return { score: 9.5, passed: true };
  };

  const resolveJudge: any = async () => ({
    reader: clientDbForJudge,
    server: clientDbForJudge,
    subject: id,
    lesson: {}
  });

  const svcJudge = createRebuildRunService(resolveJudge, provider1, evaluateMock);
  const judgeResult = await svcJudge.evaluateSavedRun('Bearer test-token', {
    classId: id,
    lessonId: id,
    attemptId: attemptId1
  });

  assert.equal(claimJudgeCalled, true);
  assert.equal(judgeEvaluatorCalled, true);
  assert.equal(
    evaluatedControlData,
    expectedInitialInputContext,
    'Judge uses frozen actual_generation_context rather than later retrieval context'
  );
  assert.notEqual(
    evaluatedControlData,
    mockRunSnapshotWithFrozenEvidence.sample_input_context,
    'Judge must not use mutated sample_input_context when frozen actual context is present'
  );
  assert.equal(judgeResult.score, 9.5);

  // 5: Bad context/hash is rejected before Judge claim/evaluator
  let claimCalledOnTamper = false;
  let evaluateCalledOnTamper = false;

  const mockTamperedSnapshot = {
    scenario: 'SCENARIO',
    task_goal: 'TASK',
    actual_generation_context: 'TAMPERED / MISMATCHED CONTEXT',
    actual_generation_context_hash: expectedHash, // Hash does not match tampered context
    production_rubric: [{ criterion: 'accuracy' }]
  };

  const clientDbTampered: any = {
    ...createMockDb((table: string) => {
      if (table === 'prompt_attempts') {
        return {
          data: {
            id: attemptId2,
            learner_id: 'learner-uuid',
            prompt_text: 'prompt',
            ai_output: 'output'
          },
          error: null
        };
      }
      if (table === 'users') return { data: { id: 'user-uuid' }, error: null };
      if (table === 'learners') return { data: { id: 'learner-uuid' }, error: null };
      if (table === 'rebuild_runs') {
        return { data: { snapshot: mockTamperedSnapshot }, error: null };
      }
      return { data: null, error: null };
    }),
    rpc: async () => {
      claimCalledOnTamper = true;
      return { data: { status: 'claimed' }, error: null };
    }
  };

  const svcTamper = createRebuildRunService(
    async () => ({ reader: clientDbTampered, server: clientDbTampered, subject: id, lesson: {} as any }),
    provider1,
    async () => {
      evaluateCalledOnTamper = true;
      return { score: 1 };
    }
  );

  await assert.rejects(
    () => svcTamper.evaluateSavedRun('Bearer test-token', { classId: id, lessonId: id, attemptId: attemptId2 }),
    (err: any) => {
      assert.match(err.message, /Generation evidence is inconsistent/);
      assert.equal(err.statusCode, 409);
      return true;
    },
    'Tampered evidence must be rejected with 409 error'
  );
  assert.equal(claimCalledOnTamper, false, 'Claim must not be called when evidence is tampered');
  assert.equal(evaluateCalledOnTamper, false, 'Evaluator must not be called when evidence is tampered');

  // 6: Old snapshots without new fields retain legacy fallback
  let legacyEvaluatedControlData: any = null;
  let legacyEvaluatorCalled = false;

  const mockLegacySnapshot = {
    scenario: 'LEGACY SCENARIO',
    task_goal: 'LEGACY GOAL',
    sample_input_context: 'LEGACY FALLBACK CONTEXT',
    // actual_generation_context and actual_generation_context_hash are omitted / undefined
    lesson_rubric_criteria: [{ criterion: 'legacy' }]
  };

  const clientDbLegacy: any = {
    ...createMockDb((table: string) => {
      if (table === 'prompt_attempts') {
        return {
          data: {
            id: attemptId3,
            learner_id: 'learner-uuid',
            prompt_text: 'legacy prompt',
            ai_output: 'legacy output'
          },
          error: null
        };
      }
      if (table === 'users') return { data: { id: 'user-uuid' }, error: null };
      if (table === 'learners') return { data: { id: 'learner-uuid' }, error: null };
      if (table === 'rebuild_runs') {
        return { data: { snapshot: mockLegacySnapshot }, error: null };
      }
      return { data: null, error: null };
    }),
    rpc: async (name: string) => {
      if (name === 'product_take_budget') return { data: true, error: null };
      if (name === 'rebuild_claim_judge') return { data: { status: 'claimed' }, error: null };
      if (name === 'rebuild_finish_judge') return { data: {}, error: null };
      return { data: null, error: null };
    }
  };

  const svcLegacy = createRebuildRunService(
    async () => ({ reader: clientDbLegacy, server: clientDbLegacy, subject: id, lesson: {} as any }),
    provider1,
    async (evalBody: any) => {
      legacyEvaluatorCalled = true;
      legacyEvaluatedControlData = evalBody.controlData;
      return { total: 8 };
    }
  );

  const legacyResult = await svcLegacy.evaluateSavedRun('Bearer test-token', {
    classId: id,
    lessonId: id,
    attemptId: attemptId3
  });

  assert.equal(legacyEvaluatorCalled, true);
  assert.equal(
    legacyEvaluatedControlData,
    'LEGACY FALLBACK CONTEXT',
    'Old snapshot falls back to sample_input_context when actual_generation_context is undefined'
  );
  assert.equal(legacyResult.total, 8);

  // 7: Resource text inclusion in actual_generation_context sorted by position
  delete process.env.GCP_VECTOR_MODE;
  let sortedResourceSnapshot: any = null;

  const mockLessonSortedResources: any = {
    sample_input_context: 'INITIAL SAMPLE',
    lesson_resources: [
      { content: 'RES POS 3', position: 3 },
      { content: 'RES POS 1', position: 1 },
      { content: '', position: 2 }, // Empty content filtered out
      { content: 'RES POS 2', position: 2 }
    ]
  };

  const resolveResources: any = async () => ({
    subject: id,
    lesson: mockLessonSortedResources,
    server: {
      rpc: async (name: string, params: any) => {
        if (name === 'rebuild_begin_run') {
          sortedResourceSnapshot = JSON.parse(JSON.stringify(params.p_snapshot));
          return { data: { result: null }, error: null };
        }
        if (name === 'rebuild_finish_run') {
          return { data: { attempt: { id: attemptId4 } }, error: null };
        }
        return { data: null, error: null };
      }
    }
  });

  const svcResources = createRebuildRunService(resolveResources, provider1);
  await svcResources.generateSavedRun('Bearer test-token', { ...baseInput, requestId: reqId3 });

  const expectedResourceContext = 'INITIAL SAMPLE\n\nRES POS 1\n\nRES POS 2\n\nRES POS 3';
  const expectedResourceHash = createHash('sha256').update(expectedResourceContext, 'utf8').digest('hex');

  assert.equal(sortedResourceSnapshot.actual_generation_context, expectedResourceContext);
  assert.equal(sortedResourceSnapshot.actual_generation_context_hash, expectedResourceHash);

  console.log('All offline behavioral regression tests for createRebuildRunService passed successfully.');
} finally {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
}
