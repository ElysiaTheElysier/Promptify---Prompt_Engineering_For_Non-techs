import {scaffoldSnippet} from '../src/services/promptLearningService';
import {codelabAvailable} from '../src/services/codelabLifecycleService';
import {entryReturnUrl} from '../src/services/entryNavigationService';
import assert from 'node:assert/strict';
import {bindPromptVariables} from '../src/services/promptVariableService';
import {parseWorkbook,syncTime,WORKBOOK_TABS} from '../src/services/rosterWorkbookService';
import {CORE_SCAFFOLDS,scaffoldTag,recognizedScaffolds} from '../src/services/scaffoldRecognitionService';
const variables=[{name:'ticket',type:'text',sample:'42'},{name:'count',type:'integer',sample:'1'}];
assert.equal(bindPromptVariables('Handle {{ticket}} and {count}',variables,{ticket:'new ticket',count:'3'}).prompt,'Handle new ticket and 3');
assert.throws(()=>bindPromptVariables('{count}',variables,{count:'wrong'}),/numeric/);
assert.throws(()=>bindPromptVariables('{ticket}',variables,{surprise:'injected'}),/Unknown/);
assert.equal(bindPromptVariables('Keep {unknown}',variables).prompt,'Keep {unknown}');
const scaffolds=[{name:'Role',tag:'Role',active:true},{name:'Task',tag:'Task',active:true}];
assert.equal(recognizedScaffolds('The role of this task is described in prose',scaffolds).length,0);
assert.equal(recognizedScaffolds('[Role]: analyst\n[Task]: classify',scaffolds).length,2);
assert.equal(recognizedScaffolds('[Role]: analyst. [Task]: classify. Context: inline prose',scaffolds).length,2,'bracket tags count on one line; bare inline words do not');
const tabs=Object.fromEntries(Object.entries(WORKBOOK_TABS).map(([name,headers])=>[name,[[...headers]]]));
tabs.Users.push(['one@example.test','One User','Tech','VN','E1','Office']);tabs.Users.push(['two@example.test','Two User','Other','VN','','']);
tabs.Department.push(['Tech'],['Other']);tabs.Sync.push(['2027-01-01T08:00:00+07:00']);tabs.SOPs.push(['Tech SOP','Tech','https://example.test/tech'],['Other SOP','Other','https://example.test/other']);tabs['Main PIC'].push(['Tech Lead','lead@example.test','Tech']);
const bundle=parseWorkbook(tabs,'Tech',Date.parse('2026-10-16'));
const emptyUsers=structuredClone(tabs);emptyUsers.Users=[emptyUsers.Users[0]];
assert.equal(parseWorkbook(emptyUsers,'Tech').rows.length,0,'complete six-tab workbook permits an authoritative empty department');
const truncated=structuredClone(tabs);truncated.Users=Array.from({length:502},()=>[...tabs.Users[0]]);
assert.throws(()=>parseWorkbook(truncated,'Tech'),/header changed/,'overflow sentinel is rejected before any reconciliation');
assert.equal(bundle.rows.length,1);assert.equal(bundle.rows[0].employeeId,'E1');assert.equal(bundle.sops.length,1);assert.equal(bundle.nextSync,'2027-01-01T01:00:00.000Z');
assert.equal(parseWorkbook(tabs,'Tech',Date.parse('2028-01-01')).nextSync,'infinity');
const changed=structuredClone(tabs);changed.Users[0][0]='Renamed';assert.throws(()=>parseWorkbook(changed,'Tech'),/header changed/);
// Sync tab: empty = every 15 minutes; friendly formats are Vietnam time; a Sheets date serial is read as Vietnam wall-clock time.
const noSync=structuredClone(tabs);noSync.Sync=[noSync.Sync[0]];assert.equal(parseWorkbook(noSync,'Tech',Date.parse('2026-11-11T00:00:00Z')).nextSync,'2026-11-11T00:15:00.000Z');
for(const v of ['12/11/2026 08:00','2026-11-12 08:00','2026-11-12T08:00:00+07:00','2026-11-12T01:00:00Z','46338.333333333336'])assert.equal(syncTime(v),'2026-11-12T01:00:00.000Z',v);
assert.equal(syncTime('2026-11-12T08:00:00'),'2026-11-12T01:00:00.000Z');assert.equal(syncTime('12/11/2026'),'2026-11-11T17:00:00.000Z');
for(const v of ['31/02/2026 08:00','12/11/2026 25:00','2026-13-01 08:00','next monday'])assert.throws(()=>syncTime(v),/12\/11\/2026 08:00/,v);
const unsafe=structuredClone(tabs);unsafe.SOPs[1][2]='javascript:alert(1)';assert.throws(()=>parseWorkbook(unsafe,'Tech'),/SOP reference/);
console.log('Mentor contracts PASS: variable binding/types, explicit scaffold detection, workbook headers/scope/timezone/URL/schedule. No live calls.');

assert.equal(new URL(entryReturnUrl('https://app.example','?classId=00000001-0000-4000-8000-000000000001&redirect=https://evil.example')).searchParams.get('classId'),'00000001-0000-4000-8000-000000000001');assert.equal(new URL(entryReturnUrl('https://app.example','?classId=bad')).origin,'https://app.example');

assert.equal(scaffoldTag({name:'Role',tag:'[Role]: act as analyst'}),'Role');
assert.equal(recognizedScaffolds(CORE_SCAFFOLDS.map(c=>'['+c.tag+']: example').join('\n'),CORE_SCAFFOLDS).length,5);

assert.equal(codelabAvailable('published',{state:'ACTIVE',awards:{accessTier:'ADVANCE Paid'}},Date.now(),'BASIC Free'),false);

assert.equal(scaffoldSnippet({name:'Role',tag:'[Role]: Use the facilitator-authored persona'},'en'),'[Role]: Use the facilitator-authored persona');
// The roster toast names the broken tab instead of the generic 422 text.
const {productErrorText}=await import('../src/services/productI18nService');
assert.match(productErrorText(422,'vi','Unknown user department.'),/tab Users/);
assert.match(productErrorText(422,'vi','Sync tab: "abc" is not a valid time. Write it like 12/11/2026 08:00 (Vietnam time), or leave the Sync tab empty to sync every 15 minutes.'),/Tab Sync: "abc"/);
assert.equal(productErrorText(422,'vi','Something else'),'Kiểm tra các trường bắt buộc rồi thử lại.');
assert.match(productErrorText(422,'vi','SOP must contain searchable text within 100000 characters and 60 chunks.'),/quá dài/);
assert.match(productErrorText(422,'vi','This document contains text that tries to give the AI instructions (override) in part 3. Remove that text and upload the document again.'),/ra lệnh cho AI \(override\) ở phần 3/);
// Formatted template: guide tab + title/instruction rows above each header; the parser still reads it (rows above the header are ignored).
const {buildRosterTemplate,TEMPLATE_TABS}=await import('../src/services/rosterTemplateService');
assert.deepEqual(TEMPLATE_TABS,WORKBOOK_TABS,'template tabs and headers are the parser contract');
const ExcelJS=(await import('exceljs')).default;
for(const vi of [true,false]){
 const book=buildRosterTemplate(ExcelJS,'Tech',vi),grid=(name:string)=>{const out:any[][]=[];book.getWorksheet(name)!.eachRow({includeEmpty:true},(row,n)=>{out[n-1]=Array.from({length:6},(_,i)=>{const v=row.getCell(i+1).value;return v==null?'':String(v);});});while(out.length&&out[out.length-1].every(v=>!v))out.pop();return out;};
 assert.equal(book.worksheets[0].name,vi?'Hướng dẫn':'Guide');
 const filled=Object.fromEntries(Object.keys(WORKBOOK_TABS).map(n=>[n,grid(n)]));
 assert.equal(filled.Department[3][0],'Tech','class department prefilled under the header');
 filled.Users.push(['one@example.test','One User','Tech','VN','E1','']);
 const parsed=parseWorkbook(filled,'Tech',Date.parse('2026-11-11T00:00:00Z'));
 assert.equal(parsed.rows.length,1);assert.equal(parsed.nextSync,'2026-11-11T00:15:00.000Z');
}
const bannerOnly=structuredClone(tabs);bannerOnly.Users=[['USERS'],['help'],['x'],['y'],['z'],...tabs.Users];
assert.throws(()=>parseWorkbook(bannerOnly,'Tech'),/header changed/,'header is looked for in the first 5 rows only');
