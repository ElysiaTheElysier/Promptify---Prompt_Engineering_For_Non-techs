import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
// Load-test isolation guards: OIDC-signed Cloud Tasks for a private worker, the least-privilege service spec, and the
// load client's refusals. Offline only; nothing is created in Google Cloud.
process.env.NODE_ENV='test';
const {createJudgeTask}=await import('../src/services/judgeQueueService');

// 1. Cloud Tasks OIDC: absent by default (staging unchanged), present and scoped to the worker origin when configured.
const env={JUDGE_MODE:'async',JUDGE_QUEUE:'projects/p/locations/asia-southeast1/queues/promptify-judge-loadtest',JUDGE_WORKER_URL:'https://promptify-judge-loadtest-abc-as.a.run.app/'};
const task={attemptId:'00000001-0000-4000-8000-000000000001',generation:1,token:'a'.repeat(64)};
let sent:any;const capture=(async(_u:string,init:any)=>{sent=JSON.parse(init.body);return new Response('{}',{status:200});}) as any;
await createJudgeTask(task,env as any,capture,async()=>'t');
assert.equal(sent.task.httpRequest.oidcToken,undefined,'no OIDC unless configured');
await createJudgeTask(task,{...env,JUDGE_TASK_INVOKER_SA:'promptify-loadtest-tasks@ai-transformation-510302.iam.gserviceaccount.com'} as any,capture,async()=>'t');
assert.deepEqual(sent.task.httpRequest.oidcToken,{serviceAccountEmail:'promptify-loadtest-tasks@ai-transformation-510302.iam.gserviceaccount.com',audience:'https://promptify-judge-loadtest-abc-as.a.run.app'});
assert.equal(sent.task.httpRequest.headers['X-Promptify-Judge-Token'],'a'.repeat(64),'per-job token still required by the app');
let calls=0;
await assert.rejects(()=>createJudgeTask(task,{...env,JUDGE_TASK_INVOKER_SA:'someone@gmail.com'} as any,(async()=>{calls++;return new Response('{}');}) as any,async()=>'t'),/Invalid JUDGE_TASK_INVOKER_SA/);
assert.equal(calls,0,'rejected before any Cloud Tasks call');

// 2. Service spec from a captured staging service: dedicated SA/instance/secrets/queue, private, bounded connections.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lt-spec-'));
const live={template:{serviceAccount:'promptify-api@ai-transformation-510302.iam.gserviceaccount.com',containers:[{image:'x',resources:{limits:{cpu:'1000m',memory:'1Gi'}},ports:[{containerPort:8080}],env:[
  {name:'GOOGLE_CLOUD_PROJECT',value:'ai-transformation-510302'},{name:'PGHOST',value:'/cloudsql/ai-transformation-510302:asia-southeast1:promptify-staging'},
  {name:'PGPASSWORD',valueSource:{secretKeyRef:{secret:'projects/ai-transformation-510302/secrets/promptify-runtime-db-password',version:'latest'}}},
  {name:'GEMINI_MODEL',value:'gemini-3.8-flash'},{name:'JUDGE_STRATEGY',value:'parallel-v1'},{name:'JUDGE_QUEUE',value:'projects/ai-transformation-510302/locations/asia-southeast1/queues/promptify-judge-staging'},
  {name:'WORKSPACE_SOURCE_BINDINGS_JSON',value:'{"x":1}'},{name:'CORS_ORIGINS',value:'https://staging.web.app'}]}],volumes:[{name:'cloudsql',cloudSqlInstance:{instances:['ai-transformation-510302:asia-southeast1:promptify-staging']}}]}};
fs.writeFileSync(path.join(dir,'service.json'),JSON.stringify(live));
const image='asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app@sha256:'+'c'.repeat(64);
const run=(args:string[])=>spawnSync(process.execPath,['scripts/loadtestServiceSpec.mjs',...args],{encoding:'utf8'});
const ok=run([path.join(dir,'service.json'),image]);
assert.equal(ok.status,0,ok.stderr);
const spec=JSON.parse(ok.stdout),text=ok.stdout;
assert.equal(spec.template.serviceAccount,'promptify-loadtest-run@ai-transformation-510302.iam.gserviceaccount.com');
assert.ok(!text.includes('promptify-staging')&&!text.includes('promptify-runtime-db-password')&&!text.includes('promptify-judge-staging'),'no staging instance, secret or queue');
assert.ok(!text.includes('WORKSPACE_SOURCE_BINDINGS_JSON')&&!text.includes('CORS_ORIGINS'),'no Drive bindings or web-app CORS');
const envOf=Object.fromEntries(spec.template.containers[0].env.map((e:any)=>[e.name,e.value??e.valueSource.secretKeyRef.secret]));
assert.equal(envOf.AI_PROVIDER,'stub');assert.equal(envOf.PGDATABASE,'promptify_loadtest');assert.equal(envOf.JUDGE_TASK_INVOKER_SA,'promptify-loadtest-tasks@ai-transformation-510302.iam.gserviceaccount.com');
assert.match(envOf.LOADTEST_IDENTITY_SECRET,/secrets\/promptify-loadtest-identity$/,'identity secret only via Secret Manager');
assert.equal(spec.invokerIamDisabled,false,'private: Cloud Run IAM enforced');
assert.ok(spec.template.scaling.maxInstanceCount*Number(envOf.PGPOOL_MAX)<=50);
assert.notEqual(run([path.join(dir,'service.json'),'gcr.io/other/image:latest']).status,0,'only a pinned staging image digest');

// 3. Load client refusals (no network is attempted).
const client=(url:string,extra:Record<string,string>={})=>spawnSync(process.execPath,['scripts/loadtestJudgeClient.mjs','--url',url,'--users','1'],{encoding:'utf8',env:{...process.env,LOADTEST_IDENTITY_SECRET:'x'.repeat(40),LOADTEST_ID_TOKEN:'',...extra}});
assert.match(client('https://promptify-intrepid-api-zmyu4rhkmq-as.a.run.app').stderr,/Refusing/,'never targets the staging API');
assert.match(client('https://promptify-judge-loadtest-abc-as.a.run.app').stderr,/LOADTEST_ID_TOKEN/,'private service needs an operator ID token');
assert.match(client('http://127.0.0.1:1',{LOADTEST_IDENTITY_SECRET:'short'}).stderr,/LOADTEST_IDENTITY_SECRET/);
fs.rmSync(dir,{recursive:true,force:true});
console.log('Load-test isolation PASS: OIDC tasks only when configured (validated SA, worker-origin audience), least-privilege private spec with no staging instance/secret/queue, client refuses staging URL and missing ID token. Offline only.');
