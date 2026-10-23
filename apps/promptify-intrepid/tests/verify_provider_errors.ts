import assert from 'node:assert/strict';
import {productionGenerate,productionEvaluate,capacityRetryDelay} from '../src/services/productionAiService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';

// Provider status classification and bounded capacity retry. Mocked fetch only; no live calls.
const names=['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FALLBACK_MODEL','AI_PROVIDER','GOOGLE_CLOUD_PROJECT','JUDGE_STRATEGY'] as const;
const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
const original=globalThis.fetch;
const ok=(text='Offline output')=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]}));
const reject=(status:number,providerStatus?:string,headers?:Record<string,string>)=>new Response(JSON.stringify(providerStatus?{error:{code:status,status:providerStatus,message:'Offline upstream detail'}}:{}),{status,headers});
const prompt={prompt:'Describe the supplied fictional task.'} as any;
let calls=0;
const serve=(...responses:Array<()=>Response>)=>{calls=0;globalThis.fetch=async()=>{const next=responses[Math.min(calls,responses.length-1)];calls++;return next();};};
try{
  process.env.GEMINI_API_KEY='offline-only';process.env.GEMINI_MODEL='gemini-3.8-flash';
  delete process.env.GEMINI_FALLBACK_MODEL;delete process.env.AI_PROVIDER;delete process.env.JUDGE_STRATEGY;

  assert.equal(capacityRetryDelay('2'),2000);assert.equal(capacityRetryDelay('120'),5000,'Retry-After is capped');
  assert.equal(capacityRetryDelay(null,()=>0),800);assert.equal(capacityRetryDelay(undefined,()=>1),1600);

  serve(()=>reject(503,'UNAVAILABLE',{'retry-after':'0'}),()=>ok());
  assert.equal((await productionGenerate(prompt)).output,'Offline output','Transient 503 recovers with one same-model retry');
  assert.equal(calls,2);

  serve(()=>reject(429,'RESOURCE_EXHAUSTED',{'retry-after':'0'}));
  await assert.rejects(()=>productionGenerate(prompt),(e:any)=>e.statusCode===429&&e.upstreamStatus===429&&/upstream 429 RESOURCE_EXHAUSTED/.test(e.message));
  assert.equal(calls,2,'Capacity retry is bounded to one');

  serve(()=>reject(404,'NOT_FOUND'));
  await assert.rejects(()=>productionGenerate(prompt),(e:any)=>e.statusCode===502&&e.upstreamStatus===404&&/not found \(upstream 404 NOT_FOUND\)/.test(e.message));
  assert.equal(calls,1,'404 is terminal and never retried');

  serve(()=>reject(400,'INVALID_ARGUMENT'));
  await assert.rejects(()=>productionGenerate(prompt),(e:any)=>e.statusCode===502&&e.upstreamStatus===400);
  assert.equal(calls,1);

  calls=0;globalThis.fetch=async()=>{calls++;throw new DOMException('Offline timeout','TimeoutError');};
  await assert.rejects(()=>productionGenerate(prompt),(e:any)=>e.statusCode===504);
  assert.equal(calls,1,'Uncertain timeout is never retried here');

  // Missing Vertex configuration fails before any request: definite 503, not an uncertain 504.
  process.env.AI_PROVIDER='vertex';delete process.env.GOOGLE_CLOUD_PROJECT;
  calls=0;globalThis.fetch=async()=>{calls++;return ok();};
  await assert.rejects(()=>productionGenerate(prompt),(e:any)=>e.statusCode===503&&/not configured/.test(e.message));
  assert.equal(calls,0,'Setup failure sends nothing');
  delete process.env.AI_PROVIDER;

  // Parallel Judge: a definite 503 on one criterion is reported as 503 (claim-releasable), never as uncertain.
  process.env.JUDGE_STRATEGY='parallel-v1';
  globalThis.fetch=async(_url,options:any)=>{
    const input=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text),key=input.criterion?.key||'supervisor';
    if(key==='format')return reject(503,'UNAVAILABLE',{'retry-after':'0'});
    const value=key==='supervisor'?{taskAttempt:true,summaryEn:'Task requested.',summaryVi:'Đã yêu cầu bài.'}:{key,score:input.criterion.maxScore,reasonEn:'Supported.',reasonVi:'Có căn cứ.',improvementEn:'Keep it.',improvementVi:'Giữ nguyên.'};
    return ok(JSON.stringify(value));
  };
  await assert.rejects(()=>productionEvaluate({learnerPrompt:'Perform the approved fictional task.',generatedOutput:'Fictional output',lessonRubric:DEFAULT_RUBRIC,language:'en'}),(e:any)=>e.statusCode===503);
  console.log('Provider errors PASS: upstream status preserved (404/400 terminal, 429/503 one bounded retry with Retry-After), setup errors definite 503, timeouts uncertain 504, parallel Judge 503 definite. Offline only.');
}finally{
  globalThis.fetch=original;
  for(const n of names){const v=saved[n];if(v===undefined)delete process.env[n];else process.env[n]=v;}
}
