-- Forward fix: qualify the outer class reference in hint enrollment checks.
-- Preserve applied migration 018. Tightens access; does not grant new access.
BEGIN;
ALTER POLICY hint_send ON public.trainer_hints
WITH CHECK (
  trainer_id = public.current_user_id()
  AND public.rebuild_can_teach(trainer_hints.class_id)
  AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.learner_id = trainer_hints.learner_id
      AND e.class_id = trainer_hints.class_id
      AND e.status = 'active'
  )
);
COMMIT;
NOTIFY pgrst, 'reload schema';
