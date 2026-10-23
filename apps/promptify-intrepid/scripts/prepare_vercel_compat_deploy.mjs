import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundleVercelApi} from './bundle_vercel_api.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const name=process.argv[2]||'vercel-compat-deploy';
if(!/^vercel-compat-[a-z0-9-]+$/.test(name))throw Error('Invalid staging directory name');
const target=path.join(root,'outputs',name);
// Fresh staging only, so an old .env or obsolete function can never be uploaded.
if(fs.existsSync(target))throw Error('Staging already exists; select a fresh directory before regenerating');
fs.mkdirSync(target,{recursive:true});
for(const dir of ['src','public'])fs.cpSync(path.join(root,dir),path.join(target,dir),{recursive:true});
fs.mkdirSync(path.join(target,'api'));
for(const file of ['product.ts','generate.ts','evaluate.ts','roster-worker.ts'])fs.copyFileSync(path.join(root,'api',file),path.join(target,'api',file));
for(const file of ['index.html','package.json','package-lock.json','tsconfig.json','tsconfig.node.json','vite.config.ts','tailwind.config.js','tailwind-safelist.json','postcss.config.js','vercel.json'])if(fs.existsSync(path.join(root,file)))fs.copyFileSync(path.join(root,file),path.join(target,file));
for(const [source,destination] of [['identity.ts.txt','firebaseIdentityService.ts'],['database.ts.txt','cloudDatabaseService.ts']])fs.copyFileSync(path.join(root,'scripts/vercel-compat',source),path.join(target,'src/services',destination));
// Supabase validates upload size at ingestion; its signing API accepts only upsert.
const serverPath=path.join(target,'src/services/productionServerService.ts');
const server=fs.readFileSync(serverPath,'utf8');
const upload="createSignedUploadUrl(path,{upsert:false,size:body.size})";
if(!server.includes(upload))throw Error('Upload compatibility target changed');
fs.writeFileSync(serverPath,server.replace(upload,"createSignedUploadUrl(path,{upsert:false})"));
await bundleVercelApi(target);
fs.writeFileSync(path.join(target,'.vercelignore'),'node_modules\n.env*\noutputs\ntests\n');
fs.writeFileSync(path.join(target,'deployment-mode.json'),JSON.stringify({mode:'temporary-vercel-supabase',source:'apps/promptify-intrepid',createdAt:new Date().toISOString()},null,2));
console.log('Prepared isolated Intrepid Vercel compatibility package: '+target);
