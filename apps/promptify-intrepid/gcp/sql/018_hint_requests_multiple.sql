-- 018: learners may keep several hint requests open for the same lesson (additive relaxation of 017).
-- The API bounds open requests per learner and lesson; each request is still decided once.
BEGIN;
DROP INDEX public.product_hint_requests_one_pending;
CREATE INDEX product_hint_requests_learner_lesson_idx ON public.product_hint_requests (learner_id, class_id, lesson_id, status);
COMMIT;
