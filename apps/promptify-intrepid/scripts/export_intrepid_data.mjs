import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateScope,assertRowScope,validateRows,unscopedTables,sha256} from './migration_scope.mjs';
import pg from 'pg';
import structure from '../gcp/data-manifest.json' with {type:'json'};
pg.types.setTypeParser(1184,x=>x); // Preserve source timestamp precision in migration artifacts.
const arg=key=>process.argv.find(x=>x.startsWith('--'+key+'='))?.slice(key.length+3);
const scopeFile=arg('scope-file'),folder=arg('output')||'outputs/gcp/data-export';
const dryRun=process.argv.includes('--dry-run');
if(!scopeFile||dryRun===process.argv.includes('--execute'))throw Error('Choose --dry-run or --execute, with --scope-file=REVIEWED_JSON and SOURCE_DATABASE_URL. Both modes are read-only on source.');
const scopeBytes=fs.readFileSync(scopeFile,'utf8'),scope=validateScope(JSON.parse(scopeBytes)),classes=scope.classIds,extra=scope.includeUnscoped;
if(!process.env.SOURCE_DATABASE_URL)throw Error('SOURCE_DATABASE_URL is required; never put it in command arguments');
if(fs.existsSync(folder)&&fs.readdirSync(folder).length)throw Error('Export destination must be empty');
const unscoped=unscopedTables;
const source=new pg.Client({connectionString:process.env.SOURCE_DATABASE_URL});const sets=new Map(Object.keys(structure.tables).filter(t=>t!=='gcp_identity_bindings').map(t=>[t,new Map()]));
const key=(t,row)=>JSON.stringify(structure.keys[t].map(k=>row[k]));
async function fetch(t,where,values=[]){if(!sets.has(t))throw Error('Unknown export table');const rows=(await source.query(`SELECT * FROM public."${t}"${where?' WHERE '+where:''}`,values)).rows;if(rows.length>200000)throw Error('Export batch too large; prepare paginated scope');let added=0;for(const row of rows){assertRowScope(t,row,scope);const k=key(t,row);if(!sets.get(t).has(k)){sets.get(t).set(k,row);if(sets.get(t).size>200000)throw Error('Export table too large; prepare paginated scope');added++;}}return added;}
const rows=t=>[...sets.get(t).values()],values=(t,col)=>[...new Set(rows(t).map(r=>r[col]).filter(x=>x!==null&&x!==undefined))];
async function fetchIn(t,column,ids){if(ids.length)return fetch(t,`"${column}"=ANY($1)`,[ids]);return 0;}
try{
 await source.connect();await source.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');await source.query("SET LOCAL TIME ZONE 'UTC'");
 await fetchIn('classes','id',classes);if(rows('classes').length!==classes.length)throw Error('Approved class IDs were not all found');
 const courseIds=values('classes','course_id'),clientIds=values('classes','client_id');await fetchIn('courses','id',courseIds);await fetchIn('clients','id',clientIds);
 await fetchIn('course_modules','course_id',courseIds);await fetchIn('lessons','module_id',values('course_modules','id'));await fetchIn('course_instructors','course_id',courseIds);await fetchIn('product_domains','client_id',clientIds);
 for(const [t,cols] of Object.entries(structure.tables))if(t!=='gcp_identity_bindings'&&'class_id' in cols)await fetchIn(t,'class_id',classes);
 await fetchIn('rebuild_sop_versions','document_id',values('rebuild_sop_documents','id'));await fetchIn('product_sop_chunks','version_id',values('rebuild_sop_versions','id'));
 await fetchIn('rebuild_judge_claims','attempt_id',values('prompt_attempts','id'));await fetchIn('rebuild_trainer_actions','attempt_id',values('prompt_attempts','id'));await fetchIn('workshop_message_receipts','message_id',values('workshop_messages','id'));await fetchIn('product_rotation_approvals','request_id',values('product_rotation_requests','id'));
 for(const t of extra)await fetch(t);
 // Include required parents, including historical learners/actors/lesson references.
 let changed=true;for(let iteration=0;changed;iteration++){
  if(iteration>=50)throw Error('FK closure did not converge; no export files written');
  changed=false;
  if(await fetchIn('product_profile_corrections','user_id',scope.userHistory.product_profile_corrections||[]))changed=true;
  for(const correction of rows('product_profile_corrections'))for(const column of ['source_class_id','target_class_id'])if(correction[column]&&!classes.includes(correction[column]))throw Error('Correction history references a class outside approved scope; include its UUID before export: '+correction[column]);
  for(const r of structure.relations){if(!sets.has(r.child)||!sets.has(r.parent))continue;
   const parent=sets.get(r.parent);for(const row of rows(r.child)){
    const fk=r.columns.map(k=>row[k]);if(fk.some(x=>x===null||x===undefined))continue;
    if([...parent.values()].some(p=>r.references.every((k,i)=>String(p[k])===String(fk[i]))))continue;
    const n=await fetch(r.parent,r.references.map((k,i)=>`"${k}"=$${i+1}`).join(' AND '),fk);if(!n)throw Error('Source FK closure failed: '+r.child+' -> '+r.parent);changed=true;
   }
  }
 }
 // Curriculum child records and selected actors' user-owned support records.
 await fetchIn('lesson_resources','lesson_id',values('lessons','id'));await fetchIn('lesson_rubric_criteria','lesson_id',values('lessons','id'));
 await fetchIn('user_tutorial_progress','user_id',scope.userHistory.user_tutorial_progress||[]);await fetchIn('product_request_budgets','actor_id',scope.userHistory.product_request_budgets||[]);
 // New rows above reference only already selected users and lessons.
 for(const r of structure.relations){if(!sets.has(r.child)||!sets.has(r.parent))continue;for(const row of rows(r.child)){const fk=r.columns.map(k=>row[k]);if(fk.some(v=>v===null||v===undefined))continue;if(!rows(r.parent).some(p=>r.references.every((k,i)=>String(p[k])===String(fk[i]))))throw Error('Export FK validation failed: '+r.child);}}
 validateRows(new Map([...sets].map(([t,map])=>[t,[...map.values()]])),structure,scope);
 const sequence=(await source.query("SELECT last_value,is_called FROM public.learner_code_seq")).rows[0];
 const manifest={format:1,scope,scopeApprovalSha256:sha256(scopeBytes),dryRun,sourceVersion:(await source.query('SELECT version() version')).rows[0].version,sequence,createdAt:new Date().toISOString(),tables:[],excludedUnscoped:unscoped.filter(t=>!extra.includes(t))};
 for(const [t,map] of sets){const data=[...map.values()].map(r=>JSON.stringify(r)).join('\n')+(map.size?'\n':'');const file=t+'.jsonl';if(!dryRun){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,file),data);}manifest.tables.push({name:t,file,rows:map.size,sha256:createHash('sha256').update(data).digest('hex')});}
 await source.query('COMMIT');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'scope-approval.json'),scopeBytes);fs.writeFileSync(path.join(folder,dryRun?'scope-review.json':'manifest.json'),JSON.stringify(manifest,null,2));console.log(dryRun?'Read-only scope dry-run complete: counts and scope review only; no row files written.':'Read-only scoped export complete. Private data must stay outside Git. Manifest: '+path.join(folder,'manifest.json'));
}catch(error){await source.query('ROLLBACK').catch(()=>{});console.error('Export failed; no source data changed. '+error.message);process.exitCode=1;}finally{await source.end();}
