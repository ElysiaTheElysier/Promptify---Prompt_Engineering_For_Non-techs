-- Public testing classes are discoverable by every authenticated user, but
-- course access still requires a real enrollment. Learners may only create
-- that enrollment through the hardened RPC below.
BEGIN;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS enrollment_mode TEXT NOT NULL DEFAULT 'instructor'
  CHECK (enrollment_mode IN ('instructor', 'self_enroll'));

UPDATE public.classes
SET enrollment_mode = 'self_enroll'
WHERE id = '93000000-0000-4000-8000-000000000001'
   OR class_code = 'TESTER-PE-001';

CREATE OR REPLACE FUNCTION public.self_enroll_public_class(target_class_id UUID)
RETURNS TABLE (
  enrollment_id UUID,
  learner_id UUID,
  learner_code TEXT,
  class_id UUID,
  enrollment_status TEXT
) AS $$
DECLARE
  resolved_user_id UUID;
  resolved_learner_id UUID;
  resolved_learner_code TEXT;
  resolved_enrollment_id UUID;
  resolved_status TEXT;
BEGIN
  resolved_user_id := public.current_user_id();
  IF resolved_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated Promptify user profile is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = resolved_user_id AND u.role = 'learner'
  ) THEN
    RAISE EXCEPTION 'Only learner accounts can self-enroll.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.courses co ON co.id = c.course_id
    WHERE c.id = target_class_id
      AND c.enrollment_mode = 'self_enroll'
      AND c.status = 'active'
      AND c.start_date <= now()
      AND c.end_date >= now()
      AND co.status = 'active'
      AND co.publication_status = 'published'
  ) THEN
    RAISE EXCEPTION 'Class is not available for public self-enrollment.';
  END IF;

  INSERT INTO public.learners (user_id)
  VALUES (resolved_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT l.id, l.learner_code
  INTO resolved_learner_id, resolved_learner_code
  FROM public.learners l
  WHERE l.user_id = resolved_user_id;

  INSERT INTO public.enrollments (learner_id, class_id, status, joined_at, updated_at)
  VALUES (resolved_learner_id, target_class_id, 'active', now(), now())
  ON CONFLICT ON CONSTRAINT unique_learner_class DO UPDATE
  SET status = 'active', joined_at = now(), updated_at = now()
  RETURNING id, status INTO resolved_enrollment_id, resolved_status;

  RETURN QUERY SELECT
    resolved_enrollment_id,
    resolved_learner_id,
    resolved_learner_code,
    target_class_id,
    resolved_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.self_enroll_public_class(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_enroll_public_class(UUID) TO authenticated;

DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON public.classes;
CREATE POLICY "Classes read active or enrolled or instructor"
ON public.classes FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR public.has_active_class_enrollment(id)
  OR (
    enrollment_mode = 'self_enroll'
    AND status = 'active'
    AND start_date <= now()
    AND end_date >= now()
  )
);

DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;
CREATE POLICY "Courses read active or instructor read all"
ON public.courses FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'active'
    AND publication_status = 'published'
    AND (
      public.has_active_course_enrollment(id)
      OR EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.course_id = courses.id
          AND c.enrollment_mode = 'self_enroll'
          AND c.status = 'active'
          AND c.start_date <= now()
          AND c.end_date >= now()
      )
    )
  )
);

COMMIT;
NOTIFY pgrst, 'reload schema';
