import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {createRebuildRunService,judgeStageStore,storedCriteria} from '../src/services/rebuildRunService';
import {createDatabaseClient} from '../src/services/cloudDatabaseService';
import {AiServerError} from '../src/services/apiServerService';
import {evaluateParallel,type JudgeHooks} from '../src/services/parallelJudgeService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
import {type JudgeTask} from '../src/services/judgeQueueService';

// 020 per-stage Judge results on real SQL (001 + 005 + 012 + 015 + 020): async worker persists each stage,
// status/watch expose verdict-gated criteria, a redispatch grades only missing stages. Offline only.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
process.env.JUDGE_FENCING_MODE='sql';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql','012_judge_jobs.sql','015_judge_dispatch_fencing.sql','020_judge_stage_results.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000004`;
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Learner','learner',$2,now())",[id(1),id(2)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[id(3),id(1)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-S',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[id(3),id(6)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(9),id(8)]);
for(const n of [30,31,32]){
  await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output) VALUES($1,$2,$3,'L1',$4,$5,'Task prompt','Saved output')",[id(n),id(3),id(6),id(9),n]);
  await db.query("INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id) VALUES($1,$2,$3,$4,'Task prompt','{}',$5)",[id(2),id(n),id(6),id(9),id(n)]);
}
const server=createDatabaseClient();
const actor={subject:id(2),reader:server,server,lesson:{}};
const body=(n:number)=>({classId:id(6),lessonId:id(9),attemptId:id(n)});

// 1. Schema: service-only, bounded, idempotent upsert by (attempt, stage).
{
  const grants=(await db.query("SELECT grantee,privilege_type FROM information_schema.role_table_grants WHERE table_name='product_judge_stage_results'")).rows as any[];
  assert.ok(grants.every(g=>g.grantee!=='anon'&&g.grantee!=='authenticated'),'learners cannot read provisional rows directly');
  assert.equal(((await db.query("SELECT relrowsecurity r FROM pg_class WHERE relname='product_judge_stage_results'")).rows[0] as any).r,true);
  const store=judgeStageStore(server,id(32));
  await store.save('supervisor','a'.repeat(64),{taskAttempt:true},{taskAttempt:true});
  await store.save('supervisor','b'.repeat(64),{taskAttempt:false},{taskAttempt:false});
  assert.deepEqual(await store.load(),{supervisor:{sha:'b'.repeat(64),result:{taskAttempt:false}}},'upsert replaces the row for a new payload');
  await assert.rejects(store.save('Bad Stage','c'.repeat(64),{},{}),'stage names are constrained');
  await assert.rejects(store.save('criterion:format','short',{},{}),'hash is constrained');
  await assert.rejects(store.save('criterion:format','c'.repeat(64),{big:'x'.repeat(20000)},{}),'payload size is bounded');
  // Verdict gate: no criteria before a positive verdict.
  await store.save('criterion:format','d'.repeat(64),{key:'format'},{key:'format',score:2,max:2,reasonEn:'Ok.',reasonVi:'Ổn.'});
  assert.deepEqual(await storedCriteria(server,id(32)),[],'negative verdict hides criteria');
  await db.query("DELETE FROM product_judge_stage_results WHERE attempt_id=$1 AND stage='supervisor'",[id(32)]);
  assert.deepEqual(await storedCriteria(server,id(32)),[],'missing verdict hides criteria');
  await store.save('supervisor','a'.repeat(64),{taskAttempt:true},{taskAttempt:true});
  assert.deepEqual((await storedCriteria(server,id(32))).map(r=>r.key),['format']);
}

// 2. Async worker with the real parallel-v1 engine: dispatch 1 stores finished stages and fails one,
//    status shows them while retrying, dispatch 2 grades only the missing stage and saves one score.
{
  const reply=(value:unknown)=>({output:JSON.stringify(value),model:'gemini-3.8-flash',tokens:1});
  const calls:string[]=[];let failFormat=true;
  const call=async(payload:any)=>{
    const input=JSON.parse(payload.contents[0].parts[0].text),stage=input.criterion?'criterion:'+input.criterion.key:input.stage;calls.push(stage);
    if(stage==='supervisor')return reply({taskAttempt:true,summaryEn:'Task.',summaryVi:'Bài.'});
    if(stage==='criterion:format'&&failFormat)throw new AiServerError('capacity',429);
    return reply({key:input.criterion.key,score:input.criterion.maxScore,reasonEn:'Supported.',reasonVi:'Có căn cứ.',improvementEn:'Keep.',improvementVi:'Giữ.'});
  };
  const evaluate=(input:any,deadline?:number,hooks?:JudgeHooks)=>evaluateParallel({...input,taskRequirement:input.taskRequirement||'Task',learnerPrompt:input.learnerPrompt||'Task prompt',generatedOutput:input.generatedOutput||'Saved output'},DEFAULT_RUBRIC,call,deadline,'parallel-v1',hooks);
  const tasks:JudgeTask[]=[];let clock=Date.now();
  const service=createRebuildRunService(async()=>actor as any,undefined,evaluate,undefined,()=>clock,{queue:async t=>{tasks.push(t);},identify:async()=>actor as any,workerServer:()=>server});
  const warn=console.warn;console.warn=()=>{};
  try{
    assert.deepEqual(await service.enqueueJudge('learner',body(30)),{async:true,status:'queued'});
    assert.deepEqual(await service.runJudgeJob(tasks[0].token,id(30)),{http:503,status:'retry_wait'});
  }finally{console.warn=warn;}
  assert.equal(calls.filter(s=>s==='criterion:format').length,2,'stage-only retry, then the job waits for the queue');
  const waiting:any=await service.judgeStatus('learner',body(30));
  assert.equal(waiting.status,'retry_wait');
  assert.deepEqual(waiting.criteria.map((r:any)=>r.key).sort(),['actionability','groundedness','oneshot','persona'],'refresh shows finished criteria');
  // Reconnect: the watcher replays stored rows once and follows the job to its saved grade.
  const seen:string[]=[],statuses:string[]=[];
  failFormat=false;calls.length=0;
  const watching=service.watchJudge('learner',body(30),{onCriterion:r=>seen.push(r.key),onStatus:s=>statuses.push(s),sleep:async()=>{if(!calls.length){clock+=1000;await service.runJudgeJob(tasks[0].token,id(30));}}});
  const final:any=await watching;
  assert.equal(final.status,'succeeded');assert.equal(final.evaluation.total,10);
  assert.deepEqual(calls,['criterion:format'],'redispatch grades only the missing criterion');
  assert.deepEqual(seen.slice(0,4).sort(),['actionability','groundedness','oneshot','persona']);assert.equal(new Set(seen).size,seen.length,'no duplicate rows');
  assert.deepEqual(statuses,['retry_wait','succeeded']);
  assert.equal(((await db.query('SELECT count(*)::int n FROM prompt_attempts WHERE id=$1 AND evaluation_json IS NOT NULL',[id(30)])).rows[0] as any).n,1,'one saved score');
  assert.equal((await service.judgeStatus('learner',body(30)) as any).criteria,undefined,'finished jobs return the saved grade only');
  // A watch window ends with 'watching' so the client keeps polling instead of waiting forever.
  await service.enqueueJudge('learner',body(31));
  let ticks=0;
  const windowed:any=await service.watchJudge('learner',body(31),{onCriterion:()=>{},maxMs:2000,sleep:async()=>{ticks++;clock+=1000;}});
  assert.equal(windowed.status,'watching');assert.ok(ticks>=2);
}

// 3. Rollback 020 leaves grades intact and the service degrades to "no stored stages".
await db.exec(fs.readFileSync('gcp/sql/rollback/020_judge_stage_results.sql','utf8'));
assert.equal(((await db.query("SELECT count(*)::int n FROM prompt_attempts WHERE evaluation_json IS NOT NULL")).rows[0] as any).n,1);
assert.deepEqual(await storedCriteria(server,id(30)),[]);
await assert.rejects(judgeStageStore(server,id(30)).load());
console.log('Judge stage results PASS: 020 service-only bounded rows, verdict gate, worker persist + stage-only redispatch, watcher replay/terminal/window, rollback. Offline only.');
