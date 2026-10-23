import fs from 'node:fs';
const t=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'))[7];
function find(n){if(n.attrs?.['@click.away']==='drawerOpen = false')return n;for(const child of n.children||[]){const result=find(child);if(result)return result;}}
const quote=JSON.stringify;
const expr=value=>value.replaceAll('totalScore >= 8','totalScore >= passThreshold').replaceAll('item.score === 2','item.score >= item.max*0.8').replaceAll('item.score === 1','item.score > 0');
function render(n){
 if(n.text!==undefined)return `{copy(${quote(n.text.replace('Multi-Agent Evaluator • Gemini 3.8 Pro','Weighted AI evaluator · EN / VI'))})}`;
 const a=n.attrs||{},tag=n.tag;
 if(tag==='template'){const inner=(n.children||[]).map(render).join('');if(a['x-for']){const [variable,list]=a['x-for'].split(' in ');return `{${list}.map((${variable},index)=><React.Fragment key={index}>${inner}</React.Fragment>)}`;}return a['x-if']?`{(${expr(a['x-if'])})&&<>${inner}</>}`:`<>${inner}</>`;}
 if((a.class||'').includes('material-symbols-outlined'))return `<SourceIcon name=${quote((n.children||[]).map(v=>v.text||'').join('').trim())} className=${quote(a.class.replace('material-symbols-outlined','source-icon'))}/>`;
 let props='';for(const [key,value]of Object.entries(a)){
  if(key.startsWith('x-')||key.startsWith(':')||key.startsWith('@')||key==='style')continue;
  if(key==='class'){props+=` className={${quote(value)}${a[':class']?' + " " + ('+expr(a[':class'])+')':''}}`;continue;}
  props+=` ${{tabindex:'tabIndex',viewbox:'viewBox'}[key]||key}=${quote(value)}`;
 }
 if(tag==='button'&&a['@click']==='drawerOpen = false')props+=' aria-label={copy("Close scorecard")}';
 if(a[':style'])props+=' style={{width:(item.score/item.max*100)+"%"}}';
 if(a[':disabled'])props+=' disabled={busy}';
 if(a['@click']){const action=a['@click'];props+=` onClick={()=>{${action==='drawerOpen = false'?'onClose()':action.includes('Applying nextHint')?'insertHint(nextHint);onClose()':'void judge()'}}}`;}
 let children=a['x-text']?`{${['item.desc','nextHint','str','imp'].includes(a['x-text'])?a['x-text']:'copy(String('+expr(a['x-text'])+'))'}}`:(n.children||[]).map(render).join('');
 return ['input','img','hr','br'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;
}
fs.writeFileSync('src/components/rebuild/ProductionJudgeSource.tsx',`// Word UI-07 side sheet; persisted weighted evaluation takes precedence over older 2-point fixture.
import React from 'react';
import type {WeightedEvaluation} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {SourceIcon} from './SourceIcon';
import {useSourceDialog} from './useSourceDialog';
import './source-ui.css';
export default function ProductionJudgeSource({evaluation,passThreshold=8,busy,judge,onClose,insertHint}:{evaluation?:WeightedEvaluation|null;passThreshold?:number;busy:boolean;judge:()=>Promise<void>;onClose:()=>void;insertHint:(value:string)=>void}){
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang),dialogRef=useSourceDialog(true,onClose),feedback=evaluation?.feedback?.[lang],totalScore=evaluation?.total??0,evalState=evaluation?'success':'error_retry',isRetrying=busy;
 const criteria=evaluation?.criteria.map(item=>({name:copy(item.label)+' · '+item.weight+'%',score:item.score,max:item.max,desc:feedback?.criteriaReasons[item.key]||item.reason}))||[],strengths=feedback?.strengths||evaluation?.strengths||[],improvements=feedback?.improvements||evaluation?.improvements||[],nextHint=feedback?.nextHint||evaluation?.nextHint||'';
 return <div className="source-ui fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"><div ref={dialogRef} role="dialog" aria-modal="true" aria-label={copy('AI Judge scorecard')} className="w-full max-w-lg h-full">{evaluation?(${render(find(t.body))}):<section className="bg-white h-full p-6 flex flex-col gap-6"><h2 className="text-xl font-bold">{copy('AI Judge scorecard')}</h2><p>{copy('This attempt has not been evaluated yet.')}</p><button disabled={busy} onClick={()=>void judge()} className="bg-m3-primary text-white rounded-full px-5 py-3">{copy(busy?'Evaluating…':'Evaluate with AI Judge')}</button><button onClick={onClose} className="border rounded-full px-5 py-3">{copy('Close')}</button></section>}</div></div>;
}
`);
console.log('Compiled source UI-07 as a weighted evaluation side sheet.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
