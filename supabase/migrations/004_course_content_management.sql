-- ==============================================================================
-- MIGRATION 004: COURSE CONTENT MANAGEMENT
-- Course -> Modules -> Lessons -> Rubrics / Resources + Instructor assignments
-- Backward compatible with the existing static labs and prompt_attempts.lesson_id.
-- ==============================================================================

-- 1. COURSE PUBLISHING METADATA
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.courses
SET publication_status = 'published',
    published_at = COALESCE(published_at, updated_at, created_at, now())
WHERE status = 'active' AND publication_status = 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_publication_status_check'
      AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_publication_status_check
      CHECK (publication_status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_slug_unique
  ON public.courses(slug) WHERE slug IS NOT NULL;

-- Learners must not discover draft/archived course metadata through the legacy
-- "status = active" policy. Instructors retain full visibility.
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;
CREATE POLICY "Courses read active or instructor read all"
ON public.courses FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (status = 'active' AND publication_status = 'published')
);

-- 2. COURSE MODULES
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 1 CHECK (position > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_module_position_per_course UNIQUE (course_id, position)
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course
  ON public.course_modules(course_id, position);

-- 3. LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  lesson_key TEXT NOT NULL,
  title TEXT NOT NULL,
  badge TEXT,
  focus_skill TEXT,
  scenario TEXT,
  task_goal TEXT,
  concept_title TEXT,
  concept_content TEXT,
  system_instruction TEXT,
  starter_prompt TEXT,
  baseline_prompt TEXT,
  improved_prompt TEXT,
  sample_input_context TEXT,
  prompt_placeholder TEXT,
  expected_output_format TEXT,
  hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  focus_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INT NOT NULL DEFAULT 1 CHECK (position > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_lesson_key_per_module UNIQUE (module_id, lesson_key),
  CONSTRAINT unique_lesson_position_per_module UNIQUE (module_id, position),
  CONSTRAINT lessons_hints_is_array CHECK (jsonb_typeof(hints) = 'array'),
  CONSTRAINT lessons_focus_components_is_array CHECK (jsonb_typeof(focus_components) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_lessons_module
  ON public.lessons(module_id, position);

-- 4. RUBRIC CRITERIA
CREATE TABLE IF NOT EXISTS public.lesson_rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  criterion_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 2 CHECK (max_score > 0),
  position INT NOT NULL DEFAULT 1 CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_rubric_key_per_lesson UNIQUE (lesson_id, criterion_key),
  CONSTRAINT unique_rubric_position_per_lesson UNIQUE (lesson_id, position)
);

CREATE INDEX IF NOT EXISTS idx_lesson_rubrics_lesson
  ON public.lesson_rubric_criteria(lesson_id, position);

-- 5. LESSON RESOURCES
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL DEFAULT 'text'
    CHECK (resource_type IN ('text', 'data', 'url', 'file', 'reference')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  position INT NOT NULL DEFAULT 1 CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_resource_position_per_lesson UNIQUE (lesson_id, position)
);

CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson
  ON public.lesson_resources(lesson_id, position);

-- 6. COURSE INSTRUCTOR ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.course_instructors (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'editor'
    CHECK (permission IN ('owner', 'editor', 'viewer')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_instructors_user
  ON public.course_instructors(user_id);

-- 7. OPTIONAL NORMALIZED LINK FROM PROMPT ATTEMPTS TO LESSONS
ALTER TABLE public.prompt_attempts
  ADD COLUMN IF NOT EXISTS lesson_ref_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prompt_attempts_lesson_ref
  ON public.prompt_attempts(lesson_ref_id);

-- 8. UPDATED_AT TRIGGERS (trigger_set_timestamp is defined by the base schema)
DROP TRIGGER IF EXISTS set_timestamp_course_modules ON public.course_modules;
CREATE TRIGGER set_timestamp_course_modules
BEFORE UPDATE ON public.course_modules
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_lessons ON public.lessons;
CREATE TRIGGER set_timestamp_lessons
BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_lesson_rubrics ON public.lesson_rubric_criteria;
CREATE TRIGGER set_timestamp_lesson_rubrics
BEFORE UPDATE ON public.lesson_rubric_criteria
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_lesson_resources ON public.lesson_resources;
CREATE TRIGGER set_timestamp_lesson_resources
BEFORE UPDATE ON public.lesson_resources
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 9. DATA API GRANTS
REVOKE ALL ON TABLE
  public.course_modules,
  public.lessons,
  public.lesson_rubric_criteria,
  public.lesson_resources,
  public.course_instructors
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.course_modules,
  public.lessons,
  public.lesson_rubric_criteria,
  public.lesson_resources,
  public.course_instructors
TO authenticated;

-- 10. ROW LEVEL SECURITY
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published modules readable by authenticated" ON public.course_modules;
CREATE POLICY "Published modules readable by authenticated"
ON public.course_modules FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_modules.course_id
        AND c.status = 'active'
        AND c.publication_status = 'published'
    )
  )
);

DROP POLICY IF EXISTS "Modules managed by instructors" ON public.course_modules;
CREATE POLICY "Modules managed by instructors"
ON public.course_modules FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

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
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id
        AND m.status = 'published'
        AND c.status = 'active'
        AND c.publication_status = 'published'
    )
  )
);

DROP POLICY IF EXISTS "Lessons managed by instructors" ON public.lessons;
CREATE POLICY "Lessons managed by instructors"
ON public.lessons FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

DROP POLICY IF EXISTS "Rubrics readable with lesson" ON public.lesson_rubric_criteria;
CREATE POLICY "Rubrics readable with lesson"
ON public.lesson_rubric_criteria FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_rubric_criteria.lesson_id
      AND l.status = 'published'
      AND m.status = 'published'
      AND c.status = 'active'
      AND c.publication_status = 'published'
  )
);

DROP POLICY IF EXISTS "Rubrics managed by instructors" ON public.lesson_rubric_criteria;
CREATE POLICY "Rubrics managed by instructors"
ON public.lesson_rubric_criteria FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

DROP POLICY IF EXISTS "Resources readable with lesson" ON public.lesson_resources;
CREATE POLICY "Resources readable with lesson"
ON public.lesson_resources FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_resources.lesson_id
      AND l.status = 'published'
      AND m.status = 'published'
      AND c.status = 'active'
      AND c.publication_status = 'published'
  )
);

DROP POLICY IF EXISTS "Resources managed by instructors" ON public.lesson_resources;
CREATE POLICY "Resources managed by instructors"
ON public.lesson_resources FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

DROP POLICY IF EXISTS "Course assignments readable by instructors" ON public.course_instructors;
CREATE POLICY "Course assignments readable by instructors"
ON public.course_instructors FOR SELECT TO authenticated
USING (public.is_instructor());

DROP POLICY IF EXISTS "Course assignments managed by instructors" ON public.course_instructors;
CREATE POLICY "Course assignments managed by instructors"
ON public.course_instructors FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

NOTIFY pgrst, 'reload schema';
