import assert from 'node:assert/strict';
import {productionGenerate} from '../src/services/productionAiService';
const originalFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_MODEL,oldFallback=process.env.GEMINI_FALLBACK_MODEL;
process.env.GEMINI_API_KEY='offline-test-only';process.env.GEMINI_MODEL='gemini-2.5-flash';delete process.env.GEMINI_FALLBACK_MODEL;
let payload:any,calls=0,status=200,finishReason='STOP';
globalThis.fetch=async(_url:any,options:any)=>{calls++;payload=JSON.parse(options.body);return new Response(JSON.stringify({candidates:[{finishReason,content:{parts:[{thought:true,text:'Provider public summary'},{text:'Authorized answer'}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/source',title:'Public source'}},{web:{uri:'javascript:unsafe',title:'Unsafe'}}]}}],usageMetadata:{totalTokenCount:42}}),{status});};
try{
 const r=await productionGenerate({prompt:'Return the authorized deadline.',inputContext:'15 minutes',settings:{temperature:0.2,topP:0.8,maxOutputTokens:512,stopSequences:['END'],searchGrounding:true}});
 assert.equal(r.output,'Authorized answer');assert.equal(r.reasoningSummary,'Provider public summary');assert.equal(r.tokens,42);assert.equal(r.groundingSources.length,1);
 assert.equal(payload.generationConfig.temperature,0.2);assert.equal(payload.generationConfig.maxOutputTokens,512);assert.equal(payload.generationConfig.thinkingConfig.includeThoughts,true);assert.deepEqual(payload.tools,[{googleSearch:{}}]);assert.ok(!('model' in payload.generationConfig));
 const before=calls;await assert.rejects(()=>productionGenerate({prompt:'Valid',settings:{model:'gemini-unapproved'}}),/not enabled/);assert.equal(calls,before);
 status=429;await assert.rejects(()=>productionGenerate({prompt:'Valid'}),/capacity/);status=200;finishReason='MAX_TOKENS';await assert.rejects(()=>productionGenerate({prompt:'Valid'}),/incomplete/);
 console.log('Provider contract passed: actual parameter payload, search tool, summary separation, safe source links, unapproved-model rejection and quota/incomplete failures. Offline responses only.');
}finally{globalThis.fetch=originalFetch;for(const [key,value] of Object.entries({GEMINI_API_KEY:oldKey,GEMINI_MODEL:oldModel,GEMINI_FALLBACK_MODEL:oldFallback})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
