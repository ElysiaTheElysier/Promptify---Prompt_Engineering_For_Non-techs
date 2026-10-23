import {useState} from 'react';
import {useProductLanguage} from '../../services/productI18nService';
type Props={rows:any[];userId:string;busy:boolean;onAction:(name:string,payload:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;refresh:()=>Promise<void>};
export default function ProductionRotation({rows,userId,busy,onAction,refresh}:Props){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const [provider,setProvider]=useState('gemini'),[reason,setReason]=useState('');
 return <section id="governance-rotation" className="governance-rotation">
  <h2 className="font-bold text-xl">{p('Credential rotation: two administrator approvals','Xoay khóa: hai quản trị viên duyệt')}</h2>
  <p className="text-sm text-slate-600 my-3">{p('Approval authorizes server-side replacement. It does not create a new provider key or revoke the old key. The operator applies the replacement only after two distinct approvals and verifies a new deployment.','Phê duyệt cho phép thay khóa trên server. Việc duyệt không tạo khóa provider hoặc thu hồi khóa cũ. Người vận hành chỉ thay sau khi hai admin khác nhau duyệt và xác minh deployment mới.')}</p>
  <form className="grid md:grid-cols-[auto_1fr_auto] gap-3" onSubmit={e=>{e.preventDefault();if(busy||!reason.trim())return;void onAction('requestRotation',{provider,reason:reason.trim()},()=>{setReason('');void refresh();});}}>
   <label className="text-sm">{p('Provider','Nhà cung cấp')}<select className="block w-full border rounded-xl p-3" value={provider} onChange={e=>setProvider(e.target.value)}><option value="gemini">Gemini</option><option value="sheets">Google Drive & Sheets</option></select></label>
   <label className="text-sm">{p('Reason','Lý do')}<input required maxLength={1000} className="block w-full border rounded-xl p-3" value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <button disabled={busy||!reason.trim()} className="self-end rounded-xl bg-emerald-700 text-white p-3 disabled:opacity-50">{p('Request rotation','Yêu cầu xoay khóa')}</button>
  </form>
  <div className="mt-4 space-y-3">{!rows.length&&<p className="text-sm text-slate-500">{p('No rotation requests.','Chưa có yêu cầu xoay khóa.')}</p>}{rows.map(row=><article key={row.id} className="border rounded-xl p-4 flex flex-wrap items-center gap-3"><div className="flex-1"><strong>{row.provider}</strong><p>{row.reason}</p><small>{row.approvals?.length||0}/2 · {p('Status','Trạng thái')}: {p(row.status,({pending:'Chờ duyệt',approved:'Đã duyệt, chờ thay khóa',applied:'Đã thay khóa',cancelled:'Đã hủy'} as Record<string,string>)[row.status]||row.status)}</small></div>{row.status==='pending'&&!row.approvals?.some((a:any)=>a.user_id===userId)&&<button className="rounded-xl bg-emerald-700 text-white p-3" disabled={busy} onClick={()=>void onAction('approveRotation',{rotationId:row.id},()=>void refresh())}>{p('Approve as second administrator','Duyệt với tư cách admin thứ hai')}</button>}</article>)}</div>
 </section>;
}
