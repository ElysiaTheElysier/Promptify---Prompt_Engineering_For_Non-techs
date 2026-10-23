import assert from 'node:assert/strict';
import {evaluateParallel,JUDGE_STRATEGIES,type JudgeStrategy} from '../src/services/parallelJudgeService';
import {AiServerError} from '../src/services/apiServerService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
import {productionEvaluate} from '../src/services/productionAiService';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';
import {GoogleAuth} from 'google-auth-library';

// Judge strategies A (parallel-v1, production), B (consolidated-v1), C (integrated-v1) share one weighted-v1
// contract: same anchors, five criteria, supervisor gate, deterministic feedback. Offline mocks only.
const base={learnerPrompt:'Classify fictional ticket 42 using the approved SOP and cite it.',generatedOutput:'| 42 | normal | 2 days | [SOP:QA:v1] |',
  taskRequirement:'Classify the ticket with a cited SOP section.',scenario:'Fictional',controlData:'[SOP:QA:v1] Section 1: delivery-status tickets are normal priority, 2 business days.',language:'en' as const};
const inputOf=(payload:any)=>JSON.parse(payload.contents[0].parts[0].text);
const reply=(value:unknown)=>({output:JSON.stringify(value),model:'gemini-3.8-flash',tokens:10});
// Same per-criterion verdicts regardless of how a strategy batches them: fraction of maxScore.
const verdict:Record<string,number>={groundedness:1,persona:0.75,format:0.5,oneshot:0.25,actionability:0};
const row=(c:any)=>({score:verdict[c.key]*(c.weight/10),reasonEn:'Reason.',reasonVi:'Lý do.',improvementEn:'Improve.',improvementVi:'Cải thiện.'});
const all=(cs:any[],tweak?:(key:string,r:any)=>any)=>Object.fromEntries(cs.map(c=>[c.key,tweak?tweak(c.key,row(c)):row(c)]));
const model=(opts:{offTask?:boolean;tweak?:(key:string,r:any)=>any;fail?:(stage:string)=>Error|undefined}={})=>{
  const calls:string[]=[];
  const call=async(payload:any)=>{
    const input=inputOf(payload);calls.push(input.stage);
    const err=opts.fail?.(input.stage);if(err)throw err;
    const sup={taskAttempt:!opts.offTask,summaryEn:'Summary.',summaryVi:'Tóm tắt.'};
    if(input.stage==='supervisor')return reply(sup);
    if(input.stage==='criterion')return reply({key:input.criterion.key,...(opts.tweak?opts.tweak(input.criterion.key,row(input.criterion)):row(input.criterion))});
    if(input.stage==='criteria')return reply({criteria:all(input.criteria,opts.tweak)});
    if(input.stage==='integrated')return reply({...sup,criteria:opts.offTask?all(input.rubric,(_k,r)=>({...r,score:0})):all(input.rubric,opts.tweak)});
    throw Error('unexpected stage '+input.stage);
  };
  return {calls,call};
};
const run=(strategy:JudgeStrategy,m:ReturnType<typeof model>)=>evaluateParallel(base,DEFAULT_RUBRIC,m.call,50000,strategy);
const quiet=async<T>(work:()=>Promise<T>)=>{const warn=console.warn;console.warn=()=>{};try{return await work();}finally{console.warn=warn;}};

assert.deepEqual(JUDGE_STRATEGIES,['parallel-v1','consolidated-v1','integrated-v1']);
const expectedCalls:Record<JudgeStrategy,number>={'parallel-v1':6,'consolidated-v1':2,'integrated-v1':1};
const totals:Record<string,number>={};
for(const strategy of JUDGE_STRATEGIES){
  // 1. Identical verdicts give identical weighted-v1 results; only the provider call count differs.
  const m=model();const result=await run(strategy,m);
  assert.equal(m.calls.length,expectedCalls[strategy],strategy+' provider calls');
  assert.equal(result.contract,'weighted-v1');assert.equal(result.criteria.length,5);
  assert.equal(result.judge.version,strategy);
  totals[strategy]=result.total;
  assert.deepEqual(result.criteria.map(c=>[c.key,c.score]),DEFAULT_RUBRIC.map(c=>[c.key,Math.round(verdict[c.key]*c.weight/10*100)/100]),strategy+' anchored scores');
  assert.ok(result.feedback?.en.nextHint&&result.feedback?.vi.nextHint);
  // 2. Supervisor gate: an off-task prompt scores zero even if criteria output scores.
  const off=await run(strategy,model({offTask:true}));
  assert.equal(off.total,0,strategy+' off-task zero');
  // 3. A non-anchor score is rejected, never rounded into credit.
  await quiet(()=>assert.rejects(()=>run(strategy,model({tweak:(k,r)=>k==='format'?{...r,score:r.score+0.3}:r})),(e:any)=>e.statusCode===502,strategy+' anchor'));
  // 4. A missing criterion rejects the whole grade (no partial rubric).
  if(strategy!=='parallel-v1')await quiet(()=>assert.rejects(()=>run(strategy,model({tweak:(k,r)=>k==='oneshot'?undefined:r})),(e:any)=>e.statusCode===502,strategy+' missing criterion'));
  // 5. Provider outcomes keep their classification: definite 503, uncertain 504.
  const gradingStage=strategy==='parallel-v1'?'criterion':strategy==='consolidated-v1'?'criteria':'integrated';
  await quiet(()=>assert.rejects(()=>run(strategy,model({fail:s=>s===gradingStage?new AiServerError('capacity',503):undefined})),(e:any)=>e.statusCode===503,strategy+' 503'));
  await quiet(()=>assert.rejects(()=>run(strategy,model({fail:s=>s===gradingStage?new AiServerError('timeout',504):undefined})),(e:any)=>e.statusCode===504,strategy+' 504'));
}
assert.equal(new Set(Object.values(totals)).size,1,'all strategies aggregate identically');
// 6. B and C send the evidence once, A five times (context amplification).
const sizes:Record<string,number>={};
for(const strategy of JUDGE_STRATEGIES){let chars=0;await evaluateParallel(base,DEFAULT_RUBRIC,async(payload:any)=>{chars+=JSON.stringify(payload).length;return model().call(payload);},50000,strategy);sizes[strategy]=chars;}
assert.ok(sizes['consolidated-v1']<sizes['parallel-v1']*0.6&&sizes['integrated-v1']<sizes['consolidated-v1'],'batched strategies send less input');
// Exercise the production strategy switch, Vertex adapter and global admission together.
// ADC, SQL transport and Vertex are mocked; no credential lookup or network is permitted here.
process.env.NODE_ENV='test';
const envNames=['AI_PROVIDER','GOOGLE_CLOUD_PROJECT','VERTEX_LOCATION','GEMINI_MODEL','GEMINI_FALLBACK_MODEL','JUDGE_STRATEGY','PROVIDER_ADMISSION_MODE'] as const;
const savedEnv=Object.fromEntries(envNames.map(n=>[n,process.env[n]]));
const originalFetch=globalThis.fetch,originalGetClient=GoogleAuth.prototype.getClient;
let enqueues=0,acquires=0,settles=0,held=0,transports=0,storeUnavailable=false;
configureSqlPoolForTests({async connect(){held++;return {async query(sql:string){
 if(storeUnavailable)throw Error('offline SQL unavailable');
 if(sql.includes('product_provider_enqueue')){enqueues++;return {rows:[{result:'queued'}]};}
 if(sql.includes('product_provider_acquire')){acquires++;return {rows:[{result:{status:'admitted',fence:1}}]};}
 if(sql.includes('product_provider_settle')){settles++;return {rows:[{result:true}]};}
 return {rows:[]};
},release(){held--;}};}});
try{
 Object.assign(process.env,{AI_PROVIDER:'vertex',GOOGLE_CLOUD_PROJECT:'offline-project',VERTEX_LOCATION:'global',GEMINI_MODEL:'gemini-3.8-flash',PROVIDER_ADMISSION_MODE:'sql'});
 delete process.env.GEMINI_FALLBACK_MODEL;
 (GoogleAuth.prototype as any).getClient=async()=>({getAccessToken:async()=>({token:'offline-only'})});
 globalThis.fetch=async(url,init)=>{
  transports++;assert.match(String(url),/^https:\/\/aiplatform\.googleapis\.com\/.*\/gemini-3\.8-flash:generateContent$/);
  const payload=JSON.parse(String(init?.body));
  assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel,'LOW');
  assert.equal(payload.generationConfig.thinkingConfig.thinkingBudget,undefined);
  const response=await model().call(payload);
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:response.output}]}}],usageMetadata:{totalTokenCount:10}}));
 };
 for(const strategy of ['integrated-v1','consolidated-v1'] as const){
  enqueues=acquires=settles=transports=0;process.env.JUDGE_STRATEGY=strategy;
  const result=await productionEvaluate({...base,lessonRubric:DEFAULT_RUBRIC});
  assert.equal(result.criteria.length,5);assert.equal(result.contract,'weighted-v1');
  assert.equal(result.total,totals[strategy]);
  assert.deepEqual([transports,enqueues,acquires,settles],Array(4).fill(expectedCalls[strategy]),'every actual provider call receives and settles its own admission permit');
  assert.equal(held,0);
 }
 storeUnavailable=true;transports=0;process.env.JUDGE_STRATEGY='integrated-v1';
 await quiet(()=>assert.rejects(()=>productionEvaluate({...base,lessonRubric:DEFAULT_RUBRIC}),(e:any)=>e.statusCode===503&&e.code==='admission_unavailable'));
 assert.equal(transports,0,'C cannot bypass admission when SQL is unavailable');assert.equal(held,0);
}finally{
 globalThis.fetch=originalFetch;GoogleAuth.prototype.getClient=originalGetClient;
 for(const n of envNames){if(savedEnv[n]===undefined)delete process.env[n];else process.env[n]=savedEnv[n];}
}
console.log('Judge strategies PASS: A/B/C same weighted-v1 result for same verdicts; calls 6/2/1; supervisor gate; anchor/missing-criterion rejection; 503/504 preserved; input chars '+JSON.stringify(sizes)+'. Offline only.');
