BEGIN;
ALTER TABLE public.product_sheet_connections ADD COLUMN auto_sync boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_sheet_connections ADD COLUMN last_attempt_at timestamptz;

CREATE FUNCTION public.product_claim_roster_sync() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE conn public.product_sheet_connections; log_id uuid; request_id uuid:=gen_random_uuid();
BEGIN
 UPDATE public.product_sync_logs SET status='failed',error_code='worker_timeout',finished_at=now()
 WHERE status='running' AND created_at<now()-interval '5 minutes';
 SELECT s.* INTO conn FROM public.product_sheet_connections s JOIN public.classes c ON c.id=s.class_id
 JOIN public.users u ON u.id=s.created_by
 WHERE s.auto_sync AND c.status IN ('active','upcoming') AND u.auth_provider_id IS NOT NULL
 AND coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz)<now()-interval '15 minutes'
 AND NOT EXISTS(SELECT 1 FROM public.product_sync_logs l WHERE l.connection_id=s.id AND l.status='running')
 ORDER BY coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz),s.id
 LIMIT 1 FOR UPDATE OF s SKIP LOCKED;
 IF conn.id IS NULL THEN RETURN NULL; END IF;
 UPDATE public.product_sheet_connections SET last_attempt_at=now() WHERE id=conn.id;
 INSERT INTO public.product_sync_logs(connection_id,class_id,actor_id,request_id,status)
 VALUES(conn.id,conn.class_id,conn.created_by,request_id,'running') RETURNING id INTO log_id;
 RETURN jsonb_build_object('logId',log_id,'sheetId',conn.sheet_id,'mapping',conn.column_mapping,
 'department',(SELECT department FROM public.classes WHERE id=conn.class_id));
END $$;

CREATE FUNCTION public.product_finish_roster_sync(p_log uuid,p_rows jsonb,p_error text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry public.product_sync_logs; subject uuid; imported jsonb;
BEGIN
 SELECT * INTO STRICT entry FROM public.product_sync_logs WHERE id=p_log FOR UPDATE;
 IF entry.status<>'running' THEN RETURN entry.result; END IF;
 IF p_error IS NOT NULL THEN
  UPDATE public.product_sync_logs SET status='failed',error_code=left(p_error,80),finished_at=now() WHERE id=p_log;
  RETURN jsonb_build_object('status','failed');
 END IF;
 SELECT auth_provider_id INTO STRICT subject FROM public.users WHERE id=entry.actor_id;
 IF subject IS NULL THEN RAISE EXCEPTION 'Verified connection owner required'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
 -- Preserve the existing editor, department, active-class and domain checks.
 imported:=public.product_import_roster(entry.class_id,entry.request_id,p_rows);
 UPDATE public.product_sheet_connections SET status='synced',last_synced_at=now() WHERE id=entry.connection_id;
 UPDATE public.product_sync_logs SET status='success',processed=(imported->>'processed')::integer,
 result=imported,finished_at=now() WHERE id=p_log;
 RETURN imported;
END $$;
CREATE FUNCTION public.product_set_sheet_auto_sync(p_class uuid,p_connection uuid,p_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 UPDATE public.product_sheet_connections SET auto_sync=p_enabled,created_by=public.current_user_id(),last_attempt_at=NULL
 WHERE id=p_connection AND class_id=p_class;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scoped connection required'; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason)
 VALUES(p_class,public.current_user_id(),'roster.auto_sync',p_connection||' / '||p_enabled);
END $$;
REVOKE ALL ON FUNCTION public.product_claim_roster_sync(),public.product_finish_roster_sync(uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_claim_roster_sync(),public.product_finish_roster_sync(uuid,jsonb,text) TO service_role;
REVOKE ALL ON FUNCTION public.product_set_sheet_auto_sync(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_set_sheet_auto_sync(uuid,uuid,boolean) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
