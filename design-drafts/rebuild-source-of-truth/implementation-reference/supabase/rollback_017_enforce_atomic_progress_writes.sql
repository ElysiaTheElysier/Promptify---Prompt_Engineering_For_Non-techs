-- Rollback for migration 017.
-- Restores exactly the INSERT and UPDATE table grants removed by 017. Existing
-- SELECT/DELETE grants and all historical prompt_attempts remain untouched.

BEGIN;

GRANT INSERT, UPDATE ON TABLE public.prompt_attempts TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
