import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Repository tooling only; each graph is resolved with that app's own installed tool.
for(const app of ['promptify-mvp','promptify-intrepid']){
 const cwd=path.join(root,'apps',app);fs.mkdirSync(path.join(cwd,'outputs'),{recursive:true});
 const result=spawnSync(process.execPath,[path.join(cwd,'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs'),'src','api','--config','.dependency-cruiser.cjs','--output-type','json','--output-to','outputs/dependencies.json'],{cwd,encoding:'utf8'});
 if(result.status!==0){console.error(result.stdout+result.stderr);process.exitCode=1;}
 else{const graph=JSON.parse(fs.readFileSync(path.join(cwd,'outputs/dependencies.json'),'utf8'));console.log(app,graph.modules.length,'modules; errors',graph.summary.error,'warnings',graph.summary.warn);}
}
