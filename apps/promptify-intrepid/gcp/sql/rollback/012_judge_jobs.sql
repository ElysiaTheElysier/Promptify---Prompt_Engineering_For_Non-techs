-- Rollback for 012. Run only after the API is back on JUDGE_MODE=sync and no job is queued/running.
-- Saved scores live in prompt_attempts/rebuild_judge_claims and are not touched. Job history is dropped;
-- export product_judge_jobs first if it must be kept.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.product_judge_jobs WHERE status IN ('queued','running','retry_wait') AND expires_at > now()) THEN
  RAISE EXCEPTION 'Active judge jobs exist; switch to JUDGE_MODE=sync and wait for expiry first';
 END IF;
END $$;
-- Release claims still owned by non-succeeded jobs so synchronous grading can claim them again.
DELETE FROM public.rebuild_judge_claims c USING public.product_judge_jobs j
 WHERE c.attempt_id=j.attempt_id AND c.claim_id=j.claim_id AND c.completed_at IS NULL;
DROP FUNCTION public.product_settle_judge(uuid,integer,text,text,integer);
DROP FUNCTION public.product_lease_judge(uuid,text,integer);
DROP FUNCTION public.product_enqueue_judge(uuid,uuid,uuid,text,integer);
DROP TABLE public.product_judge_jobs;
COMMIT;
