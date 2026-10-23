-- Rollback for 018. Fails while a learner has several open requests for one lesson; decide them first.
BEGIN;
DROP INDEX public.product_hint_requests_learner_lesson_idx;
CREATE UNIQUE INDEX product_hint_requests_one_pending ON public.product_hint_requests (learner_id, class_id, lesson_id) WHERE status = 'pending';
COMMIT;
