import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleGenerateRequest, handleEvaluateRequest } from '../src/services/apiServerService';
import { normalizePromptFormatting } from '../src/components/lesson/LessonBriefPanel';

// Load environment variables from .env
try {
  const envContent = readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignore if no .env
}

async function runTests() {
  console.log('=== TEST 1: Generation Request Contract & Grounding ===');

  const lesson1InputContext = 'Cuộc họp dự án Orion: 09:00 thứ Sáu, phòng A3; người nhận là nhóm triển khai; cần xác nhận tham dự trước 17:00 thứ Năm.';
  const learnerPrompt = 'Soạn email xác nhận lịch họp gửi nhóm triển khai dự án Orion theo đúng thời gian và địa điểm đã quy định. Yêu cầu RSVP trước hạn chót.';
  const systemInstruction = 'Bạn là trợ lý dự án. Chỉ sử dụng thông tin được cung cấp trong bối cảnh, tuyệt đối không suy diễn dữ kiện ngoài nguồn.';

  console.log('Testing live handleGenerateRequest with inputContext...');
  const genResult = await handleGenerateRequest({
    prompt: learnerPrompt,
    systemInstruction,
    inputContext: lesson1InputContext,
    lessonId: '95000000-0000-4000-8000-000000000001',
    classId: 'TESTER-PE-001',
  });

  assert.ok(genResult.output && genResult.output.length > 50, 'Output must be substantial');
  assert.ok(
    !genResult.output.includes('Đặc tả nguồn chưa cung cấp'),
    'Output must NOT contain technical fallback placeholder'
  );
  assert.ok(
    !genResult.output.includes('[Chế độ Mô phỏng'),
    'Live output must NOT contain simulated disclaimer'
  );
  console.log('✓ Live AI generation produced valid business output:\n', genResult.output.slice(0, 160) + '...\n');

  console.log('=== TEST 2: Evaluation Contract & Identity ===');
  console.log('Testing live handleEvaluateRequest on the generated output...');
  const evalResult = await handleEvaluateRequest({
    lessonId: '95000000-0000-4000-8000-000000000001',
    classId: 'TESTER-PE-001',
    scenario: 'Bạn cần nhờ AI soạn email xác nhận lịch họp dự án dựa trên thông tin được cung cấp.',
    controlData: lesson1InputContext,
    taskRequirement: 'Tự viết prompt nêu rõ nhiệm vụ, bối cảnh và định dạng email ngắn.',
    learnerPrompt,
    generatedOutput: genResult.output,
  });

  assert.ok(typeof evalResult.total === 'number', 'Evaluation must have total score');
  assert.ok(evalResult.total >= 6, `Expected score >= 6/10 for grounded prompt, got ${evalResult.total}/10`);
  assert.ok(evalResult.scores.taskCompletion >= 1, 'taskCompletion must be >= 1');
  assert.ok(evalResult.scores.formatAdherence >= 1, 'formatAdherence must be >= 1');
  assert.ok(evalResult.scores.groundedness >= 1, 'groundedness must be >= 1');
  console.log(`✓ AI Judge successfully scored generated output: ${evalResult.total}/10`);
  console.log('  Scores:', evalResult.scores);

  console.log('=== TEST 3: Reference Prompt Formatting Normalization ===');
  const escapedPrompt = 'Role: Project Coordinator.\\nContext: Orion Project meeting details.\\nTask: Draft a concise confirmation email.\\nConstraints: Under 120 words.';
  const normalized = normalizePromptFormatting(escapedPrompt);
  assert.ok(!normalized.includes('\\n'), 'Literal \\n must be eliminated');
  assert.ok(normalized.includes('\n'), 'True newlines must be present');
  assert.equal(normalized.split('\n').length, 4, 'Must have exactly 4 lines');
  console.log('✓ normalizePromptFormatting correctly converts escaped newlines into real paragraph breaks');

  console.log('=== TEST 4: HybridView Layout & Simulated Safety Assertions ===');
  const hybridCode = readFileSync('src/components/hybrid/HybridView.tsx', 'utf8');
  assert.ok(
    hybridCode.includes('if (result.mode === \'simulated\')'),
    'HybridView must guard against evaluating simulated mode output'
  );
  assert.ok(
    hybridCode.includes('xl:col-span-4') && hybridCode.includes('xl:sticky'),
    'HybridView must have xl:col-span-4 and xl:sticky for side-by-side output panel'
  );
  console.log('✓ HybridView includes simulated safety guard and responsive side-by-side xl layout');

  console.log('\n=== ALL REGRESSION & GROUNDING TESTS PASSED ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
