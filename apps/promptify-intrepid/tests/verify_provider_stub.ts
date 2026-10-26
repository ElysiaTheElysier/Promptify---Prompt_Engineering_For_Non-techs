import assert from 'node:assert/strict';
// Staging-only provider stub: guard, Gemini-shaped bodies through the REAL production provider path
// (productionEvaluate / productionGenerateStream / gemini() retry), capacity 429s, hangs -> 504. Offline only.
process.env.NODE_ENV='test';process.env.AI_PROVIDER='stub';process.env.GEMINI_MODEL='gemini-3.8-flash';process.env.JUDGE_STRATEGY='parallel-v1';
process.env.STUB_LATENCY_SCALE='0.01';delete process.env.PROVIDER_ADMISSION_MODE;delete process.env.GEMINI_FALLBACK_MODEL;
const {assertProviderStubAllowed,providerStubStats,resetProviderStubStats,ProviderStubError}=await import('../src/services/providerStubService');
const {productionEvaluate,productionGenerateStream}=await import('../src/services/productionAiService');
const {DEFAULT_RUBRIC,validateWeightedEvaluation}=await import('../src/services/weightedRubricService');
const {ProviderSetupError,modelRequest}=await import('../src/services/vertexAiService');

// 1. Guard: only tests, or the staging project with an explicit acknowledgement.
assert.throws(()=>assertProviderStubAllowed({NODE_ENV:'production',GOOGLE_CLOUD_PROJECT:'ai-transformation-510302'}),ProviderStubError);
assert.throws(()=>assertProviderStubAllowed({NODE_ENV:'production',GOOGLE_CLOUD_PROJECT:'another-project',PROVIDER_STUB_ACK:'staging-load-test-only'}),ProviderStubError);
assert.throws(()=>assertProviderStubAllowed({GOOGLE_CLOUD_PROJECT:'ai-transformation-510302',PROVIDER_STUB_ACK:'yes'}),ProviderStubError);
assert.doesNotThrow(()=>assertProviderStubAllowed({GOOGLE_CLOUD_PROJECT:'ai-transformation-510302',PROVIDER_STUB_ACK:'staging-load-test-only'}));
assert.doesNotThrow(()=>assertProviderStubAllowed({NODE_ENV:'test'}));

const body={learnerPrompt:'Classify ticket 42 with the SOP.',generatedOutput:'| 42 | normal |',taskRequirement:'Classify.',scenario:'Fictional',controlData:'[SOP:QA:v1]',lessonRubric:DEFAULT_RUBRIC,language:'vi' as const};
// Refusals reach callers as ProviderSetupError (definite failure, nothing sent).
await assert.rejects(()=>modelRequest('gemini-3.8-flash','predict',{},1000),ProviderSetupError);
// 2. Real Judge path: six calls, valid anchors, weighted-v1 result, deterministic per prompt.
{
  resetProviderStubStats();
  const a:any=await productionEvaluate(body as any),b:any=await productionEvaluate(body as any);
  assert.equal(providerStubStats().calls,12);assert.equal(a.criteria.length,5);assert.equal(a.total,b.total);
  validateWeightedEvaluation({criteria:a.criteria,strengths:a.strengths,improvements:a.improvements,nextHint:a.nextHint},DEFAULT_RUBRIC);
  assert.equal(a.judge.version,'parallel-v1');assert.equal(a.judge.providerAttempts,6);
}
// 3. Capacity: above STUB_CAPACITY calls get 429; gemini() retries once, the stage retries once; nothing hangs.
{
  process.env.STUB_CAPACITY='2';process.env.STUB_LATENCY_SCALE='0.05';resetProviderStubStats();
  const results=await Promise.allSettled(Array.from({length:6},()=>productionEvaluate(body as any)));
  const s=providerStubStats();
  assert.ok(s.rejected429>0,'over capacity produces 429s');assert.ok(s.peakInFlight<=36);
  for(const r of results)if(r.status==='rejected')assert.ok([429,503].includes((r.reason as any).statusCode),'capacity failures surface as 429/503');
  assert.ok(s.calls<=6*6*4,'bounded: at most 2 provider tries x 2 stage tries per stage');
  delete process.env.STUB_CAPACITY;
}
// 4. Hang: the attempt times out (504 uncertain), never a fabricated answer.
{
  process.env.STUB_HANG_RATE='1';resetProviderStubStats();
  await assert.rejects(()=>productionEvaluate(body as any,1500),(e:any)=>e.statusCode===504);
  assert.equal(providerStubStats().ok,0);
  delete process.env.STUB_HANG_RATE;
}
// 5. Generation stream through the stub (SSE shape).
{
  let text='';
  const out:any=await productionGenerateStream({prompt:'Hello',systemInstruction:'x',inputContext:'',settings:{temperature:1,topP:0.95,maxOutputTokens:512}} as any,d=>{text+=d;});
  assert.equal(out.streamed,true);assert.match(text,/Stub response/);assert.equal(text,out.output);
}
console.log('Provider stub PASS: staging-only guard, real Judge/stream path, capacity 429 with bounded retries, hang -> 504, no Gemini.');
process.exit(0);
