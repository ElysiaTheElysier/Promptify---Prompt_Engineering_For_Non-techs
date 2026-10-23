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
const rows=(await db.query(`SELECT p.id,p.title,p.status,u.email owner,r.email reviewer,p.review_reason FROM product_prompt_library p JOIN users u ON u.id=p.owner_id LEFT JOIN users r ON r.id=p.reviewed_by WHERE p.class_id=$1 AND p.id=ANY($2::uuid[]) ORDER BY p.title`,['4a5a763a-b1b5-4676-88ca-81f4805fb321',['596cbb5b-3cba-4c2b-aca8-e68b40bac84d','a79fa263-800c-42da-8ec4-dd088d18a263']])).rows;
if(rows.length!==2||rows.find(r=>r.title.includes('SHARE'))?.status!=='approved'||rows.find(r=>r.title.includes('SHARE'))?.reviewer!=='kangseobi123@gmail.com'||rows.find(r=>r.title.includes('PRIVATE'))?.status!=='personal')throw Error('Head moderation evidence mismatch');
await db.query('COMMIT');fs.writeFileSync('outputs/staging-release-2026-10-20-sop-formats/head-review-evidence.json',JSON.stringify({at:new Date().toISOString(),scope:'read-only fixture rows; actual signed Head UI approval',rows},null,2));console.log(JSON.stringify(rows));
}finally{db.release();await pool.end();}
