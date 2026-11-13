import React,{Suspense,useEffect,useRef,useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage} from '../../services/productI18nService';
import {productRequest} from '../../services/productionClientService';
import {uploadSlidePdf,useClassSlides} from './ClassSlideDecks';
import './lesson-slides.css';
const LessonSlidesViewer=React.lazy(()=>import('./LessonSlidesViewer'));
type Form={mode:'inherit'|'deck'|'off';deckId:string;start:string;end:string};
/** Studio → lab → Materials → Lecture slides: settings on the left, live preview with open/download/upload on the right.
 * Saved on its own revision; the full class deck list stays in Manage cohorts. */
export default function LessonSlidesSettings({snapshot,lessonId}:{snapshot:ProductSnapshot;lessonId:string}){
 const language=useProductLanguage(),p=(en:string,vi:string)=>language==='en'?en:vi,cls=snapshot.selectedClass!;
 const {state,error:loadError,reload}=useClassSlides(cls.id);
 const row=state?.assignments.find(a=>a.lesson_id===lessonId),saved:Form={mode:row?.mode||'inherit',deckId:row?.deck_id||'',start:row?.start_page?String(row.start_page):'',end:row?.end_page?String(row.end_page):''};
 const [form,setForm]=useState<Form|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const current=form||saved,dirty=!!form&&JSON.stringify(form)!==JSON.stringify(saved);
 useEffect(()=>{setForm(null);},[lessonId]);
 const uploadRequest=useRef<{signature:string;id:string}|null>(null);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 if(!state)return <section className="slides-admin"><h3>{p('Lecture slides','Slide bài giảng')}</h3>{loadError?<p role="alert">{loadError} <button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>void reload()}>{p('Retry','Thử lại')}</button></p>:<p role="status">{p('Loading…','Đang tải…')}</p>}</section>;
 const published=state.decks.filter(d=>d.published_version_id),fallback=state.decks.find(d=>d.is_default);
 const deck=current.mode==='deck'?published.find(d=>d.id===current.deckId):current.mode==='inherit'?fallback:undefined;
 const version=state.versions.find(v=>v.id===deck?.published_version_id),pages=version?.page_count;
 const start=current.start?Number(current.start):undefined,end=current.end?Number(current.end):undefined;
 const issue=current.mode==='off'?'':current.mode==='deck'&&!deck?p('Choose a deck.','Hãy chọn bộ slide.'):end!==undefined&&start===undefined?p('Enter the start page.','Hãy nhập trang bắt đầu.'):start!==undefined&&(!Number.isInteger(start)||start<1)||end!==undefined&&(!Number.isInteger(end)||end<(start||1))?p('Pages start at 1 and the end cannot be before the start.','Trang bắt đầu từ 1 và trang cuối không được nhỏ hơn trang đầu.'):pages&&((start||0)>pages||(end||0)>pages)?p(`This deck has ${pages} pages.`,`Bộ slide này có ${pages} trang.`):'';
 const change=(patch:Partial<Form>)=>{setForm({...current,...patch});setNotice('');};
 const run=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setNotice('');try{await work();}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}};
 const signedUrl=async()=>(await productRequest<{url:string}>('previewSlideVersion',{classId:cls.id,versionId:version!.id})).url;
 // The tab opens inside the click so pop-up blockers allow it; the short-lived signed URL is fetched afterwards.
 const openFile=()=>{const tab=window.open('','_blank');void run(async()=>{try{const url=await signedUrl();if(tab)tab.location.href=url;else window.location.assign(url);}catch(cause){tab?.close();throw cause;}});};
 const download=()=>run(async()=>{const response=await fetch(await signedUrl());if(!response.ok)throw Error(p('Download failed. Try again.','Tải về thất bại. Hãy thử lại.'));const href=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=href;link.download=(deck!.title||'slides').replace(/[\\/:*?"<>|]+/g,'_')+'.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),10000);});
 // Upload a PDF as a new class deck, publish it (no lab uses it yet) and point this lab at it; the trainer still saves.
 const upload=(file:File)=>run(async()=>{const signature=[file.name,file.size,file.lastModified].join('|');if(uploadRequest.current?.signature!==signature)uploadRequest.current={signature,id:crypto.randomUUID()};
  const title=file.name.replace(/\.pdf$/i,'').slice(0,160)||p('Slides','Slide');
  const draft=await uploadSlidePdf(cls.id,file,uploadRequest.current.id,{title},p);
  await productRequest('publishSlideVersion',{classId:cls.id,versionId:draft.versionId,expectedVersionId:null,ranges:[]});
  uploadRequest.current=null;await reload();setForm({mode:'deck',deckId:draft.deckId,start:'',end:''});
  setNotice(p(`Uploaded "${title}" (${draft.pageCount} pages). Press Save slides to use it in this lab.`,`Đã tải lên "${title}" (${draft.pageCount} trang). Bấm Lưu slide để dùng cho bài này.`));});
 const save=async()=>{if(busy||issue)return;setBusy(true);setError('');try{
  await productRequest('saveLessonSlides',{classId:cls.id,lessonId,mode:current.mode,deckId:current.mode==='deck'?current.deckId:undefined,startPage:current.mode==='off'||!start?null:start,endPage:current.mode==='off'||!end?null:end,expectedRevision:row?.revision||0});
  await reload();setForm(null);setNotice(p('Slides saved for this lab.','Đã lưu slide cho lab này.'));
 }catch(cause){setError((cause as Error).message);}finally{setBusy(false);}};
 const previewable=!!(deck&&version&&!issue);
 return <section className="slides-admin slides-lab bg-white rounded-2xl border border-m3-outline-variant p-6" aria-labelledby="lab-slides-heading">
  <h2 id="lab-slides-heading" className="font-bold text-base">{p('Lecture slides','Slide bài giảng')}{dirty&&<span className="slides-badge">{p('Unsaved','Chưa lưu')}</span>}</h2>
  <div className="slides-lab-grid"><div className="slides-lab-settings">
  {!published.length&&<p>{p('This class has no published deck yet. Upload a PDF on the right, or add one in Manage cohorts → Lecture slides.','Lớp chưa có bộ slide đã xuất bản. Tải PDF lên ở bên phải, hoặc thêm trong Quản lý lớp → Slide bài giảng.')}</p>}
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
   <button className="ui-btn ui-btn-primary ui-btn-sm" disabled={busy||!dirty||!!issue} onClick={()=>void save()}>{busy?p('Working…','Đang xử lý…'):p('Save slides','Lưu slide')}</button>
   {dirty&&<button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={()=>setForm(null)}>{p('Discard changes','Bỏ thay đổi')}</button>}
  </div>
  </div>
  <aside className="slides-lab-preview" aria-label={p('Slide preview','Xem trước slide')}>
   <div className="slides-lab-preview-head"><strong>{deck?deck.title:p('Preview','Xem trước')}</strong>
    <div className="slides-lab-preview-actions">
     {deck&&version&&<button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={openFile}>{p('Open file','Mở file')}</button>}
     {deck&&version&&<button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={()=>void download()}>{p('Download','Tải về')}</button>}
     <label className={'ui-btn ui-btn-secondary ui-btn-sm slides-upload-button'+(busy?' is-disabled':'')}>{p('Upload PDF','Tải slide lên (PDF)')}<input type="file" className="sr-only" accept="application/pdf,.pdf" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></label>
    </div>
   </div>
   {previewable?<Suspense fallback={<p role="status">{p('Loading preview…','Đang tải bản xem trước…')}</p>}><LessonSlidesViewer key={version!.id+current.start+current.end} title={deck!.title} load={async()=>({...await productRequest<{url:string}>('previewSlideVersion',{classId:cls.id,versionId:version!.id}),pageCount:version!.page_count,startPage:start||1,endPage:start?end||version!.page_count:version!.page_count,ranged:!!start})}/></Suspense>
    :<p className="slides-lab-empty">{current.mode==='off'?p('Slides are off for this lab.','Bài này đang tắt slide.'):issue?p('Fix the settings on the left to see the preview.','Sửa phần cài đặt bên trái để xem trước.'):p('No deck to preview. Upload a PDF (PowerPoint: export to PDF first, up to 25 MB).','Chưa có slide để xem. Tải PDF lên (PowerPoint: xuất ra PDF trước, tối đa 25 MB).')}</p>}
  </aside></div>
 </section>;
}
