import {randomUUID} from 'node:crypto';
import {Firestore} from '@google-cloud/firestore';
import keys from './cloudProjectionKeys.json';
import {sqlTransaction} from './cloudPostgresService';
import {mergeWarehouseEntity,syncWarehouseVectors} from './cloudBigQueryService';
const firestore=new Firestore();
let testNotice:((uid:string,classId:string,revision:number,state:string)=>Promise<void>)|undefined;
export function configureProjectionNoticeForTests(value:typeof testNotice){
 if(process.env.NODE_ENV!=='test')throw Error('Projection test injection requires NODE_ENV=test');
 testNotice=value;
}
const fields:Record<string,string[]>={
 classes:['id','class_code','course_id','client_id','department','status'],courses:['id','title','status','publication_status'],course_modules:['id','course_id','title','status'],lessons:['id','module_id','title','status'],
 enrollments:['id','learner_id','class_id','status'],prompt_attempts:['id','learner_id','class_id','lesson_ref_id','attempt_number','model','latency_ms','created_at','evaluation_json'],lesson_progress:['learner_id','class_id','lesson_id','status','attempts_count','best_score','updated_at'],product_attendance:['class_id','lesson_id','learner_id','present','updated_at'],product_awards:['id','class_id','lesson_id','learner_id','kind','issued_at'],product_sop_contributions:['id','class_id','lesson_id','status','created_at','version_id'],product_studio:['class_id','lesson_id','revision']
};
export function warehouseProjection(table:string,row:Record<string,any>){if(!fields[table])return undefined;const projected=Object.fromEntries(fields[table].filter(k=>k in row).map(k=>[k,row[k]]));
 if(table==='prompt_attempts')projected.evaluation_json=row.evaluation_json?{total:row.evaluation_json.total,contract:row.evaluation_json.contract}:null;
 if(table==='product_studio')projected.lesson_status=row.config?.lessonOverrides?.status??null;
 return projected;
}
async function syncVersion(versionId:string,revision:number){
 const rows=await sqlTransaction(undefined,async db=>(await db.query(`SELECT ch.position,ch.page,ch.content,ch.embedding,ch.model,d.class_id,v.document_id,v.version,d.title FROM product_sop_chunks ch JOIN rebuild_sop_versions v ON v.id=ch.version_id JOIN rebuild_sop_documents d ON d.id=v.document_id WHERE v.id=$1 AND ch.model=$2 AND EXISTS(SELECT 1 FROM rebuild_sop_bindings b WHERE b.version_id=v.id) AND (NOT EXISTS(SELECT 1 FROM product_sop_contributions p WHERE p.version_id=v.id) OR EXISTS(SELECT 1 FROM product_sop_contributions p WHERE p.version_id=v.id AND p.status='published')) ORDER BY ch.position`,[versionId,process.env.EMBEDDING_MODEL||'gemini-embedding-001'])).rows);
 if(rows.some(r=>!Array.isArray(r.embedding)||r.embedding.length!==768||r.embedding.some((v:any)=>typeof v!=='number'||!Number.isFinite(v))))throw Error('Stored embedding contract mismatch');
 await syncWarehouseVectors(versionId,rows,revision);
}
async function invalidation(classId:string,revision:number,learnerId?:string){
 const bindings=await sqlTransaction(undefined,async db=>(await db.query(`SELECT b.external_subject,b.legacy_subject,u.email FROM gcp_identity_bindings b JOIN users u ON u.id=b.user_id WHERE $1::uuid IS NULL OR u.role<>'learner' OR EXISTS(SELECT 1 FROM learners l WHERE l.id=$1 AND l.user_id=u.id)`,[learnerId||null])).rows);
 for(const b of bindings){
  const allowed=await sqlTransaction({subject:b.legacy_subject,email:b.email,firebaseUid:b.external_subject},async db=>(await db.query('SELECT product_can_read_class($1) AS allowed',[classId])).rows[0].allowed);
  if(testNotice){await testNotice(b.external_subject,classId,revision,allowed?'changed':'revoked');continue;}
  const ref=firestore.doc(`userUpdates/${b.external_subject}/classes/${classId}`);
  await firestore.runTransaction(async tx=>{const prior=await tx.get(ref);if(Number(prior.get('revision')||0)>revision)return;tx.set(ref,{revision,state:allowed?'changed':'revoked',updatedAt:new Date()});});
 }
}
export function projectionKey(table:string,input:unknown){
 const columns=(keys as Record<string,string[]>)[table];
 if(!columns||!input||typeof input!=='object'||Array.isArray(input))throw Error('Projection entity key invalid');
 const key={...input} as Record<string,unknown>;
 if(table==='product_sop_chunks'&&Object.prototype.hasOwnProperty.call(key,'"position"')){
  if(Object.prototype.hasOwnProperty.call(key,'position'))throw Error('Conflicting projection key');
  key.position=key['"position"'];delete key['"position"'];
 }
 if(Object.keys(key).sort().join(',')!==[...columns].sort().join(','))throw Error('Projection entity key invalid');
 const reconcileVersion=table==='product_sop_chunks'&&key.position===null;
 if(columns.some(k=>key[k]===undefined||key[k]===null)&&!reconcileVersion)throw Error('Projection entity key missing');
 if(reconcileVersion&&(typeof key.version_id!=='string'||!/^[0-9a-f-]{36}$/i.test(key.version_id)))throw Error('Projection version invalid');
 return {key,columns,reconcileVersion};
}
async function projectEvent(event:any){
 const table=event.entity_table,{key,columns,reconcileVersion}=projectionKey(table,event.entity_key);
 if(reconcileVersion){
  // Old trigger produced a null quoted position. Refresh the entire version;
  // never invent a chunk key or discard the durable original event.
  if(process.env.GCP_WAREHOUSE_ENABLED!=='false'&&process.env.GCP_VECTOR_MODE==='bigquery')
   await syncVersion(key.version_id as string,Number(event.id));
  const parents=await sqlTransaction(undefined,async db=>(await db.query(
   'SELECT d.class_id FROM rebuild_sop_versions v JOIN rebuild_sop_documents d ON d.id=v.document_id WHERE v.id=$1',[key.version_id])).rows);
  for(const id of new Set([event.class_id,...parents.map(r=>r.class_id)].filter(Boolean)))await invalidation(id as string,Number(event.id));
  return;
 }
 const where=columns.map((k,i)=>`"${k}"=$${i+1}`).join(' AND '),values=columns.map(k=>key[k]);
 const row=await sqlTransaction(undefined,async db=>(await db.query(`SELECT * FROM public."${table}" WHERE ${where}`,values)).rows[0]);
 if(process.env.GCP_WAREHOUSE_ENABLED!=='false'&&fields[table])await mergeWarehouseEntity({source_table:table,entity_id:JSON.stringify(key),entity_json:row?JSON.stringify(warehouseProjection(table,row)):null,source_version:Number(event.id),is_deleted:!row});
 const versionId=row?.version_id||key.version_id||(table==='rebuild_sop_versions'?key.id:undefined);
 if(process.env.GCP_WAREHOUSE_ENABLED!=='false'&&process.env.GCP_VECTOR_MODE==='bigquery'&&['product_sop_chunks','product_sop_contributions','rebuild_sop_bindings','rebuild_sop_versions'].includes(table))for(const id of new Set([versionId,event.previous_version_id].filter(Boolean)))await syncVersion(id as string,Number(event.id));
 let classIds:string[]=event.class_id?[event.class_id]:table==='classes'?[key.id]:[];
 if(!classIds.length&&['courses','course_modules','lessons'].includes(table))classIds=await sqlTransaction(undefined,async db=>{
  const course=table==='courses'?key.id:table==='course_modules'?row?.course_id:row?.module_id?(await db.query('SELECT course_id FROM course_modules WHERE id=$1',[row.module_id])).rows[0]?.course_id:undefined;
  if(!course)return [];return (await db.query('SELECT id FROM classes WHERE course_id=$1',[course])).rows.map(r=>r.id);
 });
 if(['users','product_domains','gcp_identity_bindings','course_instructors'].includes(table))classIds=await sqlTransaction(undefined,async db=>(await db.query('SELECT id FROM classes')).rows.map(r=>r.id));
 for(const id of classIds)await invalidation(id,Number(event.id),event.learner_id||row?.learner_id);
}
export async function runProjectionWorker(limit=10){
 if(!Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid projection batch');
 const claim=randomUUID();
 const events=await sqlTransaction(undefined,async db=>(await db.query(`UPDATE gcp_projection_outbox SET claimed_at=now(),claim_id=$1,attempts=attempts+1 WHERE id IN (SELECT id FROM gcp_projection_outbox WHERE processed_at IS NULL AND dead_letter_at IS NULL AND available_at<=now() AND (claimed_at IS NULL OR claimed_at<now()-interval '10 minutes') ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED) RETURNING *`,[claim,limit])).rows);
 let processed=0,failed=0;
 for(const event of events){try{await projectEvent(event);await sqlTransaction(undefined,db=>db.query('UPDATE gcp_projection_outbox SET processed_at=now(),error_code=NULL WHERE id=$1 AND claim_id=$2',[event.id,claim]));processed++;}
 catch{await sqlTransaction(undefined,db=>db.query("UPDATE gcp_projection_outbox SET error_code='projection_failed',claimed_at=NULL,claim_id=NULL,available_at=now()+interval '1 minute'*least(attempts,30),dead_letter_at=CASE WHEN attempts>=10 THEN now() ELSE NULL END WHERE id=$1 AND claim_id=$2",[event.id,claim]));failed++;}}
 return {processed,failed};
}
