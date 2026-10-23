BEGIN;
CREATE TABLE public.product_domains(client_id uuid NOT NULL REFERENCES public.clients,domain text NOT NULL CHECK(domain~'^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$'),active boolean NOT NULL DEFAULT true,updated_by uuid NOT NULL REFERENCES public.users,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(client_id,domain));
CREATE TABLE public.product_sync_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),connection_id uuid NOT NULL REFERENCES public.product_sheet_connections,class_id uuid NOT NULL REFERENCES public.classes,actor_id uuid NOT NULL REFERENCES public.users,request_id uuid NOT NULL,status text NOT NULL CHECK(status IN ('running','success','failed')),processed integer,result jsonb,error_code text,created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,UNIQUE(actor_id,request_id));
CREATE TABLE public.product_governance_config(id boolean PRIMARY KEY DEFAULT true CHECK(id),config jsonb NOT NULL DEFAULT '{}'::jsonb,revision integer NOT NULL DEFAULT 1,updated_by uuid NOT NULL REFERENCES public.users,updated_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE item text; BEGIN FOREACH item IN ARRAY ARRAY['product_domains','product_sync_logs','product_governance_config'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',item);EXECUTE format('GRANT ALL ON public.%I TO service_role',item);END LOOP;END $$;
CREATE FUNCTION public.product_analytics(p_classes uuid[],p_start timestamptz,p_end timestamptz) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH attempts AS(SELECT * FROM public.prompt_attempts WHERE class_id=ANY(p_classes) AND created_at>=p_start AND created_at<p_end),
 scored AS(SELECT *,row_number() OVER(PARTITION BY class_id,learner_id,lesson_ref_id ORDER BY created_at,id) first_rank,row_number() OVER(PARTITION BY class_id,learner_id,lesson_ref_id ORDER BY created_at DESC,id DESC) last_rank,count(*) OVER(PARTITION BY class_id,learner_id,lesson_ref_id) scored_count FROM attempts WHERE evaluation_json IS NOT NULL),
 cohorts AS(SELECT c.id,c.department,c.class_code,co.title,c.client_id FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE c.id=ANY(p_classes)),
 totals AS(SELECT c.id,c.department,c.class_code,c.title,
 (SELECT count(*) FROM public.enrollments e WHERE e.class_id=c.id AND e.status IN ('active','completed')) enrolled,
 (SELECT count(*) FROM attempts a WHERE a.class_id=c.id) attempts,
 (SELECT avg((a.evaluation_json->>'total')::numeric) FROM scored a WHERE a.class_id=c.id) average_score,
 (SELECT count(*) FROM public.enrollments e WHERE e.class_id=c.id AND e.status IN ('active','completed') AND EXISTS(SELECT 1 FROM public.classes cl JOIN public.course_modules m ON m.course_id=cl.course_id JOIN public.lessons l ON l.module_id=m.id WHERE cl.id=c.id AND m.status='published' AND l.status='published') AND NOT EXISTS(SELECT 1 FROM public.classes cl JOIN public.course_modules m ON m.course_id=cl.course_id JOIN public.lessons l ON l.module_id=m.id WHERE cl.id=c.id AND m.status='published' AND l.status='published' AND NOT EXISTS(SELECT 1 FROM public.lesson_progress lp WHERE lp.class_id=c.id AND lp.learner_id=e.learner_id AND lp.lesson_id=l.id AND lp.status='completed'))) completed
 FROM cohorts c)
 SELECT jsonb_build_object('enrolled',coalesce((SELECT sum(enrolled) FROM totals),0),'completed',coalesce((SELECT sum(completed) FROM totals),0),'attempts',(SELECT count(*) FROM attempts),'evaluated',(SELECT count(*) FROM scored),'average_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored),'pre_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored WHERE first_rank=1 AND scored_count>1),'post_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored WHERE last_rank=1 AND scored_count>1),'paired_tasks',(SELECT count(*) FROM scored WHERE first_rank=1 AND scored_count>1),'classes',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM totals t),'[]'::jsonb),'techniques',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM(SELECT a.lesson_ref_id,l.title,count(*) evaluated,avg((a.evaluation_json->>'total')::numeric) average_score FROM scored a JOIN public.lessons l ON l.id=a.lesson_ref_id GROUP BY a.lesson_ref_id,l.title)t),'[]'::jsonb),'hours_saved',NULL,'annual_roi',NULL);
$$;
REVOKE ALL ON FUNCTION public.product_analytics(uuid[],timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_analytics(uuid[],timestamptz,timestamptz) TO service_role;
CREATE FUNCTION public.product_set_class_access(p_class uuid,p_email text,p_role text,p_permission text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid;course uuid;existing_role text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'System administrator required'; END IF;
 IF p_email IS NULL OR p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR p_role IS NULL OR p_role NOT IN ('instructor','head') OR p_permission IS NULL OR p_permission NOT IN ('owner','editor','viewer') THEN RAISE EXCEPTION 'Invalid access grant'; END IF;
 SELECT course_id INTO STRICT course FROM public.classes WHERE id=p_class;
 INSERT INTO public.users(email,full_name,role) VALUES(lower(btrim(p_email)),'',p_role) ON CONFLICT(email) DO NOTHING;
 SELECT id,role INTO STRICT uid,existing_role FROM public.users WHERE email=lower(btrim(p_email)) FOR UPDATE;
 IF existing_role NOT IN (p_role,'admin') THEN RAISE EXCEPTION 'Existing role conflicts with requested access'; END IF;
 IF p_role='instructor' THEN INSERT INTO public.course_instructors(course_id,user_id,permission) VALUES(course,uid,p_permission) ON CONFLICT(course_id,user_id) DO UPDATE SET permission=excluded.permission;
 ELSE INSERT INTO public.product_class_grants(user_id,class_id,permission) VALUES(uid,p_class,'head') ON CONFLICT(user_id,class_id) DO UPDATE SET permission='head'; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'access.grant',p_role||' / '||uid||' / '||p_permission);
 RETURN uid;
END $$;
REVOKE ALL ON FUNCTION public.product_set_class_access(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_set_class_access(uuid,text,text,text) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
