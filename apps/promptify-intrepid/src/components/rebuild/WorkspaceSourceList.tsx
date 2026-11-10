import {useState} from 'react';
import {useProductLanguage} from '../../services/productI18nService';
import {confirmAction} from '../common/UiFeedback';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
type Source={kind:'sheets'|'folders'|'files';source_id:string;origin:'env'|'db'};
const kindOf=(link:string)=>/\/spreadsheets\//.test(link)?'sheets':/\/folders\//.test(link)?'folders':/\/(file|document|presentation)\/d\//.test(link)?'files':'';
const linkOf=(row:Source)=>row.kind==='sheets'?`https://docs.google.com/spreadsheets/d/${row.source_id}/edit`:row.kind==='folders'?`https://drive.google.com/drive/folders/${row.source_id}`:`https://drive.google.com/file/d/${row.source_id}/view`;
/** Governance (admin, TM-008): approve which Google Sheets / Drive folders / Drive files this class may read (migration 025, audited). */
export default function WorkspaceSourceList({sources,busy,onAction,onChanged}:{sources?:Source[];busy:boolean;onAction:Action;onChanged:()=>void}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const [link,setLink]=useState(''),[kind,setKind]=useState(''),[reason,setReason]=useState('');
 if(!sources)return null;
 const label=(k:string)=>k==='sheets'?p('Google Sheet','Google Sheet'):k==='folders'?p('Drive folder','Thư mục Drive'):p('Drive file','File Drive');
 const chosen=kind||kindOf(link);
 const approve=()=>void onAction('saveWorkspaceSource',{kind:chosen,source:link,approved:true,reason},()=>{setLink('');setKind('');setReason('');onChanged();});
 const revoke=async(row:Source)=>{
  const {ok,reason:why}=await confirmAction({title:p('Remove approval?','Gỡ duyệt nguồn?'),body:p('This class can no longer read this source. Data already imported stays. Recorded in the audit log.','Lớp này sẽ không đọc được nguồn này nữa. Dữ liệu đã nhập vẫn giữ. Thay đổi được ghi vào nhật ký audit.'),confirmLabel:p('Remove','Gỡ'),tone:'danger',reasonLabel:p('Reason (recorded in audit)','Lý do (ghi vào audit)'),reasonRequired:true});
  if(ok)void onAction('saveWorkspaceSource',{kind:row.kind,source:row.source_id,approved:false,reason:why},onChanged);
 };
 return <div className="mt-5" data-testid="workspace-sources">
  <h4 className="font-bold">{p('Approved Google sources for this class','Nguồn Google được duyệt cho lớp này')}</h4>
  <p className="mt-1 text-m3-on-surface-variant">{p('Share the file or folder with the Promptify service account (Viewer) first. Files added later to an approved folder need no new approval.','Trước tiên hãy chia sẻ file hoặc thư mục cho service account của Promptify (quyền Viewer). File bỏ thêm vào thư mục đã duyệt dùng được ngay.')}</p>
  {sources.length?<ul className="mt-2 space-y-2">{sources.map(row=><li key={row.origin+row.kind+row.source_id} className="border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
   <span className="min-w-0 break-all"><span className="mr-2 px-2.5 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap">{label(row.kind)}</span><a href={linkOf(row)} target="_blank" rel="noopener noreferrer"><code>{row.source_id}</code></a></span>
   {row.origin==='db'?<button type="button" className="ui-btn ui-btn-danger ui-btn-sm" disabled={busy} onClick={()=>void revoke(row)}>{p('Remove','Gỡ')}</button>:<span className="text-xs">{p('Server configuration','Cấu hình server')}</span>}
  </li>)}</ul>:<p className="mt-2">{p('No source approved yet: roster sync, SOP and slide import from Drive are blocked for this class.','Chưa duyệt nguồn nào: lớp này chưa sync roster, chưa nhập SOP hay slide từ Drive được.')}</p>}
  <div className="mt-3 grid gap-2">
   <label>{p('Link (or ID) of the Sheet, folder or file','Link (hoặc ID) của Sheet, thư mục hoặc file')}<input value={link} placeholder="https://docs.google.com/spreadsheets/d/…" onChange={e=>setLink(e.target.value)}/></label>
   <label>{p('Type','Loại')}<select value={chosen} onChange={e=>setKind(e.target.value)}><option value="">{p('Choose…','Chọn…')}</option><option value="sheets">{label('sheets')}</option><option value="folders">{label('folders')}</option><option value="files">{label('files')}</option></select></label>
   <label>{p('Reason (recorded in audit)','Lý do (ghi vào audit)')}<input value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <div className="ui-btn-row"><button type="button" className="ui-btn ui-btn-primary" disabled={busy||!link.trim()||!chosen||reason.trim().length<3} onClick={approve}>{p('Approve source','Duyệt nguồn')}</button></div>
  </div>
 </div>;
}
