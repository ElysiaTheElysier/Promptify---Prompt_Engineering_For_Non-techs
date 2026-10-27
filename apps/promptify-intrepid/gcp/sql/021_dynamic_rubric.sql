-- 021: dynamic rubric (trainer-defined criteria). Additive, no table or row change.
-- Studio saves 1-8 criteria with generated keys (lowercase + _, so Judge stage names still satisfy 020's check);
-- weights still total 100 and the score stays on a 10-point scale (weighted-v1 maxima sum to 10).
-- valid_evaluation_total accepts the same keys/count, so custom-rubric attempts count for pass/awards.
-- Every attempt already grades against rebuild_runs.snapshot.production_rubric frozen at Run start.
-- Mirrors weightedRubricService.validateRubric (RUBRIC_MAX_CRITERIA, RUBRIC_KEY_PATTERN). Rollback: rollback/021.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.product_save_studio(p_class uuid, p_lesson uuid, p_expected_revision integer, p_config jsonb, p_fields jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE current_revision integer; criterion jsonb; total numeric; field_state text;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson) THEN RAISE EXCEPTION 'Lesson outside course'; END IF;
 -- Serialize first saves as well as updates without locking another class.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_class::text||p_lesson::text,946));
 SELECT revision INTO current_revision FROM public.product_studio WHERE class_id=p_class AND lesson_id=p_lesson FOR UPDATE;
 current_revision:=coalesce(current_revision,0);
 IF current_revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 IF jsonb_typeof(p_config->'rubric') IS DISTINCT FROM 'array' OR jsonb_array_length(p_config->'rubric') NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'Rubric needs 1-8 criteria'; END IF;
 IF (SELECT count(DISTINCT c->>'key') FROM jsonb_array_elements(p_config->'rubric') c)<>jsonb_array_length(p_config->'rubric') THEN RAISE EXCEPTION 'Unique criteria required'; END IF;
 total:=0;
 FOR criterion IN SELECT value FROM jsonb_array_elements(p_config->'rubric') LOOP
  IF criterion->>'key' IS NULL OR criterion->>'key' !~ '^[a-z][a-z_]{1,39}$' OR jsonb_typeof(criterion->'label') IS DISTINCT FROM 'string' OR length(btrim(criterion->>'label')) NOT BETWEEN 1 AND 200 OR jsonb_typeof(criterion->'description') IS DISTINCT FROM 'string' OR length(criterion->>'description')>4000 OR jsonb_typeof(criterion->'weight') IS DISTINCT FROM 'number' OR jsonb_typeof(criterion->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid criterion'; END IF;
  IF (criterion->>'weight')::numeric<0 OR (criterion->>'weight')::numeric>100 OR NOT(criterion->>'active')::boolean AND (criterion->>'weight')::numeric<>0 THEN RAISE EXCEPTION 'Invalid criterion weight'; END IF;
  total:=total+(criterion->>'weight')::numeric;
 END LOOP;
 IF total<>100 THEN RAISE EXCEPTION 'Weights must sum to 100'; END IF;
 IF p_config->>'state' IS NULL OR p_config->>'state' NOT IN ('DRAFT','ACTIVE','SCHEDULED','ARCHIVED') THEN RAISE EXCEPTION 'Invalid lifecycle state'; END IF;
 IF p_config->>'state'='SCHEDULED' AND (nullif(p_config->>'startTime','') IS NULL OR nullif(p_config->>'endTime','') IS NULL OR (p_config->>'endTime')::timestamptz <= (p_config->>'startTime')::timestamptz) THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 IF jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR jsonb_typeof(p_fields->'title') IS DISTINCT FROM 'string' OR length(btrim(p_fields->>'title')) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Invalid lesson title'; END IF;
 field_state:=CASE p_config->>'state' WHEN 'DRAFT' THEN 'draft' WHEN 'ARCHIVED' THEN 'archived' ELSE 'published' END;
 -- Only approved lesson fields become class overrides; client-supplied override keys are ignored.
 p_config:=(p_config-'lessonOverrides')||jsonb_build_object('lessonOverrides',jsonb_build_object(
  'title',btrim(p_fields->>'title'),'scenario',p_fields->>'scenario','task_goal',p_fields->>'task_goal',
  'system_instruction',p_fields->>'system_instruction','starter_prompt',p_fields->>'starter_prompt',
  'sample_input_context',p_fields->>'sample_input_context','status',field_state));
 INSERT INTO public.product_studio(class_id,lesson_id,revision,config,updated_by) VALUES(p_class,p_lesson,current_revision+1,p_config,public.current_user_id())
 ON CONFLICT(class_id,lesson_id) DO UPDATE SET revision=excluded.revision,config=excluded.config,updated_by=excluded.updated_by,updated_at=now();
 -- Course lesson/rubric remain immutable templates for this class edit.
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'studio.save','Lesson '||p_lesson||' revision '||(current_revision+1));
 RETURN jsonb_build_object('revision',current_revision+1,'lessonId',p_lesson);
END $function$
;

CREATE OR REPLACE FUNCTION public.valid_evaluation_total(payload jsonb) RETURNS numeric LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
DECLARE item jsonb; total numeric:=0; maxima numeric:=0;
BEGIN
 IF payload->>'contract' IS DISTINCT FROM 'weighted-v1' THEN RETURN public.legacy_valid_evaluation_total(payload); END IF;
 IF jsonb_typeof(payload->'criteria') IS DISTINCT FROM 'array' OR jsonb_typeof(payload->'total') IS DISTINCT FROM 'number' OR jsonb_array_length(payload->'criteria') NOT BETWEEN 1 AND 8 THEN RETURN NULL; END IF;
 IF (SELECT count(DISTINCT c->>'key') FROM jsonb_array_elements(payload->'criteria') c)<>jsonb_array_length(payload->'criteria') THEN RETURN NULL; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'criteria') LOOP
  IF item->>'key' !~ '^[a-z][a-z_]{1,39}$' OR jsonb_typeof(item->'score') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'max') IS DISTINCT FROM 'number' THEN RETURN NULL; END IF;
  IF (item->>'score')::numeric<0 OR (item->>'score')::numeric>(item->>'max')::numeric OR (item->>'max')::numeric<=0 THEN RETURN NULL; END IF;
  total:=total+(item->>'score')::numeric; maxima:=maxima+(item->>'max')::numeric;
 END LOOP;
 IF maxima<>10 OR round(total,2)<>(payload->>'total')::numeric THEN RETURN NULL; END IF;
 RETURN round(total,2);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN NULL;
END $$;
REVOKE ALL PRIVILEGES ON FUNCTION public.valid_evaluation_total (jsonb) FROM PUBLIC, anon, authenticated;

COMMIT;
