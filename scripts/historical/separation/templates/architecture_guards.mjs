import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectArchitecture} from '../scripts/check_architecture.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'promptify-boundary-'));
fs.mkdirSync(path.join(root,'src'));fs.writeFileSync(path.join(root,'tsconfig.json'),JSON.stringify({include:['src'],compilerOptions:{}}));fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({dependencies:{react:'19.0.0'}}));
const probe=path.join(root,'src/probe.ts');
for(const text of ["import x from '../../other-app/src/x';", "export * from '../../other-app/src/x';", "const load=()=>import('../../other-app/src/x');", "const load=()=>import(name);", "const file='../../other-app/src/private.json';", "import x from 'promptify-mvp';", "import x from '#other-app';"]){fs.writeFileSync(probe,text);assert.ok(inspectArchitecture(root).length,text);}
fs.writeFileSync(probe,"import React from 'react'; const load=()=>import('react');");assert.deepEqual(inspectArchitecture(root),[]);
fs.writeFileSync(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{paths:{'@other/*':['../other-app/src/*']}}}));assert.ok(inspectArchitecture(root).length);
fs.writeFileSync(path.join(root,'tsconfig.json'),'{}');fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({dependencies:{react:'19.0.0',other:'file:../other'}}));assert.ok(inspectArchitecture(root).length);
fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({dependencies:{react:'19.0.0'}}));fs.writeFileSync(path.join(root,'vite.config.ts'),"export default {resolve:{alias:{'@hidden':'../other-app/src'}}};");assert.ok(inspectArchitecture(root).length);
fs.writeFileSync(path.join(root,'vite.config.ts'),"export default {resolve:{alias:{'@hidden':path.resolve(__dirname,'..','other-app','src')}}};");assert.ok(inspectArchitecture(root).length);
// Temporary fixture is left to OS cleanup; no recursive deletion of computed paths.
console.log('Architecture negative tests PASS: imports, exports, dynamic imports, file refs, aliases, internal packages.');
