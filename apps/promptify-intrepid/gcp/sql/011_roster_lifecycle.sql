-- Connection-owned roster reconciliation. Apply this additive migration before
-- promoting the backend bundle caller; the current backend remains compatible.
-- It does not rewrite the checked-in baseline.
BEGIN;

ALTER TABLE public.product_sheet_connections
  ADD COLUMN sync_generation bigint NOT NULL DEFAULT 0 CHECK (sync_generation >= 0),
  ADD CONSTRAINT product_sheet_connection_id_class_key UNIQUE(id,class_id);
ALTER TABLE public.product_sync_logs
  ADD COLUMN connection_generation bigint,
  ADD COLUMN snapshot_payload jsonb;

CREATE TABLE public.product_roster_source_memberships (
  connection_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  last_seen_log uuid REFERENCES public.product_sync_logs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (connection_id,user_id),
  UNIQUE (connection_id,class_id,user_id),
  FOREIGN KEY(connection_id,class_id) REFERENCES public.product_sheet_connections(id,class_id) ON DELETE CASCADE
);
CREATE INDEX product_roster_active_membership ON public.product_roster_source_memberships(class_id,user_id) WHERE active;

CREATE TABLE public.product_enrollment_ownership (
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  manual_preserved boolean NOT NULL DEFAULT false,
  removed_by_roster boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id,class_id)
);

-- Existing access has unknown provenance. Conservatively preserve every current
-- enrollment as manually owned; do not infer ownership from old roster profiles.
INSERT INTO public.product_enrollment_ownership(learner_id,class_id,manual_preserved)
SELECT learner_id,class_id,true FROM public.enrollments
ON CONFLICT (learner_id,class_id) DO NOTHING;

ALTER TABLE public.product_roster_source_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_enrollment_ownership ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_roster_source_memberships, public.product_enrollment_ownership FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_roster_source_memberships, public.product_enrollment_ownership TO service_role;
CREATE POLICY service_only ON public.product_roster_source_memberships TO service_role USING(true) WITH CHECK(true);
CREATE POLICY service_only ON public.product_enrollment_ownership TO service_role USING(true) WITH CHECK(true);

CREATE OR REPLACE FUNCTION public.product_bump_roster_generation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF NEW.class_id IS DISTINCT FROM OLD.class_id
     OR NEW.sheet_id IS DISTINCT FROM OLD.sheet_id
     OR NEW.column_mapping IS DISTINCT FROM OLD.column_mapping THEN
    IF NEW.class_id IS DISTINCT FROM OLD.class_id AND EXISTS(
      SELECT 1 FROM public.product_roster_source_memberships m WHERE m.connection_id=OLD.id AND m.active
    ) THEN RAISE EXCEPTION 'Roster connection class cannot change while source grants are active'; END IF;
    NEW.sync_generation := OLD.sync_generation + 1;
  ELSE
    NEW.sync_generation := OLD.sync_generation;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_roster_generation_changed
BEFORE UPDATE OF class_id,sheet_id,column_mapping ON public.product_sheet_connections
FOR EACH ROW EXECUTE FUNCTION public.product_bump_roster_generation();

CREATE OR REPLACE FUNCTION public.product_restrict_roster_connection_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.product_roster_source_memberships m WHERE m.connection_id=OLD.id AND m.active) THEN
    RAISE EXCEPTION 'Roster connection has active source grants; reconcile an empty snapshot before removal';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER product_roster_connection_delete_guard
BEFORE DELETE ON public.product_sheet_connections
FOR EACH ROW EXECUTE FUNCTION public.product_restrict_roster_connection_delete();

CREATE OR REPLACE FUNCTION public.product_stamp_roster_generation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE generation bigint; connection_class uuid;
BEGIN
  UPDATE public.product_sheet_connections SET sync_generation=sync_generation+1
  WHERE id=NEW.connection_id RETURNING class_id,sync_generation INTO STRICT connection_class,generation;
  IF connection_class IS DISTINCT FROM NEW.class_id THEN RAISE EXCEPTION 'Roster log connection/class mismatch'; END IF;
  NEW.connection_generation := generation;
  RETURN NEW;
END $$;
CREATE TRIGGER product_roster_log_generation
BEFORE INSERT ON public.product_sync_logs
FOR EACH ROW EXECUTE FUNCTION public.product_stamp_roster_generation();

CREATE OR REPLACE FUNCTION public.product_track_manual_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE sync_connection text;
BEGIN
  sync_connection := nullif(current_setting('promptify.roster_sync_connection',true),'');
  IF sync_connection IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.product_sheet_connections s WHERE s.id=sync_connection::uuid AND s.class_id=NEW.class_id
  ) THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.learners WHERE id=NEW.learner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enrollment learner missing'; END IF;
  INSERT INTO public.product_enrollment_ownership(learner_id,class_id,manual_preserved,removed_by_roster)
  VALUES(NEW.learner_id,NEW.class_id,true,false)
  ON CONFLICT(learner_id,class_id) DO UPDATE SET manual_preserved=true,removed_by_roster=false,updated_at=now();
  RETURN NEW;
END $$;
CREATE TRIGGER product_enrollment_manual_origin
AFTER INSERT OR UPDATE OF status ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.product_track_manual_enrollment();

CREATE OR REPLACE FUNCTION public.product_preserve_manual_enrollment(p_class uuid,p_learner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  PERFORM 1 FROM public.enrollments WHERE class_id=p_class AND learner_id=p_learner AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active enrollment required before manual access can be recorded'; END IF;
  INSERT INTO public.product_enrollment_ownership(learner_id,class_id,manual_preserved,removed_by_roster)
  VALUES(p_learner,p_class,true,false)
  ON CONFLICT(learner_id,class_id) DO UPDATE SET manual_preserved=true,removed_by_roster=false,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.product_preserve_manual_enrollment(uuid,uuid) FROM PUBLIC,anon,authenticated;

-- Backward-compatible manual entry points explicitly protect ON CONFLICT DO
-- NOTHING memberships, where the enrollment trigger would not fire on replay.
CREATE OR REPLACE FUNCTION public.product_import_roster(p_class uuid, p_request uuid, p_rows jsonb)
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
  PERFORM public.product_preserve_manual_enrollment(p_class,lid);
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
  IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE learner_id=lid AND class_id=p_class AND status='active') THEN RAISE EXCEPTION 'Existing membership is not active; explicit lifecycle review is required'; END IF;
  PERFORM public.product_preserve_manual_enrollment(p_class,lid);
  imported:=imported+1;
 END LOOP;
 UPDATE public.rebuild_roster_imports SET result=jsonb_build_object('processed',imported,'classId',p_class) WHERE id=prior.id RETURNING * INTO prior;
 RETURN prior.result;
END $$;

-- Public-basic access is also an independent/manual grant even when the
-- enrollment already exists and ON CONFLICT DO NOTHING skips its trigger.
CREATE OR REPLACE FUNCTION public.product_enroll_basic(p_subject uuid,p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE person public.users; learner uuid; cohort uuid;
BEGIN
 IF p_subject IS NULL OR p_email IS NULL OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Verified identity required'; END IF;
 SELECT c.id INTO STRICT cohort FROM public.classes c JOIN public.courses co ON co.id=c.course_id
 WHERE co.slug='promptify-public-basic' AND c.status='active' AND c.enrollment_mode='self_enroll';
 INSERT INTO public.users(email,full_name,role,auth_provider_id) VALUES(lower(btrim(p_email)),'','learner',p_subject::text) ON CONFLICT(email) DO NOTHING;
 SELECT * INTO STRICT person FROM public.users WHERE email=lower(btrim(p_email)) FOR UPDATE;
 IF person.auth_provider_id IS NOT NULL AND person.auth_provider_id<>p_subject::text THEN RAISE EXCEPTION 'Identity conflict'; END IF;
 IF person.role<>'learner' THEN RAISE EXCEPTION 'A learner account is required for Basic enrollment'; END IF;
 UPDATE public.users SET auth_provider_id=p_subject::text WHERE id=person.id AND auth_provider_id IS NULL;
 INSERT INTO public.learners(user_id) VALUES(person.id) ON CONFLICT(user_id) DO NOTHING;
 SELECT id INTO STRICT learner FROM public.learners WHERE user_id=person.id;
 INSERT INTO public.enrollments(class_id,learner_id,status) VALUES(cohort,learner,'active') ON CONFLICT(class_id,learner_id) DO NOTHING;
 IF EXISTS(SELECT 1 FROM public.enrollments WHERE class_id=cohort AND learner_id=learner AND status='active') THEN
  PERFORM public.product_preserve_manual_enrollment(cohort,learner);
 END IF;
 RETURN cohort;
END $$;

CREATE OR REPLACE FUNCTION public.product_finish_roster_snapshot(
  p_log uuid,p_rows jsonb,p_manifest jsonb,p_next_sync timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE entry public.product_sync_logs; conn public.product_sheet_connections; cls public.classes; actor_subject uuid;
  item jsonb; user_row public.users; v_learner_id uuid; v_removed_user uuid; v_old_status text; payload jsonb; v_processed integer:=0;
  added integer:=0; reactivated integer:=0; removed integer:=0; retained_manual integer:=0; blocked_inactive integer:=0;
  prior_sync_connection text; v_removed_users uuid[]:=ARRAY[]::uuid[];
BEGIN
  -- Keep the existing log first: the worker's timeout cleanup updates old logs
  -- before it locks a connection. Then serialize class snapshots and lock the
  -- connection before reading its generation and configuration.
  SELECT * INTO STRICT entry FROM public.product_sync_logs WHERE id=p_log FOR UPDATE;
  payload:=jsonb_build_object('rows',p_rows,'manifest',p_manifest,'nextSync',p_next_sync);
  IF entry.status='success' THEN
    IF entry.snapshot_payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Roster request key conflict'; END IF;
    RETURN entry.result;
  END IF;
  IF entry.status<>'running' THEN RAISE EXCEPTION 'Roster synchronization is no longer running'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(entry.class_id::text,811));
  SELECT * INTO STRICT conn FROM public.product_sheet_connections WHERE id=entry.connection_id FOR UPDATE;
  SELECT * INTO STRICT cls FROM public.classes WHERE id=entry.class_id AND status IN ('active','upcoming') FOR UPDATE;
  IF conn.class_id<>entry.class_id OR entry.connection_generation IS NULL OR entry.connection_generation<>conn.sync_generation THEN RAISE EXCEPTION 'Roster source changed during read; retry sync'; END IF;
  SELECT auth_provider_id INTO STRICT actor_subject FROM public.users WHERE id=entry.actor_id;
  IF actor_subject IS NULL THEN RAISE EXCEPTION 'Verified connection owner required'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor_subject,'role','authenticated')::text,true);
  IF NOT public.product_can_manage(entry.class_id) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;

  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows)>500
     OR jsonb_typeof(p_manifest) IS DISTINCT FROM 'object' OR p_next_sync IS NULL THEN RAISE EXCEPTION 'Invalid authoritative roster snapshot'; END IF;
  IF coalesce(conn.column_mapping->>'templateVersion','') NOT IN ('1','2') THEN RAISE EXCEPTION 'Unsupported full workbook template'; END IF;
  IF jsonb_typeof(p_manifest->'departments') IS DISTINCT FROM 'array'
     OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_manifest->'departments') d WHERE d=cls.department) THEN RAISE EXCEPTION 'Complete department manifest required'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY lower(btrim(r->>'email')) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate email'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r WHERE
      nullif(lower(btrim(r->>'email')),'') IS NULL OR length(btrim(r->>'email'))>254
      OR lower(btrim(r->>'email')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      OR length(coalesce(btrim(r->>'fullName'),''))>120
      OR coalesce(btrim(r->>'department'),'')<>cls.department
      OR nullif(btrim(r->>'country'),'') IS NULL OR length(btrim(r->>'country'))>120
      OR length(coalesce(r->>'employeeId',''))>120 OR length(coalesce(r->>'officeLocation',''))>200) THEN RAISE EXCEPTION 'Invalid scoped roster row'; END IF;

  -- Rows are visited in stable identity order after the class lock. This keeps
  -- concurrent source runs from acquiring enrollment locks in opposite orders.
  prior_sync_connection:=current_setting('promptify.roster_sync_connection',true);
  PERFORM set_config('promptify.roster_sync_connection',conn.id::text,true);
  FOR item IN SELECT value FROM jsonb_array_elements(p_rows) ORDER BY lower(btrim(value->>'email')) LOOP
    SELECT * INTO user_row FROM public.users WHERE email=lower(btrim(item->>'email')) FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.users(email,full_name,role) VALUES(lower(btrim(item->>'email')),coalesce(btrim(item->>'fullName'),''),'learner') ON CONFLICT(email) DO NOTHING;
      SELECT * INTO STRICT user_row FROM public.users WHERE email=lower(btrim(item->>'email')) FOR UPDATE;
    END IF;
    IF user_row.role<>'learner' THEN RAISE EXCEPTION 'Non-learner role in roster'; END IF;
    SELECT id INTO v_learner_id FROM public.learners WHERE user_id=user_row.id;
    IF v_learner_id IS NULL THEN INSERT INTO public.learners(user_id) VALUES(user_row.id) RETURNING id INTO v_learner_id; END IF;
    SELECT e.status INTO v_old_status FROM public.enrollments e WHERE e.learner_id=v_learner_id AND e.class_id=entry.class_id FOR UPDATE;
    IF v_old_status IS NULL THEN
      INSERT INTO public.enrollments(learner_id,class_id,status) VALUES(v_learner_id,entry.class_id,'active');
      INSERT INTO public.product_enrollment_ownership(learner_id,class_id,manual_preserved,removed_by_roster) VALUES(v_learner_id,entry.class_id,false,false)
      ON CONFLICT(learner_id,class_id) DO NOTHING;
      added:=added+1;
    ELSE
      IF v_old_status='removed' AND EXISTS(SELECT 1 FROM public.product_enrollment_ownership WHERE learner_id=v_learner_id AND class_id=entry.class_id AND NOT manual_preserved AND removed_by_roster) THEN
        UPDATE public.enrollments SET status='active',joined_at=now(),updated_at=now() WHERE learner_id=v_learner_id AND class_id=entry.class_id;
        UPDATE public.product_enrollment_ownership SET removed_by_roster=false,updated_at=now() WHERE learner_id=v_learner_id AND class_id=entry.class_id;
        reactivated:=reactivated+1;
      ELSIF v_old_status='active' THEN
        IF EXISTS(SELECT 1 FROM public.product_enrollment_ownership WHERE learner_id=v_learner_id AND class_id=entry.class_id AND manual_preserved) THEN retained_manual:=retained_manual+1; END IF;
      ELSE
        blocked_inactive:=blocked_inactive+1;
      END IF;
    END IF;
    INSERT INTO public.product_roster_source_memberships(connection_id,class_id,user_id,active,last_seen_log)
    VALUES(conn.id,entry.class_id,user_row.id,true,entry.id)
    ON CONFLICT(connection_id,user_id) DO UPDATE SET class_id=excluded.class_id,active=true,last_seen_log=excluded.last_seen_log,updated_at=now();
    INSERT INTO public.product_roster_profiles(user_id,class_id,country,department) VALUES(user_row.id,entry.class_id,btrim(item->>'country'),cls.department)
    ON CONFLICT(user_id,class_id) DO UPDATE SET country=excluded.country,department=excluded.department,updated_at=now();
    INSERT INTO public.product_profile_details(user_id,employee_id,office_location) VALUES(user_row.id,coalesce(item->>'employeeId',''),coalesce(item->>'officeLocation','')) ON CONFLICT(user_id) DO NOTHING;
    v_processed:=v_processed+1;
  END LOOP;

  -- Successful complete snapshots withdraw only this connection's grants.
  WITH deactivated AS (
    UPDATE public.product_roster_source_memberships m SET active=false,updated_at=now()
    WHERE m.connection_id=conn.id AND m.active
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r WHERE lower(btrim(r->>'email'))=(SELECT lower(email) FROM public.users WHERE id=m.user_id))
    RETURNING m.user_id
  ) SELECT coalesce(array_agg(user_id ORDER BY user_id),ARRAY[]::uuid[]) INTO v_removed_users FROM deactivated;
  FOR v_removed_user IN SELECT unnest(v_removed_users) ORDER BY 1 LOOP
    SELECT id INTO v_learner_id FROM public.learners WHERE user_id=v_removed_user;
    IF v_learner_id IS NULL THEN CONTINUE; END IF;
    PERFORM 1 FROM public.enrollments e WHERE e.learner_id=v_learner_id AND e.class_id=entry.class_id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM public.enrollments e JOIN public.product_enrollment_ownership o USING(learner_id,class_id)
      WHERE e.learner_id=v_learner_id AND e.class_id=entry.class_id AND e.status='active'
      AND NOT o.manual_preserved AND NOT EXISTS(SELECT 1 FROM public.product_roster_source_memberships other WHERE other.class_id=entry.class_id AND other.user_id=v_removed_user AND other.active)) THEN
      UPDATE public.enrollments SET status='removed',updated_at=now() WHERE learner_id=v_learner_id AND class_id=entry.class_id AND status='active';
      UPDATE public.product_enrollment_ownership SET removed_by_roster=true,updated_at=now() WHERE learner_id=v_learner_id AND class_id=entry.class_id AND NOT manual_preserved;
      removed:=removed+1;
    ELSIF EXISTS(SELECT 1 FROM public.enrollments e JOIN public.product_enrollment_ownership o USING(learner_id,class_id)
      WHERE e.learner_id=v_learner_id AND e.class_id=entry.class_id AND e.status='active' AND o.manual_preserved) THEN
      retained_manual:=retained_manual+1;
    END IF;
  END LOOP;
  PERFORM set_config('promptify.roster_sync_connection',coalesce(prior_sync_connection,''),true);

  INSERT INTO public.product_roster_workbooks(connection_id,class_id,manifest,next_sync_at,updated_at)
  VALUES(conn.id,entry.class_id,p_manifest,p_next_sync,now())
  ON CONFLICT(connection_id) DO UPDATE SET class_id=excluded.class_id,manifest=excluded.manifest,next_sync_at=excluded.next_sync_at,updated_at=now();
  UPDATE public.product_sheet_connections SET status='synced',last_synced_at=now() WHERE id=conn.id;
  INSERT INTO public.product_audit(class_id,actor_id,action,reason)
  VALUES(entry.class_id,entry.actor_id,'roster.reconcile',jsonb_build_object('connection',conn.id,'processed',v_processed,'added',added,'reactivated',reactivated,'removed',removed)::text);
  payload:=jsonb_build_object('processed',v_processed,'classId',entry.class_id,'added',added,'reactivated',reactivated,'removed',removed,'retainedManual',retained_manual,'blockedInactive',blocked_inactive);
  UPDATE public.product_sync_logs SET status='success',processed=v_processed,result=payload,snapshot_payload=jsonb_build_object('rows',p_rows,'manifest',p_manifest,'nextSync',p_next_sync),finished_at=now() WHERE id=entry.id;
  RETURN payload;
END $$;

REVOKE ALL ON FUNCTION public.product_finish_roster_snapshot(uuid,jsonb,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_finish_roster_snapshot(uuid,jsonb,jsonb,timestamptz) TO service_role;

COMMIT;
