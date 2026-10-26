import React,{useEffect,useState} from 'react';
import {productRequest} from '../../services/productionClientService';
import {useProductLanguage} from '../../services/productI18nService';
export default function AccessRequestInbox({classId}:{classId:string}){
 const vi=useProductLanguage()==='vi',[rows,setRows]=useState<any[]>([]),[error,setError]=useState('');
 const load=()=>productRequest<any[]>('accessRequests',{classId}).then(setRows).catch(()=>setError(vi?'Chưa tải được yêu cầu hỗ trợ.':'Could not load support requests.'));
 useEffect(()=>{void load();},[classId]);
 return <section className="prod-card"><h2>{vi?'Yêu cầu hỗ trợ truy cập':'Access support requests'}</h2>{rows.map(row=><article key={row.id}><strong>{row.email}</strong><p>{row.message}</p><p>{row.status==='pending'?(vi?'Chờ xử lý':'Pending'):(vi?'Đã xử lý':'Resolved')} · {new Date(row.created_at).toLocaleString(vi?'vi-VN':'en-GB')}</p>{row.status==='pending'&&<button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>void productRequest('reviewAccessRequest',{classId,requestId:row.id}).then(load).catch(()=>setError(vi?'Chưa lưu được trạng thái':'Could not save status'))}>{vi?'Đánh dấu đã xử lý':'Mark resolved'}</button>}</article>)}{!rows.length&&!error&&<p>{vi?'Chưa có yêu cầu':'No requests yet'}</p>}{error&&<p role="alert">{error}</p>}</section>;
}
