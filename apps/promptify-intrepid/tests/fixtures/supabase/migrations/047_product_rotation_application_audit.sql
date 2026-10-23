BEGIN;
CREATE FUNCTION public.product_finish_rotation(p_request uuid,p_fingerprint text,p_deployment text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE request public.product_rotation_requests;
BEGIN
 IF coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Operator service role required'; END IF;
 IF p_deployment !~ '^https://promptify-rebuild-[a-z0-9-]+[.]vercel[.]app$' THEN RAISE EXCEPTION 'Verified deployment URL required'; END IF;
 SELECT * INTO STRICT request FROM public.product_rotation_requests WHERE id=p_request FOR UPDATE;
 IF request.status<>'approved' OR request.source_fingerprint<>p_fingerprint OR (SELECT count(DISTINCT user_id) FROM public.product_rotation_approvals WHERE request_id=p_request)<2 THEN RAISE EXCEPTION 'Two current approvals required'; END IF;
 UPDATE public.product_rotation_requests SET status='applied',applied_at=now(),deployment_id=p_deployment WHERE id=p_request;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(request.class_id,request.requested_by,'credential.rotation.applied',p_request::text||' / '||p_deployment);
END $$;
REVOKE ALL ON FUNCTION public.product_finish_rotation(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_finish_rotation(uuid,text,text) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
