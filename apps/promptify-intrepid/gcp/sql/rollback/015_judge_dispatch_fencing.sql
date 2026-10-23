-- Drain all Judge work, disable JUDGE_FENCING_MODE, then roll back. Saved grades stay intact.
BEGIN;
DROP FUNCTION public.product_lease_judge_dispatch(uuid,text,integer);
DROP FUNCTION public.product_finish_judge_dispatch(uuid,integer,integer,jsonb);
DROP FUNCTION public.product_settle_judge_dispatch(uuid,integer,integer,text,text,integer);
COMMIT;
