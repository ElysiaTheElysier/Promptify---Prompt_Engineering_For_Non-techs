import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
const phase=process.argv[2];
if(!['before','prepared','scheduled-add','scheduled-omit','final'].includes(phase)||!process.argv.includes('--staging-readonly'))throw Error('Fixed staging readonly phase required');
const classes=['9c32e26b-bcda-4549-bca8-dd4f350c2aaa','f6a40278-c5ab-42f2-9948-abb2fd1431bb'];
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(secret.status||!secret.stdout.trim())throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1,connectionTimeoutMillis:5000});secret.stdout='';secret.stderr='';
const client=await pool.connect();
try{
 await client.query('BEGIN READ ONLY');await client.query('SET LOCAL ROLE service_role');
 const identity=(await client.query('SELECT current_database() AS database,session_user AS runtime')).rows[0];
 if(identity.database!=='promptify_db'||identity.runtime!=='promptify_runtime')throw Error('Staging database identity mismatch');
 const scoped=(await client.query('SELECT id,class_code FROM public.classes WHERE id=ANY($1::uuid[]) ORDER BY id',[classes])).rows;
 if(scoped.length!==2||!scoped.every(c=>['STAGING-SYNTHETIC-20261020-NORTHSTAR','STAGING-SYNTHETIC-20261020-JUNIPER'].includes(c.class_code)))throw Error('Fixture scope mismatch');
 const outside=(await client.query('SELECT id,class_id,sheet_id,column_mapping,auto_sync,status,last_attempt_at,last_synced_at FROM public.product_sheet_connections WHERE NOT(class_id=ANY($1::uuid[])) ORDER BY id',[classes])).rows;
 const connections=(await client.query('SELECT id,class_id,sheet_id,column_mapping,auto_sync,status,last_attempt_at,last_synced_at,sync_generation FROM public.product_sheet_connections WHERE class_id=ANY($1::uuid[]) ORDER BY class_id,id',[classes])).rows;
 const logs=(await client.query('SELECT id,connection_id,class_id,actor_id,request_id,status,processed,error_code,created_at,finished_at,connection_generation FROM public.product_sync_logs WHERE class_id=ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 30',[classes])).rows;
 const members=(await client.query(`SELECT e.class_id,u.email,e.status,o.manual_preserved,o.removed_by_roster FROM public.enrollments e JOIN public.learners l ON l.id=e.learner_id JOIN public.users u ON u.id=l.user_id LEFT JOIN public.product_enrollment_ownership o ON o.class_id=e.class_id AND o.learner_id=e.learner_id WHERE e.class_id=ANY($1::uuid[]) ORDER BY e.class_id,u.email`,[classes])).rows;
 await client.query('COMMIT');
 const report={at:new Date().toISOString(),phase,scope:'Readonly fixed fictional staging classes; no token or raw source payload captured',classes:scoped,connections,logs,members,outside:{count:outside.length,autoSyncEnabled:outside.filter(c=>c.auto_sync).length,configurationSha256:crypto.createHash('sha256').update(JSON.stringify(outside)).digest('hex')}};
 const out='outputs/staging-release-2026-10-22-capacity-roster';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/roster-${phase}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({phase,connections:connections.map(c=>({id:c.id,autoSync:c.auto_sync,tab:c.column_mapping?.tab,lastSynced:c.last_synced_at})),outside:report.outside}));
}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();await pool.end();}
