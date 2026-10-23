import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
if(!process.argv.includes('--staging-synthetic'))throw Error('Explicit synthetic staging flag required');
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(secret.status)throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1}),db=await pool.connect();
const shadow='b26b1ee6-3932-4c13-bc3d-bfe0515408dc',document='815f53f1-17ad-4dc1-bdf1-31a212e0ba50',version='c8eed33a-8cc9-4772-b59b-2a754fcd2bc9';
try{
 await db.query('BEGIN');await db.query('SET LOCAL ROLE service_role');
 const cls=(await db.query('SELECT class_code FROM classes WHERE id=$1 FOR UPDATE',[shadow])).rows[0];
 if(cls?.class_code!=='STAGING-ACCEPTANCE-20261019-4a5a763a-SHADOW')throw Error('Shadow scope mismatch');
 const actor=(await db.query("SELECT id FROM users WHERE email='duonglh.work@gmail.com' AND role='admin'")).rows[0];if(!actor)throw Error('Existing administrator required');
 await db.query('INSERT INTO rebuild_sop_documents(id,class_id,title,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[document,shadow,'FICTIONAL FOREIGN SOP — access probe 20261020',actor.id]);
 await db.query('INSERT INTO rebuild_sop_versions(id,document_id,version,content,created_by) VALUES($1,$2,1,$3,$4) ON CONFLICT(id) DO NOTHING',[version,document,'FICTIONAL-FOREIGN-CANARY-20261020. Test data only; never learner context in the primary QA class.',actor.id]);
 const actual=(await db.query('SELECT document_id,content FROM rebuild_sop_versions WHERE id=$1',[version])).rows[0];if(actual.document_id!==document||!actual.content.startsWith('FICTIONAL-FOREIGN-CANARY-20261020'))throw Error('Fixture UUID collision');
 await db.query('INSERT INTO rebuild_sop_bindings(class_id,lesson_id,document_id,version_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[shadow,'9a0522c5-4216-43de-946a-656cc41e9307',document,version]);
 await db.query('COMMIT');
 fs.writeFileSync('outputs/staging-release-2026-10-20-access-roster/access-target-maintenance.json',JSON.stringify({at:new Date().toISOString(),scope:'Explicit synthetic shadow source only; maintenance SQL, not signed HTTP proof. No roles, IAM, existing primary lesson/SOP/grades changed.',shadow,document,version},null,2));
 console.log('Synthetic shadow SOP target prepared. No enrollment, role or production changes.');
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
