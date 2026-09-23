-- Allow enrolled learners and instructors to persist a retried AI evaluation.
DROP POLICY IF EXISTS "Learners and instructors can update prompt attempts" ON public.prompt_attempts;
CREATE POLICY "Learners and instructors can update prompt attempts"
ON public.prompt_attempts FOR UPDATE TO authenticated
USING (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
  )
)
WITH CHECK (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
  )
);

NOTIFY pgrst, 'reload schema';
