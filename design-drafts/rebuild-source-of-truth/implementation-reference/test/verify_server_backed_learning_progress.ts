import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile('supabase/migrations/016_add_server_backed_lesson_progress.sql', 'utf8');
const enforcementMigration = await readFile('supabase/migrations/017_enforce_atomic_progress_writes.sql', 'utf8');
const app = await readFile('src/App.tsx', 'utf8');
const hybrid = await readFile('src/components/hybrid/HybridView.tsx', 'utf8');
const db = await readFile('src/services/dbService.ts', 'utf8');
const instructor = await readFile('src/components/instructor/InstructorViewShell.tsx', 'utf8');
const rollback = await readFile('supabase/rollback_016_add_server_backed_lesson_progress.sql', 'utf8');
const enforcementRollback = await readFile('supabase/rollback_017_enforce_atomic_progress_writes.sql', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.lesson_progress/);
assert.match(migration, /UNIQUE \(learner_id, class_id, lesson_id\)/);
assert.match(migration, /record_prompt_attempt_and_progress/);
assert.match(migration, /SECURITY DEFINER SET search_path = public, pg_temp/);
assert.match(migration, /public\.current_user_id\(\)/);
assert.match(migration, /public\.has_active_class_enrollment\(p_class_id\)/);
assert.match(migration, /JOIN public\.course_modules/);
assert.match(migration, /JOIN public\.lessons/);
assert.match(migration, /INSERT INTO public\.prompt_attempts/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.sync_lesson_progress_from_prompt_attempt/);
assert.match(migration, /CREATE TRIGGER trg_sync_prompt_attempt_progress_insert/);
assert.match(migration, /CREATE TRIGGER trg_sync_prompt_attempt_progress_evaluation/);
assert.ok(
  migration.indexOf('CREATE TRIGGER trg_sync_prompt_attempt_progress_insert') < migration.indexOf('-- Backfill only deterministic mappings'),
  'Compatibility trigger must exist before historical backfill',
);
assert.match(migration, /ON CONFLICT \(learner_id, class_id, lesson_id\) DO UPDATE/);
assert.match(migration, /attempts_count = public\.lesson_progress\.attempts_count \+ 1/);
assert.match(migration, /last_attempt_id = NEW\.id/);
assert.match(migration, /greatest\(public\.lesson_progress\.best_score, valid_score\)/);
assert.match(migration, /status = 'completed'/);
assert.match(migration, /valid_evaluation_total/);
assert.match(migration, /jsonb_typeof\(payload -> 'total'\) <> 'number'/);
assert.match(migration, /declared_total <> score_total/);
assert.match(migration, /HAVING count\(DISTINCT canonical_lesson_id\) = 1/);
assert.match(migration, /REVOKE ALL ON TABLE public\.lesson_progress FROM PUBLIC, anon/);
assert.match(migration, /GRANT SELECT ON TABLE public\.lesson_progress TO authenticated/);
assert.match(migration, /AND public\.has_active_class_enrollment\(class_id\)/);
assert.doesNotMatch(migration, /REVOKE (?:INSERT|UPDATE).*public\.prompt_attempts/);
assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE).*lesson_progress.*authenticated/);
assert.match(rollback, /DROP TABLE IF EXISTS public\.lesson_progress/);
assert.match(rollback, /DROP TRIGGER IF EXISTS trg_sync_prompt_attempt_progress_insert/);
assert.doesNotMatch(rollback, /DELETE FROM public\.prompt_attempts|DROP TABLE IF EXISTS public\.prompt_attempts/);
assert.doesNotMatch(rollback, /(?:GRANT|REVOKE).*public\.prompt_attempts/);
assert.match(enforcementMigration, /REVOKE INSERT, UPDATE ON TABLE public\.prompt_attempts FROM authenticated/);
assert.doesNotMatch(enforcementMigration, /REVOKE (?:SELECT|DELETE).*public\.prompt_attempts/);
assert.match(enforcementRollback, /GRANT INSERT, UPDATE ON TABLE public\.prompt_attempts TO authenticated/);
assert.doesNotMatch(enforcementRollback, /GRANT (?:SELECT|DELETE).*public\.prompt_attempts/);

const createRpc = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.record_prompt_attempt_and_progress'),
  migration.indexOf('CREATE OR REPLACE FUNCTION public.update_prompt_attempt_evaluation_and_progress'),
);
const retryRpc = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.update_prompt_attempt_evaluation_and_progress'),
  migration.indexOf('REVOKE ALL ON FUNCTION public.record_prompt_attempt_and_progress'),
);
assert.doesNotMatch(createRpc, /INSERT INTO public\.lesson_progress/, 'Create RPC must rely exclusively on the trigger');
assert.doesNotMatch(retryRpc, /UPDATE public\.lesson_progress/, 'Retry RPC must rely exclusively on the trigger');

// Browser storage may be cleaned up, but must never be read/written as truth.
assert.doesNotMatch(app, /localStorage\.getItem\('promptify_enrollments'\)/);
assert.doesNotMatch(app, /localStorage\.setItem\('promptify_enrollments'/);
assert.match(app, /dbService\.getLessonProgress/);
assert.doesNotMatch(app, /completedLabIds:\s*\['lab-1'\]/);

const atomicSaveIndex = hybrid.indexOf('recordPromptAttemptAndProgress');
const completionCallbackIndex = hybrid.indexOf('onRecordRun({', atomicSaveIndex);
assert.ok(atomicSaveIndex >= 0, 'HybridView must use the atomic attempt/progress RPC adapter');
assert.ok(completionCallbackIndex > atomicSaveIndex, 'Completion callback must happen after atomic save confirmation');

assert.match(db, /\.rpc\('record_prompt_attempt_and_progress'/);
assert.match(db, /\.rpc\('update_prompt_attempt_evaluation_and_progress'/);
assert.match(db, /\.from\('lesson_progress'\)/);
assert.match(instructor, /getInstructorLessonProgress/);
assert.match(instructor, /progress\.status === 'completed'/);
assert.match(instructor, /learner\.enrollment_status === 'completed'/);

console.log('Server-backed learning progress contract verification passed.');
