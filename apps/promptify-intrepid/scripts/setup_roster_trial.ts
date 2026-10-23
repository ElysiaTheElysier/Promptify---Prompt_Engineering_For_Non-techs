// Explicitly authorized Table roster trial. No invitations or fabricated identities.
// Default is an atomic dry run; --apply commits. Logs contain only aggregate counts.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadEnv} from 'vite';
import {googleAccessToken,parseRoster} from '../src/services/googleRosterService';
Object.assign(process.env,loadEnv('rebuild',process.cwd(),''));
const setup=loadEnv('production-setup',process.cwd(),'');
const ref=new URL(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL!).hostname.split('.')[0];
if(ref!=='aixhryqzgpptuhstiflx')throw new Error('Wrong rebuild project');
const sheet='1NUv61Mn5TN8kLWWblGQgLD3pV8gmC7JEDP7Ijs0yLCY';
const mapping={tab:'Table',range:'N1:Q1243',email:'Email',fullName:'',department:'Department',country:'Country'};
const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet}/values/${encodeURIComponent("'Table'!N1:Q1243")}`,{headers:{Authorization:`Bearer ${await googleAccessToken()}`},signal:AbortSignal.timeout(15000)});
if(!response.ok)throw new Error('Authorized sample Sheet read failed: '+response.status);
const values=(await response.json()).values as unknown[][];
if(!values?.length)throw new Error('Empty roster');
const deptColumn=values[0].indexOf('Department');
if(deptColumn<0)throw new Error('Department column missing');
const departments=[...new Set(values.slice(1).map(row=>String(row[deptColumn]||'').trim()).filter(Boolean))].sort();
const groups=departments.map(department=>({department,rows:parseRoster(values,mapping,department),code:'TRIAL-INTREPID-'+createHash('sha256').update(department).digest('hex').slice(0,8).toUpperCase()}));
const q=(v:unknown)=>"'"+String(v).replace(/'/g,"''")+"'";
const payload=q(JSON.stringify(groups));
const sql=`BEGIN;
DO $$ DECLARE actor uuid; subject text; client uuid; course uuid; cohort uuid; conn uuid; grp jsonb; result jsonb; processed integer:=0;
BEGIN
 SELECT id,auth_provider_id INTO STRICT actor,subject FROM public.users WHERE email='duonglh.work@gmail.com' AND role='admin';
 IF subject IS NULL THEN RAISE EXCEPTION 'Verified administrator required'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
 SELECT id INTO course FROM public.courses WHERE slug='intrepid-trial-basic' AND publication_status='published';
 IF course IS NULL THEN SELECT id INTO STRICT course FROM public.courses WHERE slug='promptify-public-basic' AND publication_status='published'; END IF;
 SELECT id INTO client FROM public.clients WHERE name='Intrepid — THỬ NGHIỆM / TRIAL (fictional Basic)' ORDER BY created_at LIMIT 1;
 IF client IS NULL THEN INSERT INTO public.clients(name,industry) VALUES('Intrepid — THỬ NGHIỆM / TRIAL (fictional Basic)','Training trial — user-authorized Table roster; fictional SOP') RETURNING id INTO client; END IF;
 FOR grp IN SELECT value FROM jsonb_array_elements(${payload}::jsonb) LOOP
  SELECT id INTO cohort FROM public.classes WHERE class_code=grp->>'code';
  IF cohort IS NULL THEN
   INSERT INTO public.classes(class_code,client_id,course_id,department,status,enrollment_mode,start_date,end_date)
   VALUES(grp->>'code',client,course,grp->>'department','active','instructor',now(),'2026-12-31T23:59:59+07:00') RETURNING id INTO cohort;
  ELSIF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=cohort AND client_id=client AND course_id=course AND department=grp->>'department') THEN RAISE EXCEPTION 'Trial class collision'; END IF;
  conn:=public.product_save_sheet(cohort,${q(sheet)},'TRIAL Table — fictional Basic SOP',${q(JSON.stringify(mapping))}::jsonb);
  result:=public.product_import_roster(cohort,gen_random_uuid(),grp->'rows');
  processed:=processed+(result->>'processed')::integer;
  INSERT INTO public.product_sync_logs(connection_id,class_id,actor_id,request_id,status,processed,result,finished_at) VALUES(conn,cohort,actor,gen_random_uuid(),'success',(result->>'processed')::integer,result,now());
  UPDATE public.product_sheet_connections SET status='synced',last_synced_at=now() WHERE id=conn;
  INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(cohort,actor,'trial.setup','User authorized Table roster and five fictional Basic lessons; no invitations sent.');
 END LOOP;
END $$;
SELECT count(DISTINCT c.id) AS classes,count(e.id) AS enrollments FROM public.classes c JOIN public.clients cl ON cl.id=c.client_id LEFT JOIN public.enrollments e ON e.class_id=c.id AND e.status='active' WHERE cl.name='Intrepid — THỬ NGHIỆM / TRIAL (fictional Basic)';
${process.argv.includes('--apply')?'COMMIT':'ROLLBACK'};`;
const db=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${setup.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),signal:AbortSignal.timeout(50000)});
if(!db.ok){const failure=await db.json();throw new Error('Trial transaction rejected HTTP '+db.status+': '+String(failure.message||failure.error||'unknown').slice(0,180));}
const report={mode:process.argv.includes('--apply')?'committed':'rolled back',sheet,tab:mapping.tab,range:mapping.range,departments:groups.length,rosterRows:groups.reduce((sum,g)=>sum+g.rows.length,0),results:await db.json(),fictionalContent:true,autoSyncEnabled:false};
fs.mkdirSync('outputs/rebuild-audit',{recursive:true});fs.writeFileSync('outputs/rebuild-audit/roster-trial-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
