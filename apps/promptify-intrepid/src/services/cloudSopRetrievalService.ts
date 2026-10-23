import type {CloudDatabaseClient} from './cloudDatabaseService';
import {embedSopChunks} from './sopIngestionService';
import {searchWarehouseSop} from './cloudBigQueryService';
/** Warehouse ranks candidates; SQL rechecks scope and supplies authoritative chunk content/citations. */
export async function retrieveBigqueryContext(reader:CloudDatabaseClient,server:CloudDatabaseClient,classId:string,lessonId:string,prompt:string,admittedVersionIds:string[]){
 const query=Array.from(prompt).slice(0,1000).join(''); // Retrieval-only derived query; full learner prompt is never shortened.
 const vector=(await embedSopChunks([{position:1,page:null,content:query}],'RETRIEVAL_QUERY'))[0].embedding!;
 const candidates=await searchWarehouseSop(admittedVersionIds,vector);
 const fresh=await reader.rpc('rebuild_class_sops',{p_class:classId,p_lesson:lessonId});if(fresh.error)throw Error('SOP access changed');
 const allowed=new Map((fresh.data||[]).filter((v:any)=>admittedVersionIds.includes(v.version_id||v.id)).map((v:any)=>[v.version_id||v.id,v]));
 const ranked=candidates.filter((r:any)=>allowed.has(r.version_id));if(!ranked.length)return {query,chunks:[],context:''};
 const stored=await server.from('product_sop_chunks').select('version_id,position,page,content,model').in('version_id',[...allowed.keys()]).in('position',ranked.map((r:any)=>Number(r.position)));if(stored.error)throw Error('Canonical chunks unavailable');
 const chunks=ranked.flatMap((row:any)=>{const chunk=stored.data.find((c:any)=>c.version_id===row.version_id&&c.position===Number(row.position)&&c.model===(process.env.EMBEDDING_MODEL||'gemini-embedding-001'));const parent=allowed.get(row.version_id) as any;if(!chunk||!parent)return [];const citation=`[SOP:${chunk.version_id}:v${parent.version}]${chunk.page?` [Page ${chunk.page}]`:''}`;return [{versionId:chunk.version_id,position:chunk.position,page:chunk.page,content:chunk.content,citation,title:parent.title}];});
 return {query,chunks,context:chunks.map(c=>`${c.citation} ${c.title}\n${c.content}`).join('\n\n')};
}

export async function retrievePgvectorContext(reader:CloudDatabaseClient,classId:string,lessonId:string,prompt:string,admittedVersionIds:string[]){
 const query=Array.from(prompt).slice(0,1000).join('');
 const vector=(await embedSopChunks([{position:1,page:null,content:query}],'RETRIEVAL_QUERY'))[0].embedding!;
 const result=await reader.rpc('intrepid_search_sop',{p_class:classId,p_lesson:lessonId,p_versions:admittedVersionIds,p_vector:vector});if(result.error)throw Error('Authorized pgvector search failed');
 const chunks=(result.data||[]).map((r:any)=>({versionId:r.version_id,position:r.position,page:r.page,content:r.content,citation:r.citation,title:r.title}));
 return {query,chunks,context:chunks.map((c:any)=>`${c.citation} ${c.title}\n${c.content}`).join('\n\n')};
}
