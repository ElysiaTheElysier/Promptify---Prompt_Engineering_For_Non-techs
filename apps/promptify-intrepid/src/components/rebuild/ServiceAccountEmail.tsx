import {useState} from 'react';
import {useProductLanguage} from '../../services/productI18nService';

/** The Google address customers share Sheets / Drive files with (Viewer), with a copy button. */
export default function ServiceAccountEmail({email}:{email?:string}){
 const vi=useProductLanguage()!=='en',[copied,setCopied]=useState(false);
 if(!email)return null;
 const copy=()=>void navigator.clipboard?.writeText(email).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);},()=>undefined);
 return <div className="mt-3 rounded-xl border border-m3-outline-variant p-3 text-sm" data-testid="service-account-email">
  <p className="font-semibold">{vi?'Chia sẻ Sheet / thư mục cho địa chỉ này, quyền Người xem (Viewer):':'Share the Sheet / folder with this address as Viewer:'}</p>
  <div className="mt-2 flex flex-wrap items-center gap-2">
   <code className="min-w-0 break-all font-mono">{email}</code>
   <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm shrink-0" onClick={copy} aria-live="polite">{copied?(vi?'Đã copy':'Copied'):'Copy'}</button>
  </div>
  <p className="mt-2 text-m3-on-surface-variant">{vi?'Bỏ tick “Thông báo cho mọi người”: đây là tài khoản máy, không nhận email. App chỉ đọc, không ghi vào Sheet.':'Untick “Notify people”: it is a machine account with no inbox. The app only reads; it never writes to the Sheet.'}</p>
 </div>;
}
