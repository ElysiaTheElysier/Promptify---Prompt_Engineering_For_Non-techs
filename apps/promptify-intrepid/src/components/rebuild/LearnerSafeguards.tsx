import {useEffect,useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';

/** TC-SEC-03 budget for one lesson session; undefined when SESSION_TOKEN_CAP is off. */
export function sessionBudget(snapshot:ProductSnapshot,lessonId:string){
 const cap=snapshot.aiSessionCap||0;if(!cap)return undefined;
 const row=snapshot.aiSessions?.find(session=>session.lessonId===lessonId);
 return {cap,used:row?.tokensUsed||0,sessionNo:row?.sessionNo||1};
}
/** Run stays disabled when access expired (TC-AUTH-04) or the session budget is spent (TC-SEC-03). */
export function learnerRunBlocked(snapshot:ProductSnapshot,lessonId:string){
 const budget=sessionBudget(snapshot,lessonId);
 return !!snapshot.learnerAccess?.readOnly||!!budget&&budget.used>=budget.cap;
}
type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
/** TC-AUTH-04 trainer control: per-learner access expiry for the selected class. Shown only when expiry is enforced. */
export function AccessExpiryControl({snapshot,learnerId,busy,onAction}:{snapshot:ProductSnapshot;learnerId:string;busy:boolean;onAction:Action}){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const saved=snapshot.learners.find((row:any)=>row.id===learnerId)?.access_expires_at as string|null|undefined;
 const local=(iso?:string|null)=>{if(!iso)return '';const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 const [value,setValue]=useState(local(saved));
 useEffect(()=>setValue(local(saved)),[saved]);
 if(!snapshot.accessExpiryEnabled)return null;
 return <div className="space-y-1.5 text-xs"><label className="font-bold block" htmlFor={'access-expiry-'+learnerId}>{p('Access expires (read-only after)','Hạn truy cập (sau đó chỉ đọc)')}</label>
  <input id={'access-expiry-'+learnerId} type="datetime-local" className="w-full p-2 rounded-xl border border-m3-outline-variant" value={value} onChange={event=>setValue(event.target.value)}/>
  <div className="flex gap-2"><button className="flex-1 py-2 rounded-xl bg-m3-primary text-white font-bold" disabled={busy||!value} onClick={()=>void onAction('setAccessExpiry',{learnerId,expiresAt:new Date(value).toISOString()})}>{p('Save expiry','Lưu hạn')}</button>
   <button className="flex-1 py-2 rounded-xl border border-m3-outline-variant" disabled={busy||!saved} onClick={()=>void onAction('setAccessExpiry',{learnerId,expiresAt:null})}>{p('Remove expiry','Bỏ hạn')}</button></div>
  <p>{saved?p('Current: ','Hiện tại: ')+new Date(saved).toLocaleString(lang==='en'?'en-GB':'vi-VN'):p('No expiry set.','Chưa đặt hạn.')}</p></div>;
}
type Props={snapshot:ProductSnapshot;lessonId:string;busy:boolean;onAction:(name:string,payload?:Record<string,unknown>)=>Promise<void>};
export default function LearnerSafeguards({snapshot,lessonId,busy,onAction}:Props){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const access=snapshot.learnerAccess,budget=sessionBudget(snapshot,lessonId);
 const expires=access?.expiresAt?new Date(access.expiresAt):undefined;
 const when=expires?expires.toLocaleString(lang==='en'?'en-GB':'vi-VN',{dateStyle:'medium',timeStyle:'short'}):'';
 const daysLeft=expires?Math.max(0,Math.ceil((expires.getTime()-Date.now())/86400000)):Infinity;
 const number=(value:number)=>value.toLocaleString(lang==='en'?'en-US':'vi-VN');
 return <>
  {access?.readOnly&&<p role="alert" className="lv-warning lv-readonly"><strong>{p('Read-only access','Chế độ chỉ đọc')}</strong> · {p(`Your access to this class expired on ${when}. You can review saved prompts, outputs and grades, but you cannot run AI or submit new work. Contact your L&D administrator to extend access.`,`Quyền truy cập lớp này đã hết hạn lúc ${when}. Bạn vẫn xem được prompt, kết quả và điểm đã lưu nhưng không thể chạy AI hay nộp bài mới. Liên hệ quản trị L&D để gia hạn.`)}</p>}
  {access&&!access.readOnly&&expires&&daysLeft<=access.warningDays&&<p role="status" className="lv-warning">{p(`Your access to this class expires on ${when} (${daysLeft} day${daysLeft===1?'':'s'} left). After that the workspace becomes read-only.`,`Quyền truy cập lớp này hết hạn lúc ${when} (còn ${daysLeft} ngày). Sau thời điểm đó không gian làm việc chuyển sang chỉ đọc.`)}</p>}
  {budget&&<div className="lv-session-budget" role="status">
   <span>{p('AI tokens this session','Token AI trong phiên')} #{budget.sessionNo}: <strong>{number(budget.used)}</strong> / {number(budget.cap)}</span>
   <meter min={0} max={budget.cap} low={budget.cap*0.7} high={budget.cap*0.9} optimum={0} value={Math.min(budget.used,budget.cap)} aria-label={p('Session token usage','Mức dùng token của phiên')}/>
   {budget.used>=budget.cap&&<><p role="alert" className="lv-warning">{p('This session has reached its AI token limit. Start a new session to continue, or contact your L&D administrator.','Phiên này đã dùng hết hạn mức token AI. Hãy bắt đầu phiên mới để tiếp tục, hoặc liên hệ quản trị L&D.')}</p>
    <button className="lv-secondary" disabled={busy||!!access?.readOnly} onClick={()=>void onAction('resetAiSession',{lessonId})}>{p('Start a new session','Bắt đầu phiên mới')}</button></>}
  </div>}
 </>;
}
