BEGIN;
CREATE TABLE public.rebuild_trainer_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_id uuid NOT NULL REFERENCES public.prompt_attempts,
 actor_id uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(),
 request_id uuid NOT NULL,action text NOT NULL CHECK(action IN ('note','clearance')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 2 AND 2000),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(actor_id,request_id)
);
ALTER TABLE public.rebuild_trainer_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rebuild_trainer_actions FROM anon,authenticated;
CREATE FUNCTION public.rebuild_record_trainer_action(p_attempt uuid,p_request uuid,p_action text,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target_class uuid; result public.rebuild_trainer_actions;
BEGIN
 SELECT class_id INTO STRICT target_class FROM public.prompt_attempts WHERE id=p_attempt;
 IF NOT public.rebuild_can_manage_class(target_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 INSERT INTO public.rebuild_trainer_actions(attempt_id,request_id,action,reason) VALUES(p_attempt,p_request,p_action,btrim(p_reason)) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT result FROM public.rebuild_trainer_actions WHERE actor_id=public.current_user_id() AND request_id=p_request;
 IF result.attempt_id<>p_attempt OR result.action<>p_action OR result.reason<>btrim(p_reason) THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 -- Clearance is an audited trainer decision; it never replaces the AI score or marks automated progress complete.
 RETURN result.id;
END $$;
CREATE FUNCTION public.rebuild_trainer_action_history(p_attempt uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target_class uuid;
BEGIN
 SELECT class_id INTO STRICT target_class FROM public.prompt_attempts WHERE id=p_attempt;
 IF auth.uid() IS NULL OR NOT public.rebuild_can_teach(target_class) THEN RAISE EXCEPTION 'Assigned trainer required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC),'[]'::jsonb) FROM (SELECT id,action,reason,actor_id,created_at FROM public.rebuild_trainer_actions WHERE attempt_id=p_attempt ORDER BY created_at DESC LIMIT 100) a);
END $$;
REVOKE ALL ON FUNCTION public.rebuild_record_trainer_action(uuid,uuid,text,text),public.rebuild_trainer_action_history(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_record_trainer_action(uuid,uuid,text,text),public.rebuild_trainer_action_history(uuid) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
