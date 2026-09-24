-- ==============================================================================
-- PROMPTIFY ENGLISH REVIEW ROLLBACK SCRIPT
-- Safely removes all data associated with the English Review Course & Class
-- Course: Prompt Engineering Fundamentals — English Review (a2000000-0000-4000-8000-000000000001)
-- Class:  PROMPTIFY-EN-REVIEW (a3000000-0000-4000-8000-000000000001)
-- ==============================================================================

BEGIN;

-- 1. Remove reviewer evaluations on English review attempts
DELETE FROM public.evaluations
WHERE attempt_id IN (
  SELECT id FROM public.prompt_attempts
  WHERE lesson_id IN (
    'a5000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000002',
    'a5000000-0000-4000-8000-000000000003',
    'a5000000-0000-4000-8000-000000000004',
    'a5000000-0000-4000-8000-000000000005',
    'a5000000-0000-4000-8000-000000000006'
  )
  OR class_id = 'a3000000-0000-4000-8000-000000000001'
);

-- 2. Remove reviewer prompt attempts
DELETE FROM public.prompt_attempts
WHERE lesson_id IN (
  'a5000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000003',
  'a5000000-0000-4000-8000-000000000004',
  'a5000000-0000-4000-8000-000000000005',
  'a5000000-0000-4000-8000-000000000006'
)
OR class_id = 'a3000000-0000-4000-8000-000000000001';

-- 3. Remove reviewer class enrollments
DELETE FROM public.class_enrollments
WHERE class_id = 'a3000000-0000-4000-8000-000000000001';

-- 4. Remove rubric criteria for English review lessons
DELETE FROM public.lesson_rubric_criteria
WHERE lesson_id IN (
  'a5000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000003',
  'a5000000-0000-4000-8000-000000000004',
  'a5000000-0000-4000-8000-000000000005',
  'a5000000-0000-4000-8000-000000000006'
);

-- 5. Remove resources for English review lessons
DELETE FROM public.lesson_resources
WHERE lesson_id IN (
  'a5000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000003',
  'a5000000-0000-4000-8000-000000000004',
  'a5000000-0000-4000-8000-000000000005',
  'a5000000-0000-4000-8000-000000000006'
);

-- 6. Remove English review lessons
DELETE FROM public.lessons
WHERE id IN (
  'a5000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000003',
  'a5000000-0000-4000-8000-000000000004',
  'a5000000-0000-4000-8000-000000000005',
  'a5000000-0000-4000-8000-000000000006'
);

-- 7. Remove English review modules
DELETE FROM public.course_modules
WHERE id IN (
  'a4000000-0000-4000-8000-000000000001',
  'a4000000-0000-4000-8000-000000000002'
);

-- 8. Remove English review class
DELETE FROM public.classes
WHERE id = 'a3000000-0000-4000-8000-000000000001';

-- 9. Remove English review course
DELETE FROM public.courses
WHERE id = 'a2000000-0000-4000-8000-000000000001';

-- 10. Remove English review client
DELETE FROM public.clients
WHERE id = 'a1000000-0000-4000-8000-000000000001';

COMMIT;
