// Opt-in integration against disposable localhost services; excluded from offline allowlist.
if(!process.argv.includes('--local-only'))throw Error('Start the local review runner, then pass --local-only.');
import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID} from 'node:crypto';
const origin='http://127.0.0.1:5195',emulator='http://127.0.0.1:9099';const id=n=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
async function login(role){const email=role+'@example.test';const res=await fetch(emulator+'/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:origin,postBody:new URLSearchParams({providerId:'google.com',id_token:JSON.stringify({sub:email,email,email_verified:true})}).toString(),returnSecureToken:true})});const data=await res.json();assert.equal(res.status,200);return data.idToken;}
const token={};for(const role of ['learner','admin','instructor','head','unlisted'])token[role]=await login(role);
const results=[];async function api(role,body,status=200){const res=await fetch(origin+'/api/product',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token[role]},body:JSON.stringify(body)});const data=await res.json();assert.equal(res.status,status,JSON.stringify({action:body.action,error:data.error}));results.push({role,action:body.action,status:res.status});return data;}
await api('learner',{action:'saveProfileDetails',employeeId:'LOCAL-42',officeLocation:'Local Test Office'});
await api('learner',{action:'confirmProfile',fullName:'Local learner'});
const learner=await api('learner',{action:'snapshot',classId:id(40)});assert.equal(learner.profileDetails.employee_id,'LOCAL-42');
await api('learner',{action:'snapshot',classId:id(41)},403);await api('learner',{action:'analytics'},403);
await api('admin',{action:'saveWorkspacePreferences',classId:id(40),contactEmail:'support@example.test',contactName:'Local support',hourlyCost:10,currency:'USD'});
await api('learner',{action:'saveWorkspacePreferences',classId:id(40),hourlyCost:1},403);
const support=await api('unlisted',{action:'supportConfig',classId:id(40)});assert.equal(support.contactEmail,'support@example.test');
const requestId=randomUUID();await api('unlisted',{action:'accessRequest',classId:id(40),requestId,message:'Synthetic local access request, no production account.'});await api('unlisted',{action:'accessRequest',classId:id(40),requestId,message:'Synthetic local access request, no production account.'});
await api('unlisted',{action:'accessRequest',classId:id(40),requestId,message:'Changed content on reused request ID.'},409);
const inbox=await api('admin',{action:'accessRequests',classId:id(40)});assert.equal(inbox.filter(r=>r.id===requestId).length,1);
await api('head',{action:'snapshot',classId:id(41)},403);await api('instructor',{action:'snapshot',classId:id(40)});
await api('learner',{action:'uiEvents',classId:id(40),events:[{id:randomUUID(),event:'hint',lessonId:id(60),seconds:0}]});
const measurement={action:'recordOutcome',classId:id(40),lessonId:id(60),requestId:randomUUID(),beforeMinutes:30,afterMinutes:10,repetitionsPerWeek:3};await api('learner',measurement);await api('learner',measurement);
await api('learner',{...measurement,afterMinutes:5},409);
const report=await api('admin',{action:'analytics',classId:id(40)});assert.equal(Number(report.feedback.outcomes[0].hours_saved_week),1);assert.equal(report.feedback.outcomes[0].annual_estimate,520);
await api('admin',{action:'reviewAccessRequest',classId:id(40),requestId});
await api('unlisted',{action:'snapshot'},403);
fs.writeFileSync('outputs/backend-review/local-integration.json',JSON.stringify({at:new Date().toISOString(),identity:'Firebase Auth Emulator verified by firebase-admin (no verifier injection)',database:'PGlite actual PostgreSQL engine; synthetic data',results},null,2));console.log(results.length+' actual HTTP checks PASS');

