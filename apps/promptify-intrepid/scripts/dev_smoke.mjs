import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const name=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).name;
const port=name==='promptify-mvp'?5191:5192,env={...process.env};
for(const key of Object.keys(env))if(/SUPABASE|GEMINI|OPENAI|GOOGLE|STAGING_|ROSTER_WORKER/.test(key))delete env[key];
let logs='';const child=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,env,stdio:['ignore','pipe','pipe'],windowsHide:true});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
try{
 let ready=false;for(let n=0;n<80;n++){try{const r=await fetch(`http://127.0.0.1:${port}/`);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,'Dev server did not start: '+logs);
 const origin=`http://127.0.0.1:${port}`;
 for(const url of ['/', '/production?ui=01','/src/main.tsx','/brand/promptify-mark.png']){const r=await fetch(origin+url);assert.equal(r.status,200,url);}
 for(const endpoint of ['generate','evaluate']){const r=await fetch(origin+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401,endpoint);assert.ok((await r.json()).error);}
 if(name==='promptify-intrepid'){const r=await fetch(origin+'/api/product',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'snapshot'})});assert.equal(r.status,401);const review=await fetch(origin+'/rebuild');assert.equal(review.status,200);}
 console.log(name+' dev/API smoke PASS: assets/entry/routes; unauthenticated requests rejected locally. No live provider/DB calls.');
}finally{child.kill();}
