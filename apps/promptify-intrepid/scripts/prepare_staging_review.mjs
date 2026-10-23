// Local artifact generator only. No SDK, network, shell, secret loading or execution path.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.some(a=>!['--check'].includes(a)))throw Error('Only --check is supported. This tool never applies cloud or database changes.');
const spec=JSON.parse(fs.readFileSync(path.join(app,'gcp/staging-review.json'),'utf8'));
if(spec.project!=='ai-transformation-510302'||spec.instance!=='promptify-staging'||spec.database!=='promptify_db'||spec.status!=='REVIEW_ONLY_NOT_APPROVED')throw Error('Review target/status changed: re-audit required.');
const output=path.join(app,'outputs/staging-change-review');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=new Map();
const json=(name,value)=>files.set(name,JSON.stringify(value,null,2)+'\n');
const migrations=[];
for(const [state,names] of [['confirmed_missing',spec.confirmedMissingMigrations],['compare_catalog_before_selecting',spec.catalogReviewRequired]]){
 for(const name of names){
  if(!/^\d{3}_[a-z0-9_]+\.sql$/.test(name))throw Error('Invalid migration filename');
  const source='gcp/sql/'+name,bytes=fs.readFileSync(path.join(app,source));
  files.set('migrations/'+name,bytes);
  migrations.push({source,reviewCopy:'migrations/'+name,sha256:hash(bytes),state});
 }
}
// Supplemental env proposal, NOT a full service replacement or --set-env-vars input.
json('api-env-additions.review.json',{
 status:'BLOCKED_PENDING_REVIEW',mergeOnly:true,neverRemoveExistingEnv:true,
 preserve:['PGHOST','PGDATABASE','PGUSER','PGPASSWORD secret intrepid-db-password:1','PGPOOL_MAX','GCP_SOP_BUCKET','RUNTIME_MODE','image digest','traffic','service account','resource limits'],
 additions:{AI_PROVIDER:'vertex',GEMINI_MODEL:spec.generationModel,VERTEX_LOCATION:spec.generationLocation,EMBEDDING_PROVIDER:'cloudsql',EMBEDDING_MODEL:'text-multilingual-embedding-002',EMBEDDING_LOCATION:spec.region,GCP_VECTOR_MODE:'pgvector',GCP_ANALYTICS_MODE:'postgres',GCP_WAREHOUSE_ENABLED:'false',GOOGLE_WORKSPACE_SERVICE_ACCOUNT:'promptify-workspace@'+spec.project+'.iam.gserviceaccount.com'},
 blockers:['Approve and verify model/location/quota and budget before rendering runtime env','Compare migrations 006–009 against live catalog before selecting deployment source','Roster workbook and file ACL remain unverified']
});
json('storage-cors.review.json',[{origin:['https://'+spec.project+'.web.app','https://'+spec.project+'.firebaseapp.com',spec.hostingOrigin,...spec.localOrigins],method:['PUT','GET','HEAD'],responseHeader:['Content-Type','x-goog-if-generation-match'],maxAgeSeconds:3600}]);
const rules=fs.readFileSync(path.join(app,'gcp/firestore.rules'));
files.set('firestore.rules',rules);
files.set('firestore.indexes.json',fs.readFileSync(path.join(app,'gcp/firestore.indexes.json')));
json('firebase.review.json',{firestore:{rules:'firestore.rules',indexes:'firestore.indexes.json'}});
files.set('schema-preflight.readonly.sql',`-- Catalog evidence only; contains no migration application or learner data query.
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
SELECT current_database(),current_user,current_setting('transaction_read_only');
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN
 ('product_class_lesson_status','product_save_studio','product_create_codelab','product_publish_contribution','product_claim_roster_sync','product_badge_matches','product_refresh_awards');
SELECT tablename,policyname,roles,qual,with_check FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('lesson_progress','product_workspace_preferences','product_profile_details','product_roster_workbooks');
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'gcp_projection_%';
SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'
 AND table_name='product_sop_contributions' AND column_name='indexing_claimed_at';
SELECT c.conname,pg_get_constraintdef(c.oid),c.convalidated FROM pg_constraint c
 WHERE c.conrelid='public.rebuild_sop_bindings'::regclass;
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname IN ('sop_document_class_identity_uq','sop_version_document_identity_uq');
COMMIT;
`);
files.set('REVIEW.md',`# Staging change bundle — NOT APPLIED

Target: ${spec.project} / ${spec.instance} / ${spec.database}.

This generator only writes local review files. It has no execute/apply mode.
No baseline migration, credential, service deployment, IAM or Scheduler command is included.

1. Review the read-only catalog query and compare existing functions/policies/constraints first.
2. Known absent features: 006_mentor_feedback and 010_structured_badge_rules. The remaining copies are comparison candidates, not an approved migration chain.
3. Never re-run baseline on this populated database. Never sort filenames and apply all. Both 006 files are distinct.
4. 007 uses CREATE INDEX CONCURRENTLY and cannot be wrapped in a global transaction. 009 requires compatible mixed-key/model-aware application code before application. Keep worker/Scheduler off during coordinated validation.
5. 006 feedback and 010 have their own transactions. Approval must identify exact hashes, preconditions, owner, lock/time budget, backup and compatible code. Do not use runtime DB login as migration owner.
6. API env file is a merge-only proposal, not a deployable service spec. Model/location are intentionally null. Do not replace the whole env map or deploy the old audited image as though it contains local fixes.
7. CORS retains both current origins and adds only staging plus localhost:5195/127.0.0.1:5195. Remove local origins after browser testing in a separately approved change. Private access settings remain unchanged.
8. Firestore proposal permits only verified users reading their own invalidation path; clients cannot write. Worker deployment and realtime functional tests remain deferred.
9. No destructive down migration is proposed. For failure, stop writes/workers, retain new tables and data, and restore only the reviewed prior function/policy definitions as a forward repair. Full PITR restore requires a separate plan; never drop new user data as rollback.

See docs/STAGING_CHANGE_REVIEW_2026-10-17.md at repository root for approval items and validation.
`);
json('manifest.json',{format:1,status:'REVIEW_ONLY_NOT_APPROVED',target:spec,migrations,files:[...files].map(([name,bytes])=>({name,sha256:hash(bytes)})),approvalRequiredBeforeAnyRemoteChange:true});
if(args.includes('--check')){
 for(const [name,bytes] of files){const p=path.join(output,name);if(!fs.existsSync(p)||hash(fs.readFileSync(p))!==hash(bytes))throw Error('Missing/stale review artifact: '+name);}
 console.log('Staging review PASS: artifact hashes, migration copies and current source match; no cloud calls.');
}else{
 for(const [name,bytes] of files){const p=path.join(output,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}
 console.log('Prepared '+files.size+' local review artifacts in '+output+'. Nothing applied.');
}
