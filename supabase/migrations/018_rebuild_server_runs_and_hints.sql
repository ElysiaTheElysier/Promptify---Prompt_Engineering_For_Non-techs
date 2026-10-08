-- Rebuild slice. Requires 004, 006, 016, 017. Review/apply in staging first.
BEGIN;
CREATE TABLE public.rebuild_runs (
 subject uuid NOT NULL, request_id uuid NOT NULL, class_id uuid NOT NULL REFERENCES public.classes,
 lesson_id uuid NOT NULL REFERENCES public.lessons, prompt text NOT NULL, snapshot jsonb NOT NULL,
 attempt_id uuid REFERENCES public.prompt_attempts, result jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(subject,request_id)
);
ALTER TABLE public.rebuild_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rebuild_runs FROM anon, authenticated;
GRANT ALL ON public.rebuild_runs TO service_role;

CREATE FUNCTION public.rebuild_begin_run(p_subject uuid,p_class uuid,p_lesson uuid,p_request uuid,p_prompt text,p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.rebuild_runs; inserted integer;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 IF NOT public.has_active_class_enrollment(p_class) OR NOT EXISTS (
 SELECT 1 FROM classes c JOIN courses co ON co.id=c.course_id JOIN course_modules m ON m.course_id=co.id JOIN lessons l ON l.module_id=m.id
 WHERE c.id=p_class AND l.id=p_lesson AND c.status='active' AND co.status='active' AND co.publication_status='published' AND m.status='published' AND l.status='published') THEN RAISE EXCEPTION 'Access denied'; END IF;
 INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(p_subject,p_request,p_class,p_lesson,p_prompt,p_snapshot) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 SELECT * INTO r FROM rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF r.prompt<>p_prompt OR r.class_id<>p_class OR r.lesson_id<>p_lesson THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 -- A processing request cannot be replayed into a second provider call.
 IF inserted=0 AND r.result IS NULL THEN RAISE EXCEPTION 'Request processing or uncertain; inspect before retry'; END IF;
 RETURN jsonb_build_object('result',r.result);
END $$;
CREATE FUNCTION public.rebuild_finish_run(p_subject uuid,p_request uuid,p_result jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.rebuild_runs; saved jsonb;
BEGIN
 SELECT * INTO STRICT r FROM rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF r.result IS NOT NULL THEN RETURN r.result->'saved'; END IF;
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 saved:=public.record_prompt_attempt_and_progress(r.class_id,r.lesson_id,r.prompt,p_result->>'output',NULL,p_result->>'model',(p_result->>'latencyMs')::integer);
 UPDATE rebuild_runs SET attempt_id=(saved->'attempt'->>'id')::uuid,result=p_result||jsonb_build_object('saved',saved) WHERE subject=p_subject AND request_id=p_request;
 RETURN saved;
END $$;
CREATE FUNCTION public.rebuild_save_evaluation(p_subject uuid,p_attempt uuid,p_evaluation jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 RETURN public.update_prompt_attempt_evaluation_and_progress(p_attempt,p_evaluation);
END $$;
REVOKE ALL ON FUNCTION public.rebuild_begin_run(uuid,uuid,uuid,uuid,text,jsonb), public.rebuild_finish_run(uuid,uuid,jsonb),public.rebuild_save_evaluation(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_begin_run(uuid,uuid,uuid,uuid,text,jsonb),public.rebuild_finish_run(uuid,uuid,jsonb),public.rebuild_save_evaluation(uuid,uuid,jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.record_prompt_attempt_and_progress(uuid,uuid,text,text,jsonb,text,integer), public.update_prompt_attempt_evaluation_and_progress(uuid,jsonb) FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.prompt_attempts FROM authenticated;

CREATE FUNCTION public.rebuild_can_teach(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM classes c JOIN course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=public.current_user_id());
$$;
REVOKE ALL ON FUNCTION public.rebuild_can_teach(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_can_teach(uuid) TO authenticated;
CREATE FUNCTION public.rebuild_class_attempts(p_class uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.rebuild_can_teach(p_class) THEN RAISE EXCEPTION 'Assigned trainer required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(pa)||jsonb_build_object('learner_name',u.full_name)), '[]'::jsonb) FROM (SELECT * FROM public.prompt_attempts WHERE class_id=p_class ORDER BY created_at DESC LIMIT 100) pa JOIN learners l ON l.id=pa.learner_id JOIN users u ON u.id=l.user_id);
END $$;
REVOKE ALL ON FUNCTION public.rebuild_class_attempts(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_class_attempts(uuid) TO authenticated;
CREATE TABLE public.trainer_hints(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES classes,learner_id uuid NOT NULL REFERENCES learners,trainer_id uuid NOT NULL DEFAULT public.current_user_id() REFERENCES users,message text NOT NULL CHECK(length(btrim(message)) BETWEEN 1 AND 2000),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.trainer_hints(learner_id,class_id,created_at);
ALTER TABLE public.trainer_hints ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.trainer_hints TO authenticated;
CREATE POLICY hint_read ON public.trainer_hints FOR SELECT TO authenticated USING(public.rebuild_can_teach(class_id) OR EXISTS(SELECT 1 FROM learners l JOIN enrollments e ON e.learner_id=l.id WHERE l.id=trainer_hints.learner_id AND l.user_id=public.current_user_id() AND e.class_id=trainer_hints.class_id AND e.status='active'));
CREATE POLICY hint_send ON public.trainer_hints FOR INSERT TO authenticated WITH CHECK(trainer_id=public.current_user_id() AND public.rebuild_can_teach(class_id) AND EXISTS(SELECT 1 FROM enrollments e WHERE e.learner_id=trainer_hints.learner_id AND e.class_id=class_id AND e.status='active'));
COMMIT;
