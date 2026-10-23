// Read-only against existing isolated QA data; no provider calls or data changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {readGenerationTelemetry} from '../src/services/governanceTelemetryService';
const env=loadEnv('rebuild',process.cwd(),'');
const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;
if(new URL(url).hostname!=='aixhryqzgpptuhstiflx.supabase.co')throw Error('Wrong QA project');
const ids=JSON.parse(fs.readFileSync('outputs/rebuild-audit/qa-identities.local.json','utf8')).ids;
const server=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const historic=await readGenerationTelemetry(server,ids.classA,new Date('2026-10-09T16:59:00Z'));
assert.ok(historic.completed>0,'Existing QA generation must be measured');
assert.ok(historic.tokens!==null&&historic.tokens>0);
assert.ok(historic.average_latency_ms!==null&&historic.average_latency_ms>0);
const isolated=await readGenerationTelemetry(server,ids.classB,new Date('2026-10-09T16:59:00Z'));
assert.equal(isolated.completed,0,'Foreign cohort must not inherit QA class A measurements');
fs.writeFileSync('outputs/rebuild-audit/governance-telemetry-live.json',JSON.stringify({historic,isolated},null,2));
console.log('Read-only telemetry QA passed: actual generation measurements, Vietnam day and foreign cohort isolation. No provider calls.');
