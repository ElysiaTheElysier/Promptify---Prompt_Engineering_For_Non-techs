import React,{useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Maximize2,Minimize2,Undo2} from 'lucide-react';
import {useProductLanguage} from '../../services/productI18nService';
import './lesson-slides.css';
export type OpenedSlides={url:string;pageCount:number;startPage:number;endPage:number;ranged:boolean};
/** Static PDF pages (no animation, video or speaker notes). pdf.js and its worker load only when this mounts. */
export default function LessonSlidesViewer({load,title}:{load:()=>Promise<OpenedSlides>;title?:string}){
 const language=useProductLanguage(),p=(en:string,vi:string)=>language==='en'?en:vi;
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[error,setError]=useState(''),[info,setInfo]=useState<OpenedSlides|null>(null),[page,setPage]=useState(0),[attempt,setAttempt]=useState(0),[width,setWidth]=useState(0),[full,setFull]=useState(false);
 const doc=useRef<any>(null),canvas=useRef<HTMLCanvasElement>(null),frame=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null);
 useEffect(()=>{let cancelled=false;setStatus('loading');(async()=>{try{
  const [pdfjs,worker,opened]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url'),load()]);
  pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
  // Bytes are fetched once per open; the short-lived signed URL is not needed after this.
  const response=await fetch(opened.url);if(!response.ok)throw Error('fetch');
  const loaded=await pdfjs.getDocument({data:new Uint8Array(await response.arrayBuffer()),isEvalSupported:false}).promise;
  if(cancelled){void loaded.destroy();return;}
  void doc.current?.destroy();doc.current=loaded;setInfo(opened);setPage(current=>current||opened.startPage);setStatus('ready');
 }catch(cause){if(!cancelled){setError(cause instanceof Error&&cause.message!=='fetch'&&!/pdf/i.test(cause.name)?cause.message:p('The slides could not be loaded.','Không tải được slide.'));setStatus('error');}}})();return()=>{cancelled=true;};},[attempt]);
 useEffect(()=>()=>{void doc.current?.destroy();},[]);
 useEffect(()=>{const node=stage.current;if(!node)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.floor(entry.contentRect.width)));observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{const sync=()=>{if(!document.fullscreenElement)setFull(false);};document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 useEffect(()=>{
  if(status!=='ready'||!doc.current||!canvas.current||!width)return;let task:any,cancelled=false;
  (async()=>{const pdfPage=await doc.current.getPage(page);if(cancelled)return;const base=pdfPage.getViewport({scale:1});
   // Fit width; in full screen also fit the height so a whole slide stays visible.
   const scale=full?Math.min(width/base.width,(window.innerHeight-72)/base.height):width/base.width,ratio=window.devicePixelRatio||1,viewport=pdfPage.getViewport({scale:scale*ratio});
   const target=canvas.current!;target.width=Math.floor(viewport.width);target.height=Math.floor(viewport.height);target.style.width=Math.floor(viewport.width/ratio)+'px';target.style.height=Math.floor(viewport.height/ratio)+'px';
   task=pdfPage.render({canvas:target,canvasContext:target.getContext('2d')!,viewport});await task.promise.catch(()=>undefined);})();
  return()=>{cancelled=true;task?.cancel();};
 },[status,page,width,full]);
 const total=info?.pageCount||0,go=(next:number)=>setPage(Math.min(Math.max(1,next),total||1));
 // The full-window overlay applies at once; native full screen is a bonus where the browser allows it (embedded views may not).
 const toggleFull=()=>{if(full){setFull(false);if(document.fullscreenElement)void document.exitFullscreen().catch(()=>undefined);return;}setFull(true);void frame.current?.requestFullscreen?.().catch(()=>undefined);};
 const keys=(event:React.KeyboardEvent)=>{
  if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
  if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(page+1);}
  else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(page-1);}
  else if(event.key==='Escape'&&full&&!document.fullscreenElement){event.preventDefault();setFull(false);}
 };
 return <div ref={frame} className={'slides-viewer'+(full?' slides-viewer-full':'')} tabIndex={0} onKeyDown={keys} role="region" aria-label={(title?title+' · ':'')+p('Lecture slides','Slide bài giảng')} aria-roledescription={p('slide viewer','trình xem slide')}>
  <div className="slides-toolbar">
   <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>go(page-1)} disabled={status!=='ready'||page<=1} aria-label={p('Previous page','Trang trước')}><ChevronLeft size={16}/></button>
   <span className="slides-count" aria-live="polite">{status==='ready'?p(`Page ${page} / ${total}`,`Trang ${page} / ${total}`):'—'}</span>
   <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>go(page+1)} disabled={status!=='ready'||page>=total} aria-label={p('Next page','Trang sau')}><ChevronRight size={16}/></button>
   {info?.ranged&&<span className="slides-part">{p('Part of this lab','Phần của bài')}: {info.startPage}–{info.endPage}</span>}
   {info?.ranged&&<button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={()=>go(info.startPage)} disabled={page>=info.startPage&&page<=info.endPage}><Undo2 size={15}/>{p('Back to this lab’s part','Về phần của bài')}</button>}
   <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm slides-full-toggle" onClick={toggleFull} disabled={status!=='ready'} aria-pressed={full}>{full?<Minimize2 size={15}/>:<Maximize2 size={15}/>}{full?p('Exit full screen (Esc)','Thoát toàn màn hình (Esc)'):p('Full screen','Toàn màn hình')}</button>
  </div>
  <div ref={stage} className="slides-stage">
   {status==='loading'&&<p role="status" className="slides-state">{p('Loading slides…','Đang tải slide…')}</p>}
   {status==='error'&&<div role="alert" className="slides-state"><p>{error}</p><button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={()=>setAttempt(n=>n+1)}>{p('Retry','Thử lại')}</button></div>}
   <canvas ref={canvas} hidden={status!=='ready'} aria-label={p(`Slide page ${page}`,`Trang slide ${page}`)} role="img"/>
  </div>
  {status==='ready'&&<p className="slides-hint">{p('Tip: click the slide, then use ← → to change pages.','Mẹo: bấm vào slide rồi dùng ← → để đổi trang.')}</p>}
 </div>;
}
