-- 017: facilitator-approved hint requests (additive). Replaces learner self-unlock of hints; the solution is no longer
-- offered to learners. Approval reuses product_learner_support('hints'), so existing hint visibility rules apply.
BEGIN;
CREATE TABLE public.product_hint_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.learners (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  reviewer_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  note text CHECK (note IS NULL OR length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (learner_id, request_id),
  CHECK ((status = 'pending') = (decided_at IS NULL))
);
-- At most one open request per learner and lesson.
CREATE UNIQUE INDEX product_hint_requests_one_pending ON public.product_hint_requests (learner_id, class_id, lesson_id) WHERE status = 'pending';
CREATE INDEX product_hint_requests_class_idx ON public.product_hint_requests (class_id, status, created_at DESC);
ALTER TABLE public.product_hint_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.product_hint_requests FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.product_hint_requests TO service_role;
CREATE POLICY service_only ON public.product_hint_requests TO service_role USING (true) WITH CHECK (true);
COMMIT;
