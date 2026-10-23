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
const rows=(await db.query(`SELECT a.id,a.attempt_number,a.model,a.latency_ms,a.evaluation_json->>'total' score,a.evaluation_json->'judge' judge,r.snapshot->'rebuild_sop_versions' versions,r.snapshot->>'actual_generation_context' context,a.ai_output output FROM prompt_attempts a JOIN rebuild_runs r ON r.attempt_id=a.id WHERE a.class_id=$1 AND a.lesson_ref_id=$2 AND a.attempt_number=6`,['4a5a763a-b1b5-4676-88ca-81f4805fb321','64b6f084-9e93-49cd-a7be-e2ef9e14ff65'])).rows;
const row=rows[0],expected=[['ac4ca548-8ba6-4dcc-b496-a0f277e7c94d','PDF-CANARY-20261020-P2'],['3b28642d-ccca-4f7c-a20a-5a883feeb33a','DOCX-CANARY-20261020-V1'],['ad85c864-a689-46bf-9caa-d4498ba74eaa','XLSX-CANARY-20261020-V1']];
if(rows.length!==1||row.model!=='gemini-3.8-flash'||!row.score)throw Error('Run evidence incomplete');
const sources=expected.map(([id,canary])=>({id,citation:`[SOP:${id}:v1]`,canary,contextHasCitation:row.context.includes(`[SOP:${id}:v1]`),contextHasCanary:row.context.includes(canary),outputHasCitation:row.output.includes(`[SOP:${id}:v1]`),outputHasCanary:row.output.includes(canary)}));
if(sources.some(s=>!s.contextHasCitation||!s.contextHasCanary||!s.outputHasCitation||!s.outputHasCanary)||!row.output.includes('[Page 2]'))throw Error('Three-format citation evidence incomplete');
const evidence={at:new Date().toISOString(),attemptId:row.id,attemptNumber:row.attempt_number,model:row.model,generationMs:row.latency_ms,score:row.score,judge:row.judge,sources,pdfPage2Citation:true,scope:'actual synthetic learner run; read-only metadata; no full prompt, context or credentials exported'};
await db.query('COMMIT');fs.writeFileSync('outputs/staging-release-2026-10-20-sop-formats/cited-formats-run.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{db.release();await pool.end();}
