-- promptify_loadtest only. Usage (as postgres, database promptify_loadtest):
--   psql ... -v mode=verify -f reset_and_verify.sql    read-only integrity report after a run
--   psql ... -v mode=reset  -f reset_and_verify.sql    clear all Judge state before the next run
\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'promptify_loadtest' THEN RAISE EXCEPTION 'promptify_loadtest only'; END IF; END $$;
\if :{?mode}
\else
\set mode verify
\endif
SELECT :'mode' = 'reset' AS do_reset \gset
\if :do_reset
BEGIN;
DELETE FROM product_judge_stage_results;DELETE FROM product_judge_jobs;DELETE FROM rebuild_judge_claims;DELETE FROM product_provider_calls;
UPDATE prompt_attempts SET evaluation_json=NULL WHERE evaluation_json IS NOT NULL;
DELETE FROM product_request_budgets WHERE operation='ai.judge';
UPDATE product_provider_budget SET breaker_until=NULL,consecutive_failures=0 WHERE id=1;
COMMIT;
\echo reset done
\else
\echo === jobs by status (generation>1 or dispatch>1 = queue retries) ===
SELECT status,count(*) jobs,max(generation) max_generation,max(dispatch_count) max_dispatch,sum(dispatch_count) dispatches FROM product_judge_jobs GROUP BY status ORDER BY 1;
\echo === duplicates / lost grades / stuck claims ===
SELECT (SELECT count(*)-count(DISTINCT attempt_id) FROM product_judge_jobs) AS duplicate_jobs,
 (SELECT count(*) FROM product_judge_jobs j JOIN prompt_attempts a ON a.id=j.attempt_id WHERE j.status='succeeded' AND a.evaluation_json IS NULL) AS lost_grades,
 (SELECT count(*) FROM prompt_attempts a WHERE a.evaluation_json IS NOT NULL AND NOT EXISTS(SELECT 1 FROM product_judge_jobs j WHERE j.attempt_id=a.id AND j.status='succeeded')) AS grades_without_job,
 (SELECT count(*) FROM rebuild_judge_claims WHERE completed_at IS NULL) AS open_claims,
 (SELECT count(*) FROM prompt_attempts WHERE evaluation_json IS NOT NULL) AS graded;
\echo === admission permits (running = held; expired = released by lease) ===
SELECT status,count(*) FROM product_provider_calls GROUP BY status ORDER BY 1;
SELECT count(*) AS held_now FROM product_provider_calls WHERE status='running';
\echo === stage rows (6 per grade expected; more = retries/hedges) ===
SELECT count(*) stage_rows,count(DISTINCT attempt_id) attempts FROM product_judge_stage_results;
\endif
