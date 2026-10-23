import fs from 'node:fs/promises';
const origin=process.argv[2],out=process.argv[3];
const allowed=new Set(['https://promptify-intrepid-api-zmyu4rhkmq-as.a.run.app','https://sop-revalidation-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app']);
if(!process.argv.includes('--staging-readonly-burst')||!allowed.has(origin)||!/^outputs\/staging-release-2026-10-20-readiness-audit\/[a-z-]+\.json$/.test(out||''))throw Error('Explicit guarded staging scope required');
const stages=[];
for(const concurrency of [5,25,50,100]){
 const rows=await Promise.all(Array.from({length:concurrency},async()=>{
  const start=performance.now();
  try{const response=await fetch(origin+'/readyz',{signal:AbortSignal.timeout(15000)});const body=await response.json();return {ok:response.status===200&&body.status==='ready',status:response.status,ms:Math.round(performance.now()-start)};}
  catch{return {ok:false,status:0,ms:Math.round(performance.now()-start)};}
 }));
 const sorted=rows.map(r=>r.ms).sort((a,b)=>a-b),percentile=p=>sorted[Math.ceil(p*sorted.length)-1];
 stages.push({concurrency,requests:rows.length,errors:rows.filter(r=>!r.ok).length,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:sorted.at(-1)});
 if(rows.some(r=>!r.ok))break;
}
const report={at:new Date().toISOString(),origin,scope:'180 maximum one-wave read-only readiness probes; SELECT 1 only. No user authentication, course snapshot, AI generation/Judge, data writes or sustained 100-user load acceptance.',stages};
await fs.writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
if(stages.length!==4||stages.some(s=>s.errors))process.exitCode=1;
