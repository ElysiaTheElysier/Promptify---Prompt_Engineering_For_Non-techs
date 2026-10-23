import assert from 'node:assert/strict';
import fs from 'node:fs';

const scheduler = fs.readFileSync('gcp/05-start-schedulers.sh.template', 'utf8');
const claimSql = fs.readFileSync('../../supabase/migrations/038_product_roster_worker.sql', 'utf8');
const server = fs.readFileSync('src/services/rosterWorkerService.ts', 'utf8');

assert.match(scheduler, /if \[\[ "\$name" == roster \]\]; then\s+schedule='\*\/5 \* \* \* \*'/);
assert.match(scheduler, /else\s+schedule='\* \* \* \* \*'/);
assert.match(scheduler, /--uri="\$\{worker_url\}\/internal\/\$\{name\}"/);
assert.match(scheduler, /--oidc-service-account-email="promptify-scheduler@\$\{project\}\.iam\.gserviceaccount\.com"/);
assert.match(claimSql, /s\.auto_sync AND c\.status IN \('active','upcoming'\) AND u\.auth_provider_id IS NOT NULL/);
assert.match(claimSql, /<now\(\)-interval '15 minutes'/);
assert.match(claimSql, /FOR UPDATE OF s SKIP LOCKED/);
assert.match(server, /for\(let index=0;index<1;index\+\+\)/);
assert.match(server, /if\(claim\.error\)throw new Error\('Worker claim failed\.'\)/);

console.log('Roster schedule contract PASS: five-minute OIDC ticks preserve the 15-minute SQL due gate and one-claim worker bound.');
