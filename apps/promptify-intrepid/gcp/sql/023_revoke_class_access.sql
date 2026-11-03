-- 023: admin-only, audited revoke of what product_set_class_access grants.
-- Instructor access is per course (course_instructors), so revoking it removes every cohort of this class's course.
-- Head access is per class (product_class_grants). users.role is unchanged: the person keeps their account and sees no class.
BEGIN;
CREATE FUNCTION public.product_revoke_class_access(p_class uuid, p_user uuid, p_role text, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE course uuid; removed int;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'System administrator required'; END IF;
 IF p_role IS NULL OR p_role NOT IN ('instructor','head') THEN RAISE EXCEPTION 'Invalid access role'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Reason must be 3-500 characters'; END IF;
 SELECT course_id INTO STRICT course FROM public.classes WHERE id=p_class;
 IF p_role='instructor' THEN DELETE FROM public.course_instructors WHERE course_id=course AND user_id=p_user;
 ELSE DELETE FROM public.product_class_grants WHERE class_id=p_class AND user_id=p_user; END IF;
 GET DIAGNOSTICS removed = ROW_COUNT;
 IF removed=0 THEN RAISE EXCEPTION 'Access not found'; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason)
  VALUES(p_class,public.current_user_id(),'access.revoke',p_role||' / '||p_user||' / '||btrim(p_reason));
 RETURN true;
END $$;
REVOKE ALL PRIVILEGES ON FUNCTION public.product_revoke_class_access(uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_revoke_class_access(uuid,uuid,text,text) TO authenticated;
COMMIT;
