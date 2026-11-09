import assert from 'node:assert/strict';
import {citationMode,decideCitation,verifyCitations,withCitations} from '../src/services/citationService';

// docs/proposals/CITATION_WORKER_DESIGN_2026-11-01.md §7 (pure functions; no provider, no DB).
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',X='99999999-9999-4999-8999-999999999999';
const versions=[{version_id:A,version:1},{id:B,version:3}];
const rubric=(weight:number,active=true)=>[{key:'groundedness',weight,active},{key:'format',weight:100-weight,active:true}];

// decideCitation: four branches, diacritics/case folding, inactive or zero-weight groundedness.
assert.deepEqual(decideCitation({rebuild_sop_versions:[]},'cite the SOP'),{required:false,reason:'no-sop',policy:'citation-gate-v1'});
assert.equal(decideCitation({rebuild_sop_versions:versions,production_rubric:rubric(30)},'hello').reason,'rubric');
assert.equal(decideCitation({rebuild_sop_versions:versions,production_rubric:rubric(0)},'Hãy TRÍCH DẪN nguồn').reason,'prompt');
assert.equal(decideCitation({rebuild_sop_versions:versions,production_rubric:rubric(30,false)},'hay trich dan nguon').reason,'prompt');
assert.equal(decideCitation({rebuild_sop_versions:versions,production_rubric:rubric(0)},'Căn cứ quy trình nào?').reason,'prompt');
assert.equal(decideCitation({rebuild_sop_versions:versions,production_rubric:rubric(0)},'Summarise ticket 43').reason,'none');
assert.equal(decideCitation({rebuild_sop_versions:versions,production_rubric:rubric(0)},'dessop resources').reason,'none','keywords match whole words only');

// verifyCitations: valid, wrong version, not admitted, page not retrieved, canonical fallback, no page, none, cap.
const rag={rebuild_sop_versions:versions,rag_status:'pgvector',rag_chunks:[{versionId:A,page:2},{versionId:B,page:null}]};
const out=`ok [SOP:${A}:v1] [Page 2]; old [SOP:${A}:v2]; foreign [SOP:${X}:v1]; page [SOP:${A}:v1] [Page 9]; whole [SOP:${B}:v3]`;
const report=verifyCitations(out,rag,true);
assert.deepEqual(report.checks.map(c=>c.status),['verified','unknown-version','not-admitted','page-not-retrieved','verified']);
assert.deepEqual([report.required,report.found,report.verified],[true,5,2]);
assert.equal(verifyCitations(`[SOP:${A}:v1] [Page 9]`,{...rag,rag_status:'fallback-canonical'},false).checks[0].status,'verified','canonical fallback skips the page check');
assert.deepEqual(verifyCitations('no tags here',rag,true),{required:true,found:0,verified:0,checks:[]});
assert.equal(verifyCitations(`[SOP:${A}:v1] `.repeat(250),rag,false).found,200);

// withCitations: off (and missing decision) leaves the result byte-identical; log/on add the same report.
const result={output:`see [SOP:${A}:v1] [Page 2]`,model:'m'};
const snapshot={...rag,citation_decision:decideCitation({rebuild_sop_versions:versions,production_rubric:rubric(30)},'x')};
assert.equal(withCitations(result,snapshot,'off'),result);
assert.equal(withCitations(result,{...rag},'log'),result);
const logged:string[]=[];const original=console.log;console.log=(line:string)=>logged.push(line);
try{
 const a=withCitations(result,snapshot,'log') as any,b=withCitations(result,structuredClone(snapshot),'on') as any;
 assert.deepEqual(a.citations,b.citations,'sync and async paths see the same frozen snapshot, so the same report');
 assert.equal(a.citations.verified,1);assert.equal(a.output,result.output,'output is never modified');
 assert.ok(!logged.join().includes(result.output),'logs carry counts, not output text');
}finally{console.log=original;}

const saved=process.env.CITATION_GATE;
for(const [value,mode] of [[undefined,'off'],['log','log'],['on','on'],['yes','off']] as const){if(value===undefined)delete process.env.CITATION_GATE;else process.env.CITATION_GATE=value;assert.equal(citationMode(),mode);}
if(saved===undefined)delete process.env.CITATION_GATE;else process.env.CITATION_GATE=saved;
console.log('verify_citations: PASS');
