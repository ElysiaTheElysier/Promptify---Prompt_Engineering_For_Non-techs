-- Forward-only F10. User approved Trainer reads ONLY assigned course/class scope.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
-- ALTER preserves policy identity and grants; trusted service role policy remains separate.
ALTER POLICY "Learners read own lesson progress" ON public.lesson_progress USING (
 public.product_can_read_class(class_id) AND (
  public.rebuild_can_teach(class_id)
  OR EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id() AND u.role='admin')
  OR EXISTS(SELECT 1 FROM public.learners l WHERE l.id=lesson_progress.learner_id
   AND l.user_id=public.current_user_id() AND public.has_active_class_enrollment(lesson_progress.class_id))
 ));
COMMIT;
