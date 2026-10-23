import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const base=process.argv[2],label=process.argv[3],releaseDate=process.argv[4]||'2026-10-19',releaseSuffix=process.argv[5]||'';
if(!/^2026-\d{2}-\d{2}$/.test(releaseDate))throw Error('Invalid release date');
if(!/^[a-z0-9-]*$/.test(releaseSuffix))throw Error('Invalid release suffix');
const releaseId=releaseDate+(releaseSuffix?'-'+releaseSuffix:'');
if(!base||!label||!/^[a-z0-9-]+$/.test(label))throw Error('URL and safe evidence label required');
const url=new URL(base);
if(url.protocol!=='https:'||!(url.hostname==='ai-transformation-510302-intrepid-staging.web.app'||/^(?:revised-ui-review|g38-staging-review)---promptify-intrepid-api-[a-z0-9-]+\.a\.run\.app$/.test(url.hostname)||url.hostname==='promptify-intrepid-api-zmyu4rhkmq-as.a.run.app'))throw Error('Not an approved staging endpoint');
const results=[];
async function check(route,expected,init,validate){const start=performance.now();const response=await fetch(new URL(route,base),{...init,signal:AbortSignal.timeout(60000)});const bytes=Buffer.from(await response.arrayBuffer());const ok=response.status===expected&&(!validate||validate(bytes,response));results.push({route,status:response.status,expected,ok,ms:Math.round(performance.now()-start),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),contentType:response.headers.get('content-type')});return bytes;}
if(!url.hostname.endsWith('.web.app'))await check('/health',200,undefined,bytes=>JSON.parse(bytes).status==='ok');
if(!url.hostname.endsWith('.web.app'))await check('/readyz',200,undefined,bytes=>JSON.parse(bytes).status==='ready');
await check('/api/product',401,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'snapshot'})});
await check('/api/generate',401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
await check('/api/evaluate',401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
const local=await readFile('dist/index.html');
const html=await check('/',200,undefined,bytes=>bytes.equals(local));
for(const route of ['/?ui=04','/?ui=05','/?ui=11'])await check(route,200,undefined,bytes=>bytes.equals(local));
const assets=[...new Set([...html.toString().matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(m=>m[1]))];
for(const name of await readdir('dist/assets'))if(/\.(js|css)$/.test(name)&&!assets.includes('/assets/'+name))assets.push('/assets/'+name);
for(const asset of assets){const expected=await readFile(path.join('dist',asset));await check(asset,200,undefined,bytes=>bytes.equals(expected));}
const out={at:new Date().toISOString(),base,authenticatedFlows:'Not exercised by this HTTP asset probe; authenticated browser evidence is recorded separately. No credentials extracted or fabricated.',results};
await mkdir(`outputs/staging-release-${releaseId}`,{recursive:true});await writeFile(`outputs/staging-release-${releaseId}/${label}-http-checks.json`,JSON.stringify(out,null,2));
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.status} ${r.route} ${r.ms}ms`);
if(results.some(r=>!r.ok))process.exitCode=1;



