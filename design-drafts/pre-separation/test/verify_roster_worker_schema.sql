BEGIN;
DO $$
DECLARE cid uuid; actor uuid; connection uuid; task jsonb; outcome jsonb; nonce uuid:=gen_random_uuid();
BEGIN
 IF has_function_privilege('authenticated','public.product_claim_roster_sync()','EXECUTE')
 OR has_function_privilege('anon','public.product_finish_roster_sync(uuid,jsonb,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.product_dispatch_roster_worker()','EXECUTE') THEN RAISE EXCEPTION 'Worker privilege leak'; END IF;
 IF NOT public.product_accept_worker_invocation(nonce) OR public.product_accept_worker_invocation(nonce) THEN RAISE EXCEPTION 'Replay guard failed'; END IF;
 SELECT id INTO STRICT cid FROM public.classes WHERE class_code='QA-PRODUCTION-classA';
 SELECT id INTO STRICT actor FROM public.users WHERE email='duonglh.work@gmail.com' AND auth_provider_id IS NOT NULL;
 IF EXISTS(SELECT 1 FROM public.product_sheet_connections WHERE auto_sync) THEN RAISE EXCEPTION 'Run isolated QA before real automatic connections exist'; END IF;
 INSERT INTO public.product_sheet_connections(class_id,sheet_id,name,column_mapping,created_by,auto_sync)
 VALUES(cid,'QA_WORKER_ROLLBACK','QA worker rollback','{}',actor,false) RETURNING id INTO connection;
 IF public.product_claim_roster_sync() IS NOT NULL THEN RAISE EXCEPTION 'Disabled connection claimed'; END IF;
 UPDATE public.product_sheet_connections SET auto_sync=true WHERE id=connection;
 task:=public.product_claim_roster_sync();
 IF task IS NULL OR public.product_claim_roster_sync() IS NOT NULL THEN RAISE EXCEPTION 'Exclusive claim failed'; END IF;
 outcome:=public.product_finish_roster_sync((task->>'logId')::uuid,NULL,'qa_read_failure');
 IF outcome->>'status'<>'failed' THEN RAISE EXCEPTION 'Failure was not recorded'; END IF;
 IF public.product_claim_roster_sync() IS NOT NULL THEN RAISE EXCEPTION 'Retry interval not respected'; END IF;
 UPDATE public.product_sheet_connections SET last_attempt_at='epoch' WHERE id=connection;
 task:=public.product_claim_roster_sync();
 outcome:=public.product_finish_roster_sync((task->>'logId')::uuid,jsonb_build_array(jsonb_build_object(
 'email','qa-worker-rollback@example.invalid','fullName','QA worker rollback','country','QA',
 'department',(SELECT department FROM public.classes WHERE id=cid))),NULL);
 IF (outcome->>'processed')::integer<>1 OR NOT EXISTS(SELECT 1 FROM public.product_sync_logs WHERE id=(task->>'logId')::uuid AND status='success') THEN RAISE EXCEPTION 'Worker import failed'; END IF;
 IF public.product_finish_roster_sync((task->>'logId')::uuid,NULL,NULL)<>outcome THEN RAISE EXCEPTION 'Finish replay changed result'; END IF;
END $$;
ROLLBACK;
