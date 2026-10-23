import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
const source=fs.readFileSync('src/components/rebuild/ProductionApp.tsx','utf8');
// Extract just the callback under test, independent of adjacent effects or navigation.
const ast=ts.createSourceFile('ProductionApp.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let refreshDeclaration;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='refresh')refreshDeclaration=node;ts.forEachChild(node,visit);}visit(ast);
assert.ok(refreshDeclaration,'refresh callback exists');
const code=ts.transpileModule('const '+refreshDeclaration.getText(ast)+';\nglobalThis.refresh=refresh;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const queued=[], snapshots=[],errors=[];const context={useCallback:f=>f,pendingLoad:{current:undefined},latestLoad:{current:0},requestedClass:{current:'A'},initializedProfile:{current:undefined},loadProduct:classId=>new Promise((resolve,reject)=>queued.push({classId,resolve,reject})),setSnapshot:s=>snapshots.push(s),setClassId:()=>{},setFullName:()=>{},setLoadError:e=>errors.push(e),setUi:()=>{},ProductRequestError:class extends Error{}};vm.runInNewContext(code,context);
const a=context.refresh('A');await context.refresh('A');assert.equal(queued.length,1,'poll cannot invalidate pending same-class response');queued[0].resolve({selectedClass:{id:'A'},profile:{id:'u',full_name:'Name'}});await a;assert.equal(snapshots.length,1);
const a2=context.refresh('A');context.requestedClass.current='B';const b=context.refresh('B');queued[1].resolve({selectedClass:{id:'A'},profile:{id:'u'}});await a2;assert.equal(snapshots.length,1,'stale class response ignored');assert.equal(context.pendingLoad.current.classId,'B','stale completion cannot clear active new class');queued[2].resolve({selectedClass:{id:'B'},profile:{id:'u'}});await b;assert.equal(snapshots.at(-1).selectedClass.id,'B');assert.equal(context.pendingLoad.current,undefined);
const failed=context.refresh('B');queued[3].reject(Error('Network unavailable'));await failed;assert.equal(errors.at(-1),'Network unavailable');const retry=context.refresh('B');assert.equal(queued.length,5);queued[4].resolve({selectedClass:{id:'B'},profile:{id:'u'}});await retry;
assert.ok(source.includes('{loadError?<><p role="alert">{loadError}</p>'),'class failure exposes retry instead of endless loading');console.log('Class loading regression PASS: slow poll, rapid switch, stale completion, failure and retry.');
