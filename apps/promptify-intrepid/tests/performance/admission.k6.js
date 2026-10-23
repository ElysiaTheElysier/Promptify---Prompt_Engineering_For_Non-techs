// Run ONLY against an isolated local fake-provider API, never staging/real Vertex.
// k6 run -e BASE_URL=http://127.0.0.1:PORT -e VUS=100 tests/performance/admission.k6.js
import http from 'k6/http';
import {check,sleep} from 'k6';
const base=__ENV.BASE_URL||'';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Loopback fake-provider URL required');
const vus=Number(__ENV.VUS||10);
if(![10,25,50,100].includes(vus))throw new Error('VUS must be 10/25/50/100');
export const options={scenarios:{burst:{executor:'per-vu-iterations',vus,iterations:1,maxDuration:'90s'}},thresholds:{checks:['rate==1'],http_req_failed:['rate==0']}};
function uuid(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3)|8).toString(16);});}
export default function(){
 const id=uuid(),body=JSON.stringify({id,ordinal:__VU}),params={headers:{'Content-Type':'application/json'}};
 check(http.post(base+'/runs',body,params),{'run admitted':r=>r.status===202});
 check(http.post(base+'/runs',body,params),{'duplicate accepted idempotently':r=>r.status===202});
 for(let i=0;i<800;i++){
  const r=http.get(base+'/runs/'+id),status=r.json('status');
  if(status==='completed'){check(r,{'completed':()=>true});return;}
  if(status==='failed'){check(r,{'completed':()=>false});return;}
  sleep(.1);
 }
 check(null,{'completed within deadline':()=>false});
}
