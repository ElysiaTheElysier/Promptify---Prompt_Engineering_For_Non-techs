import assert from 'node:assert/strict';
import fs from 'node:fs';

// Static contracts: a settled request never reuses its idempotency key, so a retry cannot hit a permanent 409.
const read=file=>fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
const app=read('components/rebuild/ProductionApp.tsx');
assert.match(app,/!generated&&cause instanceof ProductRequestError&&!\[0,503,504\]\.includes\(cause\.status\)&&request\.current\?\.id===requestId\)request\.current=undefined/,'Learner Run rotates its request ID after definite failures, preserves it for queued/unknown outcomes');
const studio=read('components/rebuild/ProductionStudioSource.tsx');
assert.match(studio,/const runSandboxTest=\(\)=>\{if\(busy[^}]*\}?[^;]*;request\.current=\{id:crypto\.randomUUID\(\),prompt:sandboxPrompt\};/,'Trainer sandbox uses a fresh request ID per Run');
const roster=read('components/rebuild/ProductionRosterSource.tsx');
assert.match(roster,/if\(!saved\)\{requests\.current\.delete\(id\);return;\}/,'Roster Sync now rotates the request ID after a failed sync');
const server=read('services/productionServerService.ts');
assert.match(server,/update\(\{judge_claim:null\}\)\.eq\('actor_id',c\.profile\.id\)\.eq\('request_id',requestId\)\.eq\('judge_claim',claim\)\.is\('evaluation',null\)/,'Sandbox Judge releases only its own unfinished claim after a settled failure');
const client=read('services/productionClientService.ts');
assert.match(client,/\['judge','generate'\]\.includes\(action\) && response\.status !== 500/,'Run and Judge errors show the curated server reason');
console.log('Retry state contracts PASS: learner Run, trainer sandbox and roster sync never replay a settled key; sandbox Judge releases its claim; server reasons shown. Static only.');
