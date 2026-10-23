import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
export async function bundleVercelApi(target){
  const directory=path.join(target,'api');
  for(const name of ['product','generate','evaluate','roster-worker']){
    const input=path.join(directory,name+'.ts');
    await build({entryPoints:[input],outfile:path.join(directory,name+'.js'),bundle:true,platform:'node',format:'esm',target:'node24',packages:'external',sourcemap:false});
    // Only the generated staging entry is removed, never canonical source.
    fs.unlinkSync(input);
  }
  const configPath=path.join(target,'vercel.json');
  const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  config.functions['api/product.js']=config.functions['api/product.ts'];
  delete config.functions['api/product.ts'];
  fs.writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
  const tsconfigPath=path.join(target,'tsconfig.json');
  const tsconfig=JSON.parse(fs.readFileSync(tsconfigPath,'utf8'));
  tsconfig.compilerOptions.allowJs=true;
  tsconfig.compilerOptions.checkJs=false;
  fs.writeFileSync(tsconfigPath,JSON.stringify(tsconfig,null,2)+'\n');
}
