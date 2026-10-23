import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import pg from 'pg';
import {loadOrder} from './migration_scope.mjs';
import structure from '../gcp/data-manifest.json' with {type:'json'};
const folder=process.argv.find(x=>x.startsWith('--input='))?.slice(8);
if(!process.argv.includes('--execute')||!process.argv.includes('--empty-target')||!folder||!process.env.TARGET_DATABASE_URL)throw Error('Target-only import requires --execute --empty-target --input=DIR and TARGET_DATABASE_URL. Use migration-owner credentials for an EMPTY staging database.');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8')),tables=new Map(manifest.tables.map(t=>[t.name,t]));
if(manifest.format!==1||manifest.tables.some(t=>!structure.tables[t.name]||t.name==='gcp_identity_bindings'||t.file!==t.name+'.jsonl'))throw Error('Invalid import manifest');
execFileSync(process.execPath,[fileURLToPath(new URL('./check_export_bundle.mjs',import.meta.url)),'--input='+folder],{stdio:'inherit'});
const db=new pg.Client({connectionString:process.env.TARGET_DATABASE_URL});
try{await db.connect();await db.query('BEGIN');await db.query("SET LOCAL TIME ZONE 'UTC'");
 for(const table of Object.keys(structure.tables)){const n=(await db.query(`SELECT count(*)::int n FROM public."${table}"`)).rows[0].n;if(n)throw Error('Target is not empty: '+table);}
 if((await db.query('SELECT count(*)::int n FROM gcp_projection_outbox')).rows[0].n)throw Error('Target outbox is not empty');
 const triggers=(await db.query("SELECT DISTINCT c.relname name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal")).rows;
 for(const t of triggers)await db.query(`ALTER TABLE public."${t.name}" DISABLE TRIGGER USER`);
 for(const table of loadOrder(structure)){const entry=tables.get(table);if(!entry)continue;const raw=fs.readFileSync(path.join(folder,entry.file),'utf8');if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error('Checksum mismatch: '+table);
  const rows=raw.trim()?raw.trim().split('\n').map(line=>JSON.parse(line)):[];if(rows.length!==entry.rows)throw Error('Row count mismatch: '+table);
  for(const row of rows){const columns=Object.keys(row);if(columns.some(c=>!structure.tables[table][c]))throw Error('Unknown import column: '+table);const values=columns.map(c=>structure.tables[table][c]==='jsonb'&&row[c]!==null?JSON.stringify(row[c]):row[c]);await db.query(`INSERT INTO public."${table}" (${columns.map(c=>'"'+c+'"').join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')})`,values);}
 }
 const seq=manifest.sequence;if(!seq||typeof seq.is_called!=='boolean'||!/^\d+$/.test(String(seq.last_value)))throw Error('Invalid sequence manifest');
 // RESTART is transactional, unlike setval; a failed import cannot leave the allocator advanced.
 const maxCode=(await db.query("SELECT coalesce(max(substring(learner_code from '^LRN-([0-9]+)$')::bigint),0)::text n FROM learners")).rows[0].n;
 const sourceNext=BigInt(seq.last_value)+(seq.is_called?1n:0n),targetNext=BigInt(maxCode)+1n;
 const next=sourceNext>targetNext?sourceNext:targetNext;
 if(next<1n||next>9223372036854775807n)throw Error('Sequence range exceeded');
 await db.query('ALTER SEQUENCE public.learner_code_seq RESTART WITH '+next.toString());
 for(const t of triggers)await db.query(`ALTER TABLE public."${t.name}" ENABLE TRIGGER USER`);
 for(const entry of manifest.tables){const n=(await db.query(`SELECT count(*)::int n FROM public."${entry.name}"`)).rows[0].n;if(n!==entry.rows)throw Error('Post-import count mismatch: '+entry.name);}
 await db.query('COMMIT');console.log('Target import committed; original IDs/evidence retained and USER triggers re-enabled. Run reconciliation and projection backfill before switching traffic.');
}catch(error){await db.query('ROLLBACK').catch(()=>{});console.error('Import rolled back: '+error.message);process.exitCode=1;}finally{await db.end();}
