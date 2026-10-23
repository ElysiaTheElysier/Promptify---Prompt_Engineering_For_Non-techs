import fs from 'node:fs';
export function applyCombinedBrand(){
 for(const file of fs.readdirSync('src/components/rebuild').filter(name=>/^Production(Landing|Entry[123]|Hub|WorkspaceSource|CompareSource|JudgeSource|SopInspectorSource|WorkshopSource|LearnerInspectorSource|StudioSource|AnalyticsSource|GovernanceSource|RosterSource|SopSource)\.tsx$/.test(name))){
  const path='src/components/rebuild/'+file;let code=fs.readFileSync(path,'utf8').replace(/\b(from|to|via|bg|text|border|ring)-blue-/g,'$1-emerald-');
  code=code.replace(/<div className=\{("[^"]+")\}>\{copy\(("(?:\\.|[^"\\])*")\)\}<\/div>/g,(_match,classes,label)=>JSON.parse(label).trim()!=='P'?_match:`<PromptifyMark className="${classes.includes('w-8')?'h-8 w-8':'h-10 w-10'}"/>`);
  if(code.includes('<PromptifyMark')&&!code.includes("import {PromptifyMark}"))code="import {PromptifyMark} from '../common/PromptifyMark';\n"+code;
  fs.writeFileSync(path,code);
 }
}
applyCombinedBrand();
