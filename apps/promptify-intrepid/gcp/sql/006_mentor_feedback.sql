-- Additive feedback support. Apply only through a separately approved rollout.
BEGIN;
CREATE TABLE public.product_workspace_preferences (
 class_id uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
 config jsonb NOT NULL DEFAULT '{}'::jsonb,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_profile_details (
 user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 employee_id text NOT NULL DEFAULT '',office_location text NOT NULL DEFAULT '',updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_ui_events (
 id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES public.users(id),class_id uuid NOT NULL REFERENCES public.classes(id),
 lesson_id uuid REFERENCES public.lessons(id),event text NOT NULL,seconds integer NOT NULL DEFAULT 0 CHECK(seconds BETWEEN 0 AND 60),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_ui_events_scope_time ON public.product_ui_events(class_id,created_at);
CREATE TABLE public.product_access_requests (
 id uuid PRIMARY KEY,subject text NOT NULL,email text NOT NULL,class_id uuid REFERENCES public.classes(id),message text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','resolved')),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_outcome_measurements (
 id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES public.users(id),class_id uuid NOT NULL REFERENCES public.classes(id),lesson_id uuid NOT NULL REFERENCES public.lessons(id),
 before_minutes numeric NOT NULL CHECK(before_minutes>0 AND before_minutes<=1440),after_minutes numeric NOT NULL CHECK(after_minutes>=0 AND after_minutes<=1440),
 repetitions_per_week numeric NOT NULL CHECK(repetitions_per_week>0 AND repetitions_per_week<=1000),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_roster_workbooks (
 connection_id uuid PRIMARY KEY REFERENCES public.product_sheet_connections(id) ON DELETE CASCADE,
 class_id uuid NOT NULL REFERENCES public.classes(id),manifest jsonb NOT NULL,next_sync_at timestamptz NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['product_workspace_preferences','product_profile_details','product_ui_events','product_access_requests','product_outcome_measurements','product_roster_workbooks'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 EXECUTE format('CREATE POLICY service_only ON public.%I TO service_role USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.product_claim_roster_sync() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE conn public.product_sheet_connections; log_id uuid; request_id uuid:=gen_random_uuid();
BEGIN
 UPDATE public.product_sync_logs SET status='failed',error_code='worker_timeout',finished_at=now()
 WHERE status='running' AND created_at<now()-interval '5 minutes';
 SELECT s.* INTO conn FROM public.product_sheet_connections s JOIN public.classes c ON c.id=s.class_id
 JOIN public.users u ON u.id=s.created_by
 WHERE s.auto_sync AND c.status IN ('active','upcoming') AND u.auth_provider_id IS NOT NULL
 AND coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz)<now()-interval '15 minutes'
 AND NOT EXISTS(SELECT 1 FROM public.product_roster_workbooks w WHERE w.connection_id=s.id AND w.next_sync_at>now())
 AND NOT EXISTS(SELECT 1 FROM public.product_sync_logs l WHERE l.connection_id=s.id AND l.status='running')
 ORDER BY coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz),s.id
 LIMIT 1 FOR UPDATE OF s SKIP LOCKED;
 IF conn.id IS NULL THEN RETURN NULL; END IF;
 UPDATE public.product_sheet_connections SET last_attempt_at=now() WHERE id=conn.id;
 INSERT INTO public.product_sync_logs(connection_id,class_id,actor_id,request_id,status)
 VALUES(conn.id,conn.class_id,conn.created_by,request_id,'running') RETURNING id INTO log_id;
 RETURN jsonb_build_object('logId',log_id,'sheetId',conn.sheet_id,'mapping',conn.column_mapping,
 'department',(SELECT department FROM public.classes WHERE id=conn.class_id));
END $$;


COMMIT;
