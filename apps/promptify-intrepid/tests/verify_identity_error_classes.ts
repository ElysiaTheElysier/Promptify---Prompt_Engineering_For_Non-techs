import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// Identity failures are classified, still fail closed: a definitive rejection is 401, an unavailable identity or
// database dependency is 503, and only a verified email missing from the roster carries code not_on_roster.
// Uses the synthetic load-test identity so the real binding code runs offline (no Firebase call).
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';
process.env.AI_PROVIDER='stub';process.env.LOADTEST_IDENTITY_SECRET='s'.repeat(40);
const {configureSqlPoolForTests}=await import('../src/services/cloudPostgresService');
const {verifyFirebaseIdentity,isIdentityRejection}=await import('../src/services/firebaseServerIdentityService');
const {mintLoadtestToken}=await import('../src/services/loadtestIdentityService');
const {identityError}=await import('../src/services/apiAuthorizationService');
const {default:product}=await import('../api/product');
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve(),databaseDown=false;
configureSqlPoolForTests({async connect(){
  if(databaseDown)throw Error('timeout exceeded when trying to connect');
  const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;
  return {async query(sql:string,values:any[]=[]){if(/current_database\(\)/.test(sql))return {rows:[{d:'promptify_loadtest'}]};const r=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(r.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
await db.query("INSERT INTO users(id,email,full_name,role,profile_confirmed_at) VALUES($1,'loadtest-001@loadtest.invalid','LT','instructor',now())",[id(1)]);
const secret='s'.repeat(40),exp=Math.floor(Date.now()/1000)+3600;
const known=mintLoadtestToken(secret,'loadtest-001',exp),stranger=mintLoadtestToken(secret,'loadtest-002',exp);
async function call(token:string){
  let status=0,body:any;const res={setHeader(){},status(code:number){status=code;return res;},json(value:unknown){body=value;return res;}};
  await product({method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({action:'snapshot'})},res);
  return {status,body};
}

// 1. The helper: no error or a marked rejection is 401; anything else is a 503 that never reveals the cause.
assert.equal(identityError(undefined,'Sign in').statusCode,401);
const outage=identityError(Error('timeout exceeded when trying to connect'),'Sign in');
assert.equal(outage.statusCode,503);assert.doesNotMatch(outage.message,/timeout/);

// 2. Definitive rejections are marked: tampered token, wrong database guard.
const tampered=known.slice(0,-1)+(known.endsWith('0')?'1':'0');
await assert.rejects(()=>verifyFirebaseIdentity(tampered),(error:unknown)=>isIdentityRejection(error));
assert.equal((await call(tampered)).status,401,'tampered token is 401');

// 3. An unavailable database during identity binding is transient: 503, not 401 and not "not on roster".
databaseDown=true;
await assert.rejects(()=>verifyFirebaseIdentity(mintLoadtestToken(secret,'loadtest-001',exp-1)),(error:unknown)=>!isIdentityRejection(error));
const down=await call(mintLoadtestToken(secret,'loadtest-001',exp-2));
assert.equal(down.status,503,'database outage during sign-in is 503');assert.equal(down.body.code,undefined);
databaseDown=false;

// 4. First binding of a roster user writes one audit log line without email or token; a repeat writes none.
const logs:string[]=[];const log=console.log;console.log=(line:unknown)=>{logs.push(String(line));};
const first=await call(known);const again=await call(known);
console.log=log;
assert.equal(first.status,200,'roster user signs in');assert.equal(again.status,200);
const audits=logs.filter(line=>line.includes('identity_binding_created'));
assert.equal(audits.length,1,'one audit line for the first binding only');
const audit=JSON.parse(audits[0]);
assert.deepEqual({userId:audit.userId,role:audit.role,reusedSubject:audit.reusedSubject},{userId:id(1),role:'instructor',reusedSubject:false});
assert.ok(!audits[0].includes('@')&&!audits[0].includes(known),'audit line has no email or token');

// 5. A verified identity whose email is not on the roster: 403 with code not_on_roster (the only roster-screen trigger).
const offRoster=await call(stranger);
assert.equal(offRoster.status,403);assert.equal(offRoster.body.code,'not_on_roster');

await db.close();
console.log('Identity error classes PASS: rejection 401, outage 503 without detail, not_on_roster code only for roster misses, one PII-free binding audit line. Offline only.');
process.exit(0);
