-- ==============================================================================
-- MIGRATION 006: ENFORCE ENROLLMENT-BASED COURSE ACCESS
-- A learner may read course content and create attempts only while actively
-- enrolled in an active class belonging to that course.
-- ==============================================================================

-- SECURITY DEFINER helpers avoid recursive RLS checks across enrollments,
-- classes and course content. They return booleans only and expose no row data.
CREATE OR REPLACE FUNCTION public.has_active_class_enrollment(target_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.learners l ON l.id = e.learner_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE e.class_id = target_class_id
      AND l.user_id = public.current_user_id()
      AND e.status = 'active'
      AND c.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.has_active_course_enrollment(target_course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.learners l ON l.id = e.learner_id
    JOIN public.classes c ON c.id = e.class_id
    JOIN public.courses co ON co.id = c.course_id
    WHERE c.course_id = target_course_id
      AND l.user_id = public.current_user_id()
      AND e.status = 'active'
      AND c.status = 'active'
      AND co.status = 'active'
      AND co.publication_status = 'published'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.lesson_belongs_to_class(target_lesson_id UUID, target_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.classes c ON c.course_id = m.course_id
    WHERE l.id = target_lesson_id
      AND c.id = target_class_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.has_active_class_enrollment(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_active_course_enrollment(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lesson_belongs_to_class(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_class_enrollment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_course_enrollment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lesson_belongs_to_class(UUID, UUID) TO authenticated;

-- COURSE: a learner sees only courses reached through an active enrollment.
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;
CREATE POLICY "Courses read active or instructor read all"
ON public.courses FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'active'
    AND publication_status = 'published'
    AND public.has_active_course_enrollment(id)
  )
);

-- CLASS: remove the previous public-to-authenticated `status = active` branch.
DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON public.classes;
CREATE POLICY "Classes read active or enrolled or instructor"
ON public.classes FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR public.has_active_class_enrollment(id)
);

-- MODULES / LESSONS: enrollment is checked against their parent course.
DROP POLICY IF EXISTS "Published modules readable by authenticated" ON public.course_modules;
CREATE POLICY "Published modules readable by authenticated"
ON public.course_modules FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'published'
    AND public.has_active_course_enrollment(course_id)
  )
);

DROP POLICY IF EXISTS "Published lessons readable by authenticated" ON public.lessons;
CREATE POLICY "Published lessons readable by authenticated"
ON public.lessons FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.course_modules m
      WHERE m.id = lessons.module_id
        AND m.status = 'published'
        AND public.has_active_course_enrollment(m.course_id)
    )
  )
);

DROP POLICY IF EXISTS "Rubrics readable with lesson" ON public.lesson_rubric_criteria;
CREATE POLICY "Rubrics readable with lesson"
ON public.lesson_rubric_criteria FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = lesson_rubric_criteria.lesson_id
      AND l.status = 'published'
      AND m.status = 'published'
      AND public.has_active_course_enrollment(m.course_id)
  )
);

DROP POLICY IF EXISTS "Resources readable with lesson" ON public.lesson_resources;
CREATE POLICY "Resources readable with lesson"
ON public.lesson_resources FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = lesson_resources.lesson_id
      AND l.status = 'published'
      AND m.status = 'published'
      AND public.has_active_course_enrollment(m.course_id)
  )
);

-- PROMPT ATTEMPTS: owning the learner record is insufficient; the learner must
-- still have active access to the exact class and lesson/course combination.
DROP POLICY IF EXISTS "Authenticated users can insert prompt attempts" ON public.prompt_attempts;
CREATE POLICY "Authenticated users can insert prompt attempts"
ON public.prompt_attempts FOR INSERT TO authenticated
WITH CHECK (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
    AND (
      lesson_ref_id IS NULL
      OR public.lesson_belongs_to_class(lesson_ref_id, class_id)
    )
  )
);

NOTIFY pgrst, 'reload schema';
