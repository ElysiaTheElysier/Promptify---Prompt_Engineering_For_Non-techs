-- Self-service corrections approved by product owner on 2026-10-13.
-- History and learning attempts stay in their original classes.
BEGIN;
ALTER TABLE public.product_profile_corrections
 ADD COLUMN IF NOT EXISTS assigned_department text,
 ADD COLUMN IF NOT EXISTS requested_department text,
 ADD COLUMN IF NOT EXISTS source_class_id uuid REFERENCES public.classes(id),
 ADD COLUMN IF NOT EXISTS target_class_id uuid REFERENCES public.classes(id),
 ADD COLUMN IF NOT EXISTS auto_approved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.product_auto_correct_department(p_request uuid,p_source uuid,p_department text,p_reason text,p_full_name text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.users; source public.classes; target public.classes; previous public.product_profile_corrections;
 learner uuid; correction uuid; requested_name text:=btrim(p_department); reason text:=btrim(p_reason);
BEGIN
 IF auth.uid() IS NULL OR public.current_user_id() IS NULL THEN RAISE EXCEPTION 'Whitelisted identity required'; END IF;
 SELECT * INTO STRICT actor FROM public.users WHERE id=public.current_user_id() FOR UPDATE;
 IF p_request IS NULL OR p_source IS NULL OR requested_name IS NULL OR length(requested_name) NOT BETWEEN 1 AND 120 OR requested_name ~ '[[:cntrl:]]'
 OR reason IS NULL OR length(reason) NOT BETWEEN 2 AND 1800 OR p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid correction'; END IF;
 SELECT * INTO previous FROM public.product_profile_corrections WHERE user_id=actor.id AND request_id=p_request;
 IF FOUND THEN
   IF NOT previous.auto_approved OR previous.source_class_id<>p_source OR lower(previous.requested_department)<>lower(requested_name) OR previous.reason<>reason THEN RAISE EXCEPTION 'Correction request conflict'; END IF;
   RETURN jsonb_build_object('id',previous.id,'classId',previous.target_class_id,'department',previous.requested_department,'autoApproved',true);
 END IF;
 IF NOT public.product_can_read_class(p_source) THEN RAISE EXCEPTION 'Assigned source workspace required'; END IF;
 SELECT * INTO STRICT source FROM public.classes WHERE id=p_source;
 -- Serialize new department provisioning within a client, without cross-client access.
 PERFORM pg_advisory_xact_lock(hashtext(source.client_id::text),hashtext(lower(requested_name)));
 SELECT * INTO target FROM public.classes WHERE client_id=source.client_id AND lower(btrim(classes.department))=lower(requested_name) AND status='active'
 ORDER BY (course_id=source.course_id) DESC,created_at DESC,id LIMIT 1;
 IF NOT FOUND THEN
   INSERT INTO public.classes(class_code,course_id,client_id,department,start_date,end_date,status,enrollment_mode)
   VALUES('DEPT-'||gen_random_uuid()::text,source.course_id,source.client_id,requested_name,now(),greatest(source.end_date,now()+interval '30 days'),'active','instructor') RETURNING * INTO target;
   -- No private SOP documents or bindings are copied into a newly named workspace.
 END IF;
 IF actor.role='learner' THEN
   SELECT id INTO learner FROM public.learners WHERE user_id=actor.id;
   IF learner IS NULL THEN RAISE EXCEPTION 'Learner record required'; END IF;
   INSERT INTO public.enrollments(learner_id,class_id,status) VALUES(learner,target.id,'active')
   ON CONFLICT(learner_id,class_id) DO UPDATE SET status=CASE WHEN enrollments.status='completed' THEN 'completed' ELSE 'active' END;
   UPDATE public.enrollments SET status='removed' WHERE learner_id=learner AND class_id=source.id AND source.id<>target.id AND status='active';
 ELSIF actor.role<>'admin' THEN
   RAISE EXCEPTION 'Learner self-service correction required';
 END IF;
 UPDATE public.users SET full_name=btrim(p_full_name),profile_confirmed_at=now() WHERE id=actor.id;
 INSERT INTO public.product_profile_corrections(user_id,request_id,reason,status,assigned_department,requested_department,source_class_id,target_class_id,auto_approved)
 VALUES(actor.id,p_request,reason,'resolved',source.department,target.department,source.id,target.id,true) RETURNING id INTO correction;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(target.id,actor.id,'department.auto_correct',source.department||' → '||target.department||': '||reason);
 RETURN jsonb_build_object('id',correction,'classId',target.id,'department',target.department,'autoApproved',true);
END $$;
REVOKE ALL ON FUNCTION public.product_auto_correct_department(uuid,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_auto_correct_department(uuid,uuid,text,text,text) TO authenticated;
COMMIT;
