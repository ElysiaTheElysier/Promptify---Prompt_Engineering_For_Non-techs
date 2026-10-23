// Operates only on the dedicated rebuild database; never logs credentials.
import fs from 'node:fs';
import { loadEnv } from 'vite';
import { createHash } from 'node:crypto';
const config = loadEnv('rebuild', process.cwd(), '');
const local = {};
for (const line of fs.readFileSync('.env.production-setup.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) local[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const ref = new URL(config.SUPABASE_URL || config.VITE_SUPABASE_URL).hostname.split('.')[0];
if (ref !== 'aixhryqzgpptuhstiflx') throw new Error('Refusing to operate on a different project.');
async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${local.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }), signal: AbortSignal.timeout(50000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Database HTTP ${response.status}: ${String(data.message || data.error || 'rejected').slice(0, 700)}`);
  return data;
}
const [mode, filename, verificationFile] = process.argv.slice(2);
if (mode === '--query') { console.log(JSON.stringify(await query(fs.readFileSync(filename, 'utf8')), null, 2)); }
else if (mode === '--check' || mode === '--apply') {
  if (!/^supabase[\\/]migrations[\\/]\d+_[A-Za-z0-9_]+\.sql$/.test(filename || '')) throw new Error('A migration path is required.');
  const source = fs.readFileSync(filename, 'utf8');
  const version = filename.match(/[\\/](\d+)_/)[1];
  const name = filename.match(/\d+_(.+)\.sql$/)[1];
  const hash = createHash('sha256').update(source).digest('hex');
  const history = await query("select to_regclass('supabase_migrations.schema_migrations') is not null as exists");
  const existing = history[0]?.exists ? await query(`select version from supabase_migrations.schema_migrations where version='${version}'`) : [];
  if (existing.length) { console.log(`Migration ${version} already recorded; no changes made.`); process.exit(0); }
  const body = source.replace(/^\s*BEGIN;\s*$/gmi, '').replace(/^\s*COMMIT;\s*$/gmi, '').replace(/^\s*NOTIFY pgrst[^;]*;\s*$/gmi, '');
  const historySetup = history[0]?.exists ? '' : 'CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[], name text);';
  const verification = verificationFile ? fs.readFileSync(verificationFile, 'utf8') : '';
  const sql = mode === '--check' ? `BEGIN;\n${body}\n${verification}\nROLLBACK;` : `BEGIN;\n${historySetup}\n${body}\n${verification}\nINSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES('${version}','${name}',ARRAY['sha256:${hash}']);\nCOMMIT;\nNOTIFY pgrst,'reload schema';`;
  await query(sql);
  console.log(`Migration ${version}: ${mode === '--check' ? 'transactional dry run passed; rolled back' : 'applied and recorded'}. SHA256 ${hash}`);
} else throw new Error('Use --query file.sql, --check migration.sql or --apply migration.sql.');
