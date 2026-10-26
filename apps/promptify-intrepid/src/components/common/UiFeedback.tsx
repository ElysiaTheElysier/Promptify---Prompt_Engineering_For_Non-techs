import {useEffect,useState} from 'react';
import {ProductDialog} from './ProductDialog';
import {useProductLanguage} from '../../services/productI18nService';
import './ui-kit.css';

export type ConfirmOptions={title:string;body:string;confirmLabel:string;tone?:'primary'|'danger';reasonLabel?:string;reasonRequired?:boolean};
type Pending={options:ConfirmOptions;resolve:(result:{ok:boolean;reason:string})=>void};
let openConfirm:((pending:Pending)=>void)|undefined;

/** Asks before a consequential action. Resolves {ok:false} on cancel/Escape. Needs one <ConfirmHost/> mounted. */
export function confirmAction(options:ConfirmOptions):Promise<{ok:boolean;reason:string}>{
 return new Promise(resolve=>{if(openConfirm)openConfirm({options,resolve});else resolve({ok:window.confirm(options.body),reason:''});});
}
export function ConfirmHost(){
 const lang=useProductLanguage();
 const [pending,setPending]=useState<Pending>(),[reason,setReason]=useState('');
 useEffect(()=>{openConfirm=next=>{setReason('');setPending(next);};return()=>{openConfirm=undefined;};},[]);
 if(!pending)return null;
 const {title,body,confirmLabel,tone='primary',reasonLabel,reasonRequired}=pending.options;
 const done=(ok:boolean)=>{pending.resolve({ok,reason:reason.trim()});setPending(undefined);};
 return <ProductDialog title={title} onClose={()=>done(false)}><div className={'ui-confirm'+(tone==='danger'?' ui-confirm-danger':'')}>
  <h2>{title}</h2><p>{body}</p>
  {reasonLabel&&<label>{reasonLabel}<textarea value={reason} maxLength={1000} onChange={event=>setReason(event.target.value)}/></label>}
  <div className="ui-btn-row ui-btn-row-end">
   <button type="button" className="ui-btn ui-btn-ghost" onClick={()=>done(false)}>{lang==='en'?'Cancel':'Huỷ'}</button>
   <button type="button" className={'ui-btn '+(tone==='danger'?'ui-btn-danger ui-btn-solid':'ui-btn-primary')} disabled={!!reasonRequired&&reason.trim().length<3} onClick={()=>done(true)}>{confirmLabel}</button>
  </div></div></ProductDialog>;
}
/** One toast for the whole app. Success messages hide themselves; errors stay until closed or the screen changes. */
export function Toast({kind,message,onClose}:{kind:'error'|'success';message:string;onClose:()=>void}){
 const lang=useProductLanguage();
 useEffect(()=>{if(kind!=='success'||!message)return;const timer=setTimeout(onClose,4000);return()=>clearTimeout(timer);},[kind,message]);
 if(!message)return null;
 return <div role={kind==='error'?'alert':'status'} className={'ui-toast ui-toast-'+kind}><span>{message}</span>
  <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" aria-label={lang==='en'?'Dismiss':'Đóng'} onClick={onClose}>×</button></div>;
}
