// Operator-only: put the replacement in ignored .env.rotation.local, never in chat.
// Default validates approval + provider; --apply replaces env and deploys before marking applied.
import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {googleAccessToken} from '../src/services/googleRosterService';
const config=loadEnv('rebuild',process.cwd(),''),candidate=loadEnv('rotation',process.cwd(),'');
Object.assign(process.env,config);
const id=process.argv.find(v=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v));
if(!id)throw new Error('An approved rotation UUID is required');
const url=config.SUPABASE_URL||config.VITE_SUPABASE_URL;
if(new URL(url).hostname!=='aixhryqzgpptuhstiflx.supabase.co')throw new Error('Wrong project');
const db=createClient(url,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:request,error}=await db.from('product_rotation_requests').select('*,approvals:product_rotation_approvals(user_id)').eq('id',id).single();
if(error||request?.status!=='approved'||new Set(request.approvals.map((a:any)=>a.user_id)).size<2)throw new Error('Two distinct administrator approvals required');
const variable=request.provider==='gemini'?'GEMINI_API_KEY':'GOOGLE_SERVICE_ACCOUNT_JSON';
const replacement=candidate[variable],current=config[variable];
if(!replacement||!current||replacement===current||createHash('sha256').update(current).digest('hex')!==request.source_fingerprint)throw new Error('Missing replacement or stale approval; request a new approval for the current configuration');
if(variable==='GEMINI_API_KEY'){
 const check=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':replacement},signal:AbortSignal.timeout(15000)});
 if(!check.ok)throw new Error('Replacement provider credential failed validation');
}else{
 const old=JSON.parse(current),next=JSON.parse(replacement);
 if(old.client_email!==next.client_email)throw new Error('Service account identity change requires separate access review');
 process.env.GOOGLE_SERVICE_ACCOUNT_JSON=replacement;await googleAccessToken();
}
if(!process.argv.includes('--apply')){console.log('Two approvals and replacement provider validation passed. Nothing changed.');process.exit(0);}
const cli=(command:string,input?:string)=>execFileSync('cmd.exe',['/d','/s','/c',command],{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:240000});
// Never pass secret values as command arguments or emit CLI diagnostics containing them.
try{
 execFileSync(process.execPath,['scripts/prepare_production_deploy.mjs'],{stdio:'ignore'});
 cli(`npx vercel env add ${variable} production --force --sensitive --yes --cwd outputs/rebuild-deploy`,replacement+'\n');
 const deployed=cli('npx vercel deploy --prod --yes --archive=tgz --cwd outputs/rebuild-deploy');
 const endpoint=deployed.match(/https:\/\/promptify-rebuild-[a-z0-9-]+\.vercel\.app/)?.[0];
 if(!endpoint)throw new Error('Deployment URL unavailable');
 const inspected=JSON.parse(cli(`npx vercel inspect ${endpoint} --json`));
 if(inspected.readyState!=='READY')throw new Error('Deployment not confirmed Ready');
 const health=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});if(!health.ok)throw new Error('Deployment smoke failed');
 const applied=await db.rpc('product_finish_rotation',{p_request:id,p_fingerprint:request.source_fingerprint,p_deployment:endpoint});
 if(applied.error)throw new Error('Rotation status persistence failed');
 console.log('Approved replacement deployed and marked applied. Update local rebuild configuration and revoke the old credential at its provider after verification.');
}catch{throw new Error('Rotation execution not confirmed. Inspect deployment and environment before retrying; do not revoke the old credential until a healthy replacement is verified.');}
