import assert from 'node:assert/strict';
import {requireWorkspaceSource,requireWorkspaceFile} from '../src/services/workspaceSourcePolicyService';
const policy=JSON.stringify({classA:{sheets:['sheetA'],folders:['folderA'],files:['fileA']},classB:{sheets:['sheetB']}});
for(const [kind,id] of [['sheets','sheetA'],['folders','folderA'],['files','fileA']] as const)assert.doesNotThrow(()=>requireWorkspaceSource('classA',kind,id,policy));
for(const [cls,kind,id] of [['classA','sheets','sheetB'],['classB','files','fileA'],['unknown','sheets','sheetA'],['classA','files','sheetA']] as const)assert.throws(()=>requireWorkspaceSource(cls,kind,id,policy),(e:any)=>e.statusCode===403);
assert.throws(()=>requireWorkspaceSource('classA','sheets','sheetA',''),(e:any)=>e.statusCode===403);
for(const invalid of ['{','[]','null'])assert.throws(()=>requireWorkspaceSource('classA','sheets','sheetA',invalid),(e:any)=>e.statusCode===503);
// Files inside an approved folder count only when the (mocked) Drive listing of that class's folder contains them.
const listed:string[]=[];const lister=async(url:string)=>{listed.push(url);return {files:url.endsWith('/folderA')?[{id:'newFile'}]:[{id:'otherFile'}]};};
await requireWorkspaceFile('classA','fileA',lister,policy);assert.equal(listed.length,0,'ID-bound file needs no Drive listing');
await requireWorkspaceFile('classA','newFile',lister,policy);assert.deepEqual(listed,['https://drive.google.com/drive/folders/folderA']);
await assert.rejects(()=>requireWorkspaceFile('classA','otherFile',lister,policy),(e:any)=>e.statusCode===403,'file outside the approved folder');
await assert.rejects(()=>requireWorkspaceFile('classB','newFile',lister,policy),(e:any)=>e.statusCode===403,'another class cannot use classA folder');
await assert.rejects(()=>requireWorkspaceFile('classA','newFile',lister,'{'),(e:any)=>e.statusCode===503);
console.log('Workspace source bindings PASS: fail closed, class and source-kind isolation, files inside approved folders via Drive listing. No Google calls.');
