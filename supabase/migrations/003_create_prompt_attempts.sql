-- ==============================================================================
-- MIGRATION: 003_create_prompt_attempts.sql
-- Mục đích: Tạo bảng prompt_attempts để lưu trữ lịch sử các lần chạy prompt thật,
--           kết quả AI sinh ra và điểm đánh giá AI Evaluation của học viên.
-- Hoàn toàn IDEMPOTENT: Chạy an toàn trên database hiện tại.
-- ==============================================================================

-- 1. TẠO BẢNG prompt_attempts
CREATE TABLE IF NOT EXISTS public.prompt_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  ai_output TEXT NOT NULL,
  evaluation_json JSONB,
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  latency_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TẠO INDEXES CHO TRUY VẤN NHANH
CREATE INDEX IF NOT EXISTS idx_prompt_attempts_learner ON public.prompt_attempts(learner_id);
CREATE INDEX IF NOT EXISTS idx_prompt_attempts_class_lesson ON public.prompt_attempts(class_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_prompt_attempts_created ON public.prompt_attempts(created_at DESC);

-- 3. CẤP QUYỀN DATA API
REVOKE ALL ON TABLE public.prompt_attempts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prompt_attempts TO authenticated;

-- 4. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.prompt_attempts ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES
DROP POLICY IF EXISTS "Authenticated users can select prompt attempts" ON public.prompt_attempts;
CREATE POLICY "Authenticated users can select prompt attempts"
  ON public.prompt_attempts FOR SELECT
  TO authenticated
  USING (
    public.is_instructor()
    OR learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert prompt attempts" ON public.prompt_attempts;
CREATE POLICY "Authenticated users can insert prompt attempts"
  ON public.prompt_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_instructor()
    OR learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "Instructors can delete prompt attempts" ON public.prompt_attempts;
CREATE POLICY "Instructors can delete prompt attempts"
  ON public.prompt_attempts FOR DELETE
  TO authenticated
  USING (
    public.is_instructor()
  );

-- 6. TẢI LẠI SCHEMA CHO POSTGREST CACHE
NOTIFY pgrst, 'reload schema';

