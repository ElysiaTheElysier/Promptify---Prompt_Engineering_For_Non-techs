import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';
import {createRebuildRunService} from '../src/services/rebuildRunService';
import {AiServerError} from '../src/services/apiServerService';
import {generationTokenSha,type GenerationTask} from '../src/services/generationQueueService';
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql','012_judge_jobs.sql','014_generation_jobs.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();let connectionsInUse=0;
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;connectionsInUse++;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release(){connectionsInUse--;release();}};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000003`;
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Learner','learner',$2,now()),($3,'peer@example.test','Peer','learner',$4,now())",[id(1),id(2),id(20),id(21)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2),($3,$4)',[id(3),id(1),id(22),id(20)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-A',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2),($3,$2)',[id(3),id(6),id(22)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(9),id(8)]);


await db.query("INSERT INTO rebuild_sop_documents(id,class_id,title,created_by) VALUES($1,$2,'Approved SOP',$3)",[id(70),id(6),id(1)]);
await db.query("INSERT INTO rebuild_sop_versions(id,document_id,version,content,created_by) VALUES($1,$2,1,'Immutable canonical SOP',$3)",[id(71),id(70),id(1)]);
await db.query('INSERT INTO rebuild_sop_bindings(class_id,lesson_id,document_id,version_id) VALUES($1,$2,$3,$4)',[id(6),id(9),id(70),id(71)]);
// Offline substitute for the existing vector function: verifies wrapper passes the real frozen actor scope.
await db.exec(`CREATE FUNCTION public.intrepid_search_sop(p_class uuid,p_lesson uuid,p_versions uuid[],p_vector jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
 IF auth.uid()<>'${id(2)}'::uuid OR p_class<>'${id(6)}'::uuid OR p_lesson<>'${id(9)}'::uuid THEN RAISE EXCEPTION 'Wrong retrieval actor'; END IF;
 RETURN jsonb_build_array(jsonb_build_object('version_id','${id(71)}','position',1,'page',2,'content','Retrieved canonical chunk','citation','[SOP:${id(71)}:v1] [Page 2]','title','Approved SOP'));
END $$;`);
const server=createDatabaseClient(),tasks:GenerationTask[]=[];let ragCalls=0,providerCalls=0,failProvider=false,failRag=false,revokeDuringRag=false,closeDuringRag=false,slowRag=false,clock=Date.now();let lastDeadline=0;
const sources=[{version_id:id(71),version:1,title:'Approved SOP',citation:`[SOP:${id(71)}:v1]`,content:'Immutable canonical SOP'}];
const resolve=async()=>({reader:server,server,subject:id(2),lesson:{status:'published',base_input_context:'Base approved task',sample_input_context:'Base approved task\nImmutable canonical SOP',lesson_resources:[{position:1,content:'Lesson resource'}],rebuild_sop_versions:sources,prompt_variables:[]}});
const body=(n:number)=>({classId:id(6),lessonId:id(9),requestId:id(n),prompt:'Summarize approved SOP.'});
const snapshot=async(n:number)=>(await db.query('SELECT snapshot FROM rebuild_runs WHERE subject=$1 AND request_id=$2',[id(2),id(n)])).rows[0].snapshot as any;
let currentRequest=80;
const fakeRag=async(reader:any,classId:string,lessonId:string,prompt:string,admitted:string[])=>{
 ragCalls++;if(slowRag){clock=Date.now()+60000;slowRag=false;}assert.equal(connectionsInUse,0,'retrieval embedding runs outside SQL transactions');assert.deepEqual(admitted,[id(71)]);
 assert.equal((await reader.rpc('rebuild_class_sops',{p_class:id(99),p_lesson:lessonId})).error.message,'Generation retrieval scope denied');
 assert.ok((await reader.rpc('intrepid_search_sop',{p_class:classId,p_lesson:lessonId,p_versions:[id(99)],p_vector:[1]})).error,'extra versions denied');
 if(revokeDuringRag)await db.query('DELETE FROM rebuild_sop_bindings WHERE version_id=$1',[id(71)]);
 if(closeDuringRag)await db.query('INSERT INTO product_studio(class_id,lesson_id,config,updated_by) VALUES($1,$2,$3,$4)',[id(6),id(9),JSON.stringify({state:'ACTIVE',pillar:'',branch:'',competencies:'',startTime:'',endTime:'2000-01-01T00:00:00Z',departments:[],objectives:[],variables:[],scaffold:[],materials:[],awards:{}}),id(1)]);
 if(failRag)throw Error('Offline embedding unavailable');
 const found=await reader.rpc('intrepid_search_sop',{p_class:classId,p_lesson:lessonId,p_versions:admitted,p_vector:[1]});assert.ifError(found.error);
 const chunks=found.data.map((r:any)=>({versionId:r.version_id,position:r.position,page:r.page,content:r.content,citation:r.citation,title:r.title}));
 return {query:prompt,chunks,context:chunks.map((c:any)=>`${c.citation} ${c.title}\n${c.content}`).join('\n\n')};
};
const generate=async(input:any,deadline:number)=>{
 lastDeadline=deadline;
 providerCalls++;assert.equal(connectionsInUse,0);
 const frozen=await snapshot(currentRequest);assert.equal(frozen.generation_rag_frozen,true,'retrieval snapshot committed before Gemini');
 assert.equal(frozen.actual_generation_context,input.inputContext);
 assert.equal(frozen.actual_generation_context_hash,createHash('sha256').update(input.inputContext).digest('hex'));
 assert.ok(input.inputContext.includes('Lesson resource'));assert.ok(!frozen.rag_chunks?.some((c:any)=>Object.hasOwn(c,'content')),'metadata references omit chunk text');
 if(failProvider)throw new AiServerError('Offline capacity rejection',429);
 return {output:'Offline RAG output',model:'gemini-3.8-flash',latencyMs:10};
};
const service=createRebuildRunService(resolve as any,generate as any,undefined,{pgvector:fakeRag,bigquery:async(reader:any,_server:any,...args:any[])=>fakeRag(reader,...args as [string,string,string,string[]])} as any,()=>clock,{workerServer:()=>server,generationQueue:async task=>{tasks.push(task);}});
process.env.GCP_VECTOR_MODE='pgvector';
await service.generateSavedRun('learner',body(80),true);assert.equal(ragCalls,0,'API enqueue never calls embedding/RAG');assert.equal(providerCalls,0);
const t80=tasks.at(-1)!;failProvider=true;assert.equal((await service.runGenerationJob(t80.token,id(2),id(80))).status,'retry_wait');
assert.equal(ragCalls,1);const first=await snapshot(80);assert.equal(first.rag_status,'pgvector');assert.ok(first.actual_generation_context.includes('[Page 2]'));
failProvider=false;assert.equal((await service.runGenerationJob(t80.token,id(2),id(80))).status,'generated');assert.equal(ragCalls,1,'provider retry reuses frozen retrieval evidence');assert.equal(providerCalls,2);

// Embedding failures preserve the same authorized canonical fallback; BigQuery uses the same leased reader.
process.env.GCP_VECTOR_MODE='bigquery';currentRequest=81;failRag=true;
await service.generateSavedRun('learner',body(81),true);const t81=tasks.at(-1)!;assert.equal(ragCalls,1);
assert.equal((await service.runGenerationJob(t81.token,id(2),id(81))).status,'generated');
const fallback=await snapshot(81);assert.equal(fallback.rag_status,'fallback-canonical');assert.ok(fallback.actual_generation_context.includes('Immutable canonical SOP'));

// A slow retrieval consumes the same worker lease budget; reserve 15 seconds for fenced persistence.
process.env.GCP_VECTOR_MODE='pgvector';currentRequest=85;failRag=false;slowRag=true;
await service.generateSavedRun('learner',body(85),true);const t85=tasks.at(-1)!;
assert.equal((await service.runGenerationJob(t85.token,id(2),id(85))).status,'generated');
assert.ok(lastDeadline>0&&lastDeadline<=215000,'60s retrieval reduces Gemini deadline to at most 215s');clock=Date.now();
slowRag=false;closeDuringRag=true;currentRequest=86;
await service.generateSavedRun('learner',body(86),true);const t86=tasks.at(-1)!,beforeClosure=providerCalls;
assert.equal((await service.runGenerationJob(t86.token,id(2),id(86))).status,'failed');assert.equal(providerCalls,beforeClosure,'Codelab closed during retrieval cannot call Gemini');
closeDuringRag=false;await db.query('DELETE FROM product_studio WHERE class_id=$1',[id(6)]);

// Only a live fence can obtain actor context; freezing cannot alter rubric/settings or overwrite evidence.
await service.generateSavedRun('learner',body(84),true);const t84=tasks.at(-1)!,fence84=crypto.randomUUID();
const leased84=await server.rpc('product_lease_generation',{p_subject:id(2),p_request:id(84),p_token_sha:generationTokenSha(t84.token),p_fence:fence84});assert.equal(leased84.data.status,'leased');
const badFence=await server.rpc('product_generation_retrieve',{p_subject:id(2),p_request:id(84),p_fence:crypto.randomUUID(),p_operation:'sops'});assert.ok(badFence.error);
const evidence84={actual_generation_context:'Approved frozen context',actual_generation_context_hash:createHash('sha256').update('Approved frozen context').digest('hex'),production_rubric:'cannot modify rubric'};
const invalidHash=await server.rpc('product_freeze_generation_context',{p_subject:id(2),p_request:id(84),p_fence:fence84,p_evidence:{...evidence84,actual_generation_context_hash:'0'.repeat(64)}});assert.ok(invalidHash.error);
const frozen84=await server.rpc('product_freeze_generation_context',{p_subject:id(2),p_request:id(84),p_fence:fence84,p_evidence:evidence84});assert.equal(frozen84.data.status,'frozen');assert.equal(frozen84.data.snapshot.production_rubric,undefined);
const frozenAgain=await server.rpc('product_freeze_generation_context',{p_subject:id(2),p_request:id(84),p_fence:fence84,p_evidence:{actual_generation_context:'Replacement context',actual_generation_context_hash:createHash('sha256').update('Replacement context').digest('hex')}});assert.equal(frozenAgain.data.snapshot.actual_generation_context,'Approved frozen context');
await db.query("UPDATE product_generation_jobs SET lease_until=now()-interval '1 second' WHERE request_id=$1",[id(84)]);
assert.ok((await server.rpc('product_generation_retrieve',{p_subject:id(2),p_request:id(84),p_fence:fence84,p_operation:'sops'})).error);
assert.equal((await server.rpc('product_freeze_generation_context',{p_subject:id(2),p_request:id(84),p_fence:fence84,p_evidence:evidence84})).data.status,'stale');

// A revoked binding during retrieval blocks fallback and Gemini; stale fences cannot read/freeze evidence.
process.env.GCP_VECTOR_MODE='pgvector';currentRequest=82;revokeDuringRag=true;
await service.generateSavedRun('learner',body(82),true);const t82=tasks.at(-1)!,before=providerCalls;
assert.equal((await service.runGenerationJob(t82.token,id(2),id(82))).status,'failed');assert.equal(providerCalls,before);
const stale=await server.rpc('product_generation_retrieve',{p_subject:id(2),p_request:id(80),p_fence:crypto.randomUUID(),p_operation:'sops'});assert.ok(stale.error);
const staleFreeze=await server.rpc('product_freeze_generation_context',{p_subject:id(2),p_request:id(80),p_fence:crypto.randomUUID(),p_evidence:first});assert.equal(staleFreeze.data.status,'stale');
const wrongOwner=await server.rpc('product_generation_retrieve',{p_subject:id(21),p_request:id(80),p_fence:crypto.randomUUID(),p_operation:'sops'});assert.ok(wrongOwner.error);
await db.close();console.log('PASS worker-only RAG: no API embedding; fenced actor/version scope; frozen citations/hash before Gemini; retry reuses evidence; canonical fallback and mid-retrieval revocation');
