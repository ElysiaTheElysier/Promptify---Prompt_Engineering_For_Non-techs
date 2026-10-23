import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
if(!process.argv.includes('--staging-readonly'))throw Error('Read-only opt-in required');
const credentials=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(credentials.status!==0||!credentials.stdout.trim())throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:credentials.stdout.trim(),max:1});
const db=await pool.connect();
try {
await db.query('BEGIN READ ONLY'); await db.query('SET LOCAL ROLE service_role');
const rows=(await db.query(`SELECT u.email,u.role,u.profile_confirmed_at IS NOT NULL confirmed,(SELECT permission FROM product_class_grants g WHERE g.user_id=u.id AND g.class_id=$2) class_grant,EXISTS(SELECT 1 FROM learners l JOIN enrollments e ON e.learner_id=l.id WHERE l.user_id=u.id AND e.class_id=$2) enrolled FROM users u WHERE lower(u.email)=ANY($1::text[])`,[['kangseobi123@gmail.com','manhmanh100127@gmail.com'],'4a5a763a-b1b5-4676-88ca-81f4805fb321'])).rows;
await db.query('COMMIT');fs.writeFileSync('outputs/staging-release-2026-10-20-sop-formats/account-readiness.json',JSON.stringify({at:new Date().toISOString(),scope:'user-named accounts only; target fictional class; read-only',rows},null,2));console.log(JSON.stringify(rows));
}finally{db.release();await pool.end();}
