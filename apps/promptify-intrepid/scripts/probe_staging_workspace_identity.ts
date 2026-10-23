import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {OAuth2Client,Impersonated} from 'google-auth-library';
if(!process.argv.includes('--staging-readonly'))throw Error('Explicit read-only flag required');
const raw=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia'],{encoding:'utf8',windowsHide:true});
if(raw.status)throw Error('Operator session unavailable');
const source=new OAuth2Client();source.setCredentials({access_token:raw.stdout.trim()});
const target='promptify-api@ai-transformation-510302.iam.gserviceaccount.com',sheet='1NUv61Mn5TN8kLWWblGQgLD3pV8gmC7JEDP7Ijs0yLCY',results:any[]=[];
for(const [name,scope,url] of [
 ['sheet-headers','https://www.googleapis.com/auth/spreadsheets.readonly',`https://sheets.googleapis.com/v4/spreadsheets/${sheet}/values/${encodeURIComponent("'Table'!A1:AF1")}`],
 ['drive-source-metadata','https://www.googleapis.com/auth/drive.readonly',`https://www.googleapis.com/drive/v3/files/${sheet}?fields=id,mimeType&supportsAllDrives=true`],
]){
 try{
 const client=new Impersonated({sourceClient:source as any,targetPrincipal:target,targetScopes:[scope],lifetime:600});
 const token=await client.getAccessToken();if(!token.token)throw Error('Existing Workspace identity token unavailable');
 const response=await fetch(url,{headers:{Authorization:'Bearer '+token.token},signal:AbortSignal.timeout(15000)}),data:any=await response.json();
 results.push({name,status:response.status,ok:response.ok,...(response.ok?name==='sheet-headers'?{headerColumns:data.values?.[0]?.length}:{mimeType:data.mimeType}:{errorReason:data.error?.status})});
 }catch{results.push({name,ok:false,errorReason:'Operator-to-service-account impersonation not available; this does not establish runtime self-impersonation permissions.'});break;}
}
fs.writeFileSync('outputs/staging-release-2026-10-20-access-roster/workspace-identity-probe.json',JSON.stringify({at:new Date().toISOString(),identity:target,scope:'Existing IAM only; keyless read-only Sheet headers and supplied Drive file metadata. Operator credential source; runtime self-impersonation remains separate verification. No source changes or SQL import.',results},null,2));
console.log(JSON.stringify(results));if(results.some(r=>!r.ok))process.exitCode=1;
