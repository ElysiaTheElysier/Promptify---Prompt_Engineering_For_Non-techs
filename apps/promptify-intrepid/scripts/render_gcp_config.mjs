import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export function renderConfig(options){
 const {project,region,model,vertexLocation,instance='promptify-staging',database='promptify_db',output='outputs/gcp',secretVersion='1',imageTag='staging',warehouseEnabled=false}=options;
 if(!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project||''))throw Error('Invalid project ID');
 if(!/^[a-z]+-[a-z]+\d+$/.test(region||''))throw Error('Invalid GCP region');
 if(!/^gemini-[a-z0-9.-]*flash[a-z0-9.-]*$/.test(model||''))throw Error('Supply a Gemini Flash model. Pro/Argon are excluded from Generate/Judge. Verify availability at deployment.');
 if(!/^(global|us|eu|[a-z]+-[a-z]+\d+)$/.test(vertexLocation||''))throw Error('Invalid generation endpoint location');
 if(!/^[a-z][a-z0-9-]{0,96}[a-z0-9]$/.test(instance))throw Error('Invalid Cloud SQL instance ID');
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(database))throw Error('Invalid database name');
 if(!/^[1-9][0-9]*$/.test(secretVersion))throw Error('Pin a numeric secret version for repeatable revisions');
 if(!/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/.test(imageTag))throw Error('Invalid image tag');
 if(typeof warehouseEnabled!=='boolean')throw Error('warehouseEnabled must be boolean');
 const folder=path.resolve(output), app=path.resolve('.');
 if(!folder.startsWith(app+path.sep)||!path.relative(app,folder).split(path.sep).includes('outputs'))throw Error('Generated deployment output must stay inside app-local outputs/');
 fs.mkdirSync(folder,{recursive:true});
 const replacements={PROJECT_ID:project,REGION:region,SQL_INSTANCE:instance,promptify_db:database,GENERATION_MODEL:model,GENERATION_LOCATION:vertexLocation,SECRET_VERSION:secretVersion,IMAGE_TAG:imageTag,WAREHOUSE_ENABLED:String(warehouseEnabled)};
 const render=text=>Object.entries(replacements).reduce((s,[key,value])=>s.replaceAll(key,value),text);
 for(const filename of fs.readdirSync('gcp').filter(name=>name.endsWith('.template')))fs.writeFileSync(path.join(folder,filename.replace('.template','')),render(fs.readFileSync('gcp/'+filename,'utf8')));
 const relative=p=>path.relative(folder,path.resolve(p)).replaceAll('\\','/');
 const firebase={hosting:{public:relative('dist'),ignore:['firebase.json','**/.*','**/node_modules/**'],rewrites:[{source:'/api/**',run:{serviceId:'promptify-intrepid-api',region}},{source:'**',destination:'/index.html'}],headers:[{source:'/index.html',headers:[{key:'Cache-Control',value:'no-store'}]}]},firestore:{rules:relative('gcp/firestore.rules'),indexes:relative('gcp/firestore.indexes.json')}};
 fs.writeFileSync(path.join(folder,'firebase.json'),JSON.stringify(firebase,null,2));
 fs.writeFileSync(path.join(folder,'storage-cors.json'),JSON.stringify([{origin:['https://'+project+'.web.app','https://'+project+'.firebaseapp.com'],method:['PUT','GET','HEAD'],responseHeader:['Content-Type','x-goog-if-generation-match'],maxAgeSeconds:3600}],null,2));
 const migrations=fs.readdirSync('gcp/sql').filter(n=>/^\d{3}_[a-z0-9_]+\.sql$/.test(n)).sort().map(file=>({file:'gcp/sql/'+file,sha256:createHash('sha256').update(fs.readFileSync('gcp/sql/'+file)).digest('hex')}));
 if(!migrations.some(m=>m.file.endsWith('004_pgvector_vertex.sql')))throw Error('pgvector/Vertex migration004 is mandatory');
 const manifest={format:1,source:'LOCAL SOURCE; NOT APPLIED',migrations};
 fs.writeFileSync(path.join(folder,'schema-manifest.json'),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(folder,'schema-chain.psql'),'\\set ON_ERROR_STOP on\n'+migrations.map(m=>'\\i '+m.file).join('\n')+'\n');
 const deployment={project,region,api:'promptify-intrepid-api',worker:'promptify-intrepid-worker',instance,database,artifactRepository:'promptify-intrepid',sopBucket:project+'-intrepid-sop-staging',bqLocation:region,generationModel:model,vertexLocation,databaseTier:'db-custom-2-8192',embeddingProvider:'cloudsql',embeddingModel:'text-multilingual-embedding-002',vectorMode:'pgvector',warehouseEnabled,secretVersion,imageTag,requiredCapabilities:['Firebase Hosting','Firebase Auth','Cloud Run API','Cloud Run worker','Cloud SQL','pgvector','google_ml_integration','Vertex','GCS','Firestore','BigQuery','Sheets','Drive','Scheduler'],pending:['User GCP setup','Model/region availability probe','Numeric secret exists','Image digest pinned before release','Cloud SQL staging verification']};
 fs.writeFileSync(path.join(folder,'deployment.json'),JSON.stringify(deployment,null,2));
 const actions=fs.readdirSync(folder).filter(file=>file.endsWith('.sh')).sort().map(file=>({file,executor:'HUMAN USER ONLY',mutatesCloudOrTarget:true,defaultMode:'validate',executeArgument:'--execute'}));
 fs.writeFileSync(path.join(folder,'manual-actions.json'),JSON.stringify({format:1,actions},null,2));
 return {folder,migrationCount:migrations.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flag=name=>process.argv.find(s=>s.startsWith('--'+name+'='))?.slice(name.length+3);
 const [project,region,model,vertexLocation,instance,database]=process.argv.slice(2).filter(s=>!s.startsWith('--'));
 const result=renderConfig({project,region,model,vertexLocation,instance,database,output:flag('output')||'outputs/gcp',secretVersion:flag('secret-version')||'1',imageTag:flag('image-tag')||'staging',warehouseEnabled:flag('warehouse-enabled')==='true'});
 console.log('Prepared '+result.migrationCount+' migrations and local review artifacts in '+result.folder+'. No cloud commands executed; app Firebase source config unchanged. Run node scripts/gcp_preflight.mjs next.');
}
