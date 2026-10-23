DO $$ BEGIN
 IF has_table_privilege('anon','public.product_learner_support','SELECT') OR has_table_privilege('authenticated','public.product_learner_support','INSERT') THEN RAISE EXCEPTION 'Unsafe support table grant'; END IF;
 IF has_function_privilege('anon','public.product_import_roster(uuid,uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous roster import allowed'; END IF;
 BEGIN
  PERFORM public.product_unlock_support(gen_random_uuid(),gen_random_uuid(),'solution');
  RAISE EXCEPTION 'Anonymous unlock succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Anonymous unlock succeeded' THEN RAISE; END IF;
 END;
END $$;
