BEGIN;
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK(role IN ('learner','instructor','head','admin'));
CREATE TABLE public.product_learner_support (
 learner_id uuid NOT NULL REFERENCES public.learners,class_id uuid NOT NULL REFERENCES public.classes,
 lesson_id uuid NOT NULL REFERENCES public.lessons,kind text NOT NULL CHECK(kind IN ('hints','solution')),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(learner_id,class_id,lesson_id,kind)
);
CREATE TABLE public.product_roster_profiles (
 user_id uuid NOT NULL REFERENCES public.users,class_id uuid NOT NULL REFERENCES public.classes,
 country text NOT NULL,department text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,class_id)
);
ALTER TABLE public.product_learner_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_roster_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_learner_support,public.product_roster_profiles FROM anon,authenticated;
GRANT ALL ON public.product_learner_support,public.product_roster_profiles TO service_role;

CREATE FUNCTION public.product_unlock_support(p_class uuid,p_lesson uuid,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE learner uuid;
BEGIN
 IF NOT public.has_active_class_enrollment(p_class) OR p_kind NOT IN ('hints','solution') THEN RAISE EXCEPTION 'Active learner required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson AND l.status='published' AND m.status='published') THEN RAISE EXCEPTION 'Published class lesson required'; END IF;
 SELECT id INTO STRICT learner FROM public.learners WHERE user_id=public.current_user_id();
 INSERT INTO public.product_learner_support(learner_id,class_id,lesson_id,kind) VALUES(learner,p_class,p_lesson,p_kind) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.product_save_sheet(p_class uuid,p_sheet text,p_name text,p_mapping jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF nullif(p_mapping->>'email','') IS NULL OR nullif(p_mapping->>'department','') IS NULL OR nullif(p_mapping->>'country','') IS NULL OR nullif(p_mapping->>'tab','') IS NULL OR nullif(p_mapping->>'range','') IS NULL THEN RAISE EXCEPTION 'Required roster field mappings missing'; END IF;
 INSERT INTO public.product_sheet_connections(class_id,sheet_id,name,column_mapping,created_by) VALUES(p_class,p_sheet,btrim(p_name),p_mapping,public.current_user_id()) ON CONFLICT(class_id,sheet_id) DO UPDATE SET name=excluded.name,column_mapping=excluded.column_mapping RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'roster.configure',new_id::text);
 RETURN new_id;
END $$;
CREATE FUNCTION public.product_import_roster(p_class uuid,p_request uuid,p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
  -- Missing name stays blank until profile confirmation; never infer a name from email.
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
REVOKE ALL ON FUNCTION public.product_unlock_support(uuid,uuid,text),public.product_import_roster(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_unlock_support(uuid,uuid,text),public.product_import_roster(uuid,uuid,jsonb) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
