"""Port the existing React reference renderer without changing historical drafts."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '../../design-drafts/rebuild-source-of-truth/ui/source'
DEST = ROOT / 'src/components/rebuild'

def main():
    source = (SOURCE / 'mockup-aligned.tsx').read_text(encoding='utf-8')
    source = source.replace("import {createRoot} from 'react-dom/client';", '')
    source = source.replace("'./production-baseline/src/components/common/PromptifyMark'", "'../common/PromptifyMark'")
    source = source.replace("'./production-baseline/src/components/common/MarkdownView'", "'../common/MarkdownView'")
    source = source.replace("import {PromptComposer} from './production-baseline/src/components/prompt/PromptComposer';", '')
    source = source.replace("import {analyzePromptStructure} from './production-baseline/src/services/promptStructureAnalyzer';", '')
    source = source.replace("'./guardrail-i18n'", "'./review-i18n'")
    source = source.replace("'./mockup-templates.json'", "'./review-templates.json'")
    source = source.replace("const index=Number((window as any).COMBINED_UI_ID.slice(3)),template:any=templates[index],files=(window as any).COMBINED_FILES;", "const requested=Number(new URLSearchParams(location.search).get('ui') || 0); const index=Number.isInteger(requested)&&requested>=0&&requested<16?requested:0; const template:any=templates[index], files=Array.from({length:16},(_,i)=>'/rebuild?ui='+String(i).padStart(2,'0')); ")
    source = re.sub(r'^const route=.*$', lambda _: """const route=(url:string)=>{if(!url||url==='#'||url.startsWith('#'))return url;let target:number|undefined;const id=url.match(/UI[- ]?(\\d{1,2})/i);if(id)target=Number(id[1]);else if(url==='/')target=0;else if(/auth\\/login/.test(url))target=1;else if(/trainer\\/curriculum/.test(url))target=11;else if(/trainer\\/inspect/.test(url))target=10;else if(/trainer\\/(dashboard|workshop)/.test(url))target=9;else if(/learner\\/compare/.test(url))target=6;else if(/playground|codelab/.test(url))target=5;else if(/learner\\/dashboard/.test(url))target=4;if(target===undefined)return '#';const query=new URLSearchParams(location.search);query.delete('view');query.set('ui',String(target).padStart(2,'0'));const original=new URL(url,location.origin);original.searchParams.forEach((v,k)=>{if(k!=='ui')query.set(k,v)});const learner=url.match(/inspect\\/([^?]+)/);if(learner)query.set('learnerId',learner[1]);return '/rebuild?'+query.toString();};""", source, flags=re.M)
    source = source.replace('function App(){', 'export default function ReviewScreen(){')
    source = source.replace("createRoot(document.getElementById('root')!).render(<App/>);", '')
    # Old renderer's forced replacement composer belonged to an earlier source version.
    source = '\n'.join(line for line in source.splitlines() if not line.lstrip().startswith("if(index===5&&!state.testCases&&tag==='textarea'"))
    source = source.replace("if(index===5&&!state.testCases&&/isExecuting\\s*=\\s*true/.test(v)){execute();return}", '')
    source = source.replace("if(index===5&&tag==='button'&&a['@click']?.includes('isExecuting = true'))return null;", '')
    source = source.replace("if(index===11&&!state.labCode&&tag==='button'", "if(index===11&&!state.labData&&!state.labCode&&tag==='button'")
    source = source.replace("if(key==='totalRubricWeight'&&obj.rubricCriteria)", "if(key==='totalRubricWeight'&&Array.isArray(obj.rubricCriteria))")
    source = source.replace("Object.assign(raw,revive(template.state,root));", "Object.defineProperties(raw,Object.getOwnPropertyDescriptors(revive(template.state,root))); ")
    source = source.replace("engine.current={state:root,raw,locals:new Map()};", "engine.current={state:root,raw,locals:new Map()};if(index===10){const selected=new URLSearchParams(location.search).get('learnerId');if(selected&&raw.learners?.[selected])raw.activeLearnerId=selected;}")
    source = source.replace("for(const[k,v]of Object.entries(value))result[k]=revive(v,scope);", "for(const[k,v]of Object.entries(value)){if((v as any)?.$getter){const body=(v as any).$getter.replace(/^get\\s+\\w+\\s*\\(/,'function (');Object.defineProperty(result,k,{enumerable:true,configurable:true,get:new Function('scope',`with(scope){return (${body})}`)(scope).bind(scope)});}else result[k]=revive(v,scope);}")
    source = source.replace("Array.from(typeof items==='number'?Array.from({length:items},(_,i)=>i+1):items).map((item:any,i)=>{const local=scopeFor({[names[0]]:item,...(names[1]?{[names[1]]:i}:{})},scope);", "(typeof items==='number'?Array.from({length:items},(_,i)=>[i,i+1]):Array.isArray(items)?items.map((item:any,i:number)=>[i,item]):Object.entries(items)).map(([itemKey,item]:any,i:number)=>{const local=scopeFor({[names[0]]:item,...(names[1]?{[names[1]]:itemKey}:{}),...(names[2]?{[names[2]]:i}:{})},scope);")
    source = source.replace("Prototype · Mockup content & interactions · Current green theme", "Word review rebuild · Demo data · AI / SSO / Sheets / RAG actions are simulated")
    source = source.replace('<a href="../index.html">All 16 UIs</a>', '<a href="/rebuild?view=inventory">16 screens</a><a href="/">Live app</a>')
    source = source.replace("return files[11]+(url.includes('?')?url.slice(url.indexOf('?')):'');", "return files[11]+(url.includes('?')?'&'+url.slice(url.indexOf('?')+1):'');")
    source = source.replace("props.href=route(v)", "props.href=route(v)")
    # Never silently append a coaching hint to the user's prompt.
    source = source.replace("if(index===5&&sessionStorage.getItem('aligned-hint'))raw.promptText+='\\n[Revision Hint]: '+sessionStorage.getItem('aligned-hint');", '')
    # Reference secret fixture is excluded from the client, including unmask actions.
    source = source.replace("if(a['x-text'])child=text(String(evaluate(a['x-text'],scope)??''));", "if(index===14&&a['x-text']?.includes('k.secret'))child='••••••••••••••••';else if(a['x-text'])child=text(String(evaluate(a['x-text'],scope)??''));")
    (DEST / 'ReviewScreen.tsx').write_text(source, encoding='utf-8')
    i18n = (SOURCE / 'guardrail-i18n.ts').read_text(encoding='utf-8').replace('promptify-prototype-language', 'promptify-review-language')
    (DEST / 'review-i18n.ts').write_text(i18n, encoding='utf-8')
    reference_styles = []
    for html in (ROOT / '../../design-drafts/review-authority').glob('UI-*.html'):
        reference_styles.extend(re.findall(r'<style>(.*?)</style>', html.read_text(encoding='utf-8'), re.S))
    css = (SOURCE / 'mockup-aligned.css').read_text(encoding='utf-8')
    css += '\n' + '\n'.join(reference_styles)
    css += '\n.aligned-body[data-ui="UI-05"]{height:auto;min-height:calc(100dvh - 40px)}\n'
    css += '@media(prefers-reduced-motion:reduce){.aligned-body *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}\n'
    (DEST / 'review.css').write_text(css, encoding='utf-8')
    print('Prepared React review runtime with current logo, final source markup, object loops, and live getters.')

if __name__ == '__main__':
    main()

