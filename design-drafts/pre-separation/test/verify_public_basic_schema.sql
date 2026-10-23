BEGIN;
DO $$
DECLARE subject uuid:=gen_random_uuid(); cohort uuid; learner uuid; lesson uuid; request uuid:=gen_random_uuid(); blocked boolean:=false; n integer;
BEGIN
 IF has_function_privilege('authenticated','public.product_enroll_basic(uuid,text)','EXECUTE') OR has_function_privilege('anon','public.product_enroll_basic(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Public provisioning RPC exposed'; END IF;
 cohort:=public.product_enroll_basic(subject,'qa-basic-rollback@example.invalid');
 IF public.product_enroll_basic(subject,'qa-basic-rollback@example.invalid')<>cohort THEN RAISE EXCEPTION 'Enrollment not idempotent'; END IF;
 SELECT l.id INTO STRICT learner FROM public.learners l JOIN public.users u ON u.id=l.user_id WHERE u.email='qa-basic-rollback@example.invalid' AND u.role='learner';
 IF (SELECT count(*) FROM public.enrollments WHERE class_id=cohort AND learner_id=learner)<>1 THEN RAISE EXCEPTION 'Duplicate enrollment'; END IF;
 SELECT l.id INTO lesson FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=cohort ORDER BY l.position LIMIT 1;
 IF lesson IS NULL OR (SELECT count(*) FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=cohort AND l.status='published')<>5 THEN RAISE EXCEPTION 'Five published Basic labs required'; END IF;
 FOR n IN 1..10 LOOP INSERT INTO public.rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(subject,CASE WHEN n=1 THEN request ELSE gen_random_uuid() END,cohort,lesson,'QA quota rollback','{}'); END LOOP;
 INSERT INTO public.rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(subject,request,cohort,lesson,'QA quota rollback','{}') ON CONFLICT DO NOTHING;
 BEGIN INSERT INTO public.rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(subject,gen_random_uuid(),cohort,lesson,'QA quota rollback','{}');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%Basic daily execution quota exceeded%' THEN RAISE; END IF; blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Eleventh execution not blocked'; END IF;
 UPDATE public.enrollments SET status='removed' WHERE class_id=cohort AND learner_id=learner;
 PERFORM public.product_enroll_basic(subject,'qa-basic-rollback@example.invalid');
 IF EXISTS(SELECT 1 FROM public.enrollments WHERE class_id=cohort AND learner_id=learner AND status='active') THEN RAISE EXCEPTION 'Removed enrollment reactivated'; END IF;
END $$;
ROLLBACK;
