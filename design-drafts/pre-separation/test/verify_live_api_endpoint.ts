async function testLiveApi() {
  console.log('Testing live server endpoint POST http://localhost:5173/api/generate...');
  try {
    const res = await fetch('http://localhost:5173/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token:linh.pham@agribank.com.vn'
      },
      body: JSON.stringify({
        classId: '44444444-4444-4444-4444-444444444441',
        lessonId: '11111111-1111-1111-1111-111111111111',
        prompt: 'Viết 1 câu chào ngắn gọn 5 từ bằng tiếng Việt.',
        context: 'Ngân hàng Agribank'
      })
    });
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);
    if (res.ok && data.output) {
      console.log('\n🎉 REAL GEMINI API CALL SUCCEEDED!');
      console.log('Model used:', data.model);
      console.log('Latency:', data.latencyMs + 'ms');
      console.log('AI Output:\n' + data.output);
    } else {
      console.error('API call did not succeed:', data);
    }
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}
testLiveApi();
