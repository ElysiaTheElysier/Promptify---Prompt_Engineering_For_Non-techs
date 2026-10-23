DO $$ BEGIN
 IF has_column_privilege('authenticated','public.lessons','hints','SELECT') OR has_column_privilege('authenticated','public.lessons','improved_prompt','SELECT') OR has_column_privilege('authenticated','public.lessons','system_instruction','SELECT') THEN RAISE EXCEPTION 'Private teaching columns remain readable'; END IF;
 IF NOT has_column_privilege('authenticated','public.lessons','id','SELECT') OR NOT has_column_privilege('authenticated','public.lessons','module_id','SELECT') THEN RAISE EXCEPTION 'Authorization identifiers unavailable'; END IF;
 IF has_table_privilege('authenticated','public.product_sandbox_runs','SELECT') OR has_table_privilege('anon','public.product_sandbox_runs','INSERT') THEN RAISE EXCEPTION 'Sandbox persistence exposed'; END IF;
END $$;
