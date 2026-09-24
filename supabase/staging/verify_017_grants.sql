-- Run after migration 017 on staging. Read-only catalog assertions.
DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.prompt_attempts', 'INSERT')
     OR has_table_privilege('authenticated', 'public.prompt_attempts', 'UPDATE') THEN
    RAISE EXCEPTION '017 did not revoke direct INSERT/UPDATE';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.prompt_attempts', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.prompt_attempts', 'DELETE') THEN
    RAISE EXCEPTION '017 changed unrelated pre-existing grants';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.record_prompt_attempt_and_progress(uuid,uuid,text,text,jsonb,text,integer)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.update_prompt_attempt_evaluation_and_progress(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'RPC grants are unavailable after 017';
  END IF;
END $$;
