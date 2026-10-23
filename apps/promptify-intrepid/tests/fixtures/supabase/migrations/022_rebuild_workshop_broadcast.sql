BEGIN;
CREATE FUNCTION public.rebuild_can_manage_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=public.current_user_id() AND ci.permission IN ('owner','editor'));
$$;
REVOKE ALL ON FUNCTION public.rebuild_can_manage_class(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_can_manage_class(uuid) TO authenticated;
-- Messages are durable. Delivery acknowledgement is separate from trainer content.
CREATE TABLE public.workshop_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 class_id uuid NOT NULL REFERENCES public.classes,
 trainer_id uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(),
 request_id uuid NOT NULL,
 message text NOT NULL CHECK(length(btrim(message)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(trainer_id,request_id)
);
CREATE TABLE public.workshop_message_receipts (
 message_id uuid NOT NULL REFERENCES public.workshop_messages ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.users,
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(message_id,user_id)
);
CREATE INDEX ON public.workshop_messages(class_id,created_at DESC);
ALTER TABLE public.workshop_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_message_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_messages,public.workshop_message_receipts FROM anon,authenticated;
CREATE FUNCTION public.rebuild_broadcast(p_class uuid,p_request uuid,p_message text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing public.workshop_messages; new_id uuid;
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=p_class AND status='active') THEN RAISE EXCEPTION 'Class is not active'; END IF;
 INSERT INTO public.workshop_messages(class_id,request_id,message) VALUES(p_class,p_request,btrim(p_message)) ON CONFLICT(trainer_id,request_id) DO NOTHING RETURNING id INTO new_id;
 SELECT * INTO STRICT existing FROM public.workshop_messages WHERE trainer_id=public.current_user_id() AND request_id=p_request;
 IF existing.class_id<>p_class OR existing.message<>btrim(p_message) THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 RETURN existing.id;
END $$;
CREATE FUNCTION public.rebuild_workshop_inbox(p_class uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.rebuild_can_teach(p_class) OR public.has_active_class_enrollment(p_class)) THEN RAISE EXCEPTION 'Class access required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('read_at',r.read_at) ORDER BY m.created_at DESC),'[]'::jsonb)
 FROM (SELECT id,message,created_at FROM public.workshop_messages WHERE class_id=p_class ORDER BY created_at DESC LIMIT 30) m
 LEFT JOIN public.workshop_message_receipts r ON r.message_id=m.id AND r.user_id=public.current_user_id());
END $$;
CREATE FUNCTION public.rebuild_ack_workshop_message(p_message uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target_class uuid;
BEGIN
 SELECT class_id INTO STRICT target_class FROM public.workshop_messages WHERE id=p_message;
 IF auth.uid() IS NULL OR NOT (public.rebuild_can_teach(target_class) OR public.has_active_class_enrollment(target_class)) THEN RAISE EXCEPTION 'Class access required'; END IF;
 INSERT INTO public.workshop_message_receipts(message_id,user_id) VALUES(p_message,public.current_user_id()) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.rebuild_broadcast(uuid,uuid,text),public.rebuild_workshop_inbox(uuid),public.rebuild_ack_workshop_message(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_broadcast(uuid,uuid,text),public.rebuild_workshop_inbox(uuid),public.rebuild_ack_workshop_message(uuid) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
