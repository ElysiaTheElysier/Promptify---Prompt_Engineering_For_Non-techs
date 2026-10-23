// Explicit opt-in synthetic fixture; no production config, user role/name changes or live AI.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
import {DEFAULT_RUBRIC,validateWeightedEvaluation} from '../src/services/weightedRubricService';
if(!process.argv.includes('--staging-synthetic'))throw Error('Pass --staging-synthetic for this isolated real staging fixture.');
if(fs.existsSync('outputs/staging-feedback-review/fixture.json'))throw Error('Existing QA fixture preserved; do not seed another class accidentally.');
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(secret.status!==0||!secret.stdout.trim())throw Error('Staging secret unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1});
const db=await pool.connect();
try{
 await db.query('BEGIN');await db.query('SET LOCAL ROLE service_role');
 const actor=(await db.query("SELECT id,role FROM users WHERE email='demo.biz@intrepid.asia'")).rows[0];
 if(!actor||actor.role!=='learner')throw Error('Expected existing demo learner; no user creation or role change performed');
 const learner=(await db.query('SELECT id FROM learners WHERE user_id=$1',[actor.id])).rows[0];
 if(!learner)throw Error('Demo learner not provisioned; stop');
 const ids={client:randomUUID(),course:randomUUID(),class:randomUUID(),module:randomUUID(),lesson:randomUUID()},code='STAGING-QA-20261017-'+ids.class.slice(0,8);
 await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'FICTIONAL QA CLIENT — NOT A REAL COMPANY','Synthetic testing')",[ids.client]);
 await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'FICTIONAL staging feedback QA','published')",[ids.course]);
 await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,$2,$3,$4,'FICTIONAL QA ONLY',now()-interval '1 day',now()+interval '7 days')",[ids.class,code,ids.course,ids.client]);
 await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[learner.id,ids.class]);
 await db.query("INSERT INTO course_modules(id,course_id,title,position,status) VALUES($1,$2,'Synthetic module',1,'published')",[ids.module,ids.course]);
 await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status,position,scenario,task_goal,starter_prompt,sample_input_context) VALUES($1,$2,'QA-FIXTURE-01','FICTIONAL ticket review — stored fixture','published',1,'Synthetic ticket 42. No customer information.','Classify the fictional ticket.','[Role]: Fictional support analyst\n[Task]: Classify ticket 42','Synthetic ticket 42 asks about delivery status. These are fixture facts, not an official SOP.')",[ids.lesson,ids.module]);
 const badges=[{id:'qa-first',name:'FICTIONAL First Attempt Badge',icon:'verified',status:'ACTIVE',criteria:'Synthetic fixture only',ruleType:'criterion_score',criterionKey:'groundedness',minimumScore:'9',attemptScope:'first'},{id:'qa-any',name:'FICTIONAL Any Attempt Badge',icon:'verified',status:'ACTIVE',criteria:'Synthetic fixture only',ruleType:'criterion_score',criterionKey:'groundedness',minimumScore:'9',attemptScope:'any'}];
 const studio={state:'ACTIVE',pillar:'Synthetic QA',branch:'FICTIONAL',competencies:'Test saved-state persistence',startTime:'',endTime:'',departments:['FICTIONAL QA ONLY'],objectives:['Synthetic persistence QA'],variables:[],scaffold:[],rubric:DEFAULT_RUBRIC,materials:[],awards:{accessTier:'ADVANCE Paid',badges,issuance:{badgeOnPass:true,certificateOnCompletion:false,minimumAverageScore:8,requireAttendance:false},certificate:{title:'',issuer:''}}};
 await db.query('INSERT INTO product_studio(class_id,lesson_id,config,updated_by) VALUES($1,$2,$3,$4)',[ids.class,ids.lesson,JSON.stringify(studio),actor.id]);
 for(const [version,grounded] of [[1,2],[2,3]]){
  const evaluation=validateWeightedEvaluation({criteria:DEFAULT_RUBRIC.map(c=>({key:c.key,score:c.key==='groundedness'?grounded:c.weight/10,reason:'Synthetic fixture score, not an AI judgment'})),strengths:['Fixture only'],improvements:['Verify real provider separately'],nextHint:'Synthetic fixture; no AI call.'},DEFAULT_RUBRIC);
  await db.query("INSERT INTO prompt_attempts(learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output,evaluation_json,model,latency_ms) VALUES($1,$2,'QA-FIXTURE-01',$3,$4,$5,$6,$7,'STAGING-FIXTURE-NOT-AI',0)",[learner.id,ids.class,ids.lesson,version,'[Role]: Fictional analyst\n[Task]: Review synthetic ticket 42 — fixture V'+version,'SYNTHETIC STORED OUTPUT V'+version+' — no AI call made.',JSON.stringify(evaluation)]);
 }
 // Deliberate fixture provenance, scoped to the newly created class only. Never label as live provider evidence.
 await db.query('UPDATE prompt_attempts SET production_pass_threshold=8,evaluation_json=evaluation_json WHERE class_id=$1 AND lesson_ref_id=$2',[ids.class,ids.lesson]);
 const awards=(await db.query('SELECT award_key,title,evidence FROM product_awards WHERE class_id=$1 AND learner_id=$2',[ids.class,learner.id])).rows;
 if(!awards.some(a=>a.award_key==='badge:qa-any')||awards.some(a=>a.award_key==='badge:qa-first'))throw Error('Badge fixture expected any-attempt only; rollback');
 await db.query('COMMIT');
 fs.mkdirSync('outputs/staging-feedback-review',{recursive:true});
 fs.writeFileSync('outputs/staging-feedback-review/fixture.json',JSON.stringify({ids,code,actorId:actor.id,learnerId:learner.id,awards,providerCalled:false,localUrl:'http://127.0.0.1:5195/?ui=04&classId='+ids.class},null,2));
 console.log('Created isolated synthetic class '+code+'; stored V1/V2 fixtures and real badge rule verification PASS. No live AI call.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
