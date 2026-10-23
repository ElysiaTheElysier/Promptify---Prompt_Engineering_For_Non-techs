// Read-only verification of the newly created synthetic course only.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
if(!process.argv.includes('--staging-readonly'))throw Error('Explicit staging read-only opt-in required');
const root='outputs/staging-release-2026-10-19-access-e2e',fixture=JSON.parse(fs.readFileSync(root+'/course-fixture.json','utf8'));
if(fixture.ids.class!=='4a5a763a-b1b5-4676-88ca-81f4805fb321'||!fixture.noPrewrittenAttemptsOrScores)throw Error('Unexpected fixture scope');
const credentials=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(credentials.status!==0||!credentials.stdout.trim())throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:credentials.stdout.trim(),max:1});const db=await pool.connect();
try{
 await db.query('BEGIN READ ONLY');await db.query('SET LOCAL ROLE service_role');
 const cls=(await db.query('SELECT c.id,c.class_code,c.department,co.title FROM classes c JOIN courses co ON co.id=c.course_id WHERE c.id=$1',[fixture.ids.class])).rows[0];
 if(cls?.class_code!==fixture.code)throw Error('Fixture provenance mismatch');
 const attempts=(await db.query("SELECT id,lesson_ref_id,attempt_number,model,latency_ms,created_at,evaluation_json->>'total' score,evaluation_json->'criteria' criteria,evaluation_json->'judge' judge FROM prompt_attempts WHERE class_id=$1 AND lesson_ref_id=ANY($2::uuid[]) ORDER BY created_at",[fixture.ids.class,[fixture.ids.lesson,fixture.ids.lesson2]])).rows;
 const awards=(await db.query('SELECT award_key,title,issued_at,evidence FROM product_awards WHERE class_id=$1',[fixture.ids.class])).rows;
 const library=(await db.query('SELECT count(*)::int count FROM product_prompt_library WHERE class_id=$1',[fixture.ids.class])).rows[0];
 const progress=(await db.query('SELECT lesson_id,status,attempts_count,best_score,completed_at FROM lesson_progress WHERE class_id=$1',[fixture.ids.class])).rows;
 const judgeClaims=(await db.query('SELECT j.attempt_id,j.claimed_at,j.completed_at FROM rebuild_judge_claims j JOIN prompt_attempts a ON a.id=j.attempt_id WHERE a.class_id=$1 ORDER BY j.claimed_at',[fixture.ids.class])).rows;
 await db.query('COMMIT');
 const report={progress,judgeClaims,at:new Date().toISOString(),class:cls,attempts,awards,personalLibraryCount:library?.count,scope:'synthetic course only; read-only; no auth tokens or prompt/output contents exported'};
 fs.writeFileSync(root+'/course-live-state.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({attempts:attempts.length,graded:attempts.filter(a=>a.score!==null).length,scores:attempts.map(a=>a.score),models:attempts.map(a=>a.model),awards:awards.length,libraryCount:library?.count}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
