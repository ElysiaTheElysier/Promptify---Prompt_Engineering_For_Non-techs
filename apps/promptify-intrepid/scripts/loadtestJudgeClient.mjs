/**
 * Load client for the ISOLATED staging load-test service only (promptify-judge-loadtest). Synthetic learners
 * loadtest-001..N click "AI Judge" on their saved attempt of round R: POST /api/judge-stream, read SSE to the end.
 * The service is private: Cloud Run checks roles/run.invoker on X-Serverless-Authorization (operator ID token,
 * LOADTEST_ID_TOKEN from `gcloud auth print-identity-token`), and the app reads the synthetic lt1 token from Authorization.
 *   LOADTEST_IDENTITY_SECRET=<from operator, never printed> LOADTEST_ID_TOKEN=<id token> node scripts/loadtestJudgeClient.mjs \
 *     --url https://promptify-judge-loadtest-<hash>-as.a.run.app --users 100 --round 1 --spread-ms 60000 --label alig-spread-100
 * Refuses any URL that is not the load-test service (or loopback for the offline self-test).
 * Writes outputs/loadtest-staging/<label>.json: per-user timings and p50/p95/throughput; integrity is read from SQL
 * afterwards with gcp/loadtest/reset_and_verify.sql (mode=verify).
 */
import {createHmac,createHash} from 'node:crypto';
import fs from 'node:fs';
const arg=(name,def)=>{const i=process.argv.indexOf('--'+name);return i>0?process.argv[i+1]:def;};
const url=String(arg('url','')).replace(/\/+$/,''),users=Number(arg('users',10)),round=Number(arg('round',1)),spread=Number(arg('spread-ms',0)),label=arg('label','run');
const timeoutMs=Number(arg('timeout-ms',300000));
if(!/^https:\/\/promptify-judge-loadtest-[a-z0-9-]+\.a\.run\.app$/.test(url)&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(url))throw Error('Refusing: --url must be the promptify-judge-loadtest Cloud Run URL (or loopback for the self-test)');
// The secret comes from the env or from the operator-only file written by gcp/loadtest/set_secrets.ps1; never printed.
const secretFile=process.env.LOADTEST_IDENTITY_SECRET_FILE;
const secret=(secretFile?fs.readFileSync(secretFile,'utf8'):process.env.LOADTEST_IDENTITY_SECRET||'').trim();if(secret.length<32)throw Error('LOADTEST_IDENTITY_SECRET (>=32 chars) required');
const idToken=process.env.LOADTEST_ID_TOKEN||'';
if(url.startsWith('https://')&&!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(idToken))throw Error('LOADTEST_ID_TOKEN (Google ID token) required: the load-test service is private');
const invokerHeader=idToken?{'X-Serverless-Authorization':'Bearer '+idToken}:{};
if(!(users>=1&&users<=100)||!(round>=1&&round<=6))throw Error('--users 1..100, --round 1..6');
const uuidOf=s=>{const h=createHash('md5').update(s).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const CLASS='7e570000-0000-4000-8000-000000000006',LESSON='7e570000-0000-4000-8000-000000000009';
const exp=Math.floor(Date.now()/1000)+2*3600;
const token=u=>{const uid='loadtest-'+String(u).padStart(3,'0');return `lt1.${uid}.${exp}.${createHmac('sha256',secret).update(`lt1.${uid}.${exp}`).digest('hex')}`;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const started=Date.now();
async function click(u){
 if(spread)await sleep(Math.random()*spread);
 const at=Date.now(),events=[];let http=0,end='none';
 try{
  const res=await fetch(url+'/api/judge-stream',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token(u),...invokerHeader},
   body:JSON.stringify({classId:CLASS,lessonId:LESSON,attemptId:uuidOf('lt-attempt-'+u+'-'+round),language:'vi'}),signal:AbortSignal.timeout(timeoutMs)});
  http=res.status;
  if(!(res.headers.get('content-type')||'').includes('text/event-stream')){end='http'+res.status;await res.text();}
  else{
   const reader=res.body.getReader(),dec=new TextDecoder();let buf='';
   for(;;){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});
    let i;while((i=buf.search(/\r?\n\r?\n/))>=0){const block=buf.slice(0,i);buf=buf.slice(i).replace(/^\r?\n\r?\n/,'');
     const ev=/event: (\w+)/.exec(block)?.[1];if(!ev)continue;const data=JSON.parse(/data: (.*)/.exec(block)?.[1]||'{}');events.push({ev,ms:Date.now()-at,data});end=ev;}}
  }
 }catch(e){end='client_'+(e.name||'error');}
 const first=e=>events.find(x=>x.ev===e)?.ms;
 rows.push({u,http,end,status:first('status'),progress:first('progress'),criterion:first('criterion'),done:first('done'),doneAt:end==='done'?at+first('done'):undefined,total:events.at(-1)?.data?.total,
  statuses:[...new Set(events.filter(e=>e.ev==='status').map(e=>e.data.status))]});
}
await Promise.all(Array.from({length:users},(_,k)=>click(k+1)));
const q=(a,p)=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a[Math.min(a.length-1,Math.ceil(p/100*a.length)-1)]:null;};
const P=k=>({p50:q(rows.map(r=>r[k]),50),p95:q(rows.map(r=>r[k]),95),max:q(rows.map(r=>r[k]),100)});
const done=rows.filter(r=>r.doneAt);
const summary={label,url:url.replace(/\/\/([^.]+)/,'//$1'),users,round,spreadMs:spread,startedAt:new Date(started).toISOString(),
 ends:rows.reduce((m,r)=>{m[r.end]=(m[r.end]||0)+1;return m;},{}),retryWaitSeen:rows.filter(r=>r.statuses.includes('retry_wait')).length,
 latencyMs:{toFirstStatus:P('status'),firstProgress:P('progress'),firstScoredCriterion:P('criterion'),done:P('done')},
 throughput:{completed:done.length,gradesPerMin:done.length?Math.round(10*done.length/((Math.max(...done.map(r=>r.doneAt))-started)/60000))/10:0},rows};
fs.mkdirSync('outputs/loadtest-staging',{recursive:true});fs.writeFileSync(`outputs/loadtest-staging/${label}.json`,JSON.stringify(summary,null,1));
console.log(JSON.stringify({...summary,rows:undefined}));
