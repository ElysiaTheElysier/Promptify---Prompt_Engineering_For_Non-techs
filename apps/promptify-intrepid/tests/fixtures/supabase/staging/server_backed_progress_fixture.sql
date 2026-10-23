-- Synthetic-only staging fixture for migration 016 validation.
-- Apply after schema.sql and migrations 002..015, before migration 016.
-- No IDs, emails, names, or prompt content below come from production.

BEGIN;

INSERT INTO public.users (id, email, full_name, role, auth_provider_id) VALUES
  ('b6000000-0000-4000-8000-000000000001', 'learner.a@promptify-staging.invalid', 'Staging Learner A', 'learner', NULL),
  ('b6000000-0000-4000-8000-000000000002', 'learner.b@promptify-staging.invalid', 'Staging Learner B', 'learner', NULL),
  ('b6000000-0000-4000-8000-000000000003', 'learner.c@promptify-staging.invalid', 'Staging Removed Learner C', 'learner', NULL),
  ('b6000000-0000-4000-8000-000000000004', 'instructor@promptify-staging.invalid', 'Staging Instructor', 'instructor', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clients (id, name, industry) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'Synthetic Staging Client', 'Synthetic Testing')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (
  id, title, description, status, slug, publication_status, version, published_at, created_by
) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'Synthetic Progress Course', 'Synthetic fixture only.', 'active', 'staging-progress-course', 'published', 1, '2026-01-01T00:00:00Z', 'b6000000-0000-4000-8000-000000000004'),
  ('b2000000-0000-4000-8000-000000000002', 'Synthetic Other Course', 'Used to test class/lesson isolation.', 'active', 'staging-other-course', 'published', 1, '2026-01-01T00:00:00Z', 'b6000000-0000-4000-8000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classes (
  id, class_code, course_id, client_id, department, start_date, end_date, status, enrollment_mode
) VALUES
  ('b3000000-0000-4000-8000-000000000001', 'STAGE-PROGRESS-A', 'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Synthetic Team A', '2026-01-01T00:00:00Z', '2030-01-01T00:00:00Z', 'active', 'instructor'),
  ('b3000000-0000-4000-8000-000000000002', 'STAGE-PROGRESS-B', 'b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'Synthetic Team B', '2026-01-01T00:00:00Z', '2030-01-01T00:00:00Z', 'active', 'instructor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, title, description, position, status) VALUES
  ('b4000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'Synthetic Core Module', 'Fixture module.', 1, 'published'),
  ('b4000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', 'Synthetic Other Module', 'Isolation fixture module.', 1, 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (
  id, module_id, lesson_key, title, position, status, hints, focus_components
) VALUES
  ('b5000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 'stage-zero-shot', 'Synthetic Lesson 1', 1, 'published', '[]', '[]'),
  ('b5000000-0000-4000-8000-000000000002', 'b4000000-0000-4000-8000-000000000001', 'stage-one-shot', 'Synthetic Lesson 2', 2, 'published', '[]', '[]'),
  ('b5000000-0000-4000-8000-000000000003', 'b4000000-0000-4000-8000-000000000001', 'stage-few-shot', 'Synthetic Lesson 3', 3, 'published', '[]', '[]'),
  ('b5000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000001', 'stage-grounding', 'Synthetic Lesson 4', 4, 'published', '[]', '[]'),
  ('b5000000-0000-4000-8000-000000000005', 'b4000000-0000-4000-8000-000000000002', 'stage-other-course', 'Synthetic Other Course Lesson', 1, 'published', '[]', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_instructors (course_id, user_id, permission) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000004', 'owner'),
  ('b2000000-0000-4000-8000-000000000002', 'b6000000-0000-4000-8000-000000000004', 'owner')
ON CONFLICT (course_id, user_id) DO NOTHING;

INSERT INTO public.learners (id, learner_code, user_id) VALUES
  ('b7000000-0000-4000-8000-000000000001', 'LRN-STAGE-A', 'b6000000-0000-4000-8000-000000000001'),
  ('b7000000-0000-4000-8000-000000000002', 'LRN-STAGE-B', 'b6000000-0000-4000-8000-000000000002'),
  ('b7000000-0000-4000-8000-000000000003', 'LRN-STAGE-C', 'b6000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enrollments (id, learner_id, class_id, status, joined_at, updated_at) VALUES
  ('b8000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('b8000000-0000-4000-8000-000000000002', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000002', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('b8000000-0000-4000-8000-000000000003', 'b7000000-0000-4000-8000-000000000002', 'b3000000-0000-4000-8000-000000000001', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  ('b8000000-0000-4000-8000-000000000004', 'b7000000-0000-4000-8000-000000000003', 'b3000000-0000-4000-8000-000000000001', 'removed', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- A: canonical lesson_ref_id. E: two attempts for the same progress row. H: valid evaluations.
INSERT INTO public.prompt_attempts (
  id, learner_id, class_id, lesson_id, lesson_ref_id, attempt_number,
  prompt_text, ai_output, evaluation_json, model, latency_ms, created_at
) VALUES
  ('b9000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'stage-zero-shot', 'b5000000-0000-4000-8000-000000000001', 1, 'Synthetic prompt A1', 'Synthetic output A1', '{"scores":{"taskCompletion":1,"groundedness":1,"formatAdherence":1,"constraintCompliance":1,"businessUsability":2},"total":6,"strengths":[],"improvements":[],"nextHint":"Synthetic hint"}', 'fixture', 101, '2026-02-01T01:00:00Z'),
  ('b9000000-0000-4000-8000-000000000002', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'stage-zero-shot', 'b5000000-0000-4000-8000-000000000001', 2, 'Synthetic prompt A2', 'Synthetic output A2', '{"scores":{"taskCompletion":2,"groundedness":2,"formatAdherence":2,"constraintCompliance":1,"businessUsability":2},"total":9,"strengths":[],"improvements":[],"nextHint":"Synthetic hint"}', 'fixture', 102, '2026-02-01T02:00:00Z'),
  -- B: lesson_id contains the lesson UUID while lesson_ref_id is null.
  ('b9000000-0000-4000-8000-000000000003', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000002', NULL, 1, 'Synthetic prompt B', 'Synthetic output B', '{"scores":{"taskCompletion":2,"groundedness":1,"formatAdherence":1,"constraintCompliance":1,"businessUsability":2},"total":7,"strengths":[],"improvements":[],"nextHint":"Synthetic hint"}', 'fixture', 103, '2026-02-02T01:00:00Z'),
  -- C + I: lesson_key mapping with malformed evaluation.
  ('b9000000-0000-4000-8000-000000000004', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'stage-few-shot', NULL, 1, 'Synthetic prompt C', 'Synthetic output C', '{"total":"invalid","scores":{}}', 'fixture', 104, '2026-02-03T01:00:00Z'),
  -- D: deliberately unmappable legacy identifier.
  ('b9000000-0000-4000-8000-000000000005', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'legacy-does-not-exist', NULL, 1, 'Synthetic prompt D', 'Synthetic output D', NULL, 'fixture', 105, '2026-02-04T01:00:00Z'),
  -- F: same learner, different class/course.
  ('b9000000-0000-4000-8000-000000000006', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000002', 'stage-other-course', 'b5000000-0000-4000-8000-000000000005', 1, 'Synthetic prompt F', 'Synthetic output F', '{"scores":{"taskCompletion":1,"groundedness":1,"formatAdherence":1,"constraintCompliance":1,"businessUsability":1},"total":5,"strengths":[],"improvements":[],"nextHint":"Synthetic hint"}', 'fixture', 106, '2026-02-05T01:00:00Z'),
  -- G: different learner.
  ('b9000000-0000-4000-8000-000000000007', 'b7000000-0000-4000-8000-000000000002', 'b3000000-0000-4000-8000-000000000001', 'stage-zero-shot', 'b5000000-0000-4000-8000-000000000001', 1, 'Synthetic prompt G1', 'Synthetic output G1', '{"scores":{"taskCompletion":2,"groundedness":2,"formatAdherence":1,"constraintCompliance":1,"businessUsability":2},"total":8,"strengths":[],"improvements":[],"nextHint":"Synthetic hint"}', 'fixture', 107, '2026-02-06T01:00:00Z'),
  ('b9000000-0000-4000-8000-000000000008', 'b7000000-0000-4000-8000-000000000002', 'b3000000-0000-4000-8000-000000000001', 'stage-grounding', NULL, 1, 'Synthetic prompt G2', 'Synthetic output G2', '{"scores":{"taskCompletion":2,"groundedness":2,"formatAdherence":2,"constraintCompliance":2,"businessUsability":2},"total":10,"strengths":[],"improvements":[],"nextHint":"Synthetic hint"}', 'fixture', 108, '2026-02-07T01:00:00Z'),
  -- Historical attempt for a learner whose enrollment is now removed; backfill preserves history.
  ('b9000000-0000-4000-8000-000000000009', 'b7000000-0000-4000-8000-000000000003', 'b3000000-0000-4000-8000-000000000001', 'stage-zero-shot', 'b5000000-0000-4000-8000-000000000001', 1, 'Synthetic prompt removed', 'Synthetic output removed', '{"scores":{"taskCompletion":1,"groundedness":1,"formatAdherence":1,"constraintCompliance":0,"businessUsability":1},"total":4,"strengths":[],"improvements":[],"nextHint":"Synthetic hint"}', 'fixture', 109, '2026-02-08T01:00:00Z')
ON CONFLICT (id) DO NOTHING;

COMMIT;
