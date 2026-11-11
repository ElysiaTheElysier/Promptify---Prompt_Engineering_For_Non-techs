import React,{Suspense,useEffect,useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import {productRequest} from '../../services/productionClientService';
import {useClassSlides} from './ClassSlideDecks';
import './lesson-slides.css';
const LessonSlidesViewer=React.lazy(()=>import('./LessonSlidesViewer'));
type Form={mode:'inherit'|'deck'|'off';deckId:string;start:string;end:string};
/** Studio → lab → Materials → Lecture slides. Saved on its own revision; the class deck list lives in Manage cohorts. */
export default function LessonSlidesSettings({snapshot,lessonId}:{snapshot:ProductSnapshot;lessonId:string}){
 const language=useProductLanguage(),p=(en:string,vi:string)=>language==='en'?en:vi,cls=snapshot.selectedClass!;
 const {state,error:loadError,reload}=useClassSlides(cls.id);
 const row=state?.assignments.find(a=>a.lesson_id===lessonId),saved:Form={mode:row?.mode||'inherit',deckId:row?.deck_id||'',start:row?.start_page?String(row.start_page):'',end:row?.end_page?String(row.end_page):''};
 const [form,setForm]=useState<Form|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(false);
 const current=form||saved,dirty=!!form&&JSON.stringify(form)!==JSON.stringify(saved);
 useEffect(()=>{setForm(null);setPreview(false);},[lessonId]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 if(!state)return <section className="slides-admin"><h3>{p('Lecture slides','Slide bài giảng')}</h3>{loadError?<p role="alert">{loadError} <button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>void reload()}>{p('Retry','Thử lại')}</button></p>:<p role="status">{p('Loading…','Đang tải…')}</p>}</section>;
 const published=state.decks.filter(d=>d.published_version_id),fallback=state.decks.find(d=>d.is_default);
 const deck=current.mode==='deck'?published.find(d=>d.id===current.deckId):current.mode==='inherit'?fallback:undefined;
 const version=state.versions.find(v=>v.id===deck?.published_version_id),pages=version?.page_count;
 const start=current.start?Number(current.start):undefined,end=current.end?Number(current.end):undefined;
 const issue=current.mode==='off'?'':current.mode==='deck'&&!deck?p('Choose a deck.','Hãy chọn bộ slide.'):end!==undefined&&start===undefined?p('Enter the start page.','Hãy nhập trang bắt đầu.'):start!==undefined&&(!Number.isInteger(start)||start<1)||end!==undefined&&(!Number.isInteger(end)||end<(start||1))?p('Pages start at 1 and the end cannot be before the start.','Trang bắt đầu từ 1 và trang cuối không được nhỏ hơn trang đầu.'):pages&&((start||0)>pages||(end||0)>pages)?p(`This deck has ${pages} pages.`,`Bộ slide này có ${pages} trang.`):'';
 const change=(patch:Partial<Form>)=>{setForm({...current,...patch});setNotice('');};
 const save=async()=>{if(busy||issue)return;setBusy(true);setError('');try{
  await productRequest('saveLessonSlides',{classId:cls.id,lessonId,mode:current.mode,deckId:current.mode==='deck'?current.deckId:undefined,startPage:current.mode==='off'||!start?null:start,endPage:current.mode==='off'||!end?null:end,expectedRevision:row?.revision||0});
  await reload();setForm(null);setNotice(p('Slides saved for this lab.','Đã lưu slide cho lab này.'));
 }catch(cause){setError((cause as Error).message);}finally{setBusy(false);}};
 return <section className="slides-admin bg-white rounded-2xl border border-m3-outline-variant p-6" aria-labelledby="lab-slides-heading">
  <h2 id="lab-slides-heading" className="font-bold text-base">{p('Lecture slides','Slide bài giảng')}{dirty&&<span className="slides-badge">{p('Unsaved','Chưa lưu')}</span>}</h2>
  {!published.length&&<p>{p('This class has no published deck yet. Add one in Manage cohorts → Lecture slides.','Lớp chưa có bộ slide đã xuất bản. Hãy thêm trong Quản lý lớp → Slide bài giảng.')}</p>}
  <fieldset className="slides-modes-box"><legend className="slides-field-label">{p('Slides for this lab','Slide cho bài này')}</legend>
   <div className="slides-modes">{([['inherit',p('Class default','Theo mặc định của lớp'),fallback?fallback.title:p('none set','chưa đặt')],['deck',p('Another deck','Chọn bộ khác'),''],['off',p('Off','Tắt'),p('no slides in this lab','bài này không có slide')]] as const).map(([mode,label,hint])=><label key={mode} className="slides-mode"><input type="radio" name={'slides-mode-'+lessonId} checked={current.mode===mode} onChange={()=>change({mode})}/><span>{label}{hint&&<small>{hint}</small>}</span></label>)}</div>
  </fieldset>
  {current.mode!=='off'&&<div className="slides-fields">
   {current.mode==='deck'&&<label className="slides-field">{p('Deck','Bộ slide')}<select value={current.deckId} onChange={e=>change({deckId:e.target.value})}><option value="">{p('— choose —','— chọn —')}</option>{published.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}
   <label className="slides-field slides-page">{p('Start page','Trang bắt đầu')}<input type="number" min={1} max={pages} placeholder="1" value={current.start} onChange={e=>change({start:e.target.value})}/></label>
   <label className="slides-field slides-page">{p('End page','Trang kết thúc')}<input type="number" min={1} max={pages} placeholder={pages?String(pages):''} value={current.end} onChange={e=>change({end:e.target.value})}/></label>
   {pages&&<p className="slides-hint">{p(`Deck has ${pages} pages. Leave empty for the whole deck; a start page alone runs to the end.`,`Bộ có ${pages} trang. Để trống = cả bộ; chỉ nhập trang đầu = tới hết bộ.`)}</p>}
  </div>}
  {issue&&<p className="slides-error" role="alert">{issue}</p>}
  {error&&<p role="alert" className="slides-warning">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <div className="slides-row-actions">
   <button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy||!dirty||!!issue} onClick={()=>void save()}>{busy?p('Saving…','Đang lưu…'):p('Save slides','Lưu slide')}</button>
   {dirty&&<button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={()=>setForm(null)}>{p('Discard changes','Bỏ thay đổi')}</button>}
   {deck&&version&&!issue&&<button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>setPreview(v=>!v)}>{preview?p('Hide preview','Ẩn xem trước'):p('Preview at the start page','Xem trước tại trang bắt đầu')}</button>}
  </div>
  {preview&&deck&&version&&!issue&&<Suspense fallback={<p role="status">{p('Loading preview…','Đang tải bản xem trước…')}</p>}><LessonSlidesViewer key={version.id+current.start+current.end} title={deck.title} load={async()=>({...await productRequest<{url:string}>('previewSlideVersion',{classId:cls.id,versionId:version.id}),pageCount:version.page_count,startPage:start||1,endPage:start?end||version.page_count:version.page_count,ranged:!!start})}/></Suspense>}
 </section>;
}
