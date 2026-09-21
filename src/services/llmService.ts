import { ApiConfig, LabStep, PromptRun, RubricAudit } from '../types';

/**
 * Đánh giá chất lượng Prompt theo Rubric Audit từ tài liệu dự án
 * 5 Tiêu chuẩn: Persona, Task, Guardrails, Variables, Output Formatting
 */
export function evaluatePromptRubric(promptText: string): RubricAudit {
  const text = promptText.toLowerCase();
  
  // 1. Persona Clarity (Rõ ràng về vai trò) - max 20
  let personaScore = 5;
  let personaNote = 'Chưa xác định vai trò chuyên môn cụ thể.';
  if (
    text.includes('bạn là') ||
    text.includes('đóng vai trò') ||
    text.includes('persona') ||
    text.includes('vai trò là') ||
    text.includes('role')
  ) {
    if (text.includes('chuyên viên') || text.includes('trưởng') || text.includes('trợ lý') || text.includes('expert') || text.includes('analyst')) {
      personaScore = 20;
      personaNote = 'Tuyệt vời: Đã định vị vai trò chuyên môn chuyên sâu, cung cấp thẩm quyền chuẩn mực.';
    } else {
      personaScore = 14;
      personaNote = 'Khá tốt: Đã có chỉ định vai trò cơ bản nhưng có thể bổ sung thêm kinh nghiệm hoặc phòng ban cụ thể.';
    }
  }

  // 2. Task Specificity (Cụ thể về nhiệm vụ) - max 20
  let taskScore = 8;
  let taskNote = 'Nhiệm vụ còn chung chung, mô hình dễ phỏng đoán sai mục đích.';
  if (
    text.includes('nhiệm vụ') ||
    text.includes('mục tiêu') ||
    text.includes('hãy phân tích') ||
    text.includes('hãy chuyển thể') ||
    text.includes('giải đáp') ||
    text.includes('soạn')
  ) {
    if (text.length > 150) {
      taskScore = 20;
      taskNote = 'Rất tốt: Nhiệm vụ được mô tả chi tiết, rõ mục tiêu đầu ra.';
    } else {
      taskScore = 15;
      taskNote = 'Tốt: Nhiệm vụ rõ ràng, có thể bổ sung thêm bối cảnh sử dụng.';
    }
  }

  // 3. Guardrails & Constraints (Giới hạn & Ràng buộc) - max 20
  let guardrailsScore = 0;
  let guardrailsNote = 'Thiếu ràng buộc tiêu cực hoặc giới hạn hành vi (rất dễ bị AI bịa đặt hoặc văn phong đàm thoại).';
  if (
    text.includes('ràng buộc') ||
    text.includes('tuyệt đối không') ||
    text.includes('không dùng') ||
    text.includes('constraints') ||
    text.includes('nguyên tắc') ||
    text.includes('chỉ dựa trên') ||
    text.includes('lưu ý')
  ) {
    if (text.includes('tuyệt đối') || text.includes('chỉ') || text.includes('không được')) {
      guardrailsScore = 20;
      guardrailsNote = 'Tuyệt vời: Thiết lập hàng rào bảo vệ vững chắc, ngăn chặn ảo giác (hallucination) và từ ngữ cảm tính.';
    } else {
      guardrailsScore = 14;
      guardrailsNote = 'Có ràng buộc nhưng nên bổ sung thêm quy tắc tiêu cực (Negative Prompting).';
    }
  }

  // 4. Variable Parameterization (Tham số hóa biến số) - max 20
  let variableScore = 0;
  let variableNote = 'Các dữ liệu đầu vào đang gắn cứng, chưa đóng gói thành dạng {{biến_số}} để tái sử dụng.';
  if (text.includes('{{') && text.includes('}}')) {
    variableScore = 20;
    variableNote = 'Rất chuyên nghiệp: Đã tham số hóa dữ liệu đầu vào bằng {{variable}} sẵn sàng đóng gói thành Template/Gem.';
  } else if (text.includes('[dán') || text.includes('[đầu vào') || text.includes('<') && text.includes('>')) {
    variableScore = 14;
    variableNote = 'Đã có phân tách dữ liệu đầu vào nhưng nên dùng cú pháp {{tên_biến}} theo chuẩn EdTech.';
  }

  // 5. Output Formatting (Định dạng đầu ra) - max 20
  let formatScore = 5;
  let formatNote = 'Chưa chỉ định khuôn dạng đầu ra cụ thể, kết quả có thể khó tái sử dụng.';
  if (
    text.includes('markdown') ||
    text.includes('bảng') ||
    text.includes('table') ||
    text.includes('định dạng') ||
    text.includes('3 phần') ||
    text.includes('cột') ||
    text.includes('cấu trúc')
  ) {
    if (text.includes('bảng markdown') || (text.includes('|') && text.includes('cột')) || text.includes('phần:')) {
      formatScore = 20;
      formatNote = 'Xuất sắc: Định dạng đầu ra rõ ràng, hỗ trợ copy sang Excel/Email/Báo cáo ngay lập tức.';
    } else {
      formatScore = 15;
      formatNote = 'Đã có yêu cầu định dạng, có thể cụ thể hóa tên từng cột hoặc danh sách mục.';
    }
  }

  const totalScore = personaScore + taskScore + guardrailsScore + variableScore + formatScore;
  
  let actionableAdvice = '';
  if (totalScore >= 80) {
    actionableAdvice = 'Prompt đạt chuẩn cấp độ Chuyên gia! Đầy đủ vai trò, kiểm soát rủi ro và định dạng tối ưu.';
  } else if (totalScore >= 50) {
    actionableAdvice = 'Prompt mức Trung bình khá. Hãy bổ sung thêm các ràng buộc tiêu cực (Không dùng từ cảm tính, Không bịa đặt) và yêu cầu khuôn bảng Markdown.';
  } else {
    actionableAdvice = 'Prompt còn ở mức cơ bản (Zero-shot thô). Cần bổ sung Vai trò (Role), Ràng buộc (Constraints) và mẫu Định dạng cụ thể để AI không suy đoán ngẫu nhiên.';
  }

  return {
    personaScore,
    taskScore,
    guardrailsScore,
    variableScore,
    formatScore,
    totalScore,
    personaNote,
    taskNote,
    guardrailsNote,
    variableNote,
    formatNote,
    actionableAdvice
  };
}

/**
 * Thực thi gọi Prompt (Hỗ trợ cả Mô phỏng Chân thực và Live Gemini API)
 */
export async function executePromptStream(
  promptText: string,
  systemInstruction: string,
  lab: LabStep,
  apiConfig: ApiConfig,
  onChunk: (chunk: string) => void
): Promise<{ output: string; tokenCount: number; latencyMs: number; mode: 'simulated' | 'gemini' }> {
  const startTime = performance.now();

  // Chế độ 1: LIVE GEMINI API (Nếu người dùng nhập Key và chọn Gemini)
  if (apiConfig.mode === 'gemini' && apiConfig.geminiApiKey) {
    try {
      const model = apiConfig.model || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiConfig.geminiApiKey}`;

      const contents = [
        {
          role: 'user',
          parts: [{ text: promptText }]
        }
      ];

      const requestBody: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: apiConfig.temperature ?? 0.3,
          maxOutputTokens: 2048,
        }
      };

      if (systemInstruction && systemInstruction.trim()) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Lỗi (${response.status}): ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullOutput = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.replace('data: ', '').trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (textPart) {
                  fullOutput += textPart;
                  onChunk(fullOutput);
                }
              } catch {
                // Ignore parse errors on partial sse chunks
              }
            }
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const tokenCount = Math.round(fullOutput.length / 4);
      return { output: fullOutput, tokenCount, latencyMs, mode: 'gemini' };
    } catch (err: unknown) {
      console.warn('Lỗi gọi Gemini API, tự động chuyển về Simulated Engine:', err);
      // Fallback to simulated if live API failed
    }
  }

  // Chế độ 2: SIMULATED ENGINE (Mặc định cho trải nghiệm mượt mà, không tốn phí)
  // Xác định xem prompt gần với improvedPrompt hay baselinePrompt
  const isImproved = promptText.length > 250 || 
    promptText.includes('bảng') || 
    promptText.includes('markdown') || 
    promptText.includes('ROLE') || 
    promptText.includes('TASK') ||
    promptText.includes('system_persona');

  const targetOutput = isImproved ? lab.simulatedImprovedOutput : lab.simulatedBaselineOutput;

  // Giả lập streaming từng từ để tạo cảm giác AI đang sinh văn bản thời gian thực
  const words = targetOutput.split(' ');
  let accumulated = '';

  for (let i = 0; i < words.length; i++) {
    accumulated += (i === 0 ? '' : ' ') + words[i];
    onChunk(accumulated);
    // Tốc độ streaming tự nhiên
    const delay = Math.floor(Math.random() * 15) + 12;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const tokenCount = Math.round(targetOutput.length / 3.8);

  return {
    output: targetOutput,
    tokenCount,
    latencyMs,
    mode: 'simulated'
  };
}

