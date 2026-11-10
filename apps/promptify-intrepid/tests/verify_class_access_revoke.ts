import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';

// 023: admin-only, audited revoke of instructor (per course) and Head (per class) access through the real adapter RPC
// path (actor transaction, schema allowlist). Real SQL in PGlite; offline only.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000023`;
const actors:Record<string,any>={admin:{subject:id(21),email:'admin@example.test',firebaseUid:'a',userId:id(20)},trainer:{subject:id(31),email:'trainer@example.test',firebaseUid:'t',userId:id(30)},head:{subject:id(41),email:'head@example.test',firebaseUid:'h',userId:id(40)}};
configureFirebaseVerifierForTests(async token=>{if(!actors[token])throw Error('Invalid test token');return actors[token];});
await db.query(`INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES
 ($1,'admin@example.test','Admin','admin',$2,now()),($3,'trainer@example.test','Trainer','instructor',$4,now()),($5,'head@example.test','Head','head',$6,now())`,[id(20),id(21),id(30),id(31),id(40),id(41)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query(`INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES
 ($1,'CLASS-A',$3,$4,'Offline',now()-interval '1 day',now()+interval '30 day'),($2,'CLASS-B',$3,$4,'Offline',now()-interval '1 day',now()+interval '30 day')`,[id(6),id(7),id(5),id(4)]);
const rpc=(token:string,name:string,args:Record<string,unknown>)=>createDatabaseClient('Bearer '+token).rpc(name,args);
const grant=(email:string,role:string,classId=id(6))=>rpc('admin','product_set_class_access',{p_class:classId,p_email:email,p_role:role,p_permission:'editor'});
const revoke=(token:string,user:string,role:string,reason='Left the programme',classId=id(6))=>rpc(token,'product_revoke_class_access',{p_class:classId,p_user:user,p_role:role,p_reason:reason});
const count=async(sql:string,values:any[])=>((await db.query(sql,values)).rows[0] as any).n as number;
const instructorRows=()=>count('SELECT count(*)::int n FROM course_instructors WHERE course_id=$1 AND user_id=$2',[id(5),id(30)]);
const headRows=(classId:string)=>count('SELECT count(*)::int n FROM product_class_grants WHERE class_id=$1 AND user_id=$2',[classId,id(40)]);

assert.equal((await grant('trainer@example.test','instructor')).error,null);
assert.equal((await grant('head@example.test','head')).error,null);
assert.equal((await grant('head@example.test','head',id(7))).error,null);
// Before 023 the RPC does not exist: the adapter reports an error and nothing changes.
assert.ok((await revoke('admin',id(30),'instructor')).error);
assert.equal(await instructorRows(),1);
await db.exec(fs.readFileSync('gcp/sql/023_revoke_class_access.sql','utf8'));

// Only admins may revoke (a Head or instructor cannot remove anyone, themself included); validation comes first.
assert.match(String((await revoke('trainer',id(30),'instructor')).error?.message),/System administrator required/);
assert.match(String((await revoke('head',id(40),'head')).error?.message),/System administrator required/);
assert.match(String((await revoke('admin',id(30),'owner')).error?.message),/Invalid access role/);
assert.match(String((await revoke('admin',id(30),'instructor','no')).error?.message),/Reason must be/);
assert.equal(await instructorRows(),1);

// Instructor access is per course: one revoke removes it for every cohort of the course. The account stays.
assert.deepEqual(await revoke('admin',id(30),'instructor'),{data:true,error:null});
assert.equal(await instructorRows(),0);
assert.match(String((await revoke('admin',id(30),'instructor')).error?.message),/Access not found/,'a second revoke reports it instead of auditing nothing');
// Head access is per class: revoking class A keeps class B.
assert.equal((await revoke('admin',id(40),'head')).error,null);
assert.equal(await headRows(id(6)),0);assert.equal(await headRows(id(7)),1);
assert.deepEqual((await db.query("SELECT role FROM users WHERE id IN ($1,$2) ORDER BY email",[id(40),id(30)])).rows,[{role:'head'},{role:'instructor'}],'roles unchanged');
const audit=(await db.query("SELECT actor_id,reason FROM product_audit WHERE action='access.revoke' ORDER BY created_at,reason")).rows as any[];
assert.equal(audit.length,2);assert.ok(audit.every(row=>row.actor_id===id(20)));
assert.ok(audit.some(row=>row.reason===`instructor / ${id(30)} / Left the programme`));
assert.ok(audit.some(row=>row.reason===`head / ${id(40)} / Left the programme`));
// Re-granting after a revoke works through the normal Class access path.
assert.equal((await grant('trainer@example.test','instructor')).error,null);assert.equal(await instructorRows(),1);

// Server action wiring: admin-only guard, manage scope, access list in the governance payload, UI list rendered.
const server=fs.readFileSync('src/services/productionServerService.ts','utf8');
assert.ok(/const cls = await classScope\(c, body\.classId, \[[^\]]*'revokeAccess'[^\]]*\]\.includes\(body\.action\)/.test(server),'revokeAccess requires class management scope');
assert.ok(/case 'revokeAccess': \{\r?\n.*\r?\n      if\(c\.profile\.role!=='admin'\)throw new ApiAccessError\('System administrator required\.',403\);/.test(server));
assert.ok(server.includes("access:{instructors:await result(c.server.from('course_instructors')"));
assert.ok(fs.readFileSync('src/components/rebuild/ProductionGovernanceSource.tsx','utf8').includes('<ClassAccessList access={data.access}'));

// Rollback removes only the function; revokes already made stay.
await db.exec(fs.readFileSync('gcp/sql/rollback/023_revoke_class_access.sql','utf8'));
assert.equal(await headRows(id(6)),0);
assert.ok((await revoke('admin',id(40),'head','x-rollback',id(7))).error);
console.log('verify_class_access_revoke: PASS');
