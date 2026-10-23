// Explicit bounded synthetic Vertex check. No Firebase/SQL/application writes.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {evaluateParallel} from '../src/services/parallelJudgeService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';
import {normalizeModelPayload} from '../src/services/vertexAiService';
if(!process.argv.includes('--staging-synthetic-ai'))throw Error('Explicit staging synthetic AI opt-in required');
const output='outputs/staging-release-2026-10-19-ai';fs.mkdirSync(output,{recursive:true});
const credentials=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia'],{encoding:'utf8',windowsHide:true});
if(credentials.status!==0||!credentials.stdout.trim())throw Error('Operator cloud session unavailable');
let token=credentials.stdout.trim(),calls=0;const responses:any[]=[];
const call=async(payload:unknown)=>{
 if(++calls>22)throw Error('Bounded synthetic call budget exhausted');
 const response=await fetch('https://aiplatform.googleapis.com/v1/projects/ai-transformation-510302/locations/global/publishers/google/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(normalizeModelPayload('gemini-3.8-flash',payload)),signal:AbortSignal.timeout(45000)});
 if(!response.ok){const data:any=await response.json().catch(()=>({}));throw Error('Vertex HTTP '+response.status+' '+String(data.error?.status||'')+' '+String(data.error?.message||'').slice(0,400));}
 const data:any=await response.json(),candidate=data.candidates?.[0];if(candidate?.finishReason!=='STOP')throw Error('Provider output incomplete: '+candidate?.finishReason);
 const result={model:'gemini-3.8-flash',output:(candidate.content?.parts||[]).filter((p:any)=>!p.thought).map((p:any)=>p.text||'').join(''),tokens:data.usageMetadata?.totalTokenCount};
 const input=JSON.parse((payload as any).contents[0].parts[0].text);responses.push({stage:input.stage,key:input.criterion?.key,result:result.output});return result;
};
const body={language:'en' as const,taskRequirement:'As an operations analyst, classify fictional ticket 42 as normal and provide the update deadline in a Markdown table with Ticket, Priority, Deadline, Source. Follow the supplied example.',scenario:'Fictional ticket 42 asks for a delivery status update.',controlData:'[SOP:QA:v1] Section 1: Delivery-status requests are normal priority; send an update within 2 business days. Example row: | 41 | normal | 2 business days | [SOP:QA:v1] Section 1 |.',learnerPrompt:'[Role]: Operations analyst. [Task]: Classify fictional ticket 42 using only the approved SOP. [Constraint]: Do not invent facts; cite the section. [Format]: Markdown table: Ticket, Priority, Deadline, Source. [Example]: | 41 | normal | 2 business days | [SOP:QA:v1] Section 1 |.',generatedOutput:'| Ticket | Priority | Deadline | Source |\n|---|---|---|---|\n| 42 | normal | 2 business days | [SOP:QA:v1] Section 1 |',lessonRubric:DEFAULT_RUBRIC};
const results:any[]=[];
try{
 for(let repeat=1;repeat<=(process.argv.includes('--once')?1:3);repeat++){
  const result=await evaluateParallel(body,DEFAULT_RUBRIC,call);
  results.push({repeat,total:result.total,criteria:result.criteria.map(c=>({key:c.key,score:c.score,max:c.max})),feedback:result.feedback,judge:result.judge});
  fs.writeFileSync(output+'/live-parallel-progress.json',JSON.stringify({calls,results},null,2));
 }
 const totals=results.map(r=>r.total);
 fs.writeFileSync(output+'/live-parallel-checks.json',JSON.stringify({at:new Date().toISOString(),identity:'demo.biz operator OAuth; not runtime identity or authenticated application E2E',fictionalDataOnly:true,model:'gemini-3.8-flash',location:'global',calls,totalScoreSpread:Math.max(...totals)-Math.min(...totals),results},null,2));
 console.log(JSON.stringify({status:'success',calls,totals,ms:results.map(r=>r.judge.ms),scoreSpread:Math.max(...totals)-Math.min(...totals)}));
}catch(error){const message=(error as Error).message;fs.writeFileSync(output+'/live-parallel-error.json',JSON.stringify({at:new Date().toISOString(),calls,error:message,detail:(error as any).cause?.message,completedResults:results,responses},null,2));console.error(message,(error as any).cause?.message||'');process.exitCode=1;}finally{token='';}
