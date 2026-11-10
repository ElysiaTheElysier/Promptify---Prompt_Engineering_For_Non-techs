-- 026 (TM-003): the first Google sign-in of an admin / instructor / head account is not bound by email alone.
-- The server records a pending request; an administrator approves it (audited); the next sign-in with that same
-- Google account binds. Learners still bind on first sign-in. Accounts already bound are unaffected.
-- Bootstrap: while no administrator account is bound yet, an administrator binds without approval.
BEGIN;
CREATE TABLE public.product_identity_link_requests (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  issuer text NOT NULL,
  external_subject text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.users(id)
);
ALTER TABLE public.product_identity_link_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.product_identity_link_requests FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.product_identity_link_requests TO service_role;
CREATE POLICY service_only ON public.product_identity_link_requests TO service_role USING (true) WITH CHECK (true);

CREATE FUNCTION public.product_approve_identity_link(p_user uuid, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE who record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'System administrator required'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Reason must be 3-500 characters'; END IF;
 UPDATE public.product_identity_link_requests r SET approved_at=now(), approved_by=public.current_user_id()
  FROM public.users u WHERE r.user_id=p_user AND u.id=r.user_id AND r.approved_at IS NULL AND u.auth_provider_id IS NULL
  RETURNING u.email, u.role INTO who;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason)
  VALUES(NULL,public.current_user_id(),'identity.approve',who.email||' / '||who.role||' / '||btrim(p_reason));
 RETURN true;
END $$;
REVOKE ALL PRIVILEGES ON FUNCTION public.product_approve_identity_link(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_approve_identity_link(uuid,text) TO authenticated;
COMMIT;
