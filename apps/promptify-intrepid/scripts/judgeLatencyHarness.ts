/**
 * OFFLINE load harness for the async AI Judge. Production code end to end — handleJudgeStream (SSE), enqueueJudge,
 * shared watch hub, runJudgeJob, productionEvaluate -> gemini() -> provider admission (optional) -> modelRequest —
 * with only the network replaced by the staging provider stub (AI_PROVIDER=stub) and Firebase/Cloud Tasks modelled.
 * No Gemini, Firebase, Cloud Tasks or Cloud SQL calls.
 *   H_PG_URL=postgres://postgres@127.0.0.1:55433/ node node_modules/tsx/dist/cli.mjs scripts/judgeLatencyHarness.ts <users> <label>
 * Env: H_INSTANCES (API/worker instances, each with its own pg pool H_POOL and its own watch hub), H_SPREAD_MS (clicks
 * spread uniformly; 0 = same instant), H_TASKS_CONC / H_TASKS_RATE (Cloud Tasks queue), H_BACKOFF_MS (queue retry),
 * H_ADMISSION=1 + H_ADMIT_CONC / H_ADMIT_TPM (013 admission), STUB_CAPACITY / STUB_429_RATE / STUB_HANG_RATE / STUB_LATENCY_SCALE,
 * H_FIREBASE_MS, H_TASKS_MS, H_SQL_MS (added per statement). Prints one JSON summary incl. integrity checks.
 * Throughput = completed grades / (last grade saved - first click), in grades per minute.
 */
import fs from 'node:fs';
import {EventEmitter} from 'node:events';
import {AsyncLocalStorage} from 'node:async_hooks';
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';process.env.JUDGE_FENCING_MODE='sql';
process.env.JUDGE_MODE='async';process.env.JUDGE_QUEUE='projects/p/locations/asia-southeast1/queues/judge';process.env.JUDGE_WORKER_URL='https://worker.example.test/';
process.env.GEMINI_MODEL='gemini-3.8-flash';process.env.JUDGE_STRATEGY='parallel-v1';process.env.AI_PROVIDER='stub';delete process.env.GEMINI_FALLBACK_MODEL;
const pg=(await import('pg')).default;
const {configureSqlPoolForTests,sqlTransaction}=await import('../src/services/cloudPostgresService');
const {configureFirebaseVerifierForTests}=await import('../src/services/firebaseServerIdentityService');
const {createRebuildRunService}=await import('../src/services/rebuildRunService');
const {handleJudgeStream}=await import('../src/services/judgeStreamService');
const {assertAiLessonAccess}=await import('../src/services/apiAuthorizationService');
const {DEFAULT_RUBRIC}=await import('../src/services/weightedRubricService');
const {providerStubStats}=await import('../src/services/providerStubService');

const users=Number(process.argv[2]||10),label=process.argv[3]||'run';
const E=(k:string,d:number)=>{const v=process.env[k];return v===undefined||v===''?d:Number(v);};
const C={instances:E('H_INSTANCES',1),pool:E('H_POOL',5),spreadMs:E('H_SPREAD_MS',0),tasksConc:E('H_TASKS_CONC',3),tasksRate:E('H_TASKS_RATE',1),backoffMs:E('H_BACKOFF_MS',30000),
 admission:process.env.H_ADMISSION==='1',admitConc:E('H_ADMIT_CONC',48),admitTpm:E('H_ADMIT_TPM',3000000),firebaseMs:E('H_FIREBASE_MS',180),tasksMs:E('H_TASKS_MS',200),sqlMs:E('H_SQL_MS',0.5),
 stubCapacity:E('STUB_CAPACITY',0),stub429:E('STUB_429_RATE',0),stubHang:E('STUB_HANG_RATE',0)};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let seed=42;const rand=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const pgUrl=process.env.H_PG_URL||'';
if(!/^postgres:\/\/postgres@127\.0\.0\.1:5543[23]\/$/.test(pgUrl))throw Error('H_PG_URL must be a loopback test cluster, e.g. postgres://postgres@127.0.0.1:55433/');

// Fresh database; one pg pool per instance.
const dbName='judge_load_'+Date.now();
{const admin=new pg.Client({connectionString:pgUrl+'postgres'});await admin.connect();await admin.query('CREATE DATABASE '+dbName);await admin.end();}
const setup=new pg.Pool({connectionString:pgUrl+dbName,max:2});
for(const f of ['001_baseline.sql','005_department_correction_auto_approval.sql','012_judge_jobs.sql','013_provider_admission.sql','015_judge_dispatch_fencing.sql','020_judge_stage_results.sql'])await setup.query(fs.readFileSync('gcp/sql/'+f,'utf8'));
type Inst={id:number;pool:any;waits:number[];samples:Array<{busy:number;waiting:number}>;tx:number;service:any};
const inst:Inst[]=Array.from({length:C.instances},(_,id)=>({id,pool:new pg.Pool({connectionString:pgUrl+dbName,max:C.pool}),waits:[],samples:[],tx:0,service:undefined}));
const where=new AsyncLocalStorage<Inst>();
const sampler=setInterval(()=>{for(const i of inst)i.samples.push({busy:i.pool.totalCount-i.pool.idleCount,waiting:i.pool.waitingCount});},50);sampler.unref();
configureSqlPoolForTests({async connect(){
 const i=where.getStore();if(!i)throw Error('SQL outside an instance scope');
 const t=performance.now();const c=await i.pool.connect();i.waits.push(performance.now()-t);
 return {async query(sql:string,values:any[]=[]){if(sql==='BEGIN')i.tx++;if(C.sqlMs)await sleep(C.sqlMs);return c.query(sql,values);},release:()=>c.release()};
}});

// Fixture: one class/lesson, N enrolled learners, one saved attempt each with a realistic generation snapshot.
const id=(n:number,k=1)=>`${String(n).padStart(8,'0')}-0000-4000-8000-${String(k).padStart(12,'0')}`;
await setup.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await setup.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await setup.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-LOAD',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
await setup.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await setup.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(9),id(8)]);
const snapshot=JSON.stringify({scenario:'Fictional ticket',task_goal:'Classify the ticket with a cited SOP section.',sample_input_context:'[SOP:QA:v1] Section 1: delivery-status tickets are normal priority.',production_rubric:DEFAULT_RUBRIC});
const actors:Record<string,any>={};
for(let u=1;u<=users;u++){
 const user=id(100,u),subject=id(200,u),learner=id(300,u),attempt=id(1000,u);
 await setup.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,$2,'Learner','learner',$3,now())",[user,`l${u}@example.test`,subject]);
 await setup.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[learner,user]);
 await setup.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[learner,id(6)]);
 await setup.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output) VALUES($1,$2,$3,'L1',$4,1,$5,'Saved output')",[attempt,learner,id(6),id(9),'Classify ticket '+u+' with the SOP and cite it.']);
 await setup.query("INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id) VALUES($1,$2,$3,$4,'Task prompt',$5,$6)",[subject,attempt,id(6),id(9),snapshot,attempt]);
 actors['tok-'+u]={subject,email:`l${u}@example.test`,firebaseUid:'f'+u,userId:user};
}
if(C.admission){process.env.PROVIDER_ADMISSION_MODE='sql';await setup.query('UPDATE product_provider_budget SET concurrency=$1,tokens_per_minute=$2,max_backlog=10000,tenant_backlog=50 WHERE id=1',[C.admitConc,C.admitTpm]);}
else delete process.env.PROVIDER_ADMISSION_MODE;
let firebase=0;
configureFirebaseVerifierForTests(async token=>{firebase++;await sleep(C.firebaseMs);await sqlTransaction(undefined,c=>c.query('SELECT 1'));const a=actors[token];if(!a)throw Error('bad token');return a;});

// Structured service logs (queue wait, grade time, admission) are collected, not printed.
const logs:any[]=[];const rawLog=console.log;console.log=(...a:any[])=>{if(typeof a[0]==='string'&&a[0].startsWith('{')){try{logs.push(JSON.parse(a[0]));return;}catch{}}rawLog(...a);};console.warn=()=>{};console.error=()=>{};

// Cloud Tasks model: global queue honouring maxConcurrentDispatches + maxDispatchesPerSecond; any instance may receive
// a dispatch (round robin); a 503 from the worker is redispatched after the queue backoff.
const pending:Array<()=>Promise<unknown>>=[];let running=0,lastDispatch=0,rr=0,tasksCreated=0,retriesPending=0;const workerResults:Record<string,number>={};
const pump=()=>{while(pending.length&&running<C.tasksConc){const w=Math.max(0,lastDispatch+1000/C.tasksRate-Date.now());if(w){setTimeout(pump,w);return;}lastDispatch=Date.now();const job=pending.shift()!;running++;job().finally(()=>{running--;pump();});}};
const dispatch=(t:any)=>{pending.push(async()=>{await sleep(100);const i=inst[rr++%inst.length];const r:any=await where.run(i,()=>i.service.runJudgeJob(t.token,t.attemptId));workerResults[r.status]=(workerResults[r.status]||0)+1;if(r.http===503){retriesPending++;setTimeout(()=>{retriesPending--;dispatch(t);},C.backoffMs);}});pump();};
for(const i of inst)i.service=createRebuildRunService(undefined as any,undefined,undefined,undefined,undefined,{queue:async(t:any)=>{tasksCreated++;await sleep(C.tasksMs);dispatch(t);}});

class Res extends EventEmitter{status=0;headersSent=false;writableEnded=false;ev:Array<{ev:string;at:number;data:any}>=[];
 writeHead(s:number){this.status=s;this.headersSent=true;return this;}flushHeaders(){}
 write(c:string){const ev=/event: (\w+)/.exec(c)?.[1];if(ev)this.ev.push({ev,at:Date.now(),data:JSON.parse(/data: (.*)/.exec(c)![1])});return true;}
 end(c?:string){if(c)this.write(c);this.writableEnded=true;}}
const rows:any[]=[];
const started=Date.now();
const click=async(u:number)=>{
 if(C.spreadMs)await sleep(rand()*C.spreadMs);
 const i=inst[u%inst.length],res=new Res(),at=Date.now();
 await where.run(i,()=>handleJudgeStream({headers:{authorization:'Bearer tok-'+u}} as any,res as any,{classId:id(6),lessonId:id(9),attemptId:id(1000,u)},
  {async:true,enqueue:i.service.enqueueJudge,watch:i.service.watchJudge,access:assertAiLessonAccess} as any));
 const first=(e:string)=>{const x=res.ev.find(v=>v.ev===e);return x?x.at-at:undefined;};
 const last=res.ev.at(-1);
 rows.push({u,at,http:res.status,status:first('status'),progress:first('progress'),criterion:first('criterion'),done:first('done'),end:last?.ev||'http'+res.status,total:last?.ev==='done'?last.data.total:undefined,doneAt:last?.ev==='done'?last.at:undefined});
};
await Promise.all(Array.from({length:users},(_,k)=>click(k+1)));
// Queue retries continue server side after a stream's window; wait for them (bounded) before checking integrity.
for(let w=0;w<120&&(pending.length||running||retriesPending);w++)await sleep(1000);
const wall=Date.now()-started;

// Integrity, read straight from SQL.
const one=async(sql:string,v:any[]=[])=>(await setup.query(sql,v)).rows;
const jobs=await one('SELECT status,count(*)::int n,max(generation)::int maxGen,max(dispatch_count)::int maxDispatch,sum(dispatch_count)::int dispatches FROM product_judge_jobs GROUP BY status');
const graded=(await one('SELECT count(*)::int n FROM prompt_attempts WHERE evaluation_json IS NOT NULL'))[0].n;
const jobRows=(await one('SELECT count(*)::int n,count(DISTINCT attempt_id)::int d FROM product_judge_jobs'))[0];
const lostGrades=(await one("SELECT count(*)::int n FROM product_judge_jobs j JOIN prompt_attempts a ON a.id=j.attempt_id WHERE j.status='succeeded' AND a.evaluation_json IS NULL"))[0].n;
const openClaims=(await one('SELECT count(*)::int n FROM rebuild_judge_claims WHERE completed_at IS NULL'))[0].n;
const stageRows=(await one('SELECT count(*)::int n FROM product_judge_stage_results'))[0].n;
const dbTotals=new Map((await one("SELECT id::text,(evaluation_json->>'total')::float t FROM prompt_attempts WHERE evaluation_json IS NOT NULL")).map((r:any)=>[r.id,r.t]));
const streamDbMismatch=rows.filter(r=>r.end==='done'&&dbTotals.get(id(1000,r.u))!==r.total).length;
const finishedLate=rows.filter(r=>r.end!=='done'&&dbTotals.has(id(1000,r.u))).length;
const admissionLeft=C.admission?await one("SELECT status,count(*)::int n FROM product_provider_calls GROUP BY status"):[];

const q=(a:any[],p:number)=>{const s=a.filter(x=>Number.isFinite(x)).sort((x,y)=>x-y);return s.length?Math.round(s[Math.min(s.length-1,Math.ceil(p/100*s.length)-1)]):null;};
const P=(a:any[])=>({p50:q(a,50),p95:q(a,95),max:q(a,100)});
const metrics=logs.filter(l=>l.event==='judge_job_metrics'),ev=metrics.filter(l=>l.outcome==='evaluated'),calls=logs.filter(l=>l.event==='provider_call');
const doneAts=rows.map(r=>r.doneAt).filter(Boolean),firstClick=Math.min(...rows.map(r=>r.at));
const stub=providerStubStats();
const summary={label,users,config:C,
 latencyMs:{enqueue_toFirstStatus:P(rows.map(r=>r.status)),firstProgress:P(rows.map(r=>r.progress)),firstScoredCriterion:P(rows.map(r=>r.criterion)),done:P(rows.map(r=>r.done))},
 serverMs:{queueWait:P(ev.map(l=>l.queueWaitMs)),judgeExec:P(ev.map(l=>l.evaluateMs)),admissionWait:P(calls.map(l=>l.queueMs))},
 throughput:{completedInStream:doneAts.length,gradesPerMin:doneAts.length?Math.round(10*doneAts.length/((Math.max(...doneAts)-firstClick)/60000))/10:0,offeredPerMin:C.spreadMs?Math.round(10*users/(C.spreadMs/60000))/10:null,wallMs:wall},
 pool:inst.map(i=>{const b=i.samples.map(s=>s.busy);return {instance:i.id,acquire:P(i.waits),avgBusyPct:Math.round(100*b.reduce((x,y)=>x+y,0)/Math.max(1,b.length)/C.pool),saturatedPct:Math.round(100*b.filter(x=>x>=C.pool).length/Math.max(1,b.length)),maxWaiting:Math.max(0,...i.samples.map(s=>s.waiting)),tx:i.tx};}),
 provider:{calls:stub.calls,ok:stub.ok,'429':stub.rejected429,hung:stub.hung,peakInFlight:stub.peakInFlight,callsPerGrade:graded?Math.round(10*stub.calls/graded)/10:null,
  stageRetriesOrHedges:metrics.flatMap(l=>l.stages||[]).filter((s:any)=>s.attempts>1).length,queueRetries:metrics.filter(l=>l.outcome!=='evaluated').length,admissionDenied:logs.filter(l=>l.event==='provider_admission').length},
 integrity:{streams:users,streamEnds:rows.reduce((m:any,r)=>{m[r.end]=(m[r.end]||0)+1;return m;},{}),jobs,jobRows:jobRows.n,distinctAttempts:jobRows.d,tasksCreated,workerResults,graded,finishedAfterStreamEnded:finishedLate,
  lostGrades,openClaims,stageRows,streamDbMismatch,admissionLeft,firebaseVerifies:firebase}};
rawLog(JSON.stringify(summary));
fs.mkdirSync('outputs/judge-latency-harness',{recursive:true});
fs.appendFileSync('outputs/judge-latency-harness/load-results.jsonl',JSON.stringify(summary)+'\n');
for(const i of inst)await i.pool.end();await setup.end();
{const admin=new pg.Client({connectionString:pgUrl+'postgres'});await admin.connect();await admin.query('DROP DATABASE '+dbName+' WITH (FORCE)');await admin.end();}
process.exit(0);
