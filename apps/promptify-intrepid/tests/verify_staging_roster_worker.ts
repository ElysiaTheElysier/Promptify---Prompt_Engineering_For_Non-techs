import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {claimStagingRosterSync,STAGING_ROSTER_FIXTURES} from '../src/services/stagingRosterClaimService';
import {cloudHandler,configureWorkerIdentityVerifierForTests} from '../src/services/cloudRunServer';

process.env.NODE_ENV='test';process.env.PGHOST='pglite-test';
const db=new PGlite();
await db.exec(fs.readFileSync('gcp/sql/001_baseline.sql','utf8'));
await db.exec(fs.readFileSync('gcp/sql/006_mentor_feedback.sql','utf8'));
await db.exec(fs.readFileSync('gcp/sql/011_roster_lifecycle.sql','utf8'));
let poolTail=Promise.resolve();
configureSqlPoolForTests({async connect(){
 const previous=poolTail;let unlock=()=>{};poolTail=new Promise<void>(resolve=>{unlock=resolve;});await previous;
 return {query:(sql:string,values?:any[])=>db.query(sql,values),release(){unlock();}};
}});

const owner='10000000-0000-4000-8000-000000000001';
const ownerAuth='20000000-0000-4000-8000-000000000001';
const course='30000000-0000-4000-8000-000000000001';
const client='40000000-0000-4000-8000-000000000001';
await db.query("INSERT INTO public.users(id,email,full_name,role,auth_provider_id) VALUES($1,'staging-owner@example.test','Staging owner','admin',$2)",[owner,ownerAuth]);
await db.query("INSERT INTO public.clients(id,name,industry) VALUES($1,'Synthetic staging','Testing')",[client]);
await db.query("INSERT INTO public.courses(id,title,publication_status) VALUES($1,'Synthetic staging','published')",[course]);
for(let index=0;index<STAGING_ROSTER_FIXTURES.length;index++){
 const fixture=STAGING_ROSTER_FIXTURES[index];
 await db.query(`INSERT INTO public.classes(id,class_code,course_id,client_id,department,status,start_date,end_date)
  VALUES($1,$2,$3,$4,$5,'active',now()-interval '1 day',now()+interval '30 days')`,
 [fixture.classId,fixture.classCode,course,client,index===0?'Northstar Operations':'Juniper Customer Success']);
 await db.query(`INSERT INTO public.product_sheet_connections(id,class_id,sheet_id,name,column_mapping,created_by,auto_sync,last_attempt_at)
  VALUES($1,$2,$3,'Synthetic roster','{"templateVersion":1}'::jsonb,$4,true,now()-interval '6 minutes')`,
 [`50000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,fixture.classId,fixture.sheetId,owner]);
}
const otherClass='60000000-0000-4000-8000-000000000001';
await db.query("INSERT INTO public.classes(id,class_code,course_id,client_id,department,status,start_date,end_date) VALUES($1,'STAGING-SYNTHETIC-OTHER',$2,$3,'Other','active',now()-interval '1 day',now()+interval '30 days')",[otherClass,course,client]);
await db.query("INSERT INTO public.product_sheet_connections(id,class_id,sheet_id,name,column_mapping,created_by,auto_sync,last_attempt_at) VALUES($1,$2,'not-approved-sheet','Other synthetic sheet','{}'::jsonb,$3,true,now()-interval '1 day')",['70000000-0000-4000-8000-000000000001',otherClass,owner]);
const otherStaleLog='80000000-0000-4000-8000-000000000002';
await db.query(`INSERT INTO public.product_sync_logs(id,connection_id,class_id,actor_id,request_id,status,created_at)
 VALUES($1,'70000000-0000-4000-8000-000000000001',$2,$3,'90000000-0000-4000-8000-000000000002','running',now()-interval '6 minutes')`,
 [otherStaleLog,otherClass,owner]);

const staleLog='80000000-0000-4000-8000-000000000001';
await db.query(`INSERT INTO public.product_sync_logs(id,connection_id,class_id,actor_id,request_id,status,created_at)
 VALUES($1,'50000000-0000-4000-8000-000000000001',$2,$3,'90000000-0000-4000-8000-000000000001','running',now()-interval '6 minutes')`,
 [staleLog,STAGING_ROSTER_FIXTURES[0].classId,owner]);

const [claim1,claim2]=await Promise.all([claimStagingRosterSync(),claimStagingRosterSync()]);
assert.equal(claim1?.classId,STAGING_ROSTER_FIXTURES[0].classId,'first approved source is claimed');
assert.equal(claim1?.sheetId,STAGING_ROSTER_FIXTURES[0].sheetId,'claimed source matches its pinned Sheet');
assert.deepEqual((await db.query('SELECT status,error_code FROM public.product_sync_logs WHERE id=$1',[staleLog])).rows[0],{status:'failed',error_code:'worker_timeout'},'only scoped stale claim is recovered');
assert.equal(claim2?.classId,STAGING_ROSTER_FIXTURES[1].classId,'second parallel slot can claim the other approved source');
assert.deepEqual((await db.query('SELECT status,error_code FROM public.product_sync_logs WHERE id=$1',[otherStaleLog])).rows[0],{status:'running',error_code:null},'stale log cleanup leaves all nonfixture classes untouched');
assert.equal(await claimStagingRosterSync(),null,'freshly claimed sources and nonfixture class are not claimed again');

// Route authorization is tested with a fake verified OIDC payload; request body never supplies scope.
const stageProject='ai-transformation-510302';
process.env.RUNTIME_MODE='api';process.env.ROSTER_STAGING_ENABLED='true';
process.env.GOOGLE_CLOUD_PROJECT=stageProject;process.env.K_SERVICE='promptify-intrepid-api';
process.env.WORKER_INVOKER_EMAIL=`promptify-scheduler@${stageProject}.iam.gserviceaccount.com`;
process.env.WORKER_AUDIENCE='https://promptify-intrepid-api-test-390575746801.asia-southeast1.run.app';
let verifierCalls=0;
let identityPayload:{aud:string|string[]|undefined;email:string|undefined;email_verified:boolean;iss:string}={aud:process.env.WORKER_AUDIENCE,email:process.env.WORKER_INVOKER_EMAIL,email_verified:true,iss:'https://accounts.google.com'};
configureWorkerIdentityVerifierForTests(async(token,audience)=>{
 verifierCalls++;
 assert.equal(token,'synthetic-oidc');assert.equal(audience,process.env.WORKER_AUDIENCE);
 return identityPayload;
});
async function request(url:string,method='POST',authorization?:string,body=''){
 let code=0,text='';const req:any={url,method,headers:authorization?{authorization}:{},async *[Symbol.asyncIterator](){if(body)yield Buffer.from(body);}};
 const res:any={headersSent:false,setHeader(){},writeHead(status:number){code=status;this.headersSent=true;},end(value:any){text=String(value||'');}};
 await cloudHandler(req,res);return {code,text};
}
assert.equal((await request('/internal/roster','POST')).code,401,'unsigned staging request is rejected');
assert.equal((await request('/internal/roster','GET','Bearer synthetic-oidc')).code,405,'route only accepts POST');
assert.equal((await request('/internal/projections','POST','Bearer synthetic-oidc')).code,404,'API OIDC route never enables projections');
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc','{"classId":"foreign","sheetId":"foreign"}')).code,200,'signed route ignores caller-supplied scope');
assert.deepEqual(JSON.parse((await request('/internal/roster','POST','Bearer synthetic-oidc')).text),{claimed:0,successful:0,failed:0},'route safely returns no work when both fixed fixtures are not due');
assert.ok(verifierCalls>=2,'signed POST requests are verified against the configured exact audience');
identityPayload={aud:'https://wrong-audience.run.app',email:process.env.WORKER_INVOKER_EMAIL,email_verified:true,iss:'https://accounts.google.com'};
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc')).code,401,'wrong OIDC audience is rejected');
identityPayload={aud:process.env.WORKER_AUDIENCE,email:'different-scheduler@example.test',email_verified:true,iss:'https://accounts.google.com'};
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc')).code,401,'different service-account email is rejected');
identityPayload={aud:process.env.WORKER_AUDIENCE,email:process.env.WORKER_INVOKER_EMAIL,email_verified:false,iss:'https://accounts.google.com'};
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc')).code,401,'unverified service-account email is rejected');
identityPayload={aud:process.env.WORKER_AUDIENCE,email:process.env.WORKER_INVOKER_EMAIL,email_verified:true,iss:'untrusted.example'};
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc')).code,401,'non-Google issuer is rejected');
identityPayload={aud:process.env.WORKER_AUDIENCE,email:process.env.WORKER_INVOKER_EMAIL,email_verified:true,iss:'https://accounts.google.com'};
process.env.ROSTER_STAGING_ENABLED='false';
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc')).code,404,'staging feature flag is mandatory');
process.env.ROSTER_STAGING_ENABLED='true';
process.env.GOOGLE_CLOUD_PROJECT='production-project';
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc')).code,404,'wrong project disables staging route');
process.env.GOOGLE_CLOUD_PROJECT=stageProject;process.env.K_SERVICE='promptify-intrepid-worker';
assert.equal((await request('/internal/roster','POST','Bearer synthetic-oidc')).code,404,'worker service name disables API route');

configureWorkerIdentityVerifierForTests();
await db.close();
console.log('Staging roster worker PASS: fixed-pair claims, five-minute due gate, stale recovery, two-claim cap path and staging-only verified OIDC route. Synthetic PGlite only.');
