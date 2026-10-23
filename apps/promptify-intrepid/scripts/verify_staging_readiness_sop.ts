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
const rows=(await db.query(`SELECT c.id,c.class_id,c.lesson_id,c.status,c.version_id,c.reviewed_by IS NOT NULL reviewed,count(k.position)::int chunks,min(jsonb_array_length(k.embedding)) dimensions,min(k.model) model,count(DISTINCT b.lesson_id)::int bindings FROM product_sop_contributions c LEFT JOIN product_sop_chunks k ON k.version_id=c.version_id LEFT JOIN rebuild_sop_bindings b ON b.version_id=c.version_id AND b.class_id=c.class_id WHERE c.class_id=$1 AND c.title=$2 GROUP BY c.id`,['4a5a763a-b1b5-4676-88ca-81f4805fb321','FICTIONAL staging delivery SOP — readiness check'])).rows;
await db.query('COMMIT');
if(rows.length!==1||rows[0].status!=='published'||rows[0].chunks<1||rows[0].dimensions!==768||rows[0].bindings!==1)throw Error('SOP publication evidence incomplete');
fs.writeFileSync('outputs/staging-readiness-2026-10-19/sop-publication.json',JSON.stringify({at:new Date().toISOString(),scope:'fictional staging only; read-only',rows},null,2));console.log(JSON.stringify(rows));
}finally{db.release();await pool.end();}
