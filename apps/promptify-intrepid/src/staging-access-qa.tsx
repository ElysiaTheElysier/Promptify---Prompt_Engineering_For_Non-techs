import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {productRequest,ProductRequestError} from './services/productionClientService';
import type {ProductSnapshot} from './types/production';
import './index.css';
const CLASS='4a5a763a-b1b5-4676-88ca-81f4805fb321',SHADOW='b26b1ee6-3932-4c13-bc3d-bfe0515408dc',LESSON='64b6f084-9e93-49cd-a7be-e2ef9e14ff65';
const FOREIGN='c8eed33a-8cc9-4772-b59b-2a754fcd2bc9',AWARD='23edde27-8da0-4e89-9db2-3880f291760f';
const accounts=new Set(['duonglh.work@gmail.com','demo.biz@intrepid.asia','kangseobi123@gmail.com','manhmanh100127@gmail.com']);
const allowed=import.meta.env.MODE==='staging'&&location.hostname==='ai-transformation-510302-intrepid-staging.web.app';
type Row={name:string;ok:boolean;status?:number;ms?:number;details?:unknown};
function Review(){
 const [busy,setBusy]=useState(false),[rows,setRows]=useState<Row[]>([]),[actor,setActor]=useState('');
 const add=(row:Row)=>setRows(previous=>[...previous,row]);
 async function state(){
  if(!allowed)throw Error('Only the fixed staging host is permitted');
  const value=await productRequest<ProductSnapshot>('snapshot',{classId:CLASS});
  if(!accounts.has(value.profile.email)||value.selectedClass?.class_code!=='STAGING-ACCEPTANCE-20261019-4a5a763a')throw Error('Only named QA identities and the fictional acceptance class are permitted');
  setActor(value.profile.email+' · '+value.profile.role);return value;
 }
 async function operation(work:()=>Promise<void>){setBusy(true);setRows([]);try{await work();}catch(error){add({name:'Review stopped',ok:false,details:error instanceof ProductRequestError?{status:error.status}:String(error)});}finally{setBusy(false);}}
 async function deny(name:string,action:string,payload:Record<string,unknown>,statuses=[403]){
  const started=performance.now();try{await productRequest(action,payload);add({name,ok:false,status:200,ms:Math.round(performance.now()-started)});}
  catch(error){const status=error instanceof ProductRequestError?error.status:0;add({name,ok:statuses.includes(status),status,ms:Math.round(performance.now()-started)});}
 }
 async function access(){const s=await state();
  await deny('Foreign published source ID cannot be downloaded through this class','sourceDownload',{classId:CLASS,versionId:FOREIGN});
  await deny('Guessed source ID denied','sourceDownload',{classId:CLASS,versionId:'ffffffff-ffff-4fff-8fff-ffffffffffff'});
  await deny('Unknown lesson cannot retrieve context','searchSop',{classId:CLASS,lessonId:'ffffffff-ffff-4fff-8fff-ffffffffffff'});
  if(s.profile.role!=='admin'){
   await deny('Unassigned shadow class denied','snapshot',{classId:SHADOW});
   await deny('Studio write rejected before config validation','saveStudio',{classId:CLASS,lessonId:LESSON,config:{}});
   await deny('Learner or Head cannot inspect company Workspace through a supplied URL','inspectWorkspaceSource',{classId:CLASS,url:'https://docs.google.com/spreadsheets/d/1NUv61Mn5TN8kLWWblGQgLD3pV8gmC7JEDP7Ijs0yLCY/edit',tab:'Table'});
  }
  if(s.profile.role==='learner'&&!s.awards?.some(a=>a.id===AWARD))await deny('Peer award ID denied','downloadAward',{classId:CLASS,awardId:AWARD});
  add({name:'No response payload, token, prompt or source text exported',ok:true});
 }
 async function workspace(){const s=await state();if(s.profile.role!=='admin')throw Error('Existing administrator required');const result=await productRequest<any>('inspectWorkspaceSource',{classId:CLASS,url:'https://docs.google.com/spreadsheets/d/1NUv61Mn5TN8kLWWblGQgLD3pV8gmC7JEDP7Ijs0yLCY/edit',tab:'Table'});add({name:'Runtime Workspace identity reads only supplied Sheet headers and Drive metadata',ok:result.headers?.length===32&&result.mimeType==='application/vnd.google-apps.spreadsheet',details:{columns:result.headers?.length,mimeType:result.mimeType}});}
 async function aiLoad(){const s=await state();if(s.profile.role!=='admin')throw Error('Existing QA administrator required');
  const prompt='[Role]: Operations analyst. [Context]: Fictional ticket 43 asks for a delivery-status update. [Task]: Classify ticket 43 using only the approved fictional SOP and provide the update deadline. [Constraint]: Do not invent facts or sources. Cite the actual supplied SOP. [Format]: Markdown table with Ticket, Priority, Deadline, Source. [Example]: Ticket 41 has normal priority and a two-business-day update deadline. FICTIONAL QA LOAD 20261020.';
  const start=performance.now(),runs=await Promise.all(Array.from({length:100},async(_,index)=>{
   const requestId=crypto.randomUUID(),at=performance.now();let phase='generate';
   try{const generation=await productRequest<any>('sandboxGenerate',{classId:CLASS,lessonId:LESSON,requestId,prompt});const generateMs=Math.round(performance.now()-at);phase='judge';const evaluation=await productRequest<any>('sandboxJudge',{classId:CLASS,requestId});return {index,requestId,ok:true,generateMs,totalMs:Math.round(performance.now()-at),model:generation.model,score:evaluation.total,providerAttempts:evaluation.judge?.providerAttempts};}
   catch(error){return {index,requestId,ok:false,phase,status:error instanceof ProductRequestError?error.status:0,totalMs:Math.round(performance.now()-at)};}
  }));
  const completed=runs.filter(r=>r.ok),times=completed.map(r=>r.totalMs).sort((a,b)=>a-b),scores=completed.map(r=>r.score).filter((n):n is number=>typeof n==='number'),mean=scores.reduce((a,b)=>a+b,0)/(scores.length||1);
  add({name:'100 simultaneous real sandbox Run + Judge pipelines',ok:completed.length===100,details:{scope:'One real admin identity; common generation/supervisor/parallel-Judge pipeline, not 100 distinct learner identities or learner progress writes. No retries by this harness. At most 100 generate and 100 Judge requests.',wallMs:Math.round(performance.now()-start),completed:completed.length,failed:runs.length-completed.length,p95:times[Math.ceil(times.length*.95)-1],scoreMin:Math.min(...scores),scoreMax:Math.max(...scores),scoreStdDev:Math.sqrt(scores.reduce((sum,n)=>sum+(n-mean)**2,0)/(scores.length||1)),runs}});
 }
 async function concurrent(){const s=await state();if(s.profile.role!=='admin')throw Error('Use the existing QA administrator for the isolated write probe');
  const original=s.drafts?.find(d=>d.lesson_id===LESSON),marker='FICTIONAL QA CONCURRENT DRAFT '+crypto.randomUUID();
  let restored=false;
  try{
   const attempts=await Promise.all([0,1].map(async i=>{try{return {ok:true,revision:await productRequest<number>('saveDraft',{classId:CLASS,lessonId:LESSON,prompt:marker+' '+i,expectedRevision:original?.revision??0})};}catch(error){return {ok:false,status:error instanceof ProductRequestError?error.status:0};}}));
   add({name:'Concurrent same-revision draft: one success, one conflict',ok:attempts.filter(r=>r.ok).length===1&&attempts.filter(r=>!r.ok&&r.status===409).length===1,details:attempts});
  }finally{
   const current=(await state()).drafts?.find(d=>d.lesson_id===LESSON);
   if(current?.prompt.startsWith(marker)){await productRequest('saveDraft',{classId:CLASS,lessonId:LESSON,prompt:original?.prompt||'',expectedRevision:current.revision});restored=true;}
   add({name:original?'Original own admin draft restored':'New own admin fixture draft reset to empty',ok:restored});
  }
  const requestId=crypto.randomUUID(),title='FICTIONAL QA duplicate Save '+requestId;
  const payload={classId:CLASS,lessonId:LESSON,requestId,title,prompt:'[Task]: Classify fictional ticket 43.',category:'Synthetic concurrency QA',settings:{model:'gemini-3.8-flash'},share:false};
  const saves=await Promise.all([0,1].map(async()=>{try{return {ok:true,...await productRequest<any>('savePromptLibrary',payload)};}catch(error){return {ok:false,status:error instanceof ProductRequestError?error.status:0};}}));
  const replay=await productRequest<any>('savePromptLibrary',payload),after=await state(),entries=after.promptLibrary?.filter(r=>r.title===title)||[];
  add({name:'Duplicate personal Save produces one row and stable replay',ok:entries.length===1&&entries[0].id===replay.id&&saves.some(r=>r.ok),details:{requestId,rows:entries.length,id:replay.id,statuses:saves.map(r=>r.ok?200:r.status)}});
 }
 async function reads(){await state();const start=performance.now();
  const outcomes=await Promise.all(Array.from({length:100},async()=>{const at=performance.now();try{const s=await productRequest<ProductSnapshot>('snapshot',{classId:CLASS});return {ok:s.selectedClass?.id===CLASS,ms:Math.round(performance.now()-at)};}catch(error){return {ok:false,ms:Math.round(performance.now()-at),status:error instanceof ProductRequestError?error.status:0};}}));
  const times=outcomes.map(r=>r.ms).sort((a,b)=>a-b);add({name:'100 concurrent authenticated snapshots — one actual identity, no AI calls',ok:outcomes.every(r=>r.ok),details:{requests:100,errors:outcomes.filter(r=>!r.ok).length,p50:times[49],p95:times[94],p99:times[98],wallMs:Math.round(performance.now()-start),scope:'Not 100 distinct sign-ins or 100 AI Run+Judge acceptance'}});
 }
 return <main style={{maxWidth:900,margin:'32px auto',padding:24,fontFamily:'Inter,system-ui',color:'#102d32'}}><h1>Staging access and concurrency QA</h1><p>Fictional acceptance class only. Uses the current real app session; no custom identity or token export. Access/read probes make no AI calls. The explicitly labeled AI load probe makes 100 real paid Run + Judge pipelines, with no harness retries and no learner scores/awards changed.</p><p>{actor||'Open the app and sign in using one of the named QA accounts first.'}</p><a href={'/?ui=02&classId='+CLASS}>App sign-in</a><div style={{display:'flex',flexWrap:'wrap',gap:12,margin:'24px 0'}}>{[['Run ID access checks',access],['Run own admin concurrency probes',concurrent],['Run 100 authenticated snapshot reads',reads],['Check runtime Workspace access',workspace],['Run 100 real AI sandbox pipelines',aiLoad]].map(([label,action])=><button key={String(label)} disabled={busy||!allowed} onClick={()=>void operation(action as ()=>Promise<void>)} style={{background:'#047857',color:'white',padding:12,borderRadius:12,minHeight:44}}>{String(label)}</button>)}</div><p role="status">{busy?'Running…':'Idle'}</p><pre aria-label="QA results" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:16,background:'#f4f8f6',borderRadius:12}}>{JSON.stringify({at:new Date().toISOString(),actor,rows},null,2)}</pre></main>;
}
createRoot(document.getElementById('root')!).render(allowed?<Review/>:<p>Staging-only review is unavailable on this host.</p>);
