import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
if(!process.argv.includes('--staging-apply-approved-roles'))throw Error('Explicit staging role change approval required');
const credentials=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(credentials.status!==0||!credentials.stdout.trim())throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:credentials.stdout.trim(),max:1});
const db=await pool.connect();
const classId='4a5a763a-b1b5-4676-88ca-81f4805fb321',emails=['kangseobi123@gmail.com','manhmanh100127@gmail.com'];
const out='outputs/staging-release-2026-10-20-sop-formats';
try {
await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');await db.query('SET LOCAL ROLE service_role');
const cls=(await db.query('SELECT id,class_code FROM classes WHERE id=$1 FOR UPDATE',[classId])).rows[0];if(cls?.class_code!=='STAGING-ACCEPTANCE-20261019-4a5a763a')throw Error('Unexpected target class');
const before=(await db.query('SELECT id,email,role FROM users WHERE email=ANY($1::text[]) ORDER BY email FOR UPDATE',[emails])).rows;
const head=before.find(r=>r.email===emails[0]),peer=before.find(r=>r.email===emails[1]);
if(!head||!['admin','head'].includes(head.role)||peer&&peer.role!=='learner')throw Error('Unexpected pre-existing role; review required');
const actor=(await db.query("SELECT id,auth_provider_id FROM users WHERE email='duonglh.work@gmail.com' AND role='admin' AND profile_confirmed_at IS NOT NULL AND EXISTS(SELECT 1 FROM gcp_identity_bindings b WHERE b.user_id=users.id)")).rows[0];if(!actor||!actor.auth_provider_id)throw Error('Provisioned application administrator context unavailable');
await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[actor.auth_provider_id,JSON.stringify({sub:actor.auth_provider_id,email:'duonglh.work@gmail.com',role:'authenticated'})]);
const previousGrants=(await db.query('SELECT user_id,class_id,permission FROM product_class_grants WHERE class_id=$1 AND user_id=ANY($2::uuid[])',[classId,before.map(r=>r.id)])).rows;
const previousEnrollments=(await db.query('SELECT e.id,e.learner_id,e.class_id,e.status FROM enrollments e JOIN learners l ON l.id=e.learner_id WHERE e.class_id=$1 AND l.user_id=ANY($2::uuid[])',[classId,before.map(r=>r.id)])).rows;
fs.writeFileSync(out+'/roles-before.json',JSON.stringify({at:new Date().toISOString(),class:cls,users:before,previousGrants,previousEnrollments,authorization:'User explicitly requested changing these application staging roles; no GCP IAM changes',operation:'Explicitly authorized maintenance SQL with provisioned app admin context duonglh.work@gmail.com; cloud operator demo.biz; not a signed application permission test'},null,2));
await db.query("UPDATE users SET role='head' WHERE id=$1 AND role IN ('admin','head')",[head.id]);
await db.query("INSERT INTO product_class_grants(user_id,class_id,permission) VALUES($1,$2,'head') ON CONFLICT(user_id,class_id) DO UPDATE SET permission='head'",[head.id,classId]);
const peerId=(await db.query("INSERT INTO users(email,full_name,role) VALUES($1,'Staging learner','learner') ON CONFLICT(email) DO UPDATE SET role='learner' RETURNING id",[emails[1]])).rows[0].id;
const learnerId=(await db.query('INSERT INTO learners(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=excluded.user_id RETURNING id',[peerId])).rows[0].id;
await db.query("INSERT INTO enrollments(learner_id,class_id,status) VALUES($1,$2,'active') ON CONFLICT(learner_id,class_id) DO UPDATE SET status='active'",[learnerId,classId]);
await db.query("INSERT INTO product_audit(class_id,actor_id,action,reason) VALUES($1,$2,'staging.role.provision',$3)",[classId,actor.id,'Explicit human approval via Codex: kangseobi123@gmail.com admin -> head + fictional QA Head grant; manhmanh100127@gmail.com learner + fictional QA enrollment. Executed maintenance SQL as cloud demo.biz with provisioned app admin context duonglh.work@gmail.com; not signed app HTTP acceptance; no triggers disabled, no GCP IAM change.']);
const after=(await db.query('SELECT u.id,u.email,u.role,(SELECT permission FROM product_class_grants g WHERE g.user_id=u.id AND g.class_id=$2) class_grant,EXISTS(SELECT 1 FROM learners l JOIN enrollments e ON e.learner_id=l.id WHERE l.user_id=u.id AND e.class_id=$2 AND e.status=$3) enrolled FROM users u WHERE email=ANY($1::text[]) ORDER BY email',[emails,classId,'active'])).rows;
if(after.length!==2||after.find(r=>r.email===emails[0])?.role!=='head'||after.find(r=>r.email===emails[1])?.enrolled!==true)throw Error('Post-change verification failed');
await db.query('COMMIT');fs.writeFileSync(out+'/roles-after.json',JSON.stringify({at:new Date().toISOString(),classId,users:after,noCloudIamChange:true},null,2));console.log(JSON.stringify(after));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}

