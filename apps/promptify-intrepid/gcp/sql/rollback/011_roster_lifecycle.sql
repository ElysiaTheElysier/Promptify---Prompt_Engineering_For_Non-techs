-- Safe rollback is allowed only before a roster sync has been attempted after
-- 011. Once a source snapshot exists, keep provenance and use a forward repair.
BEGIN;
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.product_sync_logs WHERE connection_generation IS NOT NULL)
     OR EXISTS(SELECT 1 FROM public.product_roster_source_memberships) THEN
    RAISE EXCEPTION 'Roster lifecycle rollback refused after sync use; preserve provenance and repair forward';
  END IF;
END $$;

DROP TRIGGER IF EXISTS product_roster_generation_changed ON public.product_sheet_connections;
DROP TRIGGER IF EXISTS product_roster_connection_delete_guard ON public.product_sheet_connections;
DROP TRIGGER IF EXISTS product_roster_log_generation ON public.product_sync_logs;
DROP TRIGGER IF EXISTS product_enrollment_manual_origin ON public.enrollments;
DROP FUNCTION IF EXISTS public.product_bump_roster_generation();
DROP FUNCTION IF EXISTS public.product_restrict_roster_connection_delete();
DROP FUNCTION IF EXISTS public.product_stamp_roster_generation();
DROP FUNCTION IF EXISTS public.product_track_manual_enrollment();
DROP FUNCTION IF EXISTS public.product_finish_roster_snapshot(uuid,jsonb,jsonb,timestamptz);

CREATE OR REPLACE FUNCTION public.product_import_roster(p_class uuid,p_request uuid,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE item jsonb; prior public.rebuild_roster_imports; uid uuid; lid uuid; actor_role text; class_department text; row_email text; row_name text; count_rows integer:=0; inserted integer;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 SELECT department INTO STRICT class_department FROM public.classes WHERE id=p_class AND status IN ('active','upcoming');
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid roster size'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY lower(btrim(r->>'email')) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate email'; END IF;
 INSERT INTO public.rebuild_roster_imports(class_id,actor_id,request_id,rows_json) VALUES(p_class,public.current_user_id(),p_request,p_rows) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 SELECT * INTO STRICT prior FROM public.rebuild_roster_imports WHERE actor_id=public.current_user_id() AND request_id=p_request FOR UPDATE;
 IF prior.class_id<>p_class OR prior.rows_json<>p_rows THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 IF inserted=0 THEN RETURN prior.result; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  row_email:=lower(btrim(item->>'email')); row_name:=coalesce(btrim(item->>'fullName'),'');
  IF row_email IS NULL OR length(row_email)>254 OR row_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(row_name)>120 OR coalesce(btrim(item->>'department'),'')<>class_department OR nullif(btrim(item->>'country'),'') IS NULL THEN RAISE EXCEPTION 'Invalid scoped roster row'; END IF;
  INSERT INTO public.users(email,full_name,role) VALUES(row_email,row_name,'learner') ON CONFLICT(email) DO NOTHING;
  SELECT id,role INTO STRICT uid,actor_role FROM public.users WHERE email=row_email FOR UPDATE;
  IF actor_role<>'learner' THEN RAISE EXCEPTION 'Non-learner role in roster'; END IF;
  INSERT INTO public.learners(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO STRICT lid FROM public.learners WHERE user_id=uid;
  INSERT INTO public.enrollments(learner_id,class_id,status) VALUES(lid,p_class,'active') ON CONFLICT(learner_id,class_id) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE learner_id=lid AND class_id=p_class AND status='active') THEN RAISE EXCEPTION 'Existing membership requires explicit lifecycle review'; END IF;
  INSERT INTO public.product_roster_profiles(user_id,class_id,country,department) VALUES(uid,p_class,btrim(item->>'country'),class_department) ON CONFLICT(user_id,class_id) DO UPDATE SET country=excluded.country,department=excluded.department,updated_at=now();
  count_rows:=count_rows+1;
 END LOOP;
 UPDATE public.rebuild_roster_imports SET result=jsonb_build_object('processed',count_rows,'classId',p_class) WHERE id=prior.id RETURNING * INTO prior;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'roster.sync',count_rows||' rows');
 RETURN prior.result;
END $$;

CREATE OR REPLACE FUNCTION public.rebuild_import_roster(p_class uuid,p_request uuid,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE item jsonb; email_value text; name_value text; uid uuid; lid uuid; existing_role text; prior public.rebuild_roster_imports; imported integer:=0; inserted integer;
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=p_class AND status IN ('active','upcoming')) THEN RAISE EXCEPTION 'Class is closed'; END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Import requires 1 to 500 rows'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY lower(btrim(r->>'email')) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate email in import'; END IF;
 INSERT INTO public.rebuild_roster_imports(class_id,actor_id,request_id,rows_json) VALUES(p_class,public.current_user_id(),p_request,p_rows) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 SELECT * INTO STRICT prior FROM public.rebuild_roster_imports WHERE actor_id=public.current_user_id() AND request_id=p_request FOR UPDATE;
 IF prior.class_id<>p_class OR prior.rows_json<>p_rows THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 IF inserted=0 THEN RETURN prior.result; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  email_value:=lower(btrim(item->>'email')); name_value:=btrim(item->>'fullName');
  IF email_value IS NULL OR length(email_value)>254 OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR name_value IS NULL OR length(name_value) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Invalid roster row'; END IF;
  INSERT INTO public.users(email,full_name,role) VALUES(email_value,name_value,'learner') ON CONFLICT(email) DO NOTHING;
  SELECT id,role INTO STRICT uid,existing_role FROM public.users WHERE email=email_value FOR UPDATE;
  IF existing_role<>'learner' THEN RAISE EXCEPTION 'Roster contains a non-learner account'; END IF;
  INSERT INTO public.learners(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO STRICT lid FROM public.learners WHERE user_id=uid;
  INSERT INTO public.enrollments(learner_id,class_id,status) VALUES(lid,p_class,'active') ON CONFLICT(learner_id,class_id) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE learner_id=lid AND class_id=p_class AND status='active') THEN RAISE EXCEPTION 'Existing membership is not active; review before re-enrollment'; END IF;
  imported:=imported+1;
 END LOOP;
 UPDATE public.rebuild_roster_imports SET result=jsonb_build_object('processed',imported,'classId',p_class) WHERE id=prior.id RETURNING * INTO prior;
 RETURN prior.result;
END $$;

CREATE OR REPLACE FUNCTION public.product_enroll_basic(p_subject uuid,p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE person public.users; learner uuid; cohort uuid;
BEGIN
 IF p_subject IS NULL OR p_email IS NULL OR p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Verified identity required'; END IF;
 SELECT c.id INTO STRICT cohort FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE co.slug='promptify-public-basic' AND c.status='active' AND c.enrollment_mode='self_enroll';
 INSERT INTO public.users(email,full_name,role,auth_provider_id) VALUES(lower(btrim(p_email)),'','learner',p_subject::text) ON CONFLICT(email) DO NOTHING;
 SELECT * INTO STRICT person FROM public.users WHERE email=lower(btrim(p_email)) FOR UPDATE;
 IF person.auth_provider_id IS NOT NULL AND person.auth_provider_id<>p_subject::text THEN RAISE EXCEPTION 'Identity conflict'; END IF;
 IF person.role<>'learner' THEN RAISE EXCEPTION 'A learner account is required for Basic enrollment'; END IF;
 UPDATE public.users SET auth_provider_id=p_subject::text WHERE id=person.id AND auth_provider_id IS NULL;
 INSERT INTO public.learners(user_id) VALUES(person.id) ON CONFLICT(user_id) DO NOTHING;
 SELECT id INTO STRICT learner FROM public.learners WHERE user_id=person.id;
 INSERT INTO public.enrollments(class_id,learner_id,status) VALUES(cohort,learner,'active') ON CONFLICT(class_id,learner_id) DO NOTHING;
 RETURN cohort;
END $$;

DROP FUNCTION public.product_preserve_manual_enrollment(uuid,uuid);
DROP TABLE public.product_roster_source_memberships;
DROP TABLE public.product_enrollment_ownership;
ALTER TABLE public.product_sync_logs DROP COLUMN connection_generation,DROP COLUMN snapshot_payload;
ALTER TABLE public.product_sheet_connections DROP CONSTRAINT product_sheet_connection_id_class_key,DROP COLUMN sync_generation;
COMMIT;
