import React,{Suspense,useCallback,useEffect,useRef,useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import {productRequest} from '../../services/productionClientService';
import {identity} from '../../services/firebaseIdentityService';
import {confirmAction} from '../common/UiFeedback';
import './lesson-slides.css';
const LessonSlidesViewer=React.lazy(()=>import('./LessonSlidesViewer'));
type Deck={id:string;title:string;is_default:boolean;published_version_id:string|null};
type Version={id:string;deck_id:string;page_count:number;source_kind:string;drive_file_id:string|null;created_at:string;published_at:string|null};
type Assignment={lesson_id:string;mode:'inherit'|'deck'|'off';deck_id:string|null;start_page:number|null;end_page:number|null;revision:number};
export type SlideState={decks:Deck[];versions:Version[];assignments:Assignment[];driveConfigured:boolean};
type Review={deckId:string;versionId:string;pageCount:number};
const MAX_BYTES=25*1024*1024;
/** Labs that show a deck: explicit assignments, plus every non-overridden lab when the deck is the class default. */
export function deckUsers(deck:Deck,lessons:ProductSnapshot['lessons'],assignments:Assignment[]){
 return lessons.filter(l=>{const row=assignments.find(a=>a.lesson_id===l.id);return row?.mode==='deck'?row.deck_id===deck.id:row?.mode!=='off'&&deck.is_default;}).map(l=>({lesson:l,row:assignments.find(a=>a.lesson_id===l.id)}));
}
export function useClassSlides(classId:string){
 const [state,setState]=useState<SlideState|null>(null),[error,setError]=useState('');
 const reload=useCallback(async()=>{try{setState(await productRequest<SlideState>('slideDecks',{classId}));setError('');}catch(cause){setError((cause as Error).message);}},[classId]);
 useEffect(()=>{void reload();},[reload]);
 return {state,error,reload};
}
/** Class → Manage cohorts → Lecture slides. Editors only (the dialog is shown to class editors). */
export default function ClassSlideDecks({snapshot}:{snapshot:ProductSnapshot}){
 const language=useProductLanguage(),p=(en:string,vi:string)=>language==='en'?en:vi,cls=snapshot.selectedClass!;
 const {state,error:loadError,reload}=useClassSlides(cls.id);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[title,setTitle]=useState(''),[file,setFile]=useState<File|null>(null),[replaceFor,setReplaceFor]=useState<string|null>(null);
 const [review,setReview]=useState<Review|null>(null),[ranges,setRanges]=useState<Record<string,{start:string;end:string}>>({}),[drive,setDrive]=useState<{configured:boolean;files:Array<{id:string;name:string;mimeType:string}>}|null>(null);
 const [removing,setRemoving]=useState<Deck|null>(null),[replacement,setReplacement]=useState(''),[confirmOff,setConfirmOff]=useState(false);
 const request=useRef<{signature:string;id:string}|null>(null);
 // One request ID per chosen source, so a retry after a network error never creates a second draft.
 const requestId=(signature:string)=>{if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};return request.current.id;};
 const run=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setNotice('');try{await work();}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}};
 const pagesOf=(versionId:string|null)=>state?.versions.find(v=>v.id===versionId)?.page_count;
 const openReview=(draft:Review)=>{const deck=state?.decks.find(d=>d.id===draft.deckId);setReview(draft);setRanges(Object.fromEntries((deck?deckUsers(deck,snapshot.lessons,state!.assignments):[]).filter(u=>u.row?.start_page).map(u=>[u.lesson.id,{start:String(u.row!.start_page),end:u.row!.end_page?String(u.row!.end_page):''}])));};
 const upload=(deckId?:string)=>run(async()=>{
  if(!file)return;
  if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')throw Error(p('Choose a PDF. For PowerPoint, export a PDF or open it as Google Slides first.','Hãy chọn PDF. Với PowerPoint, hãy xuất PDF hoặc mở bằng Google Slides trước.'));
  if(file.size>MAX_BYTES)throw Error(p('Choose a PDF up to 25 MB.','Hãy chọn PDF tối đa 25 MB.'));
  if(!deckId&&!title.trim())throw Error(p('Enter a display name.','Hãy nhập tên hiển thị.'));
  const id=requestId([file.name,file.size,file.lastModified,deckId||title].join('|'));
  const signed=await productRequest<{bucket:string;path:string;token:string}>('prepareSlideUpload',{classId:cls.id,requestId:id,size:file.size});
  const uploaded=await identity.storage.from(signed.bucket).uploadToSignedUrl(signed.path,signed.token,file,{contentType:'application/pdf'});
  // A retry may find its immutable object already stored (the PUT is refused); the server checks what it actually holds.
  const draft=await productRequest<Review>('completeSlideUpload',{classId:cls.id,requestId:id,deckId,title:title.trim()}).catch(cause=>{throw uploaded.error?Error(p('Private upload failed. Check the connection and retry.','Tải lên riêng tư thất bại. Kiểm tra kết nối rồi thử lại.')):cause;});
  request.current=null;setFile(null);setReplaceFor(null);setTitle('');await reload();openReview(draft);
 });
 const importDrive=(fileId:string,deckId?:string,name?:string)=>run(async()=>{
  const draft=await productRequest<Review>('importDriveSlides',{classId:cls.id,requestId:requestId(['drive',fileId,deckId||name].join('|')),fileId,deckId,title:name});
  request.current=null;await reload();openReview(draft);
 });
 const deckOfReview=review&&state?.decks.find(d=>d.id===review.deckId),oldPages=pagesOf(deckOfReview?.published_version_id||null);
 const affected=deckOfReview?deckUsers(deckOfReview,snapshot.lessons,state!.assignments):[];
 const rangeIssue=(lessonId:string)=>{const r=ranges[lessonId];if(!r||!r.start)return '';const start=Number(r.start),end=r.end?Number(r.end):undefined;if(!Number.isInteger(start)||start<1||end!==undefined&&(!Number.isInteger(end)||end<start))return p('Invalid range','Khoảng trang không hợp lệ');return review&&(start>review.pageCount||(end||0)>review.pageCount)?p(`Beyond page ${review.pageCount}`,`Vượt quá trang ${review.pageCount}`):'';};
 const publish=()=>run(async()=>{
  if(!review||!deckOfReview)return;
  if(affected.some(u=>rangeIssue(u.lesson.id)))throw Error(p('Fix the highlighted page ranges first.','Hãy sửa các khoảng trang được đánh dấu trước.'));
  const payload=affected.filter(u=>u.row).map(u=>({lessonId:u.lesson.id,start:ranges[u.lesson.id]?.start?Number(ranges[u.lesson.id].start):null,end:ranges[u.lesson.id]?.end?Number(ranges[u.lesson.id].end):null}));
  await productRequest('publishSlideVersion',{classId:cls.id,versionId:review.versionId,expectedVersionId:deckOfReview.published_version_id,ranges:payload});
  setReview(null);setNotice(p('Published. Learners now see this version.','Đã xuất bản. Học viên sẽ thấy phiên bản này.'));await reload();
 });
 const setDefault=(deck:Deck|null)=>run(async()=>{
  const target=deck?pagesOf(deck.published_version_id):undefined;
  const inheriting=snapshot.lessons.filter(l=>{const row=state!.assignments.find(a=>a.lesson_id===l.id);return !row||row.mode==='inherit';});
  const beyond=inheriting.filter(l=>{const row=state!.assignments.find(a=>a.lesson_id===l.id);return target&&row&&((row.start_page||0)>target||(row.end_page||0)>target);});
  const {ok}=await confirmAction({title:deck?p('Make this the class default?','Đặt làm bộ mặc định của lớp?'):p('Remove the class default?','Bỏ bộ mặc định của lớp?'),
   body:p(`${inheriting.length} lab(s) follow the class default: ${inheriting.map(l=>l.lesson_key).join(', ')||'none'}.`,`${inheriting.length} lab đang theo mặc định của lớp: ${inheriting.map(l=>l.lesson_key).join(', ')||'không có'}.`)+(beyond.length?' '+p(`Fix these ranges first: ${beyond.map(l=>l.lesson_key).join(', ')}.`,`Cần sửa khoảng trang trước: ${beyond.map(l=>l.lesson_key).join(', ')}.`):' '+p('Check their page ranges after the change.','Hãy kiểm tra lại mốc trang của các lab này sau khi đổi.')),
   confirmLabel:p('Apply','Áp dụng')});
  if(!ok)return;await productRequest('setDefaultSlideDeck',{classId:cls.id,deckId:deck?.id||null});await reload();
 });
 const remove=()=>run(async()=>{if(!removing)return;await productRequest('removeSlideDeck',{classId:cls.id,deckId:removing.id,replacementDeckId:replacement||null,confirmOff});setRemoving(null);setReplacement('');setConfirmOff(false);await reload();});
 const listDrive=()=>run(async()=>{setDrive(await productRequest('listDriveSlides',{classId:cls.id}));});
 if(!state)return <section className="slides-admin"><h3>{p('Lecture slides','Slide bài giảng')} · {cls.class_code}</h3>{loadError?<p role="alert">{loadError} <button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>void reload()}>{p('Retry','Thử lại')}</button></p>:<p role="status">{p('Loading slides…','Đang tải slide…')}</p>}</section>;
 return <section className="slides-admin" aria-labelledby="class-slides-heading">
  <h3 id="class-slides-heading">{p('Lecture slides','Slide bài giảng')} · {cls.class_code}</h3>
  <p className="slides-note">{p('Learners can view the whole PDF; page ranges only guide navigation.','Học viên xem được cả file PDF; khoảng trang chỉ để điều hướng.')}</p>
  {error&&<p role="alert" className="slides-warning">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {state.decks.length?<ul className="slides-decks">{state.decks.map(deck=>{const latest=state.versions.find(v=>v.deck_id===deck.id),draft=latest&&latest.id!==deck.published_version_id&&!latest.published_at?latest:undefined,pages=pagesOf(deck.published_version_id),labs=deckUsers(deck,snapshot.lessons,state.assignments).length,published=state.versions.find(v=>v.id===deck.published_version_id)?.published_at;return <li key={deck.id} className="slides-deck">
   <div className="slides-deck-main">
    <div className="slides-deck-title"><strong>{deck.title}</strong>{deck.is_default&&<span className="slides-badge">{p('Default','Mặc định')}</span>}{draft&&<span className="slides-badge slides-badge-draft">{p('Draft waiting to publish','Bản nháp chờ xuất bản')}</span>}</div>
    <div className="slides-deck-meta">{pages?p(`${pages} pages`,`${pages} trang`):p('Not published','Chưa xuất bản')}{published&&<> · {p('published','xuất bản')} {new Date(published).toLocaleDateString(language==='en'?'en-US':'vi-VN')}</>} · {labs} lab</div>
   </div>
   <div className="slides-row-actions">
    {draft&&<button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy} onClick={()=>openReview({deckId:deck.id,versionId:draft.id,pageCount:draft.page_count})}>{p('Review & publish','Rà soát & xuất bản')}</button>}
    <label className="ui-btn ui-btn-secondary ui-btn-sm">{p('Replace PDF','Thay PDF')}<input type="file" accept="application/pdf,.pdf" hidden disabled={busy} onChange={e=>{const chosen=e.target.files?.[0];e.target.value='';if(chosen){setFile(chosen);setReplaceFor(deck.id);}}}/></label>
    {latest?.drive_file_id&&<button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={busy} onClick={()=>void importDrive(latest.drive_file_id!,deck.id)}>{p('Get latest from Drive','Lấy bản mới từ Drive')}</button>}
    {deck.published_version_id&&<button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={()=>void setDefault(deck.is_default?null:deck)}>{deck.is_default?p('Unset default','Bỏ mặc định'):p('Make default','Đặt mặc định')}</button>}
    <button className="ui-btn ui-btn-ghost ui-btn-sm slides-danger" disabled={busy} onClick={()=>setRemoving(deck)}>{p('Remove','Gỡ')}</button>
   </div>
   {file&&replaceFor===deck.id&&<div className="slides-deck-upload"><span>{file.name}</span><button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy} onClick={()=>void upload(deck.id)}>{busy?p('Uploading…','Đang tải lên…'):p('Upload as draft','Tải lên làm bản nháp')}</button><button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={()=>{setFile(null);setReplaceFor(null);}}>{p('Cancel','Hủy')}</button></div>}
  </li>;})}</ul>:<p>{p('No slide decks yet. Labs work as before until you add one.','Chưa có bộ slide. Các lab vẫn hoạt động như cũ cho tới khi bạn thêm slide.')}</p>}
  {removing&&(()=>{const users=deckUsers(removing,snapshot.lessons,state.assignments),others=state.decks.filter(d=>d.id!==removing.id&&d.published_version_id);return <fieldset><legend>{p('Remove','Gỡ')} “{removing.title}”</legend>
   <p>{users.length?p(`Used by: ${users.map(u=>u.lesson.lesson_key).join(', ')}.`,`Đang dùng ở: ${users.map(u=>u.lesson.lesson_key).join(', ')}.`):p('No lab uses this deck.','Không lab nào dùng bộ slide này.')}</p>
   {(users.length>0||removing.is_default)&&<><label>{p('Replacement deck','Bộ thay thế')}<select value={replacement} onChange={e=>{setReplacement(e.target.value);setConfirmOff(false);}}><option value="">{p('— none —','— không —')}</option>{others.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
   <label><input type="checkbox" checked={confirmOff} disabled={!!replacement} onChange={e=>setConfirmOff(e.target.checked)}/> {p('Turn slides off for these labs','Tắt slide ở các lab này')}</label></>}
   <div className="slides-row-actions"><button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy||(users.length>0||removing.is_default)&&!replacement&&!confirmOff} onClick={()=>void remove()}>{p('Remove deck','Gỡ bộ slide')}</button><button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={()=>setRemoving(null)}>{p('Cancel','Hủy')}</button></div></fieldset>;})()}
  {!review&&<fieldset><legend>{p('Add a deck','Thêm bộ slide')}</legend>
   <label>{p('Display name','Tên hiển thị')}<input value={title} maxLength={160} onChange={e=>setTitle(e.target.value)}/></label>
   <label>{p('1. Upload a PDF from this computer','1. Tải PDF từ máy')}<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e=>{const chosen=e.target.files?.[0]||null;setFile(chosen);setReplaceFor(null);if(chosen&&!title.trim())setTitle(chosen.name.replace(/\.pdf$/i,'').slice(0,160));}}/></label>
   <button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy||!file||!!replaceFor} onClick={()=>void upload()}>{busy?p('Working…','Đang xử lý…'):p('Upload and preview','Tải lên và xem trước')}</button>
   <div><strong>{p('2. Choose from Google Drive','2. Chọn từ Google Drive')}</strong> <button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={busy} onClick={()=>void listDrive()}>{p('List approved files','Liệt kê file được phép')}</button></div>
   {drive&&!drive.configured&&<p className="slides-warning">{p('This class has no approved Drive folder yet. Ask an administrator to approve the class folder; you can still upload a PDF from your computer.','Lớp chưa có thư mục Drive được cấp quyền. Hãy liên hệ quản trị viên để duyệt thư mục của lớp; bạn vẫn có thể tải PDF từ máy.')}</p>}
   {drive?.configured&&!drive.files.length&&<p>{p('No PDF or Google Slides in the approved folders. PowerPoint files must be exported to PDF or opened as Google Slides first.','Không có PDF hoặc Google Slides trong thư mục được phép. File PowerPoint cần xuất PDF hoặc mở bằng Google Slides trước.')}</p>}
   {drive?.files.map(f=><div key={f.id} className="slides-row-actions"><span>{f.name} · {f.mimeType==='application/pdf'?'PDF':'Google Slides'}</span><button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={busy} onClick={()=>void importDrive(f.id,undefined,(title.trim()||f.name.replace(/\.pdf$/i,'')).slice(0,160))}>{p('Import and preview','Nhập và xem trước')}</button></div>)}
  </fieldset>}
  {review&&deckOfReview&&(()=>{const ranged=affected.filter(u=>u.row),whole=affected.length-ranged.length;return <section className="slides-review" aria-labelledby="slides-review-heading">
   <div className="slides-review-head">
    <div><h4 id="slides-review-heading">{p('Review draft','Rà soát bản nháp')} · {deckOfReview.title}</h4>
     <p className="slides-note">{oldPages?p(`${oldPages} → ${review.pageCount} pages.`,`${oldPages} → ${review.pageCount} trang.`):p(`${review.pageCount} pages.`,`${review.pageCount} trang.`)} {p('Learners keep the current version until you publish.','Học viên vẫn xem bản cũ tới khi bạn xuất bản.')}</p></div>
    <div className="slides-row-actions"><button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy} onClick={()=>void publish()}>{busy?p('Publishing…','Đang xuất bản…'):p('Publish','Xuất bản')}</button><button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={()=>setReview(null)}>{p('Cancel','Hủy')}</button></div>
   </div>
   {ranged.length>0&&<><p className="slides-note">{p('Labs with their own slide setting: check the page range against the new file.','Lab có cài đặt slide riêng: kiểm tra khoảng trang với file mới.')}</p><table><thead><tr><th>{p('Lab','Lab')}</th><th>{p('Start','Trang đầu')}</th><th>{p('End','Trang cuối')}</th><th/></tr></thead><tbody>{ranged.map(({lesson})=><tr key={lesson.id}><td>{lesson.lesson_key}</td>
    <td><input type="number" min={1} max={review.pageCount} aria-label={p('Start page','Trang đầu')} value={ranges[lesson.id]?.start||''} onChange={e=>setRanges(r=>({...r,[lesson.id]:{start:e.target.value,end:r[lesson.id]?.end||''}}))}/></td>
    <td><input type="number" min={1} max={review.pageCount} aria-label={p('End page','Trang cuối')} value={ranges[lesson.id]?.end||''} onChange={e=>setRanges(r=>({...r,[lesson.id]:{start:r[lesson.id]?.start||'',end:e.target.value}}))}/></td>
    <td className="slides-error">{rangeIssue(lesson.id)}</td></tr>)}</tbody></table></>}
   {whole>0&&<p className="slides-note">{p(`${whole} other lab(s) show the whole deck.`,`${whole} lab khác dùng cả bộ.`)}</p>}
   <Suspense fallback={<p role="status">{p('Loading preview…','Đang tải bản xem trước…')}</p>}><LessonSlidesViewer key={review.versionId} title={deckOfReview.title} load={async()=>({...await productRequest<{url:string}>('previewSlideVersion',{classId:cls.id,versionId:review.versionId}),pageCount:review.pageCount,startPage:1,endPage:review.pageCount,ranged:false})}/></Suspense>
  </section>;})()}
 </section>;
}
