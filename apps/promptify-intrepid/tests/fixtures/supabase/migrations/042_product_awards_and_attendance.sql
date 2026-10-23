BEGIN;
CREATE TABLE public.product_attendance(class_id uuid NOT NULL REFERENCES public.classes,lesson_id uuid NOT NULL REFERENCES public.lessons,
 learner_id uuid NOT NULL REFERENCES public.learners,present boolean NOT NULL,recorded_by uuid NOT NULL REFERENCES public.users,
 reason text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(class_id,lesson_id,learner_id));
CREATE TABLE public.product_awards(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES public.classes,
 lesson_id uuid NOT NULL REFERENCES public.lessons,learner_id uuid NOT NULL REFERENCES public.learners,
 award_key text NOT NULL,kind text NOT NULL CHECK(kind IN ('badge','certificate')),title text NOT NULL,issuer text NOT NULL,
 evidence jsonb NOT NULL,issued_at timestamptz NOT NULL DEFAULT now(),UNIQUE(class_id,lesson_id,learner_id,award_key));
ALTER TABLE public.product_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_attendance,public.product_awards FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_attendance,public.product_awards TO service_role;

CREATE FUNCTION public.product_refresh_awards(p_class uuid,p_learner uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE setting record; badge jsonb; scores jsonb; score numeric; completed integer; required integer; average_score numeric;
 minimum_score numeric; needs_attendance boolean; attendance_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_class::text||p_learner::text,942));
 IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE class_id=p_class AND learner_id=p_learner AND status IN ('active','completed')) THEN RETURN; END IF;
 SELECT jsonb_object_agg(lesson_id::text,best),count(*),avg(best) INTO scores,completed,average_score FROM(
 SELECT a.lesson_ref_id lesson_id,max(public.valid_evaluation_total(a.evaluation_json)) best FROM public.prompt_attempts a
 JOIN public.lessons l ON l.id=a.lesson_ref_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.production_pass_threshold IS NOT NULL
 AND public.valid_evaluation_total(a.evaluation_json)>=a.production_pass_threshold AND l.status='published' AND m.status='published'
 GROUP BY a.lesson_ref_id) passed;
 SELECT count(*) INTO required FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=p_class AND l.status='published' AND m.status='published';
 SELECT count(*) INTO attendance_count FROM public.product_attendance a JOIN public.lessons l ON l.id=a.lesson_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.present AND l.status='published' AND m.status='published';
 FOR setting IN SELECT s.lesson_id,s.config FROM public.product_studio s JOIN public.lessons l ON l.id=s.lesson_id WHERE s.class_id=p_class AND l.status='published' LOOP
  score:=(scores->>setting.lesson_id::text)::numeric;
  IF coalesce(setting.config#>>'{awards,issuance,badgeOnPass}','false')='true' AND score IS NOT NULL THEN
   FOR badge IN SELECT value FROM jsonb_array_elements(coalesce(setting.config#>'{awards,badges}','[]')) LOOP
    IF badge->>'status'='ACTIVE' AND length(btrim(coalesce(badge->>'name','')))>0 AND length(coalesce(badge->>'id',''))>0 THEN
     INSERT INTO public.product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence)
     VALUES(p_class,setting.lesson_id,p_learner,'badge:'||(badge->>'id'),'badge',badge->>'name','Promptify',
     jsonb_build_object('rule','passed_lesson','score',score,'studio_revision',(SELECT revision FROM public.product_studio WHERE class_id=p_class AND lesson_id=setting.lesson_id))) ON CONFLICT DO NOTHING;
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
CREATE FUNCTION public.product_awards_after_attempt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN IF NEW.production_pass_threshold IS NOT NULL AND NEW.evaluation_json IS NOT NULL THEN PERFORM public.product_refresh_awards(NEW.class_id,NEW.learner_id); END IF; RETURN NEW; END $$;
CREATE TRIGGER product_awards_after_attempt AFTER INSERT OR UPDATE OF evaluation_json ON public.prompt_attempts FOR EACH ROW EXECUTE FUNCTION public.product_awards_after_attempt();
CREATE FUNCTION public.product_record_attendance(p_class uuid,p_lesson uuid,p_learner uuid,p_present boolean,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.product_can_manage(p_class) OR p_present IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'Assigned editor and attendance reason required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.enrollments e JOIN public.classes c ON c.id=e.class_id JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE e.class_id=p_class AND e.learner_id=p_learner AND e.status IN ('active','completed') AND l.id=p_lesson) THEN RAISE EXCEPTION 'Attendance scope denied'; END IF;
 INSERT INTO public.product_attendance(class_id,lesson_id,learner_id,present,recorded_by,reason) VALUES(p_class,p_lesson,p_learner,p_present,public.current_user_id(),btrim(p_reason))
 ON CONFLICT(class_id,lesson_id,learner_id) DO UPDATE SET present=excluded.present,reason=excluded.reason,recorded_by=excluded.recorded_by,updated_at=now();
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'attendance.record',p_learner||' / '||p_lesson||' / '||p_present||' / '||btrim(p_reason));
 PERFORM public.product_refresh_awards(p_class,p_learner);
END $$;
REVOKE ALL ON FUNCTION public.product_refresh_awards(uuid,uuid),public.product_awards_after_attempt() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_refresh_awards(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.product_record_attendance(uuid,uuid,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_record_attendance(uuid,uuid,uuid,boolean,text) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
