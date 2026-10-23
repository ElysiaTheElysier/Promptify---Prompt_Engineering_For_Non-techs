import fs from 'node:fs';
const templates=JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json','utf8'));
const quote=JSON.stringify;
const fixes=new Map([
 ["Select your correct department below. Your request will be flagged in the","Select the requested department below. Your correction is recorded in the"],
 ["Roster Sync Log","profile correction log"],
 ["for trainer review, but you can proceed immediately.","for administrator review. Assigned access changes only after approval."],
 ["Reason / Note for Training Lead (Optional):","Reason for correction (required):"],

 ['Intrepid Asia SSO Roster Verified','Intrepid Asia email detected. Access is verified after Google sign-in.'],
 ['Non-Intrepid domain. Will trigger UI-03 Access Denied.','Access is verified after Google sign-in.'],
 ['Vo Tu Duc (Enterprise Training Lead)','duonglh.work@gmail.com'],
 ['Linh Pham','__FULLNAME__'],['linh.pham@intrepid.asia','__EMAIL__'],['PL','__INITIALS__'],
 ["We matched your Google SSO with Intrepid's Enterprise Roster Sheet.",'Your Google identity is verified. Confirm your name before entering your assigned workspace.'],
 ['1 of 27 Business Functions','Assigned workspace'],
 ['INT-2026-0842','—'],['Ho Chi Minh Office','—'],
]);
for(const index of [1,2,3]){
 function render(n){
  if(n.text!==undefined){const trim=n.text.trim(),value=fixes.get(trim)||n.text;if(value==='__FULLNAME__')return index===2?'<label className="block text-xs font-semibold">{copy("Full name")}<input autoComplete="name" className="mt-2 w-full rounded-xl border border-m3-outline-variant px-3 py-2 text-sm bg-white" value={fullName} onChange={event=>setFullName(event.target.value)} maxLength={120} required aria-label={copy("Full name")}/></label>':'{fullName||copy("Full name")}';if(value==='__EMAIL__')return '{email}';if(value==='__INITIALS__')return '{(fullName||email).slice(0,2).toUpperCase()}';return `{copy(${quote(value)})}`;}
  if(index===2&&n.id===19)return '<div className="profile-identity"><div className="profile-identity-heading"><div className="profile-avatar">{(fullName||email).slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-sm break-all">{email}</p></div><span className="profile-verified">SSO VERIFIED</span></div><label className="profile-name-label">{copy("Full name")}<input autoComplete="name" className="profile-name-input" value={fullName} onChange={event=>setFullName(event.target.value)} maxLength={120} required aria-label={copy("Full name")}/></label></div>';
  const a=n.attrs||{},tag=n.tag==='body'?'div':n.tag;
  if(tag==='div'&&(n.children||[]).some(c=>c.tag==='span'&&(c.children||[]).some(t=>/Prototype (Simulator|Security)/.test(t.text||''))))return '';
  if(tag==='template'){const inner=(n.children||[]).map(render).join('');if(a['x-for'])return `{departments.map(dept=><React.Fragment key={dept}>${inner}</React.Fragment>)}`;return a['x-if']?`{(${a['x-if']})&&<>${inner}</>}`:`<>${inner}</>`;}
  if(['script','style'].includes(tag))return '';
  if((a.class||'').includes('material-symbols-outlined'))return `<SourceIcon name=${quote((n.children||[]).map(v=>v.text||'').join('').trim())} className=${quote(a.class.replace('material-symbols-outlined','source-icon'))}/>`;
  let props='';for(const [key,v] of Object.entries(a)){
   if(key.startsWith('@')||key.startsWith('x-')||key.startsWith(':')||key==='style')continue;
   if(['required','disabled','readonly'].includes(key)){props+=` ${key==='readonly'?'readOnly':key}={true}`;continue;}
   if(key==='class'){props+=` className={${quote(v)}${a[':class']?' + " " + ('+a[':class']+')':''}}`;continue;}
   if(key==='href'){props+=` href=${quote(v==='/'?'/?ui=00':/auth|login/.test(v)?'/?ui=01':v)}${/auth|login/.test(v)?' onClick={event=>{event.preventDefault();void signOut();}}':''}`;continue;}
   props+=` ${{for:'htmlFor',tabindex:'tabIndex',viewbox:'viewBox','stroke-width':'strokeWidth','fill-rule':'fillRule','clip-rule':'clipRule'}[key]||key}=${quote(v)}`;
  }
  if(a[':disabled'])props+=` disabled={${a[':disabled']}}`;
  if(a['x-model']){const field=a['x-model'];props+=` value={${field}} onChange={event=>set${field[0].toUpperCase()+field.slice(1)}(event.target.value)}`;}
  if(a['@click']){const action=a['@click'];let handler;
   if(action.startsWith('lang ='))handler="setProductLanguage(lang==='en'?'vi':'en')";
   else if(action.startsWith('hasMismatch'))handler='setHasMismatch(!hasMismatch)';
   else if(action.includes('isAuthenticating'))handler='void signIn()';
   else if(action.includes('isSubmitting'))handler='void confirm()';
   else if(action.includes('clipboard'))handler="void navigator.clipboard.writeText('duonglh.work@gmail.com').then(()=>setCopiedContact(true)).catch(()=>setNotice(copy('Unable to copy contact email.')))";
   else throw new Error('Unhandled entry action '+action);
   props+=` onClick={()=>{${handler}}}`;
  }
  const entryCopy=a['x-text']||'';
  const corrected=entryCopy.includes('Strictly restricted to registered')?'Sign in with Google. Access depends on your provisioned role and assigned classes.':entryCopy.includes('We matched your Google SSO')?'Your Google identity is verified. Confirm your name before entering your assigned workspace.':entryCopy.includes('MVP is strictly restricted')?'Access requires an authorized role, an assigned class and compliance with its organization domain policy.':entryCopy.includes('Your @intrepid.asia email address is recognized')?'Your verified email has not been provisioned for this workspace. Contact the training administrator.':null;
  let children=a['x-text']?`{copy(String(${a['x-text'].replace(/duc\.vo@intrepid\.asia/g,'duonglh.work@gmail.com').replace(/Giảng viên \(Võ Từ Đức\)/g,'Quản trị đào tạo')}))}`:(n.children||[]).map(render).join('');
  if(corrected)children=`{copy(${quote(corrected)})}`;
  if(index===3&&entryCopy.includes('Your account does not meet'))children=`{copy(String(viewDenied?(lang==='en'?'Access depends on your assigned role and class.':'Quyền truy cập phụ thuộc role và lớp được cấp.'):(${entryCopy})))}`;
  if(index===2&&tag==='div'&&(a.class||'').includes('space-y-3')&&(n.children||[]).some(c=>c.tag==='button'&&c.attrs?.['@click']?.startsWith('hasMismatch')))children=`<label className="text-xs font-semibold">{copy('Full name')}<input className="mt-2 w-full rounded-xl border border-m3-outline-variant px-4 py-3 text-sm" value={fullName} onChange={event=>setFullName(event.target.value)} maxLength={120}/></label>`+children;
  if(n.tag==='body'){props+=` data-source-ui="UI-0${index}"`;children+=`{notice&&<p role="alert" className="px-4 py-3 bg-red-50 text-red-800 text-center">{notice}</p>}${index===1?'<StagingLogin/>':''}`;}
  let output=['input','img','br','hr'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;
  if(a['x-show'])output=`{(${a['x-show']})&&(${output})}`;return output;
 }
 const markup=render(templates[index].body);
 fs.writeFileSync(`src/components/rebuild/ProductionEntry${index}.tsx`,`// Compiled Word source UI-0${index}; provider/data adapters use actual server state.
import React,{useState} from 'react';
import {useProductLanguage,setProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {supabase} from '../../services/supabaseClient';
import {productRequest} from '../../services/productionClientService';
import type {ProductSnapshot} from '../../types/production';
import {SourceIcon} from './SourceIcon';
import {StagingLogin} from '../auth/StagingLogin';
import './source-ui.css';
export default function ProductionEntry({snapshot,email='',onConfirmed,viewDenied=false,onHome}:{snapshot?:ProductSnapshot|null;email?:string;onConfirmed?:()=>Promise<void>;viewDenied?:boolean;onHome?:()=>void}){
 const lang=useProductLanguage(),copy=(value:string)=>sourceUiText(value,lang),reason=new URLSearchParams(location.search).get('reason')==='session_expired'?'session_expired':'direct_login';
 const [emailInput,setEmailInput]=useState(email),[isAuthenticating,setIsAuthenticating]=useState(false),[notice,setNotice]=useState('');
 const [hasMismatch,setHasMismatch]=useState(false),[isSubmitting,setIsSubmitting]=useState(false),[isConfirmed,setIsConfirmed]=useState(false),[selectedDept,setSelectedDept]=useState(snapshot?.selectedClass?.department||''),[correctionNote,setCorrectionNote]=useState(''),[fullName,setFullName]=useState(snapshot?.profile.full_name||''),[copiedContact,setCopiedContact]=useState(false);
 const departments=[...new Set(snapshot?.classes.map(c=>c.department)||[])],denialReason=viewDenied?'view_not_allowed':new URLSearchParams(location.search).get('denial')||'unlisted_roster_email',attemptedEmail=email;
 const signIn=async()=>{setIsAuthenticating(true);const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/?ui=02',queryParams:emailInput?{login_hint:emailInput}:{}}});if(error)setNotice(copy('Unable to sign in. Please try again.'));setIsAuthenticating(false);};
 const signOut=async()=>{await supabase.auth.signOut();location.assign('/?ui=01');};
 const confirm=async()=>{if(isSubmitting)return;if(!fullName.trim()){setNotice(copy('Full name is required.'));return;}setIsSubmitting(true);try{if(hasMismatch){if(!correctionNote.trim())throw new Error(copy('Please describe the requested correction.'));await productRequest('profileCorrection',{requestId:crypto.randomUUID(),reason:selectedDept+' / '+correctionNote});}await productRequest('confirmProfile',{fullName});await onConfirmed?.();setIsConfirmed(true);}catch(error){setNotice((error as Error).message);}finally{setIsSubmitting(false);}};
 return <div className="source-ui">${index===3?'{viewDenied&&<section role="alert" className="mx-auto max-w-lg mt-6 px-6 py-5 rounded-2xl border border-amber-200 bg-amber-50"><h2 className="font-bold">{lang===\'en\'?\'This view is outside your assigned permissions.\':\'Màn hình này nằm ngoài quyền được cấp cho bạn.\'}</h2><p className="mt-2 text-sm">{lang===\'en\'?\'Your account is recognized. Return to your workspace or ask the administrator to review your role.\':\'Tài khoản của bạn đã được nhận diện. Quay về không gian làm việc hoặc nhờ quản trị viên kiểm tra role.\'}</p><button className="mt-4 rounded-full bg-m3-primary px-5 py-3 text-white font-semibold" onClick={onHome}>{lang===\'en\'?\'Return to my workspace\':\'Về không gian làm việc của tôi\'}</button></section>}':''}${markup}</div>;
}
`);
}
console.log('Compiled source entry screens UI-01,02,03 with real identity/profile adapters.');

for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource)\.tsx$/.test(name))){const path='src/components/rebuild/'+file;const code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');fs.writeFileSync(path,code);}

await import("./apply_combined_brand.mjs?"+Date.now());
