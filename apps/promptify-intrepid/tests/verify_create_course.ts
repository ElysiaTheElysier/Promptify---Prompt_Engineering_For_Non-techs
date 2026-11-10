import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';

// 027: admin creates a course with its first class (existing or new client), audited; a lesson can then be added. Offline.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;
  return {async query(sql:string,values:any[]=[]){const r=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(r.rows))};},release};}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000027`;
const actors:Record<string,any>={admin:{subject:id(21),email:'admin@example.test',firebaseUid:'a',userId:id(20)},trainer:{subject:id(31),email:'trainer@example.test',firebaseUid:'t',userId:id(30)}};
configureFirebaseVerifierForTests(async token=>{if(!actors[token])throw Error('Invalid test token');return actors[token];});
await db.query(`INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'admin@example.test','Admin','admin',$2,now()),($3,'trainer@example.test','Trainer','instructor',$4,now())`,[id(20),id(21),id(30),id(31)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Northstar','Testing')",[id(4)]);
const create=(token:string,args:Record<string,unknown>)=>createDatabaseClient('Bearer '+token).rpc('product_create_course',{p_client:null,p_client_name:null,p_title:'Prompting for Care',p_code:'CC-2611',p_department:'Customer Care',p_start:'2026-11-10T00:00:00Z',p_end:'2026-12-10T00:00:00Z',...args});
const count=async(table:string)=>((await db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0] as any).n as number;

assert.ok((await create('admin',{p_client:id(4)})).error,'before 027 the RPC is not available');
await db.exec(fs.readFileSync('gcp/sql/027_create_course.sql','utf8'));

// Validation and admin-only, before anything is written.
assert.match(String((await create('trainer',{p_client:id(4)})).error?.message),/System administrator required/);
assert.match(String((await create('admin',{p_client:id(4),p_title:'x'})).error?.message),/Course title must be/);
assert.match(String((await create('admin',{p_client:id(4),p_end:'2026-11-01T00:00:00Z'})).error?.message),/Invalid schedule/);
assert.match(String((await create('admin',{})).error?.message),/Choose an existing client/);
assert.match(String((await create('admin',{p_client:id(4),p_client_name:'Both'})).error?.message),/Choose an existing client/);
assert.match(String((await create('admin',{p_client:id(9)})).error?.message),/Client not found/);
assert.equal(await count('courses'),0);assert.equal(await count('classes'),0);assert.equal(await count('clients'),1);

// Existing client: published active course, first class upcoming, audited.
const first=await create('admin',{p_client:id(4)});assert.equal(first.error,null);
const cls=(await db.query('SELECT c.class_code,c.status,c.department,c.client_id,co.title,co.status cs,co.publication_status ps,co.created_by FROM classes c JOIN courses co ON co.id=c.course_id WHERE c.id=$1',[first.data])).rows[0] as any;
assert.deepEqual({...cls},{class_code:'CC-2611',status:'upcoming',department:'Customer Care',client_id:id(4),title:'Prompting for Care',cs:'active',ps:'published',created_by:id(20)});
assert.match(String((await create('admin',{p_client:id(4)})).error?.message),/Class code already exists/);
// New client in the same call.
const second=await create('admin',{p_client_name:'Acme Logistics',p_code:'ACME-01',p_title:'Prompting for Ops'});assert.equal(second.error,null);
assert.equal(((await db.query('SELECT cl.name FROM classes c JOIN clients cl ON cl.id=c.client_id WHERE c.id=$1',[second.data])).rows[0] as any).name,'Acme Logistics');
const audit=(await db.query("SELECT class_id,reason FROM product_audit WHERE action='course.create' ORDER BY reason")).rows as any[];
assert.deepEqual(audit.map(r=>r.reason),['Prompting for Care / Northstar','Prompting for Ops / Acme Logistics (new client)']);
// The empty course accepts its first lesson through the existing Studio RPC (module created on first use).
const lesson=await createDatabaseClient('Bearer admin').rpc('product_create_lesson',{p_class:first.data,p_title:'Lab 1',p_key:'CC-01'});
assert.equal(lesson.error,null);assert.equal(await count('course_modules'),1);

// Server and UI wiring.
const server=fs.readFileSync('src/services/productionServerService.ts','utf8');
assert.ok(/if\(body\.action==='createCourse'\)\{[\s\S]{0,200}if\(c\.profile\.role!=='admin'\)throw new ApiAccessError\('System administrator required\.',403\);/.test(server));
assert.ok(fs.readFileSync('src/components/rebuild/ProductionGovernanceSource.tsx','utf8').includes('<CreateCourseForm snapshot={snapshot}'));

await db.exec(fs.readFileSync('gcp/sql/rollback/027_create_course.sql','utf8'));
assert.equal(await count('courses'),2,'rollback keeps created courses');
console.log('Create course PASS: admin-only, validated, existing or new client, published course + upcoming first class, audited, lesson can be added, rollback keeps data.');
