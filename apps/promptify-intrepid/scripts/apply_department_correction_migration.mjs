import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnv} from 'vite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repository=path.resolve(root,'../..');
const config=loadEnv('rebuild',repository,''),setup=loadEnv('production-setup',repository,'');
const ref=new URL(config.SUPABASE_URL||config.VITE_SUPABASE_URL).hostname.split('.')[0];
if(ref!=='aixhryqzgpptuhstiflx')throw Error('Wrong database target');
if(!setup.SUPABASE_ACCESS_TOKEN)throw Error('Supabase management credential is missing');
const mode=process.argv[2];
if(!['--check','--apply','--verify-rollback'].includes(mode))throw Error('Choose --check, --apply or --verify-rollback for migration 050 only');
async function query(sql){
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${setup.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),signal:AbortSignal.timeout(55000)});
 if(!response.ok)throw Error('Migration database request failed: HTTP '+response.status);
 return response.json();
}
if(mode==='--apply')await query(fs.readFileSync(path.join(root,'gcp/sql/005_department_correction_auto_approval.sql'),'utf8'));
if(mode==='--verify-rollback')console.log(JSON.stringify(await query(fs.readFileSync(path.join(root,'scripts/verify_department_correction_rollback.sql'),'utf8'))));
const state=await query("SELECT to_regprocedure('public.product_auto_correct_department(uuid,uuid,text,text,text)') IS NOT NULL AS function_ready,(SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='product_profile_corrections' AND column_name IN ('assigned_department','requested_department','source_class_id','target_class_id','auto_approved')) AS correction_columns");
console.log(JSON.stringify({project:ref,mode,state}));
