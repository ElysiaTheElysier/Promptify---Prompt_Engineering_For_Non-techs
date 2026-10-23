import fs from 'node:fs';
const t=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'))[6],quote=JSON.stringify;
function render(n,side='a'){
 if(n.text!==undefined){const text=n.text.trim();if(text==='Apply V3 to Workspace')return '{copy("Apply selected version to workspace")}';if(text==='+2 Pts Improved')return '{typeof a?.evaluation_json?.total==="number"&&typeof b?.evaluation_json?.total==="number"?(b.evaluation_json.total-a.evaluation_json.total).toFixed(1):"—"}';if(text.startsWith('AI Judge Score:'))return `{copy('AI Judge Score:')+" "+(${side}?.evaluation_json?.total??'—')+" / 10"}`;if(text.startsWith('Timestamp:'))return `{${side}?new Date(${side}.created_at).toLocaleString(lang==='en'?'en-US':'vi-VN'):'—'}`;if(text.startsWith('Model:'))return `{${side}?${side}.model+' · '+(${side}.latency_ms/1000).toFixed(2)+' s':'—'}`;return `{copy(${quote(n.text)})}`;}
 const attrs=n.attrs||{},tag=n.tag==='body'?'div':n.tag;
 if(tag==='div'&&(attrs.class||'').includes('text-xs space-y-2 shrink-0'))return `<div className="${attrs.class}"><strong>{copy('AI Judge diagnostics')} · V{${side}?.attempt_number??'—'}</strong>{${side}?.evaluation_json?${side}.evaluation_json.criteria.map(c=><p key={c.key}>{copy(c.label)}: {c.score}/{c.max} · {${side}.evaluation_json?.feedback?.[lang]?.criteriaReasons[c.key]||c.reason}</p>):<p>{copy('Not evaluated')}</p>}</div>`;
 if(tag==='div'&&(attrs.class||'')==='flex items-center gap-2 text-m3-on-surface-variant')return `<div className="${attrs.class}">{copy('Score change')}: {typeof a?.evaluation_json?.total==='number'&&typeof b?.evaluation_json?.total==='number'?(b.evaluation_json.total-a.evaluation_json.total).toFixed(1):'—'}</div>`;

 if(tag==='div'&&(attrs.class||'').includes('flex flex-col overflow-hidden bg-white'))side=(attrs.class||'').includes('border-r')?'a':'b';
 if(['script','style'].includes(tag))return '';
 if(tag==='template'){if(attrs['x-for'])return `{versions.map(v=><option key={v.version} value={v.version}>{copy('Version')} V{v.version} · {v.score??'—'}/10</option>)}`;return '';}
 if((attrs.class||'').includes('material-symbols-outlined'))return `<SourceIcon name=${quote((n.children||[]).map(v=>v.text||'').join('').trim())} className=${quote(attrs.class.replace('material-symbols-outlined','source-icon'))}/>`;
 let props='';for(const [key,value]of Object.entries(attrs)){
  if(key.startsWith('x-')||key.startsWith(':')||key.startsWith('@')||key==='style')continue;
  if(key==='class'){props+=` className={${quote(value)}${attrs[':class']?' + " " + ('+attrs[':class']+')':''}}`;continue;}
  if(key==='aria-label'||key==='title'){props+=` ${key}={copy(${quote(value)})}`;continue;}
  if(key==='href'){props+=' href="/?ui=05" onClick={event=>{event.preventDefault();navigate(5);}}';continue;}
  props+=` ${{tabindex:'tabIndex',viewbox:'viewBox'}[key]||key}=${quote(value)}`;
 }
 if(attrs['x-model'])props+=` value={${attrs['x-model']}} onChange={event=>set${attrs['x-model'][0].toUpperCase()+attrs['x-model'].slice(1)}(Number(event.target.value))}`;
 if(attrs['@click'])props+=` onClick={()=>{${attrs['@click'].startsWith('viewTab =')?'setViewTab('+attrs['@click'].split(' = ')[1]+')':'b&&restore(b.prompt_text)'}}}`;
 let children=attrs['x-text']?`{copy(String(${attrs['x-text']}))}`:(n.children||[]).map(child=>render(child,side)).join('');
 if(attrs['x-text']==='labTitle')children='{labTitle}';
 if(attrs['x-text']?.includes('Restore Version'))children="{(lang==='en'?'Restore version V':'Khôi phục phiên bản V')+versionB+(lang==='en'?' to workspace':' vào không gian làm việc')}";
 if(attrs['x-text']?.includes('Comparing V'))children="{(lang==='en'?'Comparing V':'So sánh V')+versionA+(lang==='en'?' vs V':' với V')+versionB}";
 if(attrs['x-text']?.includes('Attempt V'))children=`{copy('Attempt')+' V'+${side}?.attempt_number}`;

 if(tag==='div'&&(attrs.class||'').includes('flex-1 p-5 overflow-y-auto'))children=`<pre>{diff.lines.filter(line=>line.kind!==${side==='a'?"'added'":"'removed'"}).map((line,index)=><span key={index} className={'block px-2 py-1 '+(line.kind==='added'?'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500':line.kind==='removed'?'bg-red-50 text-red-900 border-l-2 border-red-500':'' )}>{line.text+"\\n"}</span>)}</pre>`;
 if(tag==='body')props+=' data-source-ui="UI-06"';
 return ['input','img','hr','br'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;
}
fs.writeFileSync('src/components/rebuild/ProductionCompareSource.tsx',`// Word UI-06 with real saved attempts and bounded text diff.
import React,{useState} from 'react';
import type {ProductAttempt} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {lineDiff} from '../../services/textDiffService';
import {SourceIcon} from './SourceIcon';
import './source-ui.css';
export default function ProductionCompareSource({attempts,title,restore,navigate}:{attempts:ProductAttempt[];title:string;restore:(value:string)=>void;navigate:(ui:number)=>void}){
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang),labTitle=title;
 const [versionA,setVersionA]=useState(attempts[1]?.attempt_number||attempts[0]?.attempt_number||0),[versionB,setVersionB]=useState(attempts[0]?.attempt_number||0),[viewTab,setViewTab]=useState('prompt');
 const versions=attempts.map(row=>({version:row.attempt_number,score:row.evaluation_json?.total})),a=attempts.find(row=>row.attempt_number===versionA),b=attempts.find(row=>row.attempt_number===versionB),diff=lineDiff(viewTab==='prompt'?a?.prompt_text||'':a?.ai_output||'',viewTab==='prompt'?b?.prompt_text||'':b?.ai_output||'');
 if(!attempts.length)return <main className="source-ui min-h-screen p-8"><h1 className="text-2xl font-bold">{copy('Version comparison')}</h1><p className="my-4">{copy('No saved attempts yet.')}</p><button onClick={()=>navigate(5)} className="bg-m3-primary text-white rounded-full px-5 py-3">{copy('Return to workspace')}</button></main>;
 return <div className="source-ui">${render(t.body)}</div>;
}
`);
console.log('Compiled source UI-06 with stored-version comparison and restore.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
