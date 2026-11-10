import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// 026 (TM-003): staff accounts bind on first Google sign-in only after an audited administrator approval.
// Real SQL in PGlite through the real binder; offline, no Firebase call.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';
const {configureSqlPoolForTests}=await import('../src/services/cloudPostgresService');
const {bindVerifiedIdentity,pendingIdentityLinks,configureFirebaseVerifierForTests}=await import('../src/services/firebaseServerIdentityService');
const {createDatabaseClient}=await import('../src/services/cloudDatabaseService');
const {identityError}=await import('../src/services/apiAuthorizationService');
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;
  return {async query(sql:string,values:any[]=[]){const r=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(r.rows))};},release};}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000026`;
await db.query(`INSERT INTO users(id,email,full_name,role) VALUES($1,'admin@example.test','Admin','admin'),($2,'trainer@example.test','Trainer','instructor'),($3,'learner@example.test','Learner','learner'),($4,'head@example.test','Head','head')`,[id(1),id(2),id(3),id(4)]);
const iss='https://securetoken.google.com/test';
const google=(email:string,uid:string)=>({uid,email,iss});
const subjectOf=async(user:string)=>((await db.query('SELECT auth_provider_id a FROM users WHERE id=$1',[user])).rows[0] as any).a;
const pending=(error:any)=>error.statusCode===403&&error.code==='identity_link_pending';

// Before 026: previous behaviour, staff bind by email (deploying code before the migration breaks nobody).
const early=await bindVerifiedIdentity(google('head@example.test','uid-head'));assert.ok(early.subject);
assert.ok(await subjectOf(id(4)));
await db.exec(fs.readFileSync('gcp/sql/026_identity_link_approval.sql','utf8'));

// Bootstrap: the first administrator binds while no administrator is bound.
const admin=await bindVerifiedIdentity(google('admin@example.test','uid-admin'));assert.equal(await subjectOf(id(1)),admin.subject);
// Learners still bind on first sign-in.
await bindVerifiedIdentity(google('learner@example.test','uid-learner'));assert.ok(await subjectOf(id(3)));
// An instructor's first sign-in is held: nothing bound, a pending request is saved (it survives the refusal).
await assert.rejects(()=>bindVerifiedIdentity(google('trainer@example.test','uid-attacker')),pending);
assert.equal(await subjectOf(id(2)),null);
assert.deepEqual((await pendingIdentityLinks()).map((r:any)=>r.email),['trainer@example.test']);
// The API keeps this as a 403 with its code (not a 401 sign-out, not a 503).
const mapped=identityError(Object.assign(Error('Your staff account is waiting for an administrator to confirm this Google sign-in.'),{statusCode:403,code:'identity_link_pending'}),'x') as any;
assert.equal(mapped.statusCode,403);assert.equal(mapped.code,'identity_link_pending');
// The latest sign-in replaces the request: the administrator approves the Google account they confirmed out of band.
await assert.rejects(()=>bindVerifiedIdentity(google('trainer@example.test','uid-trainer')),pending);

// Approval: admin only, reason required, audited; the next sign-in of that Google account binds, another account does not.
const verifiedActors:Record<string,any>={admin:{subject:admin.subject,email:'admin@example.test',firebaseUid:'uid-admin',userId:id(1)},learner:{subject:await subjectOf(id(3)),email:'learner@example.test',firebaseUid:'uid-learner',userId:id(3)}};
configureFirebaseVerifierForTests(async token=>{if(!verifiedActors[token])throw Error('Invalid test token');return verifiedActors[token];});
const approve=(token:string,reason='Confirmed by phone')=>createDatabaseClient('Bearer '+token).rpc('product_approve_identity_link',{p_user:id(2),p_reason:reason});
assert.match(String((await approve('learner')).error?.message),/System administrator required/);
assert.match(String((await approve('admin','x')).error?.message),/Reason must be/);
assert.deepEqual(await approve('admin'),{data:true,error:null});
assert.match(String((await approve('admin')).error?.message),/Request not found/,'approving twice is reported');
await assert.rejects(()=>bindVerifiedIdentity(google('trainer@example.test','uid-attacker')),pending,'a different Google account is still held');
await bindVerifiedIdentity(google('trainer@example.test','uid-attacker')).catch(()=>{});
// The attacker's sign-in reset the request; the trainer's approved sign-in must be approved again (fail closed).
await assert.rejects(()=>bindVerifiedIdentity(google('trainer@example.test','uid-trainer')),pending);
assert.deepEqual(await approve('admin','Confirmed again by phone'),{data:true,error:null});
const trainer=await bindVerifiedIdentity(google('trainer@example.test','uid-trainer'));
assert.equal(await subjectOf(id(2)),trainer.subject);
assert.deepEqual(await pendingIdentityLinks(),[]);
const audit=(await db.query("SELECT actor_id,reason FROM product_audit WHERE action='identity.approve'")).rows as any[];
assert.equal(audit.length,2);assert.ok(audit.every(r=>r.actor_id===id(1)&&r.reason.startsWith('trainer@example.test / instructor / ')));
// Once bound, later sign-ins need nothing.
assert.equal((await bindVerifiedIdentity(google('trainer@example.test','uid-trainer'))).subject,trainer.subject);

// Wiring: server action, governance payload, UI list.
const server=fs.readFileSync('src/services/productionServerService.ts','utf8');
assert.ok(/const cls = await classScope\(c, body\.classId, \[[^\]]*'approveIdentityLink'[^\]]*\]\.includes\(body\.action\)/.test(server),'approveIdentityLink requires class management scope');
assert.ok(server.includes('identityLinks:await pendingIdentityLinks()'));
assert.ok(fs.readFileSync('src/components/rebuild/ProductionGovernanceSource.tsx','utf8').includes('<IdentityLinkRequests requests={data.identityLinks}'));

// Rollback: requests dropped, existing bindings stay.
await db.exec(fs.readFileSync('gcp/sql/rollback/026_identity_link_approval.sql','utf8'));
assert.equal(await subjectOf(id(2)),trainer.subject);assert.deepEqual(await pendingIdentityLinks(),[]);
console.log('Identity link approval PASS: staff first sign-in held until audited admin approval (026), learners and first admin unaffected, rollback keeps bindings.');

// TM-006: verified tokens are reused for at most 60 s and never past their own expiry; the cache stays bounded.
{const {rememberVerifiedToken,verifiedTokens,REVOCATION_CACHE_MS}=await import('../src/services/firebaseServerIdentityService');
 const now=1_000_000_000_000;verifiedTokens.clear();
 rememberVerifiedToken('a',{exp:(now+3600_000)/1000},now);assert.equal(verifiedTokens.get('a')!.until,now+REVOCATION_CACHE_MS);
 rememberVerifiedToken('b',{exp:(now+10_000)/1000},now);assert.equal(verifiedTokens.get('b')!.until,now+10_000,'token expiry wins');
 rememberVerifiedToken('c',{},now);assert.equal(verifiedTokens.get('c')!.until,now,'no expiry claim: not reusable');
 for(let i=0;i<6000;i++)rememberVerifiedToken('t'+i,{exp:(now+3600_000)/1000},now);assert.ok(verifiedTokens.size<=5000);
 verifiedTokens.clear();console.log('Revocation cache PASS: 60 s cap, token expiry respected, bounded size.');}
