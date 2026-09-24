-- Rollback for migration 016.
-- Use only while production application code does not depend on lesson_progress.
-- This intentionally preserves every row in public.prompt_attempts.

BEGIN;

DROP FUNCTION IF EXISTS public.update_prompt_attempt_evaluation_and_progress(UUID, JSONB);
DROP FUNCTION IF EXISTS public.record_prompt_attempt_and_progress(UUID, UUID, TEXT, TEXT, JSONB, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.valid_evaluation_total(JSONB);
DROP TABLE IF EXISTS public.lesson_progress;

COMMIT;
NOTIFY pgrst, 'reload schema';
