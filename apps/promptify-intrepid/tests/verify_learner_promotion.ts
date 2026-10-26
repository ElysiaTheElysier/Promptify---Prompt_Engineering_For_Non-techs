import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';

// 019: admin-only, audited learner -> facilitator promotion through the real adapter RPC path (actor transaction,
// schema allowlist, privilege-escalation trigger). Real SQL in PGlite; offline only.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000019`;
const actors:Record<string,any>={admin:{subject:id(21),email:'admin@example.test',firebaseUid:'a',userId:id(20)},learner:{subject:id(2),email:'duc@example.test',firebaseUid:'l',userId:id(1)},trainer:{subject:id(31),email:'trainer@example.test',firebaseUid:'t',userId:id(30)}};
configureFirebaseVerifierForTests(async token=>{if(!actors[token])throw Error('Invalid test token');return actors[token];});
await db.query(`INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES
 ($1,'duc@example.test','Duc','learner',$2,now()),($3,'admin@example.test','Admin','admin',$4,now()),($5,'trainer@example.test','Trainer','instructor',$6,now()),($7,'head@example.test','Head','head',$8,now())`,[id(1),id(2),id(20),id(21),id(30),id(31),id(40),id(41)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(3),id(1)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-A',$2,$3,'Offline',now()-interval '1 day',now()+interval '30 day')",[id(6),id(5),id(4)]);
await db.query("INSERT INTO enrollments(learner_id,class_id,status) VALUES($1,$2,'active')",[id(3),id(6)]);
const call=(token:string,email:string,permission='editor',reason='QA facilitator for workshop')=>createDatabaseClient('Bearer '+token).rpc('product_promote_learner_to_instructor',{p_class:id(6),p_email:email,p_permission:permission,p_reason:reason});
const role=async(email:string)=>((await db.query('SELECT role FROM users WHERE email=$1',[email])).rows[0] as any).role;

// Before 019 the RPC does not exist: the adapter reports an error instead of changing anything.
assert.ok((await call('admin','duc@example.test')).error);
// Without 019 a direct role change by a non-instructor is still blocked by the escalation trigger.
await assert.rejects(()=>db.exec("UPDATE users SET role='instructor' WHERE email='duc@example.test'"),/Privilege escalation denied/);
await db.exec(fs.readFileSync('gcp/sql/019_promote_learner_to_instructor.sql','utf8'));

// Only admins may promote; validation happens before any change.
assert.match(String((await call('trainer','duc@example.test')).error?.message),/System administrator required/);
assert.match(String((await call('learner','duc@example.test')).error?.message),/System administrator required/,'a learner cannot promote themself');
assert.match(String((await call('admin','duc@example.test','superuser')).error?.message),/Invalid permission/);
assert.match(String((await call('admin','duc@example.test','editor','no')).error?.message),/Reason must be/);
assert.match(String((await call('admin','nobody@example.test')).error?.message),/User not found/);
assert.match(String((await call('admin','head@example.test')).error?.message),/Only a learner can be promoted \(current role: head\)/);
assert.match(String((await call('admin','trainer@example.test')).error?.message),/current role: instructor/);
assert.equal(await role('duc@example.test'),'learner');

// Admin promotion: role, course access and audit change together; learner history is kept.
const promoted=await call('admin',' Duc@Example.test ');
assert.equal(promoted.error,null);assert.equal(promoted.data,id(1));
assert.equal(await role('duc@example.test'),'instructor');
assert.deepEqual((await db.query('SELECT permission FROM course_instructors WHERE course_id=$1 AND user_id=$2',[id(5),id(1)])).rows,[{permission:'editor'}]);
const audit=(await db.query("SELECT actor_id,reason FROM product_audit WHERE action='role.promote'")).rows as any[];
assert.equal(audit.length,1);assert.equal(audit[0].actor_id,id(20));assert.match(audit[0].reason,/^learner->instructor \/ .+ \/ editor \/ QA facilitator for workshop$/);
assert.equal(((await db.query('SELECT count(*)::int n FROM enrollments WHERE learner_id=$1',[id(3)])).rows[0] as any).n,1,'learner history kept');
// Idempotent in effect: a second promotion is refused (no longer a learner), nothing else changes.
assert.match(String((await call('admin','duc@example.test','owner')).error?.message),/current role: instructor/);
assert.deepEqual((await db.query('SELECT permission FROM course_instructors WHERE user_id=$1',[id(1)])).rows,[{permission:'editor'}]);

// Server action wiring: admin-only guard, manage scope, and readable error mapping.
const server=fs.readFileSync('src/services/productionServerService.ts','utf8');
assert.ok(server.includes("'reviewHintRequest','promoteLearner'].includes(body.action)"),'promoteLearner requires class management scope');
assert.ok(server.includes("case 'promoteLearner':")&&server.includes("if(c.profile.role!=='admin')throw new ApiAccessError('System administrator required.',403);"));
assert.ok(fs.readFileSync('src/components/rebuild/ProductionApp.tsx','utf8').includes('<PromoteLearnerForm snapshot={snapshot} busy={busy} onAction={action}/>'));

// Rollback removes only the function; the promotion stays.
await db.exec(fs.readFileSync('gcp/sql/rollback/019_promote_learner_to_instructor.sql','utf8'));
assert.equal(await role('duc@example.test'),'instructor');
console.log('verify_learner_promotion: PASS');
