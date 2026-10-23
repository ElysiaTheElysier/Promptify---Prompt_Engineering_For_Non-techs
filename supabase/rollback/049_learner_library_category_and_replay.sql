-- Manual rollback only; export category data first.
BEGIN;
CREATE OR REPLACE FUNCTION public.rebuild_begin_run(p_subject uuid, p_class uuid, p_lesson uuid, p_request uuid, p_prompt text, p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r public.rebuild_runs; inserted integer;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 IF NOT public.has_active_class_enrollment(p_class) OR NOT EXISTS (
 SELECT 1 FROM classes c JOIN courses co ON co.id=c.course_id JOIN course_modules m ON m.course_id=co.id JOIN lessons l ON l.module_id=m.id
 WHERE c.id=p_class AND l.id=p_lesson AND c.status='active' AND co.status='active' AND co.publication_status='published' AND m.status='published' AND l.status='published') THEN RAISE EXCEPTION 'Access denied'; END IF;
 INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(p_subject,p_request,p_class,p_lesson,p_prompt,p_snapshot) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 SELECT * INTO r FROM rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF r.prompt<>p_prompt OR r.class_id<>p_class OR r.lesson_id<>p_lesson THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 -- A processing request cannot be replayed into a second provider call.
 IF inserted=0 AND r.result IS NULL THEN RAISE EXCEPTION 'Request processing or uncertain; inspect before retry'; END IF;
 RETURN jsonb_build_object('result',r.result);
END $function$
;
ALTER TABLE public.product_prompt_library DROP COLUMN category;
DELETE FROM supabase_migrations.schema_migrations WHERE version='049';
COMMIT;
NOTIFY pgrst,'reload schema';
