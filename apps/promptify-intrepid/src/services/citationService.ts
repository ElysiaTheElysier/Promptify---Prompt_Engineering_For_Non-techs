// Citation gate (docs/proposals/CITATION_WORKER_DESIGN_2026-11-01.md, phase 1). Pure functions, zero provider calls.
// Never inserts citations or citation instructions: learners earn groundedness by asking for evidence themselves.
export type CitationMode='off'|'log'|'on';
export type CitationDecision={required:boolean;reason:'no-sop'|'rubric'|'prompt'|'none';policy:'citation-gate-v1'};
export type CitationCheck={tag:string;versionId:string;version:number;page:number|null;status:'verified'|'unknown-version'|'page-not-retrieved'|'not-admitted'};
export type CitationReport={required:boolean;found:number;verified:number;checks:CitationCheck[]};

export function citationMode():CitationMode{const mode=process.env.CITATION_GATE;return mode==='log'||mode==='on'?mode:'off';}

const fold=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/gi,'d').toLowerCase();
const KEYWORDS=/\b(?:sop|trich(?: dan)?|nguon|can cu|theo quy dinh|chinh sach|cite|citations?|sources?|references?|polic(?:y|ies))\b/;

export function decideCitation(lesson:{rebuild_sop_versions?:unknown[];production_rubric?:Array<{key:string;active?:boolean;weight:number}>},prompt:string):CitationDecision{
 const decision=(required:boolean,reason:CitationDecision['reason']):CitationDecision=>({required,reason,policy:'citation-gate-v1'});
 if(!lesson.rebuild_sop_versions?.length)return decision(false,'no-sop');
 if((lesson.production_rubric||[]).some(c=>c.key==='groundedness'&&c.active!==false&&c.weight>0))return decision(true,'rubric');
 if(KEYWORDS.test(fold(prompt||'')))return decision(true,'prompt');
 return decision(false,'none');
}

const TAG=/\[SOP:([^:\]]+):v(\d+)\](?:\s*\[Page (\d+)\])?/g;
const MAX_TAGS=200;
export function verifyCitations(output:string,snapshot:{rebuild_sop_versions?:any[];rag_chunks?:any[];rag_status?:string},required:boolean):CitationReport{
 const admitted=new Map((snapshot.rebuild_sop_versions||[]).map((v:any)=>[String(v.version_id||v.id),Number(v.version)]));
 const retrieval=snapshot.rag_status==='pgvector'||snapshot.rag_status==='bigquery';
 const pages=new Set((snapshot.rag_chunks||[]).filter((c:any)=>c.page!=null).map((c:any)=>`${c.versionId}:${c.page}`));
 const checks:CitationCheck[]=[];
 for(const m of (output||'').matchAll(TAG)){
  if(checks.length>=MAX_TAGS)break;
  const versionId=m[1],version=Number(m[2]),page=m[3]?Number(m[3]):null;
  const status:CitationCheck['status']=!admitted.has(versionId)?'not-admitted':admitted.get(versionId)!==version?'unknown-version'
   :retrieval&&page!==null&&!pages.has(`${versionId}:${page}`)?'page-not-retrieved':'verified';
  checks.push({tag:m[0],versionId,version,page,status});
 }
 return {required,found:checks.length,verified:checks.filter(c=>c.status==='verified').length,checks};
}

/** Adds result.citations from the frozen snapshot; identical for the synchronous and the leased async path. */
export function withCitations<T extends {output:string}>(result:T,snapshot:any,mode:CitationMode=citationMode()):T{
 if(mode==='off'||!snapshot?.citation_decision)return result;
 const report=verifyCitations(result.output,snapshot,snapshot.citation_decision.required===true);
 console.log(JSON.stringify({event:'citation_check',required:report.required,reason:snapshot.citation_decision.reason,found:report.found,verified:report.verified,ragStatus:snapshot.rag_status||null}));
 return {...result,citations:report};
}
