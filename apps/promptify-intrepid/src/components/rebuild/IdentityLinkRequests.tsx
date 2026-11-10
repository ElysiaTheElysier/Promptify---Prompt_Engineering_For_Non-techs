import {useProductLanguage} from '../../services/productI18nService';
import {confirmAction} from '../common/UiFeedback';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
type Pending={user_id:string;email:string;full_name?:string;role:string;requested_at:string};
/** Governance (admin, TM-003): staff accounts whose first Google sign-in waits for confirmation (migration 026, audited). */
export default function IdentityLinkRequests({requests,busy,onAction,onChanged}:{requests?:Pending[];busy:boolean;onAction:Action;onChanged:()=>void}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 if(!requests?.length)return null;
 const approve=async(row:Pending)=>{
  const {ok,reason}=await confirmAction({title:p('Confirm this sign-in?','Xác nhận lần đăng nhập này?'),
   body:p(`Approve only if you confirmed with ${row.email} (by phone or chat) that they just signed in. Their next sign-in binds this Google account to the ${row.role} account. Recorded in the audit log.`,`Chỉ duyệt khi bạn đã xác nhận với ${row.email} (gọi điện hoặc nhắn tin) rằng chính họ vừa đăng nhập. Lần đăng nhập tiếp theo sẽ gắn tài khoản Google này với vai ${row.role}. Thay đổi được ghi vào nhật ký audit.`),
   confirmLabel:p('Approve sign-in','Duyệt đăng nhập'),reasonLabel:p('How you confirmed it (recorded in audit)','Bạn đã xác nhận bằng cách nào (ghi vào audit)'),reasonRequired:true});
  if(ok)void onAction('approveIdentityLink',{userId:row.user_id,reason},onChanged);
 };
 return <div className="mt-5" data-testid="identity-link-requests">
  <h4 className="font-bold">{p('Staff sign-ins waiting for approval','Đăng nhập của nhân sự đang chờ duyệt')}</h4>
  <ul className="mt-2 space-y-2">{requests.map(row=><li key={row.user_id} className="border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
   <span className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1"><strong>{row.full_name||row.email}</strong><span className="text-m3-on-surface-variant break-all">{row.email}</span>
    <span className="px-2.5 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap">{row.role}</span>
    <span className="text-xs whitespace-nowrap">{new Date(row.requested_at).toLocaleString(lang==='en'?'en-GB':'vi-VN')}</span></span>
   <button type="button" className="ui-btn ui-btn-primary ui-btn-sm shrink-0" disabled={busy} onClick={()=>void approve(row)}>{p('Approve','Duyệt')}</button>
  </li>)}</ul>
 </div>;
}
