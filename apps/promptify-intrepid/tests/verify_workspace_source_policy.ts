import assert from 'node:assert/strict';
import {requireWorkspaceSource} from '../src/services/workspaceSourcePolicyService';
const policy=JSON.stringify({classA:{sheets:['sheetA'],folders:['folderA'],files:['fileA']},classB:{sheets:['sheetB']}});
for(const [kind,id] of [['sheets','sheetA'],['folders','folderA'],['files','fileA']] as const)assert.doesNotThrow(()=>requireWorkspaceSource('classA',kind,id,policy));
for(const [cls,kind,id] of [['classA','sheets','sheetB'],['classB','files','fileA'],['unknown','sheets','sheetA'],['classA','files','sheetA']] as const)assert.throws(()=>requireWorkspaceSource(cls,kind,id,policy),(e:any)=>e.statusCode===403);
assert.throws(()=>requireWorkspaceSource('classA','sheets','sheetA',''),(e:any)=>e.statusCode===403);
for(const invalid of ['{','[]','null'])assert.throws(()=>requireWorkspaceSource('classA','sheets','sheetA',invalid),(e:any)=>e.statusCode===503);
console.log('Workspace source bindings PASS: fail closed, class and source-kind isolation. No Google calls.');
