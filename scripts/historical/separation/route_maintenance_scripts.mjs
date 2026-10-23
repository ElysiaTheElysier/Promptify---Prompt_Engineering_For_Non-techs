// One-time maintenance-script migration. Preserve originals; establish explicit app cwd.
import fs from 'node:fs';
import path from 'node:path';
const archive='scripts/historical/pre-separation';fs.mkdirSync(archive,{recursive:true});
const map={};
const mvp=new Set(['generate-curriculum-seed.mjs','prepare_rebuild_staging.mjs','prepare_rebuild_workshop_upgrade.mjs','build_promptify_pm_docs.py']);
for(const name of fs.readdirSync('outputs/separation-baseline/scripts')){
 const original='outputs/separation-baseline/scripts/'+name;if(!fs.statSync(original).isFile())continue;
 const code=fs.readFileSync(original,'utf8');
 if(!/(?:src\/|api\/|public\/|\.\.\/src\/|supabase\/)/.test(code)&&!/^compile_production|^production_source_compiler|^generate_public_basic/.test(name))continue;
 if(name==='audit_ownership_imports.mjs'||name==='run_offline_checks.py')continue;
 const app=mvp.has(name)?'promptify-mvp':'promptify-intrepid';
 const target='apps/'+app+'/scripts/'+name;fs.copyFileSync(original,archive+'/'+name);fs.copyFileSync(original,target);map[name]={app,path:target,original:archive+'/'+name};
 // Original scripts may write source, alter databases or deploy: root launchers are instructions only.
 const message=`Script moved to ${target}. Run it explicitly from apps/${app} after reviewing its effects. Root source no longer exists.`;
 if(/\.(?:ts|mjs|cjs)$/.test(name))fs.writeFileSync('scripts/'+name,`// Original preserved in historical/pre-separation/${name}\nthrow new Error(${JSON.stringify(message)});\n`);
 else if(name.endsWith('.py'))fs.writeFileSync('scripts/'+name,`# Original preserved in historical/pre-separation/${name}\nraise SystemExit(${JSON.stringify(message)})\n`);
 // Script-local root remains the app. Root database files are immutable fixtures, not live schema sources.
 let relocated=code.replace(/(['"`])supabase\//g,'$1tests/fixtures/supabase/');
 // Docs/design inputs are repository-owned read-only resources; runtime source remains strictly local.
 relocated=relocated.replace(/(['"`])docs\//g,'$1../../docs/').replace(/(['"`])design-drafts\//g,'$1../../design-drafts/');
 fs.writeFileSync(target,relocated);
}
fs.mkdirSync('apps/promptify-intrepid/curriculum-specs',{recursive:true});fs.copyFileSync('curriculum-specs/public-basic.json','apps/promptify-intrepid/curriculum-specs/public-basic.json');
fs.writeFileSync('docs/separation/script-ownership.json',JSON.stringify(map,null,2)+'\n');
console.log('Explicit maintenance ownership:',Object.keys(map).length,'scripts. Originals retained. Not executed.');
