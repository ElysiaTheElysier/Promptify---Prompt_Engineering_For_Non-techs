// Offline: the renderer never invokes gcloud/Firebase; shell dry-run exits before calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {renderConfig} from './render_gcp_config.mjs';
const hash=file=>fs.existsSync(file)?createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;
const before=['firebase.json','.firebaserc'].map(hash),output='outputs/gcp-offline-test';
const options={project:'demo-intrepid-test',region:'asia-southeast1',model:'gemini-3.8-flash',vertexLocation:'global',output,warehouseEnabled:true,secretVersion:'7',imageTag:'review-20261014'};
assert.throws(()=>renderConfig({...options,model:'gemini-4-argon'}),/Flash/);
assert.throws(()=>renderConfig({...options,secretVersion:'latest'}),/numeric/);
assert.throws(()=>renderConfig({...options,output:'../../tmp/cloud-config'}),/outputs/);
renderConfig(options);
assert.deepEqual(['firebase.json','.firebaserc'].map(hash),before,'Renderer must not silently replace source Firebase configuration');
const files=fs.readdirSync('gcp/sql').filter(n=>/^\d{3}_[a-z0-9_]+\.sql$/.test(n)).sort();
const manifest=JSON.parse(fs.readFileSync(output+'/schema-manifest.json','utf8'));
assert.deepEqual(manifest.migrations.map(m=>path.basename(m.file)),files);
assert.ok(manifest.migrations.some(m=>m.file.includes('004_pgvector_vertex')));
const config=JSON.parse(fs.readFileSync(output+'/firebase.json','utf8'));
assert.equal(path.resolve(output,config.hosting.public),path.resolve('dist'));
assert.equal(path.resolve(output,config.firestore.rules),path.resolve('gcp/firestore.rules'));
const api=fs.readFileSync(output+'/cloudrun-api.yaml','utf8');assert.ok(api.includes("key: '7'")&&api.includes("value: 'true'"));
const run=spawnSync(process.execPath,['scripts/gcp_preflight.mjs','--input='+output],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/bash';
assert.ok(fs.existsSync(bash),'Bash prerequisite missing: shell dry-run cannot be claimed tested');
for(const file of fs.readdirSync(output).filter(n=>n.endsWith('.sh'))){
 const syntax=spawnSync(bash,['-n',output+'/'+file],{encoding:'utf8'});assert.equal(syntax.status,0,syntax.stderr);
 for(const mode of ['--validate','--dry-run']){const r=spawnSync(bash,[output+'/'+file,mode],{encoding:'utf8',env:{...process.env,TARGET_DATABASE_URL:'',INTREPID_CUTOVER_CHECKS_PASSED:''}});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/LOCAL REVIEW ONLY/);}
}
// Hash corruption must block before any user schema execution.
manifest.migrations[0].sha256='0'.repeat(64);fs.writeFileSync(output+'/schema-manifest.json',JSON.stringify(manifest));
const changed=spawnSync(process.execPath,['scripts/gcp_preflight.mjs','--input='+output],{encoding:'utf8'});assert.notEqual(changed.status,0);assert.match(changed.stderr,/hash drift/);
renderConfig(options);
console.log('PASS local GCP render/preflight: immutable source config, complete SQL chain+hashes, Flash-only generation, pinned secrets, BQ retained, Firebase paths, shell syntax and every template validate/dry-run without cloud calls.');
