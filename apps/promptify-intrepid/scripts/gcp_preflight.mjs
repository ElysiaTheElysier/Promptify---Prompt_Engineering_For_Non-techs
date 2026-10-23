// Default mode never loads cloud SDKs, reads credentials or connects to databases.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const folder=process.argv.find(s=>s.startsWith('--input='))?.slice(8)||'outputs/gcp';
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'schema-manifest.json'),'utf8'));
const files=fs.readdirSync('gcp/sql').filter(n=>/^\d{3}_[a-z0-9_]+\.sql$/.test(n)).sort();
if(manifest.format!==1||JSON.stringify(manifest.migrations.map(m=>m.file))!==JSON.stringify(files.map(n=>'gcp/sql/'+n)))throw Error('Schema chain drift: render again and review every new migration');
for(let i=0;i<files.length;i++){
 if(Number(files[i].slice(0,3))!==i+1)throw Error('Missing/duplicate migration sequence');
 if(createHash('sha256').update(fs.readFileSync('gcp/sql/'+files[i])).digest('hex')!==manifest.migrations[i].sha256)throw Error('Migration hash drift: '+files[i]);
}
const deployment=JSON.parse(fs.readFileSync(path.join(folder,'deployment.json'),'utf8'));
if(deployment.databaseTier==='db-f1-micro'||deployment.databaseTier==='db-g1-small')throw Error('ML integration requires dedicated core');
if(!/^gemini-.*flash/.test(deployment.generationModel)||deployment.embeddingModel!=='text-multilingual-embedding-002'||deployment.vectorMode!=='pgvector')throw Error('Unreviewed generation or retrieval model change');
for(const name of ['api','worker']){
 const text=fs.readFileSync(path.join(folder,'cloudrun-'+name+'.yaml'),'utf8');
 if(/(PROJECT_ID|SQL_INSTANCE|GENERATION_MODEL|GENERATION_LOCATION|SECRET_VERSION|IMAGE_TAG|WAREHOUSE_ENABLED)/.test(text))throw Error('Unrendered template '+name);
 if(!text.includes('value: promptify_runtime')||!text.includes("key: '"+deployment.secretVersion+"'"))throw Error('Runtime role or pinned secret mismatch');
}
const result={checkedAt:new Date().toISOString(),mode:'OFFLINE VALIDATION ONLY',migrations:files.length,locallyConsistent:true,cloudValidated:false,waitingFor:deployment.pending};
if(process.argv.includes('--catalog')){
 if(!process.argv.includes('--execute-readonly')||!process.env.TARGET_DATABASE_URL)throw Error('Read-only catalog access requires --catalog --execute-readonly and TARGET_DATABASE_URL; no paid provider probe');
 const {default:pg}=await import('pg');const db=new pg.Client({connectionString:process.env.TARGET_DATABASE_URL});
 try{
  await db.connect();await db.query('BEGIN TRANSACTION READ ONLY');await db.query("SET LOCAL statement_timeout='20s'");
  result.catalog={version:(await db.query('SHOW server_version')).rows[0].server_version,extensions:(await db.query("SELECT extname,extversion FROM pg_extension WHERE extname IN ('vector','google_ml_integration','pgtap','plpgsql_check') ORDER BY extname")).rows,roles:(await db.query("SELECT rolname,rolsuper,rolinherit,rolbypassrls FROM pg_roles WHERE rolname IN ('promptify_runtime','service_role','authenticated') ORDER BY rolname")).rows,invalidIndexes:(await db.query("SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE NOT i.indisvalid AND c.relnamespace='public'::regnamespace")).rows,unvalidatedConstraints:(await db.query("SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated")).rows};
  if(!['vector','google_ml_integration'].every(name=>result.catalog.extensions.some(e=>e.extname===name)))throw Error('Required target extensions missing');
  const bindings=(await db.query('SELECT count(*)::int n FROM rebuild_sop_bindings b JOIN rebuild_sop_documents d ON d.id=b.document_id JOIN rebuild_sop_versions v ON v.id=b.version_id WHERE b.class_id<>d.class_id OR v.document_id<>b.document_id')).rows[0].n;
  if(bindings||result.catalog.invalidIndexes.length||result.catalog.unvalidatedConstraints.length)throw Error('Catalog integrity blockers remain; stop deployment');
  const runtime=result.catalog.roles.find(r=>r.rolname==='promptify_runtime');if(!runtime||runtime.rolsuper||runtime.rolinherit||runtime.rolbypassrls)throw Error('Runtime role violates privilege contract');
  await db.query('ROLLBACK');result.catalogRead=true;
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw Error('Catalog validation failed: '+(error.code||'see local DB/permissions configuration'));}finally{await db.end();}
}
fs.writeFileSync(path.join(folder,'preflight-results.json'),JSON.stringify(result,null,2));
console.log('PASS local GCP manifest/config preflight. Cloud setup, extensions, paid Vertex probe and end-to-end staging remain pending.');
