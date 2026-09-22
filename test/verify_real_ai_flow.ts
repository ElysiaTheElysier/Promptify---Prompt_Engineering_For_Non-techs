import { handleGenerateRequest, handleEvaluateRequest } from '../src/services/apiServerService';
import { mapAiEvaluationToRubricAudit } from '../src/services/llmService';
import { dbService } from '../src/services/dbService';
import { LABS_DATA } from '../src/data/labsData';
import { AiEvaluationResult } from '../src/types/database';

async function runTests() {
  console.log('=== TEST SUITE: REAL AI LEARNING FLOW & EVALUATION ===\n');

  // 1. Test labsData configuration (Learner vs Starter vs Baseline)
  console.log('Test 1: Kiểm tra cấu hình bài học (Starter vs Learner vs Baseline)');
  let passedPlaceholders = 0;
  for (const lab of LABS_DATA) {
    if (lab.promptPlaceholder) {
      passedPlaceholders++;
    }
    // Check that baselinePrompt is preserved for comparison reference
    if (!lab.baselinePrompt) {
      throw new Error(`Lab ${lab.id} thiếu baselinePrompt reference!`);
    }
  }
  console.log(`✓ Tất cả bài tập đã cấu hình scaffold/placeholder (${passedPlaceholders}/${LABS_DATA.length} labs có promptPlaceholder).`);

  // 2. Test apiServerService validation
  console.log('\nTest 2: Kiểm tra validation của Server API endpoints');
  
  // 2.1 handleGenerateRequest with empty prompt
  let genThrew = false;
  try {
    await handleGenerateRequest({ prompt: '   ' });
  } catch (err: any) {
    if (err.message.includes('không được để trống')) {
      genThrew = true;
    }
  }
  if (!genThrew) {
    throw new Error('Generate endpoint không từ chối prompt rỗng!');
  }
  console.log('✓ handleGenerateRequest từ chối prompt rỗng với thông báo lỗi rõ ràng');

  // 2.2 handleEvaluateRequest with empty prompt
  let evalThrew = false;
  try {
    await handleEvaluateRequest({ prompt: '', aiOutput: 'sample' });
  } catch (err: any) {
    if (err.message.includes('không được để trống')) {
      evalThrew = true;
    }
  }
  if (!evalThrew) {
    throw new Error('Evaluate endpoint không từ chối prompt rỗng!');
  }
  console.log('✓ handleEvaluateRequest từ chối prompt rỗng với thông báo lỗi rõ ràng');

  // 3. Test mapAiEvaluationToRubricAudit
  console.log('\nTest 3: Kiểm tra chuyển đổi AiEvaluationResult sang RubricAudit UI');
  const mockAiEval: AiEvaluationResult = {
    total: 8,
    scores: {
      taskCompletion: 2,
      groundedness: 1,
      formatAdherence: 2,
      constraintCompliance: 2,
      businessUsability: 1
    },
    strengths: ['Rõ ràng', 'Đúng cấu trúc'],
    improvements: ['Cần thêm căn cứ số liệu'],
    nextHint: 'Bổ sung bảng phân tích'
  };
  const mappedRubric = mapAiEvaluationToRubricAudit(mockAiEval);
  if (mappedRubric.totalScore !== 80) {
    throw new Error(`Kỳ vọng totalScore = 80, thực tế = ${mappedRubric.totalScore}`);
  }
  if (mappedRubric.taskScore !== 20 || mappedRubric.variableScore !== 10) {
    throw new Error('Chuyển đổi điểm rubric thành phần không chính xác!');
  }
  console.log('✓ Chuyển đổi AiEvaluationResult (0-10) sang RubricAudit (0-100) thành công.');

  // 4. Test Prompt Attempt Persistence (V1 -> V2)
  console.log('\nTest 4: Kiểm tra lưu trữ lịch sử Prompt Attempt (Lần 1 -> Lần 2)');
  const testLearnerId = 'LRN-TEST-999';
  const testClassId = 'CLASS-TEST-001';
  const testLessonId = 'lab-test-ai-01';

  // Lần thử 1
  const attempt1 = await dbService.recordPromptAttempt({
    learner_id: testLearnerId,
    class_id: testClassId,
    lesson_id: testLessonId,
    attempt_number: 1,
    prompt_text: 'Viết báo cáo doanh thu',
    ai_output: 'Báo cáo doanh thu tháng 1...',
    evaluation_json: mockAiEval,
    model: 'gemini-2.5-flash',
    latency_ms: 1200
  });
  if (!attempt1 || attempt1.attempt_number !== 1) {
    throw new Error('Lưu lần thử 1 thất bại!');
  }
  console.log('✓ Đã lưu Lần thử 1 (V1) vào prompt_attempts:', attempt1.id);

  // Lần thử 2
  const attempt2 = await dbService.recordPromptAttempt({
    learner_id: testLearnerId,
    class_id: testClassId,
    lesson_id: testLessonId,
    attempt_number: 2,
    prompt_text: 'Bạn là chuyên viên tài chính. Hãy lập bảng đối chiếu doanh thu 3 quý...',
    ai_output: '| Quý | Doanh thu | So với KH |\n|---|---|---|...',
    evaluation_json: {
      ...mockAiEval,
      total: 10,
      scores: {
        taskCompletion: 2,
        groundedness: 2,
        formatAdherence: 2,
        constraintCompliance: 2,
        businessUsability: 2
      }
    },
    model: 'gemini-2.5-flash',
    latency_ms: 1100
  });
  if (!attempt2 || attempt2.attempt_number !== 2) {
    throw new Error('Lưu lần thử 2 thất bại!');
  }
  console.log('✓ Đã lưu Lần thử 2 (V2) vào prompt_attempts:', attempt2.id);

  // Truy vấn danh sách attempts của bài học
  const attempts = await dbService.getPromptAttempts(testLearnerId, testClassId, testLessonId);
  if (attempts.length < 2) {
    throw new Error(`Kỳ vọng ít nhất 2 attempts, thực tế tìm thấy: ${attempts.length}`);
  }
  if (attempts[0].attempt_number !== 1 || attempts[1].attempt_number !== 2) {
    throw new Error('Thứ tự sắp xếp attempt không đúng!');
  }
  console.log(`✓ Đã truy vấn thành công ${attempts.length} lần thử cho bài ${testLessonId}, phục vụ Compare Mode dữ liệu thật.`);

  console.log('\n=== TẤT CẢ TEST ĐÃ VƯỢT QUA XUẤT SẮC ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
