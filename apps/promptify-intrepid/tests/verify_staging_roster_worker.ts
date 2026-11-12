import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {cloudHandler,configureWorkerIdentityVerifierForTests} from '../src/services/cloudRunServer';

process.env.NODE_ENV='test';process.env.PGHOST='pglite-test';
delete process.env.WORKSPACE_SOURCE_BINDINGS_JSON; // no approved source: a claimed class fails at the approval gate, before any Google read
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
const course='30000000-0000-4000-8000-000000000001';
const client='40000000-0000-4000-8000-000000000001';
await db.query("INSERT INTO public.users(id,email,full_name,role,auth_provider_id) VALUES($1,'staging-owner@example.test','Staging owner','admin','20000000-0000-4000-8000-000000000001')",[owner]);
await db.query("INSERT INTO public.clients(id,name,industry) VALUES($1,'Synthetic staging','Testing')",[client]);
await db.query("INSERT INTO public.courses(id,title,publication_status) VALUES($1,'Synthetic staging','published')",[course]);
// Any class may be claimed now (no fixed pair); only the production due rules decide.
const cases=[
 {code:'DUE-ANY-CLASS',autoSync:true,lastAttempt:"now()-interval '1 day'",nextSync:null},
 {code:'SCHEDULED-LATER',autoSync:true,lastAttempt:"now()-interval '1 day'",nextSync:"now()+interval '1 day'"},
 {code:'AUTO-SYNC-OFF',autoSync:false,lastAttempt:"now()-interval '1 day'",nextSync:null},
 {code:'TRIED-RECENTLY',autoSync:true,lastAttempt:"now()-interval '5 minutes'",nextSync:null},
];
const ids:Record<string,{cls:string;conn:string}>={};
for(const [index,item] of cases.entries()){
 const cls=`60000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,conn=`50000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`;
 ids[item.code]={cls,conn};
 await db.query(`INSERT INTO public.classes(id,class_code,course_id,client_id,department,status,start_date,end_date) VALUES($1,$2,$3,$4,'Customer Care','active',now()-interval '1 day',now()+interval '30 days')`,[cls,item.code,course,client]);
 await db.query(`INSERT INTO public.product_sheet_connections(id,class_id,sheet_id,name,column_mapping,created_by,auto_sync,last_attempt_at) VALUES($1,$2,$3,'Roster','{"templateVersion":1}'::jsonb,$4,$5,${item.lastAttempt})`,[conn,cls,'sheet-'+index,owner,item.autoSync]);
 if(item.nextSync)await db.query(`INSERT INTO public.product_roster_workbooks(connection_id,class_id,manifest,next_sync_at) VALUES($1,$2,'{}'::jsonb,${item.nextSync})`,[conn,cls]);
}
const staleLog='80000000-0000-4000-8000-000000000001';
await db.query(`INSERT INTO public.product_sync_logs(id,connection_id,class_id,actor_id,request_id,status,created_at) VALUES($1,$2,$3,$4,'90000000-0000-4000-8000-000000000001','running',now()-interval '6 minutes')`,[staleLog,ids['TRIED-RECENTLY'].conn,ids['TRIED-RECENTLY'].cls,owner]);
const logsOf=async(code:string)=>(await db.query('SELECT status,error_code FROM public.product_sync_logs WHERE connection_id=$1 AND id<>$2',[ids[code].conn,staleLog])).rows;

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
const first=await request('/internal/roster','POST','Bearer synthetic-oidc','{"classId":"foreign","sheetId":"foreign"}');
assert.equal(first.code,200,'signed route ignores caller-supplied scope');
assert.deepEqual(JSON.parse(first.text),{claimed:1,successful:0,failed:1},'only the due class is claimed; with no approved source it fails before reading Google');
assert.deepEqual(await logsOf('DUE-ANY-CLASS'),[{status:'failed',error_code:'roster_read_or_import_failed'}],'a class outside the old fixed pair is synced on schedule');
for(const code of ['SCHEDULED-LATER','AUTO-SYNC-OFF','TRIED-RECENTLY'])assert.deepEqual(await logsOf(code),[],code+' is not claimed');
assert.equal((await db.query('SELECT status FROM public.product_sync_logs WHERE id=$1',[staleLog])).rows[0].status,'failed','a run stuck for over 5 minutes is recovered');
assert.deepEqual(JSON.parse((await request('/internal/roster','POST','Bearer synthetic-oidc')).text),{claimed:0,successful:0,failed:0},'a just-attempted class waits 15 minutes before the next claim');
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
console.log('Staging roster worker PASS: any class on the production due rules (schedule, 15-minute floor, auto sync), approval gate before Google, stale recovery and staging-only verified OIDC route. Synthetic PGlite only.');
