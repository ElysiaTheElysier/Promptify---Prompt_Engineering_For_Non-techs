/**
 * Builds the Cloud Run service body for the ISOLATED, PRIVATE load-test service `promptify-judge-loadtest` from the
 * captured staging API service (read-only input) and asserts the isolation invariants. Applies nothing.
 *   node scripts/loadtestServiceSpec.mjs <captured service.json> <image@sha256> > outputs/loadtest-staging/service-spec.json
 * Isolation: own runtime service account (no Vertex/Storage/BigQuery/Firebase roles), own Cloud SQL instance
 * `promptify-loadtest` (the runtime SA cannot reach promptify-staging), own secrets, own queue, OIDC-signed tasks,
 * no allUsers invoker (Cloud Run IAM: task SA + operator only).
 */
import fs from 'node:fs';
const [,,input,image]=process.argv;
const P='ai-transformation-510302';
if(!input||!new RegExp(`^asia-southeast1-docker\\.pkg\\.dev/${P}/promptify-intrepid/app@sha256:[0-9a-f]{64}$`).test(image||''))throw Error('usage: <service.json> <image@sha256>');
const RUN_SA=`promptify-loadtest-run@${P}.iam.gserviceaccount.com`,TASK_SA=`promptify-loadtest-tasks@${P}.iam.gserviceaccount.com`;
const INSTANCE=`${P}:asia-southeast1:promptify-loadtest`,QUEUE=`projects/${P}/locations/asia-southeast1/queues/promptify-judge-loadtest`;
const live=JSON.parse(fs.readFileSync(input,'utf8')),liveEnv=live.template.containers[0].env;
const keep=new Set(['GOOGLE_CLOUD_PROJECT','GEMINI_MODEL','VERTEX_LOCATION','JUDGE_STRATEGY']);
const env=liveEnv.filter(e=>keep.has(e.name)).map(e=>({name:e.name,value:e.value}));
const secret=(name,secretName)=>({name,valueSource:{secretKeyRef:{secret:`projects/${P}/secrets/${secretName}`,version:'latest'}}});
for(const [name,value] of Object.entries({PGHOST:`/cloudsql/${INSTANCE}`,PGDATABASE:'promptify_loadtest',PGUSER:'promptify_runtime',PGPOOL_MAX:'10',
 AI_PROVIDER:'stub',PROVIDER_STUB_ACK:'staging-load-test-only',STUB_CAPACITY:'60',STUB_429_RATE:'0',STUB_HANG_RATE:'0',
 PROVIDER_ADMISSION_MODE:'sql',JUDGE_MODE:'async',JUDGE_STREAM:'true',JUDGE_FENCING_MODE:'sql',JUDGE_QUEUE:QUEUE,
 JUDGE_WORKER_URL:'https://REPLACE-WITH-LOADTEST-SERVICE-URL/',JUDGE_TASK_INVOKER_SA:TASK_SA,GCP_WAREHOUSE_ENABLED:'false',RUNTIME_MODE:'api'}))env.push({name,value});
env.push(secret('PGPASSWORD','promptify-loadtest-db-password'),secret('LOADTEST_IDENTITY_SECRET','promptify-loadtest-identity'));
const t={revision:'promptify-judge-loadtest-r1',serviceAccount:RUN_SA,timeout:'300s',maxInstanceRequestConcurrency:40,scaling:{minInstanceCount:0,maxInstanceCount:5},
 volumes:[{name:'cloudsql',cloudSqlInstance:{instances:[INSTANCE]}}],
 containers:[{image,env,resources:live.template.containers[0].resources,volumeMounts:[{name:'cloudsql',mountPath:'/cloudsql'}],ports:live.template.containers[0].ports}]};
const spec={template:t,ingress:'INGRESS_TRAFFIC_ALL',invokerIamDisabled:false,labels:{purpose:'judge-load-test',data:'synthetic'},
 traffic:[{type:'TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST',percent:100}]};
// Isolation invariants.
const must=(ok,msg)=>{if(!ok)throw Error('isolation check failed: '+msg);};
const byName=Object.fromEntries(env.map(e=>[e.name,e]));
must(t.serviceAccount===RUN_SA&&t.serviceAccount!==live.template.serviceAccount,'dedicated runtime service account');
must(!JSON.stringify(spec).includes(':promptify-staging'),'never mounts or targets the staging SQL instance');
const liveSecrets=liveEnv.filter(e=>e.valueSource).map(e=>e.valueSource.secretKeyRef.secret);
must(env.every(e=>!e.valueSource||!liveSecrets.includes(e.valueSource.secretKeyRef.secret)),'no staging secret is reused');
must(byName.PGDATABASE.value==='promptify_loadtest'&&byName.AI_PROVIDER.value==='stub'&&!byName.GEMINI_API_KEY,'stub + own database, no Gemini key');
must(byName.JUDGE_QUEUE.value===QUEUE&&byName.JUDGE_QUEUE.value!==liveEnv.find(e=>e.name==='JUDGE_QUEUE')?.value,'own queue');
must(byName.JUDGE_TASK_INVOKER_SA.value===TASK_SA,'tasks are OIDC-signed by the task SA');
must(!['WORKSPACE_SOURCE_BINDINGS_JSON','GOOGLE_WORKSPACE_SERVICE_ACCOUNT','GCP_SOP_BUCKET','CORS_ORIGINS'].some(k=>byName[k]),'no Drive/Workspace/SOP bucket/web-app CORS');
must(t.scaling.maxInstanceCount*Number(byName.PGPOOL_MAX.value)<=50,'<= 50 DB connections at max scale');
must(spec.invokerIamDisabled===false,'Cloud Run IAM enforced (private)');
process.stdout.write(JSON.stringify(spec,null,1));
process.stderr.write(`isolation checks passed; SA ${RUN_SA}; SQL ${INSTANCE}; env: ${env.map(e=>e.name+(e.valueSource?'=<secret>':'')).join(', ')}\n`);
