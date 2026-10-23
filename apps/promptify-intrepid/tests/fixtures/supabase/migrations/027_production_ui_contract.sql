-- Expand only. Preserves applied migrations, historical attempts and SOP versions.
-- Apply to the dedicated rebuild database, verify, then enable production UI.
BEGIN;
CREATE TABLE public.product_class_grants (
 user_id uuid NOT NULL REFERENCES public.users, class_id uuid NOT NULL REFERENCES public.classes,
 permission text NOT NULL CHECK(permission IN ('head','contributor')), PRIMARY KEY(user_id,class_id)
);
CREATE TABLE public.product_studio (
 class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons,
 revision integer NOT NULL DEFAULT 1, config jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NOT NULL REFERENCES public.users, PRIMARY KEY(class_id,lesson_id)
);
CREATE TABLE public.product_session_controls (
 class_id uuid PRIMARY KEY REFERENCES public.classes, state text NOT NULL CHECK(state IN ('active','frozen','ended')),
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid NOT NULL REFERENCES public.users
);
CREATE TABLE public.product_sheet_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes,
 sheet_id text NOT NULL CHECK(sheet_id ~ '^[A-Za-z0-9_-]+$'), name text NOT NULL, column_mapping jsonb NOT NULL,
 status text NOT NULL DEFAULT 'configured', last_synced_at timestamptz, created_by uuid NOT NULL REFERENCES public.users,
 UNIQUE(class_id,sheet_id)
);
CREATE TABLE public.product_profile_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users,
 request_id uuid NOT NULL, reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 2 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE TABLE public.product_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid REFERENCES public.classes,
 actor_id uuid NOT NULL REFERENCES public.users, action text NOT NULL, reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['product_class_grants','product_studio','product_session_controls','product_sheet_connections','product_profile_corrections','product_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',name);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',name);
 END LOOP;
END $$;

CREATE FUNCTION public.product_can_manage(p_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND (public.rebuild_can_manage_class(p_class) OR EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin'));
$$;
CREATE FUNCTION public.product_request_correction(p_request uuid,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE record public.product_profile_corrections;
BEGIN
 IF auth.uid() IS NULL OR public.current_user_id() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO public.product_profile_corrections(user_id,request_id,reason) VALUES(public.current_user_id(),p_request,btrim(p_reason)) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT record FROM public.product_profile_corrections WHERE user_id=public.current_user_id() AND request_id=p_request;
 IF record.reason<>btrim(p_reason) THEN RAISE EXCEPTION 'Request conflict'; END IF;
 RETURN record.id;
END $$;

CREATE FUNCTION public.product_save_studio(p_class uuid,p_lesson uuid,p_expected_revision integer,p_config jsonb,p_fields jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_revision integer; criterion jsonb; total numeric; field_state text;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson) THEN RAISE EXCEPTION 'Lesson outside course'; END IF;
 PERFORM 1 FROM public.lessons WHERE id=p_lesson FOR UPDATE;
 SELECT revision INTO current_revision FROM public.product_studio WHERE class_id=p_class AND lesson_id=p_lesson FOR UPDATE;
 current_revision:=coalesce(current_revision,0);
 IF current_revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 IF jsonb_typeof(p_config->'rubric') IS DISTINCT FROM 'array' OR jsonb_array_length(p_config->'rubric')<>5 THEN RAISE EXCEPTION 'Five criteria required'; END IF;
 IF (SELECT count(DISTINCT c->>'key') FROM jsonb_array_elements(p_config->'rubric') c)<>5 THEN RAISE EXCEPTION 'Unique criteria required'; END IF;
 total:=0;
 FOR criterion IN SELECT value FROM jsonb_array_elements(p_config->'rubric') LOOP
  IF criterion->>'key' NOT IN ('groundedness','persona','format','oneshot','actionability') OR jsonb_typeof(criterion->'weight')<>'number' OR jsonb_typeof(criterion->'active')<>'boolean' THEN RAISE EXCEPTION 'Invalid criterion'; END IF;
  IF (criterion->>'weight')::numeric<0 OR (criterion->>'weight')::numeric>100 OR NOT(criterion->>'active')::boolean AND (criterion->>'weight')::numeric<>0 THEN RAISE EXCEPTION 'Invalid criterion weight'; END IF;
  total:=total+(criterion->>'weight')::numeric;
 END LOOP;
 IF total<>100 THEN RAISE EXCEPTION 'Weights must sum to 100'; END IF;
 IF p_config->>'state' NOT IN ('DRAFT','ACTIVE','SCHEDULED','ARCHIVED') THEN RAISE EXCEPTION 'Invalid lifecycle state'; END IF;
 IF p_config->>'state'='SCHEDULED' AND (nullif(p_config->>'startTime','') IS NULL OR nullif(p_config->>'endTime','') IS NULL OR (p_config->>'endTime')::timestamptz <= (p_config->>'startTime')::timestamptz) THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 IF length(btrim(p_fields->>'title')) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Invalid lesson title'; END IF;
 field_state:=CASE p_config->>'state' WHEN 'DRAFT' THEN 'draft' WHEN 'ARCHIVED' THEN 'archived' ELSE 'published' END;
 UPDATE public.lessons SET title=btrim(p_fields->>'title'),scenario=p_fields->>'scenario',task_goal=p_fields->>'task_goal',system_instruction=p_fields->>'system_instruction',starter_prompt=p_fields->>'starter_prompt',sample_input_context=p_fields->>'sample_input_context',status=field_state,updated_at=now() WHERE id=p_lesson;
 INSERT INTO public.product_studio(class_id,lesson_id,revision,config,updated_by) VALUES(p_class,p_lesson,current_revision+1,p_config,public.current_user_id())
 ON CONFLICT(class_id,lesson_id) DO UPDATE SET revision=excluded.revision,config=excluded.config,updated_by=excluded.updated_by,updated_at=now();
 -- Canonical weighted maxima match the active scaffold-rubric selection.
 DELETE FROM public.lesson_rubric_criteria WHERE lesson_id=p_lesson;
 INSERT INTO public.lesson_rubric_criteria(lesson_id,criterion_key,label,description,max_score,position)
 SELECT p_lesson,c->>'key',c->>'label',coalesce(c->>'description',''),(c->>'weight')::numeric/10,ord::integer
 FROM jsonb_array_elements(p_config->'rubric') WITH ORDINALITY AS r(c,ord) WHERE (c->>'active')::boolean AND (c->>'weight')::numeric>0;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'studio.save','Lesson '||p_lesson||' revision '||(current_revision+1));
 RETURN jsonb_build_object('revision',current_revision+1,'lessonId',p_lesson);
END $$;

CREATE FUNCTION public.product_create_lesson(p_class uuid,p_title text,p_key text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE course uuid; module uuid; position_value integer; new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 SELECT course_id INTO STRICT course FROM public.classes WHERE id=p_class;
 PERFORM 1 FROM public.courses WHERE id=course FOR UPDATE;
 SELECT id INTO module FROM public.course_modules WHERE course_id=course ORDER BY position LIMIT 1;
 IF module IS NULL THEN INSERT INTO public.course_modules(course_id,title,position,status) VALUES(course,'Codelabs',1,'published') RETURNING id INTO module; END IF;
 SELECT coalesce(max(position),0)+1 INTO position_value FROM public.lessons WHERE module_id=module;
 INSERT INTO public.lessons(module_id,title,lesson_key,position,status) VALUES(module,btrim(p_title),btrim(p_key),position_value,'draft') RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'lesson.create',new_id::text);
 RETURN new_id;
END $$;
CREATE FUNCTION public.product_create_cohort(p_class uuid,p_code text,p_department text,p_start timestamptz,p_end timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE source public.classes; new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_end<=p_start THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 SELECT * INTO STRICT source FROM public.classes WHERE id=p_class;
 INSERT INTO public.classes(class_code,course_id,client_id,department,start_date,end_date,status,enrollment_mode) VALUES(btrim(p_code),source.course_id,source.client_id,btrim(p_department),p_start,p_end,'upcoming','instructor') RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(new_id,public.current_user_id(),'cohort.create','Created from '||p_class);
 RETURN new_id;
END $$;
CREATE FUNCTION public.product_session_control(p_class uuid,p_state text,p_expected_revision integer,p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior public.product_session_controls; next_revision integer;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_state NOT IN ('active','frozen','ended') OR length(btrim(p_reason))<2 THEN RAISE EXCEPTION 'Invalid control command'; END IF;
 PERFORM 1 FROM public.classes WHERE id=p_class FOR UPDATE;
 SELECT * INTO prior FROM public.product_session_controls WHERE class_id=p_class FOR UPDATE;
 IF coalesce(prior.revision,0) IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 IF prior.state='ended' THEN RAISE EXCEPTION 'Session already ended'; END IF;
 next_revision:=coalesce(prior.revision,0)+1;
 INSERT INTO public.product_session_controls(class_id,state,revision,updated_by) VALUES(p_class,p_state,next_revision,public.current_user_id()) ON CONFLICT(class_id) DO UPDATE SET state=excluded.state,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'session.'||p_state,btrim(p_reason));
 RETURN jsonb_build_object('state',p_state,'revision',next_revision);
END $$;
CREATE FUNCTION public.product_save_sheet(p_class uuid,p_sheet text,p_name text,p_mapping jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF nullif(p_mapping->>'email','') IS NULL OR nullif(p_mapping->>'fullName','') IS NULL OR nullif(p_mapping->>'department','') IS NULL OR nullif(p_mapping->>'country','') IS NULL THEN RAISE EXCEPTION 'Four roster field mappings required'; END IF;
 INSERT INTO public.product_sheet_connections(class_id,sheet_id,name,column_mapping,created_by) VALUES(p_class,p_sheet,btrim(p_name),p_mapping,public.current_user_id()) ON CONFLICT(class_id,sheet_id) DO UPDATE SET name=excluded.name,column_mapping=excluded.column_mapping RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'roster.configure',new_id::text);
 RETURN new_id;
END $$;

-- Frozen/ended sessions and scheduled labs are enforced at the accepted-run boundary.
CREATE FUNCTION public.product_guard_new_run() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE control text; cfg jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=NEW.subject AND request_id=NEW.request_id) THEN RETURN NEW; END IF;
 SELECT state INTO control FROM public.product_session_controls WHERE class_id=NEW.class_id;
 IF control IN ('frozen','ended') THEN RAISE EXCEPTION 'Session does not accept new runs'; END IF;
 SELECT config INTO cfg FROM public.product_studio WHERE class_id=NEW.class_id AND lesson_id=NEW.lesson_id;
 IF cfg->>'state' IN ('DRAFT','ARCHIVED') THEN RAISE EXCEPTION 'Lab is not active'; END IF;
 IF cfg->>'state'='SCHEDULED' AND (now()<(cfg->>'startTime')::timestamptz OR now()>=(cfg->>'endTime')::timestamptz) THEN RAISE EXCEPTION 'Outside lab schedule'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER product_guard_new_run BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE FUNCTION public.product_guard_new_run();

-- Preserve historical equal-weight evaluation semantics; validate the new contract separately.
DO $$ BEGIN
 EXECUTE replace(pg_get_functiondef('public.valid_evaluation_total(jsonb)'::regprocedure),
 'FUNCTION public.valid_evaluation_total(', 'FUNCTION public.legacy_valid_evaluation_total(');
END $$;
-- Replace in place so existing trigger/check dependencies retain the validator OID.
CREATE OR REPLACE FUNCTION public.valid_evaluation_total(payload jsonb) RETURNS numeric
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE item jsonb; total numeric:=0; maxima numeric:=0;
BEGIN
 IF payload->>'contract' IS DISTINCT FROM 'weighted-v1' THEN RETURN public.legacy_valid_evaluation_total(payload); END IF;
 IF jsonb_typeof(payload->'criteria') IS DISTINCT FROM 'array' OR jsonb_typeof(payload->'total') IS DISTINCT FROM 'number' OR jsonb_array_length(payload->'criteria') NOT BETWEEN 1 AND 5 THEN RETURN NULL; END IF;
 IF (SELECT count(DISTINCT c->>'key') FROM jsonb_array_elements(payload->'criteria') c)<>jsonb_array_length(payload->'criteria') THEN RETURN NULL; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'criteria') LOOP
  IF item->>'key' NOT IN ('groundedness','persona','format','oneshot','actionability') OR jsonb_typeof(item->'score') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'max') IS DISTINCT FROM 'number' THEN RETURN NULL; END IF;
  IF (item->>'score')::numeric<0 OR (item->>'score')::numeric>(item->>'max')::numeric OR (item->>'max')::numeric<=0 THEN RETURN NULL; END IF;
  total:=total+(item->>'score')::numeric; maxima:=maxima+(item->>'max')::numeric;
 END LOOP;
 IF maxima<>10 OR round(total,2)<>(payload->>'total')::numeric THEN RETURN NULL; END IF;
 RETURN round(total,2);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.valid_evaluation_total(jsonb),public.legacy_valid_evaluation_total(jsonb),public.product_guard_new_run() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('product_can_manage','product_request_correction','product_save_studio','product_create_lesson','product_create_cohort','product_session_control','product_save_sheet') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',item.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',item.signature);
 END LOOP;
END $$;
COMMIT;
NOTIFY pgrst,'reload schema';
