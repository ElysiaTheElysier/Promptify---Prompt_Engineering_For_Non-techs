BEGIN;
DO $$ DECLARE administrator uuid; client uuid; course uuid; BEGIN
 SELECT id INTO STRICT administrator FROM public.users WHERE email='duonglh.work@gmail.com' AND role='admin';
 INSERT INTO public.clients(name,industry) VALUES('Promptify Public Learning','Training') RETURNING id INTO client;
 INSERT INTO public.courses(title,slug,description,status,publication_status,created_by)
 VALUES('Promptify Basic','promptify-public-basic','Public practice with fictional business scenarios. No enterprise SOP or employee roster.','active','published',administrator) RETURNING id INTO course;
 INSERT INTO public.course_modules(course_id,title,description,position,status)
 VALUES(course,'LLM Foundations','Five core techniques: zero-shot, structured output, one-shot, few-shot and grounding.',1,'published');
 INSERT INTO public.classes(class_code,course_id,client_id,department,start_date,end_date,status,enrollment_mode)
 VALUES('PUBLIC-BASIC',course,client,'Public Learning','2026-10-09T00:00:00+07:00','2099-12-31T23:59:59+07:00','active','self_enroll');
 INSERT INTO public.course_instructors(course_id,user_id,permission) VALUES(course,administrator,'owner');
END $$;
CREATE FUNCTION public.product_enroll_basic(p_subject uuid,p_email text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE person public.users; learner uuid; cohort uuid;
BEGIN
 IF p_subject IS NULL OR p_email IS NULL OR p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Verified identity required'; END IF;
 SELECT c.id INTO STRICT cohort FROM public.classes c JOIN public.courses co ON co.id=c.course_id
 WHERE co.slug='promptify-public-basic' AND c.status='active' AND c.enrollment_mode='self_enroll';
 INSERT INTO public.users(email,full_name,role,auth_provider_id) VALUES(lower(btrim(p_email)),'','learner',p_subject::text) ON CONFLICT(email) DO NOTHING;
 SELECT * INTO STRICT person FROM public.users WHERE email=lower(btrim(p_email)) FOR UPDATE;
 IF person.auth_provider_id IS NOT NULL AND person.auth_provider_id<>p_subject::text THEN RAISE EXCEPTION 'Identity conflict'; END IF;
 IF person.role<>'learner' THEN RAISE EXCEPTION 'A learner account is required for Basic enrollment'; END IF;
 UPDATE public.users SET auth_provider_id=p_subject::text WHERE id=person.id AND auth_provider_id IS NULL;
 INSERT INTO public.learners(user_id) VALUES(person.id) ON CONFLICT(user_id) DO NOTHING;
 SELECT id INTO STRICT learner FROM public.learners WHERE user_id=person.id;
 INSERT INTO public.enrollments(class_id,learner_id,status) VALUES(cohort,learner,'active') ON CONFLICT(class_id,learner_id) DO NOTHING;
 RETURN cohort;
END $$;
REVOKE ALL ON FUNCTION public.product_enroll_basic(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_enroll_basic(uuid,text) TO service_role;
CREATE FUNCTION public.product_limit_basic_run() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE count_today integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE c.id=NEW.class_id AND co.slug='promptify-public-basic') THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.subject::text,918));
 IF EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=NEW.subject AND request_id=NEW.request_id) THEN RETURN NEW; END IF;
 SELECT count(*) INTO count_today FROM public.rebuild_runs r JOIN public.classes c ON c.id=r.class_id JOIN public.courses co ON co.id=c.course_id
 WHERE r.subject=NEW.subject AND co.slug='promptify-public-basic' AND r.created_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh';
 IF count_today>=10 THEN RAISE EXCEPTION 'Basic daily execution quota exceeded'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.product_limit_basic_run() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER product_basic_quota BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE FUNCTION public.product_limit_basic_run();
COMMIT;
NOTIFY pgrst,'reload schema';
