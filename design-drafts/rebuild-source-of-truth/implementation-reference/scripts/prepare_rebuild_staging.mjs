import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Prepare only. Never connects to a database or reads credentials.
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'outputs/rebuild-setup');
mkdirSync(output, { recursive: true });
const files = ['supabase/schema.sql', ...readdirSync(resolve(root, 'supabase/migrations'))
  .filter(name => /^0(0[2-9]|1[0-9]|2[01])_.+\.sql$/.test(name)).sort()
  .map(name => `supabase/migrations/${name}`)];
if (files.length !== 21) throw new Error('Expected schema plus migrations 002–021');
const manifest = files.map(file => {
  const source = readFileSync(resolve(root, file), 'utf8');
  return { file, sha256: createHash('sha256').update(source).digest('hex'), source };
});
const header = `-- ONLY for newly created Promptify-Rebuild: aixhryqzgpptuhstiflx.
-- Contains repository schema, policies and historical curriculum seeds. No production export.
-- One atomic transaction; refuses existing public tables or auth users.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')
     OR EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'STOP: requires a completely empty staging project';
  END IF;
END $$;
`;
const sql = header + manifest.map(({ file, source }) => `\n-- SOURCE: ${file}\n` + source
  .replace(/^\s*(?:BEGIN|COMMIT)\s*;\s*$/gm, '')).join('\n') + `
COMMIT;
SELECT 'REBUILD_SCHEMA_INSTALLED' AS result,
  to_regclass('public.rebuild_runs') AS runs,
  to_regclass('public.trainer_hints') AS hints;
`;
writeFileSync(resolve(output, '01_install_empty_staging.sql'), sql);
writeFileSync(resolve(output, 'source-manifest.json'), JSON.stringify(manifest.map(({ source, ...rest }) => rest), null, 2));
writeFileSync(resolve(output, 'rebuild.env.template'), `# Copy to .env.rebuild.local; fill keys locally, never in chat.
VITE_SUPABASE_URL=https://aixhryqzgpptuhstiflx.supabase.co
SUPABASE_URL=https://aixhryqzgpptuhstiflx.supabase.co
VITE_SUPABASE_ANON_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Prevent inheriting browser AI credentials from the existing .env.
VITE_GEMINI_API_KEY=
VITE_OPENAI_API_KEY=
GEMINI_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=
GEMINI_MODEL=gemini-3-flash-preview
# Start only after setting staging keys: npm run dev -- --mode rebuild
`);
console.log(`Prepared ${files.length} sources (${Buffer.byteLength(sql)} bytes). No database changes made.`);
