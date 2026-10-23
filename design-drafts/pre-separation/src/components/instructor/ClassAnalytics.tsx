import React,{useEffect,useState} from 'react';
import {supabase} from '../../services/supabaseClient';
interface Analytics {enrolled:number;attempts:number;evaluated:number;average_score:number|null;by_learner:{learner_id:string;full_name:string;attempts:number;average_score:number|null;last_run:string|null}[]}
export function ClassAnalytics({classId}:{classId:string}){
 const [data,setData]=useState<Analytics>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setData(undefined);setError('');setBusy(true);
 void supabase.rpc('rebuild_class_analytics',{p_class:classId}).then(({data,error})=>{if(!active)return;setBusy(false);if(error)setError('Chưa tải được phân tích lớp. Kiểm tra quyền phụ trách và migration 020.');else setData(data);});
 return()=>{active=false};},[classId,revision]);
 return <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex justify-between gap-4"><div><h2 className="font-bold text-slate-900">Learning Analytics · Phân tích học tập</h2><p className="mt-1 text-sm text-slate-500">Tổng hợp từ bài đã lưu; điểm trung bình không phải phép đo ROI hay hiệu quả trước/sau đào tạo.</p></div><button disabled={busy} onClick={()=>setRevision(v=>v+1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">Làm mới</button></div>
 {error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{busy&&<p role="status" className="mt-4">Đang tải…</p>}
 {data&&<><dl className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Ghi danh',data.enrolled],['Lần chạy',data.attempts],['Đã chấm',data.evaluated],['Điểm trung bình',data.average_score===null?'Chưa có':Number(data.average_score).toFixed(1)+'/10']].map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-4"><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 text-xl font-bold">{value}</dd></div>)}</dl>
 <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['Học viên','Lần chạy','Điểm TB','Lần chạy gần nhất'].map(v=><th className="p-3" key={v}>{v}</th>)}</tr></thead><tbody>{data.by_learner.map(l=><tr key={l.learner_id} className="border-t border-slate-100"><td className="p-3">{l.full_name}</td><td className="p-3">{l.attempts}</td><td className="p-3">{l.average_score===null?'Chưa chấm':Number(l.average_score).toFixed(1)}</td><td className="p-3">{l.last_run?new Date(l.last_run).toLocaleString('vi-VN'):'Chưa chạy'}</td></tr>)}</tbody></table></div></>}
 </section>;
}
