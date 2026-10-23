BEGIN;
CREATE OR REPLACE FUNCTION public.rebuild_can_manage_class(p_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.product_can_read_class(p_class) AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=u.id AND ci.permission IN ('owner','editor'))));
$$;
CREATE OR REPLACE FUNCTION public.product_can_manage(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT public.rebuild_can_manage_class(p_class); $$;
-- Preserve each read RPC implementation while enforcing the same domain/class gate.
DO $$ DECLARE signature regprocedure;definition text;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.rebuild_class_attempts(uuid)'::regprocedure,'public.rebuild_class_analytics(uuid)'::regprocedure,'public.rebuild_class_sops(uuid,uuid)'::regprocedure,'public.rebuild_sop_lesson_options(uuid)'::regprocedure,'public.rebuild_workshop_inbox(uuid)'::regprocedure] LOOP
  definition:=pg_get_functiondef(signature);
  EXECUTE regexp_replace(definition,'BEGIN',E'BEGIN\n IF NOT public.product_can_read_class(p_class) THEN RAISE EXCEPTION ''Class access required''; END IF;');
 END LOOP;
END $$;
ALTER POLICY hint_read ON public.trainer_hints USING(public.product_can_read_class(class_id) AND (public.rebuild_can_teach(class_id) OR EXISTS(SELECT 1 FROM public.learners l JOIN public.enrollments e ON e.learner_id=l.id WHERE l.id=trainer_hints.learner_id AND l.user_id=public.current_user_id() AND e.class_id=trainer_hints.class_id AND e.status='active')));
ALTER POLICY workshop_message_read ON public.workshop_messages USING(public.product_can_read_class(class_id));
CREATE TABLE public.product_prompt_drafts(user_id uuid NOT NULL REFERENCES public.users,class_id uuid NOT NULL REFERENCES public.classes,lesson_id uuid NOT NULL REFERENCES public.lessons,prompt text NOT NULL CHECK(length(prompt)<=24000),revision integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,class_id,lesson_id));
ALTER TABLE public.product_prompt_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_prompt_drafts FROM PUBLIC,anon,authenticated;GRANT ALL ON public.product_prompt_drafts TO service_role;
CREATE FUNCTION public.product_save_draft(p_class uuid,p_lesson uuid,p_prompt text,p_expected_revision integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior integer;BEGIN
 IF NOT public.product_can_read_class(p_class) OR NOT public.product_can_read_lesson(p_lesson) OR NOT public.lesson_belongs_to_class(p_lesson,p_class) THEN RAISE EXCEPTION 'Lesson scope required';END IF;
 IF p_prompt IS NULL OR length(p_prompt)>24000 THEN RAISE EXCEPTION 'Invalid draft';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(public.current_user_id()::text||p_class::text||p_lesson::text,919));
 SELECT revision INTO prior FROM public.product_prompt_drafts WHERE user_id=public.current_user_id() AND class_id=p_class AND lesson_id=p_lesson FOR UPDATE;
 IF coalesce(prior,0) IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Draft revision conflict';END IF;
 INSERT INTO public.product_prompt_drafts(user_id,class_id,lesson_id,prompt,revision) VALUES(public.current_user_id(),p_class,p_lesson,p_prompt,coalesce(prior,0)+1) ON CONFLICT(user_id,class_id,lesson_id) DO UPDATE SET prompt=excluded.prompt,revision=excluded.revision,updated_at=now();
 RETURN coalesce(prior,0)+1;
END $$;
REVOKE ALL ON FUNCTION public.product_save_draft(uuid,uuid,text,integer) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.product_save_draft(uuid,uuid,text,integer) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
