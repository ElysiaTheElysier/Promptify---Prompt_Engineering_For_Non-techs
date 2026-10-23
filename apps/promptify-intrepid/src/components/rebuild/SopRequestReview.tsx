import React,{useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
export default function SopRequestReview({snapshot,busy,onAction}:{snapshot:ProductSnapshot;busy:boolean;onAction:(n:string,p?:Record<string,unknown>,after?:(v:any)=>void)=>Promise<void>}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi,[reason,setReason]=useState('');
 const requests=snapshot.contributions?.filter(r=>r.metadata?.syncRequest&&r.status==='pending')||[];
 return <section className="learner-v7 lv-hub-resources"><h2>{p('Pending SOP sync requests','Yêu cầu đồng bộ SOP đang chờ')}</h2><label>{p('Review reason','Lý do duyệt')}<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/></label>{!requests.length&&<p>{p('No pending requests.','Không có yêu cầu đang chờ.')}</p>}{requests.map(r=><article className="lv-resource" key={r.id}><strong>{r.title}</strong><p>{r.metadata.businessReason}</p><p>{r.metadata.priority} · {r.metadata.driveUrl}</p><button className="lv-primary" disabled={busy||!reason.trim()} onClick={()=>void onAction('reviewSop',{contributionId:r.id,decision:'approve',reason})}>{p('Approve & index','Duyệt và lập chỉ mục')}</button><button className="lv-secondary" disabled={busy||!reason.trim()} onClick={()=>void onAction('reviewSop',{contributionId:r.id,decision:'reject',reason})}>{p('Reject','Từ chối')}</button></article>)}</section>;
}
