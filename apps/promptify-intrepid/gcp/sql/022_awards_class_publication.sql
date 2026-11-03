-- 022: awards follow class-scoped publication again. 010 rewrote product_refresh_awards with lessons.status='published',
-- dropping 006's product_class_lesson_status check, so Codelabs created and published in Studio (lessons.status stays 'draft',
-- publication lives in product_studio lessonOverrides) never earned badges or certificates. Badge rules are unchanged.
-- No table or row change; CREATE OR REPLACE keeps the existing grants. Rollback: rollback/022_awards_class_publication.sql.
BEGIN;
CREATE OR REPLACE FUNCTION public.product_refresh_awards(p_class uuid, p_learner uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE setting record; badge jsonb; scores jsonb; score numeric; completed integer; required integer; average_score numeric;
 minimum_score numeric; needs_attendance boolean; attendance_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_class::text||p_learner::text,942));
 IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE class_id=p_class AND learner_id=p_learner AND status IN ('active','completed')) THEN RETURN; END IF;
 SELECT jsonb_object_agg(lesson_id::text,best),count(*),avg(best) INTO scores,completed,average_score FROM(
 SELECT a.lesson_ref_id lesson_id,max(public.valid_evaluation_total(a.evaluation_json)) best FROM public.prompt_attempts a
 JOIN public.lessons l ON l.id=a.lesson_ref_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.production_pass_threshold IS NOT NULL
 AND public.valid_evaluation_total(a.evaluation_json)>=a.production_pass_threshold AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published'
 GROUP BY a.lesson_ref_id) passed;
 SELECT count(*) INTO required FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=p_class AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published';
 SELECT count(*) INTO attendance_count FROM public.product_attendance a JOIN public.lessons l ON l.id=a.lesson_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.present AND public.product_class_lesson_status(p_class,l.id)='published' AND m.status='published';
 FOR setting IN SELECT s.lesson_id,s.config FROM public.product_studio s JOIN public.lessons l ON l.id=s.lesson_id WHERE s.class_id=p_class AND public.product_class_lesson_status(p_class,l.id)='published' LOOP
  score:=(scores->>setting.lesson_id::text)::numeric;
  IF coalesce(setting.config#>>'{awards,issuance,badgeOnPass}','false')='true' AND score IS NOT NULL THEN
   FOR badge IN SELECT value FROM jsonb_array_elements(coalesce(setting.config#>'{awards,badges}','[]')) LOOP
    IF public.product_badge_matches(badge,p_class,setting.lesson_id,p_learner) AND badge->>'status'='ACTIVE' AND length(btrim(coalesce(badge->>'name','')))>0 AND length(coalesce(badge->>'id',''))>0 THEN
     INSERT INTO public.product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence)
     VALUES(p_class,setting.lesson_id,p_learner,'badge:'||(badge->>'id'),'badge',badge->>'name','Promptify',
     jsonb_build_object('rule',coalesce(badge->>'ruleType','passed_lesson'),'minimum_score',badge->>'minimumScore','criterion_key',badge->>'criterionKey','attempt_scope',coalesce(badge->>'attemptScope','any'),'score',score,'studio_revision',(SELECT revision FROM public.product_studio WHERE class_id=p_class AND lesson_id=setting.lesson_id))) ON CONFLICT DO NOTHING;
    END IF;
   END LOOP;
  END IF;
  minimum_score:=coalesce((setting.config#>>'{awards,issuance,minimumAverageScore}')::numeric,8);
  needs_attendance:=coalesce((setting.config#>>'{awards,issuance,requireAttendance}')::boolean,true);
  IF coalesce(setting.config#>>'{awards,issuance,certificateOnCompletion}','false')='true' AND required>0 AND completed=required
   AND average_score>=minimum_score AND (NOT needs_attendance OR attendance_count=required)
   AND length(btrim(coalesce(setting.config#>>'{awards,certificate,title}','')))>0
   AND length(btrim(coalesce(setting.config#>>'{awards,certificate,issuer}','')))>0 THEN
   INSERT INTO public.product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence)
   VALUES(p_class,setting.lesson_id,p_learner,'certificate','certificate',setting.config#>>'{awards,certificate,title}',setting.config#>>'{awards,certificate,issuer}',
   jsonb_build_object('rule','completed_published_course','completed_lessons',completed,'average_score',average_score,
   'minimum_average_score',minimum_score,'attendance_required',needs_attendance,'attendance_count',attendance_count,'lesson_scores',scores)) ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;
END $$;
COMMIT;
