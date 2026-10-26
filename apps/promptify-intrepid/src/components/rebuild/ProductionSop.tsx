import React,{useRef,useState} from 'react';
import {FileUp,FolderSync,Library,CheckCircle,UploadCloud} from 'lucide-react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage,productText as t} from '../../services/productI18nService';
type Props={snapshot:ProductSnapshot;busy:boolean;onAction:(name:string,payload?:Record<string,unknown>,after?:(value:any)=>void)=>Promise<void>};
export default function ProductionSop({snapshot,busy,onAction}:Props){
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const [tab,setTab]=useState(0),[title,setTitle]=useState(''),[url,setUrl]=useState(''),[file,setFile]=useState<File|null>(null),[lesson,setLesson]=useState(snapshot.lessons[0]?.id||''),[documentId,setDocumentId]=useState(''),[reason,setReason]=useState(''),[reading,setReading]=useState(false),[error,setError]=useState('');
 const submission=useRef<{signature:string;id:string}|null>(null);
 const submit=async()=>{
  setError('');setReading(true);
  try{
   const signature=[title,url,file?.name,file?.size,file?.lastModified,lesson,documentId].join('|');
   if(submission.current?.signature!==signature)submission.current={signature,id:crypto.randomUUID()};
   let payload:Record<string,unknown>={requestId:submission.current.id,title,lessonId:lesson,documentId:documentId||undefined};
   if(tab===1)payload.driveUrl=url;
   else{
    if(!file||file.size>2*1024*1024)throw new Error(p('Choose a file up to 2 MB.','Chọn tệp không quá 2 MB.'));
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    payload={...payload,base64:btoa(binary),filename:file.name};
   }
   await onAction('submitSop',payload,()=>{setTab(2);setFile(null);setTitle('');setUrl('');submission.current=null;});
  }catch(e){setError((e as Error).message);}finally{setReading(false);}
 };
 const status=(value:string)=>({pending:p('Awaiting review','Chờ duyệt'),published:p('Indexed & published','Đã lập chỉ mục & xuất bản'),rejected:p('Rejected','Đã từ chối')}[value]||value);
 const tabs=[{icon:FileUp,label:p('Upload file','Tải tệp')},{icon:FolderSync,label:p('Google Drive link','Link Google Drive')},{icon:Library,label:p('Manage SOPs','Quản lý SOP')}];
 return <section className="prod-sop-layout"><section className="prod-card"><span className="prod-eyebrow">{snapshot.selectedClass?.client_name} / {snapshot.selectedClass?.department}</span><h2>{p('Department SOP & authorized context','SOP phòng ban & ngữ cảnh được cấp quyền')}</h2><nav className="prod-tabs" aria-label={p('SOP contribution sections','Các mục đóng góp SOP')}>{tabs.map((item,i)=><button key={i} aria-current={tab===i?'page':undefined} onClick={()=>setTab(i)}><item.icon size={18}/>{item.label}</button>)}</nav>
 {error&&<p role="alert" className="prod-error">{error}</p>}
 {tab<2&&<><label>{p('SOP title','Tên SOP')}<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label><label>{p('Target Codelab','Codelab được gán')}<select value={lesson} onChange={e=>setLesson(e.target.value)}>{snapshot.lessons.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label><label>{p('Document version','Phiên bản tài liệu')}<select value={documentId} onChange={e=>setDocumentId(e.target.value)}><option value="">{p('New document','Tài liệu mới')}</option>{[...new Map(snapshot.sops.map(s=>[s.document_id,s])).values()].map(s=><option key={s.document_id} value={s.document_id}>{s.title} · {p('Create next version','Tạo phiên bản tiếp theo')}</option>)}</select></label>
 {tab===0?<div className="prod-upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const selected=e.dataTransfer.files[0];if(selected){setFile(selected);if(!title)setTitle(selected.name);}}}><UploadCloud size={40}/><h3>{p('Drop your SOP here','Thả tệp SOP vào đây')}</h3><p>PDF · DOCX · XLSX · MD · CSV · TXT · 2 MB</p><label>{p('Choose source file','Chọn tệp nguồn')}<input type="file" accept=".pdf,.docx,.xlsx,.md,.csv,.txt" onChange={e=>{const selected=e.target.files?.[0]||null;setFile(selected);if(selected&&!title)setTitle(selected.name);}}/></label>{file&&<p>{file.name} · {(file.size/1024).toFixed(1)} KB</p>}</div>:<><label>{p('Drive file URL','URL tệp Drive')}<input type="url" value={url} onChange={e=>setUrl(e.target.value)}/></label><p>{p('Share the file with the server service account. File contents are read without editing your Drive source.','Chia sẻ tệp với tài khoản dịch vụ server. Hệ thống đọc nội dung, giữ nguyên tệp nguồn trên Drive.')}</p></>}
 <p>{p('Extracted source text is reviewed before it can enter learner AI context. Scanned PDFs need a text layer.','Nội dung trích xuất được duyệt trước khi vào ngữ cảnh AI của học viên. PDF scan cần lớp văn bản.')}</p><button className="prod-primary" disabled={busy||reading||title.trim().length<2||!lesson||!(tab===1?url:file)} onClick={()=>void submit()}>{busy||reading?t('loading'):p('Submit for review','Gửi duyệt')}</button></>}
 {tab===2&&<><h3>{p('Contribution & ingestion history','Lịch sử đóng góp & xử lý')}</h3>{!snapshot.contributions?.length&&<p>{t('noData')}</p>}{snapshot.contributions?.map(row=><article className="prod-row-card" key={row.id}><div className="prod-inline"><CheckCircle size={18}/><strong>{row.title}</strong><span className="prod-status">{status(row.status)}</span></div><p>{row.metadata.type} · {(row.metadata.bytes/1024).toFixed(1)} KB · {row.metadata.pages??'—'} {p('pages','trang')}</p><p>{new Date(row.created_at).toLocaleString(lang==='en'?'en-US':'vi-VN')}</p>{row.review_reason&&<p>{row.review_reason}</p>}{snapshot.selectedClass?.can_manage&&row.status==='pending'&&<><button disabled={busy} onClick={()=>void onAction('reviewSop',{contributionId:row.id,decision:'approve'})}>{p('Approve, index & publish','Duyệt, lập chỉ mục & xuất bản')}</button><label>{p('Review reason','Lý do duyệt')}<input value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy||reason.trim().length<2} onClick={()=>void onAction('reviewSop',{contributionId:row.id,decision:'reject',reason})}>{p('Reject','Từ chối')}</button></>}</article>)}<h3>{p('Published source versions','Phiên bản nguồn đã xuất bản')}</h3>{snapshot.sops.map(s=><article className="prod-row-card" key={s.id}><strong>{s.title} · v{s.version}</strong><p><code>{s.citation}</code></p><p>{s.chunks?.length||0} {p('indexed chunks','đoạn đã lập chỉ mục')}</p><button className="ui-btn ui-btn-secondary ui-btn-sm" onClick={()=>void navigator.clipboard.writeText(s.citation)}>{p('Copy citation','Sao chép trích dẫn')}</button></article>)}</>}
 </section></section>;
}
