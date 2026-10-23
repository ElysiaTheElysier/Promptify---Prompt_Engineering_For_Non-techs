// Explicit, capped synthetic provider experiment. No SQL/Firebase writes or auth bypass.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {evaluateParallel} from '../src/services/parallelJudgeService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
import {normalizeModelPayload} from '../src/services/vertexAiService';
import {AiServerError} from '../src/services/apiServerService';
if(!process.argv.includes('--staging-synthetic-ai'))throw Error('Explicit opt-in required');
const root='outputs/staging-release-2026-10-19-judge-bounded';fs.mkdirSync(root,{recursive:true});
const credentials=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia'],{encoding:'utf8',windowsHide:true});
if(credentials.status!==0||!credentials.stdout.trim())throw Error('Cloud operator session unavailable');
let token=credentials.stdout.trim(),calls=0;const results:any[]=[];
const prompt='[Role]: Operations analyst. [Task]: Classify fictional ticket 43 using only the approved SOP. [Context]: Ticket 43 asks for a delivery-status update. [Constraint]: Do not invent facts; cite the section. [Format]: Markdown table: Ticket, Priority, Deadline, Source. [Example]: | 41 | normal | 2 business days | [SOP:QA:v1] Section 1 |.';
const body={language:'en' as const,taskRequirement:'As an operations analyst, classify fictional ticket 43 as normal and provide the update deadline in a Markdown table with Ticket, Priority, Deadline, Source. Follow the supplied example and use only the approved fictional context.',scenario:'Fictional ticket 43 asks for a delivery-status update.',controlData:'[SOP:QA:v1] Section 1: Delivery-status requests are normal priority; send an update within 2 business days. This is fictional training data, not real company policy. Example row: | 41 | normal | 2 business days | [SOP:QA:v1] Section 1 |.',learnerPrompt:prompt,generatedOutput:'| Ticket | Priority | Deadline | Source |\n|---|---|---|---|\n| 43 | normal | 2 business days | [SOP:QA:v1] Section 1 |',lessonRubric:DEFAULT_RUBRIC};
try{
 for(let repeat=1;repeat<=2;repeat++){
  const deadline=Date.now()+50000;
  try{
   const evaluation=await evaluateParallel(body,DEFAULT_RUBRIC,async (payload,timeoutMs)=>{
    if(Date.now()>=deadline)throw new AiServerError('Shared deadline exceeded',504);
    if(++calls>24)throw Error('Synthetic provider call cap reached');
    let response:Response;
    try{response=await fetch('https://aiplatform.googleapis.com/v1/projects/ai-transformation-510302/locations/global/publishers/google/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(normalizeModelPayload('gemini-3.8-flash',payload)),signal:AbortSignal.timeout(Math.max(1,Math.min(timeoutMs??50000,deadline-Date.now())))});}catch{throw new AiServerError('Provider outcome uncertain',504);}
    if(!response.ok)throw new AiServerError('Provider rejected request',response.status===429?429:502);
    let data:any;try{data=await response.json();}catch(error){throw new AiServerError('Provider body incomplete',['AbortError','TimeoutError'].includes((error as Error).name)?504:502);}const candidate=data.candidates?.[0];if(candidate?.finishReason!=='STOP')throw new AiServerError('Incomplete provider result',502);
    return {model:'gemini-3.8-flash',output:(candidate.content?.parts||[]).filter((p:any)=>!p.thought).map((p:any)=>p.text||'').join(''),tokens:data.usageMetadata?.totalTokenCount};
   });
   results.push({repeat,ok:true,total:evaluation.total,criteria:evaluation.criteria.map(c=>({key:c.key,score:c.score,max:c.max})),judge:evaluation.judge});
  }catch(error){results.push({repeat,ok:false,status:(error as any).statusCode||502});break;}
 }
 const report={at:new Date().toISOString(),identity:'demo.biz operator OAuth; not runtime or authenticated app E2E',scope:'synthetic provider experiment; no data writes',model:'gemini-3.8-flash',calls,results};
 fs.writeFileSync(root+'/five-worker-recovery-provider-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(results.length!==2||results.some(r=>!r.ok))process.exitCode=1;
}finally{token='';}

