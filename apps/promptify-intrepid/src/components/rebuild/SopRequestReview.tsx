import React,{useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
/** Studio → Materials: SOP sync requests from learners. Compact: one line when empty, the reason field only when there is something to review. */
export default function SopRequestReview({snapshot,busy,onAction}:{snapshot:ProductSnapshot;busy:boolean;onAction:(n:string,p?:Record<string,unknown>,after?:(v:any)=>void)=>Promise<void>}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi,[reason,setReason]=useState('');
 const requests=snapshot.contributions?.filter(r=>r.metadata?.syncRequest&&r.status==='pending')||[];
 const field='w-full min-h-10 border border-m3-outline-variant rounded-lg px-3 py-2 text-sm font-normal bg-white';
 return <section className="bg-white rounded-2xl border border-m3-outline-variant p-6" aria-labelledby="sop-requests-heading">
  <div className="flex flex-wrap items-center gap-2">
   <h2 id="sop-requests-heading" className="font-bold text-base">{p('Pending SOP sync requests','Yêu cầu đồng bộ SOP đang chờ')}</h2>
   <span className={'px-2 py-0.5 rounded-full text-xs font-bold '+(requests.length?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-600')}>{requests.length}</span>
  </div>
  {!requests.length?<p className="mt-1 text-sm text-m3-on-surface-variant">{p('Nothing to review. Learner requests to sync an SOP appear here.','Không có yêu cầu nào. Yêu cầu đồng bộ SOP của học viên sẽ hiện ở đây.')}</p>:<>
   <label className="mt-4 grid gap-1.5 max-w-xl text-sm font-semibold">{p('Review reason (recorded)','Lý do duyệt (được ghi lại)')}<input className={field} value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/></label>
   <ul className="mt-4 grid gap-3">{requests.map(r=><li key={r.id} className="border border-m3-outline-variant rounded-xl p-4">
    <strong>{r.title}</strong>
    {r.metadata.businessReason&&<p className="mt-1 text-sm">{r.metadata.businessReason}</p>}
    <p className="mt-1 text-xs text-m3-on-surface-variant break-all">{r.metadata.priority} · {r.metadata.driveUrl}</p>
    <div className="ui-btn-row mt-3">
     <button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy||!reason.trim()} onClick={()=>void onAction('reviewSop',{contributionId:r.id,decision:'approve',reason})}>{p('Approve & index','Duyệt và lập chỉ mục')}</button>
     <button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={busy||!reason.trim()} onClick={()=>void onAction('reviewSop',{contributionId:r.id,decision:'reject',reason})}>{p('Reject','Từ chối')}</button>
    </div>
   </li>)}</ul>
  </>}
 </section>;
}
