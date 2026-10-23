import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';import {Pool} from 'pg';
if(!process.argv.includes('--staging-synthetic'))throw Error('Explicit staging fixture flag required');
const out='outputs/staging-release-2026-10-20-synthetic-workspace',path=out+'/runtime-fixture.json';
const source=JSON.parse(fs.readFileSync('outputs/staging-synthetic-workspace-2026-10-20/manifest.json','utf8'));
const fixed=[{sheetId:'192FSgBS3yLEDrEaWIpv_sQJ40d2nnuDWGFEbDT7UhRM',folderId:'1DcpDBCEE22VRGK79C7Nyb_R8E3FfJmww',files:['1gLDmi6x1YdOeUFaMP2jL7Cl2IJYsNxK4','15mye0k2tr3HBo7_-0J32edtLz_Qd4Ol2'],tester:'demo.biz@intrepid.asia'},{sheetId:'19PpiiiA4goQyKqck2Xb-vvFDJZ-MM0dxG1m7B2nJVvw',folderId:'13UFu7H6Er9cmnGAUsiPzxNvimQ72zCh1',files:['1E_orPXwwjU2P8UH3OJCMrs6jZpshzvIf','12U8-VKr5UOzoIwqNto7UMJQKcxJR0hv6'],tester:'manhmanh100127@gmail.com'}];
const state=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{at:new Date().toISOString(),scope:'Maintenance setup only, not signed-user acceptance. Two NEW fictional company classes; no Firebase users or roles created.',lessonId:'64b6f084-9e93-49cd-a7be-e2ef9e14ff65',companies:source.organizations.map((o:any,i:number)=>({...fixed[i],classId:randomUUID(),clientId:randomUUID(),code:'STAGING-SYNTHETIC-20261020-'+(i===0?'NORTHSTAR':'JUNIPER'),company:o.company,department:o.selectedDepartment,canaries:o.sopFiles.map((s:any)=>s.canary)}))};
fs.writeFileSync(path,JSON.stringify(state,null,2));
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});if(secret.status)throw Error('Staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1}),db=await pool.connect();
try{await db.query('BEGIN');await db.query('SET LOCAL ROLE service_role');
const baseline=(await db.query('SELECT class_code,course_id FROM classes WHERE id=$1',['4a5a763a-b1b5-4676-88ca-81f4805fb321'])).rows[0];if(baseline?.class_code!=='STAGING-ACCEPTANCE-20261019-4a5a763a')throw Error('Staging baseline mismatch');
const actor=(await db.query("SELECT id,auth_provider_id FROM users WHERE email='duonglh.work@gmail.com' AND role='admin'")).rows[0];if(!actor?.auth_provider_id)throw Error('Existing admin required');
await db.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor.auth_provider_id,role:'authenticated'})]);
for(const c of state.companies){
 const prior=(await db.query('SELECT class_code,department,client_id FROM classes WHERE id=$1',[c.classId])).rows[0];if(prior&&(prior.class_code!==c.code||prior.client_id!==c.clientId||prior.department!==c.department))throw Error('Fixture UUID collision');
 await db.query("INSERT INTO clients(id,name,industry) VALUES($1,$2,'Fictional staging QA only') ON CONFLICT(id) DO NOTHING",[c.clientId,c.company]);
 await db.query("INSERT INTO classes(id,class_code,client_id,course_id,department,start_date,end_date,status) VALUES($1,$2,$3,$4,$5,now()-interval '1 day',now()+interval '30 days','active') ON CONFLICT(id) DO NOTHING",[c.classId,c.code,c.clientId,baseline.course_id,c.department]);
 const learner=(await db.query("SELECT l.id FROM learners l JOIN users u ON u.id=l.user_id WHERE u.email=$1 AND u.role='learner'",[c.tester])).rows[0];if(!learner)throw Error('Existing test learner missing');
 await db.query("INSERT INTO enrollments(learner_id,class_id,status) VALUES($1,$2,'active') ON CONFLICT(learner_id,class_id) DO NOTHING",[learner.id,c.classId]);
 await db.query("INSERT INTO product_audit(class_id,actor_id,action,reason) VALUES($1,$2,'qa.workspace.setup','New synthetic company/class; existing QA participant only. Maintenance SQL by authorized operator, not signed app acceptance.')",[c.classId,actor.id]);
}
await db.query('COMMIT');state.preparedAt=new Date().toISOString();fs.writeFileSync(path,JSON.stringify(state,null,2));
console.log(JSON.stringify({companies:state.companies.map((c:any)=>({classId:c.classId,code:c.code,department:c.department})),scope:state.scope}));
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
