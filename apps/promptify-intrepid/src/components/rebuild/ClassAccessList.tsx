import {useProductLanguage} from '../../services/productI18nService';
import {confirmAction} from '../common/UiFeedback';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
type Grant={user_id:string;permission:string;user?:{full_name?:string;email?:string}};
/** Governance (admin): who can manage or report on the selected class, with an audited revoke (023). */
export default function ClassAccessList({access,busy,onAction,onChanged}:{access?:{instructors:Grant[];heads:Grant[]};busy:boolean;onAction:Action;onChanged:()=>void}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 if(!access)return null;
 const rows=[...access.instructors.map(row=>({...row,role:'instructor'})),...access.heads.map(row=>({...row,role:'head'}))];
 const revoke=async(row:Grant&{role:string})=>{
  const who=row.user?.email||row.user_id;
  const {ok,reason}=await confirmAction({title:p('Revoke access?','Thu hồi quyền?'),
   body:row.role==='instructor'
    ?p(`${who} loses facilitator access to every cohort of this course. The account and past records stay. Recorded in the audit log.`,`${who} mất quyền giảng viên ở mọi lớp của khoá học này. Tài khoản và dữ liệu cũ vẫn giữ. Thay đổi được ghi vào nhật ký audit.`)
    :p(`${who} loses Head access to this cohort. The account and past records stay. Recorded in the audit log.`,`${who} mất quyền Head ở lớp này. Tài khoản và dữ liệu cũ vẫn giữ. Thay đổi được ghi vào nhật ký audit.`),
   confirmLabel:p('Revoke access','Thu hồi quyền'),tone:'danger',reasonLabel:p('Reason (recorded in audit)','Lý do (ghi vào audit)'),reasonRequired:true});
  if(ok)void onAction('revokeAccess',{userId:row.user_id,role:row.role,reason},onChanged);
 };
 return <div className="mt-5">
  <h4 className="font-bold">{p('People with access','Người đang có quyền')}</h4>
  {rows.length?<ul className="mt-2 space-y-2">{rows.map(row=><li key={row.role+row.user_id} className="border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
   <span className="min-w-0"><strong>{row.user?.full_name||row.user?.email}</strong>{row.user?.full_name&&<span className="ml-2 text-m3-on-surface-variant">{row.user?.email}</span>}
    <span className="ml-2 px-2.5 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap">{row.role==='instructor'?`${p('Instructor','Giảng viên')} · ${row.permission}`:p('Department head','Trưởng bộ phận')}</span></span>
   <button type="button" className="ui-btn ui-btn-danger ui-btn-sm" disabled={busy} onClick={()=>void revoke(row)}>{p('Revoke','Thu hồi')}</button>
  </li>)}</ul>:<p className="mt-2">{p('No instructor or Head has access yet. Administrators always have access.','Chưa có giảng viên hay Head nào có quyền. Quản trị viên luôn có quyền.')}</p>}
 </div>;
}
