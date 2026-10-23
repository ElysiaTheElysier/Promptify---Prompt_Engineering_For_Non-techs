import assert from 'node:assert/strict';
import {evaluateParallel,JUDGE_RETRY_MIN_REMAINING_MS} from '../src/services/parallelJudgeService';
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
console.log('Judge latency policy PASS: supervisor overlaps criteria, no retry below 15s remaining, one retry otherwise. Offline only.');
