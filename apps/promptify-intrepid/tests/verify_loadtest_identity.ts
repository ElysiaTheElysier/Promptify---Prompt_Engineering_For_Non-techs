import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// Synthetic load-test identity: enabled only for the stub + staging ack + promptify_loadtest database (or tests),
// HMAC-signed short-lived tokens, rejected before any Firebase call everywhere else. Offline only.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';
delete process.env.AI_PROVIDER;delete process.env.LOADTEST_IDENTITY_SECRET;
const {configureSqlPoolForTests}=await import('../src/services/cloudPostgresService');
const {verifyFirebaseIdentity}=await import('../src/services/firebaseServerIdentityService');
const {loadtestIdentityEnabled,mintLoadtestToken,verifyLoadtestToken}=await import('../src/services/loadtestIdentityService');
const db=new PGlite();await db.exec(fs.readFileSync('gcp/sql/001_baseline.sql','utf8'));
let tail=Promise.resolve(),connectedDb='promptify_loadtest';
// PGlite has one database; the connected database name is simulated to exercise the runtime guard.
configureSqlPoolForTests({async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;
  return {async query(sql:string,values:any[]=[]){if(/current_database\(\)/.test(sql))return {rows:[{d:connectedDb}]};const r=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(r.rows))};},release};}});
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES('00000001-0000-4000-8000-000000000001','loadtest-001@loadtest.invalid','LT','learner','00000002-0000-4000-8000-000000000001',now())");
const secret='s'.repeat(40),now=Math.floor(Date.now()/1000);

// 1. Enable rules (pure).
const staging={GOOGLE_CLOUD_PROJECT:'ai-transformation-510302',PROVIDER_STUB_ACK:'staging-load-test-only',AI_PROVIDER:'stub',LOADTEST_IDENTITY_SECRET:secret,PGDATABASE:'promptify_loadtest'};
assert.equal(loadtestIdentityEnabled(staging),true,'dedicated load-test service');
assert.equal(loadtestIdentityEnabled({...staging,PGDATABASE:'promptify_db'}),false,'never against the real staging database');
assert.equal(loadtestIdentityEnabled({...staging,AI_PROVIDER:'vertex'}),false,'never with a real provider');
assert.equal(loadtestIdentityEnabled({...staging,PROVIDER_STUB_ACK:''}),false,'stub acknowledgement required');
assert.equal(loadtestIdentityEnabled({...staging,GOOGLE_CLOUD_PROJECT:'prod-project'}),false,'staging project only');
assert.equal(loadtestIdentityEnabled({...staging,LOADTEST_IDENTITY_SECRET:'short'}),false,'strong secret required');

// 2. Disabled (no secret): an lt1 token is refused without any Firebase call (no network in this test).
const token=mintLoadtestToken(secret,'loadtest-001',now+3600);
await assert.rejects(()=>verifyFirebaseIdentity(token),/Verified Google identity required/);

// 3. Enabled in tests: valid token binds to the seeded synthetic user through the normal identity binding.
process.env.AI_PROVIDER='stub';process.env.LOADTEST_IDENTITY_SECRET=secret;
const actor=await verifyFirebaseIdentity(token);
assert.equal(actor.subject,'00000002-0000-4000-8000-000000000001');assert.equal(actor.email,'loadtest-001@loadtest.invalid');
const bound=(await db.query("SELECT issuer,external_subject FROM gcp_identity_bindings")).rows as any[];
assert.deepEqual(bound,[{issuer:'https://loadtest.promptify.invalid',external_subject:'loadtest-001'}]);
// Unknown synthetic user: verified signature but no roster user -> no subject binding is created.
const stranger=await verifyFirebaseIdentity(mintLoadtestToken(secret,'loadtest-002',now+3600));
assert.equal(stranger.userId,undefined);

// 3b. Runtime guard: even with every env flag set, a synthetic identity never binds inside another database.
connectedDb='promptify_db';
await assert.rejects(()=>verifyFirebaseIdentity(mintLoadtestToken(secret,'loadtest-001',now+3600)),/only valid in the load-test database/);
connectedDb='promptify_loadtest';
// 4. Tampering, wrong uid shape, expiry and over-long lifetime are rejected.
const [p,uid,exp,mac]=token.split('.');
assert.throws(()=>verifyLoadtestToken(`${p}.${uid}.${exp}.${'0'.repeat(64)}`),/Invalid/);
assert.throws(()=>verifyLoadtestToken(`${p}.loadtest-002.${exp}.${mac}`),/Invalid/,'signature bound to uid');
assert.throws(()=>verifyLoadtestToken(`${p}.admin.${exp}.${mac}`),/Invalid/);
assert.throws(()=>verifyLoadtestToken(mintLoadtestToken(secret,'loadtest-001',now-1)),/Expired/);
assert.throws(()=>verifyLoadtestToken(mintLoadtestToken(secret,'loadtest-001',now+4*3600)),/Expired/);
assert.throws(()=>verifyLoadtestToken(mintLoadtestToken('x'.repeat(40),'loadtest-001',now+60)),/Invalid/,'other secret');
assert.throws(()=>mintLoadtestToken(secret,'teacher-1',now+60));
console.log('Load-test identity PASS: enabled only for stub+staging ack+promptify_loadtest, refused before Firebase elsewhere, HMAC/uid/expiry checks, normal identity binding. Offline only.');
process.exit(0);
