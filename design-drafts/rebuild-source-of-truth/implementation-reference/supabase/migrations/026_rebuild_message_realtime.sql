BEGIN;
GRANT SELECT ON public.workshop_messages TO authenticated;
CREATE POLICY workshop_message_read ON public.workshop_messages FOR SELECT TO authenticated
USING(auth.uid() IS NOT NULL AND (public.rebuild_can_teach(class_id) OR public.has_active_class_enrollment(class_id)));
-- Subscribe to INSERT only: client mutations remain restricted to authorized RPCs.
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN RAISE EXCEPTION 'Supabase Realtime publication unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='workshop_messages') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_messages; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='trainer_hints') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_hints; END IF;
END $$;
COMMIT;
NOTIFY pgrst,'reload schema';
