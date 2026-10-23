import React,{useEffect,useState} from 'react';
import {workshopMessagingService,WorkshopMessage} from '../../services/workshopMessagingService';
import {subscribeWorkshopMessages,MessageConnection} from '../../services/workshopRealtimeService';
export function WorkshopBroadcastInbox({classId}:{classId?:string}){
 const [messages,setMessages]=useState<WorkshopMessage[]>([]),[error,setError]=useState(''),[pending,setPending]=useState('');
 const [connection,setConnection]=useState<MessageConnection>('connecting');
 useEffect(()=>{let active=true,loading=false;setMessages([]);setError('');
  const load=async()=>{if(!classId||document.hidden||loading)return;loading=true;try{const rows=await workshopMessagingService.inbox(classId);if(active){setMessages(rows);setError('')}}catch{if(active)setError('Chưa tải được thông báo lớp.')}finally{loading=false}};
  void load();const stop=classId?subscribeWorkshopMessages(classId,'workshop_messages',()=>void load(),setConnection):()=>{};
  const timer=setInterval(load,10000);document.addEventListener('visibilitychange',load);
  return()=>{active=false;stop();clearInterval(timer);document.removeEventListener('visibilitychange',load)};
 },[classId]);
 const acknowledge=async(id:string)=>{setPending(id);try{await workshopMessagingService.acknowledge(id);setMessages(rows=>rows.map(row=>row.id===id?{...row,read_at:new Date().toISOString()}:row));setError('')}catch{setError('Chưa lưu được xác nhận. Hãy thử lại.')}finally{setPending('')}};
 if(!messages.length&&!error)return null;
 return <aside className="rounded-xl border border-emerald-200 bg-white p-4" aria-label="Thông báo workshop"><h2 className="font-semibold text-emerald-900">Thông báo cho cả lớp</h2>{error&&<p role="status" className="text-sm text-red-700">{error}</p>}{messages.map(row=><article key={row.id} className="mt-3 border-t pt-3"><small className="text-slate-500">{new Date(row.created_at).toLocaleString('vi-VN')}</small><p className="whitespace-pre-wrap break-words">{row.message}</p><button type="button" disabled={!!pending||!!row.read_at} onClick={()=>acknowledge(row.id)} className="min-h-11 px-3 mt-2 border rounded-lg text-emerald-800 disabled:opacity-60">{row.read_at?'Đã xác nhận':pending===row.id?'Đang lưu…':'Tôi đã đọc'}</button></article>)}<p className="text-xs text-slate-500 mt-3">{connection==='live'?'Đã kết nối cập nhật trực tiếp · đối soát mỗi 10 giây':connection==='connecting'?'Đang kết nối · kiểm tra cập nhật mỗi 10 giây':'Kết nối trực tiếp gián đoạn · kiểm tra cập nhật mỗi 10 giây'}</p></aside>;
}
