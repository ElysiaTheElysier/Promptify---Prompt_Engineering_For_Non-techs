import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function inventory(dir){return fs.readdirSync(dir,{recursive:true}).filter(f=>!/(^|[/\\])(node_modules|outputs|dist|\.git)([/\\]|$)/.test(f)&&!path.basename(f).startsWith('.env')&&fs.statSync(path.join(dir,f)).isFile()).map(f=>({path:path.join(dir,f).replaceAll('\\','/'),bytes:fs.statSync(path.join(dir,f)).size,sha256:hash(path.join(dir,f))}));}
const manifest=JSON.parse(fs.readFileSync('docs/separation/file-manifest.json','utf8'));
manifest.finalInventory=['apps/promptify-mvp','apps/promptify-intrepid'].flatMap(inventory);
manifest.actualRuntimeChanges=[];
for(const record of manifest.finalInventory.filter(r=>r.path.includes('/src/')||r.path.includes('/api/'))){const relative=record.path.replace(/^apps\/[^/]+\//,'');const original='outputs/separation-baseline/'+relative;if(fs.existsSync(original)&&hash(original)!==record.sha256)manifest.actualRuntimeChanges.push({file:record.path,original:relative});}
if(manifest.actualRuntimeChanges.some(r=>!r.file.endsWith('/src/main.tsx')&&!r.file.endsWith('/ProductionApp.tsx')))throw Error('Unexpected runtime business source change');
const dbBefore=JSON.parse(fs.readFileSync('outputs/separation-baseline/inventory.json')).filter(f=>f.path.startsWith('supabase/'));
for(const f of dbBefore)if(hash(f.path)!==f.sha256)throw Error('Database history modified: '+f.path);
manifest.databaseHistoryUnchanged=true;manifest.deletedSourceWithoutArchive=[];
for(const f of manifest.retired)if(!fs.existsSync('design-drafts/pre-separation/'+f))manifest.deletedSourceWithoutArchive.push(f);
if(manifest.deletedSourceWithoutArchive.length)throw Error('Missing preserved source');
fs.writeFileSync('docs/separation/file-manifest.json',JSON.stringify(manifest,null,2)+'\n');
const verification={apps:{},browser:JSON.parse(fs.readFileSync('docs/separation/browser-verification.json')).checks,actualRuntimeChanges:manifest.actualRuntimeChanges,databaseHistoryUnchanged:true,notVerified:['Authenticated live user flows','Vercel Preview/Production deployment and alias','Live DB/RLS/OAuth/roster/provider integrations','Maintenance generators/live tools (not executed)']};
for(const app of ['promptify-mvp','promptify-intrepid']){const results=JSON.parse(fs.readFileSync('apps/'+app+'/outputs/offline-test-results.json'));verification.apps[app]={tests:results.map(r=>({test:r.test,exit:r.exit,error:r.error})),pass:results.filter(r=>r.exit===0).length,total:results.length,failures:results.filter(r=>r.exit!==0).map(r=>({test:r.test,output:r.output.slice(-900)}))};}
fs.writeFileSync('docs/separation/verification-results.json',JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify({runtimeChanges:manifest.actualRuntimeChanges,dbUnchanged:true,sourcePreserved:true,tests:Object.fromEntries(Object.entries(verification.apps).map(([a,r])=>[a,r.pass+'/'+r.total]))},null,2));
