/** Native PostgreSQL tests: fixed loopback, fresh synthetic DB, no cloud/env URLs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import pg from 'pg';
import {runNativeConcurrency} from '../tests/db-correctness/native_concurrency.mjs';

const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const withoutVector=args.includes('--without-vector');

const portIndex=args.indexOf('--port');
let port=55432;
if(portIndex>=0){
 const rawPort=args[portIndex+1];
 if(!rawPort||!/^(55432|55433)$/.test(rawPort))throw Error('--port requires 55432 or 55433');
 port=Number(rawPort);
}
assert.ok(port===55432||port===55433,'Port must strictly be 55432 or 55433');

const psqlIndex=args.indexOf('--psql');
const psql=psqlIndex>=0?args[psqlIndex+1]:(process.platform==='win32'?path.resolve(app,'../../tmp/intrepid-pg18/pgsql/bin/psql.exe'):'psql');
if(!psql)throw Error('--psql needs an executable path');

const database=`intrepid_synthetic_${Date.now()}_${process.pid}`;
const connection={host:'127.0.0.1',port,user:'postgres',password:'',database:'postgres',ssl:false,connectionTimeoutMillis:5000};
const admin=new pg.Client(connection);
const evidence={database,host:connection.host,port:connection.port,createdAt:new Date().toISOString(),migrations:[],nativePgvector:!withoutVector,googleMlIntegration:'TEST DOUBLE: embedding(text,text) only; Cloud SQL still pending',tests:[]};
const output=path.join(app,'outputs/native-database',database);fs.mkdirSync(output,{recursive:true});
const env={...process.env,PGPASSWORD:'',PGOPTIONS:'',PGSSLMODE:'disable',PGCLIENTENCODING:'UTF8'};
delete env.PGSERVICE;delete env.PGSERVICEFILE;delete env.PGPASSFILE;
let counter=0;

function execute(label,sql){
 const source=path.join(output,`${++counter}-${label}.sql`);fs.writeFileSync(source,sql);
 const result=spawnSync(psql,['-X','-h','127.0.0.1','-p',String(port),'-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-At','-f',source],{cwd:app,encoding:'utf8',env,maxBuffer:20*1024*1024});
 fs.writeFileSync(source+'.stdout.txt',result.stdout||'');fs.writeFileSync(source+'.stderr.txt',result.stderr||'');
 if(result.error||result.status!==0||/^not ok \d+/m.test(result.stdout||''))throw Error(`${label} failed; inspect ${source}.stdout.txt / stderr.txt`);
 return result.stdout||'';
}

try{
 await admin.connect();
 const version=(await admin.query('SHOW server_version_num')).rows[0].server_version_num;
 if(Number(version)<180000||Number(version)>=190000)throw Error('This target suite requires native PostgreSQL 18');
 evidence.serverVersion=version;
 if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[database])).rowCount)throw Error('Refusing an existing database');
 await admin.query(`CREATE DATABASE "${database}"`);
 await admin.query(`COMMENT ON DATABASE "${database}" IS 'Promptify isolated synthetic native test; no real user data'`);
 for(const file of ['001_baseline.sql','002_projection_outbox.sql','003_runtime_role.sql','004_pgvector_vertex.sql','005_department_correction_auto_approval.sql','006_studio_class_scope.sql','007_sop_binding_integrity.sql','008_scoped_progress_rls.sql','009_projection_and_indexing_recovery.sql']){
  const location=path.join(app,'gcp/sql',file);
  if(!fs.existsSync(location))throw Error(`Missing ${file}`);
  let sql=fs.readFileSync(location,'utf8');
  if(file==='003_runtime_role.sql'){
   const role=(await admin.query("SELECT rolcanlogin,rolinherit,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname='promptify_runtime'")).rows[0];
   if(role){if(!role.rolcanlogin||role.rolinherit||role.rolsuper||role.rolcreatedb||role.rolcreaterole||role.rolreplication||role.rolbypassrls)throw Error('Existing local runtime role violates isolation flags');
    execute('runtime-role-membership','GRANT authenticated,service_role TO promptify_runtime;');evidence.migrations.push({file,status:'EXISTING CLUSTER ROLE FLAGS VERIFIED'});continue;}
  }
  if(file==='004_pgvector_vertex.sql'){
   if(withoutVector){evidence.migrations.push({file,status:'SKIPPED: explicit --without-vector; no vector type fake'});continue;}
   execute('native-vector',"CREATE EXTENSION IF NOT EXISTS vector; CREATE FUNCTION public.embedding(text,text) RETURNS real[] LANGUAGE sql AS 'SELECT array_fill(0.1::real,ARRAY[768])';");
   sql=sql.replace('CREATE EXTENSION IF NOT EXISTS google_ml_integration WITH SCHEMA public;','-- Local native test: only proprietary ML call is doubled.');
  }
  execute(file,sql);evidence.migrations.push({file,status:'PASS'});
 }
 execute('pgtap-extension','CREATE EXTENSION IF NOT EXISTS pgtap;');
 const tap=execute('studio-scope-sop',fs.readFileSync(path.join(app,'tests/db-correctness/verify_studio_scope_and_sop.pgtap.sql'),'utf8'));
 evidence.tests.push({file:'verify_studio_scope_and_sop.pgtap.sql',status:'PASS',assertions:(tap.match(/^ok \d+/gm)||[]).length});
 evidence.tests.push({file:'native_concurrency.mjs',...await runNativeConcurrency({...connection,database},fs.readFileSync(path.join(app,'tests/db-correctness/verify_studio_scope_and_sop.pgtap.sql'),'utf8'))});
 console.log(JSON.stringify(evidence,null,2));
}catch(error){evidence.failure=String(error);process.exitCode=1;console.error(evidence.failure);}
finally{await admin.end().catch(()=>{});fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');}
// Synthetic database is retained for debugging; this script never drops a DB.
