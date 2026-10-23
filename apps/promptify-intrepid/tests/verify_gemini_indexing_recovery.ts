import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiAccessError } from '../src/services/apiAuthorizationService.js';
import { indexPendingContribution } from '../src/services/sopIndexingService.js';
import type { CloudDatabaseClient } from '../src/services/cloudDatabaseService.js';
import type { SopChunk } from '../src/services/sopIngestionService.js';

interface ContributionRow {
  id: string;
  class_id: string;
  status: string;
  indexing_claim: string | null;
  indexing_claimed_at: string | null;
  indexed_chunks: SopChunk[] | null;
  [key: string]: unknown;
}

interface MockDatabaseState {
  rows: ContributionRow[];
  errorOnUpdate?: Error | null;
}

function createFluentDbDouble(state: MockDatabaseState): CloudDatabaseClient {
  return {
    from(table: string) {
      if (table !== 'product_sop_contributions') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        update(values: Partial<ContributionRow>) {
          const filters: Array<(row: ContributionRow) => boolean> = [];

          const builder = {
            eq(column: string, val: unknown) {
              filters.push((row) => (row as Record<string, unknown>)[column] === val);
              return builder;
            },
            is(column: string, val: unknown) {
              filters.push((row) => (row as Record<string, unknown>)[column] === val);
              return builder;
            },
            select(_columns: string) {
              return builder;
            },
            async maybeSingle() {
              if (state.errorOnUpdate) {
                return { data: null, error: state.errorOnUpdate };
              }

              const target = state.rows.find((r) => filters.every((fn) => fn(r)));
              if (!target) {
                return { data: null, error: null };
              }

              Object.assign(target, values);
              return { data: { id: target.id }, error: null };
            },
          };

          return builder;
        },
      } as unknown as ReturnType<CloudDatabaseClient['from']>;
    },
  } as unknown as CloudDatabaseClient;
}

function createSampleChunk(content = 'Sample chunk'): SopChunk {
  return {
    position: 1,
    page: 1,
    content,
  };
}

function createEmbeddedChunk(content = 'Sample chunk'): SopChunk {
  return {
    position: 1,
    page: 1,
    content,
    embedding: new Array(768).fill(0.1),
    model: 'gemini-embedding-001',
    taskType: 'RETRIEVAL_DOCUMENT',
  };
}

test('Successful indexing acquires claim, timestamp, and saves indexed_chunks only under matching claim/class/pending scope', async () => {
  const initialRow: ContributionRow = {
    id: 'contrib-1',
    class_id: 'class-abc',
    status: 'pending',
    indexing_claim: null,
    indexing_claimed_at: null,
    indexed_chunks: null,
  };

  const state: MockDatabaseState = { rows: [{ ...initialRow }] };
  const db = createFluentDbDouble(state);
  const inputChunks = [createSampleChunk('Test Content')];
  const expectedResult = [createEmbeddedChunk('Test Content')];

  let embedCalled = false;
  const mockEmbed = async (chunks: SopChunk[]) => {
    embedCalled = true;
    assert.deepEqual(chunks, inputChunks);
    return expectedResult;
  };

  const result = await indexPendingContribution(
    db,
    {
      id: 'contrib-1',
      class_id: 'class-abc',
      chunks: inputChunks,
    },
    mockEmbed
  );

  assert.equal(embedCalled, true);
  assert.deepEqual(result, expectedResult);

  const updated = state.rows[0];
  assert.equal(typeof updated.indexing_claim, 'string');
  assert.ok(updated.indexing_claim !== null && updated.indexing_claim.length > 0);
  assert.equal(typeof updated.indexing_claimed_at, 'string');
  assert.ok(!Number.isNaN(Date.parse(updated.indexing_claimed_at!)));
  assert.deepEqual(updated.indexed_chunks, expectedResult);
});

test('Known-failure tagged error releases its own pending claim and sets timestamp to null', async () => {
  const initialRow: ContributionRow = {
    id: 'contrib-2',
    class_id: 'class-xyz',
    status: 'pending',
    indexing_claim: null,
    indexing_claimed_at: null,
    indexed_chunks: null,
  };

  const state: MockDatabaseState = { rows: [{ ...initialRow }] };
  const db = createFluentDbDouble(state);
  const inputChunks = [createSampleChunk('Known Fail Content')];

  const knownFailureError = Object.assign(new ApiAccessError('SOP indexing failed.', 502), {
    indexingOutcome: 'known-failure',
  });

  const mockEmbed = async () => {
    throw knownFailureError;
  };

  await assert.rejects(
    async () => {
      await indexPendingContribution(
        db,
        {
          id: 'contrib-2',
          class_id: 'class-xyz',
          chunks: inputChunks,
        },
        mockEmbed
      );
    },
    (err: unknown) => {
      assert.equal(err, knownFailureError);
      return true;
    }
  );

  const updated = state.rows[0];
  assert.equal(updated.indexing_claim, null);
  assert.equal(updated.indexing_claimed_at, null);
  assert.equal(updated.indexed_chunks, null);
});

test('Timeout error keeps claim, does not release ownership, and rethrows', async () => {
  const initialRow: ContributionRow = {
    id: 'contrib-3',
    class_id: 'class-timeout',
    status: 'pending',
    indexing_claim: null,
    indexing_claimed_at: null,
    indexed_chunks: null,
  };

  const state: MockDatabaseState = { rows: [{ ...initialRow }] };
  const db = createFluentDbDouble(state);
  const inputChunks = [createSampleChunk('Timeout Content')];

  const timeoutError = new Error('Gateway Timeout');

  const mockEmbed = async () => {
    throw timeoutError;
  };

  await assert.rejects(
    async () => {
      await indexPendingContribution(
        db,
        {
          id: 'contrib-3',
          class_id: 'class-timeout',
          chunks: inputChunks,
        },
        mockEmbed
      );
    },
    (err: unknown) => {
      assert.equal(err, timeoutError);
      return true;
    }
  );

  const updated = state.rows[0];
  assert.ok(updated.indexing_claim !== null);
  assert.ok(updated.indexing_claimed_at !== null);
  assert.equal(updated.indexed_chunks, null);
});

test('Plain untagged error keeps claim and retains ownership without clearing', async () => {
  const initialRow: ContributionRow = {
    id: 'contrib-4',
    class_id: 'class-plain',
    status: 'pending',
    indexing_claim: null,
    indexing_claimed_at: null,
    indexed_chunks: null,
  };

  const state: MockDatabaseState = { rows: [{ ...initialRow }] };
  const db = createFluentDbDouble(state);
  const inputChunks = [createSampleChunk('Plain Error')];

  const plainError = new ApiAccessError('Connection lost unexpectedly.', 500);

  const mockEmbed = async () => {
    throw plainError;
  };

  await assert.rejects(
    async () => {
      await indexPendingContribution(
        db,
        {
          id: 'contrib-4',
          class_id: 'class-plain',
          chunks: inputChunks,
        },
        mockEmbed
      );
    },
    (err: unknown) => {
      assert.equal(err, plainError);
      return true;
    }
  );

  const updated = state.rows[0];
  assert.ok(updated.indexing_claim !== null);
  assert.ok(updated.indexing_claimed_at !== null);
  assert.equal(updated.indexed_chunks, null);
});

test('Claim acquisition error (DB error) throws 503 and never invokes embed', async () => {
  const state: MockDatabaseState = {
    rows: [
      {
        id: 'contrib-5',
        class_id: 'class-dberr',
        status: 'pending',
        indexing_claim: null,
        indexing_claimed_at: null,
        indexed_chunks: null,
      },
    ],
    errorOnUpdate: new Error('Postgres connection failed'),
  };

  const db = createFluentDbDouble(state);
  let embedInvoked = false;
  const mockEmbed = async () => {
    embedInvoked = true;
    return [];
  };

  await assert.rejects(
    async () => {
      await indexPendingContribution(
        db,
        {
          id: 'contrib-5',
          class_id: 'class-dberr',
          chunks: [createSampleChunk()],
        },
        mockEmbed
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiAccessError);
      assert.equal((err as ApiAccessError).statusCode, 503);
      assert.match((err as ApiAccessError).message, /Source indexing claim could not be saved/);
      return true;
    }
  );

  assert.equal(embedInvoked, false);
});

test('Claim acquisition conflict (already claimed / busy) throws 409 and never invokes embed', async () => {
  const state: MockDatabaseState = {
    rows: [
      {
        id: 'contrib-6',
        class_id: 'class-busy',
        status: 'pending',
        indexing_claim: 'existing-active-claim',
        indexing_claimed_at: new Date().toISOString(),
        indexed_chunks: null,
      },
    ],
  };

  const db = createFluentDbDouble(state);
  let embedInvoked = false;
  const mockEmbed = async () => {
    embedInvoked = true;
    return [];
  };

  await assert.rejects(
    async () => {
      await indexPendingContribution(
        db,
        {
          id: 'contrib-6',
          class_id: 'class-busy',
          chunks: [createSampleChunk()],
        },
        mockEmbed
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiAccessError);
      assert.equal((err as ApiAccessError).statusCode, 409);
      assert.match((err as ApiAccessError).message, /Source indexing is processing or uncertain/);
      return true;
    }
  );

  assert.equal(embedInvoked, false);
});

test('Cached indexed_chunks returned immediately without claim acquisition or embedding', async () => {
  const state: MockDatabaseState = {
    rows: [
      {
        id: 'contrib-7',
        class_id: 'class-cached',
        status: 'pending',
        indexing_claim: null,
        indexing_claimed_at: null,
        indexed_chunks: null,
      },
    ],
  };

  const db = createFluentDbDouble(state);
  const existingChunks = [createEmbeddedChunk('Already cached')];

  let embedInvoked = false;
  const mockEmbed = async () => {
    embedInvoked = true;
    return [];
  };

  const result = await indexPendingContribution(
    db,
    {
      id: 'contrib-7',
      class_id: 'class-cached',
      chunks: [createSampleChunk()],
      indexed_chunks: existingChunks,
    },
    mockEmbed
  );

  assert.equal(embedInvoked, false);
  assert.equal(result, existingChunks);
  assert.equal(state.rows[0].indexing_claim, null);
  assert.equal(state.rows[0].indexing_claimed_at, null);
});

test('Concurrent second claim acquisition fails (atomic claim isolation)', async () => {
  const state: MockDatabaseState = {
    rows: [
      {
        id: 'contrib-8',
        class_id: 'class-concurrent',
        status: 'pending',
        indexing_claim: null,
        indexing_claimed_at: null,
        indexed_chunks: null,
      },
    ],
  };

  const db = createFluentDbDouble(state);
  const inputChunks = [createSampleChunk()];

  let resolveFirstEmbed!: (chunks: SopChunk[]) => void;
  const firstEmbedPromise = new Promise<SopChunk[]>((resolve) => {
    resolveFirstEmbed = resolve;
  });

  const runFirst = indexPendingContribution(
    db,
    {
      id: 'contrib-8',
      class_id: 'class-concurrent',
      chunks: inputChunks,
    },
    async () => firstEmbedPromise
  );

  // Allow first to acquire claim
  await new Promise((resolve) => setImmediate(resolve));

  // Second concurrent attempt
  let secondEmbedInvoked = false;
  const runSecond = indexPendingContribution(
    db,
    {
      id: 'contrib-8',
      class_id: 'class-concurrent',
      chunks: inputChunks,
    },
    async () => {
      secondEmbedInvoked = true;
      return [];
    }
  );

  await assert.rejects(
    runSecond,
    (err: unknown) => {
      assert.ok(err instanceof ApiAccessError);
      assert.equal((err as ApiAccessError).statusCode, 409);
      return true;
    }
  );

  assert.equal(secondEmbedInvoked, false);

  resolveFirstEmbed([createEmbeddedChunk()]);
  await runFirst;
});

test('Persistence failure when saving indexed chunks throws 503 and keeps claim for reconciliation', async () => {
  let claimAcquired = false;

  const row: ContributionRow = {
    id: 'contrib-9',
    class_id: 'class-persist-fail',
    status: 'pending',
    indexing_claim: null,
    indexing_claimed_at: null,
    indexed_chunks: null,
  };

  const db: CloudDatabaseClient = {
    from(table: string) {
      return {
        update(values: Partial<ContributionRow>) {
          const builder = {
            eq() { return builder; },
            is() { return builder; },
            select() { return builder; },
            async maybeSingle() {
              if (!claimAcquired) {
                claimAcquired = true;
                Object.assign(row, values);
                return { data: { id: row.id }, error: null };
              }
              // Simulate failure during persistence of indexed_chunks
              return { data: null, error: new Error('Write conflict / disk full') };
            },
          };
          return builder;
        },
      } as unknown as ReturnType<CloudDatabaseClient['from']>;
    },
  } as unknown as CloudDatabaseClient;

  await assert.rejects(
    async () => {
      await indexPendingContribution(
        db,
        {
          id: 'contrib-9',
          class_id: 'class-persist-fail',
          chunks: [createSampleChunk()],
        },
        async (chunks) => chunks.map((c) => ({ ...c, embedding: [0.1] }))
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiAccessError);
      assert.equal((err as ApiAccessError).statusCode, 503);
      assert.match((err as ApiAccessError).message, /Indexed evidence could not be saved; reconcile before retrying/);
      return true;
    }
  );

  assert.ok(row.indexing_claim !== null);
  assert.equal(row.indexed_chunks, null);
});

test('Recovery failure during known-failure release reports uncertainty (503)', async () => {
  let updateCount = 0;
  const row: ContributionRow = {
    id: 'contrib-10',
    class_id: 'class-uncertain',
    status: 'pending',
    indexing_claim: null,
    indexing_claimed_at: null,
    indexed_chunks: null,
  };

  const db: CloudDatabaseClient = {
    from(table: string) {
      return {
        update(values: Partial<ContributionRow>) {
          const builder = {
            eq() { return builder; },
            is() { return builder; },
            select() { return builder; },
            async maybeSingle() {
              updateCount++;
              if (updateCount === 1) {
                // Claim acquisition succeeds
                Object.assign(row, values);
                return { data: { id: row.id }, error: null };
              }
              // Release fails / row modified externally
              return { data: null, error: null };
            },
          };
          return builder;
        },
      } as unknown as ReturnType<CloudDatabaseClient['from']>;
    },
  } as unknown as CloudDatabaseClient;

  const knownFailureError = Object.assign(new ApiAccessError('Known failure', 502), {
    indexingOutcome: 'known-failure',
  });

  await assert.rejects(
    async () => {
      await indexPendingContribution(
        db,
        {
          id: 'contrib-10',
          class_id: 'class-uncertain',
          chunks: [createSampleChunk()],
        },
        async () => {
          throw knownFailureError;
        }
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiAccessError);
      assert.equal((err as ApiAccessError).statusCode, 503);
      assert.match((err as ApiAccessError).message, /Indexing failed and claim recovery is uncertain; contact the trainer/);
      return true;
    }
  );
});
