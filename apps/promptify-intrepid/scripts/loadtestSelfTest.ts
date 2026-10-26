/**
 * OFFLINE rehearsal of the staging load-test service over real HTTP: the production server (startCloudServer) with the
 * load-test environment (NODE_ENV=production, staging project + stub ack, AI_PROVIDER=stub, PGDATABASE=promptify_loadtest,
 * runtime DB user, load-test identity) against a LOOPBACK PostgreSQL seeded by gcp/loadtest/setup_loadtest_db.sql, then
 * scripts/loadtestJudgeClient.mjs against it. Judge runs synchronously here because async mode would call Cloud Tasks;
 * the async queue path is covered by scripts/judgeLatencyHarness.ts. No Gemini, Firebase, Cloud Tasks or Cloud SQL calls.
 *   node node_modules/tsx/dist/cli.mjs scripts/loadtestSelfTest.ts [users=20]
 */
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
const users=Number(process.argv[2]||20),port=18099,secret=randomBytes(24).toString('hex');
Object.assign(process.env,{NODE_ENV:'production',PORT:String(port),RUNTIME_MODE:'api',GOOGLE_CLOUD_PROJECT:'ai-transformation-510302',
 PROVIDER_STUB_ACK:'staging-load-test-only',AI_PROVIDER:'stub',STUB_CAPACITY:'60',GEMINI_MODEL:'gemini-3.8-flash',JUDGE_STRATEGY:'parallel-v1',
 JUDGE_STREAM:'true',PGHOST:'127.0.0.1',PGPORT:'55433',PGDATABASE:'promptify_loadtest',PGUSER:'promptify_runtime',PGPASSWORD:'local-trust',PGPOOL_MAX:'10',
 LOADTEST_IDENTITY_SECRET:secret,GCP_WAREHOUSE_ENABLED:'false'});
for(const k of ['JUDGE_MODE','JUDGE_QUEUE','JUDGE_WORKER_URL','GEMINI_API_KEY','PROVIDER_ADMISSION_MODE','CORS_ORIGINS','DATABASE_URL'])delete process.env[k];
const {startCloudServer}=await import('../src/services/cloudRunServer');
const {closeSqlPool}=await import('../src/services/cloudPostgresService');
const server=startCloudServer();
await new Promise(r=>server.once('listening',r));
// A real Google-style token is refused without reaching Firebase? Only lt1 tokens are exercised here; check a forged one.
const forged=await fetch(`http://127.0.0.1:${port}/api/judge-stream`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer lt1.loadtest-001.9999999999.'+'0'.repeat(64)},
 body:JSON.stringify({classId:'7e570000-0000-4000-8000-000000000006',lessonId:'7e570000-0000-4000-8000-000000000009',attemptId:'00000000-0000-4000-8000-000000000000'})});
console.log('forged token ->',forged.status);
// Async child: this process keeps serving HTTP while the client runs.
const client=await new Promise<{status:number|null;out:string}>(resolve=>{
 const child=spawn(process.execPath,['scripts/loadtestJudgeClient.mjs','--url',`http://127.0.0.1:${port}`,'--users',String(users),'--round','1','--label','selftest-local'],{env:{...process.env,LOADTEST_IDENTITY_SECRET:secret}});
 let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);child.on('exit',status=>resolve({status,out}));
});
console.log('client exit',client.status,client.out.trim().slice(-2500));
server.close();await closeSqlPool();process.exit(forged.status===401&&client.status===0?0:1);
