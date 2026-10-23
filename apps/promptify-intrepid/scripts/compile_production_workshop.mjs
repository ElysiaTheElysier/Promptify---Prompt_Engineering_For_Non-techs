import fs from 'node:fs';
const template=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'))[9],q=JSON.stringify;
const fixes={ '4 Batches':'{snapshot.classes.filter(row=>row.status==="active").length}', '42 learners online now':'{learners.length+" "+copy("Enrolled learners")}', '8.4 / 10':'{average+" / 10"}', '2 Flagged':'{flagged+" "+copy("Flagged")}', '1 PII Breach • 1 Stuck (>5 runs)':'{copy("Signals from saved attempts")}', 'Gemini 3.8':'{latest?.model||"—"}', 'Latency: 0.74s • Operational':'{latest?(latest.latency_ms/1000).toFixed(2)+" s":"—"}', 'Started 15m ago • Scheduled End: 11:40 AM':'{copy(snapshot.controls.state)}', 'LAB-BS-03: One-shot Brand Voice & SLA Ticket Classification':'{snapshot.lessons[0]?.title||copy("No published Codelabs yet.")}', 'Intrepid Cohort 04':'{snapshot.selectedClass?.class_code}', '• Eligible: Brand Solutions & Campaign Ops • Active Learners:':'{snapshot.selectedClass?.department}', '38 / 42 Online':'{learners.length+" "+copy("Enrolled learners")}', 'Broadcast hint delivered to 38 active student workspaces!':'{copy("Broadcast saved for this class.")}', 'Verbatim Prompt Syntax (Attempt V5):':'{copy("Verbatim prompt from latest saved attempt:")}', '© 2026 Promptify x Intrepid Asia. Refactored Facilitator Control Center Active.':'{copy("© 2026 Promptify · Intrepid")}', 'LP':'{snapshot.profile.full_name.slice(0,2).toUpperCase()||"P"}'};
function render(n){
 if(n.text!==undefined)return fixes[n.text.trim()]||`{copy(${q(n.text)})}`;
 const a={...(n.attrs||{})};if(a['x-text']==='lab.id')a['x-text']='lab.source.lesson_key';const tag=n.tag==='body'?'div':n.tag;if(a[':class'])a[':class']=a[':class'].replace(/bg-blue-100 text-blue-900 border-blue-300/g,'bg-amber-100 text-amber-900 border-amber-300').replace(/PUBLISHED/g,'SCHEDULED');
 if(['style','script'].includes(tag))return '';
 if(tag==='template'){let inner=(n.children||[]).map(render).join('');if(a['x-for']){const [v,list]=a['x-for'].split(' in ');return `{${list}.map(${v}=><React.Fragment key={${v}.id}>${inner}</React.Fragment>)}`;}return a['x-if']?`{(${a['x-if']})&&<>${inner}</>}`:`<>${inner}</>`;}
 if((a.class||'').includes('material-symbols-outlined'))return `<SourceIcon name=${q((n.children||[]).map(c=>c.text||'').join('').trim())} className=${q(a.class.replace('material-symbols-outlined','source-icon'))}/>`;
 let props='';for(const [key,value]of Object.entries(a)){if(key.startsWith('x-')||key.startsWith('@')||key.startsWith(':')||key==='style')continue;if(key==='class'){props+=` className={${q(value)}${a[':class']?' + " " + classes('+a[':class']+')':''}}`;continue;}if(key==='href'){props+=' href="/?ui=11" onClick={event=>{event.preventDefault();navigate(11)}}';continue;}if(key==='rows') {props+=` rows={${Number(value)}}`;continue;}props+=` ${{for:'htmlFor',tabindex:'tabIndex',viewbox:'viewBox'}[key]||key}=${q(value)}`;}
 if(a['x-model'])props+=` value={${a['x-model']}} onChange={event=>setBroadcastMessage(event.target.value)}`;
 if(a[':value'])props+=` value={${a[':value']}}`;
 if(a['@change'])props+=' onChange={event=>updateLabStatus(lab,event.target.value)}';
 if(a['@click']){let action=a['@click'];if(action.startsWith('activePhase ='))action='setActivePhase('+action.split(' = ')[1]+')';else if(action.startsWith('inspectorDrawerOpen'))action='setInspectorDrawerOpen(false)';else if(action.includes('Session paused'))action='freeze()';else if(action.includes('Private hint'))action='sendCoaching()';props+=` onClick={()=>{${action}}}`;if(action==='sendBroadcast()'||action==='sendCoaching()'||action==='freeze()')props+=' disabled={busy}';}
 if(tag==='textarea'&&!a['x-model'])props+=' value={coachingMessage} onChange={event=>setCoachingMessage(event.target.value)} maxLength={2000} aria-label={copy("Private coaching")}';
 let children=a['x-text']?`{copy(String(${a['x-text']}))}`:(n.children||[]).map(render).join('');
 if(tag==='select'&&!a[':value']){props+=' value={snapshot.selectedClass?.id||""} onChange={event=>onSelectClass(event.target.value)} aria-label={copy("Select class")}';children='{snapshot.classes.map(row=><option key={row.id} value={row.id}>{row.class_code} · {row.department}</option>)}';}
 if(tag==='option'&&a.value==='PUBLISHED'){props=props.replace('"PUBLISHED"','"SCHEDULED"');children='{copy("SCHEDULED")}';}
 if(n.tag==='body'){props+=' data-source-ui="UI-09"';children+='{selectedLearner&&inspectorDrawerOpen&&<button className="fixed bottom-5 right-5 z-[70] bg-m3-primary text-white px-5 py-3 rounded-full" onClick={()=>onInspect(selectedLearner.id)}>{copy("Open full learner inspector")}</button>}';}
 let out=['input','img','br','hr'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;if(a['x-show'])out=`{(${a['x-show']})&&(${out})}`;return out;
}
fs.writeFileSync('src/components/rebuild/ProductionWorkshopSource.tsx',`// Word UI-09 with authorized cohort data and real facilitator actions.
import React,{useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {piiSignals} from '../../services/piiGuardService';
import {SourceIcon} from './SourceIcon';
import ProductionCohorts from './ProductionCohorts';
import './source-ui.css';
export default function ProductionWorkshopSource({snapshot,busy,onAction,navigate,onInspect,onSelectClass}:{snapshot:ProductSnapshot;busy:boolean;onAction:(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;navigate:(ui:number)=>void;onInspect:(id:string)=>void;onSelectClass:(id:string)=>void}){
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang),classes=(v:any)=>typeof v==='string'?v:Object.entries(v).filter(([,value])=>value).map(([key])=>key).join(' ');
 const [activePhase,setActivePhase]=useState('all'),[broadcastMessage,setBroadcastMessage]=useState(''),[broadcastToast,setBroadcastToast]=useState(false),[inspectorDrawerOpen,setInspectorDrawerOpen]=useState(false),[selectedLearner,setSelectedLearner]=useState<any>(null),[coachingMessage,setCoachingMessage]=useState('');
 const learners:any[]=snapshot.learners.map(row=>{const runs=snapshot.attempts.filter(a=>a.learner_id===row.id),last=runs[0],score=last?.evaluation_json?.total,flag=runs.some(a=>piiSignals(a.prompt_text).length),stuck=runs.filter(a=>a.evaluation_json&&a.evaluation_json.total<8).length>5;return {id:row.id,name:row.full_name||row.email,dept:snapshot.selectedClass?.department||'—',attempts:runs.length,score:score??'—',status:flag?'pii_breach':stuck?'stuck':'in_progress',technique:snapshot.lessons.find(l=>l.id===last?.lesson_ref_id)?.studio?.branch||'—',promptV5:last?.prompt_text||copy('No saved attempts yet.'),feedback:last?.evaluation_json?.feedback?.[lang]?.nextHint||last?.evaluation_json?.nextHint||'—'};});
 const scores=snapshot.attempts.flatMap(a=>a.evaluation_json?[a.evaluation_json.total]:[]),average=scores.length?(scores.reduce((sum,v)=>sum+v,0)/scores.length).toFixed(1):'—',flagged=learners.filter(l=>['pii_breach','stuck'].includes(l.status)).length,latest=snapshot.attempts[0];
 const codelabs:any[]=snapshot.lessons.map(l=>({id:l.id,title:l.title,status:l.studio?.state||(l.status==='published'?'ACTIVE':'DRAFT'),cohort:snapshot.selectedClass?.class_code||'—',tier:String(l.studio?.awards?.accessTier||'—'),start:l.studio?.startTime||'—',end:l.studio?.endTime||'—',source:l}));
 const sendBroadcast=()=>{if(broadcastMessage.trim())void onAction('broadcast',{message:broadcastMessage,requestId:crypto.randomUUID()},()=>{setBroadcastToast(true);setBroadcastMessage('');});};
 const openInspector=(learner:any)=>{setSelectedLearner(learner);setInspectorDrawerOpen(true);};
 const freeze=()=>{if(snapshot.controls.state==='ended')return;void onAction('sessionControl',{state:snapshot.controls.state==='active'?'frozen':'active',expectedRevision:snapshot.controls.revision,reason:copy('Trainer session control')});};
 const sendCoaching=()=>{if(selectedLearner&&coachingMessage.trim())void onAction('privateHint',{learnerId:selectedLearner.id,message:coachingMessage,requestId:crypto.randomUUID()},()=>{setCoachingMessage('');setInspectorDrawerOpen(false);});};
 const updateLabStatus=(lab:any,state:string)=>{if(lab.source.studio)void onAction('saveStudio',{lessonId:lab.id,config:{...lab.source.studio,state},expectedRevision:lab.source.studio.revision});else navigate(11);};
 return <div className="source-ui">${render(template.body)}{snapshot.selectedClass?.can_manage&&<ProductionCohorts key={snapshot.selectedClass.id} snapshot={snapshot} busy={busy} onAction={onAction}/>}</div>;
}
`);
console.log('Compiled source UI-09 with real class controls.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
