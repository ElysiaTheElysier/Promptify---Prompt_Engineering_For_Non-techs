-- Rollback for 017. Approved hints stay unlocked (product_learner_support) and replies stay in trainer_hints;
-- only the request history is dropped. Deploy an API without the hint-request actions first.
BEGIN;
DROP TABLE public.product_hint_requests;
COMMIT;
