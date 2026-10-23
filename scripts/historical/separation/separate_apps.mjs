// One-time migration, dry-run by default. Uses the preserved working-copy snapshot.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
const root=process.cwd(),base=path.join(root,'outputs/separation-baseline');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
const files=d=>fs.readdirSync(path.join(base,d),{recursive:true}).filter(f=>fs.statSync(path.join(base,d,f)).isFile()).map(f=>(d+'/'+f).replaceAll('\\','/'));
const changes=[];
function pruneUnusedImports(file,source){
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const uses=new Set();
 function visit(n){if(ts.isImportDeclaration(n))return;if(ts.isIdentifier(n))uses.add(n.text);ts.forEachChild(n,visit);}visit(ast);
 const edits=[];
 for(const n of ast.statements){if(!ts.isImportDeclaration(n)||!n.importClause)continue;const clause=n.importClause;
  const names=[clause.name?.text];if(clause.namedBindings){if(ts.isNamespaceImport(clause.namedBindings))names.push(clause.namedBindings.name.text);else names.push(...clause.namedBindings.elements.map(e=>e.name.text));}
  if(names.filter(Boolean).every(name=>!uses.has(name)))edits.push([n.getStart(ast),n.end]);
 }
 for(const [start,end]of edits.reverse()){changes.push({file,kind:'remove-unused-import',text:source.slice(start,end)});source=source.slice(0,start)+source.slice(end);}
 return source;
}
const overridden=new Map([['src/components/rebuild/ProductionApp.tsx',pruneUnusedImports('src/components/rebuild/ProductionApp.tsx',read('src/components/rebuild/ProductionApp.tsx'))]]);
function source(file){return overridden.get(file)||read(file);}
function resolve(file,spec){if(!spec.startsWith('.'))return null;const p=path.posix.normalize(path.posix.join(path.posix.dirname(file),spec)),nojs=p.replace(/\.js$/,'');return [p,...['.ts','.tsx','.json','.css'].map(e=>p+e),nojs+'.ts',nojs+'.tsx',p+'/index.ts',p+'/index.tsx'].find(f=>fs.existsSync(path.join(base,f))&&fs.statSync(path.join(base,f)).isFile());}
function imports(file){if(!/\.(?:ts|tsx|mjs|cjs)$/.test(file))return[];const ast=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true);const out=[];function visit(n){if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier)){const f=resolve(file,n.moduleSpecifier.text);if(f)out.push(f);}if(ts.isCallExpression(n)&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||n.expression.getText(ast)==='require')){const f=resolve(file,n.arguments[0].text);if(f)out.push(f);}ts.forEachChild(n,visit);}visit(ast);return [...new Set(out)];}
function closure(entries){const seen=new Set();function walk(f){if(seen.has(f))return;seen.add(f);imports(f).forEach(walk);}entries.forEach(walk);return seen;}
const mvpEntries=['src/App.tsx','api/generate.ts','api/evaluate.ts',...files('src/components').filter(f=>!f.includes('/rebuild/')&&!/ProductDialog|ProductUseNotice/.test(f))];
const mvp=closure(mvpEntries),intrepid=closure(['src/components/rebuild/ProductionApp.tsx','src/components/rebuild/RebuildApp.tsx','api/product.ts','api/roster-worker.ts','api/generate.ts','api/evaluate.ts']);
const appSets={'promptify-mvp':mvp,'promptify-intrepid':intrepid};
const testAssignment={};
for(const f of files('test')){
 if(f.endsWith('.sql')){testAssignment[f]=Object.keys(appSets);continue;}
 const code=read(f),refs=imports(f).filter(p=>p.startsWith('src/')||p.startsWith('api/'));
 const ast=ts.createSourceFile(f,code,ts.ScriptTarget.Latest,true);function visit(n){if(ts.isStringLiteral(n)&&/^(src|api)\//.test(n.text)&&fs.existsSync(path.join(base,n.text)))refs.push(n.text);ts.forEachChild(n,visit);}visit(ast);
 testAssignment[f]=Object.entries(appSets).filter(([,set])=>refs.every(p=>set.has(p))).map(([a])=>a);
}
const manifest={baseline:'d7ac9d1 + dirty working tree',apps:Object.fromEntries(Object.entries(appSets).map(([a,s])=>[a,[...s].sort()])),duplicates:[...mvp].filter(f=>intrepid.has(f)).sort(),testAssignment,sourceEdits:changes,archived:files('src').filter(f=>!mvp.has(f)&&!intrepid.has(f)),copied:[],modified:[],retired:[]};
fs.mkdirSync('outputs/separation',{recursive:true});fs.writeFileSync('outputs/separation/dry-run.json',JSON.stringify(manifest,null,2));
console.log('AST dry-run:',changes.map(c=>c.text.trim()).join('\n'));console.log('Modules',mvp.size,intrepid.size,'duplicated',manifest.duplicates.length);
if(!process.argv.includes('--apply'))process.exit(0);
if(fs.existsSync('apps'))throw new Error('Refuse to overwrite an existing apps directory');
function put(app,file,content){const dest=path.join('apps',app,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);manifest.modified.push(dest);}
function copy(app,file,to=file){const dest=path.join('apps',app,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(base,file),dest);manifest.copied.push({from:file,to:dest.replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')});}
for(const [app,set]of Object.entries(appSets)){
 for(const file of set){if(overridden.has(file))put(app,file,source(file));else copy(app,file);}
 for(const f of files('public'))if(app==='promptify-intrepid'||f.startsWith('public/brand/'))copy(app,f);
 // Both apps own immutable offline schema fixtures; neither imports root database source.
 for(const f of files('supabase'))copy(app,f,'tests/fixtures/'+f);
 for(const [file,owners]of Object.entries(testAssignment))if(owners.includes(app)){
  const destination='tests/'+path.posix.basename(file);let code=read(file);
  if(!file.endsWith('.sql')){const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true),edits=[];function visit(n){if(ts.isStringLiteral(n)&&n.text.startsWith('supabase/'))edits.push([n.getStart(ast)+1,n.end-1,'tests/fixtures/'+n.text]);ts.forEachChild(n,visit);}visit(ast);for(const [s,e,v]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,s)+v+code.slice(e);}
  put(app,destination,code);
 }
 const pkg=JSON.parse(read('package.json'));pkg.name=app;delete pkg.devDependencies['dependency-cruiser'];delete pkg.devDependencies.knip;pkg.devDependencies['dependency-cruiser']='18.6.0';pkg.devDependencies.knip='6.41.0';
 pkg.scripts={dev:'vite',build:'tsc && vite build',preview:'vite preview',typecheck:'tsc --noEmit',lint:'npm run check:architecture','check:architecture':'node scripts/check_architecture.mjs && depcruise src api --config .dependency-cruiser.cjs',test:'node scripts/run_offline_tests.mjs','test:boundaries':'node tests/architecture_guards.mjs','audit:unused':'knip --no-progress'};
 if(app==='promptify-mvp'){pkg.scripts['test:curriculum']='tsx tests/verify_course_curriculum.ts';pkg.scripts['test:access']='tsx tests/verify_enrollment_access.ts';pkg.scripts['test:progress']='tsx tests/verify_server_backed_learning_progress.ts';}
 put(app,'package.json',JSON.stringify(pkg,null,2)+'\n');
 for(const f of ['tsconfig.json','tailwind.config.js','postcss.config.js'])copy(app,f);
 const config=JSON.parse(read('tsconfig.json'));config.include=['src','api','vite.config.ts'];put(app,'tsconfig.json',JSON.stringify(config,null,2)+'\n');
 copy(app,'index.html');copy(app,'src/index.css');
 const main=app==='promptify-mvp'?`import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport './index.css';\nconst App = React.lazy(() => import('./App'));\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><React.Suspense fallback={<p role="status" className="p-8">Loading Promptify…</p>}><App /></React.Suspense></React.StrictMode>);\n`:`import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport './index.css';\nconst ProductionApp = React.lazy(() => import('./components/rebuild/ProductionApp'));\nconst RebuildApp = React.lazy(() => import('./components/rebuild/RebuildApp'));\nconst review = import.meta.env.VITE_REBUILD_PRODUCTION !== 'true' && (location.pathname === '/rebuild' || location.pathname.startsWith('/rebuild/'));\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><React.Suspense fallback={<p role="status" className="p-8">Loading Promptify…</p>}>{review ? <RebuildApp /> : <ProductionApp />}</React.Suspense></React.StrictMode>);\n`;
 put(app,'src/main.tsx',main);
 const v=read('vite.config.ts');
 if(app==='promptify-mvp'){
  const ast=ts.createSourceFile('vite.config.ts',v,ts.ScriptTarget.Latest,true);const importNode=ast.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./api/product');const start=v.indexOf("        if (req.url?.split('?')[0] === '/api/product')"),end=v.indexOf("        if (req.url?.startsWith('/api/generate')",start);
  let updated=v.slice(0,start)+v.slice(end);updated=updated.slice(0,importNode.getStart(ast))+updated.slice(importNode.end);put(app,'vite.config.ts',updated);
 }else put(app,'vite.config.ts',v.replace('port: 5173','port: 5174'));
 const vercel=JSON.parse(read('vercel.json'));vercel.rewrites.push({source:'/rebuild/:path*',destination:'/'});if(app==='promptify-mvp')delete vercel.functions;put(app,'vercel.json',JSON.stringify(vercel,null,2)+'\n');
 put(app,'.gitignore','node_modules/\ndist/\noutputs/\n.env\n.env.*\n!.env.example\n');
 const keys=new Set(['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','GEMINI_API_KEY']);for(const file of set)if(/\.tsx?$/.test(file))for(const m of source(file).matchAll(/(?:process\.env\.([A-Z][A-Z0-9_]+)|env\.([A-Z][A-Z0-9_]+))/g))keys.add(m[1]||m[2]);
 put(app,'.env.example','# App-local configuration. Copy to .env.local; never commit credentials.\n'+[...keys].sort().map(k=>k+'='+(k==='VITE_REBUILD_PRODUCTION'?(app==='promptify-intrepid'?'true':'false'):'')).join('\n')+'\n');
 put(app,'knip.json',JSON.stringify({entry:['src/main.tsx','api/**/*.ts','tests/*.{ts,mjs}','vite.config.ts'],project:['src/**/*.{ts,tsx}','api/**/*.ts'],vite:false,ignoreDependencies:['dependency-cruiser','knip']},null,2)+'\n');
}
// Preserve original runtime and prototype verbatim, without creating another deployable root app.
const archive='design-drafts/pre-separation';if(fs.existsSync(archive))throw Error('Archive already exists');fs.mkdirSync(archive,{recursive:true});
for(const d of ['src','api','public','test'])fs.cpSync(path.join(base,d),path.join(archive,d),{recursive:true});
for(const f of ['index.html','vite.config.ts','tailwind.config.js','postcss.config.js','tsconfig.json','vercel.json','package.json'])fs.copyFileSync(path.join(base,f),path.join(archive,f));
fs.mkdirSync('docs/separation',{recursive:true});fs.writeFileSync('docs/separation/file-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Apps created; root runtime not yet retired. Manifest written.');
