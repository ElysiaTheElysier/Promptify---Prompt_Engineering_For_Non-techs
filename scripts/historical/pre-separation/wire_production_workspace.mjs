// Keep the native production route composed from feature components.
import fs from 'node:fs';
const file='src/components/rebuild/ProductionApp.tsx';let source=fs.readFileSync(file,'utf8');
if(!source.includes("import ProductionWorkspace from './ProductionWorkspace';"))source=source.replace("import './production.css';","import ProductionWorkspace from './ProductionWorkspace';\nimport {ProductDialog} from '../common/ProductDialog';\nimport './production.css';");
source=source.split(/\r?\n/).map(line=>line.startsWith('      {currentUi===5&&lesson&&')?'      {currentUi===5&&lesson&&<ProductionWorkspace key={snapshot.selectedClass.id+lesson.id} snapshot={snapshot} lesson={lesson} prompt={prompt} setPrompt={setPrompt} promptRef={promptRef} insert={insert} run={run} busy={busy} attempt={attempt} scoreCard={scoreCard} unlock={setUnlock} onAction={action} navigate={navigate}/>}':line).join('\n');
fs.writeFileSync(file,source);
