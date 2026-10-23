BEGIN;
DO $$
DECLARE cohort uuid; person uuid; learner uuid; subject uuid:=gen_random_uuid(); teacher uuid; teacher_subject text;
 target uuid; lab record; request uuid; cfg jsonb; evaluation jsonb; attempt uuid;
BEGIN
 SELECT id INTO STRICT cohort FROM public.classes WHERE class_code='QA-PRODUCTION-classA';
 SELECT u.id,u.auth_provider_id INTO STRICT teacher,teacher_subject FROM public.users u JOIN public.course_instructors ci ON ci.user_id=u.id JOIN public.classes c ON c.course_id=ci.course_id WHERE c.id=cohort AND u.role='instructor' LIMIT 1;
 INSERT INTO public.users(email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES('qa-awards-rollback@example.invalid','QA awards rollback','learner',subject::text,now()) RETURNING id INTO person;
 INSERT INTO public.learners(user_id) VALUES(person) RETURNING id INTO learner;
 INSERT INTO public.enrollments(class_id,learner_id,status) VALUES(cohort,learner,'active');
 SELECT l.id INTO target FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=cohort AND l.status='published' AND m.status='published' ORDER BY l.position LIMIT 1;
 IF target IS NULL THEN RAISE EXCEPTION 'Published QA lesson required'; END IF;
 cfg:='{"pillar":"QA","branch":"","competencies":"","startTime":"","endTime":"","state":"ACTIVE","departments":["QA"],"objectives":[],"variables":[],"scaffold":[],"materials":[],"awards":{"passThreshold":8,"badges":[{"id":"qa-badge","name":"QA pass badge","status":"ACTIVE","criteria":"Passing Codelab score"}],"certificate":{"title":"QA ONLY certificate","issuer":"QA ONLY"},"issuance":{"badgeOnPass":true,"certificateOnCompletion":true,"minimumAverageScore":8,"requireAttendance":true}}}';
 INSERT INTO public.product_studio(class_id,lesson_id,revision,config,updated_by) VALUES(cohort,target,1,cfg,teacher) ON CONFLICT(class_id,lesson_id) DO UPDATE SET config=excluded.config;
 evaluation:='{"contract":"weighted-v1","total":0,"criteria":[{"key":"groundedness","score":0,"max":3},{"key":"persona","score":0,"max":2},{"key":"format","score":0,"max":2},{"key":"oneshot","score":0,"max":1.5},{"key":"actionability","score":0,"max":1.5}]}';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
 FOR lab IN SELECT l.id FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=cohort AND l.status='published' AND m.status='published' LOOP
  request:=gen_random_uuid();
  INSERT INTO public.rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(subject,request,cohort,lab.id,'QA award rollback','{"production_pass_threshold":8}');
  PERFORM set_config('promptify.request_id',request::text,true);
  INSERT INTO public.prompt_attempts(learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output,evaluation_json,model,latency_ms)
  VALUES(learner,cohort,lab.id::text,lab.id,1,'QA award rollback','QA output',evaluation,'QA-no-provider',0);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.product_awards WHERE learner_id=learner) THEN RAISE EXCEPTION 'Award issued below passing threshold'; END IF;
 UPDATE public.prompt_attempts SET evaluation_json='{"contract":"weighted-v1","total":10,"criteria":[{"key":"groundedness","score":3,"max":3},{"key":"persona","score":2,"max":2},{"key":"format","score":2,"max":2},{"key":"oneshot","score":1.5,"max":1.5},{"key":"actionability","score":1.5,"max":1.5}]}' WHERE learner_id=learner;
 IF (SELECT count(*) FROM public.product_awards WHERE learner_id=learner AND kind='badge')<>1 THEN RAISE EXCEPTION 'Passing badge missing'; END IF;
 IF EXISTS(SELECT 1 FROM public.product_awards WHERE learner_id=learner AND kind='certificate') THEN RAISE EXCEPTION 'Certificate issued without attendance'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',teacher_subject,'role','authenticated')::text,true);
 FOR lab IN SELECT l.id FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=cohort AND l.status='published' AND m.status='published' LOOP
  PERFORM public.product_record_attendance(cohort,lab.id,learner,true,'QA ONLY verified attendance rollback');
 END LOOP;
 PERFORM public.product_refresh_awards(cohort,learner);
 IF (SELECT count(*) FROM public.product_awards WHERE learner_id=learner AND kind='certificate')<>1 OR (SELECT count(*) FROM public.product_awards WHERE learner_id=learner)<>2 THEN RAISE EXCEPTION 'Certificate or idempotence failed'; END IF;
 IF has_function_privilege('authenticated','public.product_refresh_awards(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Learners can issue arbitrary awards'; END IF;
END $$;
ROLLBACK;
