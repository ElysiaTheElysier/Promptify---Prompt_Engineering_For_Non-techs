import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
const phase=process.argv[2];
if(!['before','after','acceptance'].includes(phase)||!process.argv.includes('--staging-readonly'))throw Error('Choose a fixed readonly staging phase');
const out='outputs/staging-release-2026-10-21-lifecycle-resume';
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
if(secret.status||!secret.stdout.trim())throw Error('Existing staging credential unavailable');
const pool=new Pool({host:'127.0.0.1',port:55439,database:'promptify_db',user:'promptify_runtime',password:secret.stdout.trim(),max:1}),db=await pool.connect();
try{
 await db.query('BEGIN READ ONLY');await db.query('SET LOCAL ROLE service_role');
 const classes=(await db.query("SELECT id,class_code FROM public.classes WHERE id IN ('9c32e26b-bcda-4549-bca8-dd4f350c2aaa','f6a40278-c5ab-42f2-9948-abb2fd1431bb') ORDER BY class_code")).rows;
 if(classes.length!==2||!classes.some(c=>c.class_code==='STAGING-SYNTHETIC-20261020-NORTHSTAR')||!classes.some(c=>c.class_code==='STAGING-SYNTHETIC-20261020-JUNIPER'))throw Error('Staging scope mismatch');
 const exists=(await db.query("SELECT to_regclass('public.product_enrollment_ownership') IS NOT NULL AS ownership,to_regprocedure('public.product_finish_roster_snapshot(uuid,jsonb,jsonb,timestamptz)') IS NOT NULL AS finalizer")).rows[0];
 if(phase==='before'&&(exists.ownership||exists.finalizer))throw Error('Migration already present; do not overwrite before evidence');
 if(phase!=='before'&&(!exists.ownership||!exists.finalizer))throw Error('Lifecycle schema missing');
 const status=(await db.query('SELECT status,count(*)::integer AS count FROM public.enrollments GROUP BY status ORDER BY status')).rows;
 const functions=(await db.query("SELECT p.oid::regprocedure::text AS signature,pg_get_userbyid(p.proowner) AS owner,p.prosecdef AS security_definer,md5(p.prosrc) AS source_md5,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('product_import_roster','rebuild_import_roster','product_enroll_basic','product_finish_roster_snapshot','product_preserve_manual_enrollment','product_track_manual_enrollment','product_bump_roster_generation','product_stamp_roster_generation','product_restrict_roster_connection_delete') ORDER BY p.proname")).rows;
 const peerA=(await db.query("SELECT u.id,u.role,u.auth_provider_id IS NOT NULL AS linked,e.status AS a_status FROM public.users u LEFT JOIN public.learners l ON l.user_id=u.id LEFT JOIN public.enrollments e ON e.learner_id=l.id AND e.class_id='9c32e26b-bcda-4549-bca8-dd4f350c2aaa' WHERE u.email='manhmanh100127@gmail.com'")).rows;
 const protectedQa=(await db.query("SELECT e.class_id,e.learner_id,u.email,e.status FROM public.enrollments e JOIN public.learners l ON l.id=e.learner_id JOIN public.users u ON u.id=l.user_id WHERE (e.class_id='9c32e26b-bcda-4549-bca8-dd4f350c2aaa' AND u.email='demo.biz@intrepid.asia') OR (e.class_id='f6a40278-c5ab-42f2-9948-abb2fd1431bb' AND u.email='manhmanh100127@gmail.com') ORDER BY e.class_id")).rows;
 const catalog=exists.ownership?{
  tables:(await db.query("SELECT c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('product_enrollment_ownership','product_roster_source_memberships') ORDER BY c.relname")).rows,
  policies:(await db.query("SELECT tablename,policyname,roles,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('product_enrollment_ownership','product_roster_source_memberships') ORDER BY tablename,policyname")).rows,
  privilege:(await db.query("SELECT has_function_privilege('anon','public.product_finish_roster_snapshot(uuid,jsonb,jsonb,timestamptz)','EXECUTE') AS anon,has_function_privilege('authenticated','public.product_finish_roster_snapshot(uuid,jsonb,jsonb,timestamptz)','EXECUTE') AS authenticated,has_function_privilege('service_role','public.product_finish_roster_snapshot(uuid,jsonb,jsonb,timestamptz)','EXECUTE') AS service_role")).rows[0],
  ownership:(await db.query('SELECT count(*)::integer AS total,count(*) FILTER(WHERE manual_preserved)::integer AS manual,count(*) FILTER(WHERE removed_by_roster)::integer AS roster_removed FROM public.product_enrollment_ownership')).rows[0],
  memberships:(await db.query('SELECT count(*)::integer AS total,count(*) FILTER(WHERE active)::integer AS active FROM public.product_roster_source_memberships')).rows[0],
  fixtureMembers:(await db.query("SELECT e.class_id,u.email,e.status,o.manual_preserved,o.removed_by_roster FROM public.enrollments e JOIN public.learners l ON l.id=e.learner_id JOIN public.users u ON u.id=l.user_id JOIN public.product_enrollment_ownership o ON o.class_id=e.class_id AND o.learner_id=e.learner_id WHERE e.class_id IN ('9c32e26b-bcda-4549-bca8-dd4f350c2aaa','f6a40278-c5ab-42f2-9948-abb2fd1431bb') ORDER BY e.class_id,u.email")).rows
 }:null;
 await db.query('COMMIT');
 const report={at:new Date().toISOString(),phase,scope:'Read-only staging catalog and fixed fictional QA memberships; no authentication identity fabrication',classes,exists,status,functions,peerA,protectedQa,catalog};
 fs.writeFileSync(`${out}/roster-catalog-${phase}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({phase,lifecycle:exists,peerHasAEnrollment:peerA.some(p=>p.a_status!==null),protectedQa:protectedQa.length,ownership:catalog?.ownership}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
