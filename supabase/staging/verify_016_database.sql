-- Run in the staging SQL editor after fixture + migration 016.
-- Every probe runs in one transaction and is rolled back at the end.

BEGIN;

DO $$
DECLARE
  fixture_attempts INTEGER;
  fixture_progress INTEGER;
BEGIN
  IF to_regclass('public.lesson_progress') IS NULL THEN
    RAISE EXCEPTION 'lesson_progress table is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.lesson_progress'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'lesson_progress RLS is not enabled';
  END IF;
  IF to_regclass('public.idx_lesson_progress_learner_class') IS NULL
     OR to_regclass('public.idx_lesson_progress_class_lesson') IS NULL THEN
    RAISE EXCEPTION 'lesson_progress indexes are missing';
  END IF;
  IF to_regprocedure('public.record_prompt_attempt_and_progress(uuid,uuid,text,text,jsonb,text,integer)') IS NULL
     OR to_regprocedure('public.update_prompt_attempt_evaluation_and_progress(uuid,jsonb)') IS NULL
     OR to_regprocedure('public.valid_evaluation_total(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'one or more migration 016 functions are missing';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.record_prompt_attempt_and_progress(uuid,uuid,text,text,jsonb,text,integer)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.update_prompt_attempt_evaluation_and_progress(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated RPC execute grant is missing';
  END IF;
  IF has_function_privilege('anon', 'public.record_prompt_attempt_and_progress(uuid,uuid,text,text,jsonb,text,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon unexpectedly has atomic RPC execute permission';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.prompt_attempts', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.prompt_attempts', 'UPDATE') THEN
    RAISE EXCEPTION 'migration 016 broke old-code prompt_attempts grants';
  END IF;
  IF has_table_privilege('authenticated', 'public.lesson_progress', 'INSERT')
     OR has_table_privilege('authenticated', 'public.lesson_progress', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated unexpectedly has direct lesson_progress write grants';
  END IF;

  SELECT count(*) INTO fixture_attempts
  FROM public.prompt_attempts
  WHERE id::TEXT LIKE 'b9000000-0000-4000-8000-%';
  IF fixture_attempts <> 9 THEN RAISE EXCEPTION 'expected 9 fixture attempts, got %', fixture_attempts; END IF;

  SELECT count(*) INTO fixture_progress
  FROM public.lesson_progress
  WHERE learner_id::TEXT LIKE 'b7000000-0000-4000-8000-%';
  IF fixture_progress <> 7 THEN RAISE EXCEPTION 'expected 7 fixture progress rows, got %', fixture_progress; END IF;
END $$;

-- Force the progress part of the RPC to fail. PL/pgSQL exception handling uses
-- a subtransaction, so a leaked attempt proves the RPC is not atomic.
CREATE OR REPLACE FUNCTION pg_temp.reject_progress_write()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'intentional staging progress failure';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staging_reject_progress_write
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_progress_write();

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000001","email":"learner.a@promptify-staging.invalid","role":"authenticated"}',
  true
);

DO $$
BEGIN
  BEGIN
    PERFORM public.record_prompt_attempt_and_progress(
      'b3000000-0000-4000-8000-000000000001',
      'b5000000-0000-4000-8000-000000000004',
      'staging-atomicity-probe',
      'must roll back',
      '{"scores":{"taskCompletion":1,"groundedness":1,"formatAdherence":1,"constraintCompliance":1,"businessUsability":1},"total":5,"strengths":[],"improvements":[],"nextHint":"Synthetic"}',
      'staging-probe',
      1
    );
    RAISE EXCEPTION 'atomic RPC unexpectedly succeeded while progress trigger rejected the write';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'atomic RPC unexpectedly succeeded while progress trigger rejected the write' THEN RAISE; END IF;
      IF SQLERRM NOT LIKE '%intentional staging progress failure%' THEN RAISE; END IF;
  END;

  IF EXISTS (SELECT 1 FROM public.prompt_attempts WHERE prompt_text = 'staging-atomicity-probe') THEN
    RAISE EXCEPTION 'atomicity failure: prompt_attempt survived failed progress write';
  END IF;
END $$;

DROP TRIGGER staging_reject_progress_write ON public.lesson_progress;

ROLLBACK;

-- Expected result: script completes with ROLLBACK and no exception.
