import React,{useEffect,useState} from 'react';
import {productRequest} from '../../services/productionClientService';
import {useProductLanguage} from '../../services/productI18nService';
type Correction={id:string;reason:string;assigned_department:string|null;requested_department:string|null;auto_approved:boolean;created_at:string;user:{full_name:string;email:string}|null};
export default function DepartmentCorrectionLog(){
 const lang=useProductLanguage(),[rows,setRows]=useState<Correction[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const p=(en:string,vi:string)=>lang==='en'?en:vi;
 const refresh=async()=>{setLoading(true);setError('');try{setRows(await productRequest<Correction[]>('departmentCorrections'));}catch(cause){setError((cause as Error).message);}finally{setLoading(false);}};
 useEffect(()=>{void refresh();},[]);
 return <section className="prod-card mx-auto max-w-7xl my-6" aria-label={p('Department correction log','Nhật ký sửa phòng ban')}>
  <div className="flex justify-between gap-4"><h2>{p('Department correction log','Nhật ký sửa phòng ban')}</h2><button disabled={loading} onClick={()=>void refresh()}>{p('Refresh','Làm mới')}</button></div>
  <p>{p('Latest 100 requests. Self-service changes are automatically approved; L&D can review the log here.','100 yêu cầu gần nhất. Thay đổi tự phục vụ được tự động duyệt; L&D xem lại nhật ký tại đây.')}</p>
  {error&&<p role="alert">{error}</p>}{loading&&<p role="status">{p('Loading…','Đang tải…')}</p>}
  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{[p('Learner','Học viên'),p('Department change','Thay đổi phòng ban'),p('Reason','Lý do'),p('Status','Trạng thái'),p('Time','Thời gian')].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t"><td className="p-3">{row.user?.full_name}<br/>{row.user?.email}</td><td className="p-3">{row.assigned_department||'—'} → {row.requested_department||'—'}</td><td className="p-3">{row.reason}</td><td className="p-3">{row.auto_approved?p('Auto-approved','Đã tự động duyệt'):p('Previous request','Yêu cầu cũ')}</td><td className="p-3">{new Date(row.created_at).toLocaleString(lang==='vi'?'vi-VN':'en-GB')}</td></tr>)}</tbody></table></div>
  {!loading&&!error&&!rows.length&&<p>{p('No corrections yet.','Chưa có yêu cầu sửa.')}</p>}
 </section>;
}
