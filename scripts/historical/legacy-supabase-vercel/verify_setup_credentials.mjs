// Read-only checks. Never log credentials or upstream response bodies.
import fs from 'node:fs';
import { loadEnv } from 'vite';
const configuration = loadEnv('rebuild', process.cwd(), '');
const filename = '.env.production-setup.local';
const local = {};
if (fs.existsSync(filename)) {
  for (const line of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    local[match[1]] = value;
  }
}
const token = local.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.log('Supabase setup token: missing');
  process.exitCode = 1;
} else {
  const ref = new URL(configuration.SUPABASE_URL || configuration.VITE_SUPABASE_URL).hostname.split('.')[0];
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'select 1 as connection_check' }), signal: AbortSignal.timeout(15000),
    });
    console.log('Supabase database permission check:', response.status);
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.log('Supabase database permission check: unavailable');
    process.exitCode = 1;
  }
}
for (const name of ['GEMINI_API_KEY', 'GOOGLE_SERVICE_ACCOUNT_FILE', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']) {
  console.log(`${name}: ${local[name] ? 'present' : 'missing'}`);
}
