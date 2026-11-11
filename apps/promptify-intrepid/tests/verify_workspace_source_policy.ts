import assert from 'node:assert/strict';
import {requireWorkspaceSource,requireWorkspaceFile,requireWorkspaceSheet,workspaceSourceId} from '../src/services/workspaceSourcePolicyService';
const policy=JSON.stringify({classA:{sheets:['sheetA'],folders:['folderA'],files:['fileA']},classB:{sheets:['sheetB']}});
for(const [kind,id] of [['sheets','sheetA'],['folders','folderA'],['files','fileA']] as const)await requireWorkspaceSource('classA',kind,id,policy);
for(const [cls,kind,id] of [['classA','sheets','sheetB'],['classB','files','fileA'],['unknown','sheets','sheetA'],['classA','files','sheetA']] as const)await assert.rejects(()=>requireWorkspaceSource(cls,kind,id,policy),(e:any)=>e.statusCode===403);
await assert.rejects(()=>requireWorkspaceSource('classA','sheets','sheetA',''),(e:any)=>e.statusCode===403);
for(const invalid of ['{','[]','null'])await assert.rejects(()=>requireWorkspaceSource('classA','sheets','sheetA',invalid),(e:any)=>e.statusCode===503);
// Files inside an approved folder count only when the (mocked) Drive listing of that class's folder contains them.
const listed:string[]=[];const lister=async(url:string)=>{listed.push(url);return {files:url.endsWith('/folderA')?[{id:'newFile'}]:[{id:'otherFile'}]};};
await requireWorkspaceFile('classA','fileA',lister,policy);assert.equal(listed.length,0,'ID-bound file needs no Drive listing');
await requireWorkspaceFile('classA','newFile',lister,policy);assert.deepEqual(listed,['https://drive.google.com/drive/folders/folderA']);
await assert.rejects(()=>requireWorkspaceFile('classA','otherFile',lister,policy),(e:any)=>e.statusCode===403,'file outside the approved folder');
await assert.rejects(()=>requireWorkspaceFile('classB','newFile',lister,policy),(e:any)=>e.statusCode===403,'another class cannot use classA folder');
await assert.rejects(()=>requireWorkspaceFile('classA','newFile',lister,'{'),(e:any)=>e.statusCode===503);
// Roster Sheets: by their own ID, or inside a folder approved for the class (Drive is asked, the ID is not trusted).
listed.length=0;
await requireWorkspaceSheet('classA','sheetA',lister,policy);assert.equal(listed.length,0,'ID-bound Sheet needs no Drive listing');
await requireWorkspaceSheet('classA','newFile',lister,policy);assert.deepEqual(listed,['https://drive.google.com/drive/folders/folderA']);
await assert.rejects(()=>requireWorkspaceSheet('classA','otherFile',lister,policy),(e:any)=>e.statusCode===403,'Sheet outside the approved folder');
await assert.rejects(()=>requireWorkspaceSheet('classB','newFile',lister,policy),(e:any)=>e.statusCode===403,'another class cannot use classA folder');
await assert.rejects(()=>requireWorkspaceSheet('classA','fileA',lister,policy),(e:any)=>e.statusCode===403,'an approved Drive file is not an approved roster Sheet');
// Admin input: links or bare IDs; anything else is refused.
assert.equal(workspaceSourceId('https://docs.google.com/spreadsheets/d/1AbC_d-9/edit#gid=0'),'1AbC_d-9');
assert.equal(workspaceSourceId('https://drive.google.com/drive/u/0/folders/Fold3r_x'),'Fold3r_x');
assert.equal(workspaceSourceId('https://drive.google.com/file/d/F1le/view'),'F1le');
assert.equal(workspaceSourceId(' bareId_1 '),'bareId_1');
for(const bad of ['https://evil.example/spreadsheets/d/x','a/b','',"x' OR 1=1"])assert.equal(workspaceSourceId(bad),null);
console.log('Workspace source bindings PASS: fail closed, class and source-kind isolation, files inside approved folders via Drive listing. No Google calls.');
