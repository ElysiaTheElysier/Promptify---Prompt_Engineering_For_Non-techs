-- Capture each accepted run's passing policy; retain historical legacy semantics.
BEGIN;
ALTER TABLE public.prompt_attempts ADD COLUMN production_pass_threshold numeric CHECK (production_pass_threshold BETWEEN 0 AND 10);
CREATE FUNCTION public.product_capture_attempt_threshold() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE threshold numeric;
BEGIN
 SELECT coalesce((snapshot->>'production_pass_threshold')::numeric,8) INTO threshold FROM public.rebuild_runs
 WHERE subject=auth.uid() AND request_id=nullif(current_setting('promptify.request_id',true),'')::uuid
 AND class_id=NEW.class_id AND lesson_id=NEW.lesson_ref_id;
 NEW.production_pass_threshold:=threshold;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.product_capture_attempt_threshold() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER product_attempt_threshold BEFORE INSERT ON public.prompt_attempts FOR EACH ROW EXECUTE FUNCTION public.product_capture_attempt_threshold();
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.rebuild_finish_run(uuid,uuid,jsonb)'::regprocedure);
 definition:=replace(definition,'saved:=public.record_prompt_attempt_and_progress', 'PERFORM set_config(''promptify.request_id'',p_request::text,true); saved:=public.record_prompt_attempt_and_progress');
 IF position('promptify.request_id' in definition)=0 THEN RAISE EXCEPTION 'Unexpected finish-run definition'; END IF;
 EXECUTE definition;
END $$;
CREATE OR REPLACE FUNCTION public.sync_lesson_progress_from_prompt_attempt()
RETURNS TRIGGER AS $$
DECLARE
  canonical_lesson_id UUID;
  candidate_count INTEGER;
  valid_score NUMERIC;
  event_time TIMESTAMPTZ;
  passed BOOLEAN;
BEGIN
  SELECT
    count(DISTINCT l.id),
    (array_agg(DISTINCT l.id ORDER BY l.id))[1]
  INTO candidate_count, canonical_lesson_id
  FROM public.classes c
  JOIN public.course_modules m ON m.course_id = c.course_id
  JOIN public.lessons l ON l.module_id = m.id
  WHERE c.id = NEW.class_id
    AND (
      (NEW.lesson_ref_id IS NOT NULL AND l.id = NEW.lesson_ref_id)
      OR (
        NEW.lesson_ref_id IS NULL
        AND NEW.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND l.id = CASE
          WHEN NEW.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN NEW.lesson_id::UUID ELSE NULL END
      )
      OR (NEW.lesson_ref_id IS NULL AND l.lesson_key = NEW.lesson_id)
    );

  IF candidate_count <> 1 OR canonical_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Prompt attempt cannot be mapped to exactly one lesson in its class course.';
  END IF;

  valid_score := public.valid_evaluation_total(NEW.evaluation_json);
  passed := NEW.production_pass_threshold IS NULL OR coalesce(valid_score >= NEW.production_pass_threshold, false);

  IF TG_OP = 'INSERT' THEN
    event_time := coalesce(NEW.created_at, now());
    INSERT INTO public.lesson_progress (
      learner_id, class_id, lesson_id, status, attempts_count, best_score,
      last_attempt_id, started_at, completed_at, updated_at
    ) VALUES (
      NEW.learner_id, NEW.class_id, canonical_lesson_id, CASE WHEN passed THEN 'completed' ELSE 'in_progress' END, 1, valid_score,
      NEW.id, event_time, CASE WHEN passed THEN event_time ELSE NULL END, event_time
    )
    ON CONFLICT (learner_id, class_id, lesson_id) DO UPDATE SET
      status = CASE WHEN passed OR public.lesson_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
      attempts_count = public.lesson_progress.attempts_count + 1,
      best_score = CASE
        WHEN valid_score IS NULL THEN public.lesson_progress.best_score
        WHEN public.lesson_progress.best_score IS NULL THEN valid_score
        ELSE greatest(public.lesson_progress.best_score, valid_score)
      END,
      last_attempt_id = NEW.id,
      started_at = coalesce(public.lesson_progress.started_at, event_time),
      completed_at = coalesce(public.lesson_progress.completed_at, CASE WHEN passed THEN event_time ELSE NULL END),
      updated_at = event_time;
  ELSIF TG_OP = 'UPDATE' AND NEW.evaluation_json IS DISTINCT FROM OLD.evaluation_json THEN
    UPDATE public.lesson_progress lp
    SET status = CASE WHEN passed OR lp.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
        completed_at = coalesce(lp.completed_at, CASE WHEN passed THEN now() ELSE NULL END),
        best_score = CASE
          WHEN valid_score IS NULL THEN lp.best_score
          WHEN lp.best_score IS NULL THEN valid_score
          ELSE greatest(lp.best_score, valid_score)
        END,
        updated_at = now()
    WHERE lp.learner_id = NEW.learner_id
      AND lp.class_id = NEW.class_id
      AND lp.lesson_id = canonical_lesson_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Canonical lesson progress is missing for updated prompt attempt.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


COMMIT;
NOTIFY pgrst,'reload schema';
