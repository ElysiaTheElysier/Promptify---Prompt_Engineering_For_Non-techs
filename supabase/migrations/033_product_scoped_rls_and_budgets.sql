BEGIN;
CREATE FUNCTION public.product_can_read_class(p_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.users u JOIN public.classes c ON c.id=p_class WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR public.rebuild_can_teach(c.id) OR EXISTS(SELECT 1 FROM public.product_class_grants g WHERE g.user_id=u.id AND g.class_id=c.id) OR EXISTS(SELECT 1 FROM public.learners l JOIN public.enrollments e ON e.learner_id=l.id WHERE l.user_id=u.id AND e.class_id=c.id AND e.status IN ('active','completed')))
 AND (u.role='admin' OR NOT EXISTS(SELECT 1 FROM public.product_domains d WHERE d.client_id=c.client_id) OR EXISTS(SELECT 1 FROM public.product_domains d WHERE d.client_id=c.client_id AND d.active AND d.domain=split_part(u.email,'@',2))));
$$;
CREATE FUNCTION public.product_can_read_course(p_course uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.classes c WHERE c.course_id=p_course AND public.product_can_read_class(c.id));
$$;
CREATE FUNCTION public.product_can_read_lesson(p_lesson uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id WHERE l.id=p_lesson AND public.product_can_read_course(m.course_id) AND ((l.status='published' AND m.status='published') OR EXISTS(SELECT 1 FROM public.classes c WHERE c.course_id=m.course_id AND public.rebuild_can_teach(c.id) AND public.product_can_read_class(c.id))));
$$;
CREATE FUNCTION public.product_can_read_user(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p_user=public.current_user_id() OR EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id() AND u.role='admin') OR EXISTS(SELECT 1 FROM public.learners l JOIN public.enrollments e ON e.learner_id=l.id WHERE l.user_id=p_user AND public.rebuild_can_teach(e.class_id) AND public.product_can_read_class(e.class_id));
$$;
DO $$ DECLARE policy record;BEGIN
 FOR policy IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('clients','courses','classes','users','learners','enrollments','course_modules','lessons','lesson_resources','lesson_rubric_criteria','course_instructors','prompt_attempts') AND cmd IN ('SELECT','ALL') LOOP EXECUTE format('DROP POLICY %I ON public.%I',policy.policyname,policy.tablename);END LOOP;
END $$;
CREATE POLICY product_scoped_read ON public.clients FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.classes c WHERE c.client_id=clients.id AND public.product_can_read_class(c.id)));
CREATE POLICY product_scoped_read ON public.courses FOR SELECT TO authenticated USING(public.product_can_read_course(id));
CREATE POLICY product_scoped_read ON public.classes FOR SELECT TO authenticated USING(public.product_can_read_class(id));
CREATE POLICY product_scoped_read ON public.users FOR SELECT TO authenticated USING(public.product_can_read_user(id));
CREATE POLICY product_scoped_read ON public.learners FOR SELECT TO authenticated USING(public.product_can_read_user(user_id));
CREATE POLICY product_scoped_read ON public.enrollments FOR SELECT TO authenticated USING(public.product_can_read_class(class_id) AND (public.rebuild_can_teach(class_id) OR EXISTS(SELECT 1 FROM public.learners l WHERE l.id=enrollments.learner_id AND l.user_id=public.current_user_id())));
CREATE POLICY product_scoped_read ON public.course_modules FOR SELECT TO authenticated USING(public.product_can_read_course(course_id) AND (status='published' OR EXISTS(SELECT 1 FROM public.classes c WHERE c.course_id=course_modules.course_id AND public.rebuild_can_teach(c.id))));
CREATE POLICY product_scoped_read ON public.lessons FOR SELECT TO authenticated USING(public.product_can_read_lesson(id));
CREATE POLICY product_scoped_read ON public.lesson_resources FOR SELECT TO authenticated USING(public.product_can_read_lesson(lesson_id));
CREATE POLICY product_scoped_read ON public.lesson_rubric_criteria FOR SELECT TO authenticated USING(public.product_can_read_lesson(lesson_id));
CREATE POLICY product_scoped_read ON public.course_instructors FOR SELECT TO authenticated USING(user_id=public.current_user_id() OR EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id() AND u.role='admin'));
CREATE POLICY product_scoped_read ON public.prompt_attempts FOR SELECT TO authenticated USING(public.product_can_read_class(class_id) AND (public.rebuild_can_teach(class_id) OR EXISTS(SELECT 1 FROM public.learners l WHERE l.id=prompt_attempts.learner_id AND l.user_id=public.current_user_id())));
REVOKE INSERT,UPDATE,DELETE ON public.clients,public.courses,public.classes,public.users,public.learners,public.enrollments,public.course_modules,public.lessons,public.lesson_resources,public.lesson_rubric_criteria,public.course_instructors FROM authenticated;
ALTER POLICY hint_send ON public.trainer_hints WITH CHECK(trainer_id=public.current_user_id() AND public.rebuild_can_manage_class(class_id) AND public.product_can_read_class(class_id) AND EXISTS(SELECT 1 FROM public.enrollments e WHERE e.learner_id=trainer_hints.learner_id AND e.class_id=trainer_hints.class_id AND e.status='active'));
CREATE TABLE public.product_request_budgets(actor_id uuid NOT NULL REFERENCES public.users,operation text NOT NULL,bucket timestamptz NOT NULL,count integer NOT NULL,PRIMARY KEY(actor_id,operation,bucket));
ALTER TABLE public.product_request_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_request_budgets FROM PUBLIC,anon,authenticated;GRANT ALL ON public.product_request_budgets TO service_role;
CREATE FUNCTION public.product_take_budget(p_actor uuid,p_operation text,p_limit integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE used integer;BEGIN
 IF p_limit NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid budget';END IF;
 INSERT INTO public.product_request_budgets(actor_id,operation,bucket,count) VALUES(p_actor,p_operation,date_trunc('hour',now()),1) ON CONFLICT(actor_id,operation,bucket) DO UPDATE SET count=product_request_budgets.count+1 RETURNING count INTO used;
 RETURN used<=p_limit;
END $$;
REVOKE ALL ON FUNCTION public.product_take_budget(uuid,text,integer) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.product_take_budget(uuid,text,integer) TO service_role;
DO $$ DECLARE signature regprocedure;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.product_can_read_class(uuid)'::regprocedure,'public.product_can_read_course(uuid)'::regprocedure,'public.product_can_read_lesson(uuid)'::regprocedure,'public.product_can_read_user(uuid)'::regprocedure] LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',signature);END LOOP;
END $$;
COMMIT;
NOTIFY pgrst,'reload schema';
