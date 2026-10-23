BEGIN;
-- Keep teaching content behind the authenticated product API and unlock audit.
REVOKE SELECT ON public.lessons FROM authenticated,anon;
DO $$ DECLARE fields text; BEGIN
 SELECT string_agg(quote_ident(column_name),',') INTO fields FROM information_schema.columns
 WHERE table_schema='public' AND table_name='lessons'
 AND column_name NOT IN ('hints','improved_prompt','system_instruction');
 EXECUTE 'GRANT SELECT ('||fields||') ON public.lessons TO authenticated';
END $$;

-- Administrators can perform the same management operations as assigned editors.
CREATE OR REPLACE FUNCTION public.rebuild_can_manage_class(p_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.users u WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id
 WHERE c.id=p_class AND ci.user_id=u.id AND ci.permission IN ('owner','editor'))));
$$;
CREATE OR REPLACE FUNCTION public.rebuild_can_teach(p_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=u.id)));
$$;
CREATE TABLE public.product_sandbox_runs(
 actor_id uuid NOT NULL REFERENCES public.users,request_id uuid NOT NULL,class_id uuid NOT NULL REFERENCES public.classes,
 lesson_id uuid NOT NULL REFERENCES public.lessons,prompt text NOT NULL,snapshot jsonb NOT NULL,
 result jsonb,evaluation jsonb,judge_claim uuid,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor_id,request_id)
);
ALTER TABLE public.product_sandbox_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_sandbox_runs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_sandbox_runs TO service_role;
-- Serialize each subject's admission so simultaneous requests cannot bypass limits.
CREATE FUNCTION public.product_limit_ai_run() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE identity uuid; hour_count integer; day_count integer;
BEGIN
 identity:=CASE WHEN TG_TABLE_NAME='rebuild_runs' THEN (to_jsonb(NEW)->>'subject')::uuid ELSE (to_jsonb(NEW)->>'actor_id')::uuid END;
 PERFORM pg_advisory_xact_lock(hashtextextended(identity::text,918));
 IF TG_TABLE_NAME='rebuild_runs' AND EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=identity AND request_id=(to_jsonb(NEW)->>'request_id')::uuid) THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='product_sandbox_runs' AND EXISTS(SELECT 1 FROM public.product_sandbox_runs WHERE actor_id=identity AND request_id=(to_jsonb(NEW)->>'request_id')::uuid) THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='rebuild_runs' THEN
  SELECT count(*) FILTER(WHERE created_at>now()-interval '1 hour'),count(*) INTO hour_count,day_count
  FROM public.rebuild_runs WHERE subject=identity AND created_at>now()-interval '24 hours';
 ELSE
  SELECT count(*) FILTER(WHERE created_at>now()-interval '1 hour'),count(*) INTO hour_count,day_count
  FROM public.product_sandbox_runs WHERE actor_id=identity AND created_at>now()-interval '24 hours';
 END IF;
 IF hour_count>=40 OR day_count>=200 THEN RAISE EXCEPTION 'AI run quota exceeded'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER product_limit_ai_run BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE FUNCTION public.product_limit_ai_run();
CREATE TRIGGER product_limit_sandbox_run BEFORE INSERT ON public.product_sandbox_runs FOR EACH ROW EXECUTE FUNCTION public.product_limit_ai_run();
REVOKE ALL ON FUNCTION public.product_limit_ai_run() FROM PUBLIC,anon,authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
