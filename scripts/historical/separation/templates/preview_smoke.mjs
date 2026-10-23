import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const name=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).name;
const port=name==='promptify-mvp'?5201:5202,origin='http://127.0.0.1:'+port;
const child=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,windowsHide:true,stdio:'ignore'});
try{let html;for(let n=0;n<80;n++){try{const r=await fetch(origin);if(r.ok){html=await r.text();break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(html,'Preview failed to start');const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(m=>m[1]);assert.ok(assets.some(a=>a.endsWith('.js')));for(const asset of assets)assert.equal((await fetch(origin+asset)).status,200);assert.equal((await fetch(origin+'/production?ui=01')).status,200);console.log(name+' production preview PASS: HTML, compiled assets and production URL.');}finally{child.kill();}
