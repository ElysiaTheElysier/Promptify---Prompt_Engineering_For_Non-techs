/**
 * LIVE benchmark of trainer-defined rubrics (3/5/8 criteria) on the production Judge (parallel-v1, gemini-3.8-flash).
 * Calls real Vertex Gemini: run only after the owner approved the budget.
 *   node node_modules/tsx/dist/cli.mjs scripts/benchmarkDynamicRubric.ts [reps=3]
 * Grades fixed learner prompts/outputs (no Generation calls) that carry human reference levels per criterion, sequentially
 * (not a load test). Hard caps: BENCH_MAX_CALLS (default 300) and BENCH_MAX_USD (default 2) stop the run before the next grade.
 * Cost uses Vertex list price for gemini-3.8-flash through 2026-12-31: $0.75/1M input, $3.75/1M output incl. thinking.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {evaluateParallel} from '../src/services/parallelJudgeService';
import {admittedModelRequest} from '../src/services/admittedModelService';
import {validateRubric} from '../src/services/weightedRubricService';
import type {RubricCriterion} from '../src/types/production';

process.env.AI_PROVIDER||='vertex';
process.env.GOOGLE_CLOUD_PROJECT||='ai-transformation-510302';
process.env.GEMINI_MODEL||='gemini-3.8-flash';
process.env.VERTEX_LOCATION||='global';
const MODEL='gemini-3.8-flash',USD_IN=0.75/1e6,USD_OUT=3.75/1e6;
if(process.env.GEMINI_MODEL!==MODEL)throw Error('Benchmark requires '+MODEL);
const reps=Math.max(1,Math.min(5,Number(process.argv[2])||3));
const maxCalls=Number(process.env.BENCH_MAX_CALLS||300),maxUsd=Number(process.env.BENCH_MAX_USD||2);

const sop='[SOP:CSKH:v2] Mục 3.1: Yêu cầu tra soát giao dịch thẻ được xử lý trong 5 ngày làm việc. Mục 3.2: Khách hàng phải được thông báo mã yêu cầu và hotline 1900 1234. Mục 3.3: Không cam kết hoàn tiền trước khi tra soát xong.';
const task={taskRequirement:'Viết email phản hồi khách hàng khiếu nại giao dịch thẻ bị trừ tiền 2 lần: xin lỗi, nêu thời hạn xử lý và mã yêu cầu theo SOP, trích dẫn mục SOP.',
 scenario:'Khách hàng Nguyễn Văn A (hư cấu) báo giao dịch 1.200.000đ bị trừ 2 lần ngày 20/10. Mã yêu cầu TS-0001.',controlData:sop,language:'vi' as const};
const c=(key:string,label:string,description:string,weight:number):RubricCriterion=>({key,label,description,weight,active:true});
// Every criterion is gradeable from these samples, so reference levels are meaningful.
const all={
 deadline:c('c_deadline','Thời hạn theo SOP','Nêu đúng thời hạn xử lý 5 ngày làm việc theo SOP Mục 3.1.',0),
 ticket:c('c_ticket','Mã yêu cầu và hotline','Cung cấp mã yêu cầu TS-0001 và hotline 1900 1234 theo Mục 3.2.',0),
 citation:c('c_citation','Trích dẫn SOP','Trích dẫn rõ mục SOP (ví dụ Mục 3.1, 3.2) cho từng thông tin quy định.',0),
 apology:c('c_apology','Lời xin lỗi','Có lời xin lỗi ngắn gọn, đúng mực ở đầu email.',0),
 no_promise:c('c_no_promise','Không hứa hoàn tiền','Không cam kết hoàn tiền trước khi tra soát xong (Mục 3.3).',0),
 tone:c('c_tone','Giọng văn chuyên nghiệp','Xưng hô lịch sự, không đổ lỗi cho khách hàng.',0),
 structure:c('c_structure','Cấu trúc email','Có chào, nội dung, bước tiếp theo và ký tên.',0),
 facts:c('c_facts','Đúng dữ kiện','Nêu đúng số tiền 1.200.000đ và ngày 20/10 của giao dịch.',0),
};
const pick=(weights:Record<keyof typeof all,number>)=>validateRubric(Object.entries(weights).map(([k,w])=>({...all[k as keyof typeof all],weight:w})));
const rubrics:Record<string,RubricCriterion[]>={
 R3:pick({deadline:40,ticket:30,citation:30} as any),
 R5:pick({deadline:30,ticket:20,citation:20,apology:15,no_promise:15} as any),
 R8:pick({deadline:13,ticket:13,citation:13,apology:13,no_promise:12,tone:12,structure:12,facts:12}),
};
// Human reference level per criterion as a fraction of max (0, .25, .5, .75, 1). Review these before trusting the quality numbers.
const samples=[
 {id:'strong',prompt:'Bạn là chuyên viên CSKH. Dựa trên SOP được cấp, viết email phản hồi khách hàng Nguyễn Văn A về giao dịch 1.200.000đ bị trừ 2 lần ngày 20/10: xin lỗi, nêu thời hạn và mã yêu cầu, trích dẫn mục SOP, không hứa hoàn tiền.',
  output:'Kính gửi anh Nguyễn Văn A,\n\nChúng tôi thành thật xin lỗi về sự cố giao dịch 1.200.000đ bị trừ 2 lần ngày 20/10. Yêu cầu tra soát của anh (mã TS-0001) sẽ được xử lý trong 5 ngày làm việc (SOP Mục 3.1). Kết quả sẽ được thông báo sau khi tra soát hoàn tất (Mục 3.3). Nếu cần hỗ trợ, anh vui lòng gọi hotline 1900 1234 (Mục 3.2).\n\nTrân trọng,\nBộ phận CSKH',
  ref:{c_deadline:1,c_ticket:1,c_citation:1,c_apology:1,c_no_promise:1,c_tone:1,c_structure:1,c_facts:1}},
 {id:'partial',prompt:'Viết email xin lỗi khách hàng Nguyễn Văn A vì giao dịch bị trừ 2 lần, cho mã yêu cầu.',
  output:'Chào anh A,\n\nXin lỗi anh vì sự cố. Mã yêu cầu của anh là TS-0001. Chúng tôi sẽ sớm hoàn tiền cho anh.\n\nCSKH',
  ref:{c_deadline:0,c_ticket:0.5,c_citation:0,c_apology:1,c_no_promise:0,c_tone:0.75,c_structure:0.75,c_facts:0.25}},
 {id:'weak',prompt:'Trả lời khách hàng bị trừ tiền 2 lần.',
  output:'Giao dịch của bạn đang được kiểm tra. Vui lòng chờ 30 ngày. Lần sau bạn nên kiểm tra kỹ trước khi thanh toán.',
  ref:{c_deadline:0,c_ticket:0,c_citation:0,c_apology:0,c_no_promise:0.75,c_tone:0,c_structure:0,c_facts:0}},
 {id:'off_task',prompt:'Xin chào, hôm nay thời tiết thế nào?',output:'Xin chào! Tôi không có thông tin thời tiết.',ref:null},
];

let calls=0,usd=0,inTok=0,outTok=0;
const errors:Record<string,number>={};
const call=async(payload:any,timeoutMs?:number)=>{
 calls++;
 const response=await admittedModelRequest(MODEL,'generateContent',payload,timeoutMs??50000);
 const data:any=await response.json();
 if(!response.ok){errors['http_'+response.status]=(errors['http_'+response.status]||0)+1;throw Object.assign(Error('HTTP '+response.status+' '+JSON.stringify(data).slice(0,200)),{statusCode:response.status});}
 const u=data.usageMetadata||{},input=u.promptTokenCount||0,output=(u.candidatesTokenCount||0)+(u.thoughtsTokenCount||0);
 inTok+=input;outTok+=output;usd+=input*USD_IN+output*USD_OUT;
 const parts=data.candidates?.[0]?.content?.parts||[];
 return {output:parts.filter((p:any)=>!p.thought).map((p:any)=>p.text).join(''),model:MODEL,tokens:u.totalTokenCount||0};
};
const rows:any[]=[];let stopped='';
outer:for(let rep=1;rep<=reps;rep++)for(const [name,rubric] of Object.entries(rubrics))for(const s of samples){
 if(calls+rubric.length+1>maxCalls||usd>=maxUsd){stopped=`cap reached before ${name}/${s.id}/rep${rep}: calls ${calls}, USD ${usd.toFixed(4)}`;break outer;}
 const before={calls,usd},started=performance.now();
 const row:any={rubric:name,criteria:rubric.length,sample:s.id,rep};
 try{
  const result:any=await evaluateParallel({...task,learnerPrompt:s.prompt,generatedOutput:s.output},rubric,call,50000,'parallel-v1');
  row.ms=Math.round(performance.now()-started);row.total=result.total;row.taskAttempt=result.judge.taskAttempt;row.attempts=result.judge.providerAttempts;
  row.levels=Object.fromEntries(result.criteria.map((x:any)=>[x.key,Math.round(x.score/x.max*100)/100]));
  if(s.ref){const diffs=rubric.map(k=>Math.abs(row.levels[k.key]-(s.ref as any)[k.key]));row.mae=Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length*1000)/1000;
   row.refTotal=Math.round(rubric.reduce((sum,k)=>sum+(s.ref as any)[k.key]*k.weight/10,0)*100)/100;}
 }catch(cause){row.ms=Math.round(performance.now()-started);row.error=(cause as Error).message.slice(0,200);errors.grade_failed=(errors.grade_failed||0)+1;}
 row.calls=calls-before.calls;row.usd=Math.round((usd-before.usd)*1e6)/1e6;rows.push(row);
 console.log(JSON.stringify(row));
}
const pct=(v:number[],p:number)=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(p*s.length))]:undefined;};
const summary=Object.keys(rubrics).map(name=>{
 const r=rows.filter(x=>x.rubric===name),ok=r.filter(x=>!x.error),graded=ok.filter(x=>x.mae!==undefined);
 const byRep=(id:string)=>ok.filter(x=>x.sample===id).map(x=>x.total);
 const spread=(['strong','partial','weak'] as const).map(id=>{const v=byRep(id);return v.length?Math.max(...v)-Math.min(...v):0;});
 const orderOk=[...new Set(ok.map(x=>x.rep))].filter(rep=>{const t=(id:string)=>ok.find(x=>x.rep===rep&&x.sample===id)?.total;const a=t('strong'),b=t('partial'),w=t('weak');return a!==undefined&&b!==undefined&&w!==undefined&&a>b&&b>=w;}).length;
 return {rubric:name,criteria:rubrics[name].length,grades:r.length,failed:r.length-ok.length,errorRate:r.length?(r.length-ok.length)/r.length:0,
  p50ms:pct(ok.map(x=>x.ms),0.5),p95ms:pct(ok.map(x=>x.ms),0.95),callsPerGrade:r.length?r.reduce((a,x)=>a+x.calls,0)/r.length:0,
  usdPerGrade:r.length?Math.round(r.reduce((a,x)=>a+x.usd,0)/r.length*1e5)/1e5:0,
  criterionMAE:graded.length?Math.round(graded.reduce((a,x)=>a+x.mae,0)/graded.length*1000)/1000:undefined,
  totalMAE:graded.length?Math.round(graded.reduce((a,x)=>a+Math.abs(x.total-x.refTotal),0)/graded.length*100)/100:undefined,
  orderStrongPartialWeak:`${orderOk}/${new Set(ok.map(x=>x.rep)).size}`,offTaskZero:`${ok.filter(x=>x.sample==='off_task'&&x.total===0).length}/${ok.filter(x=>x.sample==='off_task').length}`,
  maxRepSpread:Math.max(...spread)};
});
const out={model:MODEL,strategy:'parallel-v1',reps,caps:{maxCalls,maxUsd},stopped,calls,usd:Math.round(usd*1e4)/1e4,inputTokens:inTok,outputTokens:outTok,errors,summary,rows};
const dir='outputs/judge-dynamic-rubric-benchmark-2026-10-28';mkdirSync(dir,{recursive:true});writeFileSync(dir+'/results.json',JSON.stringify(out,null,1));
console.table(summary);console.log({calls,usd:out.usd,inTok,outTok,errors,stopped});
