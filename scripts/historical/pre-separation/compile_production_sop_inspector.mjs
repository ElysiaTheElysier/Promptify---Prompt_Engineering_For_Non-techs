import fs from 'node:fs';
const t=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'))[8],quote=JSON.stringify;
function find(n){if(n.attrs?.['@click.away']==='drawerOpen = false')return n;for(const child of n.children||[]){const result=find(child);if(result)return result;}}
function render(n){
 if(n.text!==undefined){const value=n.text.trim().replace(/\s+/g,' ');if(value==='Copy Page 4 Citation')return '{copy("Copy current citation")}';if(value==='Mở file gốc trên Drive'||value==='Open Original File in Drive')return '{copy("Open original file")}';return `{copy(${quote(n.text)})}`;}
 const a=n.attrs||{},tag=n.tag;
 if(tag==='template'){const inner=(n.children||[]).map(render).join('');if(a['x-for']){const parts=a['x-for'].split(' in '),variables=parts[0].replace(/[()]/g,'').split(',').map(s=>s.trim());return `{${parts[1]}.map((${variables.join(',')})=><React.Fragment key={${variables[1]||variables[0]+'.number'}}> ${inner}</React.Fragment>)}`;}return a['x-if']?`{(${a['x-if']})&&<>${inner}</>}`:`<>${inner}</>`;}
 if((a.class||'').includes('material-symbols-outlined'))return `<SourceIcon name=${quote((n.children||[]).map(v=>v.text||'').join('').trim())} className=${quote(a.class.replace('material-symbols-outlined','source-icon'))}/>`;
 let props='';for(const [key,value]of Object.entries(a)){
  if(key.startsWith('x-')||key.startsWith(':')||key.startsWith('@')||key==='style')continue;
  if(key==='class'){props+=` className={${quote(value)}${a[':class']?' + " " + sourceClasses('+a[':class']+')':''}}`;continue;}
  if(key==='href'){props+=' href={driveUrl||"#"} aria-disabled={!driveUrl&&!source.metadata?.storagePath} onClick={event=>{if(!driveUrl){event.preventDefault();if(source.metadata?.storagePath)void downloadOriginal();}}}';continue;}
  props+=` ${{viewbox:'viewBox',tabindex:'tabIndex'}[key]||key}=${quote(value)}`;
 }
 if(a['x-model'])props+=' value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} aria-label={copy("Search source text")}';
 if(a['@click']){const action=a['@click'];let handler;if(action==='drawerOpen = false')handler='onClose()';else if(action==='searchQuery = \'\'')handler="setSearchQuery('')";else if(action==='selectedPage = p.number')handler='setSelectedPage(p.number)';else if(action.includes('sec.citationTag'))handler='void copyCitation(sec.citationTag)';else handler='void copyCitation(pageContent[0].citationTag)';props+=` onClick={()=>{${handler}}}`;}
 if(tag==='button'&&a['@click']==='drawerOpen = false')props+=' aria-label={copy("Close source drawer")}';
 let children=a['x-text']?.includes('Open Original in Google Drive')?'{copy("Open original file")}':a['x-text']?`{${['activeDoc.title','sec.text','sec.citationTag','sec.section'].includes(a['x-text'])?a['x-text']:'copy(String('+a['x-text']+'))'}}`:(n.children||[]).map(render).join('');
 if(a['x-text']?.startsWith('`Page '))children='{copy("Page")+" "+p.number}';
 if(a['x-text']?.startsWith('`Rendering Page '))children='{(lang==="en"?"Viewing page ":"Đang xem trang ")+selectedPage+" / "+activeDoc.totalPages}';
 if(a['x-text']?.startsWith('`Last Sync:'))children='{copy("Last sync")+": "+activeDoc.lastSynced}';
 let output=['input','img','br','hr'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;
 if(a['x-show'])output=`{(${a['x-show']})&&(${output})}`;return output;
}
fs.writeFileSync('src/components/rebuild/ProductionSopInspectorSource.tsx',`// UI-08 displays canonical extracted pages only; no fabricated page bodies or citations.
import React,{useState} from 'react';
import {useProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {SourceIcon} from './SourceIcon';
import {productRequest} from '../../services/productionClientService';
import {useSourceDialog} from './useSourceDialog';
import './source-ui.css';
const sourceClasses=(value:any):string=>typeof value==='string'?value:Object.entries(value||{}).filter(([,active])=>active).map(([key])=>key).join(' ');
export default function ProductionSopInspectorSource({source,classId,onClose}:{source:any;classId:string;onClose:()=>void}){
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang),dialogRef=useSourceDialog(true,onClose);
 const [searchQuery,setSearchQuery]=useState(''),[copiedCitation,setCopiedCitation]=useState(false),[selectedPage,setSelectedPage]=useState(1);
 const parts=[...String(source.content||'').matchAll(/\\[Page (\\d+)\\]\\n([\\s\\S]*?)(?=\\n\\n\\[Page \\d+\\]\\n|$)/g)],sections=parts.length?parts.map(match=>({number:Number(match[1]),text:match[2]})):[{number:1,text:source.content||''}];
 const pages=sections.map(section=>({number:section.number,matches:!!searchQuery&&section.text.toLowerCase().includes(searchQuery.toLowerCase())})),selected=sections.find(section=>section.number===selectedPage)||sections[0];
 const pageContent=[{section:copy(parts.length?'Page':'Source text')+' '+selected.number,text:selected.text,ruleId:'',highlighted:!!searchQuery&&selected.text.toLowerCase().includes(searchQuery.toLowerCase()),citationTag:source.citation+(parts.length?' Page '+selected.number:'')}];
 const indexedAt=source.chunks?.[0]?.indexed_at,activeDoc={title:source.title,version:'v'+source.version,totalPages:sections.length,syncStatus:source.chunks?.length?copy('Indexed'):copy('Not indexed'),lastSynced:indexedAt?new Date(indexedAt).toLocaleString(lang==='en'?'en-US':'vi-VN'):'—'},driveUrl=source.metadata?.driveFileId?'https://drive.google.com/file/d/'+encodeURIComponent(source.metadata.driveFileId)+'/view':undefined;
 const downloadOriginal=async()=>{try{const result=await productRequest('sourceDownload',{classId,versionId:source.id});const a=document.createElement('a');a.href=result.url;a.rel='noopener';a.click();}catch(error){window.alert((error as Error).message);}};
 const copyCitation=async(value:string)=>{try{await navigator.clipboard.writeText(value);setCopiedCitation(true);}catch{setCopiedCitation(false);}};
 return <div className="source-ui fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"><div ref={dialogRef} role="dialog" aria-modal="true" aria-label={copy('SOP inspector')} className="w-full max-w-xl h-full">${render(find(t.body))}</div></div>;
}
`);
console.log('Compiled source UI-08 for canonical SOP text and actual page citations.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
