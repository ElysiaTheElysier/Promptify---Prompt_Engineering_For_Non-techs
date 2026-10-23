import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';

const appRoot=process.cwd();
if(JSON.parse(fs.readFileSync(path.join(appRoot,'package.json'),'utf8')).name!=='promptify-intrepid')throw Error('Run this maintenance script from apps/promptify-intrepid');
const manifestPath='scripts/staging-synthetic-roster-adoption-manifest.json';
const manifest=JSON.parse(fs.readFileSync(path.join(appRoot,manifestPath),'utf8'));
const has=(flag)=>process.argv.includes(flag);
const guard=has('--staging-synthetic-adopt'),apply=has('--apply'),checkManifest=has('--check-manifest');
if(has('--help')){
 console.log('Read-only preflight: node scripts/adopt_staging_synthetic_roster_ownership.mjs --staging-synthetic-adopt');
 console.log('Commit guarded synthetic-only adoption: add --apply. This is a staging-only maintenance operation.');
 process.exit(0);
}
if(checkManifest){validateFixtureEvidence();console.log(JSON.stringify({valid:true,scope:'eight exact example.test synthetic enrollments in two pinned staging classes; no database connection made'}));process.exit(0);}
if(!guard)throw Error('Explicit --staging-synthetic-adopt flag required');
if(apply&&!has('--staging-synthetic-adopt'))throw Error('--apply requires --staging-synthetic-adopt');
if(process.argv.some(arg=>arg.startsWith('--class=')||arg.startsWith('--email=')||arg.startsWith('--connection=')))throw Error('Target overrides are not supported; the reviewed manifest is fixed');
validateFixtureEvidence();

const proxyInstance='ai-transformation-510302:asia-southeast1:promptify-staging';
const proxyPort='55439';
const proxyCheck=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$proxies=@(Get-CimInstance Win32_Process | Where-Object { @('cloud-sql-proxy.exe','cloud-sql-proxy.x64.exe') -ccontains $_.Name -and $_.CommandLine -and $_.CommandLine.Contains('${proxyInstance}') -and $_.CommandLine -match '(^|\\s)--port[=\\s]+${proxyPort}(\\s|$)' }); $listeners=@(); try { $listeners=@(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort ${proxyPort} -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess) } catch { $listeners=@() }; if($listeners.Count -eq 0) { $netstatRows=@(netstat -ano -p tcp | Select-String -Pattern '^\\s*TCP\\s+127\\.0\\.0\\.1:${proxyPort}\\s+\\S+\\s+LISTENING\\s+\\d+\\s*$'); if($netstatRows.Count -eq 1) { $listeners=@(($netstatRows[0].Line.Trim() -split '\\s+')[-1]) } }; if($proxies.Count -eq 1 -and $listeners.Count -eq 1 -and [string]$listeners[0] -eq [string]$proxies[0].ProcessId){'matched'}else{'mismatch'}`],{encoding:'utf8',windowsHide:true});
if(proxyCheck.status!==0||proxyCheck.stdout.trim()!=='matched')throw Error('Expected the pinned Cloud SQL proxy process to own the only listener on staging port 55439');

const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access latest --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true,maxBuffer:32768});
if(secret.status!==0||!secret.stdout.trim())throw Error('Existing staging database credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:Number(proxyPort),database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1,connectionTimeoutMillis:5000});
secret.stdout='';secret.stderr='';
const fixtureOut=path.join('outputs','staging-release-2026-10-21-lifecycle-originals','roster-ownership-adoption');

async function runDatabaseOperation(){
try{
 const client=await pool.connect();
 try{
  const identity=(await client.query('SELECT current_database() AS database,current_user AS current_user,session_user AS session_user')).rows[0];
  if(identity.database!=='promptify_db'||identity.session_user!=='promptify_runtime')throw Error('Database identity does not match the staging runtime guard');
  await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query('SET LOCAL ROLE service_role');
  const schema=(await client.query(`SELECT to_regclass('public.product_roster_source_memberships') IS NOT NULL AS memberships,
    to_regclass('public.product_enrollment_ownership') IS NOT NULL AS ownership`)).rows[0];
  if(!schema.memberships||!schema.ownership)throw Error('Roster lifecycle migration 011 is not installed');
  if(apply)await lockPinnedScope(client);
  const before=await readSnapshot(client);
  const plan=await validateDatabaseScope(client);
  const alreadyAdopted=plan.companies.every(c=>c.state==='adopted');
  const readyToAdopt=plan.companies.every(c=>c.state==='manual-protected');
  if(!alreadyAdopted&&!readyToAdopt)throw Error('Partial or unexpected ownership state; no rows were changed');
  if(!apply){
   await client.query('ROLLBACK');
   console.log(JSON.stringify({mode:'read-only preflight',targetClasses:plan.companies.map(c=>({classCode:c.classCode,targetLearners:c.learners.length,sourceImportProof:c.sourceImportLogId,state:c.state})),preservedLinkedLearnerEnrollments:before.protectedLinkedLearnerEnrollments.length,readyToAdopt:readyToAdopt,alreadyAdopted},null,2));
   return;
  }
  if(alreadyAdopted){
   await client.query('ROLLBACK');
   const dir=makeArtifactDirectory();writeSnapshot(dir,'before',before,null);writeSnapshot(dir,'after',before,before);
   console.log(JSON.stringify({mode:'idempotent no-op',alreadyAdopted:true,artifactDirectory:dir,targetRows:8,auditRowsWritten:0},null,2));
   return;
  }
  const artifactDirectory=makeArtifactDirectory();writeSnapshot(artifactDirectory,'before',before,null);
  for(const c of plan.companies){
   for(const learner of c.learners){
    await client.query('SELECT learner_id FROM public.enrollments WHERE class_id=$1 AND learner_id=$2 AND status=\'active\' FOR UPDATE',[c.classId,learner.learnerId]);
    await client.query(`UPDATE public.product_enrollment_ownership SET manual_preserved=false,removed_by_roster=false,updated_at=now()
      WHERE learner_id=$1 AND class_id=$2 AND manual_preserved=true AND removed_by_roster=false`,[learner.learnerId,c.classId]);
    const changed=(await client.query('SELECT manual_preserved,removed_by_roster FROM public.product_enrollment_ownership WHERE learner_id=$1 AND class_id=$2',[learner.learnerId,c.classId])).rows[0];
    if(!changed||changed.manual_preserved||changed.removed_by_roster)throw Error('Ownership update did not reach the expected state');
   }
   const reason=`Guarded synthetic roster ownership adoption; class=${c.classCode}; connection=${c.connectionId}; exact fictional source members only; previous active enrollments and learner records retained.`;
   await client.query(`INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES($1,$2,'roster.synthetic.adopt',$3)`,[c.classId,c.auditActorId,reason]);
  }
  const after=await readSnapshot(client);
  assertProtectedLearnersUnchanged(before,after);
  await client.query('COMMIT');
  writeSnapshot(artifactDirectory,'after',before,after);
  console.log(JSON.stringify({mode:'committed guarded synthetic-only adoption',targetRows:8,classes:plan.companies.map(c=>c.classCode),preservedLinkedLearnerEnrollments:after.protectedLinkedLearnerEnrollments.length,auditRowsWritten:2,artifactDirectory},null,2));
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}finally{await pool.end();}
}
await runDatabaseOperation();

function readJson(relative){return JSON.parse(fs.readFileSync(path.join(appRoot,relative),'utf8'));}
function validateFixtureEvidence(){
 const runtime=readJson(manifest.runtimeFixture),bindings=readJson(manifest.sourceBindingManifest),roster=readJson(manifest.sourceRosterManifest),workflow=readJson(manifest.sourceImportEvidence),mutations=readJson(manifest.sourceMutationEvidence);
 assert.equal(runtime.companies.length,2);assert.equal(roster.organizations.length,2);assert.equal(manifest.companies.length,2);
 for(let i=0;i<2;i++){
  const target=manifest.companies[i],live=runtime.companies[i],source=roster.organizations[i];
  assert.equal(live.classId,target.classId);assert.equal(live.code,target.classCode);assert.equal(live.sheetId,target.sheetId);
  assert.equal(source.company,target.company);assert.deepEqual([...source.rosterEmails].sort(),[...target.rosterEmails].sort());
  assert.equal(new Set(target.rosterEmails).size,4);assert.ok(target.rosterEmails.every(email=>email.endsWith('@'+(i===0?'northstar':'juniper')+'.example.test')));
  assert.ok(bindings[target.classId]?.sheets?.includes(target.sheetId),'source binding must retain the exact approved synthetic Sheet');
  const initial=workflow.rows.find(row=>row.name.startsWith(live.department+' initial roster'));
  assert.ok(initial?.ok);assert.equal(initial.details.connectionId,target.connectionId);assert.equal(initial.details.processed,3);
  for(const suffix of ['Add authoritative membership expectation','Update authoritative membership expectation']){
   const row=mutations.rows.find(row=>row.name===`${live.department} ${suffix}`);
   assert.ok(row?.ok);assert.equal(row.details.processed,4);assert.equal(row.details.expected,4);
  }
  const omission=mutations.rows.find(row=>row.name===`${live.department} Omission authoritative membership expectation`);
  assert.ok(omission&&!omission.ok);assert.equal(omission.details.processed,3);assert.equal(omission.details.activeSyntheticMembers,4);
 }
}

async function lockPinnedScope(client){
 const targets=[...manifest.companies].sort((a,b)=>a.classId.localeCompare(b.classId));
 for(const target of targets){
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,811))',[target.classId]);
 }
 for(const target of targets){
  const cls=await client.query('SELECT id FROM public.classes WHERE id=$1 AND class_code=$2 FOR UPDATE',[target.classId,target.classCode]);
  if(cls.rowCount!==1)throw Error('Pinned synthetic class changed before adoption');
 }
 for(const target of targets){
  const connection=await client.query('SELECT id FROM public.product_sheet_connections WHERE id=$1 AND class_id=$2 AND sheet_id=$3 FOR UPDATE',[target.connectionId,target.classId,target.sheetId]);
  if(connection.rowCount!==1)throw Error('Pinned existing source connection changed before adoption');
 }
 const north=targets[0],south=targets[1];
 await client.query(`SELECT e.learner_id FROM public.users u JOIN public.learners l ON l.user_id=u.id
   JOIN public.enrollments e ON e.learner_id=l.id
   WHERE (e.class_id=$1 AND lower(u.email)=ANY($2::text[])) OR (e.class_id=$3 AND lower(u.email)=ANY($4::text[]))
   ORDER BY lower(u.email),e.class_id FOR UPDATE OF u,l,e`,[north.classId,[...north.rosterEmails].sort(),south.classId,[...south.rosterEmails].sort()]);
 await client.query(`SELECT o.learner_id FROM public.product_enrollment_ownership o JOIN public.learners l ON l.id=o.learner_id
   JOIN public.users u ON u.id=l.user_id
   WHERE (o.class_id=$1 AND lower(u.email)=ANY($2::text[])) OR (o.class_id=$3 AND lower(u.email)=ANY($4::text[]))
   ORDER BY lower(u.email),o.class_id FOR UPDATE OF o`,[north.classId,[...north.rosterEmails].sort(),south.classId,[...south.rosterEmails].sort()]);
}

async function validateDatabaseScope(client){
 const result=[];
 for(let index=0;index<manifest.companies.length;index++){
  const target=manifest.companies[index],fixture=readJson(manifest.runtimeFixture).companies[index];
  const cls=(await client.query('SELECT id,class_code FROM public.classes WHERE id=$1',[target.classId])).rows[0];
  if(cls?.id!==target.classId||cls.class_code!==target.classCode)throw Error('Pinned synthetic class ID/code mismatch');
  const connection=(await client.query('SELECT id,class_id,sheet_id,created_by FROM public.product_sheet_connections WHERE id=$1',[target.connectionId])).rows[0];
  if(connection?.id!==target.connectionId||connection.class_id!==target.classId||connection.sheet_id!==target.sheetId)throw Error('Pinned existing source connection/class/Sheet mismatch');
  const proof=(await client.query(`SELECT l.id AS log_id,l.actor_id,l.processed,l.snapshot_payload,u.role,u.auth_provider_id
    FROM public.product_sync_logs l JOIN public.users u ON u.id=l.actor_id
    WHERE l.connection_id=$1 AND l.class_id=$2 AND l.status='success'
    ORDER BY l.created_at DESC,l.id DESC`,[target.connectionId,target.classId])).rows;
  const expected=[...target.rosterEmails].sort();
  const exactProof=proof[0];
  if(!exactProof||exactProof.processed!==4||!Array.isArray(exactProof.snapshot_payload?.rows)||exactProof.snapshot_payload.rows.length!==4||JSON.stringify(exactProof.snapshot_payload.rows.map(r=>String(r.email).toLowerCase()).sort())!==JSON.stringify(expected)||exactProof.role!=='admin'||!exactProof.auth_provider_id)throw Error('The latest successful source snapshot must prove this exact four-email roster and linked-admin actor');
  const learners=(await client.query(`SELECT u.id AS user_id,l.id AS learner_id,u.email,u.role,u.auth_provider_id,e.status AS enrollment_status,
      o.manual_preserved,o.removed_by_roster,p.country,p.department
    FROM public.users u JOIN public.learners l ON l.user_id=u.id
    JOIN public.enrollments e ON e.learner_id=l.id AND e.class_id=$1
    LEFT JOIN public.product_enrollment_ownership o ON o.learner_id=l.id AND o.class_id=e.class_id
    LEFT JOIN public.product_roster_profiles p ON p.user_id=u.id AND p.class_id=e.class_id
    WHERE lower(u.email)=ANY($2::text[]) ORDER BY lower(u.email)`,[target.classId,expected])).rows;
  if(learners.length!==4||JSON.stringify(learners.map(r=>r.email.toLowerCase()).sort())!==JSON.stringify(expected))throw Error('Exact four reserved synthetic users were not found in the pinned class');
  if(learners.some(r=>r.role!=='learner'||r.auth_provider_id!==null||r.enrollment_status!=='active'||r.country!==(index===0?'ZZ':'YY')||r.department!==fixture.department))throw Error('Synthetic target row is not an unlinked active learner for this fixture department');
  const memberships=(await client.query('SELECT connection_id,class_id,user_id,active,last_seen_log FROM public.product_roster_source_memberships WHERE class_id=$1 AND user_id=ANY($2::uuid[]) ORDER BY user_id',[target.classId,learners.map(r=>r.user_id)])).rows;
  const ownMemberships=memberships.filter(r=>r.connection_id===target.connectionId&&r.active);
  if(memberships.length!==4||ownMemberships.length!==4||memberships.some(r=>r.class_id!==target.classId||r.connection_id!==target.connectionId||r.last_seen_log!==exactProof.log_id))throw Error('A successful four-row sync must already have created the exact active connection memberships');
  const owners=(await client.query('SELECT learner_id,manual_preserved,removed_by_roster FROM public.product_enrollment_ownership WHERE class_id=$1 AND learner_id=ANY($2::uuid[])',[target.classId,learners.map(r=>r.learner_id)])).rows;
  if(owners.length!==4)throw Error('Migration ownership backfill did not preserve all eight legacy enrollments');
  const state=owners.every(r=>!r.manual_preserved&&!r.removed_by_roster)?'adopted':
   owners.every(r=>r.manual_preserved&&!r.removed_by_roster)?'manual-protected':'unexpected';
  if(state==='unexpected')throw Error('Target rows have partial or conflicting ownership state');
  const connectionActor=(await client.query('SELECT role,auth_provider_id FROM public.users WHERE id=$1',[connection.created_by])).rows[0];
  if(connectionActor?.role!=='admin'||!connectionActor.auth_provider_id)throw Error('The existing connection creator is not a linked staging administrator');
  const exactLogActor=exactProof.actor_id;
  result.push({company:target.company,classId:target.classId,classCode:target.classCode,sheetId:target.sheetId,connectionId:target.connectionId,learners:learners.map(r=>({userId:r.user_id,learnerId:r.learner_id,email:r.email,ownership:r.manual_preserved?'manual-protected':'source-owned'})),state,sourceImportLogId:exactProof.log_id,auditActorId:exactLogActor});
 }
 await validateProtectedQaLearners(client);
 return {companies:result};
}

async function validateProtectedQaLearners(client){
 for(const expected of manifest.qaLearnersMustRemainManual){
  const rows=(await client.query(`SELECT c.class_code,u.auth_provider_id,e.status,o.manual_preserved,o.removed_by_roster
    FROM public.classes c JOIN public.users u ON lower(u.email)=lower($2) JOIN public.learners l ON l.user_id=u.id
    JOIN public.enrollments e ON e.class_id=c.id AND e.learner_id=l.id
    LEFT JOIN public.product_enrollment_ownership o ON o.class_id=e.class_id AND o.learner_id=l.id
    WHERE c.class_code=$1`,[expected.classCode,expected.email])).rows;
  if(rows.length!==1||!rows[0].auth_provider_id||rows[0].status!=='active'||rows[0].manual_preserved!==true||rows[0].removed_by_roster!==false)throw Error('Linked QA learner must remain an active manual grant');
 }
}

async function readSnapshot(client){
 const syntheticEmails=manifest.companies.flatMap(c=>c.rosterEmails);
 const target=(await client.query(`SELECT c.class_code,u.id AS user_id,l.id AS learner_id,u.email,u.auth_provider_id IS NULL AS no_auth_identity,
      e.status AS enrollment_status,o.manual_preserved,o.removed_by_roster,m.connection_id,m.active AS source_membership_active,m.last_seen_log
    FROM public.classes c JOIN public.enrollments e ON e.class_id=c.id JOIN public.learners l ON l.id=e.learner_id JOIN public.users u ON u.id=l.user_id
    LEFT JOIN public.product_enrollment_ownership o ON o.learner_id=l.id AND o.class_id=e.class_id
    LEFT JOIN public.product_roster_source_memberships m ON m.class_id=e.class_id AND m.user_id=u.id
    WHERE lower(u.email)=ANY($1::text[]) ORDER BY c.class_code,lower(u.email)`,[syntheticEmails])).rows;
 const linked=(await client.query(`SELECT c.class_code,u.id AS user_id,l.id AS learner_id,e.status AS enrollment_status,o.manual_preserved,o.removed_by_roster
    FROM public.classes c JOIN public.enrollments e ON e.class_id=c.id JOIN public.learners l ON l.id=e.learner_id JOIN public.users u ON u.id=l.user_id
    LEFT JOIN public.product_enrollment_ownership o ON o.learner_id=l.id AND o.class_id=e.class_id
    WHERE c.id=ANY($1::uuid[]) AND u.auth_provider_id IS NOT NULL ORDER BY c.class_code,u.id`,[manifest.companies.map(c=>c.classId)])).rows;
 return {capturedAt:new Date().toISOString(),target,protectedLinkedLearnerEnrollments:linked.map(r=>({classCode:r.class_code,userId:r.user_id,learnerId:r.learner_id,enrollmentStatus:r.enrollment_status,manualPreserved:r.manual_preserved,removedByRoster:r.removed_by_roster}))};
}

function assertProtectedLearnersUnchanged(before,after){
 const normalize=rows=>rows.map(r=>({...r})).sort((a,b)=>a.classCode.localeCompare(b.classCode)||a.userId.localeCompare(b.userId));
 assert.deepEqual(normalize(before.protectedLinkedLearnerEnrollments),normalize(after.protectedLinkedLearnerEnrollments),'Linked QA learner enrollments and ownership must remain identical');
 assert.equal(before.protectedLinkedLearnerEnrollments.length>=2,true,'both linked QA learners must be included in the protected snapshot');
 assert.equal(after.target.length,8);assert.ok(after.target.every(r=>r.no_auth_identity&&r.enrollment_status==='active'&&r.manual_preserved===false&&r.removed_by_roster===false&&r.source_membership_active===true));
}

function makeArtifactDirectory(){
 const dir=path.join(appRoot,fixtureOut,new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(path.join(appRoot,fixtureOut),{recursive:true});fs.mkdirSync(dir,{recursive:false});return dir;
}
function writeSnapshot(dir,suffix,before,after){
 const target=path.join(dir,`${suffix}.json`);
 fs.writeFileSync(target,JSON.stringify({scope:'Exact eight pre-existing synthetic example.test rows only; no linked QA learners, user identity, enrollment row or profile changed.',before,after},null,2));
}
