import assert from 'node:assert/strict';
import {productionEvaluate,productionGenerate} from '../src/services/productionAiService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
const saved={fetch:globalThis.fetch,key:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,fallback:process.env.GEMINI_FALLBACK_MODEL};
process.env.GEMINI_API_KEY='offline';process.env.GEMINI_MODEL='gemini-3-flash-preview';delete process.env.GEMINI_FALLBACK_MODEL;
let calls=0,taskAttempt=false,generation=false;
globalThis.fetch=async(_url:any,options:any)=>{
 calls++;const p=JSON.parse(options.body);
 if(generation){assert.match(p.systemInstruction.parts[0].text,/not a tutor/);assert.match(p.systemInstruction.parts[0].text,/Do not infer the exercise/);assert.equal(p.generationConfig.thinkingConfig.thinkingLevel,'low');}
 else{assert.equal(p.generationConfig.responseSchema.properties.taskAttempt.type,'BOOLEAN');assert.match(JSON.parse(p.contents[0].parts[0].text).scoringPolicy,/Never credit facts/);}
 const raw={taskAttempt,criteria:Object.fromEntries(DEFAULT_RUBRIC.map(c=>[c.key,{score:c.weight/10,reasonEn:'Evidence',reasonVi:'Căn cứ'}])),strengthsEn:[],strengthsVi:[],improvementsEn:['Specify task'],improvementsVi:['Nêu nhiệm vụ'],nextHintEn:'State task.',nextHintVi:'Nêu nhiệm vụ.'};
 return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:generation?'Hello. What task should I perform?':JSON.stringify(raw)}]}}]}));
};
try{
 const base:any={generatedOutput:'15 minutes (Section 1); 2 business days (Section 2).',lessonRubric:DEFAULT_RUBRIC,taskRequirement:'Extract deadlines and cite sections.',language:'en'};
 for(const prompt of ['hi','Hi!','hello','xin chào','test']){const e=await productionEvaluate({...base,learnerPrompt:prompt});assert.equal(e.total,0);assert.ok(e.feedback.vi.nextHint);}
 assert.equal(calls,0,'greetings must not consume a provider call');
 assert.equal((await productionEvaluate({...base,learnerPrompt:'Write a poem about cats.'})).total,0,'off-task output must not earn volunteered fact credit');
 taskAttempt=true;assert.equal((await productionEvaluate({...base,learnerPrompt:'Extract the response deadlines from the SOP and cite each section.'})).total,10);
 generation=true;await productionGenerate({prompt:'hi',inputContext:'15 minutes; 2 business days'});
 console.log('Task alignment regression PASS: greetings zero/no AI cost, off-task gate, valid-task schema and generation boundary/low thinking.');
}finally{globalThis.fetch=saved.fetch;for(const [k,v]of Object.entries({GEMINI_API_KEY:saved.key,GEMINI_MODEL:saved.model,GEMINI_FALLBACK_MODEL:saved.fallback})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
