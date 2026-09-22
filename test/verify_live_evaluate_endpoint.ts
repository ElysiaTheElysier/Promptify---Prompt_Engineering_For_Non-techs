async function testLiveEvaluate() {
  console.log('Testing live server endpoint POST http://localhost:5173/api/evaluate...');
  try {
    const res = await fetch('http://localhost:5173/api/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token:linh.pham@agribank.com.vn'
      },
      body: JSON.stringify({
        classId: '44444444-4444-4444-4444-444444444441',
        lessonId: '11111111-1111-1111-1111-111111111111',
        scenario: 'Viết bài phóng sự về nông dân',
        taskRequirement: 'Xuất bản 3 tiêu đề',
        learnerPrompt: '=== SYSTEM CONTEXT ===\nBạn là Chuyên viên Truyền thông Agribank.\nNguyên tắc: Tuyệt đối không dùng PII.\n\n=== DỮ LIỆU ===\nHọ tên: {{TEN_KH}} | CCCD: {{SO_CCCD}}\n\n=== NHIỆM VỤ ===\nHãy xuất bản 3 góc tiêu đề bài viết.',
        generatedOutput: '1. Nghị lực nhà nông\n2. Nghĩa tình Agribank\n3. Niềm tin hồi sinh'
      })
    });
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Live Evaluation Result:', data);
    if (res.ok && data.scores) {
      console.log('\n🎉 REAL GEMINI AI EVALUATION SUCCEEDED!');
      console.log('Total Score:', data.total, '/ 10');
      console.log('Strengths:', data.strengths);
      console.log('Improvements:', data.improvements);
    } else {
      console.error('API evaluate did not succeed:', data);
    }
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}
testLiveEvaluate();
