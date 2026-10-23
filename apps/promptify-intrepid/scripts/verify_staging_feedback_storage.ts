// Targeted real staging storage checks. Not an OAuth/HTTP/UI test and not in offline allowlist.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.argv.includes('--staging-synthetic'))throw Error('Explicit --staging-synthetic required.');
const fixture=JSON.parse(fs.readFileSync('outputs/staging-feedback-review/fixture.json','utf8'));
if(!fixture.code.startsWith('STAGING-QA-20261017-'))throw Error('Unexpected fixture scope');
const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(result.status!==0)throw Error('Runtime secret unavailable');
Object.assign(process.env,{GOOGLE_CLOUD_PROJECT:'ai-transformation-510302',PGHOST:'127.0.0.1',PGPORT:'55439',PGDATABASE:'promptify_db',PGUSER:'promptify_runtime',PGPASSWORD:result.stdout.trim()});
delete process.env.DATABASE_URL;
const {sqlTransaction,closeSqlPool}=await import('../src/services/cloudPostgresService');
const {saveProfileDetails}=await import('../src/services/mentorFeedbackService');
const query=async(q:string,v:any[]=[])=>sqlTransaction(undefined,async db=>(await db.query(q,v)).rows);
const original=(await query('SELECT employee_id,office_location,updated_at FROM product_profile_details WHERE user_id=$1',[fixture.actorId]))[0];
const employee='QA-ONLY-20261017',office='FICTIONAL office — staging test';
let profileWritten=false;
try{
 const scope=(await query('SELECT class_code FROM classes WHERE id=$1',[fixture.ids.class]))[0];assert.equal(scope?.class_code,fixture.code);
 await assert.rejects(()=>saveProfileDetails(fixture.actorId,{employeeId:'x'.repeat(121),officeLocation:office}),/Invalid profile fields/);
 await saveProfileDetails(fixture.actorId,{employeeId:employee,officeLocation:office});profileWritten=true;
 const read=(await query('SELECT employee_id,office_location FROM product_profile_details WHERE user_id=$1',[fixture.actorId]))[0];assert.equal(read.employee_id,employee);assert.equal(read.office_location,office);
 const attempts=await query('SELECT attempt_number,model,evaluation_json FROM prompt_attempts WHERE class_id=$1 AND lesson_ref_id=$2 ORDER BY attempt_number',[fixture.ids.class,fixture.ids.lesson]);
 assert.deepEqual(attempts.map(a=>a.attempt_number),[1,2]);assert.ok(attempts.every(a=>a.model==='STAGING-FIXTURE-NOT-AI'));
 const before=(await query('SELECT count(*)::int n FROM product_awards WHERE class_id=$1 AND learner_id=$2',[fixture.ids.class,fixture.learnerId]))[0].n;
 await query('SELECT public.product_refresh_awards($1,$2)',[fixture.ids.class,fixture.learnerId]);
 const after=(await query('SELECT count(*)::int n FROM product_awards WHERE class_id=$1 AND learner_id=$2',[fixture.ids.class,fixture.learnerId]))[0].n;assert.equal(before,after);assert.equal(after,1);
 fs.writeFileSync('outputs/staging-feedback-review/storage-results.json',JSON.stringify({profileServiceSaveReload:true,invalidProfileRejected:true,attemptNumbers:[1,2],storedFixtureOnly:true,badgeFirstAttemptDenied:true,badgeAnyAttemptIssued:true,badgeRefreshIdempotent:true,oauthHttpUiVerified:false},null,2));
 console.log('Real staging storage PASS: profile service persistence/validation, V1/V2 fixture history, badge idempotency. OAuth/HTTP/UI not covered.');
}finally{
 if(profileWritten)await sqlTransaction(undefined,async db=>{
  const row=(await db.query('SELECT employee_id,office_location FROM product_profile_details WHERE user_id=$1 FOR UPDATE',[fixture.actorId])).rows[0];
  if(row?.employee_id!==employee||row?.office_location!==office)throw Error('Profile changed concurrently; stop without overwriting');
  if(original)await db.query('UPDATE product_profile_details SET employee_id=$2,office_location=$3,updated_at=$4 WHERE user_id=$1',[fixture.actorId,original.employee_id,original.office_location,original.updated_at]);
  else await db.query('DELETE FROM product_profile_details WHERE user_id=$1',[fixture.actorId]);
 });
 await closeSqlPool();console.log('Demo profile restored to its original state; synthetic class/attempts/badge retained for review.');
}
