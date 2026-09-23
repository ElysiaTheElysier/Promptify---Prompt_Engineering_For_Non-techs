import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const auth = await readFile('src/services/apiAuthorizationService.ts', 'utf8');
const server = await readFile('src/services/apiServerService.ts', 'utf8');
const client = await readFile('src/services/llmService.ts', 'utf8');
const app = await readFile('src/App.tsx', 'utf8');
const hybrid = await readFile('src/components/hybrid/HybridView.tsx', 'utf8');
const composer = await readFile('src/components/prompt/PromptComposer.tsx', 'utf8');
const adapter = await readFile('src/services/curriculumAdapter.ts', 'utf8');
const contract = await readFile('src/services/aiEvaluationContract.ts', 'utf8');

assert.ok(!auth.includes('demo-token:'), 'AI authorization must not accept demo-token bypasses');
assert.ok(!client.includes('demo-token:'), 'Client must not manufacture demo bearer tokens');
assert.ok(!app.includes('VITE_GEMINI_API_KEY'), 'No API key may be bundled into the browser');
assert.ok(!server.includes('body.apiKey'), 'Server must not accept provider credentials from request bodies');
assert.ok(!client.includes('apiKey: apiConfig'), 'Client must not transmit stored provider credentials');
assert.ok(!server.includes('Raw response was'), 'Production logs must not include raw Judge responses');
assert.ok(!server.includes('detectPiiEntities'), 'PII detection must not manufacture AI evaluation scores');
assert.ok(!client.includes('evaluatePromptHeuristic'), 'No heuristic AiEvaluationResult fallback may exist');
assert.ok(!contract.includes('extractEvaluationFallback'), 'Malformed Judge output must be rejected');
assert.ok(!contract.includes("strengths.push('Đã"), 'Evaluation feedback must not be fabricated');
assert.ok(!hybrid.includes('setPromptText(currentLab.starterPrompt'), 'Lesson must not prefill a full starter prompt');
assert.ok(!hybrid.includes('setPromptText(currentLab.improvedPrompt'), 'Lesson flow must not inject the solution');
assert.ok(!composer.includes('setPromptText(lab.improvedPrompt'), 'Sample modal must not overwrite learner work');
assert.ok(!composer.includes('setPromptText(lab.baselinePrompt'), 'Baseline prompt must not overwrite learner work');
assert.ok(adapter.includes("improvedPrompt: lesson.improved_prompt || ''"));

const migrations = (await readdir('supabase/migrations')).sort();
const prefixes = migrations.map((name) => name.split('_')[0]);
assert.equal(new Set(prefixes).size, prefixes.length, 'Migration numeric prefixes must be unique');
assert.ok(migrations.includes('010_allow_update_prompt_attempts.sql'));
assert.ok(migrations.includes('011_update_agribank_curriculum.sql'));

console.log('Selective integration safety verification passed.');
