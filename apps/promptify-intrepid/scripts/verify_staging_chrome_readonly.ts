import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.argv.includes('--staging-readonly'))throw Error('Explicit readonly flag required');
const fixture=JSON.parse(fs.readFileSync('outputs/staging-feedback-review/fixture.json','utf8'));
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(secret.status!==0)throw Error('Staging secret unavailable');
Object.assign(process.env,{PGHOST:'127.0.0.1',PGPORT:'55439',PGDATABASE:'promptify_db',PGUSER:'promptify_runtime',PGPASSWORD:secret.stdout.trim()});delete process.env.DATABASE_URL;
const {sqlTransaction,closeSqlPool}=await import('../src/services/cloudPostgresService');
try{
 const result=await sqlTransaction(undefined,async db=>{
  await db.query('SET TRANSACTION READ ONLY');
  const profile=(await db.query('SELECT employee_id,office_location FROM product_profile_details WHERE user_id=$1',[fixture.actorId])).rows[0];
  const saved=(await db.query('SELECT status,(title=$3) AS matches_suggested_title FROM product_prompt_library WHERE owner_id=$1 AND class_id=$2',[fixture.actorId,fixture.ids.class,'QA-UI-SAVE-20261017'])).rows;
  const attempts=(await db.query('SELECT attempt_number FROM prompt_attempts WHERE class_id=$1 AND lesson_ref_id=$2 ORDER BY attempt_number',[fixture.ids.class,fixture.ids.lesson])).rows;
  const awards=(await db.query('SELECT count(*)::int n FROM product_awards WHERE class_id=$1 AND learner_id=$2',[fixture.ids.class,fixture.learnerId])).rows[0].n;
  assert.ok(profile?.employee_id);assert.ok(profile?.office_location);
  assert.ok(saved.length>0);assert.deepEqual(attempts.map(a=>a.attempt_number),[1,2]);assert.equal(awards,1);
  return {profile:{employeeIdPresent:!!profile.employee_id,officeLocationPresent:!!profile.office_location,matchesSuggestedQAValues:profile.employee_id==='QA-ONLY-20261017'&&profile.office_location==='FICTIONAL QA OFFICE'},personalSave:saved,attempts:attempts.map(a=>a.attempt_number),awardCount:awards,readOnly:true,chromeInteraction:'User performed and confirmed Save, Compare and badge preview; agent verified persistence separately'};
 });
 fs.writeFileSync('outputs/staging-feedback-review/chrome-ui-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await closeSqlPool();}
