import fs from 'node:fs';
const template=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'))[4];
const quote=JSON.stringify;
function render(n){
 if(n.text!==undefined){const value=n.text.trim();if(value==='Lộ trình Thực hành 5 Codelabs')return '{copy("Practice learning path")+" · "+labs.length+" Codelabs"}';if(value==='Brand Solutions & Campaign Ops'||value==='Giải pháp thương hiệu và vận hành chiến dịch')return '{userDept}';if(value==='Thực hành làm chủ kỹ năng Prompting qua 5 bài Codelab gắn liền với tài liệu')return '{copy("Practice AI prompting with")+" "+labs.length+" "+copy("Codelabs using authorized SOPs")}';}
 if(n.text!==undefined){const text=n.text.trim();const replacements={'Welcome back, Linh!':'{copy("Welcome back")+", "+userName+"!"}','Chào mừng trở lại, Linh!':'{copy("Welcome back")+", "+userName+"!"}','Master AI prompting across 5 hands-on Codelabs grounded in real':'{copy("Practice AI prompting with")+" "+labs.length+" "+copy("Codelabs using authorized SOPs")}', '2 of 5':'{completed+" / "+labs.length}','Labs Completed (40%)':'{copy("Labs completed")+" ("+Math.round(completion)+"%)"}','14':'{totalAttempts}','8.7 / 10':'{avgScore+" / 10"}','Lab 3: One-shot Brand Voice & Classification':'{resume?.title||copy("No published Codelabs yet.")}','100-Minute Masterclass • Intrepid Enterprise Cohort':'{snapshot.selectedClass?.course_title}','All (5)':'{copy("All")+" ("+labs.length+")"}'};return replacements[text]||`{copy(${quote(n.text)})}`;}
 const a=n.attrs||{},tag=n.tag==='body'?'div':n.tag;
 if(['script','style'].includes(tag))return '';
 if(tag==='template'){
  const inner=(n.children||[]).map(render).join('');
  if(a['x-for']){const [variable,list]=a['x-for'].split(' in ');return `{${list==='labs'?'visibleLabs':list}.map(${variable}=><React.Fragment key={${variable}.id}>${inner}</React.Fragment>)}`;}
  return a['x-if']?`{(${a['x-if']})&&<>${inner}</>}`:`<>${inner}</>`;
 }
 if((a.class||'').includes('material-symbols-outlined'))return `<SourceIcon name={${a['x-text']||quote((n.children||[]).map(c=>c.text||'').join('').trim())}} className=${quote(a.class.replace('material-symbols-outlined','source-icon'))}/>`;
 const label=(n.children||[]).map(child=>child.text||'').join('').trim(),filterButton=tag==='button'&&['All (5)','Active'].includes(label);
 let props=filterButton?` onClick={()=>setLabFilter(${quote(label==='Active'?'active':'all')})} aria-pressed={labFilter===${quote(label==='Active'?'active':'all')}}`:'';for(const [key,value] of Object.entries(a)){
  if(key.startsWith('x-')||key.startsWith('@')||key.startsWith(':')||key==='style')continue;
  if(key==='class'){props+=` className={${quote(value.replace('w-[40%]',''))}${a[':class']?' + " " + ('+a[':class']+')':''}}`;if(value.includes('w-[40%]'))props+=' style={{width:completion+"%"}}';continue;}
  if(key==='href'){props+=` href=${quote(value==='/'?'/?ui=00':value)}${value.includes('auth')?' onClick={event=>{event.preventDefault();void supabase.auth.signOut();}}':''}`;continue;}
  props+=` ${{tabindex:'tabIndex',viewbox:'viewBox',for:'htmlFor'}[key]||key}=${quote(value)}`;
 }
 if(a['@click']){const action=a['@click'];let handler;
  if(action.startsWith('lang ='))handler="setProductLanguage(lang==='en'?'vi':'en')";
  else if(action.startsWith('sopDrawerOpen'))handler=`setSopDrawerOpen(${action.endsWith('true')})`;
  else if(action.includes('Codelab ${lab.number}'))handler='onOpen(lab.id)';
  else if(action.includes('Launching Codelab'))handler='resume&&onOpen(resume.id)';
  else if(action.includes('SOP Upload'))handler='navigate(13)';
  else throw new Error('Unhandled hub action '+action);
  props+=` onClick={()=>{${handler}}}`;
 }
 let children=a['x-text']?`{${['lab.title','lab.subtitle','sop.name','userName','userDept','sop.dept'].includes(a['x-text'])?a['x-text']:'copy(String('+a['x-text']+'))'}}`:(n.children||[]).map(render).join('');
 if(a['x-text']?.includes('Masterclass Learning Path'))children='{copy("Practice learning path")+" · "+labs.length+" Codelabs"}';
 if(n.tag==='body'){props+=' data-source-ui="UI-04"';children+='{!labs.length&&<p className="max-w-7xl mx-auto px-8 py-4 text-sm text-slate-500">{copy("No published Codelabs yet.")}</p>}';}
 let result=['input','img','br','hr'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;
 if(a['x-show'])result=`{(${a['x-show']})&&(${result})}`;return result;
}
fs.writeFileSync('src/components/rebuild/ProductionHub.tsx',`// UI-04 compiled from Word; metrics/curriculum/resources derive from authorized snapshot.
import React,{useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage,setProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {productRequest} from '../../services/productionClientService';
import {supabase} from '../../services/supabaseClient';
import {SourceIcon} from './SourceIcon';
import './source-ui.css';
export default function ProductionHub({snapshot,onOpen,navigate}:{snapshot:ProductSnapshot;onOpen:(id:string)=>void;navigate:(ui:number)=>void}){
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang),userDept=snapshot.selectedClass?.department||'—',userName=snapshot.profile.full_name||snapshot.profile.email,userEmail=snapshot.profile.email;
 const downloadAward=async(id:string)=>{try{const result=await productRequest<{base64:string;filename:string}>('downloadAward',{classId:snapshot.selectedClass!.id,awardId:id});const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=result.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){setAwardError((e as Error).message);}};
 const [awardError,setAwardError]=useState('');
 const [sopDrawerOpen,setSopDrawerOpen]=useState(false),[labFilter,setLabFilter]=useState('all');
 const labs=snapshot.lessons.map((lesson,index)=>{const attempts=snapshot.attempts.filter(a=>a.lesson_ref_id===lesson.id),progress=snapshot.progress?.find(p=>p.lesson_id===lesson.id);return {id:lesson.id,number:index+1,title:lesson.title,subtitle:lesson.task_goal,status:progress?.status||'not_started',score:progress?.best_score??null,attempts:progress?.attempts_count??attempts.length,timeSpent:'—',icon:progress?.status==='completed'?'verified_user':'auto_awesome',badgeColor:progress?.status==='completed'?'bg-emerald-100 text-emerald-800 border-emerald-300':progress?.status==='in_progress'?'bg-amber-100 text-amber-900 border-amber-300':'bg-slate-100 text-slate-700 border-slate-300'};});
 const visibleLabs=labFilter==='active'?labs.filter(l=>l.status!=='completed'):labs;
 const completed=labs.filter(l=>l.status==='completed').length;
 const resume=labs.find(l=>l.status==='in_progress')||labs.find(l=>l.status==='not_started')||labs[0],completion=labs.length?labs.filter(l=>l.status==='completed').length/labs.length*100:0,totalAttempts=snapshot.progress?.reduce((sum,p)=>sum+(p.attempts_count||0),0)??snapshot.attempts.length;
 const scores=snapshot.attempts.map(a=>a.evaluation_json?.total).filter((v):v is number=>typeof v==='number'),avgScore=scores.length?(scores.reduce((sum,v)=>sum+v,0)/scores.length).toFixed(1):'—';
 const sops=snapshot.sops.map(s=>({id:s.id,name:s.title,pages:s.metadata?.pages??'—',size:s.metadata?.bytes?Math.ceil(s.metadata.bytes/1024)+' KB':'—',updated:new Date(s.created_at).toLocaleDateString(lang==='en'?'en-US':'vi-VN'),dept:userDept}));
 return <div className="source-ui">${render(template.body)}{(snapshot.awards||[]).length>0&&<section className="max-w-7xl mx-auto px-8 py-5"><h2 className="text-xl font-bold">{copy("My achievements")}</h2><div className="grid md:grid-cols-3 gap-4 mt-4">{snapshot.awards?.map(row=><article key={row.id} className="bg-white border rounded-2xl p-5"><strong>{row.title}</strong><p>{row.issuer}</p><p className="text-sm text-slate-500">{new Date(row.issued_at).toLocaleDateString()}</p><button className="text-emerald-700 font-semibold mt-3" onClick={()=>void downloadAward(row.id)}>{copy("Download PDF")}</button></article>)}</div></section>}{awardError&&<p role="alert" className="p-3 text-red-700">{awardError}</p>}</div>;
}
`);
console.log('Compiled UI-04 using canonical learner progress and published lessons.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
