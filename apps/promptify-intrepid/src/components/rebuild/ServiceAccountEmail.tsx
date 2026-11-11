import {useState} from 'react';
import {useProductLanguage} from '../../services/productI18nService';

/** The Google address customers share Sheets / Drive folders with (Viewer), one line with a copy button. */
export default function ServiceAccountEmail({email}:{email?:string}){
 const vi=useProductLanguage()!=='en',[copied,setCopied]=useState(false);
 if(!email)return null;
 const copy=()=>void navigator.clipboard?.writeText(email).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);},()=>undefined);
 return <div className="mt-3 max-w-[560px] rounded-xl border border-m3-outline-variant px-3 py-2" data-testid="service-account-email">
  <div className="text-xs font-semibold text-m3-on-surface-variant">{vi?'Chia sẻ quyền Người xem (Viewer) cho':'Share as Viewer with'}</div>
  <div className="mt-1 flex items-center gap-2">
   <code className="min-w-0 flex-1 truncate font-mono text-sm" title={email}>{email}</code>
   <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm shrink-0" onClick={copy} aria-live="polite">{copied?(vi?'Đã copy':'Copied'):'Copy'}</button>
  </div>
 </div>;
}
