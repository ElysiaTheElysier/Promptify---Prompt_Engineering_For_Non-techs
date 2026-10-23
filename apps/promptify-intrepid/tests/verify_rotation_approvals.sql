-- Rollback-only verification; QA administrator is not retained.
DO $$ DECLARE actor text; reviewer uuid; reviewer_subject uuid:=gen_random_uuid(); cohort uuid; request uuid; status text; BEGIN
 SELECT auth_provider_id INTO STRICT actor FROM public.users WHERE email='duonglh.work@gmail.com';
 SELECT id INTO STRICT cohort FROM public.classes WHERE class_code='QA-PRODUCTION-classA';
 INSERT INTO public.users(email,full_name,role,auth_provider_id) VALUES('qa-rotation-rollback@example.invalid','QA rotation rollback','admin',reviewer_subject::text) RETURNING id INTO reviewer;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 request:=public.product_request_rotation(cohort,'gemini',repeat('a',64),'QA ONLY rollback');
 status:=public.product_approve_rotation(request);
 IF status<>'pending' OR (SELECT count(*) FROM public.product_rotation_approvals WHERE request_id=request)<>1 THEN RAISE EXCEPTION 'One administrator approved twice'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',reviewer_subject,'role','authenticated')::text,true);
 status:=public.product_approve_rotation(request);
 IF status<>'approved' THEN RAISE EXCEPTION 'Second administrator approval failed'; END IF;
 IF (SELECT applied_at FROM public.product_rotation_requests WHERE id=request) IS NOT NULL THEN RAISE EXCEPTION 'Approval was falsely marked applied'; END IF;
END $$;
