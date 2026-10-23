// Pure, offline helpers shared only by this app's migration scripts.
import {createHash} from 'node:crypto';
export const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const unscopedTables=['product_enterprise_requests','product_governance_config','product_worker_invocations'];
export function validateScope(value){
 if(value?.format!==1||!value.approvalReference?.trim())throw Error('Scope requires format=1 and a reviewed approvalReference');
 const result={...value};
 for(const name of ['classIds','clientIds','courseIds','userIds']){
  if(!Array.isArray(value[name])||value[name].some(id=>!uuid.test(id))||new Set(value[name]).size!==value[name].length)throw Error('Invalid scope '+name);
  result[name]=value[name].map(id=>id.toLowerCase());
 }
 if(!result.classIds.length)throw Error('At least one explicitly approved class is required');
 result.includeUnscoped=value.includeUnscoped||[];
 if(!Array.isArray(result.includeUnscoped)||result.includeUnscoped.some(t=>!unscopedTables.includes(t)))throw Error('Invalid unscoped table approval');
 result.userHistory=value.userHistory||{};
 for(const [table,ids] of Object.entries(result.userHistory)){
  if(!['product_profile_corrections','user_tutorial_progress','product_request_budgets'].includes(table)||!Array.isArray(ids)||ids.some(id=>!uuid.test(id)||!result.userIds.includes(id.toLowerCase())))throw Error('User history requires per-table approved user IDs');
  result.userHistory[table]=ids.map(id=>id.toLowerCase());
 }
 return result;
}
export function assertRowScope(table,row,scope){
 const boundary={classes:'classIds',clients:'clientIds',courses:'courseIds',users:'userIds'}[table];
 if(boundary&&!scope[boundary].includes(String(row.id).toLowerCase()))throw Error('Unapproved '+table+' identity required by FK closure; revise the scope approval, never silently widen it');
 for(const col of ['class_id','source_class_id','target_class_id'])if(row[col]!=null&&!scope.classIds.includes(String(row[col]).toLowerCase()))throw Error('Unapproved class referenced by '+table+'.'+col);
 if(table==='product_profile_corrections'&&!scope.userHistory[table]?.includes(String(row.user_id).toLowerCase()))throw Error('Correction history needs explicit per-user history approval');
}
export function validateRows(all,structure,scope){
 for(const [table,rows] of all){
  const pk=structure.keys[table], seen=new Set();
  for(const row of rows){
   assertRowScope(table,row,scope);
   if(Object.keys(row).some(c=>!Object.hasOwn(structure.tables[table],c))||pk.some(k=>row[k]===null||row[k]===undefined))throw Error('Invalid columns/primary key: '+table);
   const id=JSON.stringify(pk.map(k=>row[k]));if(seen.has(id))throw Error('Duplicate primary key: '+table);seen.add(id);
  }
 }
 for(const fk of structure.relations){
  if(!all.has(fk.child)||!all.has(fk.parent))continue;
  const parents=new Set(all.get(fk.parent).map(row=>JSON.stringify(fk.references.map(k=>String(row[k])))));
  for(const row of all.get(fk.child)){
   const ref=fk.columns.map(k=>row[k]);if(ref.some(x=>x===null||x===undefined))continue;
   if(!parents.has(JSON.stringify(ref.map(String))))throw Error('Missing approved parent: '+fk.child+' -> '+fk.parent);
  }
 }
 // FKs do not prove these entity tuples in the legacy source.
 const documents=new Map((all.get('rebuild_sop_documents')||[]).map(r=>[r.id,r]));
 const versions=new Map((all.get('rebuild_sop_versions')||[]).map(r=>[r.id,r]));
 for(const b of all.get('rebuild_sop_bindings')||[])if(documents.get(b.document_id)?.class_id!==b.class_id||versions.get(b.version_id)?.document_id!==b.document_id)throw Error('SOP binding crosses document/version/class boundary');
 for(const t of ['user_tutorial_progress','product_request_budgets'])for(const row of all.get(t)||[]){const id=t==='product_request_budgets'?row.actor_id:row.user_id;if(!scope.userHistory[t]?.includes(String(id).toLowerCase()))throw Error('Unapproved user history: '+t);}
}
export function loadOrder(structure){
 const pending=new Set(Object.keys(structure.tables)), result=[];
 while(pending.size){
  const available=[...pending].filter(t=>!structure.relations.some(r=>r.child===t&&r.parent!==t&&pending.has(r.parent)));
  if(!available.length)throw Error('Cyclic load dependencies require an explicit deferred-constraint plan');
  for(const t of available.sort()){result.push(t);pending.delete(t);}
 }
 return result;
}
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function canonical(value){return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;}
export const rowHash=row=>sha256(JSON.stringify(canonical(row)));
