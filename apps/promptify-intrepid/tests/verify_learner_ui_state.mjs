import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('src/components/rebuild/ProductionWorkspaceV7.tsx','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let states=[],cursor=0,download,execution,action,language,copied;
const defaults={temperature:.3,topP:.95,maxOutputTokens:4096,stopSequences:[],searchGrounding:false,personalInstruction:''};
const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useRef:()=>({current:null}),lazy:()=>'LazySlidesViewer',Suspense:'Suspense'};
const recognition={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/scaffoldRecognitionService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:recognition,exports:recognition.exports});
const learning={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/promptLearningService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:learning,exports:learning.exports,require:()=>recognition.exports});
const settingsService={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/learnerSettingsService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:settingsService,exports:settingsService.exports});
const module={exports:{}};
const require=name=>{
 if(name.includes('promptLearningService'))return learning.exports;
 if(name.includes('scaffoldRecognitionService'))return recognition.exports;
 if(name==='react')return {...React,default:React};
 if(name.includes('productI18nService'))return {useProductLanguage:()=> 'en',setProductLanguage:value=>{language=value;}};
 if(name.includes('learnerSettingsService'))return settingsService.exports;
 if(name.includes('learnerContentLanguageService'))return {authoredLessonText:text=>text};
 if(name.includes('piiGuardService'))return {scrubPrompt:text=>text};
 // Safeguard banner/gating has its own SQL-backed test (verify_learner_safeguards); off here like the default flags.
 if(name.includes('LearnerSafeguards'))return {default:()=>null,learnerRunBlocked:()=>false};
 return new Proxy({}, {get:(_,key)=>String(key)});
};
vm.runInNewContext(compiled,{module,exports:module.exports,require,Blob,URL:{createObjectURL:blob=>{download=blob;return 'blob:test';},revokeObjectURL:()=>{}},document:{createElement:()=>({click(){}})},setTimeout:()=>{},requestAnimationFrame:callback=>callback(),crypto:{randomUUID:()=> 'test'},navigator:{clipboard:{writeText:async value=>{copied=value;}}}});
const attempt={id:'a1',lesson_ref_id:'l1',attempt_number:1,prompt_text:'original',ai_output:'result',model:'model',latency_ms:1000,evaluation_json:{total:9},settings:{...defaults,temperature:.8,maxOutputTokens:2048,stopSequences:['DONE']},contextIds:['private-old']};
let prompt='edited';
const props={snapshot:{profile:{role:'learner'},selectedClass:{id:'c1',department:'Tech'},attempts:[attempt],sops:[],controls:{state:'active'},learnerContexts:[],promptLibrary:[]},lesson:{id:'l1',title:'Task',lesson_key:'B1',scenario:'Exercise',task_goal:'Goal'},get prompt(){return prompt;},setPrompt:value=>{prompt=value;},promptRef:{current:null},insert:()=>{},run:(settings,contextIds)=>{execution={settings,contextIds};},busy:false,attempt,scoreCard:()=>null,unlock:()=>{},onAction:async(name,payload)=>{action={name,payload};},navigate:()=>{},drawer:false,setDrawer:()=>{},query:'',setQuery:()=>{},results:[],search:async()=>{},searching:false,searchError:'',signals:[],draftStatus:'saved',resolveDraft:async()=>{}};
const render=()=>{cursor=0;return module.exports.default(props);};
// ShellHeader carries the workspace header actions in props, so walk those slots too.
const all=node=>{if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(all);return [node,...all(node.props?.children),...all(node.props?.heading),...all(node.props?.actions)];};
const text=node=>{if(Array.isArray(node))return node.map(text).join('');if(node===null||node===undefined||typeof node==='boolean')return '';if(typeof node==='object')return text(node.props?.children);return String(node);};
let tree=render();
const stop=all(tree).find(n=>n.type==='input'&&n.props.placeholder==='END, STOP');
stop.props.onChange({target:{value:'DONE,'}});
tree=render();
assert.equal(all(tree).find(n=>n.type==='input'&&n.props.placeholder==='END, STOP').props.value,'DONE,','comma survives rerender');
all(tree).find(n=>n.type==='input'&&n.props.placeholder==='END, STOP').props.onChange({target:{value:'DONE, STOP'}});
tree=render();
all(tree).find(n=>n.type==='button'&&text(n)==='Save to library').props.onClick();
tree=render();
assert.ok(text(tree).includes('Not evaluated'),'edited prompt cannot inherit old pass badge');
all(tree).find(n=>n.type==='button'&&text(n)==='Download template').props.onClick();
let exported=JSON.parse(await download.text());
assert.equal(exported.score,null);
assert.equal(exported.parameters.temperature,.8);
assert.equal(exported.parameters.maxOutputTokens,2048);
assert.deepEqual(exported.parameters.stopSequences,['DONE','STOP']);
prompt='original';tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='Download template')?.props.onClick();
// Re-open after download closes the dialog.
all(tree).find(n=>n.type==='button'&&text(n)==='Save to library').props.onClick();tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='Download template').props.onClick();
exported=JSON.parse(await download.text());assert.equal(exported.score,null,'changed generation settings cannot inherit a previous score');
tree=render();all(tree).find(n=>n.type==='button'&&n.props['aria-pressed']===true&&text(n).startsWith('V1')).props.onClick();tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='Save to library').props.onClick();tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='Download template').props.onClick();exported=JSON.parse(await download.text());assert.equal(exported.score,9,'restoring the saved prompt/settings/context restores its score');
tree=render();assert.equal(all(tree).some(n=>typeof n.props?.onUse==='function'),false,'library is closed by default');all(tree).find(n=>n.type==='button'&&text(n)==='Prompt library').props.onClick();tree=render();all(tree).find(n=>typeof n.props?.onUse==='function').props.onUse({prompt:'template',settings:{...defaults,temperature:1.2,stopSequences:['TEMPLATE']}});tree=render();assert.equal(all(tree).find(n=>n.type==='input'&&n.props.placeholder==='END, STOP').props.value,'TEMPLATE');all(tree).find(n=>n.type==='button'&&text(n).startsWith('Run prompt')).props.onClick();assert.equal(execution.contextIds.length,0,'template cannot silently retain private context from previous attempt');assert.equal(execution.settings.temperature,1.2);props.busy=true;tree=render();assert.equal(all(tree).find(n=>n.type==='button'&&n.props['aria-pressed']===true&&text(n).startsWith('V1')).props.disabled,true);
console.log('Learner control regression PASS: stop input typing, real exported settings, matching-prompt score and busy history guard.');


props.busy=false;props.attempt={...attempt,evaluation_json:null};tree=render();
assert.equal(all(tree).some(n=>n.type==='button'&&text(n)==='AI Judge'),true,'reopened saved ungraded response exposes recovery without a transient error');
for(const phase of ['generating','judging']){props.busy=true;props.executionPhase=phase;tree=render();assert.equal(all(tree).some(n=>n.type==='button'&&text(n)==='AI Judge'),false,'retry stays locked during '+phase);assert.equal(all(tree).find(n=>n.type==='button'&&n.props['data-learning-event']==='run').props.disabled,true,'generation stays locked during '+phase);}
props.busy=false;props.executionPhase=undefined;props.attempt=attempt;tree=render();assert.equal(all(tree).some(n=>n.type==='button'&&text(n)==='AI Judge'),false,'graded attempts cannot request another grade');
props.attempt={...attempt,evaluation_json:null};props.actionError='Automatic grading failed. Please retry.';tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='AI Judge').props.onClick();
assert.equal(action.name,'judge');assert.equal(action.payload.attemptId,'a1');assert.equal(action.payload.lessonId,'l1');
// Language switching belongs to the existing shared workspace navigation.
await all(tree).find(n=>n.type==='button'&&n.props['aria-label']==='Copy output').props.onClick();assert.equal(copied,'result');
let prevented=false;all(tree).find(n=>n.type==='textarea'&&n.props.id==='learner-prompt').props.onKeyDown({metaKey:true,key:'Enter',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(execution.settings.temperature,1.2);
props.snapshot.controls.state='paused';tree=render();assert.equal(all(tree).find(n=>n.type==='button'&&text(n).startsWith('Run prompt')).props.disabled,true);prevented=false;all(tree).find(n=>n.type==='textarea'&&n.props.id==='learner-prompt').props.onKeyDown({ctrlKey:true,key:'Enter',preventDefault(){prevented=true;}});assert.equal(prevented,false);
props.snapshot.controls.state='active';tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='Save to library').props.onClick();tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='Save to personal library').props.onClick();assert.equal(action.name,'savePromptLibrary');assert.equal(action.payload.prompt,'template');assert.equal(action.payload.settings.temperature,1.2);assert.equal(action.payload.attemptId,undefined);
console.log('Real handler payloads PASS: saved attempt Judge, language, copy, Cmd+Enter, paused guard, current-template persistence.');

// Framework insertion preserves authored text and fills only absent core tags.
prompt='[Role]: Keep this custom persona\n[Task]: Keep this custom task';props.insert=value=>{prompt+=value;};tree=render();
all(tree).find(n=>n.type==='button'&&text(n)==='5 Standard Elements Framework').props.onClick();
assert.ok(prompt.startsWith('[Role]: Keep this custom persona\n[Task]: Keep this custom task'));assert.equal(recognition.exports.recognizedScaffolds(prompt,recognition.exports.CORE_SCAFFOLDS).length,5);assert.equal((prompt.match(/\[Role\]/g)||[]).length,1);
prompt='[Role]: Existing role';tree=render();all(tree).find(n=>n.type==='button'&&text(n)==='Quick Fix: Context').props.onClick();tree=render();assert.ok(text(tree).includes('Output impact'));all(tree).find(n=>n.type==='button'&&text(n)==='Insert scaffold').props.onClick();assert.ok(prompt.startsWith('[Role]: Existing role'));assert.ok(prompt.includes('\n[Context]:'));assert.equal(recognition.exports.recognizedScaffolds(prompt,recognition.exports.CORE_SCAFFOLDS).length,2,'Inserted Quick Fix must be recognized as a separate core element');

// Slides (024): the toggle sits beside the left rail tabs; the deck shows in the center in place of the editor.
// The editor stays mounted (hidden) so draft and cursor survive; the viewer stays mounted so its page survives.
const railButton=label=>all(all(tree).find(n=>n.type==='nav'&&n.props.className==='lv-tabs')).find(n=>n.type==='button'&&text(n)===label);
const pane=id=>all(tree).find(n=>n.props?.id===id);
prompt='my unsaved draft';states=[];props.lesson={...props.lesson,slides:null};tree=render();
assert.equal(railButton('Slides'),undefined,'no Slides button without slides');
assert.equal(pane('center-pane-prompt').props.hidden,false);
states=[];props.lesson={...props.lesson,slides:{deckId:'d1',versionId:'v1',title:'Week 1',pageCount:30,startPage:13,endPage:24,ranged:true}};tree=render();
assert.ok(railButton('Exercise')&&railButton('Slides'),'Slides sits beside Exercise/Theory/Hints/Resources');
assert.equal(railButton('Slides').props['aria-pressed'],false,'Prompt shows first');
assert.equal(all(tree).some(n=>n.type==='LazySlidesViewer'),false,'PDF viewer is not loaded before Slides is clicked');
railButton('Slides').props.onClick();tree=render();
assert.equal(railButton('Slides').props['aria-pressed'],true);
assert.equal(railButton('Exercise').props['aria-current'],'page','rail keeps its own tab');
const viewer=all(tree).find(n=>n.type==='LazySlidesViewer');assert.ok(viewer,'viewer mounts in the center');assert.equal(viewer.props.title,'Week 1');
assert.equal(pane('center-pane-slides').props.hidden,false);
assert.equal(pane('center-pane-prompt').props.hidden,true,'editor hidden, not unmounted');
assert.equal(all(tree).find(n=>n.type==='textarea'&&n.props.id==='learner-prompt').props.value,'my unsaved draft');
all(tree).find(n=>n.type==='button'&&text(n)==='Back to prompt').props.onClick();tree=render();
assert.equal(pane('center-pane-slides').props.hidden,true,'viewer kept mounted while hidden');
assert.equal(pane('center-pane-prompt').props.hidden,false);
railButton('Slides').props.onClick();tree=render();railButton('Slides').props.onClick();tree=render();
assert.equal(pane('center-pane-prompt').props.hidden,false,'Slides toggles back to the prompt');
assert.equal(prompt,'my unsaved draft');
console.log('Slides toggle PASS: button in the rail, deck in the center, draft and viewer state kept.');
