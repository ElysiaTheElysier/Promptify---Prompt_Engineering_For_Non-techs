import assert from 'node:assert/strict';
import {
  projectionKey,
  warehouseProjection,
} from '../src/services/cloudProjectionService';

// Test 1: Canonical chunk(version_id, position) accepted unchanged with reconcileVersion: false
{
  const inputKey = {
    version_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    position: 42,
  };
  const result = projectionKey('product_sop_chunks', inputKey);
  assert.equal(result.reconcileVersion, false);
  assert.deepEqual(result.columns, ['version_id', 'position']);
  assert.deepEqual(result.key, {
    version_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    position: 42,
  });
}

// Test 2: Legacy literal quote key normalizes once without mutating input
{
  const originalInput = {
    version_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '"position"': 12,
  };
  const inputFrozen = Object.freeze({ ...originalInput });
  const result = projectionKey('product_sop_chunks', inputFrozen);

  assert.equal(result.reconcileVersion, false);
  assert.deepEqual(result.key, {
    version_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    position: 12,
  });
  assert.equal(Object.hasOwn(result.key, '"position"'), false);
  // Verify input object was not mutated
  assert.equal(Object.hasOwn(inputFrozen, '"position"'), true);
  assert.equal(Object.hasOwn(inputFrozen, 'position'), false);
}

// Test 3: Legacy null position chooses whole-version reconciliation, never guesses a position
{
  const inputWithNullPos = {
    version_id: '12345678-1234-1234-1234-123456789abc',
    position: null,
  };
  const result1 = projectionKey('product_sop_chunks', inputWithNullPos);
  assert.equal(result1.reconcileVersion, true);
  assert.equal(result1.key.position, null);
  assert.equal(result1.key.version_id, '12345678-1234-1234-1234-123456789abc');

  const inputWithQuotedNullPos = {
    version_id: '12345678-1234-1234-1234-123456789abc',
    '"position"': null,
  };
  const result2 = projectionKey('product_sop_chunks', inputWithQuotedNullPos);
  assert.equal(result2.reconcileVersion, true);
  assert.equal(result2.key.position, null);
  assert.equal(result2.key.version_id, '12345678-1234-1234-1234-123456789abc');
}

// Test 4: Conflicting canonical + quoted keys rejected
{
  assert.throws(
    () => {
      projectionKey('product_sop_chunks', {
        version_id: '12345678-1234-1234-1234-123456789abc',
        position: 1,
        '"position"': 1,
      });
    },
    {
      name: 'Error',
      message: 'Conflicting projection key',
    }
  );
}

// Test 5: Unknown table, array input, null input, non-object input rejected
{
  assert.throws(
    () => projectionKey('unknown_table', { id: 'some-id' }),
    { name: 'Error', message: 'Projection entity key invalid' }
  );

  assert.throws(
    () => projectionKey('classes', null),
    { name: 'Error', message: 'Projection entity key invalid' }
  );

  assert.throws(
    () => projectionKey('classes', undefined),
    { name: 'Error', message: 'Projection entity key invalid' }
  );

  assert.throws(
    () => projectionKey('classes', ['id-1']),
    { name: 'Error', message: 'Projection entity key invalid' }
  );

  assert.throws(
    () => projectionKey('classes', 'id-1'),
    { name: 'Error', message: 'Projection entity key invalid' }
  );
}

// Test 6: Extra keys rejected
{
  assert.throws(
    () => {
      projectionKey('classes', {
        id: 'cls-1',
        extra_field: 'unwanted',
      });
    },
    { name: 'Error', message: 'Projection entity key invalid' }
  );

  assert.throws(
    () => {
      projectionKey('product_sop_chunks', {
        version_id: '12345678-1234-1234-1234-123456789abc',
        position: 0,
        extra: 'val',
      });
    },
    { name: 'Error', message: 'Projection entity key invalid' }
  );
}

// Test 7: Missing ordinary keys rejected
{
  assert.throws(
    () => {
      projectionKey('classes', {});
    },
    { name: 'Error', message: 'Projection entity key invalid' }
  );

  assert.throws(
    () => {
      projectionKey('classes', { id: null });
    },
    { name: 'Error', message: 'Projection entity key missing' }
  );

  assert.throws(
    () => {
      projectionKey('classes', { id: undefined });
    },
    { name: 'Error', message: 'Projection entity key missing' }
  );

  assert.throws(
    () => {
      projectionKey('course_instructors', { course_id: 'crs-1', user_id: null });
    },
    { name: 'Error', message: 'Projection entity key missing' }
  );
}

// Test 8: Invalid version_id for null-position reconciliation rejected
{
  assert.throws(
    () => {
      projectionKey('product_sop_chunks', {
        version_id: 'invalid-uuid',
        position: null,
      });
    },
    { name: 'Error', message: 'Projection version invalid' }
  );

  assert.throws(
    () => {
      projectionKey('product_sop_chunks', {
        version_id: null as any,
        position: null,
      });
    },
    { name: 'Error', message: 'Projection version invalid' }
  );

  assert.throws(
    () => {
      projectionKey('product_sop_chunks', {
        version_id: 12345 as any,
        position: null,
      });
    },
    { name: 'Error', message: 'Projection version invalid' }
  );
}

// Test 9: warehouseProjection returns undefined for unknown table
{
  const unknown = warehouseProjection('unknown_table', { id: 'test' });
  assert.equal(unknown, undefined);
}

// Test 10: warehouseProjection strips prompt text / output / evaluation reason in prompt_attempts
{
  const promptAttemptRow = {
    id: 'pa-123',
    learner_id: 'learner-1',
    class_id: 'class-1',
    lesson_ref_id: 'lesson-1',
    attempt_number: 2,
    model: 'gemini-3.8-flash',
    latency_ms: 1200,
    created_at: '2026-10-13T12:00:00Z',
    prompt_text: 'PROPRIETARY SYSTEM PROMPT: Do not disclose',
    ai_output: 'Generated sensitive student output',
    internal_notes: 'Secret diagnostic info',
    evaluation_json: {
      total: 9.5,
      contract: 'passed',
      reason: 'SENSITIVE EVALUATION REASONING DETAILS',
      rubric_breakdown: { clarity: 5, accuracy: 5 },
      private_comment: 'Student struggled on part 1',
    },
  };

  const projected = warehouseProjection('prompt_attempts', promptAttemptRow);
  assert.deepEqual(projected, {
    id: 'pa-123',
    learner_id: 'learner-1',
    class_id: 'class-1',
    lesson_ref_id: 'lesson-1',
    attempt_number: 2,
    model: 'gemini-3.8-flash',
    latency_ms: 1200,
    created_at: '2026-10-13T12:00:00Z',
    evaluation_json: {
      total: 9.5,
      contract: 'passed',
    },
  });

  assert.equal(Object.hasOwn(projected!, 'prompt_text'), false);
  assert.equal(Object.hasOwn(projected!, 'ai_output'), false);
  assert.equal(Object.hasOwn(projected!, 'internal_notes'), false);
  assert.equal(Object.hasOwn(projected!.evaluation_json, 'reason'), false);
  assert.equal(Object.hasOwn(projected!.evaluation_json, 'rubric_breakdown'), false);
  assert.equal(Object.hasOwn(projected!.evaluation_json, 'private_comment'), false);
}

// Test 11: warehouseProjection handles null evaluation_json in prompt_attempts
{
  const projectedNullEval = warehouseProjection('prompt_attempts', {
    id: 'pa-456',
    evaluation_json: null,
  });
  assert.equal(projectedNullEval?.evaluation_json, null);
}

// Test 12: Studio projection contains class/lesson/revision/lesson_status only and no rubric/system_instruction/private text
{
  const studioRow = {
    class_id: 'cls-99',
    lesson_id: 'lsn-42',
    revision: 3,
    rubric: 'SECRET RUBRIC GUIDELINES',
    system_instruction: 'You are an internal confidential evaluator',
    prompt_template: 'Private prompt template',
    private_text: 'Confidential draft notes',
    author_id: 'usr-1',
    config: {
      lessonOverrides: {
        status: 'published',
        hidden_criteria: 'Do not leak',
      },
      secret_api_key: 'AIzaSyFakeKey',
    },
  };

  const projectedStudio = warehouseProjection('product_studio', studioRow);
  assert.deepEqual(projectedStudio, {
    class_id: 'cls-99',
    lesson_id: 'lsn-42',
    revision: 3,
    lesson_status: 'published',
  });

  // Strict verification of allowed keys only
  const studioKeys = Object.keys(projectedStudio!).sort();
  assert.deepEqual(studioKeys, ['class_id', 'lesson_id', 'lesson_status', 'revision']);
  assert.equal(Object.hasOwn(projectedStudio!, 'rubric'), false);
  assert.equal(Object.hasOwn(projectedStudio!, 'system_instruction'), false);
  assert.equal(Object.hasOwn(projectedStudio!, 'prompt_template'), false);
  assert.equal(Object.hasOwn(projectedStudio!, 'private_text'), false);
  assert.equal(Object.hasOwn(projectedStudio!, 'config'), false);
}

// Test 13: Studio projection handles missing or undefined config/lessonOverrides status
{
  const studioRowMissingStatus = {
    class_id: 'cls-100',
    lesson_id: 'lsn-50',
    revision: 1,
  };

  const projectedStudioFallback = warehouseProjection('product_studio', studioRowMissingStatus);
  assert.deepEqual(projectedStudioFallback, {
    class_id: 'cls-100',
    lesson_id: 'lsn-50',
    revision: 1,
    lesson_status: null,
  });
}

console.log('All Gemini projection key and warehouse projection tests passed successfully.');
