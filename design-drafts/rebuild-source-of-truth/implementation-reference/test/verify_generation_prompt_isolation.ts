import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleGenerateRequest } from '../src/services/apiServerService';

const previousOpenAiKey = process.env.OPENAI_API_KEY;
const previousGeminiKey = process.env.GEMINI_API_KEY;
const previousFetch = globalThis.fetch;
let requestBody: Record<string, unknown> | null = null;

process.env.OPENAI_API_KEY = 'test-server-key';
delete process.env.GEMINI_API_KEY;
globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
  requestBody = JSON.parse(String(init?.body || '{}'));
  return new Response(JSON.stringify({
    output_text: 'Tôi chưa nhận được nhiệm vụ cụ thể.',
    usage: { total_tokens: 12 },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;

try {
  await handleGenerateRequest({
    prompt: 'hi, làm hộ tôi',
    systemInstruction: 'Chỉ thực hiện yêu cầu được viết trong prompt.',
    // Simulate an old client. The server must ignore this hidden lesson context.
    context: 'UI dashboard 80%, review sáng mai',
  } as never);
} finally {
  globalThis.fetch = previousFetch;
  if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousOpenAiKey;
  if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousGeminiKey;
}

assert.ok(requestBody);
assert.equal(requestBody!.input, 'hi, làm hộ tôi');
assert.equal(requestBody!.instructions, 'Chỉ thực hiện yêu cầu được viết trong prompt.');
assert.doesNotMatch(JSON.stringify(requestBody), /UI dashboard 80%/);

const llmService = await readFile('src/services/llmService.ts', 'utf8');
const server = await readFile('src/services/apiServerService.ts', 'utf8');
const composer = await readFile('src/components/prompt/PromptComposer.tsx', 'utf8');
const coach = await readFile('src/components/common/AiCoach.tsx', 'utf8');
const compliance = await readFile('src/services/labComplianceService.ts', 'utf8');

assert.doesNotMatch(llmService, /context:\s*lab\.sampleInputContext/);
assert.doesNotMatch(server, /DỮ LIỆU ĐẦU VÀO \/ NGỮ CẢNH CỐ ĐỊNH/);
assert.match(composer, /promptText === lastEvaluatedPromptText/);
assert.doesNotMatch(composer, /Bổ sung bối cảnh Agribank/);
assert.doesNotMatch(composer, /thẩm định tín dụng khách hàng/);
assert.match(composer, /lab\.expectedOutputFormat/);
assert.match(composer, /lab\.sampleInputContext/);
assert.match(composer, /lab\.taskGoal/);
assert.doesNotMatch(coach, /Chuẩn Agribank|Cán bộ Ngân hàng Agribank|nghiệp vụ ngân hàng thực tế/);
assert.match(coach, /activeLab\.expectedOutputFormat/);
assert.match(coach, /activeLab\.systemInstruction/);
assert.doesNotMatch(compliance, /Chuyên viên Truyền thông & Báo chí Agribank/);
assert.match(compliance, /lab\.taskGoal/);
assert.match(compliance, /lab\.expectedOutputFormat/);

console.log('Generation uses only the learner prompt plus visible system instruction.');
console.log('Evaluation suggestions are scoped to the active lesson and evaluated draft.');
