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
const rows=(await db.query(`SELECT a.id,a.attempt_number,a.model,a.latency_ms,a.evaluation_json->>'total' score,a.evaluation_json->'judge' judge,r.snapshot->'rebuild_sop_versions' versions,r.snapshot->>'actual_generation_context' context,a.ai_output output FROM prompt_attempts a JOIN rebuild_runs r ON r.attempt_id=a.id WHERE a.class_id=$1 AND a.lesson_ref_id=$2 AND a.attempt_number=5`,['4a5a763a-b1b5-4676-88ca-81f4805fb321','64b6f084-9e93-49cd-a7be-e2ef9e14ff65'])).rows;
const row=rows[0],citation='[SOP:b405e79d-aec3-4a4c-8f46-089b9efe8c85:v1]',canary='STAGING-SOP-20261019-PENDING-CANARY-7K4';
if(rows.length!==1||row.model!=='gemini-3.8-flash'||!row.context.includes(citation)||!row.context.includes(canary)||!row.output.includes(citation)||!row.output.includes(canary)||!row.score)throw Error('Cited run evidence incomplete');
const evidence={at:new Date().toISOString(),scope:'synthetic staging run only; read-only; no auth or full prompt/context export',attemptId:row.id,attemptNumber:row.attempt_number,model:row.model,generationMs:row.latency_ms,score:row.score,judge:row.judge,canonicalCitation:citation,canaryInServerContext:true,canaryInOutput:true,citationInServerContext:true,citationInOutput:true};
await db.query('COMMIT');
fs.writeFileSync('outputs/staging-release-2026-10-19-sop-download/cited-run-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{db.release();await pool.end();}
