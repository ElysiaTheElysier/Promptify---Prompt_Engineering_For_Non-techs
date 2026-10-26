-- Synthetic data for promptify_loadtest only: 1 class/lesson, 100 learners (loadtest-001..100@loadtest.invalid),
-- 6 saved attempts each (one per test round) with a realistic generation snapshot. No real person, SOP or Drive data.
\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'promptify_loadtest' THEN RAISE EXCEPTION 'seed only promptify_loadtest'; END IF; END $$;
BEGIN;
INSERT INTO clients(id,name,industry) VALUES('7e570000-0000-4000-8000-000000000004','LOADTEST synthetic client','Testing');
INSERT INTO courses(id,title,publication_status) VALUES('7e570000-0000-4000-8000-000000000005','LOADTEST synthetic course','published');
INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date)
 VALUES('7e570000-0000-4000-8000-000000000006','LOADTEST-SYNTHETIC','7e570000-0000-4000-8000-000000000005','7e570000-0000-4000-8000-000000000004','Load test',now()-interval '1 day',now()+interval '30 days');
INSERT INTO course_modules(id,course_id,title,status) VALUES('7e570000-0000-4000-8000-000000000008','7e570000-0000-4000-8000-000000000005','Module','published');
INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES('7e570000-0000-4000-8000-000000000009','7e570000-0000-4000-8000-000000000008','LT1','Synthetic lesson','published');
INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at)
 SELECT md5('lt-user-'||u)::uuid,format('loadtest-%s@loadtest.invalid',lpad(u::text,3,'0')),format('Load test %s',u),'learner',md5('lt-subject-'||u)::uuid,now()
 FROM generate_series(1,100) u;
INSERT INTO learners(id,user_id) SELECT md5('lt-learner-'||u)::uuid,md5('lt-user-'||u)::uuid FROM generate_series(1,100) u;
INSERT INTO enrollments(learner_id,class_id) SELECT md5('lt-learner-'||u)::uuid,'7e570000-0000-4000-8000-000000000006' FROM generate_series(1,100) u;
INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output)
 SELECT md5('lt-attempt-'||u||'-'||k)::uuid,md5('lt-learner-'||u)::uuid,'7e570000-0000-4000-8000-000000000006','LT1','7e570000-0000-4000-8000-000000000009',k,
  format('Classify fictional ticket %s (round %s) using the approved SOP and cite it.',u,k),'| ticket | normal | 2 days | [SOP:QA:v1] |'
 FROM generate_series(1,100) u,generate_series(1,6) k;
INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id)
 SELECT md5('lt-subject-'||u)::uuid,md5('lt-attempt-'||u||'-'||k)::uuid,'7e570000-0000-4000-8000-000000000006','7e570000-0000-4000-8000-000000000009','Task prompt',
  jsonb_build_object('scenario','Fictional ticket','task_goal','Classify the ticket with a cited SOP section.','sample_input_context','[SOP:QA:v1] Section 1: delivery-status tickets are normal priority.',
   'production_rubric',jsonb_build_array(
    jsonb_build_object('key','groundedness','label','Groundedness & SOP Citation','description','Use only authorized source facts and exact document citations.','weight',30,'active',true),
    jsonb_build_object('key','persona','label','Task & Role Persona','description','Complete the task using the requested business role.','weight',20,'active',true),
    jsonb_build_object('key','format','label','Format Adherence','description','Follow the required Markdown table or specified output format.','weight',20,'active',true),
    jsonb_build_object('key','oneshot','label','One-Shot Pattern Compliance','description','Follow the provided example pattern.','weight',15,'active',true),
    jsonb_build_object('key','actionability','label','Business Actionability & SLA Window','description','Give an actionable answer within the SLA window.','weight',15,'active',true))),
  md5('lt-attempt-'||u||'-'||k)::uuid
 FROM generate_series(1,100) u,generate_series(1,6) k;
-- Admission sized for the aligned configuration (queue 8/10).
UPDATE product_provider_budget SET concurrency=48,tokens_per_minute=2500000,max_backlog=500,tenant_backlog=20 WHERE id=1;
COMMIT;
