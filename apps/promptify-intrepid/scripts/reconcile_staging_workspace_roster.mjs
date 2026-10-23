import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {Pool} from 'pg';
if(!process.argv.includes('--staging-readonly'))throw Error('Explicit staging readonly flag required');
const out='outputs/staging-release-2026-10-20-synthetic-workspace',fixture=JSON.parse(fs.readFileSync(out+'/runtime-fixture.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('outputs/staging-synthetic-workspace-2026-10-20/manifest.json','utf8'));
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});if(secret.status)throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1}),db=await pool.connect();
try{await db.query('BEGIN READ ONLY');await db.query('SET LOCAL ROLE service_role');const companies=[];
for(const [index,c]of fixture.companies.entries()){
 const cls=(await db.query('SELECT class_code FROM classes WHERE id=$1',[c.classId])).rows[0];if(cls?.class_code!==c.code)throw Error('Synthetic scope mismatch');
 const actual=(await db.query(`SELECT u.email,u.full_name,u.role,u.auth_provider_id IS NULL AS no_auth_identity,p.country,p.department,e.status FROM enrollments e JOIN learners l ON l.id=e.learner_id JOIN users u ON u.id=l.user_id LEFT JOIN product_roster_profiles p ON p.user_id=u.id AND p.class_id=e.class_id WHERE e.class_id=$1 AND u.email LIKE '%.example.test' ORDER BY u.email`,[c.classId])).rows;
 const root='outputs/staging-synthetic-workspace-2026-10-20/companies/'+manifest.organizations[index].id+'/snapshots/';const updates=JSON.parse(fs.readFileSync(root+'update-one/roster-upload.json','utf8')),omitted=JSON.parse(fs.readFileSync(root+'omit-one-removal-canary/roster-upload.json','utf8'));
 const rows=Array.isArray(updates)?updates:updates.rows;const remaining=Array.isArray(omitted)?omitted:omitted.rows;
 companies.push({classId:c.classId,code:c.code,actual,expectedRemaining:remaining.length,activeActual:actual.filter(r=>r.status==='active').length,omittedStillActive:actual.filter(r=>r.status==='active'&&!remaining.some(s=>s.email===r.email)).map(r=>r.email),sourceNameMismatches:rows.flatMap(s=>{const r=actual.find(r=>r.email===s.email);return r&&r.full_name!==s.fullName?[{email:s.email,expected:s.fullName,actual:r.full_name}]:[]}),crossCompanyEmails:actual.filter(r=>!manifest.organizations[index].rosterEmails.includes(r.email)).length});
}
await db.query('COMMIT');fs.writeFileSync(out+'/roster-live-readonly-reconciliation.json',JSON.stringify({at:new Date().toISOString(),scope:'Read-only synthetic class members only; fake example.test DB rows are NOT Firebase/auth identities',companies},null,2));console.log(JSON.stringify(companies.map(c=>({code:c.code,active:c.activeActual,omittedStillActive:c.omittedStillActive.length,nameMismatches:c.sourceNameMismatches.length,crossCompany:c.crossCompanyEmails}))));
}finally{db.release();await pool.end();}
