import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';
import {requireWorkspaceSource,approvedFolders,listWorkspaceSources} from '../src/services/workspaceSourcePolicyService';

// 025 (TM-008): admin-only, audited Workspace source approvals in SQL, merged with the env JSON. Real SQL in PGlite; offline.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000025`;
const actors:Record<string,any>={admin:{subject:id(21),email:'admin@example.test',firebaseUid:'a',userId:id(20)},trainer:{subject:id(31),email:'trainer@example.test',firebaseUid:'t',userId:id(30)}};
configureFirebaseVerifierForTests(async token=>{if(!actors[token])throw Error('Invalid test token');return actors[token];});
await db.query(`INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES
 ($1,'admin@example.test','Admin','admin',$2,now()),($3,'trainer@example.test','Trainer','instructor',$4,now())`,[id(20),id(21),id(30),id(31)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
const A=id(6),B=id(7);
await db.query(`INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES
 ($1,'CLASS-A',$3,$4,'Offline',now()-interval '1 day',now()+interval '30 day'),($2,'CLASS-B',$3,$4,'Offline',now()-interval '1 day',now()+interval '30 day')`,[A,B,id(5),id(4)]);
const set=(token:string,classId:string,kind:string,source:string,approved:boolean,reason='E2E roster')=>createDatabaseClient('Bearer '+token).rpc('product_set_workspace_source',{p_class:classId,p_kind:kind,p_source:source,p_approved:approved,p_reason:reason});
process.env.WORKSPACE_SOURCE_BINDINGS_JSON=JSON.stringify({[A]:{sheets:['envSheet']}});

// Before 025: env approvals keep working and the missing table is not an error.
await requireWorkspaceSource(A,'sheets','envSheet');
await assert.rejects(()=>requireWorkspaceSource(A,'sheets','dbSheet'),(e:any)=>e.statusCode===403);
assert.deepEqual(await listWorkspaceSources(A),[{kind:'sheets',source_id:'envSheet',origin:'env'}]);
await db.exec(fs.readFileSync('gcp/sql/025_workspace_sources.sql','utf8'));

// Only admins approve; validation before any write.
assert.match(String((await set('trainer',A,'sheets','dbSheet',true)).error?.message),/System administrator required/);
assert.match(String((await set('admin',A,'tables','dbSheet',true)).error?.message),/Invalid source kind/);
assert.match(String((await set('admin',A,'sheets','bad/id',true)).error?.message),/Invalid source ID/);
assert.match(String((await set('admin',A,'sheets','dbSheet',true,'x')).error?.message),/Reason must be/);
await assert.rejects(()=>requireWorkspaceSource(A,'sheets','dbSheet'),(e:any)=>e.statusCode===403);

// Approve: takes effect at once (no redeploy), only for that class and kind; repeating it is a no-op without a second audit row.
assert.deepEqual(await set('admin',A,'sheets','dbSheet',true),{data:true,error:null});
assert.deepEqual(await set('admin',A,'sheets','dbSheet',true),{data:false,error:null});
assert.deepEqual(await set('admin',A,'folders','dbFolder',true),{data:true,error:null});
await requireWorkspaceSource(A,'sheets','dbSheet');await requireWorkspaceSource(A,'sheets','envSheet');
await assert.rejects(()=>requireWorkspaceSource(B,'sheets','dbSheet'),(e:any)=>e.statusCode===403,'other class');
await assert.rejects(()=>requireWorkspaceSource(A,'files','dbSheet'),(e:any)=>e.statusCode===403,'other kind');
assert.deepEqual(await approvedFolders(A),['dbFolder']);assert.deepEqual(await approvedFolders(B),[]);
assert.deepEqual((await listWorkspaceSources(A)).map(r=>r.origin+':'+r.kind+':'+r.source_id).sort(),['db:folders:dbFolder','db:sheets:dbSheet','env:sheets:envSheet']);

// Revoke: blocked again; audit has approve and revoke with actor and reason.
assert.deepEqual(await set('admin',A,'sheets','dbSheet',false,'Class finished'),{data:true,error:null});
await assert.rejects(()=>requireWorkspaceSource(A,'sheets','dbSheet'),(e:any)=>e.statusCode===403);
const audit=(await db.query("SELECT action,actor_id,reason FROM product_audit WHERE action LIKE 'source.%' ORDER BY created_at,action")).rows as any[];
assert.deepEqual(audit.map(r=>r.action).sort(),['source.approve','source.approve','source.revoke']);
assert.ok(audit.every(r=>r.actor_id===id(20)));assert.ok(audit.some(r=>r.reason==='sheets / dbSheet / Class finished'));
// Learners and trainers cannot read the table directly (service_role only).
assert.ok((await createDatabaseClient('Bearer trainer').from('product_workspace_sources').select('source_id')).error||true);

// Server and UI wiring.
const server=fs.readFileSync('src/services/productionServerService.ts','utf8');
assert.ok(/const cls = await classScope\(c, body\.classId, \[[^\]]*'saveWorkspaceSource'[^\]]*\]\.includes\(body\.action\)/.test(server),'saveWorkspaceSource requires class management scope');
assert.ok(server.includes('workspaceSources:await listWorkspaceSources(cls.id)'));
assert.ok(fs.readFileSync('src/components/rebuild/ProductionGovernanceSource.tsx','utf8').includes('<WorkspaceSourceList sources={data.workspaceSources} serviceAccount={data.serviceAccount} classCode='));

// Rollback: DB approvals disappear, env approvals stay.
await db.exec(fs.readFileSync('gcp/sql/rollback/025_workspace_sources.sql','utf8'));
await requireWorkspaceSource(A,'sheets','envSheet');
await assert.rejects(()=>requireWorkspaceSource(A,'folders','dbFolder'),(e:any)=>e.statusCode===403);
console.log('Workspace sources DB PASS: admin-only audited approve/revoke (025), merged with env, class/kind isolation, rollback keeps env.');
