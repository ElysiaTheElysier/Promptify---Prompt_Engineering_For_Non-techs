import fs from 'node:fs';
const t=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'))[5],quote=JSON.stringify;
function render(n){
 if(n.text!==undefined){const text=n.text.trim();if(text==='Detected: 5/5 Criteria')return '{copy("Active criteria")+": "+lesson.rubric.filter(c=>c.active).length}';if(text==='Next Lab (LAB-BS-04)')return '{copy("Learning path")}';if(text==='LAB-BS-03 Brief'||text==='LAB-BS-03 • PILLAR 2')return '{lesson.title}';if(text==='~218 tokens')return '{copy("Estimated prompt tokens")+": "+Math.ceil(prompt.length/4)}';if(text==='Save Output')return '{copy("Copy output")}';if(text==='LAB-BS-03 • Brand Solutions')return '{lesson.lesson_key+" • "+snapshot.selectedClass?.department}';if(text==='Gemini 3.8 Flash')return '{attempt?.model||copy("No run yet")}';if(text==='0.72s • 184 tokens')return '{attempt?((attempt.latency_ms/1000).toFixed(2)+" s"):"—"}';return `{copy(${quote(n.text)})}`;}
 const a=n.attrs||{},tag=n.tag==='body'?'div':n.tag;
 if(['script','style'].includes(tag))return '';
 if(tag==='template'){const inner=(n.children||[]).map(render).join('');if(a['x-for'])return `{sopResults.map((item:any)=><React.Fragment key={item.id}>${inner}<button className="text-emerald-700 border rounded-xl px-3 py-2 text-sm" onClick={()=>{setDrawer(false);navigate(8,item.versionId);}}>{copy("Inspect source")}</button></React.Fragment>)}`;return `<>${inner}</>`;}
 if((a.class||'').includes('material-symbols-outlined'))return `<SourceIcon name={${a['x-text']||quote((n.children||[]).map(v=>v.text||'').join('').trim())}} className=${quote(a.class.replace('material-symbols-outlined','source-icon'))}/>`;
 let props='';for(const [key,value] of Object.entries(a)){
  if(key.startsWith('x-')||key.startsWith('@')||key.startsWith(':')||key==='style')continue;
  if(['rows','cols','maxlength'].includes(key)){props+=` ${key==='maxlength'?'maxLength':key}={${Number(value)}}`;continue;}
  if(key==='spellcheck'){props+=` spellCheck={${value==='true'}}`;continue;}
  if(['disabled','required','readonly'].includes(key)){props+=` ${key==='readonly'?'readOnly':key}={true}`;continue;}
  if(key==='class'){props+=` className={${quote(value)}${a[':class']?' + " " + sourceClasses('+a[':class']+')':''}}`;continue;}
  if(key==='href'){const ui=value.includes('compare')?6:value.includes('dashboard')?4:value.includes('playground')?4:null;props+=` href=${quote(ui===null?value:'/?ui='+ui)}${ui===null?'':` onClick={event=>{event.preventDefault();navigate(${ui});}}`}${ui===6?' aria-label={copy("Compare versions")}':''}`;continue;}
  props+=` ${{for:'htmlFor',viewbox:'viewBox',tabindex:'tabIndex',spellcheck:'spellCheck'}[key]||key}=${quote(value)}`;
 }
 if(tag==='button'&&a['@click']==='sopDrawerOpen = true')props+=' aria-label={copy("SOP Library")}';
 if(tag==='button'&&a['@click']==='sopDrawerOpen = false')props+=' aria-label={copy("Close source drawer")}';
 if(a[':disabled'])props+=' disabled={busy||!!signals.length||!prompt.trim()||snapshot.controls.state!=="active"}';
 if(a['x-model']){const value=a['x-model']==='promptText'?'prompt':'query';props+=` value={${value}} onChange={event=>${value==='prompt'?'setPrompt':'setQuery'}(event.target.value)}`;if(value==='query')props+=' onKeyDown={event=>{if(event.key==="Enter")void search();}} aria-label={copy("Search SOP") }';else props+=' onKeyDown={event=>{if(event.ctrlKey&&event.key==="Enter"&&!busy&&!signals.length&&snapshot.controls.state==="active"){event.preventDefault();run();}}} ref={promptRef} maxLength={24000} aria-label={copy("Prompt editor")}';}
 if(a['@click']){let action=a['@click'].trim();
  if(action==='isTaskCollapsed = !isTaskCollapsed')action='setCollapsed(!collapsed)';
  else if(action.startsWith('mobileTab ='))action='setMobileTab('+action.split(' = ')[1]+')';
  else if(action.startsWith('activePopover ='))action='setActivePopover('+action.split(' = ')[1]+')';
  else if(action==='sopDrawerOpen = true')action='setDrawer(true);void search()';
  else if(action==='sopDrawerOpen = false')action='setDrawer(false)';
  else if(action==='rubricDrawerOpen = true')action='navigate(7)';
  else if(action.startsWith('rubricDrawerOpen'))action='setRubricDrawerOpen('+action.split(' = ')[1]+')';
  else if(action==='runPrompt()')action='setMobileTab("output");run()';
  else if(action.includes('Saved response'))action='attempt&&void navigator.clipboard.writeText(attempt.ai_output)';
  else if(action.includes('[SOP Citation]'))action='insert(item.citation+"\\n"+item.text);setDrawer(false)';
  else if(action.startsWith('insertAtCursor'))action=action.replace('insertAtCursor','insert');
  else if(!action.startsWith('selectTaskTab'))throw new Error('Unhandled workspace action '+action);
  props+=` onClick={()=>{${action}}}`;
 }
 let children=a['x-text']?`{copy(String(${a['x-text']}))}`:(n.children||[]).map(render).join('');
 if(a['x-show']==="activeTaskTab === 'task'")children='<h2 className="font-bold text-base">{lesson.title}</h2><MarkdownView content={lesson.scenario}/><h3 className="font-bold mt-4">{copy("Task requirement")}</h3><MarkdownView content={lesson.task_goal}/>{lesson.sample_input_context&&<details className="mt-4 border rounded-xl p-3"><summary className="font-semibold cursor-pointer">{copy("Authorized task context")}</summary><MarkdownView content={lesson.sample_input_context}/></details>}';
 if(a['x-show']==="activeTaskTab === 'theory'")children='<MarkdownView content={lesson.concept_content||copy("No theory published yet.")}/>';
 if(a['x-show']==="activeTaskTab === 'hints'")children='{lesson.hints?.length?lesson.hints.map((hint,index)=><p key={index}>{hint}</p>):<p>{copy("Hints are locked.")}</p>}';
 if(a['x-show']==="activeTaskTab === 'solution'")children='<pre>{(lesson as any).improved_prompt||copy("Solution is locked.")}</pre>';
 if(tag==='div'&&(a.class||'').includes('bg-slate-950')&&(a.class||'').includes('overflow-x-auto'))children='{attempt?<MarkdownView content={attempt.ai_output}/>:<p>{copy("No output yet.")}</p>}';
 if(tag==='div'&&(a.class||'').includes('space-y-2.5'))children='{attempt&&<button disabled={busy||!!attempt.evaluation_json} onClick={()=>void onAction("judge",{lessonId:lesson.id,attemptId:attempt.id})} className="rounded-full px-4 py-2 bg-m3-primary text-white">{copy("Evaluate with AI Judge")}</button>}{scoreCard()}';
 if(tag==='div'&&(a.class||'').includes('bg-emerald-50')&&(a.class||'').includes('text-center'))children='{scoreCard()}';
 if(tag==='div'&&(a.class||'').includes('flex-wrap')&&(n.children||[]).some(c=>c.tag==='div'&&c.children?.some(v=>v.attrs?.['@click']?.includes('activePopover'))))children='{lesson.studio?.scaffold.filter(chip=>chip.active).map(chip=><button key={chip.id} className="rounded-full border border-m3-outline-variant bg-white px-3 py-2 text-xs font-semibold" title={chip.tag} onClick={()=>insert(chip.tag)}>{chip.name}</button>)}';
 if(n.tag==='body'){props+=' data-source-ui="UI-05"';children+='{snapshot.controls.state!=="active"&&<p role="status" className="bg-amber-50 text-amber-900 p-3">{copy("Session")}: {copy(snapshot.controls.state)}</p>}{snapshot.messages.map(m=><p key={m.id} className="bg-emerald-50 p-3">{m.message||m.content}</p>)}{snapshot.privateHints.map(m=><p key={m.id} className="bg-amber-50 p-3">{copy("Trainer hint")}: {m.message}</p>)}{signals.length>0&&<div role="alert" className="fixed bottom-4 left-4 z-[60] bg-red-50 text-red-900 border border-red-200 rounded-2xl p-4"><p>{copy("Remove personal identifiers before sending to AI.")}</p><button onClick={()=>setPrompt(scrubPrompt(prompt))}>{copy("Redact identifiers")}</button></div>}';}
 let output=['input','img','br','hr'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;
 if(a['x-show'])output=`{(${a['x-show'].replace('window.innerWidth >= 1024','isDesktop')})&&(${output})}`;return output;
}
fs.writeFileSync('src/components/rebuild/ProductionWorkspaceSource.tsx',`// UI-05 layout compiled from Word; runtime data and actions provided by production workspace.
import React,{useState,useEffect} from 'react';
import type {Props as WorkspaceProps} from './ProductionWorkspace';
import {SourceIcon} from './SourceIcon';
import {MarkdownView} from '../common/MarkdownView';
import {useProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {scrubPrompt} from '../../services/piiGuardService';
import './source-ui.css';
const sourceClasses=(value:any):string=>typeof value==='string'?value:Object.entries(value||{}).filter(([,active])=>active).map(([key])=>key).join(' ');
type Props=WorkspaceProps&{collapsed:boolean;setCollapsed:React.Dispatch<React.SetStateAction<boolean>>;mobileTab:string;setMobileTab:React.Dispatch<React.SetStateAction<string>>;drawer:boolean;setDrawer:React.Dispatch<React.SetStateAction<boolean>>;query:string;setQuery:React.Dispatch<React.SetStateAction<string>>;results:any[];search:()=>Promise<void>;searching:boolean;searchError:string;resolveDraft:(keepLocal:boolean)=>Promise<void>;signals:string[];draftStatus:string};
export default function ProductionWorkspaceSource(props:Props){
 const {snapshot,lesson,prompt,setPrompt,promptRef,insert,run,busy,attempt,scoreCard,unlock,onAction,navigate,collapsed,setCollapsed,mobileTab,setMobileTab,drawer,setDrawer,query,setQuery,results,search,searching,searchError,resolveDraft,signals,draftStatus}=props;
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang);
 const [activeTaskTab,setActiveTaskTab]=useState('task'),[activePopover,setActivePopover]=useState<string|null>(null),[rubricDrawerOpen,setRubricDrawerOpen]=useState(false),[isDesktop,setIsDesktop]=useState(window.innerWidth>=1024);
 useEffect(()=>{const listener=()=>setIsDesktop(window.innerWidth>=1024);window.addEventListener('resize',listener);return()=>window.removeEventListener('resize',listener);},[]);
 const isTaskCollapsed=collapsed,sopDrawerOpen=drawer,promptText=prompt,isExecuting=busy,hasExecuted=!!attempt,attemptCount=attempt?.attempt_number||0,aiScore=attempt?.evaluation_json?.total??'—',unlockedHints=!!lesson.hints?.length,unlockedSolution=!!(lesson as any).improved_prompt;
 const selectTaskTab=(tab:string)=>{setActiveTaskTab(tab);if(tab==='hints'&&!unlockedHints)unlock('hints');if(tab==='solution'&&!unlockedSolution)unlock('solution');};
 const sopResults=results.map((row:any)=>({...row,doc:row.title,page:row.page?copy('Page')+' '+row.page:'—',text:row.content}));
 return <div className="source-ui">${render(t.body)}{drawer&&<div role="status" className="fixed bottom-4 right-4 z-[70] bg-white border rounded-xl p-3 max-w-sm">{searching?copy("Searching SOP…"):searchError||(!results.length?copy("No matching published SOP sources."):null)}</div>}{(draftStatus==='conflict'||draftStatus==='error')&&<div className="flex gap-3 justify-center p-3"><button className="border rounded-xl px-3 py-2" onClick={()=>void resolveDraft(false)}>{copy("Load server draft")}</button><button className="bg-emerald-700 text-white rounded-xl px-3 py-2" onClick={()=>void resolveDraft(true)}>{copy("Keep my draft and retry")}</button></div>}<p role="status" className="text-center text-xs text-slate-500 py-2">{copy(draftStatus==='saved'?'Draft saved':draftStatus==='conflict'?'Draft conflict: local text retained.':draftStatus==='error'?'Draft save failed. Your local text is retained. Retry when connected.':'Saving draft…')}</p></div>;
}
`);
console.log('Compiled source UI-05 with canonical task/output/Judge and authorized SOP adapters.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
