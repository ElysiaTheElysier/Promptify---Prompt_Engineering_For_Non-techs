BEGIN;
CREATE TABLE public.product_prompt_library (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.users,
 class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons,
 attempt_id uuid REFERENCES public.prompt_attempts, request_id uuid NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200), prompt text NOT NULL CHECK(length(prompt) BETWEEN 1 AND 24000),
 settings jsonb NOT NULL DEFAULT '{}', variables jsonb NOT NULL DEFAULT '[]', score numeric,
 status text NOT NULL DEFAULT 'personal' CHECK(status IN ('personal','pending','approved','rejected')),
 reviewed_by uuid REFERENCES public.users, review_reason text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,request_id)
);
ALTER TABLE public.product_prompt_library ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_prompt_library FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_prompt_library TO service_role;
CREATE TABLE public.product_learner_context (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.users,
 class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons,
 title text NOT NULL, content text NOT NULL CHECK(length(content) BETWEEN 1 AND 100000),
 content_hash text NOT NULL, UNIQUE(owner_id,class_id,lesson_id,content_hash),
 chunks jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_learner_context ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_learner_context FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_learner_context TO service_role;
ALTER TABLE public.product_learner_support ADD COLUMN reflection text;
CREATE FUNCTION public.product_unlock_support_reflected(p_class uuid,p_lesson uuid,p_kind text,p_reflection text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_kind='solution' AND (p_reflection IS NULL OR length(btrim(p_reflection))<20 OR length(p_reflection)>1000) THEN RAISE EXCEPTION 'Reflection required'; END IF;
 PERFORM public.product_unlock_support(p_class,p_lesson,p_kind);
 IF p_kind='solution' THEN UPDATE public.product_learner_support SET reflection=btrim(p_reflection) WHERE learner_id=(SELECT id FROM public.learners WHERE user_id=public.current_user_id()) AND class_id=p_class AND lesson_id=p_lesson AND kind=p_kind; END IF;
END $$;
REVOKE ALL ON FUNCTION public.product_unlock_support(uuid,uuid,text) FROM authenticated;
REVOKE ALL ON FUNCTION public.product_unlock_support_reflected(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_unlock_support_reflected(uuid,uuid,text,text) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
