import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const executable='node_modules/dependency-cruiser/bin/dependency-cruiser.mjs';
for(const [entry,kind] of [['src/main.tsx','browser'],['api/cloud-run.ts','server']]){
 const run=spawnSync(process.execPath,[executable,entry,'--config','.dependency-cruiser.cjs','--output-type','json'],{encoding:'utf8',maxBuffer:20*1024*1024});assert.equal(run.status,0,run.stderr);const graph=JSON.parse(run.stdout);
 for(const m of graph.modules){assert.ok(!m.source.includes('supabase'),'Runtime still reaches '+m.source);if(kind==='browser')assert.ok(!/(?:firebase-admin|@google-cloud|(?:^|\/)pg(?:\/|$)|cloudDatabaseService|cloudPostgresService|firebaseServerIdentityService)/.test(m.source),'Server module in browser: '+m.source);}
}
for(const file of ['Dockerfile','.dockerignore','firebase.json','.firebaserc','gcp/firestore.rules','gcp/bigquery.sql.template','gcp/cloudrun-api.yaml.template','gcp/cloudrun-worker.yaml.template','gcp/sql/001_baseline.sql','gcp/sql/002_projection_outbox.sql','gcp/sql/003_runtime_role.sql','gcp/sql/004_pgvector_vertex.sql','gcp/sql/005_department_correction_auto_approval.sql'])assert.ok(fs.statSync(file).size>0,file);
const rule=fs.readFileSync('gcp/firestore.rules','utf8');assert.ok(rule.includes('request.auth.uid == uid')&&rule.includes('allow write: if false'));
for(const file of fs.readdirSync('scripts').filter(x=>x.endsWith('.mjs'))){const r=spawnSync(process.execPath,['--check','scripts/'+file],{encoding:'utf8'});assert.equal(r.status,0,file+' '+r.stderr);}
const manifestRun=spawnSync(process.execPath,['scripts/gcp_preflight.mjs'],{encoding:'utf8'});assert.equal(manifestRun.status,0,manifestRun.stderr+' Render configuration before gcp:verify.');
console.log('GCP bundle PASS: browser/server runtime graphs do not reach Supabase; no server SDKs in browser; deployment files and scripts are present/parseable.');
