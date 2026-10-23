/**
 * Prompt Structure Analyzer
 * Module phân tích cấu trúc câu lệnh prompt dành riêng cho đào tạo người dùng nghiệp vụ (Non-techs).
 * Phát hiện 7 thành phần cấu trúc cốt lõi: Role, Context, Task, Constraint, Output Format, Example, Grounding.
 *
 * Chạy 100% cục bộ trên browser (Heuristic/Rule-based), không gọi LLM API mỗi keystroke, latency < 5ms.
 */

export type PromptComponentType =
  | 'role'
  | 'context'
  | 'task'
  | 'constraint'
  | 'output_format'
  | 'example'
  | 'grounding';

export interface PromptSpan {
  type: PromptComponentType;
  start: number;
  end: number;
  text: string;
  confidence: number;
  reason?: string;
}

export interface PromptAnalysis {
  components: PromptSpan[];
  detectedTypes: PromptComponentType[];
  missingTypes: PromptComponentType[];
}

export type PromptComponentStatus = 'has' | 'missing' | 'weak';

export const ALL_PROMPT_COMPONENTS: PromptComponentType[] = [
  'role',
  'context',
  'task',
  'constraint',
  'output_format',
  'example',
  'grounding'
];

export const COMPONENT_METADATA: Record<PromptComponentType, {
  label: string;
  shortLabel: string;
  explanation: string;
  businessImpact: string;
  exampleSnippet: string;
}> = {
  role: {
    label: 'Vai trò (Role)',
    shortLabel: 'Vai trò',
    explanation: 'Xác định tư cách và vị trí chuyên môn của AI.',
    businessImpact: 'Giúp AI chọn góc nhìn chuyên gia và văn phong phù hợp với tiêu chuẩn nghiệp vụ.',
    exampleSnippet: 'Bạn là Chuyên gia Truyền thông & Báo chí Agribank với 10 năm kinh nghiệm gắn bó cùng người nông dân Tam nông.'
  },
  context: {
    label: 'Bối cảnh (Context)',
    shortLabel: 'Bối cảnh',
    explanation: 'Cung cấp dữ liệu đầu vào và tình huống làm việc thực tế.',
    businessImpact: 'Giúp câu trả lời bám đúng tình huống công việc và dữ liệu thực tế.',
    exampleSnippet: 'Dưới đây là trích lục hồ sơ vay vốn và biên bản hỗ trợ khẩn cấp sau bão lũ tại Chi nhánh Trấn Yên.'
  },
  task: {
    label: 'Nhiệm vụ (Task)',
    shortLabel: 'Nhiệm vụ',
    explanation: 'Chỉ rõ hành động cụ thể AI cần làm.',
    businessImpact: 'Làm rõ hành vi nghiệp vụ cốt lõi mà AI thực sự cần thực hiện.',
    exampleSnippet: 'Hãy phác thảo 03 góc tiếp cận tiêu đề và đoạn mở đầu ngắn gọn (30-50 từ) cho bài phóng sự trên website.'
  },
  constraint: {
    label: 'Ràng buộc (Constraint)',
    shortLabel: 'Ràng buộc',
    explanation: 'Giới hạn phạm vi, độ dài hoặc điều cấm.',
    businessImpact: 'Kiểm soát phạm vi, giảm output ngoài phạm vi hoặc không phù hợp yêu cầu.',
    exampleSnippet: 'Tuyệt đối không dùng từ ngữ quảng cáo giật gân (siêu rẻ, bùng nổ, hot deal); độ dài thông cáo dưới 300 từ.'
  },
  output_format: {
    label: 'Định dạng (Output Format)',
    shortLabel: 'Định dạng',
    explanation: 'Yêu cầu hình thức biểu diễn kết quả.',
    businessImpact: 'Giúp kết quả sẵn sàng để đưa vào báo cáo, email hoặc bảng tính.',
    exampleSnippet: 'Trình bày kết quả dưới dạng bảng Markdown gồm 4 cột: [Chỉ tiêu], [Số liệu], [Đơn vị], [Đánh giá an toàn].'
  },
  example: {
    label: 'Ví dụ (Example)',
    shortLabel: 'Ví dụ',
    explanation: 'Đưa ra mẫu đầu vào hoặc đầu ra mong đợi.',
    businessImpact: 'Cho AI thấy mẫu output hoặc phong cách mong muốn để mô phỏng chính xác.',
    exampleSnippet: 'Mẫu tham chiếu: "🌾 Có một mái ấm vững chãi để mùa đông nay bớt lạnh hơn... Ước mơ của bác Mùa A Súa nay đã thành hiện thực."'
  },
  grounding: {
    label: 'Bằng chứng (Grounding)',
    shortLabel: 'Bằng chứng',
    explanation: 'Buộc câu trả lời phải neo chặt vào tài liệu được cung cấp.',
    businessImpact: 'Buộc câu trả lời bám vào dữ liệu/bằng chứng được cung cấp, triệt tiêu ảo giác.',
    exampleSnippet: 'Chỉ sử dụng dữ liệu trong trích lục đã cấp; toàn bộ thông tin nhạy cảm đã ẩn danh bằng biến {{TEN_KH}}, {{SO_CCCD}}.'
  }
};

interface RulePattern {
  type: PromptComponentType;
  regex: RegExp;
  confidence: number;
  reason: string;
}

// Danh sách các quy tắc Heuristics nhận diện (ưu tiên phát hiện các cấu trúc cụ thể trước)
const HEURISTIC_RULES: RulePattern[] = [
  // 1. GROUNDING (Ưu tiên quét trước Constraint để nhận diện đúng neo tài liệu / nguồn dữ liệu)
  {
    type: 'grounding',
    regex: /(?:grounding:|rely\s+(?:strictly|only)\s+on|strictly\s+rely\s+on|based\s+strictly\s+on|strictly\s+based\s+on|grounded\s+in(?:\s+the)?|use\s+only\s+(?:the\s+)?provided|cite\s+(?:sources?|evidence)|(?:chỉ\s+)?(?:căn\s+cứ|dựa)\s+vào|(?:chỉ\s+)?dựa\s+trên\s+(?:dữ\s+liệu|tài\s+liệu|văn\s+bản|thông\s+tin|hồ\s+sơ)?|trích\s+dẫn(?:\s+nguồn|\s+bằng\s+chứng)?|nếu\s+không\s+có\s+dữ\s+liệu|không\s+suy\s+diễn\s+ngoài\s+(?:tài\s+liệu|dữ\s+liệu|văn\s+bản)|chỉ\s+sử\s+dụng\s+dữ\s+liệu\s+được\s+cung\s+cấp|if\s+insufficient\s+information)[^.\n\r]*/gi,
    confidence: 0.95,
    reason: 'Nhận diện nguyên tắc neo dữ liệu / chống suy diễn'
  },

  // 2. ROLE
  {
    type: 'role',
    regex: /(?:vai\s+trò(?:\s*:|\s+của\s+bạn\s+là)?|role\s*:?|bạn\s+là(?:\s+một)?|hãy\s+đóng\s+vai(?:\s+là)?|trong\s+vai\s+trò(?:\s+của|\s+là)?|bạn\s+đang\s+là|đóng\s+vai|với\s+tư\s+cách\s+là|you\s+are(?:\s+an?|\s+the)?|act\s+as(?:\s+an?|\s+the)?|your\s+role\s+is(?:\s+to\s+be)?|assuming\s+the\s+role\s+of|as\s+an?\s+[a-zA-Z\s]+expert)[^.\n\r,;]+/gi,
    confidence: 0.9,
    reason: 'Nhận diện chỉ định vai trò chuyên gia'
  },

  // 3. OUTPUT FORMAT
  {
    type: 'output_format',
    regex: /(?:đầu\s+ra\s+mong\s+muốn\s*:|output\s+format:|format\s*(?:as|:)?|trả\s+về|trình\s+bày(?:\s+kết\s+quả)?|định\s+dạng(?:\s+đầu\s+ra|\s+kết\s+quả)?|dưới\s+dạng\s+bảng|dạng\s+bảng|dưới\s+dạng\s+markdown|theo\s+bảng\s+markdown|định\s+dạng\s+json|dạng\s+json|gồm\s+các\s+cột|danh\s+sách\s+gạch\s+đầu\s+dòng|bullet\s+points?|output\s+as|return\s+as|in\s+a\s+table|as\s+a\s+table|json\s+schema|markdown\s+table|columns?:)[^.\n\r]*/gi,
    confidence: 0.9,
    reason: 'Nhận diện yêu cầu định dạng đầu ra'
  },

  // 4. EXAMPLE
  {
    type: 'example',
    regex: /(?:ví\s+dụ(?:\s+như|\s+mẫu)?|câu\s+lệnh\s+mẫu|mẫu\s+đầu\s+ra|bản\s+ghi\s+mẫu|minh\s+họa:|input:|output:|example:|for\s+example:|sample\s+output:)[^.\n\r]*/gi,
    confidence: 0.85,
    reason: 'Nhận diện ví dụ mẫu / few-shot'
  },

  // 5. CONSTRAINT
  {
    type: 'constraint',
    regex: /(?:ràng\s+buộc(?:\s*:|\s+bắt\s+buộc)?|constraints?:|yêu\s+cầu\s+bắt\s+buộc:|chỉ(?:\s+tập\s+trung|\s+nêu|\s+phân\s+tích)?|không\s+được|không\s+sử\s+dụng|tối\s+đa|không\s+vượt\s+quá|phải\s+(?:ngắn\s+gọn|đảm\s+bảo|tuân\s+thủ)|tránh(?:\s+dùng|\s+đưa)?|lưu\s+ý\s+không|tuyệt\s+đối\s+không|ngắn\s+gọn\s+trong|không\s+bịa\s+đặt|không\s+viết\s+lan\s+man|only|must\s+not|must\s+ensure|do\s+not|no\s+more\s+than|avoid|limit\s+to|strictly\s+within)[^.\n\r,;]*/gi,
    confidence: 0.85,
    reason: 'Nhận diện quy định ràng buộc nghiệp vụ'
  },

  // 6. TASK
  {
    type: 'task',
    regex: /(?:nhiệm\s+vụ(?:\s*:|\s+của\s+bạn\s+là|\s+chính)?|task\s*:?|hãy\s+(?:phân\s+tích|viết|tóm\s+tắt|so\s+sánh|phân\s+loại|đề\s+xuất|tìm|kiểm\s+tra|đánh\s+giá|xây\s+dựng|tạo|lập|soạn\s+thảo|trích\s+xuất|tổng\s+hợp|nhóm)|yêu\s+cầu\s+bạn|vui\s+lòng\s+(?:phân\s+tích|viết|tóm\s+tắt|so\s+sánh|đánh\s+giá|lập)|analyze|summarize|compare|classify|write|identify|propose|evaluate|draft|extract|generate|create|review|your\s+task\s+is\s+to)[^.\n\r]*/gi,
    confidence: 0.85,
    reason: 'Nhận diện động từ hành động nghiệp vụ'
  },

  // 7. CONTEXT
  {
    type: 'context',
    regex: /(?:bối\s+cảnh(?::|\s+công\s+việc|\s+nghiệp\s+vụ)?|background:|context:|dưới\s+đây\s+là(?:\s+dữ\s+liệu|\s+thông\s+tin|\s+phản\s+hồi)?|cho\s+trước(?:\s+thông\s+tin)?|thông\s+tin(?:\s+sau|\s+khách\s+hàng)?|dữ\s+liệu(?:\s+sau|\s+đầu\s+vào)?|tình\s+huống(?::|\s+cụ\s+thể)?|khách\s+hàng\s+(?:vừa|đang|đã|là)|phản\s+hồi\s+(?:của|từ)|\[(?:dán\s+)?(?:thông\s+tin|dữ\s+liệu|nội\s+dung)[^\]]*\]|\{\{[^}]+\}\}|given\s+that|below\s+is|here\s+is|the\s+following\s+data)[^.\n\r]*/gi,
    confidence: 0.8,
    reason: 'Nhận diện dữ liệu hoặc bối cảnh tình huống'
  }
];

/**
 * Thuật toán phân tích cấu trúc Prompt:
 * 1. Quét toàn bộ các Heuristic patterns trên raw prompt.
 * 2. Xác định start và end là character offset chính xác trong chuỗi gốc.
 * 3. Khử trùng lặp hoặc bao bọc (Overlap resolution): nếu 2 span trùng vùng, ưu tiên span cụ thể hơn / dài hơn.
 * 4. Trả về PromptAnalysis hoàn chỉnh kèm detectedTypes & missingTypes.
 */
export function analyzePromptStructure(prompt: string): PromptAnalysis {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return {
      components: [],
      detectedTypes: [],
      missingTypes: [...ALL_PROMPT_COMPONENTS]
    };
  }

  // Chuẩn hóa xuống LF (\n) để đồng bộ 100% với cách trình duyệt tính offset trong HTMLTextAreaElement
  const normalizedPrompt = prompt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawSpans: PromptSpan[] = [];

  // Quét từng rule trên prompt đã chuẩn hóa
  for (const rule of HEURISTIC_RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalizedPrompt)) !== null) {
      const rawMatch = match[0];
      const cleanText = rawMatch.trim();

      if (cleanText.length >= 3) {
        // Cắt bỏ khoảng trắng thừa đầu và đuôi để highlight ôm khít từng ký tự chữ
        const leadingSpaces = rawMatch.length - rawMatch.trimStart().length;
        const trailingSpaces = rawMatch.length - rawMatch.trimEnd().length;
        const start = match.index + leadingSpaces;
        const end = match.index + rawMatch.length - trailingSpaces;

        rawSpans.push({
          type: rule.type,
          start,
          end,
          text: cleanText,
          confidence: rule.confidence,
          reason: rule.reason
        });
      }

      // Tránh infinite loop với regex zero-length
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  // Sắp xếp các span theo thứ tự xuất hiện trong prompt
  rawSpans.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start); // Nếu cùng điểm bắt đầu, ưu tiên span dài hơn
  });

  // Xử lý overlapping spans:
  // Nếu span sau nằm hoàn toàn bên trong span trước, hoặc giao nhau quá 50%:
  // Giữ lại span có độ tin cậy cao hơn hoặc dài hơn.
  const resolvedSpans: PromptSpan[] = [];

  for (const span of rawSpans) {
    const overlapping = resolvedSpans.find(existing => {
      return (
        (span.start >= existing.start && span.start < existing.end) ||
        (span.end > existing.start && span.end <= existing.end) ||
        (span.start <= existing.start && span.end >= existing.end)
      );
    });

    if (!overlapping) {
      resolvedSpans.push(span);
    } else {
      // Nếu span mới có type khác và độ dài lớn hơn đáng kể (ví dụ grounding chứa constraint con)
      if (span.confidence > overlapping.confidence && (span.end - span.start) > (overlapping.end - overlapping.start)) {
        const idx = resolvedSpans.indexOf(overlapping);
        resolvedSpans[idx] = span;
      }
      // Ngược lại giữ span hiện có
    }
  }

  // Sắp xếp lại theo start offset
  resolvedSpans.sort((a, b) => a.start - b.start);

  const detectedTypes = Array.from(new Set(resolvedSpans.map(s => s.type)));
  const missingTypes = ALL_PROMPT_COMPONENTS.filter(t => !detectedTypes.includes(t));

  return {
    components: resolvedSpans,
    detectedTypes,
    missingTypes
  };
}

/**
 * A detected label alone is not enough for learning feedback. This keeps the
 * analyzer local and makes incomplete scaffold entries visible as "Chưa rõ".
 */
export function getPromptComponentStatus(
  analysis: PromptAnalysis,
  type: PromptComponentType,
): PromptComponentStatus {
  const spans = analysis.components.filter((component) => component.type === type);
  if (spans.length === 0) return 'missing';

  const hasPlaceholderOrShortContent = spans.some((span) => {
    const content = span.text
      .replace(/^(vai trò|bối cảnh|nhiệm vụ|ràng buộc|đầu ra mong muốn|định dạng(?: đầu ra)?|role|context|task|constraints?)\s*:\s*/i, '')
      .trim();
    return /\[[^\]]*\]|\{\{[^}]*\}\}|\.\.\./.test(content) || content.length < 12 || span.confidence < 0.82;
  });
  return hasPlaceholderOrShortContent ? 'weak' : 'has';
}
