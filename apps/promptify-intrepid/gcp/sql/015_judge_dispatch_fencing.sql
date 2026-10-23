-- Migration 012 is already applied; add atomic per-dispatch fencing without rewriting it.
BEGIN;
CREATE FUNCTION public.product_lease_judge_dispatch(p_attempt uuid,p_token_sha text,p_lease_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE j public.product_judge_jobs;
BEGIN
 SELECT * INTO j FROM public.product_judge_jobs WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR j.token_sha256<>p_token_sha THEN RETURN jsonb_build_object('status','denied'); END IF;
 -- Enforce the budget in SQL as well as Cloud Tasks configuration, including crash/reclaim paths.
 IF j.status IN('queued','running','retry_wait') AND j.expires_at>now()
 AND NOT(j.status='running' AND j.lease_until>now()) AND j.dispatch_count>=3 THEN
  DELETE FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt AND claim_id=j.claim_id AND completed_at IS NULL;
  UPDATE public.product_judge_jobs SET status='failed',lease_until=NULL,last_error_code='retry_budget_exhausted',updated_at=now() WHERE attempt_id=p_attempt;
  RETURN jsonb_build_object('status','failed','terminal',true);
 END IF;
 RETURN public.product_lease_judge(p_attempt,p_token_sha,p_lease_seconds);
END $$;
CREATE FUNCTION public.product_finish_judge_dispatch(p_attempt uuid,p_generation integer,p_dispatch integer,p_evaluation jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE j public.product_judge_jobs;
BEGIN
 SELECT * INTO j FROM public.product_judge_jobs WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR j.status<>'running' OR j.generation<>p_generation OR j.dispatch_count<>p_dispatch
 OR j.lease_until<=now() OR j.expires_at<=now() THEN RETURN jsonb_build_object('status','stale'); END IF;
 PERFORM public.rebuild_finish_judge(j.subject,p_attempt,j.claim_id,p_evaluation);
 UPDATE public.product_judge_jobs SET status='succeeded',lease_until=NULL,updated_at=now() WHERE attempt_id=p_attempt;
 RETURN jsonb_build_object('status','succeeded');
END $$;
CREATE FUNCTION public.product_settle_judge_dispatch(p_attempt uuid,p_generation integer,p_dispatch integer,p_outcome text,p_error text DEFAULT NULL,p_upstream integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE j public.product_judge_jobs;
BEGIN
 SELECT * INTO j FROM public.product_judge_jobs WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR j.status<>'running' OR j.generation<>p_generation OR j.dispatch_count<>p_dispatch
 OR j.lease_until<=now() THEN RETURN jsonb_build_object('status','stale'); END IF;
 RETURN public.product_settle_judge(p_attempt,p_generation,p_outcome,p_error,p_upstream);
END $$;
REVOKE ALL ON FUNCTION public.product_lease_judge_dispatch(uuid,text,integer),public.product_finish_judge_dispatch(uuid,integer,integer,jsonb),public.product_settle_judge_dispatch(uuid,integer,integer,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_lease_judge_dispatch(uuid,text,integer),public.product_finish_judge_dispatch(uuid,integer,integer,jsonb),public.product_settle_judge_dispatch(uuid,integer,integer,text,text,integer) TO service_role;
COMMIT;
