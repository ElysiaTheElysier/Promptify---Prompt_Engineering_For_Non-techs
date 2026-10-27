import React from 'react';
import type {RubricCriterion} from '../../types/production';
import {DEFAULT_RUBRIC,JUDGE_WORKER_CONCURRENCY,RUBRIC_MAX_CRITERIA,newCriterionKey,normalizeRubric,rebalanceRubric,validateRubric} from '../../services/weightedRubricService';
import {criterionLabel} from '../../services/productI18nService';

type Props={criteria:RubricCriterion[];busy:boolean;lang:'en'|'vi';onChange:(next:RubricCriterion[])=>void;badgeIssues?:string[]};

/** Trainer-defined rubric: 1-8 criteria, each graded by its own Judge worker from label, description and max points. */
export default function RubricEditor({criteria,busy,lang,onChange,badgeIssues=[]}:Props){
 const t=(en:string,vi:string)=>lang==='en'?en:vi;
 const total=criteria.reduce((sum,c)=>sum+c.weight,0),active=criteria.filter(c=>c.active&&c.weight>0);
 let error='';try{validateRubric(criteria);}catch(e){error=criteria.some(c=>!c.label.trim())?t('Every criterion needs a name.','Mỗi tiêu chí cần có tên.'):Math.abs(total-100)>0.001?t('Weights of graded criteria must total 100%.','Tổng trọng số các tiêu chí được chấm phải bằng 100%.'):(e as Error).message;}
 const missingText=criteria.filter(c=>c.active&&(!c.label.trim()||!c.description.trim())).length;
 const patch=(key:string,fields:Partial<RubricCriterion>)=>onChange(criteria.map(c=>c.key===key?{...c,...fields}:c));
 const add=()=>onChange(normalizeRubric([...criteria,{key:newCriterionKey(criteria),label:'',description:'',weight:Math.round(100/(active.length+1)),active:true}]));
 const remove=(key:string)=>onChange(normalizeRubric(criteria.filter(c=>c.key!==key)));
 const toggle=(c:RubricCriterion)=>onChange(normalizeRubric(criteria.map(row=>row.key===c.key?{...row,active:!row.active,weight:row.active?0:Math.round(100/(active.length+1))}:row)));
 const waves=Math.ceil(active.length/JUDGE_WORKER_CONCURRENCY);
 return <div className="space-y-4 text-xs">
  <div className="flex items-center justify-between gap-2 flex-wrap">
   <span className={"px-3 py-1 rounded-full font-mono font-bold text-xs border "+(total===100?'bg-emerald-100 text-emerald-900 border-emerald-300':'bg-red-100 text-red-900 border-red-300')}>{t('Total','Tổng')}: {total}%</span>
   <div className="ui-btn-row">
    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={busy||criteria.length>=RUBRIC_MAX_CRITERIA} onClick={add}>{t('Add criterion','Thêm tiêu chí')} ({criteria.length}/{RUBRIC_MAX_CRITERIA})</button>
    <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={()=>onChange(DEFAULT_RUBRIC.map(c=>({...c})))}>{t('Restore 5-criterion template','Khôi phục mẫu 5 tiêu chí')}</button>
   </div>
  </div>
  {criteria.map((c,i)=><div key={c.key} className={"p-3.5 rounded-2xl border space-y-2 "+(c.active?'bg-m3-surface border-m3-outline-variant/60':'bg-slate-100 opacity-60')}>
   <div className="flex items-center gap-2">
    <span className="font-mono text-m3-on-surface-variant">{i+1}.</span>
    <input className="flex-1 min-w-0 p-2 rounded-xl border font-bold" maxLength={200} disabled={busy} aria-label={t(`Criterion ${i+1} name`,`Tên tiêu chí ${i+1}`)} placeholder={t('Criterion name','Tên tiêu chí')} value={c.label} onChange={e=>patch(c.key,{label:e.target.value})}/>
    <span className="font-mono text-m3-primary font-bold whitespace-nowrap">{c.weight}% ({(c.weight/10).toFixed(2).replace(/0$/,'')} / 10 {t('pts','điểm')})</span>
   </div>
   <textarea rows={2} className="w-full p-2 rounded-xl border" maxLength={4000} disabled={busy} aria-label={t(`What criterion ${i+1} checks`,`Tiêu chí ${i+1} chấm điều gì`)} placeholder={t('What the AI Judge must check, and what full marks look like','AI Judge cần kiểm tra điều gì, thế nào là đạt điểm tối đa')} value={c.description} onChange={e=>patch(c.key,{description:e.target.value})}/>
   <div className="flex items-center gap-3">
    <input type="range" min={0} max={100} step={1} className="flex-1 accent-m3-primary" disabled={busy||!c.active||active.length<2} aria-label={t(`Weight of ${c.label||'criterion '+(i+1)}`,`Trọng số ${c.label||'tiêu chí '+(i+1)}`)} value={c.weight} onChange={e=>onChange(rebalanceRubric(criteria,c.key,Number(e.target.value)))}/>
    <label className="flex items-center gap-1 whitespace-nowrap"><input type="checkbox" checked={c.active} disabled={busy||c.active&&active.length<2} onChange={()=>toggle(c)}/>{t('Graded','Chấm')}</label>
    <button type="button" className="ui-btn ui-btn-danger ui-btn-sm" disabled={busy||criteria.length<2} onClick={()=>remove(c.key)}>{t('Remove','Xóa')}</button>
   </div>
  </div>)}
  {error&&<p role="alert" className="text-red-700 font-bold">{error}</p>}
  {badgeIssues.length>0&&<p role="alert" className="text-red-700 font-bold">{t(`Badges using a removed or ungraded criterion: ${badgeIssues.join(', ')}. Choose their criterion again in the awards tab; saving is blocked until then.`,`Huy hiệu đang dùng tiêu chí đã xóa hoặc không còn chấm: ${badgeIssues.join(', ')}. Vào tab huy hiệu để chọn lại tiêu chí; chưa thể lưu cho tới khi sửa xong.`)}</p>}
  {!error&&missingText>0&&<p className="text-amber-800">{t(`${missingText} graded criterion(s) lack a name or description; the Judge grades better with a concrete description.`,`${missingText} tiêu chí đang chấm chưa có tên hoặc mô tả; AI Judge chấm chính xác hơn khi mô tả cụ thể.`)}</p>}
  <details className="rounded-2xl border border-m3-outline-variant/60 p-3">
   <summary className="font-bold cursor-pointer">{t('Preview: what the AI Judge receives','Xem trước: AI Judge nhận gì')}</summary>
   <p className="mt-2 text-m3-on-surface-variant">{t(`1 alignment check + ${active.length} criterion workers = ${active.length+1} model calls per grade (up to ${JUDGE_WORKER_CONCURRENCY} workers at once${waves>1?`, so ${waves} rounds`:''}). Each worker sees only its own criterion and scores it at 0/25/50/75/100% of its points.`,`1 lượt kiểm tra đúng đề + ${active.length} worker tiêu chí = ${active.length+1} lời gọi AI mỗi lần chấm (tối đa ${JUDGE_WORKER_CONCURRENCY} worker cùng lúc${waves>1?`, nên chạy ${waves} đợt`:''}). Mỗi worker chỉ thấy tiêu chí của mình và cho điểm ở mức 0/25/50/75/100% số điểm tối đa.`)}</p>
   <ol className="mt-2 space-y-1 list-decimal pl-5">{active.map(c=><li key={c.key}><strong>{criterionLabel(c.key,c.label,lang)}</strong> · {t('max','tối đa')} {c.weight/10} · <span className="text-m3-on-surface-variant">{c.description||'—'}</span></li>)}</ol>
   <p className="mt-2 text-m3-on-surface-variant">{t('Learners are graded with the rubric saved when they press Run; later edits apply to new Runs only.','Học viên được chấm theo rubric đã lưu tại lúc bấm Run; sửa sau đó chỉ áp dụng cho các lần Run mới.')}</p>
  </details>
 </div>;
}
