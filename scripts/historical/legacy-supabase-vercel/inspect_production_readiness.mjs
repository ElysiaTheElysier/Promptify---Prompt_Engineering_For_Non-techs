// Read-only readiness inspection. Never prints credentials, user rows or SOP bodies.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';
const configuration = loadEnv('rebuild', process.cwd(), '');
const report = { database: {}, credentials: {}, deployment: {} };
for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'DATABASE_URL'])
  report.credentials[name] = Boolean(configuration[name] || process.env[name]);
const url = configuration.SUPABASE_URL || configuration.VITE_SUPABASE_URL;
const key = configuration.SUPABASE_SERVICE_ROLE_KEY;
if (url && key) {
  const response = await fetch(url + '/rest/v1/', { headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(15000) });
  report.database.http = response.status;
  if (response.ok) {
    const schema = await response.json();
    const routes = Object.keys(schema.paths || {});
    report.database.available = ['users', 'classes', 'lessons', 'prompt_attempts', 'rebuild_runs', 'trainer_hints', 'workshop_messages'].map(name => ({ name, exists: routes.includes('/' + name) }));
    report.database.functions = routes.filter(route => route.startsWith('/rpc/rebuild_')).map(route => route.slice(5));
    fs.mkdirSync('outputs/rebuild-audit', { recursive: true });
    fs.writeFileSync('outputs/rebuild-audit/database-openapi.json', JSON.stringify(schema, null, 2));
  }
}
for (const base of [process.env.LOCALAPPDATA, process.env.APPDATA]) {
  const authPath = path.join(base || '', 'com.vercel.cli', 'Data', 'auth.json');
  if (!fs.existsSync(authPath)) continue;
  const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  if (!auth.token) continue;
  const response = await fetch('https://api.vercel.com/v9/projects?limit=100', { headers: { Authorization: 'Bearer ' + auth.token }, signal: AbortSignal.timeout(15000) });
  report.deployment.http = response.status;
  if (response.ok) {
    const data = await response.json();
    report.deployment.projects = data.projects.filter(p => /promptify/i.test(p.name)).map(p => ({ name: p.name, id: p.id, accountId: p.accountId, repository: p.link?.repo, aliases: p.targets?.production?.alias || [] }));
  }
  break;
}
fs.mkdirSync('outputs/rebuild-audit', { recursive: true });
fs.writeFileSync('outputs/rebuild-audit/production-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
