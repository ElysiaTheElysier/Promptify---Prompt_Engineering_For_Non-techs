// Generate ordinary React JSX from the vetted Word markup. No browser eval/CDNs.
import fs from 'node:fs';
const template=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'))[0];
const quoted=JSON.stringify;
const jsxNames={'class':'className','for':'htmlFor','tabindex':'tabIndex','viewbox':'viewBox','stroke-width':'strokeWidth','fill-rule':'fillRule','clip-rule':'clipRule'};
let input=0;
function render(node){
 if(node.text!==undefined)return `{copy(${quoted(node.text.replace('Gemini 3.8 Powered','Gemini Powered').replace('Unlimited executions & Gemini 3.8 Pro evaluation','Plan-based executions & Gemini evaluation').replace('Live Preview','Illustrative Preview').replace('Test Email Address:','Email Address:').replace('External domain detected. Will route to Public Free Tier.','Access is verified after Google sign-in.').replace('Intrepid Asia Enterprise Domain recognized!','Intrepid Asia email detected. Access is verified after Google sign-in.'))})}`;
 const attrs=node.attrs||{},tag=node.tag==='body'?'div':node.tag;
 if((node.children||[]).some(child=>child.text==='Detailed rubric scores are missing from the review source.'))return '<div className="col-span-5 grid grid-cols-5 gap-2" aria-label={lang===\'en\'?\'Criterion scores not provided in this illustration\':\'Minh họa chưa có điểm chi tiết\'}>{[0,1,2,3,4].map(key=><div key={key} className="bg-white/70 rounded-lg text-center py-3 text-slate-400">—</div>)}</div>';
 if(['script','style','template'].includes(tag))return '';
 if((attrs.class||'').includes('material-symbols-outlined'))return `<SourceIcon name=${quoted((node.children||[]).map(v=>v.text||'').join('').trim())} className=${quoted(attrs.class.replace('material-symbols-outlined','source-icon'))}/>`;
 let props='';
 for(const [key,value] of Object.entries(attrs)){
  if(key==='style'||key.startsWith('x-')||key.startsWith(':')||key.startsWith('@'))continue;
  if(['required','disabled','multiple','checked'].includes(key)){props+=` ${key}={true}`;continue;}
  if(key==='class'){props+=` className={${quoted(value)}${attrs[':class']?' + " " + ('+attrs[':class']+')':''}}`;continue;}
  if(['placeholder','title','aria-label','alt'].includes(key))props+=` ${key}={copy(${quoted(value)})}`;
  else props+=` ${jsxNames[key]||key}=${quoted(value)}`;
 }
 if(attrs['x-model'])props+=` value={${attrs['x-model']}} onChange={event=>setEmailInput(event.target.value)}`;
 if(tag==='input'&&!attrs['x-model'])props+=` name=${quoted(['company','taxId','email'][input++])}`;
 if(tag==='select')props+=' name="employees" aria-label={copy("Est. Employees:")}';
 if(tag==='option')props+=` value=${quoted((node.children||[]).map(v=>v.text||'').join('').trim())}`;
 if(attrs['@click.away'])props+=' ref={dialogRef} role="dialog" aria-modal="true" aria-label={authModalOpen?copy("Sign in to Promptify"):copy("Book an Enterprise Pilot")}';
 if(tag==='button'&&attrs.type==='submit')props+=' disabled={busy}';
 if(attrs['@click']){
  const action=attrs['@click'].trim();let handler;
  if(action.startsWith('lang ='))handler="setProductLanguage(lang==='en'?'vi':'en')";
  else if(/^(authModalOpen|b2bModalOpen) = (true|false)$/.test(action)){const [key,value]=action.split(' = ');handler=`set${key[0].toUpperCase()+key.slice(1)}(${value})`;}
  else if(action.startsWith('demoTab ='))handler=`setDemoTab(${action.split(' = ')[1]})`;
  else if(action.includes('Authenticated'))handler='void signIn()';
  else throw new Error('Unmapped production action: '+action);
  if(action==='authModalOpen = true'&&JSON.stringify(node).includes('Start Free Now'))handler="localStorage.setItem('promptify-basic-enrollment','requested');"+handler;
  props+=` onClick={()=>{${handler}}}`;
  if(action.includes('Authenticated'))props+=' disabled={busy}';
 }
 if(attrs['@submit.prevent'])props+=' onSubmit={submitEnterprise}';
 let children=attrs['x-text']?`{copy(String(${attrs['x-text']}))}`:(node.children||[]).map(render).join('');
 if(tag==='body')props+=' data-source-ui="UI-00"';
 let output=['input','img','br','hr'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;
 if(attrs['x-show'])output=`{(${attrs['x-show']})&&(${output})}`;
 return output;
}
const markup=render(template.body);
const component=`// Generated from Word UI-00; edit generator/adapters rather than the source layout.
import React,{useState} from 'react';
import {supabase} from '../../services/supabaseClient';
import {useProductLanguage,setProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {useSourceDialog} from './useSourceDialog';
import {SourceIcon} from './SourceIcon';
import './source-ui.css';
export default function ProductionLanding(){
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang);
 const [authModalOpen,setAuthModalOpen]=useState(false),[b2bModalOpen,setB2bModalOpen]=useState(false),[demoTab,setDemoTab]=useState('grounded'),[emailInput,setEmailInput]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const dialogRef=useSourceDialog(authModalOpen||b2bModalOpen,()=>{setAuthModalOpen(false);setB2bModalOpen(false);});
 const signIn=async()=>{setBusy(true);setNotice('');const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/?ui=02',queryParams:emailInput?{login_hint:emailInput}:{}}});if(error)setNotice(copy('Unable to sign in. Please try again.'));setBusy(false);};
 const submitEnterprise=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(busy)return;setBusy(true);setNotice('');const payload=Object.fromEntries(new FormData(event.currentTarget));try{const response=await fetch('/api/product',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'enterpriseRequest',requestId:crypto.randomUUID(),...payload})});if(!response.ok)throw new Error();setB2bModalOpen(false);setNotice(lang==='en'?'Enterprise request saved.':'Đã lưu yêu cầu doanh nghiệp.');}catch{setNotice(lang==='en'?'Could not save the request. Please try again.':'Chưa lưu được yêu cầu. Vui lòng thử lại.');}finally{setBusy(false);}};
 return <div className="source-ui">${markup}{notice&&<p role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl bg-slate-900 text-white px-6 py-4">{notice}</p>}</div>;
}
`;
fs.writeFileSync('src/components/rebuild/ProductionLanding.tsx',component);
console.log('Generated production UI-00 with Word source structure and real OAuth/request handlers.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
