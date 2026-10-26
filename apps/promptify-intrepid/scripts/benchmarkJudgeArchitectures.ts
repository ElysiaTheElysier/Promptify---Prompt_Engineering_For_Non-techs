/**
 * LIVE latency benchmark: Generation (JSON vs stream) and Judge architectures, measured as
 * time-to-first-visible-criterion (TTFC) and total. Calls real Vertex Gemini: run only with approval.
 *   node node_modules/tsx/dist/cli.mjs scripts/benchmarkJudgeArchitectures.ts [reps=3]
 * Every provider call goes through admittedModelRequest (pass-through while PROVIDER_ADMISSION_MODE is unset).
 * A = parallel-v1 (production, 1+5 calls). B/C reuse evaluateParallel unchanged; only their single criteria
 * call is sent as streamGenerateContent so criteria can be shown as each JSON object closes.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {evaluateParallel,type JudgeStrategy} from '../src/services/parallelJudgeService';
import {productionGenerate,productionGenerateStream,readGenerationStream} from '../src/services/productionAiService';
import {admittedModelRequest} from '../src/services/admittedModelService';
import {DEFAULT_RUBRIC} from '../src/services/weightedRubricService';

process.env.AI_PROVIDER||='vertex';
process.env.GOOGLE_CLOUD_PROJECT||='ai-transformation-510302';
process.env.GEMINI_MODEL||='gemini-3.8-flash';
process.env.VERTEX_LOCATION||='global'; // staging location (docs/01_CURRENT_STATE.md)
const MODEL='gemini-3.8-flash';
if(process.env.GEMINI_MODEL!==MODEL)throw Error('Benchmark requires '+MODEL);
const reps=Math.max(1,Math.min(10,Number(process.argv[2])||3));

const sop='[SOP:CSKH:v2] Mục 3.1: Yêu cầu tra soát giao dịch thẻ được xử lý trong 5 ngày làm việc. Mục 3.2: Khách hàng phải được thông báo mã yêu cầu và kênh hotline 1900 1234.';
const sample={
 taskRequirement:'Viết email phản hồi khách hàng khiếu nại giao dịch thẻ bị trừ tiền 2 lần, nêu thời hạn xử lý và mã yêu cầu, trích dẫn SOP.',
 scenario:'Khách hàng Nguyễn Văn A (hư cấu) báo giao dịch 1.200.000đ bị trừ 2 lần ngày 20/10.',
 controlData:sop,
 learnerPrompt:'Bạn là chuyên viên CSKH ngân hàng. Dựa trên SOP được cấp, viết email phản hồi khách hàng Nguyễn Văn A về giao dịch 1.200.000đ bị trừ 2 lần ngày 20/10. Yêu cầu: (1) xin lỗi ngắn gọn, (2) nêu thời hạn xử lý theo SOP, (3) cung cấp mã yêu cầu TS-0001 và hotline, (4) trích dẫn [SOP:CSKH:v2] cho từng dữ kiện. Trình bày dạng bảng Markdown gồm 2 cột: Nội dung | Nguồn. Ví dụ một dòng: | Thời hạn xử lý 5 ngày làm việc | [SOP:CSKH:v2] Mục 3.1 |',
 language:'vi' as const,
};
const settings={temperature:1,topP:0.95,maxOutputTokens:2048};

const stageOf=(payload:any)=>{try{return JSON.parse(payload.contents[0].parts[0].text).stage as string;}catch{return 'unknown';}};
/** Counts criterion objects closed inside "criteria" (root=1, criteria=2, criterion=3), ignoring braces in strings. */
function criterionScanner(onClose:()=>void){
 let depth=0,inString=false,escaped=false;
 return (text:string)=>{for(const ch of text){
  if(inString){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')inString=false;continue;}
  if(ch==='"')inString=true;else if(ch==='{')depth++;else if(ch==='}'){if(depth===3)onClose();depth--;}
 }};
}

type Event={t:number;what:string};
async function judge(strategy:JudgeStrategy,stream:boolean){
 const started=performance.now(),events:Event[]=[],mark=(what:string)=>events.push({t:Math.round(performance.now()-started),what});
 let calls=0;
 const call=async(payload:any,timeoutMs?:number)=>{
  calls++;
  const stage=stageOf(payload),timeout=timeoutMs??50000;
  if(stream&&(stage==='criteria'||stage==='integrated')){
   // Ask for the verdict before criteria so a streamed integrated call can gate early.
   const schema=payload.generationConfig.responseSchema;
   const ordered={...payload,generationConfig:{...payload.generationConfig,responseSchema:{...schema,propertyOrdering:Object.keys(schema.properties).sort((a,b)=>Number(a==='criteria')-Number(b==='criteria'))}}};
   const response=await admittedModelRequest(MODEL,'streamGenerateContent',ordered,timeout);
   if(!response.ok||!response.body)throw Error(stage+' HTTP '+response.status+' '+(await response.text()).slice(0,300));
   let seen='',verdict=stage!=='integrated';const scan=criterionScanner(()=>mark('criterion'));
   const data=await readGenerationStream(response.body,text=>{if(!seen)mark('ttft:'+stage);seen+=text;if(!verdict&&/"taskAttempt"\s*:\s*(true|false)/.test(seen)){verdict=true;mark('verdict');}scan(text);});
   const parts=data.candidates[0].content.parts;mark('done:'+stage);
   return {output:parts.filter((p:any)=>!p.thought).map((p:any)=>p.text).join(''),model:MODEL,tokens:data.usageMetadata?.totalTokenCount||0};
  }
  const response=await admittedModelRequest(MODEL,'generateContent',payload,timeout);
  const data:any=await response.json();
  if(!response.ok)throw Error(stage+' HTTP '+response.status+' '+JSON.stringify(data).slice(0,300));
  const parts=data.candidates?.[0]?.content?.parts||[];
  mark(stage==='criterion'?'criterion':'done:'+stage);
  return {output:parts.filter((p:any)=>!p.thought).map((p:any)=>p.text).join(''),model:MODEL,tokens:data.usageMetadata?.totalTokenCount||0};
 };
 let total:number|undefined,error:string|undefined,score:number|undefined;
 try{const result:any=await evaluateParallel({...sample,generatedOutput:generated},DEFAULT_RUBRIC,call,50000,strategy);total=Math.round(performance.now()-started);score=result.total;}
 catch(cause){error=(cause as Error).message.slice(0,300);}
 const crit=events.filter(e=>e.what==='criterion').map(e=>e.t);
 // A criterion is only shown once the task-alignment verdict is known (supervisor call, or the streamed verdict for C).
 const gate=events.find(e=>e.what==='done:supervisor'||e.what==='verdict')?.t??0;
 const visible=crit.map(t=>Math.max(t,gate));
 return {name:(stream?'stream:':'json:')+strategy,ttfc:visible.length?Math.min(...visible):undefined,lastCriterion:visible.length?Math.max(...visible):undefined,total,score,error,calls,events};
}

let generated='';
const rows:any[]=[];
for(let rep=1;rep<=reps;rep++){
 const body={prompt:sample.learnerPrompt,inputContext:sop,systemInstruction:'Never invent business data or citations.',settings};
 let t=performance.now();
 const json=await productionGenerate(body as any).catch(e=>({error:(e as Error).message}));
 rows.push({rep,name:'generation:json',ttft:undefined,total:Math.round(performance.now()-t),error:(json as any).error});
 t=performance.now();let ttft:number|undefined;
 const streamed=await productionGenerateStream(body as any,()=>{ttft??=Math.round(performance.now()-t);}).catch(e=>({error:(e as Error).message}));
 rows.push({rep,name:'generation:stream',ttft,total:Math.round(performance.now()-t),error:(streamed as any).error});
 generated=(streamed as any).output||(json as any).output||generated;
 if(!generated)throw Error('No generated output to judge: '+((streamed as any).error||(json as any).error));
 // Rotate order so warm-up or provider drift does not favour one architecture.
 const plans:[JudgeStrategy,boolean][]=[['parallel-v1',false],['consolidated-v1',true],['integrated-v1',true]];
 for(let i=0;i<plans.length;i++){const [s,st]=plans[(i+rep)%plans.length];rows.push({rep,...await judge(s,st)});console.log(JSON.stringify(rows.at(-1)));}
}

const median=(v:number[])=>{if(!v.length)return undefined;const s=[...v].sort((a,b)=>a-b);return s[Math.floor((s.length-1)/2)];};
const names=[...new Set(rows.map(r=>r.name))];
const summary=names.map(name=>{const rs=rows.filter(r=>r.name===name&&!r.error);const pick=(k:string)=>rs.map(r=>r[k]).filter((v:any)=>typeof v==='number');
 return {name,ok:rs.length+'/'+rows.filter(r=>r.name===name).length,ttftMs:median(pick('ttft')),ttfcMs:median(pick('ttfc')),lastCriterionMs:median(pick('lastCriterion')),totalMs:median(pick('total')),maxTotalMs:pick('total').length?Math.max(...pick('total')):undefined,calls:median(pick('calls')),scores:pick('score').join(',')};});
console.table(summary);
const dir='outputs/judge-latency-benchmark-'+new Date().toISOString().slice(0,10);
mkdirSync(dir,{recursive:true});
writeFileSync(dir+'/results.json',JSON.stringify({model:MODEL,location:process.env.VERTEX_LOCATION,reps,summary,rows},null,1));
console.log('Saved '+dir+'/results.json');
