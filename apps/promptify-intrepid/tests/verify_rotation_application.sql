DO $$ DECLARE actor text; cohort uuid; request uuid; reviewer uuid; BEGIN
 SELECT auth_provider_id INTO STRICT actor FROM public.users WHERE email='duonglh.work@gmail.com';
 SELECT id INTO STRICT cohort FROM public.classes WHERE class_code='QA-PRODUCTION-classA';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 request:=public.product_request_rotation(cohort,'gemini',repeat('a',64),'QA ONLY rollback application');
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 BEGIN
  PERFORM public.product_finish_rotation(request,repeat('a',64),'https://promptify-rebuild-qa.vercel.app');
  RAISE EXCEPTION 'Missing second approval accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Missing second approval accepted' THEN RAISE; END IF; END;
 INSERT INTO public.users(email,full_name,role) VALUES('qa-apply-rotation@example.invalid','QA rollback','admin') RETURNING id INTO reviewer;
 INSERT INTO public.product_rotation_approvals(request_id,user_id) VALUES(request,reviewer);
 UPDATE public.product_rotation_requests SET status='approved' WHERE id=request;
 PERFORM public.product_finish_rotation(request,repeat('a',64),'https://promptify-rebuild-qa.vercel.app');
 IF NOT EXISTS(SELECT 1 FROM public.product_rotation_requests WHERE id=request AND status='applied' AND applied_at IS NOT NULL) OR NOT EXISTS(SELECT 1 FROM public.product_audit WHERE action='credential.rotation.applied' AND reason LIKE request::text||'%') THEN RAISE EXCEPTION 'Application audit missing'; END IF;
END $$;
