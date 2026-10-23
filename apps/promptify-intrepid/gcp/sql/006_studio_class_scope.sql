-- Forward-only F01: user approved Studio edits ONLY selected class (2026-10-14).
-- No table merge, no historical run/attempt/award rewrite. Apply after 005.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';


CREATE OR REPLACE FUNCTION public.product_class_lesson_status(p_class uuid,p_lesson uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
 SELECT coalesce(s.config#>>'{lessonOverrides,status}',l.status)
 FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id
 JOIN public.classes c ON c.course_id=m.course_id AND c.id=p_class
 LEFT JOIN public.product_studio s ON s.class_id=c.id AND s.lesson_id=l.id WHERE l.id=p_lesson;
$$;
-- Internal helper avoids RLS recursion; existing authorized functions call it as owner.
REVOKE ALL ON FUNCTION public.product_class_lesson_status(uuid,uuid) FROM PUBLIC,anon,authenticated;


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
 IF jsonb_typeof(p_config->'rubric') IS DISTINCT FROM 'array' OR jsonb_array_length(p_config->'rubric')<>5 THEN RAISE EXCEPTION 'Five criteria required'; END IF;
 IF (SELECT count(DISTINCT c->>'key') FROM jsonb_array_elements(p_config->'rubric') c)<>5 THEN RAISE EXCEPTION 'Unique criteria required'; END IF;
 total:=0;
 FOR criterion IN SELECT value FROM jsonb_array_elements(p_config->'rubric') LOOP
  IF criterion->>'key' IS NULL OR criterion->>'key' NOT IN ('groundedness','persona','format','oneshot','actionability') OR jsonb_typeof(criterion->'weight') IS DISTINCT FROM 'number' OR jsonb_typeof(criterion->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid criterion'; END IF;
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

CREATE OR REPLACE FUNCTION public.product_can_read_lesson(p_lesson uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT EXISTS(SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id
 JOIN public.classes c ON c.course_id=m.course_id WHERE l.id=p_lesson AND public.product_can_read_class(c.id)
 AND (public.rebuild_can_teach(c.id) OR (m.status='published' AND public.product_class_lesson_status(c.id,l.id)='published')));
$function$
;

-- Existing contract retained: rebuild_begin_run
CREATE OR REPLACE FUNCTION public.rebuild_begin_run(p_subject uuid, p_class uuid, p_lesson uuid, p_request uuid, p_prompt text, p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

DECLARE r public.rebuild_runs; inserted integer;

BEGIN

 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);

 IF NOT public.has_active_class_enrollment(p_class) OR NOT EXISTS (

 SELECT 1 FROM classes c JOIN courses co ON co.id=c.course_id JOIN course_modules m ON m.course_id=co.id JOIN lessons l ON l.module_id=m.id

 WHERE c.id=p_class AND l.id=p_lesson AND c.status='active' AND co.status='active' AND co.publication_status='published' AND m.status='published' AND public.product_class_lesson_status(p_class,l.id)='published') THEN RAISE EXCEPTION 'Access denied'; END IF;

 INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(p_subject,p_request,p_class,p_lesson,p_prompt,p_snapshot) ON CONFLICT DO NOTHING;

 GET DIAGNOSTICS inserted = ROW_COUNT;

 SELECT * INTO r FROM rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;

 IF r.prompt<>p_prompt OR r.class_id<>p_class OR r.lesson_id<>p_lesson OR (r.snapshot->'generation_settings') IS DISTINCT FROM (p_snapshot->'generation_settings') OR (r.snapshot->'learner_context_ids') IS DISTINCT FROM (p_snapshot->'learner_context_ids') THEN RAISE EXCEPTION 'Request key conflict'; END IF;

 -- A processing request cannot be replayed into a second provider call.

 IF inserted=0 AND r.result IS NULL THEN RAISE EXCEPTION 'Request processing or uncertain; inspect before retry'; END IF;

 RETURN jsonb_build_object('result',r.result);

END $function$
;

-- Existing contract retained: product_refresh_awards
CREATE OR REPLACE FUNCTION public.product_refresh_awards(p_class uuid, p_learner uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE setting record; badge jsonb; scores jsonb; score numeric; completed integer; required integer; average_score numeric;
 minimum_score numeric; needs_attendance boolean; attendance_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_class::text||p_learner::text,942));
 IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE class_id=p_class AND learner_id=p_learner AND status IN ('active','completed')) THEN RETURN; END IF;
 SELECT jsonb_object_agg(lesson_id::text,best),count(*),avg(best) INTO scores,completed,average_score FROM(
 SELECT a.lesson_ref_id lesson_id,max(public.valid_evaluation_total(a.evaluation_json)) best FROM public.prompt_attempts a
 JOIN public.lessons l ON l.id=a.lesson_ref_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.production_pass_threshold IS NOT NULL
 AND public.valid_evaluation_total(a.evaluation_json)>=a.production_pass_threshold AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published'
 GROUP BY a.lesson_ref_id) passed;
 SELECT count(*) INTO required FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=p_class AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published';
 SELECT count(*) INTO attendance_count FROM public.product_attendance a JOIN public.lessons l ON l.id=a.lesson_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.present AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published';
 FOR setting IN SELECT s.lesson_id,s.config FROM public.product_studio s JOIN public.lessons l ON l.id=s.lesson_id WHERE s.class_id=p_class AND public.product_class_lesson_status(p_class,l.id)='published' LOOP
  score:=(scores->>setting.lesson_id::text)::numeric;
  IF coalesce(setting.config#>>'{awards,issuance,badgeOnPass}','false')='true' AND score IS NOT NULL THEN
   FOR badge IN SELECT value FROM jsonb_array_elements(coalesce(setting.config#>'{awards,badges}','[]')) LOOP
    IF badge->>'status'='ACTIVE' AND length(btrim(coalesce(badge->>'name','')))>0 AND length(coalesce(badge->>'id',''))>0 THEN
     INSERT INTO public.product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence)
     VALUES(p_class,setting.lesson_id,p_learner,'badge:'||(badge->>'id'),'badge',badge->>'name','Promptify',
     jsonb_build_object('rule','passed_lesson','score',score,'studio_revision',(SELECT revision FROM public.product_studio WHERE class_id=p_class AND lesson_id=setting.lesson_id))) ON CONFLICT DO NOTHING;
    END IF;
   END LOOP;
  END IF;
  minimum_score:=coalesce((setting.config#>>'{awards,issuance,minimumAverageScore}')::numeric,8);
  needs_attendance:=coalesce((setting.config#>>'{awards,issuance,requireAttendance}')::boolean,true);
  IF coalesce(setting.config#>>'{awards,issuance,certificateOnCompletion}','false')='true' AND required>0 AND completed=required
   AND average_score>=minimum_score AND (NOT needs_attendance OR attendance_count=required)
   AND length(btrim(coalesce(setting.config#>>'{awards,certificate,title}','')))>0
   AND length(btrim(coalesce(setting.config#>>'{awards,certificate,issuer}','')))>0 THEN
   INSERT INTO public.product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence)
   VALUES(p_class,setting.lesson_id,p_learner,'certificate','certificate',setting.config#>>'{awards,certificate,title}',setting.config#>>'{awards,certificate,issuer}',
   jsonb_build_object('rule','completed_published_course','completed_lessons',completed,'average_score',average_score,
   'minimum_average_score',minimum_score,'attendance_required',needs_attendance,'attendance_count',attendance_count,'lesson_scores',scores)) ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;
END $function$
;

-- Existing contract retained: rebuild_class_sops
CREATE OR REPLACE FUNCTION public.rebuild_class_sops(p_class uuid, p_lesson uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT public.product_can_read_class(p_class) THEN RAISE EXCEPTION 'Class access required'; END IF;
 IF auth.uid() IS NULL OR NOT(public.rebuild_can_teach(p_class) OR public.has_active_class_enrollment(p_class)) THEN RAISE EXCEPTION 'Class access required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.title,s.version DESC),'[]'::jsonb) FROM (
 SELECT d.id AS document_id,d.title,v.id AS version_id,v.version,v.content,v.created_at,
 '[SOP:'||v.id::text||':v'||v.version::text||']' AS citation
 FROM public.rebuild_sop_documents d JOIN public.rebuild_sop_versions v ON v.document_id=d.id
 WHERE d.class_id=p_class AND (p_lesson IS NULL OR EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE b.class_id=p_class AND b.lesson_id=p_lesson AND b.version_id=v.id))
 AND (public.rebuild_can_teach(p_class) OR EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b JOIN public.lessons l ON l.id=b.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE b.class_id=p_class AND b.version_id=v.id AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published'))
 ) s);
END $function$
;

-- Existing contract retained: product_unlock_support
CREATE OR REPLACE FUNCTION public.product_unlock_support(p_class uuid, p_lesson uuid, p_kind text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE learner uuid;
BEGIN
 IF NOT public.has_active_class_enrollment(p_class) OR p_kind NOT IN ('hints','solution') THEN RAISE EXCEPTION 'Active learner required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published') THEN RAISE EXCEPTION 'Published class lesson required'; END IF;
 SELECT id INTO STRICT learner FROM public.learners WHERE user_id=public.current_user_id();
 INSERT INTO public.product_learner_support(learner_id,class_id,lesson_id,kind) VALUES(learner,p_class,p_lesson,p_kind) ON CONFLICT DO NOTHING;
END $function$
;

-- Existing contract retained: product_analytics
CREATE OR REPLACE FUNCTION public.product_analytics(p_classes uuid[], p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 WITH attempts AS(SELECT * FROM public.prompt_attempts WHERE class_id=ANY(p_classes) AND created_at>=p_start AND created_at<p_end),
 scored AS(SELECT *,row_number() OVER(PARTITION BY class_id,learner_id,lesson_ref_id ORDER BY created_at,id) first_rank,row_number() OVER(PARTITION BY class_id,learner_id,lesson_ref_id ORDER BY created_at DESC,id DESC) last_rank,count(*) OVER(PARTITION BY class_id,learner_id,lesson_ref_id) scored_count FROM attempts WHERE evaluation_json IS NOT NULL),
 cohorts AS(SELECT c.id,c.department,c.class_code,co.title,c.client_id FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE c.id=ANY(p_classes)),
 totals AS(SELECT c.id,c.department,c.class_code,c.title,
 (SELECT count(*) FROM public.enrollments e WHERE e.class_id=c.id AND e.status IN ('active','completed')) enrolled,
 (SELECT count(*) FROM attempts a WHERE a.class_id=c.id) attempts,
 (SELECT avg((a.evaluation_json->>'total')::numeric) FROM scored a WHERE a.class_id=c.id) average_score,
 (SELECT count(*) FROM public.enrollments e WHERE e.class_id=c.id AND e.status IN ('active','completed') AND EXISTS(SELECT 1 FROM public.classes cl JOIN public.course_modules m ON m.course_id=cl.course_id JOIN public.lessons l ON l.module_id=m.id WHERE cl.id=c.id AND m.status='published' AND public.product_class_lesson_status(cl.id,l.id)='published') AND NOT EXISTS(SELECT 1 FROM public.classes cl JOIN public.course_modules m ON m.course_id=cl.course_id JOIN public.lessons l ON l.module_id=m.id WHERE cl.id=c.id AND m.status='published' AND public.product_class_lesson_status(cl.id,l.id)='published' AND NOT EXISTS(SELECT 1 FROM public.lesson_progress lp WHERE lp.class_id=c.id AND lp.learner_id=e.learner_id AND lp.lesson_id=l.id AND lp.status='completed'))) completed
 FROM cohorts c)
 SELECT jsonb_build_object('enrolled',coalesce((SELECT sum(enrolled) FROM totals),0),'completed',coalesce((SELECT sum(completed) FROM totals),0),'attempts',(SELECT count(*) FROM attempts),'evaluated',(SELECT count(*) FROM scored),'average_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored),'pre_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored WHERE first_rank=1 AND scored_count>1),'post_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored WHERE last_rank=1 AND scored_count>1),'paired_tasks',(SELECT count(*) FROM scored WHERE first_rank=1 AND scored_count>1),'classes',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM totals t),'[]'::jsonb),'techniques',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM(SELECT a.lesson_ref_id,l.title,count(*) evaluated,avg((a.evaluation_json->>'total')::numeric) average_score FROM scored a JOIN public.lessons l ON l.id=a.lesson_ref_id GROUP BY a.lesson_ref_id,l.title)t),'[]'::jsonb),'hours_saved',NULL,'annual_roi',NULL);
$function$
;

-- Finish-run persistence must use the same class publication as Generate.
CREATE OR REPLACE FUNCTION public.record_prompt_attempt_and_progress(p_class_id uuid, p_lesson_id uuid, p_prompt_text text, p_ai_output text, p_evaluation_json jsonb DEFAULT NULL::jsonb, p_model text DEFAULT 'unknown'::text, p_latency_ms integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      AND public.product_class_lesson_status(p_class_id,l.id) = 'published'
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
$function$
;

COMMIT;
