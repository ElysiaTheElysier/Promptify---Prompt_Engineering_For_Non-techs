DO $$ DECLARE score numeric; name text; BEGIN
 score:=public.valid_evaluation_total('{"contract":"weighted-v1","total":5,"criteria":[{"key":"groundedness","score":1.5,"max":3},{"key":"persona","score":1,"max":2},{"key":"format","score":1,"max":2},{"key":"oneshot","score":0.75,"max":1.5},{"key":"actionability","score":0.75,"max":1.5}]}'::jsonb);
 IF score IS DISTINCT FROM 5 THEN RAISE EXCEPTION 'Weighted total failed'; END IF;
 score:=public.valid_evaluation_total('{"contract":"weighted-v1","total":10,"criteria":[{"key":"groundedness","score":1,"max":10}]}'::jsonb);
 IF score IS NOT NULL THEN RAISE EXCEPTION 'Forged total accepted'; END IF;
 score:=public.valid_evaluation_total('{"contract":"weighted-v1","total":10,"criteria":[{"key":"groundedness","score":5,"max":5},{"key":"groundedness","score":5,"max":5}]}'::jsonb);
 IF score IS NOT NULL THEN RAISE EXCEPTION 'Duplicate criterion accepted'; END IF;
 FOREACH name IN ARRAY ARRAY['product_class_grants','product_studio','product_session_controls','product_sheet_connections','product_profile_corrections','product_audit'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=name AND c.relrowsecurity) THEN RAISE EXCEPTION 'RLS disabled: %',name; END IF;
  IF has_table_privilege('anon','public.'||name,'SELECT') OR has_table_privilege('authenticated','public.'||name,'INSERT') THEN RAISE EXCEPTION 'Unsafe direct table grant: %',name; END IF;
 END LOOP;
 IF has_function_privilege('anon','public.product_save_studio(uuid,uuid,integer,jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous Studio access'; END IF;
 IF public.product_can_manage(gen_random_uuid()) THEN RAISE EXCEPTION 'Unauthenticated management accepted'; END IF;
END $$;
