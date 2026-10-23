import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
if(!process.argv.includes('--staging-seed-auth-fixtures'))throw Error('Read-only opt-in required');
const credentials=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(credentials.status!==0||!credentials.stdout.trim())throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:credentials.stdout.trim(),max:1});
const db=await pool.connect();
const classId='4a5a763a-b1b5-4676-88ca-81f4805fb321';
try{
await db.query('BEGIN');await db.query('SET LOCAL ROLE service_role');
const cls=(await db.query('SELECT class_code FROM classes WHERE id=$1',[classId])).rows[0];if(cls?.class_code!=='STAGING-ACCEPTANCE-20261019-4a5a763a')throw Error('Unexpected class');
const peer=(await db.query("SELECT id FROM users WHERE email='manhmanh100127@gmail.com' AND role='learner'")).rows[0];if(!peer)throw Error('Expected test peer unavailable');
const rows=[];for(const [request,status,title] of [['297d65c0-7966-4259-b7bd-a46dff80d8e1','personal','FICTIONAL PEER PRIVATE 20261020'],['e5433d96-9177-437f-8bc3-4538538802ea','pending','FICTIONAL PEER SHARE 20261020']]){
await db.query("INSERT INTO product_prompt_library(owner_id,class_id,lesson_id,request_id,title,prompt,category,status) VALUES($1,$2,$3,$4,$5,'[Task]: Classify fictional ticket 43. No real business data.','Synthetic authorization QA',$6) ON CONFLICT(owner_id,request_id) DO NOTHING",[peer.id,classId,'64b6f084-9e93-49cd-a7be-e2ef9e14ff65',request,title,status]);
rows.push((await db.query('SELECT id,title,status,owner_id,class_id FROM product_prompt_library WHERE owner_id=$1 AND request_id=$2',[peer.id,request])).rows[0]);}
await db.query('COMMIT');fs.writeFileSync('outputs/staging-release-2026-10-20-sop-formats/auth-fixtures.json',JSON.stringify({at:new Date().toISOString(),setup:'explicit synthetic fixture insertion, not a signed learner save test; no real data',rows},null,2));console.log(JSON.stringify(rows));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
