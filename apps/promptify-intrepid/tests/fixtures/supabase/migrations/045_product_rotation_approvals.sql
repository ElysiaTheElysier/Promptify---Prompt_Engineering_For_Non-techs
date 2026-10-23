BEGIN;
CREATE TABLE public.product_rotation_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES public.classes,
 provider text NOT NULL CHECK(provider IN ('gemini','sheets')),source_fingerprint text NOT NULL CHECK(source_fingerprint ~ '^[a-f0-9]{64}$'),
 requested_by uuid NOT NULL REFERENCES public.users,reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 1000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','applied','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),applied_at timestamptz, deployment_id text
);
CREATE TABLE public.product_rotation_approvals(request_id uuid NOT NULL REFERENCES public.product_rotation_requests,user_id uuid NOT NULL REFERENCES public.users,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(request_id,user_id));
ALTER TABLE public.product_rotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_rotation_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_rotation_requests,public.product_rotation_approvals FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_rotation_requests,public.product_rotation_approvals TO service_role;
CREATE FUNCTION public.product_request_rotation(p_class uuid,p_provider text,p_fingerprint text,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE request uuid;BEGIN
 IF NOT public.product_can_manage(p_class) OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'Administrator required';END IF;
 INSERT INTO public.product_rotation_requests(class_id,provider,source_fingerprint,requested_by,reason) VALUES(p_class,p_provider,p_fingerprint,public.current_user_id(),p_reason) RETURNING id INTO request;
 INSERT INTO public.product_rotation_approvals(request_id,user_id) VALUES(request,public.current_user_id());
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'credential.rotation.request',p_provider||' / '||request);
 RETURN request;
END $$;
CREATE FUNCTION public.product_approve_rotation(p_request uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE request public.product_rotation_requests;BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'Administrator required';END IF;
 SELECT * INTO STRICT request FROM public.product_rotation_requests WHERE id=p_request FOR UPDATE;
 IF NOT public.product_can_manage(request.class_id) OR request.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Rotation is not awaiting approval';END IF;
 INSERT INTO public.product_rotation_approvals(request_id,user_id) VALUES(p_request,public.current_user_id()) ON CONFLICT DO NOTHING;
 IF (SELECT count(*) FROM public.product_rotation_approvals WHERE request_id=p_request)>=2 THEN UPDATE public.product_rotation_requests SET status='approved' WHERE id=p_request RETURNING * INTO request; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(request.class_id,public.current_user_id(),'credential.rotation.approve',p_request::text);
 RETURN request.status;
END $$;
REVOKE ALL ON FUNCTION public.product_request_rotation(uuid,text,text,text),public.product_approve_rotation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_request_rotation(uuid,text,text,text),public.product_approve_rotation(uuid) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
