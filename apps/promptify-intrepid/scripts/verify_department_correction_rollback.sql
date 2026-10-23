-- Explicit live verification: all test rows and membership changes roll back.
BEGIN;
DO $$
DECLARE actor uuid:=gen_random_uuid(); subject uuid:=gen_random_uuid(); tenant uuid:=gen_random_uuid(); course uuid:=gen_random_uuid();
 learner uuid:=gen_random_uuid(); source uuid:=gen_random_uuid(); target uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); saved jsonb; again jsonb;
BEGIN
 INSERT INTO public.users(id,email,full_name,role,auth_provider_id) VALUES(actor,'rollback-'||actor::text||'@example.test','Rollback Test','learner',subject::text);
 INSERT INTO public.learners(id,user_id) VALUES(learner,actor);
 INSERT INTO public.clients(id,name,industry) VALUES(tenant,'Rollback Test Client','Testing');
 INSERT INTO public.courses(id,title,publication_status) VALUES(course,'Rollback Test Course','published');
 INSERT INTO public.classes(id,class_code,course_id,client_id,department,start_date,end_date,status) VALUES
 (source,'ROLLBACK-'||source::text,course,tenant,'Tech',now(),now()+interval '30 days','active'),
 (target,'ROLLBACK-'||target::text,course,tenant,'Functions',now(),now()+interval '30 days','active');
 INSERT INTO public.enrollments(learner_id,class_id) VALUES(learner,source);
 PERFORM set_config('request.jwt.claim.sub',subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject,'email','rollback-'||actor::text||'@example.test','role','authenticated')::text,true);
 saved:=public.product_auto_correct_department(request,source,'Functions','Sync mismatch','Rollback Test');
 IF saved->>'classId'<>target::text OR saved->>'autoApproved'<>'true' THEN RAISE EXCEPTION 'Target approval failed'; END IF;
 IF NOT public.product_can_read_class(target) OR public.product_can_read_class(source) THEN RAISE EXCEPTION 'Membership transition failed'; END IF;
 again:=public.product_auto_correct_department(request,source,'Functions','Sync mismatch','Rollback Test');
 IF again<>saved THEN RAISE EXCEPTION 'Idempotency failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.product_profile_corrections WHERE user_id=actor AND request_id=request AND auto_approved AND status='resolved' AND assigned_department='Tech' AND requested_department='Functions') THEN RAISE EXCEPTION 'Audit log missing'; END IF;
 saved:=public.product_auto_correct_department(gen_random_uuid(),target,'Functions Operations','New department name','Rollback Test');
 IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=(saved->>'classId')::uuid AND client_id=tenant AND department='Functions Operations') THEN RAISE EXCEPTION 'Custom department scope failed'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS' AS auto_approval_rollback_test;
