import fs from 'node:fs/promises';
const workspace=process.argv.includes('--synthetic-workspace');
const active=process.argv.includes('--active'),access=process.argv.includes('--access-roster'),origin=active?'https://promptify-intrepid-api-zmyu4rhkmq-as.a.run.app':workspace?'https://workspace-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app':access?'https://access-roster-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app':'https://sop-revalidation-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app';
const results=[];
for(const [route,status,init] of [
 ['/health',200,undefined],['/readyz',200,undefined],
 ['/api/product',401,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'snapshot'})}],
 ['/api/product',401,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer invalid-staging-probe'},body:JSON.stringify({action:'saveStudio',classId:'4a5a763a-b1b5-4676-88ca-81f4805fb321'})}],
 ['/api/product',405,{method:'OPTIONS',headers:{Origin:'https://untrusted.example','Access-Control-Request-Method':'POST'}}],
]){
 const start=performance.now(),r=await fetch(origin+route,{...init,signal:AbortSignal.timeout(60000)}),body=await r.text();
 const ok=r.status===status&&(route==='/health'?JSON.parse(body).status==='ok':route==='/readyz'?JSON.parse(body).status==='ready':true)&&!r.headers.has('access-control-allow-origin');
 results.push({route,method:init?.method||'GET',status:r.status,expected:status,ok,ms:Math.round(performance.now()-start)});
}
await fs.writeFile(`outputs/staging-release-2026-10-20-${workspace?'synthetic-workspace':access?'access-roster':'readiness-audit'}/${active?'active':'candidate'}-checks.json`,JSON.stringify({at:new Date().toISOString(),origin,results},null,2));
console.log(JSON.stringify(results));if(results.some(r=>!r.ok))process.exitCode=1;

