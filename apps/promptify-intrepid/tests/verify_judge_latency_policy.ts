import assert from 'node:assert/strict';
import {evaluateParallel,JUDGE_RETRY_MIN_REMAINING_MS,JUDGE_HEDGE_AFTER_MS,JUDGE_ATTEMPT_TIMEOUT_MS} from '../src/services/parallelJudgeService';
import {AiServerError} from '../src/services/apiServerService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';

// Live staging 22/10: supervisor alone took 42s, leaving 7.8s for criteria -> 504. Offline mocks only.
const base={learnerPrompt:'Classify fictional ticket 42 using the approved SOP.',generatedOutput:'| 42 | normal |',taskRequirement:'Classify the ticket.',scenario:'Fictional',controlData:'SOP text',language:'en' as const};
const inputOf=(payload:any)=>JSON.parse(payload.contents[0].parts[0].text);
const reply=(value:unknown)=>({output:JSON.stringify(value),model:'gemini-3.8-flash',tokens:1});
const answer=(input:any)=>input.stage==='supervisor'?{taskAttempt:true,summaryEn:'Task requested.',summaryVi:'Đã yêu cầu bài.'}:{key:input.criterion.key,score:input.criterion.maxScore,reasonEn:'Supported.',reasonVi:'Có căn cứ.',improvementEn:'Keep it.',improvementVi:'Giữ nguyên.'};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

// 1. Supervisor and criteria overlap: wall time is one slow call, not supervisor + criteria in series.
{
  let active=0,peak=0;
  const started=performance.now();
  const result=await evaluateParallel(base,DEFAULT_RUBRIC,async payload=>{active++;peak=Math.max(peak,active);await sleep(300);active--;return reply(answer(inputOf(payload)));});
  const elapsed=performance.now()-started;
  assert.equal(result.total,10);
  assert.equal(peak,1+DEFAULT_RUBRIC.length,'supervisor overlaps all five criteria');
  assert.ok(elapsed<550,`wall time ${Math.round(elapsed)}ms stays near one call (sequential would be >=600ms)`);
}

// 2. A timed-out stage is not retried when too little shared deadline remains (no wasted, re-billed call).
{
  const calls=new Map<string,number>();
  await assert.rejects(()=>evaluateParallel(base,DEFAULT_RUBRIC,async payload=>{
    const input=inputOf(payload),key=input.criterion?.key||'supervisor';
    calls.set(key,(calls.get(key)||0)+1);
    if(key==='format')throw new AiServerError('Provider outcome uncertain',504);
    return reply(answer(input));
  },JUDGE_RETRY_MIN_REMAINING_MS-1000),(e:any)=>e.statusCode===504);
  assert.equal(calls.get('format'),1,'no retry below the remaining-time floor');
}

// 3. With enough time left, one retry is still allowed and can recover the grade.
{
  const calls=new Map<string,number>();
  const result=await evaluateParallel(base,DEFAULT_RUBRIC,async payload=>{
    const input=inputOf(payload),key=input.criterion?.key||'supervisor';
    calls.set(key,(calls.get(key)||0)+1);
    if(key==='format'&&calls.get(key)===1)throw new AiServerError('Provider outcome uncertain',504);
    return reply(answer(input));
  });
  assert.equal(result.total,10);assert.equal(calls.get('format'),2);
}
// 4. LIVE 23/10 hang: a slow stage is hedged once; the first answer wins instead of waiting for the deadline.
{
  const calls=new Map<string,number>();const timeouts:number[]=[];
  const started=performance.now();
  const result=await evaluateParallel(base,DEFAULT_RUBRIC,async(payload,timeoutMs)=>{
    const input=inputOf(payload),key=input.criterion?.key||'supervisor';
    calls.set(key,(calls.get(key)||0)+1);timeouts.push(timeoutMs!);
    if(key==='format'&&calls.get(key)===1)await sleep(JUDGE_HEDGE_AFTER_MS+3000);
    return reply(answer(input));
  },270000);
  const elapsed=performance.now()-started;
  assert.equal(result.total,10);assert.equal(calls.get('format'),2,'one hedge for the slow stage');
  assert.equal([...calls.values()].reduce((a,b)=>a+b),7,'fast stages are never duplicated');
  assert.ok(elapsed>=JUDGE_HEDGE_AFTER_MS-50&&elapsed<JUDGE_HEDGE_AFTER_MS+2000,`hedge answered at ${Math.round(elapsed)}ms`);
  assert.ok(timeouts.every(t=>t<=JUDGE_ATTEMPT_TIMEOUT_MS),'async 270s deadline still caps each attempt');
  assert.equal(result.judge.providerAttempts,7);
}

// 5. A capacity rejection retries only that stage once; a second rejection fails the grade.
{
  const calls=new Map<string,number>();
  const result=await evaluateParallel(base,DEFAULT_RUBRIC,async payload=>{
    const input=inputOf(payload),key=input.criterion?.key||'supervisor';
    calls.set(key,(calls.get(key)||0)+1);
    if(key==='supervisor'&&calls.get(key)===1)throw new AiServerError('capacity',429);
    return reply(answer(input));
  });
  assert.equal(result.total,10);assert.equal(calls.get('supervisor'),2);assert.equal(calls.get('format'),1);
  const warn=console.warn;console.warn=()=>{};
  try{await assert.rejects(()=>evaluateParallel(base,DEFAULT_RUBRIC,async payload=>{const input=inputOf(payload);if(!input.criterion)throw new AiServerError('capacity',429);return reply(answer(input));}),(e:any)=>e.statusCode===429);}
  finally{console.warn=warn;}
}
// 6. Retry-storm guard: within the cooldown after a 429 (test 5), a slow stage is NOT hedged; it simply finishes.
{
  const calls=new Map<string,number>();
  const result=await evaluateParallel(base,DEFAULT_RUBRIC,async payload=>{
    const input=inputOf(payload),key=input.criterion?.key||'supervisor';
    calls.set(key,(calls.get(key)||0)+1);
    if(key==='format')await sleep(JUDGE_HEDGE_AFTER_MS+1000);
    return reply(answer(input));
  },270000);
  assert.equal(result.total,10);assert.equal(calls.get('format'),1,'no hedge while provider capacity is under pressure');
}
console.log('Judge latency policy PASS: supervisor overlaps criteria, capped attempts, one hedge/retry per stage, hedge paused after 429, no retry below 15s remaining. Offline only.');
