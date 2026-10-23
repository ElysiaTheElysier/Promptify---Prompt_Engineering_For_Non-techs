import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import pg from 'pg';
import structure from '../gcp/data-manifest.json' with {type:'json'};
import {validateScope,validateRows,unscopedTables,sha256} from './migration_scope.mjs';

const dryRun=process.argv.includes('--dry-run');
if(!process.argv.includes('--approved-full-source')||dryRun===process.argv.includes('--execute'))throw Error('Require --approved-full-source and exactly one of --dry-run / --execute');
const folder=process.argv.find(x=>x.startsWith('--output='))?.slice(9);
if(!folder||fs.existsSync(folder))throw Error('Choose a new --output directory');
for(const key of ['SOURCE_PGHOST','SOURCE_PGUSER','SOURCE_PGPASSWORD'])if(!process.env[key])throw Error('Missing '+key);
pg.types.setTypeParser(1184,x=>x);
const client=new pg.Client({host:process.env.SOURCE_PGHOST,port:5432,database:'postgres',user:process.env.SOURCE_PGUSER,password:process.env.SOURCE_PGPASSWORD,ssl:{ca:fs.readFileSync(process.env.SOURCE_CA_FILE||path.join(os.homedir(),'prod-ca-2021.crt'),'utf8'),rejectUnauthorized:true},connectionTimeoutMillis:15000});
const tables=Object.keys(structure.tables).filter(t=>t!=='gcp_identity_bindings');
const all=new Map();
try{
 await client.connect();
 await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SET LOCAL TIME ZONE 'UTC'");
 const actual=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
 if(actual.length!==tables.length||actual.some(t=>!tables.includes(t)))throw Error('Public table inventory differs from migration manifest; review before export');
 for(const t of tables){
  const count=Number((await client.query(`SELECT count(*) AS n FROM public."${t}"`)).rows[0].n);
  if(count>200000)throw Error('Table exceeds bounded export limit: '+t);
  const rows=(await client.query(`SELECT * FROM public."${t}" ORDER BY ${structure.keys[t].map(k=>'"'+k+'"').join(',')}`)).rows;
  if(rows.length!==count)throw Error('Snapshot row count mismatch: '+t);
  all.set(t,rows);
 }
 const ids=t=>all.get(t).map(r=>r.id);
 const users=ids('users');
 const scope=validateScope({format:1,approvalReference:'User explicitly approved full source migration on 2026-10-15; runtime --approved-full-source',classIds:ids('classes'),clientIds:ids('clients'),courseIds:ids('courses'),userIds:users,includeUnscoped:unscopedTables,userHistory:{product_profile_corrections:users,user_tutorial_progress:users,product_request_budgets:users}});
 validateRows(all,structure,scope);
 const sequence=(await client.query('SELECT last_value,is_called FROM public.learner_code_seq')).rows[0];
 const sourceVersion=(await client.query('SELECT version() AS version')).rows[0].version;
 await client.query('COMMIT');
 const scopeBytes=JSON.stringify(scope,null,2)+'\n';
 const manifest={format:1,scope,scopeApprovalSha256:sha256(scopeBytes),dryRun,sourceVersion,sequence,createdAt:new Date().toISOString(),tables:[],excludedUnscoped:[]};
 const payloads=[];
 for(const [name,rows] of all){const data=rows.map(r=>JSON.stringify(r)).join('\n')+(rows.length?'\n':'');const file=name+'.jsonl';manifest.tables.push({name,file,rows:rows.length,sha256:sha256(data)});payloads.push({file,data});}
 fs.mkdirSync(folder,{recursive:true,mode:0o700});
 if(!dryRun)for(const p of payloads)fs.writeFileSync(path.join(folder,p.file),p.data,{mode:0o600});
 fs.writeFileSync(path.join(folder,'scope-approval.json'),scopeBytes,{mode:0o600});
 fs.writeFileSync(path.join(folder,dryRun?'scope-review.json':'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
 for(const entry of manifest.tables)console.log(entry.name,entry.rows);
 console.log(dryRun?'FULL SOURCE REVIEW PASS; no row files written.':'FULL SOURCE EXPORT COMPLETE; private row files saved locally, source unchanged.');
}catch(error){await client.query('ROLLBACK').catch(()=>{});console.error('Export stopped:',error.message);process.exitCode=1;}finally{await client.end();}
