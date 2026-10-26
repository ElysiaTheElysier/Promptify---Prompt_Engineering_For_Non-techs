import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
// Lab (ui=05) -> SOP contribution (ui=13) -> back must land on the same lesson with the draft intact.
const source=fs.readFileSync('src/components/rebuild/ProductionApp.tsx','utf8'),sop=fs.readFileSync('src/components/rebuild/ProductionSopSource.tsx','utf8');
const ast=ts.createSourceFile('ProductionApp.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let navigateDecl,popstateEffect,sopFromDecl,sopLabelDecl;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='navigate')navigateDecl=node;if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='sopFrom')sopFromDecl=node.parent;if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='sopBackLabel')sopLabelDecl=node;if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0].getText(ast).includes("'popstate'"))popstateEffect=node.arguments[0];ts.forEachChild(node,visit);}visit(ast);
assert.ok(navigateDecl&&popstateEffect&&sopFromDecl&&sopLabelDecl,'navigate, popstate effect and SOP back target exist');
const code=ts.transpileModule('const '+navigateDecl.getText(ast)+';\nglobalThis.navigate=navigate;globalThis.popEffect='+popstateEffect.getText(ast)+';globalThis.sopBack=(currentUi,lesson)=>{const pair=(en,vi)=>vi,language="vi",titlePairs=[];titlePairs[9]=["Workshop control","Điều hành workshop"];'+sopFromDecl.getText(ast).replace(/:number\|undefined/,'')+';const '+sopLabelDecl.getText(ast)+';return {from:sopFrom,lab:sopFromLab,label:sopBackLabel};};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
// In-memory browser history.
const entries=[{state:null,url:'https://example.com/production?ui=05&classId=c1&lessonId=L1'}];let index=0,handler;
const location={get href(){return entries[index].url;},get search(){return new URL(entries[index].url).search;}};
const history={get state(){return entries[index].state;},pushState(state,_t,url){entries.splice(index+1);entries.push({state,url:String(url)});index++;},back(){index--;handler?.();}};
const app={ui:5,lessonId:'L1',prompt:'unsaved draft',attempt:'a1'};
const context={URL,URLSearchParams,location,history,window:{scrollTo(){},addEventListener:(_e,fn)=>handler=fn,removeEventListener(){}},ui:5,lessonId:'L1',setError(){},setNotice(){},setSourceId(){},setUi:v=>app.ui=v,updateLessonId:v=>app.lessonId=v,setSelectedAttempt:v=>app.attempt=v,setPrompt:v=>app.prompt=v};
vm.runInNewContext(code,context);context.popEffect();
context.navigate(13);
assert.equal(new URL(location.href).searchParams.get('ui'),'13');assert.equal(new URL(location.href).searchParams.get('lessonId'),'L1');
assert.deepEqual({...context.sopBack(13,{title:'Email'})},{from:5,lab:true,label:'Về bài lab: Email'},'SOP opened from the lab names and returns to that lab');
// Both the SOP back arrow and the learning tab go back to that lab entry instead of the hub.
assert.ok(source.includes('onBack={sopFrom===undefined?undefined:()=>history.back()} backLabel={sopBackLabel}'),'SOP back arrow returns to its entry screen');
assert.ok(source.includes('onNavigate={id=>sopFromLab&&id===4?history.back():navigate(id)}'),'learning tab returns to the lab');
assert.ok(sop.includes("{backLabel||copy("),'breadcrumb names the back destination');
history.back();
assert.deepEqual(app,{ui:5,lessonId:'L1',prompt:'unsaved draft',attempt:'a1'},'back returns to the same lab keeping draft and attempt');
// Popping to a different lesson still resets lesson-scoped state.
entries.push({state:null,url:'https://example.com/production?ui=05&classId=c1&lessonId=L2'});index=entries.length-1;handler();
assert.deepEqual(app,{ui:5,lessonId:'L2',prompt:'',attempt:undefined},'different lesson clears draft');
// Direct entry to ui=13 has no lab origin, so the old /?ui=04 link behaviour stays.
entries.push({state:null,url:'https://example.com/production?ui=13'});index=entries.length-1;assert.deepEqual({...context.sopBack(13)},{from:undefined,lab:false,label:undefined},'direct ui=13 keeps hub behaviour');
// Opened from the hub (or another screen) it returns there and says so.
entries.push({state:{from:4},url:'https://example.com/production?ui=13'});index=entries.length-1;assert.deepEqual({...context.sopBack(13)},{from:4,lab:false,label:'Về trung tâm học tập'});
entries.at(-1).state={from:9};assert.deepEqual({...context.sopBack(13)},{from:9,lab:false,label:'Về Điều hành workshop'});
assert.ok(/<a href="\/\?ui=04" aria-label=\{backLabel\|\|[^}]*\} onClick=\{onBack&&\(e=>\{e\.preventDefault\(\);onBack\(\);\}\)\}/.test(sop),'SOP back arrow uses onBack only when provided');
console.log('SOP return navigation PASS: SOP contribution returns to and names its entry screen (lab keeps lesson and draft, hub, other screens); direct entry unchanged.');
