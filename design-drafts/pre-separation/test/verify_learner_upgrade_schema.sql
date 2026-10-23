DO $$ BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.product_prompt_library'::regclass) OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.product_learner_context'::regclass) THEN RAISE EXCEPTION 'RLS missing'; END IF;
 IF has_table_privilege('authenticated','public.product_prompt_library','SELECT') OR has_table_privilege('anon','public.product_learner_context','SELECT') OR has_table_privilege('authenticated','public.product_learner_context','INSERT') THEN RAISE EXCEPTION 'Private library/context directly exposed'; END IF;
 IF has_function_privilege('authenticated','public.product_unlock_support(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Legacy reflection bypass'; END IF;
 IF NOT has_function_privilege('authenticated','public.product_unlock_support_reflected(uuid,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Reflected support unavailable'; END IF;
 BEGIN PERFORM public.product_unlock_support_reflected(NULL,NULL,'solution','short'); RAISE EXCEPTION 'Missing reflection accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Reflection required' THEN RAISE; END IF; END;
END $$;
