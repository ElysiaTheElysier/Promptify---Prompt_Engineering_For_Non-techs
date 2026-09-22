-- Per-account, per-screen tutorial completion. localStorage is not authoritative.
CREATE TABLE IF NOT EXISTS public.user_tutorial_progress (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tutorial_key TEXT NOT NULL CHECK (tutorial_key ~ '^[a-z0-9_]+$'),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tutorial_key)
);

REVOKE ALL ON TABLE public.user_tutorial_progress FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_tutorial_progress TO authenticated;
ALTER TABLE public.user_tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tutorial progress" ON public.user_tutorial_progress;
CREATE POLICY "Users read own tutorial progress"
ON public.user_tutorial_progress FOR SELECT TO authenticated
USING (user_id = public.current_user_id());

DROP POLICY IF EXISTS "Users insert own tutorial progress" ON public.user_tutorial_progress;
CREATE POLICY "Users insert own tutorial progress"
ON public.user_tutorial_progress FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_user_id());

DROP POLICY IF EXISTS "Users update own tutorial progress" ON public.user_tutorial_progress;
CREATE POLICY "Users update own tutorial progress"
ON public.user_tutorial_progress FOR UPDATE TO authenticated
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());

NOTIFY pgrst, 'reload schema';
