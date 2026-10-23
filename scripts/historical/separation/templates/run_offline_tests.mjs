import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'tests/offline-tests.json'),'utf8'));
const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|GEMINI|OPENAI|GOOGLE|STAGING_|ROSTER_WORKER/.test(key))delete env[key];
const results=[];
for(const name of config.tests){
 const file=path.join(root,'tests',name);if(!fs.existsSync(file))throw Error('Missing allowlisted test '+name);
 const args=name.endsWith('.ts')?[path.join(root,'node_modules/tsx/dist/cli.mjs'),file]:[file];
 const result=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:90000});
 results.push({test:name,exit:result.status,output:(result.stdout||'')+(result.stderr||''),error:result.error?.message});
 console.log(`${path.basename(root)} ${name}: ${result.status===0?'PASS':'FAIL'}`);if(result.status!==0)console.log(results.at(-1).output.slice(-2000));
}
fs.mkdirSync(path.join(root,'outputs'),{recursive:true});fs.writeFileSync(path.join(root,'outputs/offline-test-results.json'),JSON.stringify(results,null,2));
const failed=results.filter(r=>r.exit!==0);console.log(`${results.length-failed.length}/${results.length} passed; live tests excluded by allowlist.`);if(failed.length)process.exitCode=1;
