import React,{useEffect,useState} from 'react';
import {supabase} from '../../services/supabaseClient';
import {subscribeWorkshopMessages,MessageConnection} from '../../services/workshopRealtimeService';
export function TrainerHintInbox({classId,learnerId}:{classId?:string;learnerId?:string}){
 const [connection,setConnection]=useState<MessageConnection>('connecting');
 const [hints,setHints]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;let loading=false;setHints([]);setError('');const load=async()=>{if(!classId||!learnerId||loading||document.hidden)return;loading=true;try{const {data,error}=await supabase.from('trainer_hints').select('id,message,created_at').eq('class_id',classId).eq('learner_id',learnerId).order('created_at',{ascending:false}).limit(5);if(active){if(error)setError('Chưa tải được gợi ý từ giảng viên.');else{setHints(data||[]);setError('')}}}finally{loading=false}};void load();const stop=classId?subscribeWorkshopMessages(classId,'trainer_hints',()=>void load(),setConnection):()=>{};const timer=setInterval(load,10000);document.addEventListener('visibilitychange',load);return()=>{active=false;stop();clearInterval(timer);document.removeEventListener('visibilitychange',load)}},[classId,learnerId]);
 if(!hints.length&&!error)return null;
 return <aside className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-label="Gợi ý riêng từ giảng viên"><h2 className="font-semibold text-emerald-900">Gợi ý từ giảng viên</h2>{error&&<p className="text-sm" role="status">{error}</p>}{hints.map(h=><article key={h.id} className="mt-3"><small className="text-slate-500">{new Date(h.created_at).toLocaleString('vi-VN')}</small><p className="whitespace-pre-wrap break-words">{h.message}</p></article>)}<small className="text-slate-500">{connection==='live'?'Cập nhật trực tiếp · đối soát mỗi 10 giây':'Kiểm tra cập nhật mỗi 10 giây khi tab đang mở.'}</small></aside>;
}
