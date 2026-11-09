import {verifyCitations} from '../../services/citationService';

type Source={version_id:string;version:number;title?:string};
// Shown only with CITATION_GATE=on. Checks tags against this lab's SOPs in the browser; adds no request and never edits output.
export function CitationNotice({output,sources,p}:{output:string;sources:Source[];p:(en:string,vi:string)=>string}){
 if(!sources.length)return null;
 const report=verifyCitations(output,{rebuild_sop_versions:sources,rag_status:'fallback-canonical'},false);
 const title=(id:string)=>sources.find(s=>s.version_id===id)?.title;
 if(!report.found)return <p role="note" className="lv-citations">{p('This response cites no SOP of this lab.','Câu trả lời chưa trích dẫn SOP nào của bài.')}</p>;
 const unverified=report.checks.filter(c=>c.status!=='verified');
 return <div role="note" className="lv-citations"><p>{p(`${report.verified} of ${report.found} citations match this lab's SOPs.`,`${report.verified}/${report.found} trích dẫn khớp SOP của bài.`)}</p>
  {unverified.length>0&&<ul>{unverified.map((c,i)=><li key={i}><code>{c.tag}</code> {c.status==='unknown-version'
   ?p(`cites version v${c.version} of “${title(c.versionId)}”, which this lab does not use.`,`trích phiên bản v${c.version} của “${title(c.versionId)}”, không phải phiên bản bài đang dùng.`)
   :p('is not an SOP of this lab.','không phải SOP của bài.')}</li>)}</ul>}</div>;
}
