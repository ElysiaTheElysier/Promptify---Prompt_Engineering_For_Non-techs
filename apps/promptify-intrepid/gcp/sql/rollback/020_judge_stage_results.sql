-- Rollback for 020. Saved grades are untouched; only provisional per-stage rows are dropped
-- (running jobs then re-grade all stages, as before 020). Code treats a missing table as "no stored stages".
BEGIN;
DROP TABLE public.product_judge_stage_results;
COMMIT;
