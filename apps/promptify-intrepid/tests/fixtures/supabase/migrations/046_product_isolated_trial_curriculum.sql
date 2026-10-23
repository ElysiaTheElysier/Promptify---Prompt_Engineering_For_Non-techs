-- User authorized the Table roster and five fictional Basic lessons for trial.
BEGIN;
DO $$ DECLARE source uuid; target uuid; teacher uuid; old_module record; new_module uuid;BEGIN
 SELECT id INTO STRICT source FROM public.courses WHERE slug='promptify-public-basic';
 SELECT id INTO STRICT teacher FROM public.users WHERE email='duonglh.work@gmail.com' AND role='admin';
 IF EXISTS(SELECT 1 FROM public.prompt_attempts a JOIN public.classes c ON c.id=a.class_id JOIN public.clients cl ON cl.id=c.client_id WHERE cl.name='Intrepid — THỬ NGHIỆM / TRIAL (fictional Basic)') THEN RAISE EXCEPTION 'Trial already has attempts; manual provenance review required before curriculum isolation';END IF;
 INSERT INTO public.courses(title,slug,description,status,publication_status,created_by)
 VALUES('THỬ NGHIỆM / TRIAL — Basic (fictional SOP)','intrepid-trial-basic','Five copied Basic practice lessons. Fictional SOP only; not an approved Intrepid policy or formal enterprise qualification.','active','published',teacher) RETURNING id INTO target;
 INSERT INTO public.course_instructors(course_id,user_id,permission) VALUES(target,teacher,'owner');
 FOR old_module IN SELECT * FROM public.course_modules WHERE course_id=source LOOP
  INSERT INTO public.course_modules(course_id,title,description,position,status) VALUES(target,old_module.title,old_module.description,old_module.position,old_module.status) RETURNING id INTO new_module;
  INSERT INTO public.lessons(module_id,lesson_key,title,badge,focus_skill,scenario,task_goal,concept_title,concept_content,system_instruction,starter_prompt,baseline_prompt,improved_prompt,sample_input_context,prompt_placeholder,expected_output_format,hints,focus_components,position,status)
  SELECT new_module,'trial-'||lesson_key,title,badge,focus_skill,scenario,task_goal,concept_title,concept_content,system_instruction,starter_prompt,baseline_prompt,improved_prompt,sample_input_context,prompt_placeholder,expected_output_format,hints,focus_components,position,status FROM public.lessons WHERE module_id=old_module.id;
 END LOOP;
 UPDATE public.classes SET course_id=target WHERE client_id IN (SELECT id FROM public.clients WHERE name='Intrepid — THỬ NGHIỆM / TRIAL (fictional Basic)') AND course_id=source;
END $$;
CREATE OR REPLACE FUNCTION public.product_limit_basic_run() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE count_today integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE c.id=NEW.class_id AND co.slug IN ('promptify-public-basic','intrepid-trial-basic')) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.subject::text,918));
 IF EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=NEW.subject AND request_id=NEW.request_id) THEN RETURN NEW; END IF;
 SELECT count(*) INTO count_today FROM public.rebuild_runs r JOIN public.classes c ON c.id=r.class_id JOIN public.courses co ON co.id=c.course_id
 WHERE r.subject=NEW.subject AND co.slug IN ('promptify-public-basic','intrepid-trial-basic') AND r.created_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh';
 IF count_today>=10 THEN RAISE EXCEPTION 'Basic daily execution quota exceeded'; END IF;
 RETURN NEW;
END $$;
COMMIT;
NOTIFY pgrst,'reload schema';
