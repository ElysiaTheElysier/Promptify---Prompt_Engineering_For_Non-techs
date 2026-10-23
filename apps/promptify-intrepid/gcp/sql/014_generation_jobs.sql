-- Durable generation jobs. Additive; generation defaults to synchronous until explicitly enabled.
BEGIN;
CREATE TABLE public.product_generation_jobs (
 subject uuid NOT NULL, request_id uuid NOT NULL, generation integer NOT NULL DEFAULT 1,
 status text NOT NULL CHECK(status IN ('queued','generating','generated','retry_wait','failed','expired')),
 token_sha256 text NOT NULL CHECK(token_sha256 ~ '^[0-9a-f]{64}$'),
 dispatch_count integer NOT NULL DEFAULT 0, dispatch_confirmed boolean NOT NULL DEFAULT false, fence uuid, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, last_error_code text,
 PRIMARY KEY(subject,request_id), FOREIGN KEY(subject,request_id) REFERENCES public.rebuild_runs(subject,request_id)
);
CREATE INDEX ON public.product_generation_jobs(status,expires_at);
ALTER TABLE public.product_generation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_generation_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.product_generation_jobs TO service_role;
CREATE POLICY generation_service ON public.product_generation_jobs TO service_role USING(true) WITH CHECK(true);

-- Same idempotency key and existing quotas. Advisory transaction lock serializes the absent-row case.
CREATE FUNCTION public.product_enqueue_generation(p_subject uuid,p_class uuid,p_lesson uuid,p_request uuid,p_prompt text,p_snapshot jsonb,p_token_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE r public.rebuild_runs; j public.product_generation_jobs; started jsonb;
BEGIN
 IF p_token_sha !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid generation token'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('promptify-generation-backlog',14));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_subject::text||p_request::text,14));
 SELECT * INTO r FROM public.rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF r.prompt<>p_prompt OR r.class_id<>p_class OR r.lesson_id<>p_lesson OR
    (r.snapshot->'generation_settings') IS DISTINCT FROM (p_snapshot->'generation_settings') OR
    (r.snapshot->'learner_context_ids') IS DISTINCT FROM (p_snapshot->'learner_context_ids') OR
    (r.snapshot->'prompt_variable_values') IS DISTINCT FROM (p_snapshot->'prompt_variable_values') THEN RAISE EXCEPTION 'Request key conflict'; END IF;
  IF r.result IS NOT NULL THEN RETURN jsonb_build_object('status','generated','result',r.result,'created',false); END IF;
  SELECT * INTO j FROM public.product_generation_jobs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request processing or uncertain; inspect before retry'; END IF;
  IF j.expires_at<=now() AND j.status IN ('queued','retry_wait') THEN
   UPDATE public.product_generation_jobs SET status='expired',updated_at=now() WHERE subject=p_subject AND request_id=p_request;
   RETURN jsonb_build_object('status','expired','created',false);
  END IF;
  -- Recover a crash between durable SQL commit and task creation. Rotate only an undispatched queued
  -- task; a running/uncertain provider operation is never automatically replayed.
  IF j.status='queued' AND NOT j.dispatch_confirmed AND j.updated_at < now()-interval '30 seconds' THEN
   UPDATE public.product_generation_jobs SET generation=generation+1,token_sha256=p_token_sha,updated_at=now()
    WHERE subject=p_subject AND request_id=p_request RETURNING * INTO j;
   RETURN jsonb_build_object('status',j.status,'generation',j.generation,'created',true);
  END IF;
  RETURN jsonb_build_object('status',j.status,'generation',j.generation,'created',false);
 END IF;
 -- Bounds are a system overload guard, independent of the unchanged learner identity quotas.
 IF (SELECT count(*) FROM public.product_generation_jobs WHERE status IN ('queued','generating','retry_wait') AND expires_at>now())>=1000 THEN RAISE EXCEPTION 'Generation backlog full'; END IF;
 started:=public.rebuild_begin_run(p_subject,p_class,p_lesson,p_request,p_prompt,p_snapshot);
 INSERT INTO public.product_generation_jobs(subject,request_id,status,token_sha256,expires_at)
 VALUES(p_subject,p_request,'queued',p_token_sha,now()+interval '15 minutes');
 RETURN jsonb_build_object('status','queued','generation',1,'created',true);
END $$;

CREATE FUNCTION public.product_lease_generation(p_subject uuid,p_request uuid,p_token_sha text,p_fence uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE j public.product_generation_jobs; r public.rebuild_runs; sops jsonb; source jsonb;
BEGIN
 SELECT * INTO j FROM public.product_generation_jobs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF NOT FOUND OR j.token_sha256<>p_token_sha THEN RETURN jsonb_build_object('status','denied'); END IF;
 IF j.status IN ('generated','failed','expired') THEN RETURN jsonb_build_object('status',j.status); END IF;
 IF j.status='generating' THEN
  IF j.lease_until>now() THEN RETURN jsonb_build_object('status','busy'); END IF;
  UPDATE public.product_generation_jobs SET status='failed',last_error_code='provider_outcome_unknown',updated_at=now() WHERE subject=p_subject AND request_id=p_request;
  RETURN jsonb_build_object('status','failed');
 END IF;
 IF j.expires_at<=now() THEN
  UPDATE public.product_generation_jobs SET status='expired',updated_at=now() WHERE subject=p_subject AND request_id=p_request;
  RETURN jsonb_build_object('status','expired');
 END IF;
 SELECT * INTO STRICT r FROM public.rebuild_runs WHERE subject=p_subject AND request_id=p_request;
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 IF NOT public.has_active_class_enrollment(r.class_id) OR NOT EXISTS (
 SELECT 1 FROM classes c JOIN courses co ON co.id=c.course_id JOIN course_modules m ON m.course_id=co.id JOIN lessons l ON l.module_id=m.id
 WHERE c.id=r.class_id AND l.id=r.lesson_id AND c.status='active' AND co.status='active' AND co.publication_status='published' AND m.status='published' AND l.status='published') THEN
  UPDATE public.product_generation_jobs SET status='failed',last_error_code='access_revoked',updated_at=now() WHERE subject=p_subject AND request_id=p_request;
  RETURN jsonb_build_object('status','failed');
 END IF;
 sops:=public.rebuild_class_sops(r.class_id,r.lesson_id);
 FOR source IN SELECT value FROM jsonb_array_elements(coalesce(r.snapshot->'rebuild_sop_versions','[]')) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(sops) v WHERE coalesce(v->>'version_id',v->>'id')=coalesce(source->>'version_id',source->>'id')) THEN
   UPDATE public.product_generation_jobs SET status='failed',last_error_code='source_revoked',updated_at=now() WHERE subject=p_subject AND request_id=p_request;
   RETURN jsonb_build_object('status','failed');
  END IF;
 END LOOP;
 UPDATE public.product_generation_jobs SET status='generating',fence=p_fence,dispatch_count=dispatch_count+1,lease_until=now()+interval '290 seconds',updated_at=now() WHERE subject=p_subject AND request_id=p_request RETURNING * INTO j;
 RETURN jsonb_build_object('status','leased','fence',p_fence,'lease_until',j.lease_until,'dispatch_count',j.dispatch_count,'snapshot',r.snapshot,'prompt',r.prompt,'class_id',r.class_id,'lesson_id',r.lesson_id);
END $$;

-- Delayed retrieval authority is a live job fence, never an arbitrary-subject impersonation API.
-- Class/lesson and admitted versions always come from the server-frozen run.
CREATE FUNCTION public.product_generation_retrieve(p_subject uuid,p_request uuid,p_fence uuid,p_operation text,p_versions uuid[] DEFAULT '{}',p_vector jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE j public.product_generation_jobs; r public.rebuild_runs; allowed jsonb; frozen uuid[]; source jsonb;
BEGIN
 SELECT * INTO j FROM public.product_generation_jobs WHERE subject=p_subject AND request_id=p_request FOR SHARE;
 IF NOT FOUND OR j.status<>'generating' OR j.fence IS DISTINCT FROM p_fence OR j.lease_until<=now() OR j.expires_at<=now() THEN RAISE EXCEPTION 'Stale generation retrieval fence'; END IF;
 IF p_operation IS NULL OR p_operation NOT IN ('sops','search') THEN RAISE EXCEPTION 'Invalid generation retrieval operation'; END IF;
 SELECT * INTO STRICT r FROM public.rebuild_runs WHERE subject=p_subject AND request_id=p_request;
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 IF NOT public.has_active_class_enrollment(r.class_id) THEN RAISE EXCEPTION 'Generation access revoked'; END IF;
 allowed:=public.rebuild_class_sops(r.class_id,r.lesson_id);
 SELECT coalesce(array_agg(coalesce(v->>'version_id',v->>'id')::uuid),'{}'::uuid[]) INTO frozen
  FROM jsonb_array_elements(coalesce(r.snapshot->'rebuild_sop_versions','[]')) v;
 FOR source IN SELECT value FROM jsonb_array_elements(coalesce(r.snapshot->'rebuild_sop_versions','[]')) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(allowed) v WHERE coalesce(v->>'version_id',v->>'id')=coalesce(source->>'version_id',source->>'id')) THEN RAISE EXCEPTION 'Generation source revoked'; END IF;
 END LOOP;
 IF p_operation='sops' THEN RETURN allowed; END IF;
 IF p_versions IS NULL OR NOT p_versions <@ frozen THEN RAISE EXCEPTION 'Generation retrieval version scope denied'; END IF;
 RETURN public.intrepid_search_sop(r.class_id,r.lesson_id,p_versions,p_vector);
END $$;

CREATE FUNCTION public.product_freeze_generation_context(p_subject uuid,p_request uuid,p_fence uuid,p_evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE j public.product_generation_jobs; frozen jsonb; patch jsonb;
BEGIN
 SELECT * INTO j FROM public.product_generation_jobs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF NOT FOUND OR j.status<>'generating' OR j.fence IS DISTINCT FROM p_fence OR j.lease_until<=now() OR j.expires_at<=now() THEN RETURN jsonb_build_object('status','stale'); END IF;
 PERFORM public.product_generation_retrieve(p_subject,p_request,p_fence,'sops');
 IF jsonb_typeof(p_evidence->'actual_generation_context') IS DISTINCT FROM 'string' OR length(p_evidence->>'actual_generation_context')>100000 OR
  p_evidence->>'actual_generation_context_hash' IS DISTINCT FROM encode(sha256(convert_to(p_evidence->>'actual_generation_context','UTF8')),'hex') THEN RAISE EXCEPTION 'Invalid generation retrieval evidence'; END IF;
 SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO patch FROM jsonb_each(p_evidence)
  WHERE key IN ('rag_query','rag_query_policy','rag_chunks','rag_status','sample_input_context','actual_generation_context','actual_generation_context_hash');
 UPDATE public.rebuild_runs SET snapshot=snapshot||patch||jsonb_build_object('generation_rag_frozen',true)
 WHERE subject=p_subject AND request_id=p_request AND result IS NULL AND coalesce((snapshot->>'generation_rag_frozen')::boolean,false)=false
 RETURNING snapshot INTO frozen;
 IF NOT FOUND THEN SELECT snapshot INTO frozen FROM public.rebuild_runs WHERE subject=p_subject AND request_id=p_request; END IF;
 RETURN jsonb_build_object('status','frozen','snapshot',frozen);
END $$;
REVOKE ALL ON FUNCTION public.product_generation_retrieve(uuid,uuid,uuid,text,uuid[],jsonb),public.product_freeze_generation_context(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_generation_retrieve(uuid,uuid,uuid,text,uuid[],jsonb),public.product_freeze_generation_context(uuid,uuid,uuid,jsonb) TO service_role;

-- Fenced save and state transition in one transaction: an old lease cannot publish a result.
CREATE FUNCTION public.product_finish_generation(p_subject uuid,p_request uuid,p_fence uuid,p_result jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE j public.product_generation_jobs; saved jsonb;
BEGIN
 SELECT * INTO j FROM public.product_generation_jobs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF NOT FOUND OR j.status<>'generating' OR j.fence<>p_fence OR j.lease_until<=now() THEN RETURN jsonb_build_object('status','stale'); END IF;
 saved:=public.rebuild_finish_run(p_subject,p_request,p_result);
 UPDATE public.product_generation_jobs SET status='generated',lease_until=NULL,updated_at=now() WHERE subject=p_subject AND request_id=p_request;
 RETURN jsonb_build_object('status','generated','saved',saved);
END $$;
CREATE FUNCTION public.product_fail_generation(p_subject uuid,p_request uuid,p_fence uuid,p_retry boolean,p_error text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
 UPDATE public.product_generation_jobs SET status=CASE WHEN p_retry AND dispatch_count<3 AND expires_at>now() THEN 'retry_wait' ELSE 'failed' END,
  lease_until=NULL,last_error_code=left(p_error,64),updated_at=now()
 WHERE subject=p_subject AND request_id=p_request AND status='generating' AND fence=p_fence AND lease_until>now();
 RETURN jsonb_build_object('status',CASE WHEN FOUND THEN 'settled' ELSE 'stale' END);
END $$;
CREATE FUNCTION public.product_confirm_generation_dispatch(p_subject uuid,p_request uuid,p_generation integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
 UPDATE public.product_generation_jobs SET dispatch_confirmed=true
 WHERE subject=p_subject AND request_id=p_request AND generation=p_generation;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.product_confirm_generation_dispatch(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_confirm_generation_dispatch(uuid,uuid,integer) TO service_role;

-- Database time controls expiry. Status polling also closes expired worker leases without a provider replay.
CREATE FUNCTION public.product_generation_status(p_subject uuid,p_request uuid,p_class uuid,p_lesson uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE r public.rebuild_runs; j public.product_generation_jobs;
BEGIN
 SELECT * INTO r FROM public.rebuild_runs WHERE subject=p_subject AND request_id=p_request AND class_id=p_class AND lesson_id=p_lesson;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 IF r.result IS NOT NULL THEN
  RETURN jsonb_build_object('status',CASE
   WHEN EXISTS(SELECT 1 FROM public.prompt_attempts WHERE id=r.attempt_id AND evaluation_json IS NOT NULL) THEN 'completed'
   WHEN EXISTS(SELECT 1 FROM public.product_judge_jobs WHERE attempt_id=r.attempt_id AND status IN ('queued','running','retry_wait') AND expires_at>now()) THEN 'judging'
   ELSE 'generated' END,'result',r.result);
 END IF;
 SELECT * INTO j FROM public.product_generation_jobs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 IF j.status='generating' AND j.lease_until<=now() THEN
  UPDATE public.product_generation_jobs SET status='failed',last_error_code='provider_outcome_unknown',updated_at=now() WHERE subject=p_subject AND request_id=p_request RETURNING * INTO j;
 ELSIF j.status IN ('queued','retry_wait') AND j.expires_at<=now() THEN
  UPDATE public.product_generation_jobs SET status='expired',updated_at=now() WHERE subject=p_subject AND request_id=p_request RETURNING * INTO j;
 END IF;
 RETURN jsonb_build_object('status',j.status,'errorCode',j.last_error_code,'recoverDispatch',j.status='queued' AND NOT j.dispatch_confirmed AND j.updated_at<now()-interval '30 seconds');
END $$;
REVOKE ALL ON FUNCTION public.product_generation_status(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_generation_status(uuid,uuid,uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.product_enqueue_generation(uuid,uuid,uuid,uuid,text,jsonb,text),public.product_lease_generation(uuid,uuid,text,uuid),public.product_finish_generation(uuid,uuid,uuid,jsonb),public.product_fail_generation(uuid,uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_enqueue_generation(uuid,uuid,uuid,uuid,text,jsonb,text),public.product_lease_generation(uuid,uuid,text,uuid),public.product_finish_generation(uuid,uuid,uuid,jsonb),public.product_fail_generation(uuid,uuid,uuid,boolean,text) TO service_role;
COMMIT;
