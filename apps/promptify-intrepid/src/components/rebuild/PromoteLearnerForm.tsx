import {useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import {confirmAction} from '../common/UiFeedback';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
/** Governance (admin): turn an existing learner into a facilitator for the selected class's course. Audited server-side. */
export default function PromoteLearnerForm({snapshot,busy,onAction}:{snapshot:ProductSnapshot;busy:boolean;onAction:Action}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const [email,setEmail]=useState(''),[permission,setPermission]=useState('editor'),[reason,setReason]=useState(''),[done,setDone]=useState('');
 if(snapshot.profile.role!=='admin'||!snapshot.selectedClass)return null;
 const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())&&reason.trim().length>=5;
 const submit=async()=>{const target=email.trim().toLowerCase();const {ok}=await confirmAction({title:p('Promote to facilitator?','Chuyển thành giảng viên?'),body:p(`${target} becomes a facilitator (${permission}) for this course and will stop seeing the learner workspace. The change is recorded in the audit log.`,`${target} sẽ thành giảng viên (${permission}) cho khoá học này và không còn vào không gian học viên. Thay đổi được ghi vào nhật ký audit.`),confirmLabel:p('Promote','Chuyển vai')});if(!ok)return;
  void onAction('promoteLearner',{email:target,permission,reason},()=>{setDone(target);setEmail('');setReason('');});};
 return <section className="source-ui mx-4 my-6 border border-m3-outline-variant rounded-2xl p-5 bg-white space-y-3" aria-labelledby="promote-learner-title">
  <h2 id="promote-learner-title" className="font-bold text-lg">{p('Promote learner to facilitator','Chuyển học viên thành giảng viên')}</h2>
  <p>{p(`For an existing learner account only. Grants ${snapshot.selectedClass.course_title||'this course'} with the chosen permission and records the change in the audit log. New people: use Class access.`,`Chỉ dành cho tài khoản học viên đã có. Cấp quyền khoá ${snapshot.selectedClass.course_title||'này'} theo mức đã chọn và ghi vào nhật ký audit. Người mới: dùng mục Class access.`)}</p>
  <form className="grid gap-3 max-w-xl" onSubmit={e=>{e.preventDefault();if(valid)void submit();}}>
   <label>{p('Learner email','Email học viên')}<input type="email" required className="w-full border rounded-xl p-3" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>{p('Permission','Quyền')}<select className="w-full border rounded-xl p-3" value={permission} onChange={e=>setPermission(e.target.value)}><option value="viewer">{p('Viewer','Xem')}</option><option value="editor">{p('Editor','Chỉnh sửa')}</option><option value="owner">{p('Owner','Chủ sở hữu')}</option></select></label>
   <label>{p('Reason (recorded in audit)','Lý do (ghi vào audit)')}<input className="w-full border rounded-xl p-3" value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label>
   <p style={{margin:0,fontSize:'13px',color:'#475569'}}>{p('Enter the email and a reason of at least 5 characters to enable the button.','Nhập email và lý do (tối thiểu 5 ký tự) để bật nút.')}</p><div className="ui-btn-row"><button type="submit" className="ui-btn ui-btn-primary" disabled={busy||!valid}>{p('Promote to facilitator','Chuyển thành giảng viên')}</button></div>
  </form>
  {done&&<p role="status">{p(`${done} is now a facilitator. They should sign in again.`,`${done} đã là giảng viên. Người này cần đăng nhập lại.`)}</p>}
 </section>;
}
