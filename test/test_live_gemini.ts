import { handleGenerateRequest, handleEvaluateRequest } from '../src/services/apiServerService';

async function main() {
  console.log('Testing live Gemini call with model: gemini-3.6-flash...');
  
  // 1. Test handleGenerateRequest
  console.log('\n--- 1. Testing handleGenerateRequest ---');
  const genResult = await handleGenerateRequest({
    prompt: 'Viết thông báo ngắn 2 câu gửi khách hàng về bảo trì hệ thống 2h sáng Chủ Nhật.',
    context: 'Ngân hàng Agribank'
  });

  console.log('Success! Latency:', genResult.latency, 'ms');
  console.log('Tokens:', genResult.tokens);
  console.log('Output:\n', genResult.output);

  // 2. Test handleEvaluateRequest
  console.log('\n--- 2. Testing handleEvaluateRequest (AI Judge) ---');
  const evalResult = await handleEvaluateRequest({
    learnerPrompt: 'Bạn là chuyên viên CSKH Agribank. Hãy viết thông báo bảo trì hệ thống ngắn gọn 2 câu, rõ thời gian 2h sáng Chủ Nhật.',
    generatedOutput: genResult.output,
    scenario: 'Thông báo bảo trì hệ thống Agribank',
    taskRequirement: 'Viết thông báo 2 câu, rõ thời gian 2h sáng Chủ Nhật'
  });

  console.log('Success! AI Judge total score (0-10):', evalResult.total);
  console.log('Rubric scores:', JSON.stringify(evalResult.scores, null, 2));
  console.log('Strengths:', evalResult.strengths);
  console.log('Improvements:', evalResult.improvements);
  console.log('Next hint:', evalResult.nextHint);
}

main().catch(err => {
  console.error('Live test failed:', err);
  process.exit(1);
});

