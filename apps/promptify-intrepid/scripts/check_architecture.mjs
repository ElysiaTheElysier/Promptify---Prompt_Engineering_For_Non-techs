import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const moduleFile=fileURLToPath(import.meta.url);
export function inspectArchitecture(root=path.resolve(path.dirname(moduleFile),'..')){
 const errors=[],app=path.resolve(root),inside=p=>p===app||p.startsWith(app+path.sep);
 const report=(file,message)=>errors.push(path.relative(app,file).replaceAll('\\','/')+': '+message);
 const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json'),'utf8'));
 for(const group of ['dependencies','devDependencies','optionalDependencies'])for(const [name,value]of Object.entries(pkg[group]||{}))if(/^(?:file:|link:|workspace:)|\.\.[/\\]|apps[/\\]promptify/.test(value)||/^promptify-(mvp|intrepid)$/.test(name))report(path.join(app,'package.json'),'internal package coupling: '+name);
 const configFile=path.join(app,'tsconfig.json');const parsed=ts.readConfigFile(configFile,ts.sys.readFile);if(parsed.error)report(configFile,'invalid TypeScript config');
 const conf=parsed.config||{};if(conf.extends&&(!inside(path.resolve(app,conf.extends))||/promptify-(mvp|intrepid)/.test(conf.extends)))report(configFile,'extends outside app');
 for(const pattern of [...(conf.include||[]),...(conf.files||[])])if(!inside(path.resolve(app,pattern)))report(configFile,'source glob outside app: '+pattern);
 const baseUrl=path.resolve(app,conf.compilerOptions?.baseUrl||'.');if(!inside(baseUrl))report(configFile,'baseUrl outside app');
 for(const values of Object.values(conf.compilerOptions?.paths||{}))for(const v of values)if(!inside(path.resolve(baseUrl,v)))report(configFile,'alias target outside app: '+v);
 const declared=new Set(Object.keys({...pkg.dependencies,...pkg.devDependencies,...pkg.optionalDependencies}));
 const resolve=(from,spec)=>{const target=path.resolve(path.dirname(from),spec),nojs=target.replace(/\.js$/,'');const found=[target,...['.ts','.tsx','.mjs','.cjs','.json','.css'].map(e=>target+e),nojs+'.ts',nojs+'.tsx',path.join(target,'index.ts'),path.join(target,'index.tsx')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());return {target,found};};
 function checkImport(file,spec){
  if(spec.startsWith('node:'))return;
  if(spec.startsWith('.')||path.isAbsolute(spec)){
   const {target,found}=resolve(file,spec);if(!inside(target))report(file,'import outside app: '+spec);else if(!found)report(file,'unresolved local import: '+spec);else if(!inside(fs.realpathSync(found)))report(file,'symlink import outside app: '+spec);return;
  }
  if(/(?:apps\/|design-drafts|promptify-(mvp|intrepid)|^#)/.test(spec)){report(file,'internal/legacy alias: '+spec);return;}
  const packageName=spec.startsWith('@')?spec.split('/').slice(0,2).join('/'):spec.split('/')[0];
  const builtins=['fs','path','assert','crypto','url','child_process','os','http','https','util','stream','buffer','events','module'];
  if(!declared.has(packageName)&&!builtins.includes(packageName)&&!Object.keys(conf.compilerOptions?.paths||{}).some(p=>spec.startsWith(p.replace(/\*$/,''))))report(file,'undeclared import or alias: '+spec);
 }
 function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink()){report(file,'source symlink forbidden');continue;}if(entry.isDirectory()){if(!['node_modules','dist','outputs','fixtures'].includes(entry.name))walk(file);continue;}if(!/\.(ts|tsx|mjs|cjs|js)$/.test(file))continue;
  const code=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true);
  function visit(n){
   if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))checkImport(file,n.moduleSpecifier.text);
   if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||n.expression.getText(ast)==='require')){
    if(n.arguments[0]&&ts.isStringLiteralLike(n.arguments[0]))checkImport(file,n.arguments[0].text);
    else report(file,'computed module import needs explicit local allowlist');
   }
   if(ts.isStringLiteralLike(n)&&(n.text==='..'||/^(?:\.\.[/\\]|[A-Za-z]:[/\\]|\/)/.test(n.text)||/apps[/\\]promptify|design-drafts[/\\]pre-separation/.test(n.text))){
    const value=n.text;if(/apps[/\\]promptify|design-drafts[/\\]pre-separation/.test(value))report(file,'cross-app/archive runtime reference: '+value);
    const moduleLiteral=(ts.isImportDeclaration(n.parent)||ts.isExportDeclaration(n.parent))||ts.isCallExpression(n.parent)&&(n.parent.expression.kind===ts.SyntaxKind.ImportKeyword||n.parent.expression.getText(ast)==='require');
    if(!moduleLiteral&&value.startsWith('..')&&!inside(path.resolve(app,value)))report(file,'cwd-relative file reference outside app (needs explicit local resolution): '+value);
    if(value==='..')report(file,'parent segment in runtime file reference');
    if(/^[A-Za-z]:[/\\]/.test(value))report(file,'machine-specific absolute file reference');
   }
   ts.forEachChild(n,visit);
  }visit(ast);
 }}
 for(const dir of ['src','api'])walk(path.join(app,dir));
 for(const file of ['vite.config.ts','tailwind.config.js','postcss.config.js'])if(fs.existsSync(path.join(app,file))) {
  const tmp=path.join(app,file),content=fs.readFileSync(tmp,'utf8'),ast=ts.createSourceFile(tmp,content,ts.ScriptTarget.Latest,true);
  function visitConfig(n){
   if(ts.isStringLiteralLike(n)&&(n.text==='..'||/^\.\.[/\\]|^[A-Za-z]:[/\\]/.test(n.text)||/promptify-(mvp|intrepid)|design-drafts[/\\]pre-separation/.test(n.text)))report(tmp,'config references outside app: '+n.text);
   if(ts.isImportDeclaration(n)&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))checkImport(tmp,n.moduleSpecifier.text);
   ts.forEachChild(n,visitConfig);
  }visitConfig(ast);
 }
 // Assets in Vercel includeFiles must be inside the deployment root.
 if(fs.existsSync(path.join(app,'vercel.json'))){const v=JSON.parse(fs.readFileSync(path.join(app,'vercel.json'),'utf8'));for(const fn of Object.values(v.functions||{}))for(const target of [fn.includeFiles].filter(Boolean))if(!inside(path.resolve(app,target)))report(path.join(app,'vercel.json'),'includeFiles outside app');}
 return errors;
}
if(process.argv[1]&&path.resolve(process.argv[1])===moduleFile){const errors=inspectArchitecture();if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Architecture PASS: app-local imports/config/assets; no internal package coupling.');}
