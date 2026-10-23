import fs from 'node:fs/promises';
const active=process.argv.includes('--active');
const lifecycle=process.argv.includes('--lifecycle');
const origin=active?'https://promptify-intrepid-api-zmyu4rhkmq-as.a.run.app':lifecycle?'https://lifecycle-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app':'https://drive-original-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app';
const results=[];
for(const [route,status,init] of [
 ['/health',200,undefined],['/readyz',200,undefined],
 ['/api/product',401,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'backfillDriveOriginal'})}],
 ['/api/product',401,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer invalid-staging-probe'},body:JSON.stringify({action:'sourceDownload',classId:'9c32e26b-bcda-4549-bca8-dd4f350c2aaa'})}],
 ['/api/product',405,{method:'OPTIONS',headers:{Origin:'https://untrusted.example','Access-Control-Request-Method':'POST'}}]
]){
 const start=performance.now(),response=await fetch(origin+route,{...init,signal:AbortSignal.timeout(60000)}),body=await response.text();
 const ok=response.status===status&&(route==='/health'?JSON.parse(body).status==='ok':route==='/readyz'?JSON.parse(body).status==='ready':true)&&!response.headers.has('access-control-allow-origin');
 results.push({route,method:init?.method||'GET',status:response.status,expected:status,ok,ms:Math.round(performance.now()-start)});
}
await fs.writeFile(lifecycle?`outputs/staging-release-2026-10-21-lifecycle-resume/${active?'active':'candidate'}-checks.json`:`outputs/staging-release-2026-10-21-lifecycle-originals/drive-${active?'active':'candidate'}-checks.json`,JSON.stringify({at:new Date().toISOString(),origin,results},null,2));
console.log(JSON.stringify(results));if(results.some(r=>!r.ok))process.exitCode=1;
