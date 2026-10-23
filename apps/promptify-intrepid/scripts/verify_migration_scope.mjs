// Explicit offline allowlist entry: synthetic records only, no network or DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import structure from '../gcp/data-manifest.json' with {type:'json'};
import {validateScope,validateRows,assertRowScope,loadOrder,sha256} from './migration_scope.mjs';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const scope=validateScope({format:1,approvalReference:'SYNTHETIC-OFFLINE',classIds:[id(1)],clientIds:[id(2)],courseIds:[id(3)],userIds:[id(4)],userHistory:{product_profile_corrections:[id(4)]}});
assert.throws(()=>validateScope({...scope,classIds:[]}),/class/);
assert.throws(()=>validateScope({...scope,userHistory:{product_request_budgets:[id(99)]}}),/history/);
assert.throws(()=>assertRowScope('classes',{id:id(99)},scope),/Unapproved/);
assert.throws(()=>assertRowScope('product_profile_corrections',{user_id:id(4),source_class_id:id(1),target_class_id:id(99)},scope),/Unapproved/);
assert.throws(()=>assertRowScope('product_audit',{class_id:id(99)},scope),/Unapproved/);
assert.throws(()=>assertRowScope('users',{id:id(99)},scope),/Unapproved/);
assert.throws(()=>validateRows(new Map([['product_request_budgets',[{actor_id:id(4),action:'x',window_start:'2026-01-01',request_count:1}]]]),structure,scope));
const order=loadOrder(structure);assert.equal(order.length,Object.keys(structure.tables).length);
for(const r of structure.relations)if(r.child!==r.parent)assert.ok(order.indexOf(r.parent)<order.indexOf(r.child),r.child+' parent load ordering');
assert.ok(order.indexOf('classes')<order.indexOf('product_profile_corrections'));
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'intrepid-scope-offline-'));
try{
 const tables=[];
 for(const table of Object.keys(structure.tables).filter(t=>t!=='gcp_identity_bindings')){fs.writeFileSync(path.join(folder,table+'.jsonl'),'');tables.push({name:table,file:table+'.jsonl',rows:0,sha256:sha256('')});}
 const manifest={format:1,scope,scopeApprovalSha256:sha256(JSON.stringify(scope)),tables,sequence:{last_value:'1',is_called:false}};
 fs.writeFileSync(path.join(folder,'scope-approval.json'),JSON.stringify(scope));
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest));
 let run=spawnSync(process.execPath,['scripts/check_export_bundle.mjs','--input='+folder],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 run=spawnSync(process.execPath,['scripts/migrate_sop_files.mjs','--input='+folder,'--mode=download','--dry-run'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/no source\/GCP calls/);
 manifest.dryRun=true;fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest));
 run=spawnSync(process.execPath,['scripts/check_export_bundle.mjs','--input='+folder],{encoding:'utf8'});assert.notEqual(run.status,0);assert.match(run.stderr,/dry-run/);
 // Neither validate-only path can open any database without an explicit --execute.
 run=spawnSync(process.execPath,['scripts/import_intrepid_data.mjs','--input='+folder,'--dry-run'],{encoding:'utf8'});assert.notEqual(run.status,0);assert.match(run.stderr,/requires/);
}finally{fs.rmSync(folder,{recursive:true,force:true});}
console.log('PASS migration scope: approved entity boundaries, cross-class correction denial, explicit global histories, topological FK load order, checksum bundle validation and dry-run rejection. Synthetic/offline only.');
