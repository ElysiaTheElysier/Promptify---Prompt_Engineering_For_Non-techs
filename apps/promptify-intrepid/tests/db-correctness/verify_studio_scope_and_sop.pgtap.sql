-- Isolated PostgreSQL only; requires pgTAP installed by the local test harness.
-- Run after 001..009, never against source/production. Every synthetic row rolls back.
BEGIN;
SELECT no_plan();
CREATE FUNCTION pg_temp.fixture_id(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('eeeeeeee-eeee-4eee-8eee-'||lpad(n::text,12,'0'))::uuid;
$$;
CREATE FUNCTION pg_temp.studio_config(state text) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('state',state,'pillar','','branch','','competencies','','startTime','','endTime','',
 'departments','[]'::jsonb,'objectives','[]'::jsonb,'variables','[]'::jsonb,'scaffold','[]'::jsonb,
 'materials','[]'::jsonb,'awards','{}'::jsonb,'rubric',
 (SELECT jsonb_agg(jsonb_build_object('key',k,'label',k,'description','','weight',20,'active',true))
  FROM unnest(ARRAY['groundedness','persona','format','oneshot','actionability']) k));
$$;
INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES
 (pg_temp.fixture_id(1),'trainer@scope.test','Synthetic Trainer','instructor',pg_temp.fixture_id(101)::text,now()),
 (pg_temp.fixture_id(2),'othertrainer@scope.test','Other Trainer','instructor',pg_temp.fixture_id(102)::text,now()),
 (pg_temp.fixture_id(3),'learner@scope.test','Learner A','learner',pg_temp.fixture_id(103)::text,now()),
 (pg_temp.fixture_id(4),'peer@scope.test','Learner B','learner',pg_temp.fixture_id(104)::text,now()),
 (pg_temp.fixture_id(5),'outsider@scope.test','Learner C','learner',pg_temp.fixture_id(105)::text,now()),
 (pg_temp.fixture_id(6),'admin@scope.test','Admin','admin',pg_temp.fixture_id(106)::text,now());
INSERT INTO clients(id,name,industry) VALUES (pg_temp.fixture_id(10),'Tenant A','Testing'),(pg_temp.fixture_id(11),'Tenant B','Testing');
INSERT INTO courses(id,title,publication_status) VALUES (pg_temp.fixture_id(20),'Shared course','published'),(pg_temp.fixture_id(21),'Other course','published');
INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES
 (pg_temp.fixture_id(30),'SYNTHETIC-SCOPE-A',pg_temp.fixture_id(20),pg_temp.fixture_id(10),'A',now()-interval '1 day',now()+interval '1 day'),
 (pg_temp.fixture_id(31),'SYNTHETIC-SCOPE-B',pg_temp.fixture_id(20),pg_temp.fixture_id(10),'B',now()-interval '1 day',now()+interval '1 day'),
 (pg_temp.fixture_id(32),'SYNTHETIC-SCOPE-C',pg_temp.fixture_id(21),pg_temp.fixture_id(11),'C',now()-interval '1 day',now()+interval '1 day');
INSERT INTO course_instructors(course_id,user_id) VALUES (pg_temp.fixture_id(20),pg_temp.fixture_id(1)),(pg_temp.fixture_id(21),pg_temp.fixture_id(2));
INSERT INTO learners(id,user_id) VALUES (pg_temp.fixture_id(40),pg_temp.fixture_id(3)),(pg_temp.fixture_id(41),pg_temp.fixture_id(4)),(pg_temp.fixture_id(42),pg_temp.fixture_id(5));
INSERT INTO enrollments(learner_id,class_id) VALUES (pg_temp.fixture_id(40),pg_temp.fixture_id(30)),(pg_temp.fixture_id(41),pg_temp.fixture_id(31)),(pg_temp.fixture_id(42),pg_temp.fixture_id(32));
INSERT INTO course_modules(id,course_id,title,status) VALUES (pg_temp.fixture_id(45),pg_temp.fixture_id(20),'Module','published'),(pg_temp.fixture_id(46),pg_temp.fixture_id(21),'Module','published');
INSERT INTO lessons(id,module_id,lesson_key,title,scenario,task_goal,sample_input_context,position,status) VALUES
 (pg_temp.fixture_id(50),pg_temp.fixture_id(45),'shared','Course template','Template scenario','Template task','Template evidence',1,'published'),
 (pg_temp.fixture_id(51),pg_temp.fixture_id(45),'new','Draft template','Draft scenario','Draft task','Draft evidence',2,'draft'),
 (pg_temp.fixture_id(52),pg_temp.fixture_id(46),'other','Other template','','','',1,'published');
INSERT INTO lesson_rubric_criteria(lesson_id,criterion_key,label,description,max_score) VALUES (pg_temp.fixture_id(50),'legacy','Legacy criterion','Historical template',10);
INSERT INTO lesson_progress(learner_id,class_id,lesson_id) VALUES (pg_temp.fixture_id(40),pg_temp.fixture_id(30),pg_temp.fixture_id(50)),(pg_temp.fixture_id(41),pg_temp.fixture_id(31),pg_temp.fixture_id(50)),(pg_temp.fixture_id(42),pg_temp.fixture_id(32),pg_temp.fixture_id(52));
INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,result) VALUES
 (pg_temp.fixture_id(103),pg_temp.fixture_id(204),pg_temp.fixture_id(30),pg_temp.fixture_id(50),'Historical prompt','{"sample_input_context":"Historical evidence","production_revision":0,"production_pass_threshold":8}','{"output":"Historical output"}');
INSERT INTO product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence) VALUES
 (pg_temp.fixture_id(30),pg_temp.fixture_id(50),pg_temp.fixture_id(40),'historical-certificate','certificate','Historical certificate','Synthetic issuer','{"studio_revision":0,"average_score":9}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',pg_temp.fixture_id(101)::text,true);
SELECT lives_ok($$SELECT product_save_studio(pg_temp.fixture_id(30),pg_temp.fixture_id(50),0,
 pg_temp.studio_config('DRAFT'),'{"title":"Class A only","scenario":"Class A scenario","task_goal":"Class A task","system_instruction":"Class A system","starter_prompt":"Class A starter","sample_input_context":"Class A evidence"}')$$,'Trainer saves only selected class');
SELECT throws_ok($$SELECT product_save_studio(pg_temp.fixture_id(30),pg_temp.fixture_id(50),0,pg_temp.studio_config('ACTIVE'),'{"title":"Stale edit"}')$$,'P0001','Revision conflict','Stale revision cannot overwrite class edit');
SELECT throws_ok($$SELECT product_save_studio(pg_temp.fixture_id(32),pg_temp.fixture_id(52),0,pg_temp.studio_config('ACTIVE'),'{"title":"Denied edit"}')$$,'P0001','Assigned editor required','Unassigned trainer cannot edit other tenant');
SELECT is((SELECT count(*) FROM lesson_progress),2::bigint,'Trainer sees progress only assigned course (two classes)');
SELECT is((SELECT count(*) FROM lesson_progress WHERE class_id=pg_temp.fixture_id(32)),0::bigint,'Trainer cannot read other tenant progress');
RESET ROLE;
SELECT is((SELECT title FROM lessons WHERE id=pg_temp.fixture_id(50)),'Course template','Shared lesson title unchanged');
SELECT is((SELECT sample_input_context FROM lessons WHERE id=pg_temp.fixture_id(50)),'Template evidence','Shared lesson evidence unchanged');
SELECT is((SELECT count(*) FROM lesson_rubric_criteria WHERE lesson_id=pg_temp.fixture_id(50)),1::bigint,'Global rubric not deleted');
SELECT is((SELECT config#>>'{lessonOverrides,scenario}' FROM product_studio WHERE class_id=pg_temp.fixture_id(30) AND lesson_id=pg_temp.fixture_id(50)),'Class A scenario','Class local scenario saved');
SELECT is(product_class_lesson_status(pg_temp.fixture_id(30),pg_temp.fixture_id(50)),'draft','Selected class draft status');
SELECT is(product_class_lesson_status(pg_temp.fixture_id(31),pg_temp.fixture_id(50)),'published','Other class retains published template');
SELECT is((SELECT count(*) FROM product_studio WHERE class_id=pg_temp.fixture_id(31)),0::bigint,'Other class has no synthetic override');
SELECT is((SELECT snapshot->>'sample_input_context' FROM rebuild_runs WHERE request_id=pg_temp.fixture_id(204)),'Historical evidence','Studio save preserves saved run evidence');
SELECT is((SELECT evidence->>'average_score' FROM product_awards WHERE award_key='historical-certificate'),'9','Studio save preserves issued certificate evidence');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',pg_temp.fixture_id(103)::text,true);
SELECT is(product_can_read_lesson(pg_temp.fixture_id(50)),false,'Learner cannot read class-local draft via raw lesson RLS');
SELECT is((SELECT count(*) FROM lesson_progress),1::bigint,'Learner reads own progress only');
RESET ROLE;
SELECT throws_ok($$SELECT rebuild_begin_run(pg_temp.fixture_id(103),pg_temp.fixture_id(30),pg_temp.fixture_id(50),pg_temp.fixture_id(200),'Prompt','{}')$$,'P0001','Access denied','SQL refuses run on class-local draft');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',pg_temp.fixture_id(104)::text,true);
SELECT is(product_can_read_lesson(pg_temp.fixture_id(50)),true,'Other learner still reads published shared template');
RESET ROLE;
SELECT lives_ok($$SELECT rebuild_begin_run(pg_temp.fixture_id(104),pg_temp.fixture_id(31),pg_temp.fixture_id(50),pg_temp.fixture_id(201),'Prompt','{}')$$,'Other class Generate authorization preserved');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',pg_temp.fixture_id(101)::text,true);
SELECT lives_ok($$SELECT product_save_studio(pg_temp.fixture_id(30),pg_temp.fixture_id(51),0,pg_temp.studio_config('ACTIVE'),'{"title":"Published class A","scenario":"New scenario"}')$$,'New global draft publishes for selected class');
RESET ROLE;
SELECT is((SELECT status FROM lessons WHERE id=pg_temp.fixture_id(51)),'draft','Publishing class lesson keeps course draft template');
SELECT is(product_class_lesson_status(pg_temp.fixture_id(30),pg_temp.fixture_id(51)),'published','Selected class effective publication');
SELECT is(product_class_lesson_status(pg_temp.fixture_id(31),pg_temp.fixture_id(51)),'draft','Other class does not inherit publication');
SELECT lives_ok($$SELECT rebuild_begin_run(pg_temp.fixture_id(103),pg_temp.fixture_id(30),pg_temp.fixture_id(51),pg_temp.fixture_id(202),'Prompt','{}')$$,'Native SQL admits selected class published override');
SELECT lives_ok($$SELECT rebuild_finish_run(pg_temp.fixture_id(103),pg_temp.fixture_id(202),'{"output":"Native synthetic output","model":"synthetic-provider","latencyMs":0}')$$,'Finish run persists attempt for class-local published course draft');
SELECT throws_ok($$SELECT rebuild_begin_run(pg_temp.fixture_id(104),pg_temp.fixture_id(31),pg_temp.fixture_id(51),pg_temp.fixture_id(203),'Prompt','{}')$$,'P0001','Access denied','Other class cannot run new class-local publication');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',pg_temp.fixture_id(106)::text,true);
SELECT is((SELECT count(*) FROM lesson_progress),4::bigint,'Administrator global progress authority includes new class-local lesson');
SELECT set_config('request.jwt.claim.sub',pg_temp.fixture_id(102)::text,true);
SELECT is((SELECT count(*) FROM lesson_progress),1::bigint,'Other trainer sees own course only');
RESET ROLE;
DELETE FROM course_instructors WHERE user_id=pg_temp.fixture_id(1);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',pg_temp.fixture_id(101)::text,true);
SELECT is((SELECT count(*) FROM lesson_progress),0::bigint,'Revoked assignment removes trainer progress access immediately');
RESET ROLE;
INSERT INTO rebuild_sop_documents(id,class_id,title,created_by) VALUES (pg_temp.fixture_id(60),pg_temp.fixture_id(30),'SOP A',pg_temp.fixture_id(1)),(pg_temp.fixture_id(61),pg_temp.fixture_id(31),'SOP B',pg_temp.fixture_id(1));
INSERT INTO rebuild_sop_versions(id,document_id,version,content,created_by) VALUES (pg_temp.fixture_id(70),pg_temp.fixture_id(60),1,'SOP A evidence',pg_temp.fixture_id(1)),(pg_temp.fixture_id(71),pg_temp.fixture_id(61),1,'SOP B evidence',pg_temp.fixture_id(1));
SELECT lives_ok($$INSERT INTO rebuild_sop_bindings VALUES(pg_temp.fixture_id(30),pg_temp.fixture_id(50),pg_temp.fixture_id(60),pg_temp.fixture_id(70))$$,'Valid class/document/version binding retained');
SELECT throws_ok($$INSERT INTO rebuild_sop_bindings VALUES(pg_temp.fixture_id(31),pg_temp.fixture_id(50),pg_temp.fixture_id(60),pg_temp.fixture_id(70))$$,'23503',NULL,'Cross-class document rejected by native composite FK');
SELECT throws_ok($$UPDATE rebuild_sop_bindings SET version_id=pg_temp.fixture_id(71) WHERE class_id=pg_temp.fixture_id(30)$$,'23503',NULL,'Cross-document version rejected by native composite FK');
SELECT throws_ok($$INSERT INTO rebuild_sop_bindings VALUES(pg_temp.fixture_id(30),pg_temp.fixture_id(52),pg_temp.fixture_id(60),pg_temp.fixture_id(70))$$,'23514','SOP binding lesson outside class course','Other-course lesson binding rejected');
SELECT throws_ok($$UPDATE classes SET course_id=pg_temp.fixture_id(21) WHERE id=pg_temp.fixture_id(30)$$,'23514','Class move invalidates SOP lesson binding','Parent class move cannot invalidate existing binding');
SELECT throws_ok($$UPDATE lessons SET module_id=pg_temp.fixture_id(46),position=2 WHERE id=pg_temp.fixture_id(50)$$,'23514','Lesson move invalidates SOP class binding','Parent lesson move cannot invalidate existing binding');
SELECT throws_ok($$UPDATE course_modules SET course_id=pg_temp.fixture_id(21),position=2 WHERE id=pg_temp.fixture_id(45)$$,'23514','Module move invalidates SOP class binding','Parent module move cannot invalidate existing binding');
SELECT is((SELECT count(*) FROM pg_constraint WHERE conrelid='rebuild_sop_bindings'::regclass AND conname IN ('sop_binding_document_class_fk','sop_binding_version_document_fk') AND convalidated),2::bigint,'Both composite constraints validated');
SELECT * FROM finish();
ROLLBACK;
