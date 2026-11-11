import {useState} from 'react';
import {useProductLanguage} from '../../services/productI18nService';
import {confirmAction} from '../common/UiFeedback';
import ServiceAccountEmail from './ServiceAccountEmail';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
type Source={kind:'sheets'|'folders'|'files';source_id:string;origin:'env'|'db'};
const kindOf=(link:string)=>/\/spreadsheets\//.test(link)?'sheets':/\/folders\//.test(link)?'folders':/\/(file|document|presentation)\/d\//.test(link)?'files':'';
const linkOf=(row:Source)=>row.kind==='sheets'?`https://docs.google.com/spreadsheets/d/${row.source_id}/edit`:row.kind==='folders'?`https://drive.google.com/drive/folders/${row.source_id}`:`https://drive.google.com/file/d/${row.source_id}/view`;
const field='grid gap-1.5 text-sm font-semibold min-w-0',control='w-full h-12 border border-m3-outline-variant rounded-xl px-3 font-normal bg-white focus:outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary-container';
/** Governance (admin, TM-008): approve which Google Sheets / Drive folders / Drive files this class may read (migration 025, audited). */
export default function WorkspaceSourceList({sources,serviceAccount,classCode,busy,onAction,onChanged}:{sources?:Source[];serviceAccount?:string;classCode?:string;busy:boolean;onAction:Action;onChanged:()=>void}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const [link,setLink]=useState(''),[kind,setKind]=useState(''),[reason,setReason]=useState('');
 if(!sources)return null;
 const label=(k:string)=>k==='sheets'?'Google Sheet':k==='folders'?p('Drive folder','Thư mục Drive'):p('Drive file','File Drive');
 const chosen=kind||kindOf(link);
 const approve=()=>void onAction('saveWorkspaceSource',{kind:chosen,source:link,approved:true,reason},()=>{setLink('');setKind('');setReason('');onChanged();});
 const revoke=async(row:Source)=>{
  const {ok,reason:why}=await confirmAction({title:p('Remove approval?','Gỡ duyệt nguồn?'),body:p('This class can no longer read this source. Data already imported stays. Recorded in the audit log.','Lớp này sẽ không đọc được nguồn này nữa. Dữ liệu đã nhập vẫn giữ. Thay đổi được ghi vào nhật ký audit.'),confirmLabel:p('Remove','Gỡ'),tone:'danger',reasonLabel:p('Reason (recorded in audit)','Lý do (ghi vào audit)'),reasonRequired:true});
  if(ok)void onAction('saveWorkspaceSource',{kind:row.kind,source:row.source_id,approved:false,reason:why},onChanged);
 };
 return <section className="mt-6 border rounded-2xl p-5" data-testid="workspace-sources">
  <h3 className="font-bold text-lg">{p('Approved Google sources','Nguồn Google được duyệt')}{classCode&&<span className="ml-2 text-sm font-normal text-m3-on-surface-variant">{p('class','lớp')} {classCode}</span>}</h3>
  <p className="mt-1 text-sm text-m3-on-surface-variant">{p('Share the file or folder with the Promptify service account (Viewer) first. Sheets, slides and SOP files added later to an approved folder need no new approval.','Trước tiên hãy chia sẻ file hoặc thư mục cho service account của Promptify (quyền Viewer). Sheet roster, slide, SOP bỏ thêm vào thư mục đã duyệt dùng được ngay, không cần duyệt lại.')}</p>
  <ServiceAccountEmail email={serviceAccount}/>
  {sources.length?<ul className="mt-4 space-y-2">{sources.map(row=><li key={row.origin+row.kind+row.source_id} className="border rounded-xl p-3 flex flex-wrap items-center gap-x-3 gap-y-2">
   <span className="shrink-0 px-2.5 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap">{label(row.kind)}</span>
   {/* basis-48: on a narrow screen the ID moves to its own line instead of shrinking to a few characters. */}
   <a className="min-w-0 flex-1 basis-48 truncate font-mono text-sm text-m3-primary hover:underline" href={linkOf(row)} target="_blank" rel="noopener noreferrer" title={row.source_id}>{row.source_id}</a>
   {row.origin==='db'
    ?<button type="button" className="ui-btn ui-btn-danger ui-btn-sm shrink-0" disabled={busy} onClick={()=>void revoke(row)}>{p('Remove','Gỡ')}</button>
    :<span className="shrink-0 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap" title={p('Set in the server environment; changing it needs a deploy.','Đặt trong cấu hình server; muốn đổi phải deploy.')}>{p('Server configuration','Cấu hình server')}</span>}
  </li>)}</ul>:<p className="mt-4 text-sm">{p('No source approved yet: roster sync, SOP and slide import from Drive are blocked for this class.','Chưa duyệt nguồn nào: lớp này chưa sync roster, chưa nhập SOP hay slide từ Drive được.')}</p>}
  <form className="mt-5 grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start" onSubmit={e=>{e.preventDefault();approve();}}>
   <label className={field}>{p('Link (or ID) of the Sheet, folder or file','Link (hoặc ID) của Sheet, thư mục hoặc file')}<input className={control} value={link} placeholder="https://docs.google.com/spreadsheets/d/…" onChange={e=>setLink(e.target.value)}/></label>
   <label className={field}>{p('Type','Loại')}<select className={control} value={chosen} onChange={e=>setKind(e.target.value)}><option value="">{p('Choose…','Chọn…')}</option><option value="sheets">{label('sheets')}</option><option value="folders">{label('folders')}</option><option value="files">{label('files')}</option></select></label>
   <label className={field+' md:col-span-2'}>{p('Reason (recorded in audit)','Lý do (ghi vào audit)')}<input className={control} value={reason} placeholder={p('E2E roster','Roster E2E')} onChange={e=>setReason(e.target.value)}/></label>
   <div className="ui-btn-row md:col-span-2"><button className="ui-btn ui-btn-primary" disabled={busy||!link.trim()||!chosen||reason.trim().length<3}>{p('Approve source','Duyệt nguồn')}</button></div>
  </form>
 </section>;
}
