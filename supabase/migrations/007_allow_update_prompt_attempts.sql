-- MIGRATION: 007_allow_update_prompt_attempts.sql
-- Mục đích: Cho phép người học cập nhật kết quả đánh giá (evaluation_json)
-- khi thực hiện 'Thử đánh giá lại' (Retry Evaluation) cho chính bài làm của mình.

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
