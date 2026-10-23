-- 012: durable asynchronous AI Judge jobs (additive). Plan: docs/proposals/JUDGE_ASYNC_PLAN_2026-10-22.md
-- Used only when the API runs with JUDGE_MODE=async. Scores are still written exclusively by
-- rebuild_finish_judge with the job's claim_id, so one attempt can never receive two scores.
BEGIN;

CREATE TABLE public.product_judge_jobs (
  attempt_id uuid PRIMARY KEY REFERENCES public.prompt_attempts (id),
  subject uuid NOT NULL,
  claim_id uuid NOT NULL UNIQUE,
  generation integer NOT NULL DEFAULT 1 CHECK (generation >= 1),
  status text NOT NULL CHECK (status IN ('queued','running','retry_wait','succeeded','failed','expired')),
  token_sha256 text NOT NULL CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  dispatch_count integer NOT NULL DEFAULT 0 CHECK (dispatch_count >= 0),
  lease_until timestamptz,
  last_error_code text CHECK (last_error_code IS NULL OR length(last_error_code) <= 64),
  last_upstream_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.product_judge_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.product_judge_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.product_judge_jobs TO service_role;
CREATE POLICY service_only ON public.product_judge_jobs TO service_role USING(true) WITH CHECK(true);

-- Create (or return) the job for an attempt. Idempotent while a job is active.
CREATE FUNCTION public.product_enqueue_judge(p_subject uuid, p_attempt uuid, p_claim uuid, p_token_sha text, p_ttl_seconds integer DEFAULT 900)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE attempt public.prompt_attempts; job public.product_judge_jobs; claim public.rebuild_judge_claims; next_generation integer := 1;
BEGIN
 IF p_token_sha !~ '^[0-9a-f]{64}$' OR p_ttl_seconds NOT BETWEEN 60 AND 3600 THEN RAISE EXCEPTION 'Invalid judge job request'; END IF;
 SELECT pa.* INTO STRICT attempt FROM public.prompt_attempts pa JOIN public.rebuild_runs r ON r.attempt_id=pa.id
  WHERE pa.id=p_attempt AND r.subject=p_subject FOR UPDATE OF pa;
 IF attempt.evaluation_json IS NOT NULL THEN RETURN jsonb_build_object('status','complete','evaluation',attempt.evaluation_json); END IF;
 SELECT * INTO job FROM public.product_judge_jobs WHERE attempt_id=p_attempt FOR UPDATE;
 IF FOUND THEN
  IF job.status IN ('queued','running','retry_wait') AND job.expires_at > now() THEN
   RETURN jsonb_build_object('status',job.status,'created',false,'generation',job.generation);
  END IF;
  next_generation := job.generation + 1;
 END IF;
 -- An unfinished claim may belong to a terminal job of this attempt, or be a stale synchronous claim
 -- (older than any request lifetime). A fresh foreign claim means a live synchronous grade: stay busy.
 SELECT * INTO claim FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt FOR UPDATE;
 IF FOUND THEN
  IF claim.completed_at IS NOT NULL THEN
   RETURN jsonb_build_object('status','complete','evaluation',attempt.evaluation_json);
  END IF;
  IF NOT ((job.attempt_id IS NOT NULL AND claim.claim_id=job.claim_id) OR claim.claimed_at < now()-interval '6 minutes') THEN
   RETURN jsonb_build_object('status','busy','created',false);
  END IF;
  DELETE FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt AND claim_id=claim.claim_id AND completed_at IS NULL;
 END IF;
 INSERT INTO public.rebuild_judge_claims(attempt_id,subject,claim_id) VALUES(p_attempt,p_subject,p_claim);
 INSERT INTO public.product_judge_jobs(attempt_id,subject,claim_id,generation,status,token_sha256,expires_at)
  VALUES(p_attempt,p_subject,p_claim,next_generation,'queued',p_token_sha,now()+make_interval(secs=>p_ttl_seconds))
 ON CONFLICT (attempt_id) DO UPDATE SET subject=EXCLUDED.subject,claim_id=EXCLUDED.claim_id,generation=EXCLUDED.generation,
  status='queued',token_sha256=EXCLUDED.token_sha256,dispatch_count=0,lease_until=NULL,last_error_code=NULL,last_upstream_status=NULL,
  created_at=now(),updated_at=now(),expires_at=EXCLUDED.expires_at;
 RETURN jsonb_build_object('status','queued','created',true,'generation',next_generation);
END $$;

-- Lease a job for one worker dispatch. Only the job's own token can lease it.
CREATE FUNCTION public.product_lease_judge(p_attempt uuid, p_token_sha text, p_lease_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE job public.product_judge_jobs;
BEGIN
 IF p_lease_seconds NOT BETWEEN 30 AND 900 THEN RAISE EXCEPTION 'Invalid lease'; END IF;
 SELECT * INTO job FROM public.product_judge_jobs WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR job.token_sha256<>p_token_sha THEN RETURN jsonb_build_object('status','denied'); END IF;
 IF job.status IN ('succeeded','failed','expired') THEN RETURN jsonb_build_object('status',job.status,'terminal',true); END IF;
 IF job.expires_at <= now() THEN
  DELETE FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt AND claim_id=job.claim_id AND completed_at IS NULL;
  UPDATE public.product_judge_jobs SET status='expired',lease_until=NULL,last_error_code='expired',updated_at=now() WHERE attempt_id=p_attempt;
  RETURN jsonb_build_object('status','expired','terminal',true);
 END IF;
 IF job.status='running' AND job.lease_until > now() THEN RETURN jsonb_build_object('status','busy'); END IF;
 UPDATE public.product_judge_jobs SET status='running',lease_until=now()+make_interval(secs=>p_lease_seconds),
  dispatch_count=dispatch_count+1,updated_at=now() WHERE attempt_id=p_attempt RETURNING * INTO job;
 RETURN jsonb_build_object('status','leased','subject',job.subject,'claim_id',job.claim_id,'generation',job.generation,'dispatch_count',job.dispatch_count);
END $$;

-- Record a job outcome for one generation. Terminal failures release the job's unfinished claim.
-- Success must be recorded after rebuild_finish_judge has saved the score.
CREATE FUNCTION public.product_settle_judge(p_attempt uuid, p_generation integer, p_outcome text, p_error text DEFAULT NULL, p_upstream integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE job public.product_judge_jobs;
BEGIN
 IF p_outcome NOT IN ('succeeded','failed','retry_wait','expired') THEN RAISE EXCEPTION 'Invalid judge outcome'; END IF;
 SELECT * INTO job FROM public.product_judge_jobs WHERE attempt_id=p_attempt AND generation=p_generation FOR UPDATE;
 IF NOT FOUND OR job.status IN ('succeeded','failed','expired') THEN RETURN jsonb_build_object('status','stale'); END IF;
 IF p_outcome='succeeded' AND NOT EXISTS(SELECT 1 FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt AND claim_id=job.claim_id AND completed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Judge score not saved';
 END IF;
 IF p_outcome IN ('failed','expired') THEN
  DELETE FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt AND claim_id=job.claim_id AND completed_at IS NULL;
 END IF;
 UPDATE public.product_judge_jobs SET status=p_outcome,lease_until=NULL,last_error_code=left(p_error,64),last_upstream_status=p_upstream,updated_at=now()
  WHERE attempt_id=p_attempt;
 RETURN jsonb_build_object('status',p_outcome);
END $$;

REVOKE ALL PRIVILEGES ON FUNCTION public.product_enqueue_judge(uuid,uuid,uuid,text,integer), public.product_lease_judge(uuid,text,integer),
 public.product_settle_judge(uuid,integer,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_enqueue_judge(uuid,uuid,uuid,text,integer), public.product_lease_judge(uuid,text,integer),
 public.product_settle_judge(uuid,integer,text,text,integer) TO service_role;
COMMIT;
