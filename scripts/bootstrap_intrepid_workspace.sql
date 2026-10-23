-- Provision an empty operational workspace; no sample employees, scores or ROI are imported.
BEGIN;
DO $$ DECLARE admin_id uuid;client_id uuid;course_id uuid; BEGIN
 SELECT id INTO STRICT admin_id FROM public.users WHERE email='duonglh.work@gmail.com' AND role='admin';
 SELECT id INTO client_id FROM public.clients WHERE name='Intrepid Asia' ORDER BY created_at LIMIT 1;
 IF client_id IS NULL THEN INSERT INTO public.clients(name,industry) VALUES('Intrepid Asia','E-commerce') RETURNING id INTO client_id; END IF;
 SELECT id INTO course_id FROM public.courses WHERE slug='intrepid-promptify-masterclass';
 IF course_id IS NULL THEN
  INSERT INTO public.courses(title,slug,description,status,publication_status,created_by)
  VALUES('Intrepid Promptify Masterclass','intrepid-promptify-masterclass','Business prompting curriculum managed in Curriculum Studio.','active','published',admin_id) RETURNING id INTO course_id;
  INSERT INTO public.course_modules(course_id,title,position,status) VALUES
   (course_id,'Pillar 1: LLM Foundations for Business Users',1,'published'),
   (course_id,'Pillar 2: Text Generation & Workflow AI',2,'published'),
   (course_id,'Pillar 3: AI Workflow Integration & Automation',3,'published');
 END IF;
 INSERT INTO public.course_instructors(course_id,user_id,permission) VALUES(course_id,admin_id,'owner') ON CONFLICT DO NOTHING;
 INSERT INTO public.classes(class_code,course_id,client_id,department,start_date,end_date,status,enrollment_mode)
 VALUES('INTREPID-SETUP-2026',course_id,client_id,'Learning & Development','2026-10-08T00:00:00+07:00','2026-12-31T23:59:59+07:00','upcoming','instructor') ON CONFLICT(class_code) DO NOTHING;
END $$;
SELECT class_code,department,status FROM public.classes WHERE class_code='INTREPID-SETUP-2026';
COMMIT;
