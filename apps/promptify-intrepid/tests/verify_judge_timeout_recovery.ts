import assert from 'node:assert/strict';
import {productionEvaluate} from '../src/services/productionAiService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
const saved={fetch:globalThis.fetch,timeout:AbortSignal.timeout,key:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,strategy:process.env.JUDGE_STRATEGY,provider:process.env.AI_PROVIDER,fallback:process.env.GEMINI_FALLBACK_MODEL};
process.env.GEMINI_API_KEY='offline-only';process.env.GEMINI_MODEL='gemini-3.8-flash';process.env.JUDGE_STRATEGY='parallel-v1';delete process.env.AI_PROVIDER;delete process.env.GEMINI_FALLBACK_MODEL;
const budgets:number[]=[],calls=new Map<string,number>();let failure:'network'|'body'|'invalid'='network';
AbortSignal.timeout=(ms:number)=>{budgets.push(ms);return saved.timeout(ms);};
globalThis.fetch=async(url,options:any)=>{
 assert.ok(String(url).includes('gemini-3.8-flash:generateContent'));
 const payload=JSON.parse(options.body),input=JSON.parse(payload.contents[0].parts[0].text),key=input.criterion?.key||'supervisor';
 calls.set(key,(calls.get(key)||0)+1);
 if(key==='oneshot'&&calls.get(key)===1){
  if(failure==='network')throw new DOMException('Offline network timeout','TimeoutError');
  if(failure==='body')return {ok:true,status:200,json:async()=>{throw new DOMException('Offline body timeout','TimeoutError');}} as Response;
  return new Response('not-json');
 }
 const value=key==='supervisor'?{taskAttempt:true,summaryEn:'Task requested.',summaryVi:'Đã yêu cầu bài.'}:{key,score:input.criterion.maxScore,reasonEn:'Task supported.',reasonVi:'Có căn cứ.',improvementEn:'Preserve the evidence.',improvementVi:'Giữ lại căn cứ.'};
 return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]}));
};
try{
 for(const kind of ['network','body'] as const){
  calls.clear();budgets.length=0;failure=kind;
  const result=await productionEvaluate({learnerPrompt:'Perform the approved fictional task.',generatedOutput:'Fictional output',lessonRubric:DEFAULT_RUBRIC,language:'en'});
  assert.equal(result.total,10);assert.equal(calls.get('oneshot'),2);assert.equal([...calls.values()].reduce((a,b)=>a+b,0),7);
  assert.ok(budgets.every(ms=>ms>0&&ms<=50000),'per-call budgets stay bounded by the shared 50s deadline');
  assert.ok(budgets.some(ms=>ms>24000),'a first attempt gets the remaining deadline instead of a 12s cut');
 }
 calls.clear();failure='invalid';await assert.rejects(()=>productionEvaluate({learnerPrompt:'Perform the approved task.',generatedOutput:'Fictional output',lessonRubric:DEFAULT_RUBRIC}),error=>(error as any).statusCode===502);
 assert.equal(calls.get('oneshot'),1,'invalid JSON is not a timeout and must not retry');
 console.log('PASS bounded Judge network/body timeout recovery, exact model, full rubric, no invalid-output retry');
}finally{
 globalThis.fetch=saved.fetch;AbortSignal.timeout=saved.timeout;
 for(const [name,value]of Object.entries({GEMINI_API_KEY:saved.key,GEMINI_MODEL:saved.model,JUDGE_STRATEGY:saved.strategy,AI_PROVIDER:saved.provider,GEMINI_FALLBACK_MODEL:saved.fallback})){if(value===undefined)delete process.env[name];else process.env[name]=value;}
}
