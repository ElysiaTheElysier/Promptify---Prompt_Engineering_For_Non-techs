-- =============================================================================
-- MIGRATION 016: SERVER-BACKED LEARNING PROGRESS
-- prompt_attempts remains the event history. lesson_progress is the canonical
-- current state for a learner/class/lesson. During the zero-downtime transition,
-- legacy table writes and new RPC writes share one canonical trigger sync path.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
  best_score NUMERIC CHECK (best_score IS NULL OR (best_score >= 0 AND best_score <= 10)),
  last_attempt_id UUID REFERENCES public.prompt_attempts(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lesson_progress_learner_class_lesson_key
    UNIQUE (learner_id, class_id, lesson_id)
);
GRANT SELECT
ON TABLE public.lesson_progress
TO service_role;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_learner_class
  ON public.lesson_progress(learner_id, class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_class_lesson
  ON public.lesson_progress(class_id, lesson_id);

-- The application contract derives total from five integer criteria (0..2).
-- Invalid/malformed evaluation JSON is allowed on the attempt but contributes
-- no best_score, preserving the existing "save output even if Judge fails" rule.
CREATE OR REPLACE FUNCTION public.valid_evaluation_total(payload JSONB)
RETURNS NUMERIC AS $$
DECLARE
  score_keys CONSTANT TEXT[] := ARRAY[
    'taskCompletion',
    'groundedness',
    'formatAdherence',
    'constraintCompliance',
    'businessUsability'
  ];
  score_key TEXT;
  score_value NUMERIC;
  score_total NUMERIC := 0;
  declared_total NUMERIC;
BEGIN
  IF payload IS NULL
     OR jsonb_typeof(payload) <> 'object'
     OR jsonb_typeof(payload -> 'scores') <> 'object'
     OR jsonb_typeof(payload -> 'total') <> 'number' THEN
    RETURN NULL;
  END IF;

  declared_total := (payload ->> 'total')::NUMERIC;
  IF declared_total <> trunc(declared_total) OR declared_total < 0 OR declared_total > 10 THEN
    RETURN NULL;
  END IF;

  FOREACH score_key IN ARRAY score_keys LOOP
    IF jsonb_typeof(payload -> 'scores' -> score_key) <> 'number' THEN
      RETURN NULL;
    END IF;
    score_value := (payload -> 'scores' ->> score_key)::NUMERIC;
    IF score_value <> trunc(score_value) OR score_value < 0 OR score_value > 2 THEN
      RETURN NULL;
    END IF;
    score_total := score_total + score_value;
  END LOOP;

  IF declared_total <> score_total THEN
    RETURN NULL;
  END IF;

  RETURN declared_total;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.valid_evaluation_total(JSONB) FROM PUBLIC, anon, authenticated;

-- Canonical synchronization path for BOTH legacy direct writes and the new
-- RPCs. Because this is an AFTER trigger, the prompt_attempt already has its
-- final id and the lesson_progress.last_attempt_id foreign key is valid. Any
-- exception here aborts the surrounding INSERT/UPDATE transaction.
CREATE OR REPLACE FUNCTION public.sync_lesson_progress_from_prompt_attempt()
RETURNS TRIGGER AS $$
DECLARE
  canonical_lesson_id UUID;
  candidate_count INTEGER;
  valid_score NUMERIC;
  event_time TIMESTAMPTZ;
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

  IF TG_OP = 'INSERT' THEN
    event_time := coalesce(NEW.created_at, now());
    INSERT INTO public.lesson_progress (
      learner_id, class_id, lesson_id, status, attempts_count, best_score,
      last_attempt_id, started_at, completed_at, updated_at
    ) VALUES (
      NEW.learner_id, NEW.class_id, canonical_lesson_id, 'completed', 1, valid_score,
      NEW.id, event_time, event_time, event_time
    )
    ON CONFLICT (learner_id, class_id, lesson_id) DO UPDATE SET
      status = 'completed',
      attempts_count = public.lesson_progress.attempts_count + 1,
      best_score = CASE
        WHEN valid_score IS NULL THEN public.lesson_progress.best_score
        WHEN public.lesson_progress.best_score IS NULL THEN valid_score
        ELSE greatest(public.lesson_progress.best_score, valid_score)
      END,
      last_attempt_id = NEW.id,
      started_at = coalesce(public.lesson_progress.started_at, event_time),
      completed_at = coalesce(public.lesson_progress.completed_at, event_time),
      updated_at = event_time;
  ELSIF TG_OP = 'UPDATE' AND NEW.evaluation_json IS DISTINCT FROM OLD.evaluation_json THEN
    UPDATE public.lesson_progress lp
    SET best_score = CASE
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

REVOKE ALL ON FUNCTION public.sync_lesson_progress_from_prompt_attempt() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_prompt_attempt_progress_insert ON public.prompt_attempts;
CREATE TRIGGER trg_sync_prompt_attempt_progress_insert
AFTER INSERT ON public.prompt_attempts
FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_progress_from_prompt_attempt();

DROP TRIGGER IF EXISTS trg_sync_prompt_attempt_progress_evaluation ON public.prompt_attempts;
CREATE TRIGGER trg_sync_prompt_attempt_progress_evaluation
AFTER UPDATE OF evaluation_json ON public.prompt_attempts
FOR EACH ROW
WHEN (NEW.evaluation_json IS DISTINCT FROM OLD.evaluation_json)
EXECUTE FUNCTION public.sync_lesson_progress_from_prompt_attempt();

-- Backfill only deterministic mappings within the attempt's class/course.
WITH mapping_candidates AS (
  SELECT
    pa.id AS attempt_id,
    l.id AS canonical_lesson_id
  FROM public.prompt_attempts pa
  JOIN public.classes c ON c.id = pa.class_id
  JOIN public.course_modules m ON m.course_id = c.course_id
  JOIN public.lessons l ON l.module_id = m.id
  WHERE
    (pa.lesson_ref_id IS NOT NULL AND l.id = pa.lesson_ref_id)
    OR (
      pa.lesson_ref_id IS NULL
      AND pa.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND l.id = CASE
        WHEN pa.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN pa.lesson_id::UUID
        ELSE NULL
      END
    )
    OR (
      pa.lesson_ref_id IS NULL
      AND l.lesson_key = pa.lesson_id
    )
), deterministic_mapping AS (
  SELECT attempt_id, (array_agg(canonical_lesson_id ORDER BY canonical_lesson_id))[1] AS lesson_id
  FROM mapping_candidates
  GROUP BY attempt_id
  HAVING count(DISTINCT canonical_lesson_id) = 1
), grouped_progress AS (
  SELECT
    pa.learner_id,
    pa.class_id,
    dm.lesson_id,
    count(*)::INTEGER AS attempts_count,
    max(public.valid_evaluation_total(pa.evaluation_json)) AS best_score,
    (array_agg(pa.id ORDER BY pa.created_at DESC, pa.id DESC))[1] AS last_attempt_id,
    min(pa.created_at) AS started_at,
    min(pa.created_at) AS completed_at,
    max(pa.created_at) AS updated_at
  FROM public.prompt_attempts pa
  JOIN deterministic_mapping dm ON dm.attempt_id = pa.id
  GROUP BY pa.learner_id, pa.class_id, dm.lesson_id
)
INSERT INTO public.lesson_progress (
  learner_id, class_id, lesson_id, status, attempts_count, best_score,
  last_attempt_id, started_at, completed_at, updated_at
)
SELECT
  learner_id, class_id, lesson_id, 'completed', attempts_count, best_score,
  last_attempt_id, started_at, completed_at, updated_at
FROM grouped_progress
ON CONFLICT (learner_id, class_id, lesson_id) DO UPDATE SET
  status = 'completed',
  attempts_count = EXCLUDED.attempts_count,
  best_score = EXCLUDED.best_score,
  last_attempt_id = EXCLUDED.last_attempt_id,
  started_at = EXCLUDED.started_at,
  completed_at = EXCLUDED.completed_at,
  updated_at = EXCLUDED.updated_at;

DO $$
DECLARE
  total_attempts BIGINT;
  mapped_attempts BIGINT;
  unmapped_attempts BIGINT;
  with_ref BIGINT;
  legacy_uuid BIGINT;
  legacy_key BIGINT;
  unmapped_sample TEXT;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE lesson_ref_id IS NOT NULL),
    count(*) FILTER (
      WHERE lesson_ref_id IS NULL
        AND lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
    count(*) FILTER (
      WHERE lesson_ref_id IS NULL
        AND lesson_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  INTO total_attempts, with_ref, legacy_uuid, legacy_key
  FROM public.prompt_attempts;

  WITH candidates AS (
    SELECT pa.id AS attempt_id, l.id AS lesson_id
    FROM public.prompt_attempts pa
    JOIN public.classes c ON c.id = pa.class_id
    JOIN public.course_modules m ON m.course_id = c.course_id
    JOIN public.lessons l ON l.module_id = m.id
    WHERE
      (pa.lesson_ref_id IS NOT NULL AND l.id = pa.lesson_ref_id)
      OR (
        pa.lesson_ref_id IS NULL
        AND l.id = CASE
          WHEN pa.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN pa.lesson_id::UUID ELSE NULL END
      )
      OR (pa.lesson_ref_id IS NULL AND l.lesson_key = pa.lesson_id)
  ), deterministic AS (
    SELECT attempt_id FROM candidates GROUP BY attempt_id HAVING count(DISTINCT lesson_id) = 1
  )
  SELECT count(*) INTO mapped_attempts FROM deterministic;
  unmapped_attempts := total_attempts - mapped_attempts;

  WITH candidates AS (
    SELECT pa.id AS attempt_id, l.id AS lesson_id
    FROM public.prompt_attempts pa
    JOIN public.classes c ON c.id = pa.class_id
    JOIN public.course_modules m ON m.course_id = c.course_id
    JOIN public.lessons l ON l.module_id = m.id
    WHERE (pa.lesson_ref_id IS NOT NULL AND l.id = pa.lesson_ref_id)
       OR (pa.lesson_ref_id IS NULL AND l.lesson_key = pa.lesson_id)
       OR (
         pa.lesson_ref_id IS NULL
         AND l.id = CASE WHEN pa.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           THEN pa.lesson_id::UUID ELSE NULL END
       )
  ), deterministic AS (
    SELECT attempt_id FROM candidates GROUP BY attempt_id HAVING count(DISTINCT lesson_id) = 1
  )
  SELECT string_agg(sample.id::TEXT, ', ' ORDER BY sample.id::TEXT)
  INTO unmapped_sample
  FROM (
    SELECT pa.id
    FROM public.prompt_attempts pa
    LEFT JOIN deterministic dm ON dm.attempt_id = pa.id
    WHERE dm.attempt_id IS NULL
    ORDER BY pa.created_at, pa.id
    LIMIT 10
  ) sample;

  RAISE NOTICE 'lesson_progress backfill: total=%, A(ref present)=%, B(legacy UUID)=%, C(legacy key/text)=%, mapped=%, D(unmapped)=%, unmapped sample=%',
    total_attempts, with_ref, legacy_uuid, legacy_key, mapped_attempts, unmapped_attempts, coalesce(unmapped_sample, 'none');
END $$;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lesson_progress FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.lesson_progress TO authenticated;

DROP POLICY IF EXISTS "Learners read own lesson progress" ON public.lesson_progress;
CREATE POLICY "Learners read own lesson progress"
ON public.lesson_progress FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT l.id FROM public.learners l WHERE l.user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
  )
);

CREATE OR REPLACE FUNCTION public.record_prompt_attempt_and_progress(
  p_class_id UUID,
  p_lesson_id UUID,
  p_prompt_text TEXT,
  p_ai_output TEXT,
  p_evaluation_json JSONB DEFAULT NULL,
  p_model TEXT DEFAULT 'unknown',
  p_latency_ms INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  resolved_user_id UUID;
  resolved_learner_id UUID;
  next_attempt_number INTEGER;
  inserted_attempt public.prompt_attempts%ROWTYPE;
  upserted_progress public.lesson_progress%ROWTYPE;
  event_time TIMESTAMPTZ := now();
BEGIN
  resolved_user_id := public.current_user_id();
  IF resolved_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated Promptify user profile is required.';
  END IF;

  SELECT l.id INTO resolved_learner_id
  FROM public.learners l
  WHERE l.user_id = resolved_user_id;
  IF resolved_learner_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated learner profile is required.';
  END IF;

  IF NOT public.has_active_class_enrollment(p_class_id) THEN
    RAISE EXCEPTION 'Active enrollment is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.courses co ON co.id = c.course_id
    JOIN public.course_modules m ON m.course_id = co.id
    JOIN public.lessons l ON l.module_id = m.id
    WHERE c.id = p_class_id
      AND l.id = p_lesson_id
      AND c.status = 'active'
      AND co.status = 'active'
      AND co.publication_status = 'published'
      AND m.status = 'published'
      AND l.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Lesson does not belong to the active enrolled class.';
  END IF;

  IF nullif(btrim(p_prompt_text), '') IS NULL OR nullif(btrim(p_ai_output), '') IS NULL THEN
    RAISE EXCEPTION 'Prompt text and AI output are required.';
  END IF;

  -- Serialize attempts for this learner/class/lesson before calculating number.
  PERFORM pg_advisory_xact_lock(
    hashtext(resolved_learner_id::TEXT || ':' || p_class_id::TEXT || ':' || p_lesson_id::TEXT)
  );
  SELECT coalesce(max(pa.attempt_number), 0) + 1
  INTO next_attempt_number
  FROM public.prompt_attempts pa
  WHERE pa.learner_id = resolved_learner_id
    AND pa.class_id = p_class_id
    AND (pa.lesson_ref_id = p_lesson_id OR pa.lesson_id = p_lesson_id::TEXT);

  INSERT INTO public.prompt_attempts (
    learner_id, class_id, lesson_id, lesson_ref_id, attempt_number,
    prompt_text, ai_output, evaluation_json, model, latency_ms, created_at
  ) VALUES (
    resolved_learner_id, p_class_id, p_lesson_id::TEXT, p_lesson_id,
    next_attempt_number, p_prompt_text, p_ai_output, p_evaluation_json,
    coalesce(nullif(btrim(p_model), ''), 'unknown'), greatest(coalesce(p_latency_ms, 0), 0), event_time
  ) RETURNING * INTO inserted_attempt;

  -- The INSERT trigger is the only writer of lesson_progress. Select the row it
  -- synchronized so the client still receives attempt + progress atomically.
  SELECT * INTO upserted_progress
  FROM public.lesson_progress lp
  WHERE lp.learner_id = resolved_learner_id
    AND lp.class_id = p_class_id
    AND lp.lesson_id = p_lesson_id;

  IF upserted_progress.id IS NULL THEN
    RAISE EXCEPTION 'Prompt attempt trigger did not synchronize lesson progress.';
  END IF;

  RETURN jsonb_build_object(
    'attempt', to_jsonb(inserted_attempt),
    'progress', to_jsonb(upserted_progress)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.update_prompt_attempt_evaluation_and_progress(
  p_attempt_id UUID,
  p_evaluation_json JSONB
)
RETURNS JSONB AS $$
DECLARE
  resolved_user_id UUID;
  resolved_learner_id UUID;
  target_attempt public.prompt_attempts%ROWTYPE;
  updated_progress public.lesson_progress%ROWTYPE;
BEGIN
  resolved_user_id := public.current_user_id();
  SELECT l.id INTO resolved_learner_id
  FROM public.learners l
  WHERE l.user_id = resolved_user_id;
  IF resolved_learner_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated learner profile is required.';
  END IF;

  SELECT * INTO target_attempt
  FROM public.prompt_attempts pa
  WHERE pa.id = p_attempt_id
    AND pa.learner_id = resolved_learner_id
    AND pa.lesson_ref_id IS NOT NULL
  FOR UPDATE;
  IF target_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Owned canonical prompt attempt was not found.';
  END IF;

  IF NOT public.has_active_class_enrollment(target_attempt.class_id)
     OR NOT public.lesson_belongs_to_class(target_attempt.lesson_ref_id, target_attempt.class_id) THEN
    RAISE EXCEPTION 'Active lesson access is required.';
  END IF;

  UPDATE public.prompt_attempts
  SET evaluation_json = p_evaluation_json
  WHERE id = target_attempt.id
  RETURNING * INTO target_attempt;

  -- The UPDATE trigger is the only writer of best_score.
  SELECT * INTO updated_progress
  FROM public.lesson_progress lp
  WHERE lp.learner_id = resolved_learner_id
    AND lp.class_id = target_attempt.class_id
    AND lp.lesson_id = target_attempt.lesson_ref_id;

  IF updated_progress.id IS NULL THEN
    RAISE EXCEPTION 'Prompt attempt trigger did not synchronize lesson progress.';
  END IF;

  RETURN jsonb_build_object(
    'attempt', to_jsonb(target_attempt),
    'progress', to_jsonb(updated_progress)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.record_prompt_attempt_and_progress(UUID, UUID, TEXT, TEXT, JSONB, TEXT, INTEGER)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_prompt_attempt_evaluation_and_progress(UUID, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_prompt_attempt_and_progress(UUID, UUID, TEXT, TEXT, JSONB, TEXT, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_prompt_attempt_evaluation_and_progress(UUID, JSONB)
  TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';

-- Rollback plan before application dependency:
-- DROP FUNCTION IF EXISTS public.update_prompt_attempt_evaluation_and_progress(UUID, JSONB);
-- DROP FUNCTION IF EXISTS public.record_prompt_attempt_and_progress(UUID, UUID, TEXT, TEXT, JSONB, TEXT, INTEGER);
-- DROP TRIGGER IF EXISTS trg_sync_prompt_attempt_progress_evaluation ON public.prompt_attempts;
-- DROP TRIGGER IF EXISTS trg_sync_prompt_attempt_progress_insert ON public.prompt_attempts;
-- DROP FUNCTION IF EXISTS public.sync_lesson_progress_from_prompt_attempt();
-- DROP FUNCTION IF EXISTS public.valid_evaluation_total(JSONB);
-- DROP TABLE IF EXISTS public.lesson_progress;
