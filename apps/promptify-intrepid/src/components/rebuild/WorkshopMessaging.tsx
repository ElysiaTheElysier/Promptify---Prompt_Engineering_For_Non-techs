import {useEffect,useRef,useState} from 'react';
import type {HintRequest,ProductLesson,ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import './workshop-messaging.css';

type Action=(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>;
const WEEK=7*86400000;
const recent=(iso:string)=>Date.now()-Date.parse(iso)<WEEK;
const dismissedKey=(userId:string)=>`promptify-dismissed-hints:${userId}`;
const readDismissed=(userId:string):string[]=>{try{const value=JSON.parse(localStorage.getItem(dismissedKey(userId))||'[]');return Array.isArray(value)?value:[];}catch{return [];}};
const useCopy=()=>{const lang=useProductLanguage();return {lang,p:(en:string,vi:string)=>lang==='en'?en:vi,when:(iso:string)=>new Date(iso).toLocaleString(lang==='en'?'en-GB':'vi-VN',{dateStyle:'short',timeStyle:'short'})};};

/** Learner view of trainer broadcasts (whole class) and private hints. Shown on Learner Hub and Workspace. */
export function LearnerInbox({snapshot,busy,onAction}:{snapshot:ProductSnapshot;busy:boolean;onAction:Action}){
 const {p,when}=useCopy();
 const [dismissed,setDismissed]=useState(()=>readDismissed(snapshot.profile.id));
 if(snapshot.profile.role!=='learner')return null;
 const broadcasts=(snapshot.messages||[]).filter((m:any)=>!m.read_at&&recent(m.created_at)).slice(0,5);
 const hints=(snapshot.privateHints||[]).filter((h:any)=>!dismissed.includes(h.id)&&recent(h.created_at)).slice(0,5);
 if(!broadcasts.length&&!hints.length)return null;
 const dismiss=(id:string)=>{const next=[...dismissed,id].slice(-200);setDismissed(next);try{localStorage.setItem(dismissedKey(snapshot.profile.id),JSON.stringify(next));}catch{}};
 return <section className="learner-inbox" aria-live="polite" aria-label={p('Messages from your facilitator','Thông báo từ giảng viên')}>
  <h2>{p('Messages from your facilitator','Thông báo từ giảng viên')}</h2>
  {hints.map((h:any)=><article key={h.id} className="learner-inbox-item learner-inbox-private">
   <span className="learner-inbox-kind">{p('Private hint','Gợi ý riêng')}</span><p>{h.message}</p><time dateTime={h.created_at}>{when(h.created_at)}</time>
   <button onClick={()=>dismiss(h.id)}>{p('Got it','Đã hiểu')}</button></article>)}
  {broadcasts.map((m:any)=><article key={m.id} className="learner-inbox-item">
   <span className="learner-inbox-kind">{p('Whole class','Cả lớp')}</span><p>{m.message}</p><time dateTime={m.created_at}>{when(m.created_at)}</time>
   <button disabled={busy} onClick={()=>void onAction('ackMessage',{messageId:m.id})}>{p('Mark as read','Đã đọc')}</button></article>)}
 </section>;
}

/** Workspace Hints tab: approved hints, or a request with a reason that the facilitator approves. */
export function HintRequestPanel({snapshot,lesson,busy,onAction}:{snapshot:ProductSnapshot;lesson:ProductLesson;busy:boolean;onAction:Action}){
 const {p,when}=useCopy();
 const [reason,setReason]=useState('');
 const requests=(snapshot.hintRequests||[]).filter(r=>r.lessonId===lesson.id);
 const pending=requests.filter(r=>r.status==='pending'),approved=requests.some(r=>r.status==='approved');
 const hints=lesson.hints||[];
 const valid=reason.trim().length>=10,full=pending.length>=5;
 const status=(r:HintRequest)=>r.status==='pending'?p('Waiting for your facilitator','Đang chờ giảng viên duyệt'):r.status==='approved'?'✓ '+p('Approved','Đã duyệt'):'✗ '+p('Not approved','Chưa được duyệt');
 // The newest approval without its own note carries the lesson's written hints, so they show inside the request.
 const lessonHintsOn=approved&&hints.length?requests.find(r=>r.status==='approved'&&!r.note)?.id:undefined;
 return <section className="hint-panel">
  <label htmlFor={'hint-reason-'+lesson.id}><strong>{requests.length?p('Ask for another hint','Gửi thêm yêu cầu gợi ý'):p('Request a hint','Yêu cầu gợi ý')}</strong><br/>{p('Tell your facilitator what you tried and where you are stuck. They review each request.','Hãy cho giảng viên biết bạn đã thử gì và đang vướng ở đâu. Giảng viên sẽ xem từng yêu cầu.')}</label>
  <textarea id={'hint-reason-'+lesson.id} rows={4} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} placeholder={p('e.g. My output does not cite the SOP section even though I asked for citations…','Ví dụ: Kết quả chưa trích dẫn mục SOP dù mình đã yêu cầu trích dẫn…')}/>
  <div className="hint-panel-actions"><span>{full?p('5 requests are already waiting for review.','Đã có 5 yêu cầu đang chờ duyệt.'):`${reason.trim().length}/1000 · `+p('at least 10 characters','tối thiểu 10 ký tự')}</span>
   <button className="lv-primary" disabled={busy||!valid||full} data-learning-event="hint" onClick={()=>void onAction('requestHint',{lessonId:lesson.id,reason,requestId:crypto.randomUUID()},()=>setReason(''))}>{p('Send hint request','Gửi yêu cầu gợi ý')}</button></div>
  {requests.length>0&&<ol className="hint-history" aria-label={p('Your hint requests','Các yêu cầu gợi ý của bạn')}>{requests.map(r=><li key={r.id} className={'hint-history-'+r.status}>
   <p><strong>{status(r)}</strong> · <time dateTime={r.decidedAt||r.createdAt}>{when(r.decidedAt||r.createdAt)}</time></p>
   <p className="hint-panel-reason">“{r.reason}”</p>
   {r.status==='approved'&&r.note&&<div className="hint-panel-answer"><strong>{p('Hint from your facilitator','Gợi ý của giảng viên')}</strong><p>{r.note}</p></div>}
   {r.status==='approved'&&!r.note&&(r.id===lessonHintsOn
    ?<div className="hint-panel-answer"><strong>{p('Lesson hints','Gợi ý của bài')}</strong><ul>{hints.map((hint,i)=><li key={i}>{hint}</li>)}</ul></div>
    :!hints.length&&<p className="hint-panel-answer">{p('Approved without a written hint. Ask again with a more specific question if you are still stuck.','Đã duyệt nhưng chưa có gợi ý viết sẵn. Hãy gửi yêu cầu cụ thể hơn nếu vẫn còn vướng.')}</p>)}
   {r.status==='declined'&&r.note&&<p className="hint-panel-note"><strong>{p('Facilitator','Giảng viên')}:</strong> {r.note}</p>}
  </li>)}</ol>}
  {approved&&hints.length>0&&!lessonHintsOn&&<details className="hint-panel-hints"><summary>{p('Lesson hints','Gợi ý của bài')} ({hints.length})</summary><ul>{hints.map((hint,i)=><li key={i}>{hint}</li>)}</ul></details>}
 </section>;
}

/** Trainer queue: approve or decline hint requests, with an optional note that reaches the learner privately. */
export function WorkshopSupportQueue({snapshot,busy,onAction}:{snapshot:ProductSnapshot;busy:boolean;onAction:Action}){
 const {p,when}=useCopy();
 const [notes,setNotes]=useState<Record<string,string>>({});
 if(!snapshot.selectedClass?.can_manage)return null;
 const rows=snapshot.supportRequests||[];
 const pending=rows.filter(r=>r.status==='pending'),decided=rows.filter(r=>r.status!=='pending');
 const decide=(r:HintRequest,decision:'approve'|'decline')=>void onAction('reviewHintRequest',{hintRequestId:r.id,decision,note:notes[r.id]||''},()=>setNotes(current=>({...current,[r.id]:''})));
 return <section className="workshop-support" id="hint-requests" aria-label={p('Hint requests','Yêu cầu gợi ý')}>
  <h2>{p('Hint requests','Yêu cầu gợi ý')} <span>{pending.length}</span></h2>
  {!pending.length&&<p className="workshop-support-empty">{p('No hint request is waiting for review.','Không có yêu cầu gợi ý nào đang chờ duyệt.')}</p>}
  <ul>{pending.map(r=><li key={r.id}>
   <div><strong>{r.learnerName}</strong> · {r.lessonTitle} · <time dateTime={r.createdAt}>{when(r.createdAt)}</time><p className="workshop-support-reason">“{r.reason}”</p></div>
   <div className="workshop-support-reply"><textarea rows={2} maxLength={2000} value={notes[r.id]||''} onChange={e=>setNotes(current=>({...current,[r.id]:e.target.value}))} aria-label={p('Hint for this learner','Gợi ý cho học viên')} placeholder={p('Hint for this learner — shown inside their request in the Hints tab…','Gợi ý cho học viên — hiện ngay trong yêu cầu ở tab Gợi ý…')}/>
    <button className="workshop-support-approve" disabled={busy} onClick={()=>decide(r,'approve')}>{p('Approve & show hints','Duyệt & mở gợi ý')}</button>
    <button disabled={busy} onClick={()=>decide(r,'decline')}>{p('Decline','Từ chối')}</button></div>
  </li>)}</ul>
  {decided.length>0&&<details><summary>{p('Recent decisions','Đã xử lý gần đây')} ({decided.length})</summary><ul>{decided.map(r=><li key={r.id}><div><strong>{r.learnerName}</strong> · {r.lessonTitle} · <span className={'workshop-support-kind '+r.status}>{r.status==='approved'?p('approved','đã duyệt'):p('declined','đã từ chối')}</span> · <time dateTime={r.decidedAt||r.createdAt}>{when(r.decidedAt||r.createdAt)}</time></div></li>)}</ul></details>}
 </section>;
}

/** Pop-up for class editors on every workspace screen while hint requests wait: review the oldest ones in place. */
export function HintRequestAlert({snapshot,currentUi,onOpen,busy=false,onAction}:{snapshot:ProductSnapshot;currentUi:number;onOpen:()=>void;busy?:boolean;onAction?:Action}){
 const {p}=useCopy();
 const pending=(snapshot.supportRequests||[]).filter(r=>r.status==='pending');
 const seen=useRef<Set<string>|undefined>(undefined);
 const [fresh,setFresh]=useState(0),[hidden,setHidden]=useState<string>(''),[notes,setNotes]=useState<Record<string,string>>({});
 const signature=pending.map(r=>r.id).join(',');
 useEffect(()=>{
  const ids=new Set(pending.map(r=>r.id));
  if(seen.current){const arrived=[...ids].filter(id=>!seen.current!.has(id)).length;if(arrived)setFresh(arrived);}
  seen.current=ids;
 },[signature]);
 if(!snapshot.selectedClass?.can_manage||!pending.length||hidden===signature)return null;
 return <aside className={'hint-alert'+(fresh?' hint-alert-new':'')} role="alert" aria-live="assertive">
  <strong>{fresh?p(`${fresh} new hint request${fresh>1?'s':''}`,`${fresh} yêu cầu gợi ý mới`):p(`${pending.length} hint request${pending.length>1?'s':''} waiting`,`${pending.length} yêu cầu gợi ý đang chờ duyệt`)}</strong>
  {pending.slice(0,3).map(r=><div key={r.id} className="hint-alert-item">
   <span><b>{r.learnerName}</b> · {r.lessonTitle}</span><span className="hint-alert-reason">“{r.reason}”</span>
   {onAction&&<><input aria-label={p('Hint for this learner','Gợi ý cho học viên')} placeholder={p('Hint shown in their Hints tab…','Gợi ý hiện trong tab Gợi ý của học viên…')} maxLength={2000} value={notes[r.id]||''} onChange={e=>setNotes(current=>({...current,[r.id]:e.target.value}))}/>
    <div><button className="hint-alert-approve" disabled={busy} onClick={()=>{setFresh(0);void onAction('reviewHintRequest',{hintRequestId:r.id,decision:'approve',note:notes[r.id]||''});}}>{p('Approve & show hints','Duyệt & mở gợi ý')}</button>
     <button disabled={busy} onClick={()=>{setFresh(0);void onAction('reviewHintRequest',{hintRequestId:r.id,decision:'decline',note:notes[r.id]||''});}}>{p('Decline','Từ chối')}</button></div></>}
  </div>)}
  <div>{currentUi!==9&&<button onClick={()=>{setFresh(0);onOpen();}}>{pending.length>3?p(`See all ${pending.length} in Workshop`,`Xem cả ${pending.length} yêu cầu trong Workshop`):p('Open Workshop','Mở Workshop')}</button>}
   {currentUi===9&&<button onClick={()=>{setFresh(0);document.getElementById('hint-requests')?.scrollIntoView({behavior:'smooth'});}}>{p('Show requests','Xem yêu cầu')}</button>}
   <button onClick={()=>{setFresh(0);setHidden(signature);}}>{p('Later','Để sau')}</button></div>
 </aside>;
}
