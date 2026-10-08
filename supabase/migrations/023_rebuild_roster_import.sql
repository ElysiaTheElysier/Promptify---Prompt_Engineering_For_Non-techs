BEGIN;
CREATE TABLE public.rebuild_roster_imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes,
 actor_id uuid NOT NULL REFERENCES public.users, request_id uuid NOT NULL,
 rows_json jsonb NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,request_id)
);
ALTER TABLE public.rebuild_roster_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rebuild_roster_imports FROM anon,authenticated;
CREATE FUNCTION public.rebuild_import_roster(p_class uuid,p_request uuid,p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; email_value text; name_value text; uid uuid; lid uuid; existing_role text; prior public.rebuild_roster_imports; imported integer:=0; inserted integer;
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=p_class AND status IN ('active','upcoming')) THEN RAISE EXCEPTION 'Class is closed'; END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Rows must be an array'; END IF;
 IF jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Import requires 1 to 500 rows'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY lower(btrim(r->>'email')) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate email in import'; END IF;
 INSERT INTO public.rebuild_roster_imports(class_id,actor_id,request_id,rows_json) VALUES(p_class,public.current_user_id(),p_request,p_rows) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 SELECT * INTO STRICT prior FROM public.rebuild_roster_imports WHERE actor_id=public.current_user_id() AND request_id=p_request FOR UPDATE;
 IF prior.class_id<>p_class OR prior.rows_json<>p_rows THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 IF inserted=0 THEN RETURN prior.result; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  email_value:=lower(btrim(item->>'email')); name_value:=btrim(item->>'fullName');
  IF email_value IS NULL OR length(email_value)>254 OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR name_value IS NULL OR length(name_value) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Invalid roster row'; END IF;
  -- A class import never changes an existing identity, role or profile name.
  INSERT INTO public.users(email,full_name,role) VALUES(email_value,name_value,'learner') ON CONFLICT(email) DO NOTHING;
  SELECT id,role INTO STRICT uid,existing_role FROM public.users WHERE email=email_value FOR UPDATE;
  IF existing_role<>'learner' THEN RAISE EXCEPTION 'Roster contains a non-learner account'; END IF;
  INSERT INTO public.learners(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO STRICT lid FROM public.learners WHERE user_id=uid;
  INSERT INTO public.enrollments(learner_id,class_id,status) VALUES(lid,p_class,'active') ON CONFLICT(learner_id,class_id) DO NOTHING;
  -- Removed/expired/completed memberships are preserved; explicit lifecycle action is required.
  IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE learner_id=lid AND class_id=p_class AND status='active') THEN RAISE EXCEPTION 'Existing membership is not active; review before re-enrollment'; END IF;
  imported:=imported+1;
 END LOOP;
 UPDATE public.rebuild_roster_imports SET result=jsonb_build_object('processed',imported,'classId',p_class) WHERE id=prior.id RETURNING * INTO prior;
 RETURN prior.result;
END $$;
REVOKE ALL ON FUNCTION public.rebuild_import_roster(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_import_roster(uuid,uuid,jsonb) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
