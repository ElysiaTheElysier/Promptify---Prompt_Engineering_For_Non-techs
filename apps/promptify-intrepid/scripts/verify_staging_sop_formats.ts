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
const rows=(await db.query(`SELECT c.id,c.title,c.status,c.lesson_id,c.version_id,c.metadata,c.content,jsonb_array_length(c.chunks) extracted_chunks,(SELECT count(*)::int FROM product_sop_chunks k WHERE k.version_id=c.version_id) indexed_chunks,(SELECT min(jsonb_array_length(k.embedding)) FROM product_sop_chunks k WHERE k.version_id=c.version_id) dimensions FROM product_sop_contributions c WHERE c.class_id=$1 AND c.title=ANY($2::text[]) ORDER BY c.title`,['4a5a763a-b1b5-4676-88ca-81f4805fb321',['FICTIONAL PDF SOP 20261020','FICTIONAL DOCX SOP 20261020','FICTIONAL XLSX SOP 20261020']])).rows;
if(rows.length!==3||rows.some(r=>r.status!=='published'||r.dimensions!==768||r.indexed_chunks<1||!r.content.includes('2 business days')||!r.content.includes('Yêu cầu giao hàng')))throw Error('Format acceptance evidence incomplete');
const pdf=rows.find(r=>r.metadata.type==='PDF');if(!pdf||!pdf.content.includes('[Page 2]')||!pdf.content.includes('PDF-CANARY-20261020-P2'))throw Error('PDF page evidence incomplete');
const evidence=rows.map(({content,...r})=>({...r,canonicalCitation:`[SOP:${r.version_id}:v1]`,vietnamesePreserved:true,deadlinePreserved:true,canaryPreserved:content.includes(r.metadata.type+'-CANARY-20261020')}));
await db.query('COMMIT');fs.writeFileSync('outputs/staging-release-2026-10-20-sop-formats/publication-evidence.json',JSON.stringify({at:new Date().toISOString(),scope:'fictional staging three files only; readonly; no credentials/signed URLs/full content',rows:evidence},null,2));console.log(JSON.stringify(evidence.map(r=>({title:r.title,status:r.status,indexed:r.indexed_chunks,pages:r.metadata.pages,version:r.version_id}))));
}finally{db.release();await pool.end();}
