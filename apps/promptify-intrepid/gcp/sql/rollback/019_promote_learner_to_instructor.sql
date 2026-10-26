-- Rollback for 019. Promotions already made stay (roles, course_instructors, audit rows); only the function is removed.
BEGIN;
DROP FUNCTION public.product_promote_learner_to_instructor(uuid,text,text,text);
COMMIT;
