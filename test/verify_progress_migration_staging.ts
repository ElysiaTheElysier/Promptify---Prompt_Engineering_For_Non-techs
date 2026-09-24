import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.STAGING_SUPABASE_URL;
const anonKey = process.env.STAGING_SUPABASE_ANON_KEY;
const serviceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.STAGING_TEST_USER_PASSWORD;
const phase = process.env.STAGING_PROGRESS_PHASE || '016';

assert.equal(process.env.STAGING_PROGRESS_CONFIRM, 'PROMPTIFY_STAGING_ONLY', 'Explicit staging confirmation is required.');
assert.ok(url && anonKey && serviceKey && password, 'Missing staging-only environment variables.');
assert.ok(phase === '016' || phase === '017', 'STAGING_PROGRESS_PHASE must be 016 or 017.');
assert.notEqual(url, process.env.VITE_SUPABASE_URL, 'Refusing to run when staging URL equals the application Supabase URL.');

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const expected = JSON.parse(await readFile('supabase/staging/server_backed_progress_expected.json', 'utf8'));
const fixtureAttemptIds = Array.from({ length: 9 }, (_, index) =>
  `b9000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
);
const fixtureLearnerIds = [
  'b7000000-0000-4000-8000-000000000001',
  'b7000000-0000-4000-8000-000000000002',
  'b7000000-0000-4000-8000-000000000003',
];

function normalizedTime(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

async function ensureAuthUser(email: string) {
  const { data: listed, error: listError } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email === email);
  if (existing) {
    const { error } = await service.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error || new Error(`Could not create ${email}`);
  return data.user.id;
}

async function signedInClient(email: string): Promise<SupabaseClient> {
  await ensureAuthUser(email);
  const client = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: password! });
  if (error) throw error;
  return client;
}

const { data: attempts, error: attemptsError } = await service
  .from('prompt_attempts')
  .select('id, learner_id, class_id, lesson_id, lesson_ref_id, evaluation_json, created_at')
  .in('id', fixtureAttemptIds);
if (attemptsError) throw attemptsError;
assert.equal(attempts.length, expected.fixturePromptAttempts, 'Fixture attempt count mismatch; fixture or backfill input changed.');

const { data: progress, error: progressError } = await service
  .from('lesson_progress')
  .select('*')
  .in('learner_id', fixtureLearnerIds)
  .order('learner_id')
  .order('class_id')
  .order('lesson_id');
if (progressError) throw progressError;
assert.equal(progress.length, expected.lessonProgressRows.length, 'Unexpected lesson_progress row count.');

for (const row of expected.lessonProgressRows) {
  const actual = progress.find((item) =>
    item.learner_id === row.learnerId && item.class_id === row.classId && item.lesson_id === row.lessonId
  );
  assert.ok(actual, `Missing progress row ${row.learnerId}/${row.classId}/${row.lessonId}`);
  assert.equal(actual.status, 'completed');
  assert.equal(actual.attempts_count, row.attemptsCount);
  assert.equal(actual.best_score === null ? null : Number(actual.best_score), row.bestScore);
  assert.equal(actual.last_attempt_id, row.lastAttemptId);
  assert.equal(normalizedTime(actual.started_at), normalizedTime(row.startedAt));
  assert.equal(normalizedTime(actual.completed_at), normalizedTime(row.completedAt));
  assert.equal(normalizedTime(actual.updated_at), normalizedTime(row.updatedAt));
}

const learnerA = await signedInClient('learner.a@promptify-staging.invalid');
const learnerB = await signedInClient('learner.b@promptify-staging.invalid');
const removedLearner = await signedInClient('learner.c@promptify-staging.invalid');
const instructor = await signedInClient('instructor@promptify-staging.invalid');
const anonymous = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

const anonymousRead = await anonymous.from('lesson_progress').select('id').limit(1);
assert.ok(anonymousRead.error, 'Anonymous role must not read lesson_progress.');

const { data: learnerAView, error: learnerAReadError } = await learnerA.from('lesson_progress').select('*');
if (learnerAReadError) throw learnerAReadError;
assert.ok(learnerAView.length > 0 && learnerAView.every((row) => row.learner_id === fixtureLearnerIds[0]), 'Learner A RLS isolation failed.');
const { data: learnerBView, error: learnerBReadError } = await learnerB.from('lesson_progress').select('*');
if (learnerBReadError) throw learnerBReadError;
assert.ok(learnerBView.length > 0 && learnerBView.every((row) => row.learner_id === fixtureLearnerIds[1]), 'Learner B RLS isolation failed.');
const { data: instructorView, error: instructorReadError } = await instructor.from('lesson_progress').select('*').in('learner_id', fixtureLearnerIds);
if (instructorReadError) throw instructorReadError;
assert.equal(instructorView.length, expected.lessonProgressRows.length, 'Instructor cannot read expected fixture progress.');
const { data: removedView, error: removedReadError } = await removedLearner.from('lesson_progress').select('*');
if (removedReadError) throw removedReadError;
assert.equal(removedView.length, 0, 'Removed learner must not read historical progress for the removed class.');

const trackedAttemptIds: string[] = [];
try {
  const valid10 = { scores: { taskCompletion: 2, groundedness: 2, formatAdherence: 2, constraintCompliance: 2, businessUsability: 2 }, total: 10, strengths: [], improvements: [], nextHint: 'Synthetic' };
  const valid5 = { scores: { taskCompletion: 1, groundedness: 1, formatAdherence: 1, constraintCompliance: 1, businessUsability: 1 }, total: 5, strengths: [], improvements: [], nextHint: 'Synthetic' };
  const directId = randomUUID();
  const directInsert = await learnerA.from('prompt_attempts').insert({
    id: directId,
    learner_id: fixtureLearnerIds[0],
    class_id: 'b3000000-0000-4000-8000-000000000001',
    lesson_id: 'b5000000-0000-4000-8000-000000000004',
    lesson_ref_id: 'b5000000-0000-4000-8000-000000000004',
    attempt_number: 90,
    prompt_text: 'Staging direct compatibility probe',
    ai_output: 'Synthetic direct output',
    evaluation_json: null,
    model: 'staging-probe',
    latency_ms: 1,
  });
  if (phase === '016') {
    assert.equal(directInsert.error, null, 'Old-code direct INSERT must remain available after 016.');
    trackedAttemptIds.push(directId);
  } else {
    assert.ok(directInsert.error, 'Direct INSERT must be denied after 017.');
  }
  const directUpdate = await learnerA.from('prompt_attempts')
    .update({ evaluation_json: valid5 })
    .eq('id', phase === '016' ? directId : fixtureAttemptIds[0]);
  if (phase === '016') assert.equal(directUpdate.error, null, 'Old-code direct UPDATE must remain available after 016.');
  else assert.ok(directUpdate.error, 'Direct UPDATE must be denied after 017.');

  if (phase === '016') {
    const { data: directProgress, error: directProgressError } = await service
      .from('lesson_progress')
      .select('*')
      .eq('learner_id', fixtureLearnerIds[0])
      .eq('class_id', 'b3000000-0000-4000-8000-000000000001')
      .eq('lesson_id', 'b5000000-0000-4000-8000-000000000004')
      .single();
    if (directProgressError) throw directProgressError;
    assert.equal(directProgress.attempts_count, 1, 'Legacy direct INSERT must synchronize progress exactly once.');
    assert.equal(Number(directProgress.best_score), 5, 'Legacy direct UPDATE must synchronize best_score.');
    assert.equal(directProgress.last_attempt_id, directId);
    await service.from('prompt_attempts').delete().eq('id', directId);
    await service.from('lesson_progress').delete().eq('id', directProgress.id);
    trackedAttemptIds.splice(trackedAttemptIds.indexOf(directId), 1);
  }

  const first = await learnerA.rpc('record_prompt_attempt_and_progress', {
    p_class_id: 'b3000000-0000-4000-8000-000000000001', p_lesson_id: 'b5000000-0000-4000-8000-000000000004',
    p_prompt_text: 'Staging atomic prompt one', p_ai_output: 'Synthetic output one', p_evaluation_json: valid5, p_model: 'staging-probe', p_latency_ms: 2,
  });
  if (first.error) throw first.error;
  trackedAttemptIds.push(first.data.attempt.id);
  const second = await learnerA.rpc('record_prompt_attempt_and_progress', {
    p_class_id: 'b3000000-0000-4000-8000-000000000001', p_lesson_id: 'b5000000-0000-4000-8000-000000000004',
    p_prompt_text: 'Staging atomic prompt two', p_ai_output: 'Synthetic output two', p_evaluation_json: valid5, p_model: 'staging-probe', p_latency_ms: 3,
  });
  if (second.error) throw second.error;
  trackedAttemptIds.push(second.data.attempt.id);
  assert.equal(second.data.progress.attempts_count, 2);
  assert.equal(Number(second.data.progress.best_score), 5);
  assert.equal(second.data.progress.last_attempt_id, second.data.attempt.id);

  const higherRetry = await learnerA.rpc('update_prompt_attempt_evaluation_and_progress', {
    p_attempt_id: second.data.attempt.id, p_evaluation_json: valid10,
  });
  if (higherRetry.error) throw higherRetry.error;
  assert.equal(Number(higherRetry.data.progress.best_score), 10, 'Higher retry score must raise best_score.');

  const lowerRetry = await learnerA.rpc('update_prompt_attempt_evaluation_and_progress', {
    p_attempt_id: second.data.attempt.id, p_evaluation_json: valid5,
  });
  if (lowerRetry.error) throw lowerRetry.error;
  assert.equal(Number(lowerRetry.data.progress.best_score), 10, 'Lower retry score must not lower best_score.');

  const malformedRetry = await learnerA.rpc('update_prompt_attempt_evaluation_and_progress', {
    p_attempt_id: second.data.attempt.id, p_evaluation_json: { total: 'malformed', scores: {} },
  });
  if (malformedRetry.error) throw malformedRetry.error;
  assert.equal(Number(malformedRetry.data.progress.best_score), 10, 'Malformed evaluation must not lower best_score.');

  const unauthorizedRetry = await learnerB.rpc('update_prompt_attempt_evaluation_and_progress', {
    p_attempt_id: second.data.attempt.id, p_evaluation_json: valid10,
  });
  assert.ok(unauthorizedRetry.error, 'Learner B must not update learner A attempt.');

  const removedWrite = await removedLearner.rpc('record_prompt_attempt_and_progress', {
    p_class_id: 'b3000000-0000-4000-8000-000000000001', p_lesson_id: 'b5000000-0000-4000-8000-000000000002',
    p_prompt_text: 'Removed learner probe', p_ai_output: 'Must not persist', p_evaluation_json: valid5, p_model: 'staging-probe', p_latency_ms: 1,
  });
  assert.ok(removedWrite.error, 'Removed enrollment must be denied.');

  const wrongLesson = await learnerA.rpc('record_prompt_attempt_and_progress', {
    p_class_id: 'b3000000-0000-4000-8000-000000000001', p_lesson_id: 'b5000000-0000-4000-8000-000000000005',
    p_prompt_text: 'Wrong relationship probe', p_ai_output: 'Must not persist', p_evaluation_json: valid5, p_model: 'staging-probe', p_latency_ms: 1,
  });
  assert.ok(wrongLesson.error, 'Lesson outside the class course must be denied.');

  const invalidClass = await learnerA.rpc('record_prompt_attempt_and_progress', {
    p_class_id: 'b3000000-0000-4000-8000-999999999999', p_lesson_id: 'b5000000-0000-4000-8000-000000000001',
    p_prompt_text: 'Invalid class probe', p_ai_output: 'Must not persist', p_evaluation_json: valid5, p_model: 'staging-probe', p_latency_ms: 1,
  });
  assert.ok(invalidClass.error, 'Invalid class must be denied.');
} finally {
  if (trackedAttemptIds.length > 0) await service.from('prompt_attempts').delete().in('id', trackedAttemptIds);
  await service.from('lesson_progress').delete()
    .eq('learner_id', fixtureLearnerIds[0])
    .eq('class_id', 'b3000000-0000-4000-8000-000000000001')
    .eq('lesson_id', 'b5000000-0000-4000-8000-000000000004');
}

console.log(`Staging progress verification passed for phase ${phase}.`);
