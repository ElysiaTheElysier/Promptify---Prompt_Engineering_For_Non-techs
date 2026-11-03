import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {vector} from '@electric-sql/pglite-pgvector';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';

// 022: a Codelab created in Studio keeps lessons.status='draft' and is published through product_studio lessonOverrides.
// Awards must follow that class-scoped publication (010 checked lessons.status and never awarded these labs).
// Real SQL chain 001-022 on PGlite (CONCURRENTLY and google_ml_integration are local-only adjustments). Offline only.
const db=new PGlite({extensions:{vector}});
const chain=fs.readdirSync('gcp/sql').filter(f=>/^0\d\d_.*\.sql$/.test(f)).sort((a,b)=>a.localeCompare(b)||0);
// Same order as staging/production: 006_studio_class_scope before 006_mentor_feedback.
chain.splice(chain.indexOf('006_studio_class_scope.sql'),1);chain.splice(chain.indexOf('006_mentor_feedback.sql'),0,'006_studio_class_scope.sql');
for(const f of chain)await db.exec(fs.readFileSync('gcp/sql/'+f,'utf8').replace(/ CONCURRENTLY/g,'').replace(/CREATE EXTENSION IF NOT EXISTS google_ml_integration[^;]*;/g,''));
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000022`;
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Learner','learner',$2,now()),($3,'admin@example.test','Admin','admin',$4,now())",[id(1),id(2),id(3),id(4)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(5)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(6)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-22',$2,$3,'Ops',now()-interval '1 day',now()+interval '30 days')",[id(7),id(6),id(5)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(6)]);
// Studio-created: base status stays draft.
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Studio lab','draft')",[id(9),id(8)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(10),id(1)]);
await db.query("INSERT INTO enrollments(learner_id,class_id,status) VALUES($1,$2,'active')",[id(10),id(7)]);
const config={pillar:'Pillar 1',branch:'',competencies:'',startTime:'',endTime:'',state:'ACTIVE',departments:['Ops'],objectives:[],variables:[],scaffold:[],materials:[],rubric:DEFAULT_RUBRIC,lessonOverrides:{status:'published'},
 awards:{passThreshold:8,issuance:{badgeOnPass:true,certificateOnCompletion:true,minimumAverageScore:8,requireAttendance:false},
 badges:[{id:'pass-badge',name:'Pass badge',status:'ACTIVE',icon:'verified',criteria:'Pass the lab',ruleType:'passed_lesson',attemptScope:'any'}],certificate:{title:'Course certificate',issuer:'L&D'}}};
await db.query('INSERT INTO product_studio(class_id,lesson_id,config,updated_by) VALUES($1,$2,$3::jsonb,$4)',[id(7),id(9),JSON.stringify(config),id(3)]);
assert.equal((await db.query<any>('SELECT public.product_class_lesson_status($1,$2) s',[id(7),id(9)])).rows[0].s,'published','class-scoped publication');
const evaluation={contract:'weighted-v1',total:10,criteria:[{key:'groundedness',score:3,max:3,weight:30},{key:'persona',score:2,max:2,weight:20},{key:'format',score:2,max:2,weight:20},{key:'oneshot',score:1.5,max:1.5,weight:15},{key:'actionability',score:1.5,max:1.5,weight:15}]};
await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output,evaluation_json) VALUES($1,$2,$3,'L1',$4,1,'Prompt','Output',$5::jsonb)",[id(11),id(10),id(7),id(9),JSON.stringify(evaluation)]);
await db.query('UPDATE prompt_attempts SET production_pass_threshold=8 WHERE id=$1',[id(11)]);
const awards=async()=>(await db.query<any>('SELECT award_key FROM product_awards WHERE class_id=$1 AND learner_id=$2 ORDER BY award_key',[id(7),id(10)])).rows.map(r=>r.award_key);

// 010 definition (the rollback) is the bug: nothing is issued for the Studio-published lab.
await db.exec(fs.readFileSync('gcp/sql/rollback/022_awards_class_publication.sql','utf8'));
await db.query('SELECT public.product_refresh_awards($1,$2)',[id(7),id(10)]);
assert.deepEqual(await awards(),[],'010 gate ignores class-scoped publication');
// 022: badge and certificate are issued; refresh stays idempotent.
await db.exec(fs.readFileSync('gcp/sql/022_awards_class_publication.sql','utf8'));
await db.query('SELECT public.product_refresh_awards($1,$2)',[id(7),id(10)]);
await db.query('SELECT public.product_refresh_awards($1,$2)',[id(7),id(10)]);
assert.deepEqual(await awards(),['badge:pass-badge','certificate']);
// A lab unpublished for this class (override draft) is no longer counted.
await db.query("UPDATE product_studio SET config=jsonb_set(config,'{lessonOverrides,status}','\"draft\"') WHERE lesson_id=$1",[id(9)]);
await db.query("DELETE FROM product_awards");
await db.query('SELECT public.product_refresh_awards($1,$2)',[id(7),id(10)]);
assert.deepEqual(await awards(),[],'class-level draft earns nothing');
await db.close();
console.log('verify_awards_class_publication: PASS');
