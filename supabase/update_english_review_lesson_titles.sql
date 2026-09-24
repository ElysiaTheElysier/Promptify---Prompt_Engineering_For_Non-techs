-- ==============================================================================
-- UPDATE ENGLISH REVIEW LESSON TITLES (NON-DESTRUCTIVE & TARGETED)
-- Targets strictly English Review lessons: a5000000-0000-4000-8000-000000000001 to a5000000-0000-4000-8000-000000000006
-- ==============================================================================

BEGIN;

UPDATE public.lessons
SET title = 'Lesson 1: Zero-shot Prompting'
WHERE id = 'a5000000-0000-4000-8000-000000000001';

UPDATE public.lessons
SET title = 'Lesson 2: One-shot Prompting'
WHERE id = 'a5000000-0000-4000-8000-000000000002';

UPDATE public.lessons
SET title = 'Lesson 3: Few-shot Prompting'
WHERE id = 'a5000000-0000-4000-8000-000000000003';

UPDATE public.lessons
SET title = 'Lesson 4: Structured Reasoning'
WHERE id = 'a5000000-0000-4000-8000-000000000004';

UPDATE public.lessons
SET title = 'Lesson 5: Constraints & Structured Output'
WHERE id = 'a5000000-0000-4000-8000-000000000005';

UPDATE public.lessons
SET title = 'Lesson 6: Grounded Prompting'
WHERE id = 'a5000000-0000-4000-8000-000000000006';

COMMIT;

NOTIFY pgrst, 'reload schema';

