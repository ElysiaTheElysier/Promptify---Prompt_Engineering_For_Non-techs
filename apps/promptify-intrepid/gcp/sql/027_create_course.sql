-- 027: an administrator creates a new course with its first cohort (class), for an existing client or a new one.
-- The app is class-centred (every screen works on a selected class), so a course is always created with one class.
-- Lessons are added later in Studio (product_create_lesson creates the course module on first use). Audited.
BEGIN;
CREATE FUNCTION public.product_create_course(p_client uuid, p_client_name text, p_title text, p_code text, p_department text, p_start timestamptz, p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_client uuid; v_client_name text; v_course uuid; v_class uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'System administrator required'; END IF;
 IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Course title must be 3-200 characters'; END IF;
 IF p_code IS NULL OR length(btrim(p_code)) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Class code must be 2-80 characters'; END IF;
 IF p_department IS NULL OR length(btrim(p_department)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Department must be 1-120 characters'; END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_end<=p_start THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 IF (p_client IS NULL)=(p_client_name IS NULL OR btrim(p_client_name)='') THEN RAISE EXCEPTION 'Choose an existing client or enter a new client name'; END IF;
 IF EXISTS(SELECT 1 FROM public.classes WHERE class_code=btrim(p_code)) THEN RAISE EXCEPTION 'Class code already exists'; END IF;
 IF p_client IS NOT NULL THEN
  SELECT c.id,c.name INTO v_client,v_client_name FROM public.clients c WHERE c.id=p_client;
  IF v_client IS NULL THEN RAISE EXCEPTION 'Client not found'; END IF;
 ELSE
  IF length(btrim(p_client_name))>200 THEN RAISE EXCEPTION 'Client name must be at most 200 characters'; END IF;
  INSERT INTO public.clients(name,industry) VALUES(btrim(p_client_name),'Unspecified') RETURNING id,name INTO v_client,v_client_name;
 END IF;
 INSERT INTO public.courses(title,status,publication_status,published_at,created_by)
  VALUES(btrim(p_title),'active','published',now(),public.current_user_id()) RETURNING id INTO v_course;
 INSERT INTO public.classes(class_code,course_id,client_id,department,start_date,end_date,status,enrollment_mode)
  VALUES(btrim(p_code),v_course,v_client,btrim(p_department),p_start,p_end,'upcoming','instructor') RETURNING id INTO v_class;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason)
  VALUES(v_class,public.current_user_id(),'course.create',btrim(p_title)||' / '||v_client_name||CASE WHEN p_client IS NULL THEN ' (new client)' ELSE '' END);
 RETURN v_class;
END $$;
REVOKE ALL PRIVILEGES ON FUNCTION public.product_create_course(uuid,text,text,text,text,timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_create_course(uuid,text,text,text,text,timestamptz,timestamptz) TO authenticated;
COMMIT;
