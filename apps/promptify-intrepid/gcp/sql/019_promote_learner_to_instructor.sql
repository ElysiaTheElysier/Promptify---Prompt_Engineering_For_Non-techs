-- 019: admin-only, audited promotion of an existing learner to facilitator (instructor) for one class's course.
-- product_set_class_access refuses existing users with another role by design; this is the explicit, narrow path.
-- Runs as the signed-in admin, so check_user_privilege_escalation (is_instructor) allows the role change.
BEGIN;
CREATE FUNCTION public.product_promote_learner_to_instructor(p_class uuid, p_email text, p_permission text, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE uid uuid; v_role text; course uuid; v_email text := lower(btrim(p_email));
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'System administrator required'; END IF;
 IF p_permission IS NULL OR p_permission NOT IN ('owner','editor','viewer') THEN RAISE EXCEPTION 'Invalid permission'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Reason must be 5-500 characters'; END IF;
 SELECT course_id INTO STRICT course FROM public.classes WHERE id=p_class;
 SELECT u.id,u.role INTO uid,v_role FROM public.users u WHERE u.email=v_email FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 -- Only learner -> instructor. Admins, heads and existing instructors are unchanged (use Class access for those).
 IF v_role<>'learner' THEN RAISE EXCEPTION 'Only a learner can be promoted (current role: %)', v_role; END IF;
 UPDATE public.users SET role='instructor' WHERE id=uid;
 INSERT INTO public.course_instructors(course_id,user_id,permission) VALUES(course,uid,p_permission)
  ON CONFLICT(course_id,user_id) DO UPDATE SET permission=excluded.permission;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason)
  VALUES(p_class,public.current_user_id(),'role.promote','learner->instructor / '||uid||' / '||p_permission||' / '||btrim(p_reason));
 RETURN uid;
END $$;
REVOKE ALL PRIVILEGES ON FUNCTION public.product_promote_learner_to_instructor(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_promote_learner_to_instructor(uuid,text,text,text) TO authenticated;
COMMIT;
