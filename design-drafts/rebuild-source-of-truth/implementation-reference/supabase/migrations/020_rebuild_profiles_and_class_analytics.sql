-- Apply after 019 as part of the rebuild application rollout.
BEGIN;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_confirmed_at timestamptz;

CREATE FUNCTION public.rebuild_my_profile() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u public.users; department text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO STRICT u FROM public.users WHERE auth_provider_id=auth.uid()::text;
 SELECT c.department INTO department FROM public.classes c JOIN public.enrollments e ON e.class_id=c.id
 JOIN public.learners l ON l.id=e.learner_id
 WHERE l.user_id=u.id AND e.status='active' AND c.status='active' ORDER BY e.joined_at LIMIT 1;
 RETURN jsonb_build_object('full_name',u.full_name,'email',u.email,'role',u.role,
  'department',department,'profile_confirmed_at',u.profile_confirmed_at);
END $$;

CREATE FUNCTION public.rebuild_confirm_profile(p_full_name text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF length(btrim(p_full_name)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Full name must contain 2–120 characters'; END IF;
 UPDATE public.users SET full_name=btrim(p_full_name),profile_confirmed_at=now()
 WHERE auth_provider_id=auth.uid()::text;
 IF NOT FOUND THEN RAISE EXCEPTION 'Provisioned profile required'; END IF;
 RETURN public.rebuild_my_profile();
END $$;

CREATE FUNCTION public.rebuild_class_analytics(p_class uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.rebuild_can_teach(p_class) THEN RAISE EXCEPTION 'Assigned trainer required'; END IF;
 RETURN jsonb_build_object(
  'enrolled', (SELECT count(*) FROM public.enrollments WHERE class_id=p_class AND status='active'),
  'attempts', (SELECT count(*) FROM public.prompt_attempts WHERE class_id=p_class),
  'evaluated', (SELECT count(*) FROM public.prompt_attempts WHERE class_id=p_class AND evaluation_json IS NOT NULL),
  'average_score', (SELECT avg((evaluation_json->>'total')::numeric) FROM public.prompt_attempts
    WHERE class_id=p_class AND jsonb_typeof(evaluation_json->'total')='number'),
  'by_learner', (SELECT coalesce(jsonb_agg(to_jsonb(stats)), '[]'::jsonb) FROM (
    SELECT l.id AS learner_id,u.full_name,count(pa.id) AS attempts,
      max(pa.created_at) AS last_run,
      avg(CASE WHEN jsonb_typeof(pa.evaluation_json->'total')='number' THEN (pa.evaluation_json->>'total')::numeric END) AS average_score
    FROM public.enrollments e JOIN public.learners l ON l.id=e.learner_id JOIN public.users u ON u.id=l.user_id
    LEFT JOIN public.prompt_attempts pa ON pa.learner_id=l.id AND pa.class_id=e.class_id
    WHERE e.class_id=p_class AND e.status='active' GROUP BY l.id,u.full_name ORDER BY u.full_name
  ) stats));
END $$;
REVOKE ALL ON FUNCTION public.rebuild_my_profile(),public.rebuild_confirm_profile(text),public.rebuild_class_analytics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_my_profile(),public.rebuild_confirm_profile(text),public.rebuild_class_analytics(uuid) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
