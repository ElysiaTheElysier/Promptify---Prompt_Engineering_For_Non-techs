import assert from 'node:assert/strict';
import { productionGenerate } from '../src/services/productionAiService';
import { createRebuildRunService } from '../src/services/rebuildRunService';
import { AiServerError } from '../src/services/apiServerService';

const id='a5000000-0000-4000-8000-000000000001';
const originalFetch=globalThis.fetch;
const previous={GEMINI_API_KEY:process.env.GEMINI_API_KEY,GEMINI_MODEL:process.env.GEMINI_MODEL,GEMINI_FALLBACK_MODEL:process.env.GEMINI_FALLBACK_MODEL};
process.env.GEMINI_API_KEY='offline-only';process.env.GEMINI_MODEL='gemini-2.5-flash';delete process.env.GEMINI_FALLBACK_MODEL;
try {
  for (const response of ['not-json','null','{}',JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:{text:'bad'}}}]}),JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[null]}}]})]) {
    globalThis.fetch=async()=>new Response(response,{status:200});
    await assert.rejects(()=>productionGenerate({prompt:'Valid prompt'}),(e:any)=>e.statusCode===502);
  }
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'Valid output'}]},groundingMetadata:{groundingChunks:[null,{web:{uri:'https://example.org'}}]}}]}));
  assert.equal((await productionGenerate({prompt:'Valid prompt'})).groundingSources.length,1);
} finally {
  globalThis.fetch=originalFetch;
  for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
}

let begins=0,providers=0;
const input={classId:id,lessonId:id,requestId:id,prompt:'Valid prompt'};
const run=(lesson:any)=>createRebuildRunService(async()=>({subject:id,lesson,server:{rpc:async(name:string)=>{if(name==='rebuild_begin_run'){begins++;return {data:{}};}return {data:{attempt:{id}}};}}} as any),async()=>{providers++;return {output:'Output'} as any;});
await run({}).generateSavedRun('Bearer offline',input);
assert.equal(providers,1,'Missing optional context should not crash');
await assert.rejects(()=>run({sample_input_context:'x'.repeat(99999),lesson_resources:[{content:'extra'}]}).generateSavedRun('Bearer offline',input),(e:any)=>e.statusCode===422);
assert.equal(begins,1,'Oversize full context must be rejected before budget/run allocation');
assert.equal(providers,1,'Oversize full context must never reach AI');

let finished=0,deleted=0;
const filters:any[]=[];
const rows:any={prompt_attempts:{id,learner_id:id,prompt_text:'Saved',ai_output:'Saved output'},users:{id},learners:{id},rebuild_runs:{snapshot:{}}};
const client:any={from:(table:string)=>{const q:any={select:()=>q,delete:()=>{deleted++;return q;},eq:(key:string,value:any)=>{if(table==='rebuild_judge_claims')filters.push([key,value]);return q;},is:(key:string,value:any)=>{filters.push([key,value]);return Promise.resolve({error:null});},single:async()=>({data:rows[table]})};return q;},rpc:async(name:string)=>{if(name==='rebuild_claim_judge')return {data:{status:'claimed'}};finished++;return {data:{}};}};
for(const status of [502,429,504]){
  const before=deleted;
  const service=createRebuildRunService(async()=>({reader:client,server:client,subject:id,lesson:{}} as any),undefined,async()=>{throw new AiServerError('Offline rejection',status);});
  await assert.rejects(()=>service.evaluateSavedRun('Bearer offline',{...input,attemptId:id}),(e:any)=>e.statusCode===status);
  assert.equal(deleted,before+(status===504?0:1),'Only definite failures release a claim');
}
assert.equal(finished,0,'Never persist an evaluation after provider failure');
assert.ok(filters.some(([key,value])=>key==='subject'&&value===id));
assert.ok(filters.some(([key,value])=>key==='attempt_id'&&value===id));
assert.ok(filters.some(([key,value])=>key==='claim_id'&&typeof value==='string'));
assert.ok(filters.some(([key,value])=>key==='completed_at'&&value===null));
console.log('Backend failure recovery PASS: malformed provider responses are definite 502, context is bounded before allocation, scoped Judge cleanup preserves uncertain outcomes. Offline only.');
