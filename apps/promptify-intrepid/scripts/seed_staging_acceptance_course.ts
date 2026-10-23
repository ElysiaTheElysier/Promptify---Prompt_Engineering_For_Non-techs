// Explicit one-course synthetic staging fixture. No invented attempts or scores.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
if(!process.argv.includes('--staging-synthetic'))throw Error('Explicit staging synthetic opt-in required');
const out='outputs/staging-release-2026-10-19-access-e2e/course-fixture.json';
if(fs.existsSync(out))throw Error('Existing fixture preserved; use its IDs instead of creating duplicates');
const credentials=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(credentials.status!==0||!credentials.stdout.trim())throw Error('Staging runtime credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:credentials.stdout.trim(),max:1});
const db=await pool.connect();
try{
 await db.query('BEGIN');await db.query('SET LOCAL ROLE service_role');
 const identity=(await db.query("SELECT u.id,u.role,l.id learner_id FROM users u JOIN learners l ON l.user_id=u.id WHERE u.email='demo.biz@intrepid.asia'")).rows[0];
 if(!identity||identity.role!=='learner')throw Error('Expected existing demo learner; no role or user changes allowed');
 const ids={client:randomUUID(),course:randomUUID(),class:randomUUID(),module:randomUUID(),lesson:randomUUID(),lesson2:randomUUID(),shadowClass:randomUUID()};
 const code='STAGING-ACCEPTANCE-20261019-'+ids.class.slice(0,8);
 const title='Staging acceptance — fictional delivery operations';
 const context='[SOP:QA:v1] Section 1: Delivery-status requests are normal priority; send an update within 2 business days. This is fictional training data, not real company policy. Example row: | 41 | normal | 2 business days | [SOP:QA:v1] Section 1 |.';
 const task='As an operations analyst, classify fictional ticket 42 as normal and provide the update deadline in a Markdown table with Ticket, Priority, Deadline, Source. Follow the supplied example and use only the approved fictional context.';
 const prompt='[Role]: Operations analyst. [Task]: Classify fictional ticket 42 using only the approved SOP. [Context]: Ticket 42 asks for a delivery-status update. [Constraint]: Do not invent facts; cite the section. [Format]: Markdown table: Ticket, Priority, Deadline, Source. [Example]: | 41 | normal | 2 business days | [SOP:QA:v1] Section 1 |.';
 await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Fictional training organization — synthetic QA only','Synthetic testing')",[ids.client]);
 await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,$2,'published')",[ids.course,title]);
 await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,$2,$3,$4,'Nhóm thực hành',now()-interval '1 day',now()+interval '7 days')",[ids.class,code,ids.course,ids.client]);
 await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[identity.learner_id,ids.class]);
 await db.query("INSERT INTO course_modules(id,course_id,title,position,status) VALUES($1,$2,'Thực hành prompt có căn cứ',1,'published')",[ids.module,ids.course]);
 await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status,position,scenario,task_goal,system_instruction,starter_prompt,sample_input_context) VALUES($1,$2,'PRACTICE-DELIVERY-01','Phân loại yêu cầu và trích dẫn nguồn','published',1,'Fictional ticket 42 asks for a delivery-status update.',$3,'Use only the supplied fictional training facts. Never invent sources, deadlines or customer information.',$4,$5)",[ids.lesson,ids.module,task,prompt,context]);
 const config={state:'ACTIVE',pillar:'Prompt có căn cứ',branch:'Lớp mẫu',competencies:'Grounded classification and cited SLA',startTime:'',endTime:'',departments:['Nhóm thực hành'],objectives:['Nêu rõ nhiệm vụ','Giữ ràng buộc dữ kiện','Dùng định dạng và trích dẫn nguồn'],variables:[],scaffold:[],rubric:DEFAULT_RUBRIC,materials:[],awards:{accessTier:'ADVANCE Paid',passThreshold:8,badges:[{id:'grounded-practice',name:'Thực hành có căn cứ',icon:'verified',status:'ACTIVE',criteria:'Groundedness reaches 8/10 in any attempt',ruleType:'criterion_score',criterionKey:'groundedness',minimumScore:'8',attemptScope:'any'}],issuance:{badgeOnPass:true,certificateOnCompletion:false,minimumAverageScore:8,requireAttendance:false},certificate:{title:'Fictional course completion — STAGING ONLY',issuer:'Promptify synthetic QA',eligibility:'Pass both fictional lessons with average score at least 8/10',templateUrl:'',lastUpdated:'2026-10-19'}}};
 await db.query('INSERT INTO product_studio(class_id,lesson_id,config,updated_by) VALUES($1,$2,$3,$4)',[ids.class,ids.lesson,JSON.stringify(config),identity.id]);
 await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status,position,scenario,task_goal,system_instruction,starter_prompt,sample_input_context) VALUES($1,$2,'PRACTICE-DELIVERY-02','Follow up ticket 43 — fictional only','published',2,'Fictional ticket 43 asks for a delivery-status update.',$3,'Use only supplied fictional training facts, never invent policies.',$4,$5)",[ids.lesson2,ids.module,task.replaceAll('42','43'),prompt.replaceAll('42','43'),context]);
 await db.query('INSERT INTO product_studio(class_id,lesson_id,config,updated_by) VALUES($1,$2,$3,$4)',[ids.class,ids.lesson2,JSON.stringify({...config,awards:{...config.awards,issuance:{...config.awards.issuance,certificateOnCompletion:true},badges:[{...config.awards.badges[0],id:'grounded-practice-2'}]}}),identity.id]);
 await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,$2,$3,$4,'ISOLATION SHADOW — no enrollment',now()-interval '1 day',now()+interval '7 days')",[ids.shadowClass,code+'-SHADOW',ids.course,ids.client]);
 await db.query('COMMIT');
 fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),ids,code,title,prompt,createdFor:'demo.biz@intrepid.asia',noPrewrittenAttemptsOrScores:true,lessonCount:2,shadowClassNotEnrolled:true,certificateRequiresBothLessons:true,url:'https://ai-transformation-510302-intrepid-staging.web.app/?ui=04&classId='+ids.class},null,2));
 console.log('Created one isolated synthetic course: '+ids.class+'; no prewritten attempts or scores; no user/role changes.');
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
