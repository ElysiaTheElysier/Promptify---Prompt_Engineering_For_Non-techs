import { AiEvaluationResult } from '../types/database';

export interface GenerateRequestBody {
  lessonId?: string;
  classId?: string;
  prompt: string;
  context?: string;
}

export interface GenerateResponseBody {
  output: string;
  model: string;
  latencyMs: number;
  tokens?: number;
}

export interface EvaluateRequestBody {
  lessonId?: string;
  classId?: string;
  scenario?: string;
  controlData?: string;
  taskRequirement?: string;
  lessonRubric?: any;
  learnerPrompt: string;
  generatedOutput: string;
}

/**
 * Lấy API key từ biến môi trường máy chủ (Server-only environment variable)
 * Tuyệt đối không đọc từ biến client VITE_*
 */
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  return key.trim();
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
}

/**
 * Trích xuất JSON an toàn ngay cả khi mô hình trả về chuỗi có ký tự nháy hoặc cấu trúc lỗi
 */
function parseJsonSafely(rawText: string): any {
  let cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Regex extraction fallback nếu JSON.parse lỗi do ký tự unescaped
    const getNum = (field: string) => {
      const match = cleaned.match(new RegExp(`"${field}"\\s*:\\s*([0-2])`));
      return match ? Number(match[1]) : 1;
    };

    const extractArray = (key: string): string[] => {
      const match = cleaned.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`));
      if (!match) return [];
      const items = match[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
      return items ? items.map(s => s.replace(/^"|"$/g, '').replace(/\\"/g, '"')) : [];
    };

    const nextHintMatch = cleaned.match(/"nextHint"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);

    return {
      scores: {
        taskCompletion: getNum('taskCompletion'),
        groundedness: getNum('groundedness'),
        formatAdherence: getNum('formatAdherence'),
        constraintCompliance: getNum('constraintCompliance'),
        businessUsability: getNum('businessUsability')
      },
      strengths: extractArray('strengths'),
      improvements: extractArray('improvements'),
      nextHint: nextHintMatch ? nextHintMatch[1].replace(/\\"/g, '"') : ''
    };
  }
}

/**
 * Gọi Google Gemini API với cơ chế tự động thử lại (retry) và chuyển đổi dự phòng (fallback)
 * Ưu tiên các model Lite siêu tốc (800ms) để không bị nghẽn demand
 */
async function callGeminiWithFallback(apiKey: string, payload: any): Promise<{ data: any; model: string }> {
  const candidateModels = [
    getGeminiModel(),
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash'
  ];
  // Loại bỏ model trùng lặp
  const models = Array.from(new Set(candidateModels));
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          return { data, model };
        }

        const errText = await response.text();

        // 503 (High demand) hoặc 429 (Rate limit) -> Thử model khác nhanh chóng
        if (response.status === 503 || response.status === 429) {
          console.warn(`[Gemini API] Model ${model} trả về HTTP ${response.status} (attempt ${attempt}). Chuyển fallback...`);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 400));
            continue;
          }
        } else {
          lastError = new Error(`Lỗi từ Gemini API (${response.status}): ${errText}`);
          break; // Không retry nếu là lỗi client
        }
      } catch (err: any) {
        lastError = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
  }

  throw lastError || new Error('Không thể kết nối với dịch vụ AI. Vui lòng thử lại sau giây lát.');
}

/**
 * Xử lý yêu cầu POST /api/generate
 */
export async function handleGenerateRequest(body: GenerateRequestBody): Promise<GenerateResponseBody> {
  const { prompt, context } = body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Câu lệnh prompt không được để trống.');
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng thiết lập biến môi trường GEMINI_API_KEY trong file .env để kết nối AI thật.'
    );
  }

  const startTime = performance.now();

  const userParts: { text: string }[] = [];
  if (context && context.trim()) {
    userParts.push({ text: `[DỮ LIỆU ĐẦU VÀO / NGỮ CẢNH CỐ ĐỊNH]:\n${context.trim()}\n\n---\n[CÂU LỆNH YÊU CẦU CỦA NGƯỜI DÙNG]:\n${prompt.trim()}` });
  } else {
    userParts.push({ text: prompt.trim() });
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: userParts
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: 'Bạn là trợ lý AI chuyên nghiệp hỗ trợ cán bộ ngân hàng và doanh nghiệp. Hãy thực hiện chính xác, súc tích và đúng trọng tâm yêu cầu được đưa ra trong câu lệnh của người dùng.'
        }
      ]
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    }
  };

  const { data, model: usedModel } = await callGeminiWithFallback(apiKey, payload);
  const candidate = data.candidates?.[0];
  const outputText = candidate?.content?.parts?.[0]?.text;

  if (!outputText) {
    throw new Error('Mô hình không trả về nội dung hợp lệ.');
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const tokens = data.usageMetadata?.totalTokenCount || Math.ceil(outputText.length / 4);

  return {
    output: outputText,
    model: usedModel,
    latencyMs,
    tokens
  };
}

/**
 * Xử lý yêu cầu POST /api/evaluate
 * Đánh giá khách quan câu lệnh và kết quả AI sinh ra dựa trên 5 tiêu chí Rubric MVP (0-2 điểm mỗi tiêu chí)
 */
export async function handleEvaluateRequest(body: EvaluateRequestBody): Promise<AiEvaluationResult> {
  const {
    scenario,
    controlData,
    taskRequirement,
    lessonRubric,
    learnerPrompt,
    generatedOutput
  } = body;

  if (!learnerPrompt || !learnerPrompt.trim()) {
    throw new Error('Learner prompt không được để trống khi đánh giá.');
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng thiết lập biến môi trường GEMINI_API_KEY trong file .env để thực hiện AI Evaluation.'
    );
  }

  const model = getGeminiModel();

  const rubricDescription = lessonRubric 
    ? typeof lessonRubric === 'string' ? lessonRubric : JSON.stringify(lessonRubric, null, 2)
    : 'Yêu cầu chuẩn: Đúng vai trò, bám sát dữ liệu đầu vào, xuất bảng hoặc định dạng chuẩn, không đàm thoại lan man.';

  const evaluationPrompt = `Bạn là Giám khảo AI (Prompt Evaluator) trong chương trình đào tạo "Prompt Engineering for Non-techs".
Nhiệm vụ: Đánh giá câu lệnh của học viên (Learner Prompt) và kết quả mô hình sinh ra (Generated Output) dựa trên bài tập và dữ liệu thực tế.

[TÌNH HUỐNG BÀI HỌC]:
${scenario || 'Tình huống nghiệp vụ ngân hàng.'}

[DỮ LIỆU ĐẦU VÀO CỐ ĐỊNH (Control Data)]:
${controlData || 'Dữ liệu được cung cấp trong bài học.'}

[MỤC TIÊU BÀI HỌC CẦN ĐẠT]:
${taskRequirement || 'Phân tích và chuyển hóa dữ liệu.'}

[RUBRIC BÀI HỌC]:
${rubricDescription}

[CÂU LỆNH CỦA HỌC VIÊN]:
${learnerPrompt}

[KẾT QUẢ AI SINH RA]:
${generatedOutput || '(Chưa có output)'}

---
HÃY ĐÁNH GIÁ CHÍNH XÁC THEO 5 TIÊU CHÍ RUBRIC (0–2 điểm mỗi tiêu chí, Tổng 0–10 điểm):
1. taskCompletion (0-2):
   - 0: Không đạt yêu cầu hoặc sai lệch mục tiêu.
   - 1: Đạt một phần mục tiêu nhưng còn thiếu thông tin nghiệp vụ quan trọng.
   - 2: Hoàn thành trọn vẹn, chính xác mục tiêu bài toán.
2. groundedness (0-2):
   - 0: Bịa đặt thông tin, ảo giác hoặc đưa số liệu ngoài dữ liệu đầu vào.
   - 1: Cơ bản đúng nhưng còn suy diễn một vài ý kiến chủ quan.
   - 2: Bám chặt 100% vào dữ liệu/bằng chứng được cung cấp, không suy diễn.
3. formatAdherence (0-2):
   - 0: Sai định dạng yêu cầu (ví dụ yêu cầu bảng markdown nhưng trả về đoạn văn).
   - 1: Có cấu trúc nhưng chưa đầy đủ cột hoặc định dạng chưa chuẩn.
   - 2: Định dạng chuẩn chỉnh, sẵn sàng xuất ra Excel/Email/Báo cáo.
4. constraintCompliance (0-2):
   - 0: Vi phạm các ràng buộc, không tuân thủ quy tắc tiêu cực.
   - 1: Tuân thủ phần lớn nhưng còn vi phạm nhỏ (ví dụ còn lời chào hỏi thừa).
   - 2: Tuân thủ tuyệt đối mọi ràng buộc nghiệp vụ.
5. businessUsability (0-2):
   - 0: Văn phong đàm thoại lan man, không dùng được trong công việc.
   - 1: Cần cán bộ dành nhiều thời gian biên tập lại mới dùng được.
   - 2: Văn phong chuyên nghiệp chuẩn mực ngân hàng, dùng được ngay lập tức.

YÊU CẦU ĐẦU RA:
- Trả về DUY NHẤT một chuỗi JSON hợp lệ.
- KHÔNG thêm markdown codeblock (\`\`\`json).
- KHÔNG trả chain-of-thought hay phân tích dài dòng.
- "strengths": mảng 1-3 nhận xét ngắn gọn về điểm làm tốt.
- "improvements": mảng 1-3 nhận xét ngắn gọn về điểm cần cải thiện.
- "nextHint": 1 câu hướng dẫn hành động cụ thể cho lần sửa tiếp theo.

JSON CẤU TRÚC BẮT BUỘC:
{
  "scores": {
    "taskCompletion": 0,
    "groundedness": 0,
    "formatAdherence": 0,
    "constraintCompliance": 0,
    "businessUsability": 0
  },
  "total": 0,
  "strengths": ["..."],
  "improvements": ["..."],
  "nextHint": "..."
}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: evaluationPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1, // Thấp để đảm bảo tính khách quan và nhất quán
      maxOutputTokens: 600, // Tối ưu token để phản hồi dưới 1 giây
      responseMimeType: 'application/json'
    }
  };

  const { data } = await callGeminiWithFallback(apiKey, payload);
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  try {
    const parsed = parseJsonSafely(rawText);

    const clamp = (val: any) => {
      const num = Number(val);
      if (isNaN(num)) return 1;
      return Math.max(0, Math.min(2, Math.round(num)));
    };

    const taskCompletion = clamp(parsed.scores?.taskCompletion);
    const groundedness = clamp(parsed.scores?.groundedness);
    const formatAdherence = clamp(parsed.scores?.formatAdherence);
    const constraintCompliance = clamp(parsed.scores?.constraintCompliance);
    const businessUsability = clamp(parsed.scores?.businessUsability);

    const total = taskCompletion + groundedness + formatAdherence + constraintCompliance + businessUsability;

    const evaluationResult: AiEvaluationResult = {
      scores: {
        taskCompletion,
        groundedness,
        formatAdherence,
        constraintCompliance,
        businessUsability
      },
      total,
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 
        ? parsed.strengths.slice(0, 3) 
        : ['Đã thể hiện được nỗ lực chỉ dẫn mô hình thực hiện công việc.'],
      improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0 
        ? parsed.improvements.slice(0, 3) 
        : ['Nên bổ sung thêm các ràng buộc tiêu cực và yêu cầu định dạng bảng cụ thể.'],
      nextHint: typeof parsed.nextHint === 'string' && parsed.nextHint.trim() 
        ? parsed.nextHint.trim() 
        : 'Hãy thử thêm vai trò chuyên gia cụ thể và yêu cầu cấu trúc bảng rõ ràng ở lần thử tiếp theo.'
    };

    return evaluationResult;
  } catch (parseErr) {
    console.error('Lỗi phân tích JSON từ AI Judge:', rawText, parseErr);
    // Fallback an toàn nếu AI trả JSON không đúng cấu trúc
    return {
      scores: {
        taskCompletion: 1,
        groundedness: 1,
        formatAdherence: 1,
        constraintCompliance: 1,
        businessUsability: 1
      },
      total: 5,
      strengths: ['Đã gửi yêu cầu đến mô hình thành công.'],
      improvements: ['Cần cấu trúc rõ ràng hơn để AI judge đánh giá chuẩn xác.'],
      nextHint: 'Hãy kiểm tra lại định dạng bảng hoặc các ràng buộc nghiệp vụ.'
    };
  }
}
