import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),target=path.resolve(root,'outputs/rebuild-deploy');
if(!target.startsWith(path.resolve(root,'outputs')+path.sep))throw new Error('Invalid deployment target');
fs.mkdirSync(target,{recursive:true});
for(const dir of ['src','public','api'])fs.cpSync(path.join(root,dir),path.join(target,dir),{recursive:true});
for(const file of ['index.html','package.json','package-lock.json','tsconfig.json','tsconfig.node.json','vite.config.ts','tailwind.config.js','postcss.config.js','vercel.json'])if(fs.existsSync(file))fs.copyFileSync(file,path.join(target,file));
for(const name of fs.readdirSync(target))if(name.startsWith('.env'))throw new Error('Secret environment file found in deployment staging');
console.log('Production staging refreshed from src/public/api and build configuration. No environment secrets copied.');
