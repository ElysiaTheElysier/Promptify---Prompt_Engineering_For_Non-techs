// Real app/handlers and Cloud SQL, never the UI adapter or emulator.
import {createServer,loadEnv} from 'vite';
import {spawnSync} from 'node:child_process';
import {GoogleAuth} from 'google-auth-library';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(!process.argv.includes('--staging'))throw Error('Explicit --staging required; this runs real staging APIs.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const config=loadEnv('staging',root,'');
if(config.GOOGLE_CLOUD_PROJECT!=='ai-transformation-510302'||config.PGHOST!=='127.0.0.1'||config.PGPORT!=='55439'||config.PGDATABASE!=='promptify_db'||config.PGUSER!=='promptify_runtime')throw Error('Unexpected staging target.');
if(config.VITE_FIREBASE_AUTH_EMULATOR||config.VITE_FIRESTORE_EMULATOR||process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIRESTORE_EMULATOR_HOST)throw Error('Real staging review cannot use emulators.');
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});
let runtimePassword=secret.status===0?secret.stdout.trim():'';
if(!runtimePassword){
 // ADC is the already-authorized local backend identity; never substitute a mock or owner password.
 process.env.GOOGLE_CLOUD_QUOTA_PROJECT='ai-transformation-510302';
 try{
  const client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  const result=await client.request({url:'https://secretmanager.googleapis.com/v1/projects/ai-transformation-510302/secrets/intrepid-db-password/versions/1:access'});
  const encoded=result.data?.payload?.data;
  if(encoded)runtimePassword=Buffer.from(encoded,'base64').toString('utf8').trim();
 }catch{throw Error('Neither gcloud nor existing backend ADC can read the staging runtime secret.');}
}
if(!runtimePassword)throw Error('Staging runtime secret is empty.');
Object.assign(process.env,config,{PGPASSWORD:runtimePassword,GOOGLE_CLOUD_QUOTA_PROJECT:'ai-transformation-510302',PROMPTIFY_LOCAL_TIMING:'true'});
const server=await createServer({mode:'staging',server:{host:'127.0.0.1',port:5195,strictPort:true},plugins:[{name:'staging-review-banner',transformIndexHtml(html){return html.replace(/(<body[^>]*>)/,'$1<div style="background:#fff3bf;padding:10px;text-align:center" role="note">LOCAL APP · REAL STAGING BACKEND · SYNTHETIC QA CLASS ONLY</div>');}}]});
await server.listen();
console.log('Local app with real staging backend: http://127.0.0.1:5195 — no deployment; runtime password held only in memory.');
