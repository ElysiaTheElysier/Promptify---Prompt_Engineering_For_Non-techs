import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
const root='outputs/staging-release-2026-10-20-access-roster';
const evidence=JSON.parse(fs.readFileSync(root+'/ai-load-baseline.json','utf8'));
const runs=evidence.rows[0].details.runs;
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(secret.status)throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1}),db=await pool.connect();
try{
 await db.query('BEGIN READ ONLY');await db.query('SET LOCAL ROLE service_role');
 const rows=(await db.query(`SELECT r.request_id,r.result IS NOT NULL AS generated,r.evaluation IS NOT NULL AS evaluated,r.judge_claim IS NOT NULL AS judge_claimed,r.result->>'model' AS model,r.evaluation->>'total' AS score FROM product_sandbox_runs r JOIN users u ON u.id=r.actor_id JOIN classes c ON c.id=r.class_id WHERE u.email='duonglh.work@gmail.com' AND c.id=$1 AND c.class_code=$2 AND r.request_id=ANY($3::uuid[])`,['4a5a763a-b1b5-4676-88ca-81f4805fb321','STAGING-ACCEPTANCE-20261019-4a5a763a',runs.map(r=>r.requestId)])).rows;
 await db.query('COMMIT');
 const result={at:new Date().toISOString(),scope:'Read-only metadata; no prompt, response, source content or credentials',submitted:runs.length,admitted:rows.length,generated:rows.filter(r=>r.generated).length,evaluated:rows.filter(r=>r.evaluated).length,unadmitted:runs.filter(r=>!rows.some(s=>s.request_id===r.requestId)).length,rows};
 fs.writeFileSync(root+'/ai-load-database-reconciliation.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:undefined}));
}finally{db.release();await pool.end();}
