-- 025 (TM-008): Workspace source approvals per class live in the database, set by an administrator and audited.
-- WORKSPACE_SOURCE_BINDINGS_JSON is still honoured; the server merges both, so this migration changes no existing approval.
BEGIN;
CREATE TABLE public.product_workspace_sources (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sheets','folders','files')),
  source_id text NOT NULL CHECK (source_id ~ '^[A-Za-z0-9_-]{1,200}$'),
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, kind, source_id)
);
ALTER TABLE public.product_workspace_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.product_workspace_sources FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.product_workspace_sources TO service_role;
CREATE POLICY service_only ON public.product_workspace_sources TO service_role USING (true) WITH CHECK (true);

CREATE FUNCTION public.product_set_workspace_source(p_class uuid, p_kind text, p_source text, p_approved boolean, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE changed int;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'System administrator required'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('sheets','folders','files') THEN RAISE EXCEPTION 'Invalid source kind'; END IF;
 IF p_source IS NULL OR p_source !~ '^[A-Za-z0-9_-]{1,200}$' THEN RAISE EXCEPTION 'Invalid source ID'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Reason must be 3-500 characters'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=p_class) THEN RAISE EXCEPTION 'Class not found'; END IF;
 IF p_approved THEN
  INSERT INTO public.product_workspace_sources(class_id,kind,source_id,created_by) VALUES(p_class,p_kind,p_source,public.current_user_id()) ON CONFLICT DO NOTHING;
 ELSE
  DELETE FROM public.product_workspace_sources WHERE class_id=p_class AND kind=p_kind AND source_id=p_source;
 END IF;
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed=0 THEN RETURN false; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason)
  VALUES(p_class,public.current_user_id(),CASE WHEN p_approved THEN 'source.approve' ELSE 'source.revoke' END,p_kind||' / '||p_source||' / '||btrim(p_reason));
 RETURN true;
END $$;
REVOKE ALL PRIVILEGES ON FUNCTION public.product_set_workspace_source(uuid,text,text,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_set_workspace_source(uuid,text,text,boolean,text) TO authenticated;
COMMIT;
