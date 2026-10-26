-- 020: per-stage AI Judge results (additive). Proposal: docs/proposals/JUDGE_LATENCY_PRODUCTION_2026-10-26.md
-- Each validated supervisor/criterion answer is kept so a redispatch, refresh or reconnect never re-grades
-- a finished stage, and the UI can show criteria while the job is still running. Rows are provisional:
-- the score is still written only by the fenced finish of 012/015, so one attempt keeps exactly one grade.
-- input_sha256 is the hash of the exact provider payload; a different payload never reuses a row.
BEGIN;

CREATE TABLE public.product_judge_stage_results (
  attempt_id uuid NOT NULL REFERENCES public.prompt_attempts (id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage ~ '^[a-z]+(:[a-z_]+)?$' AND length(stage) <= 64),
  input_sha256 text NOT NULL CHECK (input_sha256 ~ '^[0-9a-f]{64}$'),
  result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object' AND octet_length(result::text) <= 16384),
  view jsonb NOT NULL CHECK (jsonb_typeof(view) = 'object' AND octet_length(view::text) <= 8192),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, stage)
);
ALTER TABLE public.product_judge_stage_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.product_judge_stage_results FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.product_judge_stage_results TO service_role;
CREATE POLICY service_only ON public.product_judge_stage_results TO service_role USING(true) WITH CHECK(true);

COMMIT;
