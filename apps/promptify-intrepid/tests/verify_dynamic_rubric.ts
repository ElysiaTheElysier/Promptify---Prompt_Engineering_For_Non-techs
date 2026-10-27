import assert from 'node:assert/strict';
import fs from 'node:fs';
// Dynamic rubric (trainer-defined 1-8 criteria): validation, Judge workers driven only by the rubric they receive
// (3/5/8 criteria, all strategies), SQL 021, and the Run-time rubric snapshot through the real async Judge path. Offline only.
process.env.NODE_ENV='test';process.env.DATABASE_URL='offline-test-only';process.env.JUDGE_FENCING_MODE='sql';
process.env.JUDGE_MODE='async';process.env.JUDGE_QUEUE='projects/p/locations/asia-southeast1/queues/judge';process.env.JUDGE_WORKER_URL='https://worker.example.test/';
const {PGlite}=await import('@electric-sql/pglite');
const {DEFAULT_RUBRIC,RUBRIC_MAX_CRITERIA,RUBRIC_KEY_PATTERN,JUDGE_WORKER_CONCURRENCY,validateRubric,validateWeightedEvaluation,normalizeRubric,newCriterionKey,rebalanceRubric}=await import('../src/services/weightedRubricService');
const {evaluateParallel,JUDGE_STRATEGIES}=await import('../src/services/parallelJudgeService');
const {criterionLabel}=await import('../src/services/productI18nService');
type C={key:string;label:string;description:string;weight:number;active:boolean};
const custom=(weights:number[]):C[]=>weights.map((weight,i)=>({key:'c_'+'abcdefgh'[i]+'_check',label:`Custom ${i+1}`,description:`Mentions token-${i+1} from the SOP.`,weight,active:true}));
const R3=custom([50,30,20]),R8=custom([13,13,13,13,12,12,12,12]);
const studioConfig=(rubric:unknown)=>({state:'DRAFT',pillar:'',branch:'',competencies:'',startTime:'',endTime:'',departments:[],objectives:[],variables:[],scaffold:[],materials:[],awards:{},rubric});
const quiet=async<T>(work:()=>Promise<T>)=>{const e=console.error,w=console.warn;console.error=console.warn=()=>{};try{return await work();}finally{console.error=e;console.warn=w;}};

// 1. Validation: 1-8 criteria, generated keys only, weights total 100.
for(const rubric of [custom([100]),R3,DEFAULT_RUBRIC,R8])assert.equal(validateRubric(rubric).length,rubric.length);
assert.equal(RUBRIC_MAX_CRITERIA,8);
const rejects=(rubric:any,why:string)=>assert.throws(()=>validateRubric(rubric),undefined,why);
rejects([],'zero criteria');rejects(custom([12,11,11,11,11,11,11,11,11]),'nine criteria');
rejects(custom([50,50]).map(c=>({...c,key:'c_same'})),'duplicate keys');
for(const key of ['C_upper','c_1','c-x','criterion:x','x','a'.repeat(41)])rejects([{...custom([100])[0],key}],'bad key '+key);
rejects([{...custom([100])[0],label:'  '}],'blank label');rejects(custom([50,40]),'weights total 90');
rejects([...custom([100]),{...custom([0,0])[1],active:false,weight:5}],'inactive criterion with weight');
for(let i=0;i<50;i++)assert.match(newCriterionKey(R8),RUBRIC_KEY_PATTERN);
const removed=normalizeRubric(R8.slice(1));assert.equal(removed.reduce((n,c)=>n+c.weight,0),100);assert.ok(removed.every(c=>Number.isInteger(c.weight)));
assert.equal(normalizeRubric([...R3,{...R3[0],key:'c_new',weight:33}]).reduce((n,c)=>n+c.weight,0),100,'adding a criterion rebalances');
assert.equal(rebalanceRubric(R8,R8[0].key,40).reduce((n,c)=>n+c.weight,0),100,'slider rebalance works for 8 criteria');
assert.equal(validateWeightedEvaluation({criteria:R8.map(c=>({key:c.key,score:c.weight/10,reason:'Ok.'})),strengths:[],improvements:[],nextHint:'Keep.'},R8).total,10);
assert.equal(criterionLabel('groundedness','Groundedness & SOP Citation','vi'),'Bám sát dữ liệu và trích dẫn SOP','template label stays bilingual');
assert.equal(criterionLabel('groundedness','Trích dẫn theo mục','en'),'Trích dẫn theo mục','renamed template shows the trainer label');
assert.equal(criterionLabel('c_abc','Giọng văn','en'),'Giọng văn','custom criterion shows the trainer label');
{const {validateStudioShape}=await import('../src/services/studioValidationService');
 const badge={id:'b1',name:'Grounding star',icon:'verified',criteria:'',status:'ACTIVE',ruleType:'criterion_score',criterionKey:'groundedness',minimumScore:'9',attemptScope:'any'};
 assert.throws(()=>validateStudioShape({...studioConfig(R3),awards:{badges:[badge]}}),(e:any)=>e.statusCode===422&&/Grounding star.*Choose its criterion again/.test(e.message),'server names the orphaned badge');
 assert.equal(validateStudioShape({...studioConfig(R3),awards:{badges:[{...badge,criterionKey:R3[1].key}]}}).rubric.length,3);}

// 2. Judge workers know nothing but the rubric: 3/5/8 criteria, accuracy of aggregation, fan-out, latency and payload size.
const reply=(v:unknown)=>({output:JSON.stringify(v),model:'gemini-3.8-flash',tokens:1});
const row=(c:any,prompt:string)=>{const keyword=String(c.description).match(/token-\d+/)?.[0]??c.label;const ratio=prompt.includes(keyword)||prompt.includes(c.label)?1:0.25;
  return {score:Math.round(c.maxScore*ratio*100)/100,reasonEn:'Evidence.',reasonVi:'Căn cứ.',improvementEn:'Add '+keyword+'.',improvementVi:'Thêm '+keyword+'.'};};
const model=(log:{inputs:any[];peak:number;active:number;chars:number},ms=40)=>async(payload:any)=>{
  const input=JSON.parse(payload.contents[0].parts[0].text);log.inputs.push(input);log.chars+=JSON.stringify(payload).length;
  log.active++;log.peak=Math.max(log.peak,log.active);await new Promise(r=>setTimeout(r,ms));log.active--;
  const sup={taskAttempt:true,summaryEn:'Task.',summaryVi:'Bài.'};
  if(input.stage==='supervisor')return reply(sup);
  if(input.stage==='criterion')return reply({key:input.criterion.key,...row(input.criterion,input.learnerPrompt)});
  const list=input.stage==='criteria'?input.criteria:input.rubric;
  const criteria=Object.fromEntries(list.map((c:any)=>[c.key,row(c,input.learnerPrompt)]));
  return reply(input.stage==='criteria'?{criteria}:{...sup,criteria});
};
const base={taskRequirement:'Answer the ticket.',scenario:'Fictional',controlData:'[SOP:QA:v1] Section 1.',generatedOutput:'Saved output',language:'en' as const};
const report:string[]=[];
for(const rubric of [R3,DEFAULT_RUBRIC as C[],R8]){
  const n=rubric.length;
  // The learner prompt satisfies only the first criterion; every other criterion lands on the 25% anchor.
  const prompt=`Answer citing ${String(rubric[0].description).match(/token-\d+/)?.[0]??rubric[0].label}.`;
  const expected=Math.round(rubric.reduce((sum,c,i)=>sum+(i===0?c.weight/10:Math.round(c.weight/10*0.25*100)/100),0)*100)/100;
  const log={inputs:[] as any[],peak:0,active:0,chars:0};
  const started=performance.now();
  const result:any=await evaluateParallel({...base,learnerPrompt:prompt},rubric,model(log),50000,'parallel-v1');
  const ms=Math.round(performance.now()-started);
  assert.equal(log.inputs.length,n+1,`${n} criteria: 1 supervisor + ${n} workers`);
  const workers=log.inputs.filter(i=>i.stage==='criterion');
  assert.deepEqual(workers.map(i=>i.criterion.key).sort(),rubric.map(c=>c.key).sort(),'one worker per configured criterion');
  for(const w of workers){const c=rubric.find(r=>r.key===w.criterion.key)!;
    assert.equal(w.criterion.label,c.label);assert.equal(w.criterion.description,c.description);assert.equal(w.criterion.maxScore,c.weight/10,'worker receives its own scale');
    assert.equal(w.rubric,undefined,'a worker never sees sibling criteria');
    assert.match('criterion:'+w.criterion.key,/^[a-z]+(:[a-z_]+)?$/,'stage name fits the 020 check');}
  assert.deepEqual(result.criteria.map((c:any)=>c.key),rubric.map(c=>c.key),'result keeps rubric order');
  assert.ok(result.criteria.every((c:any,i:number)=>c.label===rubric[i].label&&c.max===rubric[i].weight/10),'saved rows carry the trainer label and scale');
  assert.equal(result.total,expected,`${n} criteria: weighted total`);assert.ok(result.total<=10);
  assert.ok(log.peak<=1+JUDGE_WORKER_CONCURRENCY,'fan-out stays within the worker cap');
  const rounds=Math.ceil(n/JUDGE_WORKER_CONCURRENCY);assert.ok(ms>=rounds*40-5,`${n} criteria need ${rounds} worker round(s)`);
  report.push(`${n} criteria: ${n+1} calls, peak ${log.peak} concurrent, ${rounds} round(s), ${ms} ms at 40 ms/call, ~${Math.round(log.chars/4)} input tokens`);
}
for(const strategy of JUDGE_STRATEGIES){
  const log={inputs:[] as any[],peak:0,active:0,chars:0};
  const result:any=await evaluateParallel({...base,learnerPrompt:'Covers token-1 token-2 token-3 token-4 token-5 token-6 token-7 token-8.'},R8,model(log,1),50000,strategy);
  assert.equal(result.total,10,strategy+' grades all 8 custom criteria');assert.equal(result.criteria.length,8);
}
// An off-task prompt still scores every configured criterion 0.
{const log={inputs:[] as any[],peak:0,active:0,chars:0};const off=async(payload:any)=>{const i=JSON.parse(payload.contents[0].parts[0].text);return i.stage==='supervisor'?reply({taskAttempt:false,summaryEn:'Off.',summaryVi:'Lạc đề.'}):model(log,1)(payload);};
 const result:any=await evaluateParallel({...base,learnerPrompt:'hello'},R3,off,50000);assert.equal(result.total,0);assert.deepEqual(result.criteria.map((c:any)=>c.key),R3.map(c=>c.key));}

// 3. SQL 021: Studio save and valid_evaluation_total accept 1-8 generated keys and reject the rest.
{
  const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000001`;
  const db=new PGlite();
  for(const f of ['001_baseline.sql','005_department_correction_auto_approval.sql','021_dynamic_rubric.sql'])await db.exec(fs.readFileSync('gcp/sql/'+f,'utf8'));
  await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
  await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
  await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-R',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
  await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
  await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published')",[id(9),id(8)]);
  await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id) VALUES($1,'t@example.test','Trainer','instructor','trainer')",[id(3)]);
  // Authorization is covered elsewhere; here only the rubric rules of 021 are under test.
  await db.exec(`CREATE OR REPLACE FUNCTION public.product_can_manage(p_class uuid) RETURNS boolean LANGUAGE sql AS 'SELECT true';
    CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid LANGUAGE sql AS $$SELECT '${id(3)}'::uuid$$;`);
  let revision=0;
  const save=async(rubric:unknown)=>{try{const r:any=(await db.query('SELECT public.product_save_studio($1,$2,$3,$4,$5) v',[id(6),id(9),revision,JSON.stringify(studioConfig(rubric)),JSON.stringify({title:'Lesson'})])).rows[0];revision=r.v.revision;return 'ok';}catch(e){return (e as Error).message;}};
  for(const rubric of [custom([100]),R3,DEFAULT_RUBRIC,R8])assert.equal(await save(rubric),'ok',`${rubric.length} criteria saved`);
  assert.match(await save(custom([12,11,11,11,11,11,11,11,11])),/1-8 criteria/);assert.match(await save([]),/1-8 criteria/);
  assert.match(await save([{...R3[0],key:'c_1',weight:100}]),/Invalid criterion/);assert.match(await save([{...R3[0],weight:100,label:' '}]),/Invalid criterion/);
  assert.match(await save(custom([50,40])),/sum to 100/);assert.match(await save(custom([50,50]).map(c=>({...c,key:'c_dup'}))),/Unique/);
  const total=async(criteria:any[],t:number)=>((await db.query<any>('SELECT public.valid_evaluation_total($1) v',[JSON.stringify({contract:'weighted-v1',total:t,criteria})])).rows[0].v);
  const graded=(rubric:C[],ratio=1)=>rubric.map(c=>({key:c.key,score:Math.round(c.weight/10*ratio*100)/100,max:c.weight/10}));
  assert.equal(Number(await total(graded(R8),10)),10,'8 custom criteria count for pass/awards');
  assert.equal(Number(await total(graded(R3,0.5),5)),5);
  assert.equal(Number(await total(graded(DEFAULT_RUBRIC as C[]),10)),10,'existing 5-criterion grades stay valid');
  assert.equal(await total(graded(custom([12,11,11,11,11,11,11,11,11])),10),null,'nine criteria rejected');
  assert.equal(await total([{key:'c_1',score:10,max:10}],10),null,'bad key rejected');
  // Rollback restores the fixed five.
  await db.exec(fs.readFileSync('gcp/sql/rollback/021_dynamic_rubric.sql','utf8'));
  assert.equal(await total(graded(R8),10),null);assert.equal(Number(await total(graded(DEFAULT_RUBRIC as C[]),10)),10);
  assert.match(await save(R3),/Five criteria required/);
  await db.close();
}

// 4. The rubric frozen in the Run snapshot is what the async Judge grades, even after the Studio rubric changed.
{
  const {judgeFixture,id}=await import('./judgeE2eFixture');
  const {createRebuildRunService}=await import('../src/services/rebuildRunService');
  const fx=await judgeFixture(2,1,R3);
  // An ACTIVE Studio config with the 5-criterion template, saved after the learner's Run with the 3-criterion rubric.
  await fx.db.query("INSERT INTO product_studio(class_id,lesson_id,revision,config,updated_by) VALUES($1,$2,2,$3,$4)",[id(6),id(9),JSON.stringify({...studioConfig(DEFAULT_RUBRIC),state:'ACTIVE'}),id(100,1)]);
  const log={inputs:[] as any[],peak:0,active:0,chars:0},call=model(log,1);
  const evaluate=(input:any,deadline?:number,hooks?:any)=>evaluateParallel(input,input.lessonRubric,call,deadline,'parallel-v1',hooks);
  const tasks:any[]=[];
  const service=createRebuildRunService(undefined as any,undefined,evaluate,undefined,undefined,{queue:async t=>{tasks.push(t);}});
  const target=fx.body(1,1);
  assert.deepEqual(await service.enqueueJudge('Bearer tok-1',target),{async:true,status:'queued'});
  assert.equal((await quiet(()=>service.runJudgeJob(tasks[0].token,tasks[0].attemptId))).status,'succeeded');
  const saved:any=(await fx.db.query("SELECT evaluation_json e,public.valid_evaluation_total(evaluation_json) v FROM prompt_attempts WHERE id=$1",[target.attemptId])).rows[0];
  assert.deepEqual(saved.e.criteria.map((c:any)=>c.key),R3.map(c=>c.key),'graded with the Run snapshot rubric, not the edited Studio rubric');
  assert.equal(Number(saved.v),saved.e.total,'custom-rubric grade is valid for pass/awards');
  const stages=(await fx.db.query<any>("SELECT stage,view FROM product_judge_stage_results WHERE attempt_id=$1 ORDER BY stage",[target.attemptId])).rows;
  assert.deepEqual(stages.map(s=>s.stage),[...R3.map(c=>'criterion:'+c.key).sort(),'supervisor'],'custom stage names persist under the 020 check');
  assert.equal(stages.find(s=>s.stage==='criterion:'+R3[0].key).view.label,R3[0].label,'streamed rows carry the trainer label');
  await fx.db.close();
}
console.log('Dynamic rubric PASS (offline, stubbed model; not real Gemini quality or latency):\n  '+report.join('\n  '));
