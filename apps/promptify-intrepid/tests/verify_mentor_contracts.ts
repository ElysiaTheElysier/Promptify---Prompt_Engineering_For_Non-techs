import {scaffoldSnippet} from '../src/services/promptLearningService';
import {codelabAvailable} from '../src/services/codelabLifecycleService';
import {entryReturnUrl} from '../src/services/entryNavigationService';
import assert from 'node:assert/strict';
import {bindPromptVariables} from '../src/services/promptVariableService';
import {parseWorkbook,WORKBOOK_TABS} from '../src/services/rosterWorkbookService';
import {CORE_SCAFFOLDS,scaffoldTag,recognizedScaffolds} from '../src/services/scaffoldRecognitionService';
const variables=[{name:'ticket',type:'text',sample:'42'},{name:'count',type:'integer',sample:'1'}];
assert.equal(bindPromptVariables('Handle {{ticket}} and {count}',variables,{ticket:'new ticket',count:'3'}).prompt,'Handle new ticket and 3');
assert.throws(()=>bindPromptVariables('{count}',variables,{count:'wrong'}),/numeric/);
assert.throws(()=>bindPromptVariables('{ticket}',variables,{surprise:'injected'}),/Unknown/);
assert.equal(bindPromptVariables('Keep {unknown}',variables).prompt,'Keep {unknown}');
const scaffolds=[{name:'Role',tag:'Role',active:true},{name:'Task',tag:'Task',active:true}];
assert.equal(recognizedScaffolds('The role of this task is described in prose',scaffolds).length,0);
assert.equal(recognizedScaffolds('[Role]: analyst\n[Task]: classify',scaffolds).length,2);
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
const unsafe=structuredClone(tabs);unsafe.SOPs[1][2]='javascript:alert(1)';assert.throws(()=>parseWorkbook(unsafe,'Tech'),/SOP reference/);
console.log('Mentor contracts PASS: variable binding/types, explicit scaffold detection, workbook headers/scope/timezone/URL/schedule. No live calls.');

assert.equal(new URL(entryReturnUrl('https://app.example','?classId=00000001-0000-4000-8000-000000000001&redirect=https://evil.example')).searchParams.get('classId'),'00000001-0000-4000-8000-000000000001');assert.equal(new URL(entryReturnUrl('https://app.example','?classId=bad')).origin,'https://app.example');

assert.equal(scaffoldTag({name:'Role',tag:'[Role]: act as analyst'}),'Role');
assert.equal(recognizedScaffolds(CORE_SCAFFOLDS.map(c=>'['+c.tag+']: example').join('\n'),CORE_SCAFFOLDS).length,5);

assert.equal(codelabAvailable('published',{state:'ACTIVE',awards:{accessTier:'ADVANCE Paid'}},Date.now(),'BASIC Free'),false);

assert.equal(scaffoldSnippet({name:'Role',tag:'[Role]: Use the facilitator-authored persona'},'en'),'[Role]: Use the facilitator-authored persona');
