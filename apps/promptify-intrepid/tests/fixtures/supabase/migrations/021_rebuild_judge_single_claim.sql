-- Avoid concurrent Judge provider calls. An uncertain claim requires operator review.
BEGIN;
CREATE TABLE public.rebuild_judge_claims (
 attempt_id uuid PRIMARY KEY REFERENCES public.prompt_attempts(id),
 subject uuid NOT NULL, claim_id uuid NOT NULL UNIQUE, claimed_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
ALTER TABLE public.rebuild_judge_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rebuild_judge_claims FROM anon,authenticated;
GRANT ALL ON public.rebuild_judge_claims TO service_role;
CREATE FUNCTION public.rebuild_claim_judge(p_subject uuid,p_attempt uuid,p_claim uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE attempt public.prompt_attempts; inserted integer;
BEGIN
 SELECT pa.* INTO STRICT attempt FROM public.prompt_attempts pa JOIN public.rebuild_runs r ON r.attempt_id=pa.id
 WHERE pa.id=p_attempt AND r.subject=p_subject FOR UPDATE OF pa;
 IF attempt.evaluation_json IS NOT NULL THEN RETURN jsonb_build_object('status','complete','evaluation',attempt.evaluation_json); END IF;
 INSERT INTO public.rebuild_judge_claims(attempt_id,subject,claim_id) VALUES(p_attempt,p_subject,p_claim) ON CONFLICT(attempt_id) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 RETURN jsonb_build_object('status',CASE WHEN inserted=1 THEN 'claimed' ELSE 'busy' END);
END $$;
CREATE FUNCTION public.rebuild_finish_judge(p_subject uuid,p_attempt uuid,p_claim uuid,p_evaluation jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE claim public.rebuild_judge_claims; saved jsonb;
BEGIN
 SELECT * INTO STRICT claim FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt AND subject=p_subject AND claim_id=p_claim FOR UPDATE;
 IF claim.completed_at IS NOT NULL THEN RETURN (SELECT evaluation_json FROM public.prompt_attempts WHERE id=p_attempt); END IF;
 saved:=public.rebuild_save_evaluation(p_subject,p_attempt,p_evaluation);
 UPDATE public.rebuild_judge_claims SET completed_at=now() WHERE attempt_id=p_attempt;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.rebuild_claim_judge(uuid,uuid,uuid), public.rebuild_finish_judge(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_claim_judge(uuid,uuid,uuid),public.rebuild_finish_judge(uuid,uuid,uuid,jsonb) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
