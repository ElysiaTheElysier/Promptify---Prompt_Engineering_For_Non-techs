import { BusinessEvaluation, SavedPromptTemplate } from '../types';

/**
 * Nhận diện các thành phần cấu trúc mà người dùng đã đưa vào prompt
 */
export function detectPromptComponents(promptText: string) {
  const text = promptText.toLowerCase();

  const hasRole = 
    text.includes('bạn là') || 
    text.includes('đóng vai trò') || 
    text.includes('vai trò') || 
    text.includes('chuyên viên') || 
    text.includes('trợ lý') ||
    text.includes('chuyên gia') ||
    text.includes('role');

  const hasContext = 
    text.includes('bối cảnh') || 
    text.includes('ngữ cảnh') || 
    text.includes('tình huống') || 
    text.includes('hồ sơ') || 
    text.includes('khách hàng') ||
    text.includes('dữ liệu') ||
    text.includes('thông tin');

  const hasTask = 
    text.includes('hãy') || 
    text.includes('nhiệm vụ') || 
    text.includes('yêu cầu') || 
    text.includes('phân tích') || 
    text.includes('đánh giá') || 
    text.includes('tóm tắt') || 
    text.includes('soạn thảo') || 
    text.includes('xác định') ||
    text.includes('thực hiện');

  const hasConstraint = 
    text.includes('ràng buộc') || 
    text.includes('tuyệt đối không') || 
    text.includes('không được') || 
    text.includes('chỉ dựa trên') || 
    text.includes('nguyên tắc') || 
    text.includes('lưu ý') || 
    text.includes('giới hạn') || 
    text.includes('không suy đoán') || 
    text.includes('tránh');

  const hasFormat = 
    text.includes('định dạng') || 
    text.includes('bảng') || 
    text.includes('markdown') || 
    text.includes('gạch đầu dòng') || 
    text.includes('cột') || 
    text.includes('danh sách') || 
    text.includes('phần 1') || 
    text.includes('mẫu');

  const hasExample = 
    text.includes('ví dụ') || 
    text.includes('vd:') || 
    text.includes('mẫu:') || 
    text.includes('input:') || 
    text.includes('output:');

  const hasGrounding = 
    text.includes('căn cứ') || 
    text.includes('theo tài liệu') || 
    text.includes('trích dẫn') || 
    text.includes('dựa trên văn bản') || 
    text.includes('số liệu trong');

  return {
    hasRole,
    hasContext,
    hasTask,
    hasConstraint,
    hasFormat,
    hasExample,
    hasGrounding,
  };
}

/**
 * Đánh giá kết quả Output theo 5 tiêu chí Business Evaluation
 * Sử dụng phân tích định lượng và từ khóa rule-based cho V0.1
 */
export function evaluateBusinessMetrics(
  promptText: string, 
  outputText: string, 
  sampleData?: string
): BusinessEvaluation {
  const p = promptText.toLowerCase();
  const o = outputText.toLowerCase();

  // 1. Format Adherence: Kiểm tra output có đúng format mà prompt yêu cầu
  let formatAdherence = true;
  if (p.includes('bảng') || p.includes('table') || p.includes('markdown')) {
    // Phải có định dạng bảng (|---|)
    formatAdherence = outputText.includes('|') && outputText.includes('---');
  } else if (p.includes('gạch đầu dòng') || p.includes('danh sách')) {
    formatAdherence = outputText.includes('- ') || outputText.includes('* ') || outputText.includes('1.');
  } else {
    // Mặc định cần có phân đoạn rõ ràng
    formatAdherence = outputText.length > 50 && outputText.includes('\n');
  }

  // 2. Completeness: Đầy đủ ý chính quan trọng (độ dài trên 100 ký tự và có nhiều đoạn/gạch đầu dòng)
  const completeness = 
    outputText.trim().length >= 120 && 
    (outputText.split('\n').length >= 3 || outputText.includes('|'));

  // 3. Actionability: Có từ ngữ chỉ hành động, giải pháp, khuyến nghị cụ thể
  const actionability = 
    o.includes('khuyến nghị') || 
    o.includes('đề xuất') || 
    o.includes('giải pháp') || 
    o.includes('hành động') || 
    o.includes('bước tiếp theo') ||
    o.includes('kiến nghị') ||
    o.includes('cần làm') ||
    o.includes('phê duyệt') ||
    o.includes('từ chối') ||
    o.includes('chấp thuận');

  // 4. Groundedness: Bám sát dữ liệu/tài liệu gốc đã cung cấp
  let groundedness = true;
  if (sampleData && sampleData.trim().length > 0) {
    // Trích xuất một số số liệu hoặc từ khóa thực tế từ sampleData
    const numbers = sampleData.match(/\d+(?:[.,]\d+)?/g) || [];
    if (numbers.length > 0) {
      // Kiểm tra xem output có nhắc lại ít nhất 1 con số cụ thể trong sample data không
      const matched = numbers.some(num => outputText.includes(num));
      groundedness = matched || o.includes('doanh thu') || o.includes('lợi nhuận') || o.includes('khách hàng');
    }
  }

  // 5. Tone Fit: Văn phong trang trọng, khách quan chuẩn ngân hàng
  const hasUnprofessionalWords = 
    o.includes('tôi nghĩ là') || 
    o.includes('chắc là') || 
    o.includes('xin lỗi tôi là ai') || 
    o.includes('as an ai') ||
    o.includes('haha');
  const toneFit = !hasUnprofessionalWords && outputText.length > 30;

  return {
    formatAdherence,
    completeness,
    actionability,
    groundedness,
    toneFit,
  };
}

/**
 * Dữ liệu Prompt mẫu khởi tạo trong Thư viện SOP Agribank
 */
export const INITIAL_SOP_TEMPLATES: SavedPromptTemplate[] = [
  {
    id: 'sop-1',
    title: 'SOP Thẩm định Báo cáo Tài chính SME',
    businessUseCase: 'Phân tích nhanh kết quả kinh doanh và khả năng trả nợ vay ngắn hạn của DN vừa & nhỏ',
    labId: 'lab-2',
    promptText: `Bạn là Chuyên viên Thẩm định Tín dụng cao cấp tại Agribank.
Nhiệm vụ: Phân tích báo cáo tài chính đính kèm của doanh nghiệp SME.
Nguyên tắc & Ràng buộc:
- Tuyệt đối không suy đoán số liệu ngoài hồ sơ.
- Chỉ ra 3 điểm mạnh và 3 cảnh báo rủi ro thanh khoản.
Định dạng: Bảng Markdown gồm 4 cột: [Chỉ tiêu tài chính | Thực tế năm nay | So với năm trước | Đánh giá rủi ro].`,
    techniqueUsed: 'Structured Prompt (4 Thành phần chuẩn)',
    versionNumber: 2,
    department: 'Khối Tín dụng & Quản trị Rủi ro',
    author: 'Tổ Chuyên gia Tín dụng Agribank',
    createdAt: '2026-09-15',
    isRecommended: true,
    sampleOutputSnippet: '| Chỉ tiêu | Năm nay | So năm trước | Đánh giá |\n| Doanh thu thuần | 45.2 tỷ | +12% | Tăng trưởng ổn định |',
    businessEvaluation: {
      formatAdherence: true,
      completeness: true,
      actionability: true,
      groundedness: true,
      toneFit: true,
    }
  },
  {
    id: 'sop-2',
    title: 'SOP Xử lý Khiếu nại Giao dịch Thẻ & E-Banking',
    businessUseCase: 'Phân loại mức độ khẩn cấp và soạn thư phản hồi chuẩn mực cho khách hàng',
    labId: 'lab-1',
    promptText: `Bạn là Trưởng bộ phận Dịch vụ Khách hàng Agribank.
Nhiệm vụ: Đọc khiếu nại của khách hàng về giao dịch trừ tiền ATM nhưng không nhả tiền.
Ràng buộc:
- Giữ văn phong ân cần, chuyên nghiệp, thể hiện sự đồng cảm sâu sắc.
- Cam kết thời gian tra soát tối đa trong 24 giờ làm việc.
Định dạng:
1. Xác định mức độ ưu tiên (Khẩn cấp / Bình thường)
2. Thư phản hồi gửi khách hàng (dưới 150 từ)
3. Chỉ dẫn nội bộ cho giao dịch viên.`,
    techniqueUsed: 'Zero-shot có Guardrails cảm xúc',
    versionNumber: 3,
    department: 'Ban Truyền thông & Chăm sóc Khách hàng',
    author: 'Trần Thị Mai - Phòng CSKH',
    createdAt: '2026-09-18',
    isRecommended: true,
    sampleOutputSnippet: 'Kính gửi Quý khách, Agribank chân thành cáo lỗi vì sự cố giao dịch vừa qua...',
    businessEvaluation: {
      formatAdherence: true,
      completeness: true,
      actionability: true,
      groundedness: true,
      toneFit: true,
    }
  },
  {
    id: 'sop-3',
    title: 'SOP Tóm tắt Tờ trình Trình duyệt Hạn mức',
    businessUseCase: 'Chuyển thể tờ trình tín dụng 10 trang thành bản tóm tắt 1 trang cho Hội đồng Tín dụng',
    labId: 'lab-5',
    promptText: `Bạn là Thư ký Hội đồng Tín dụng Agribank.
Nhiệm vụ: Rút trích thông tin cốt lõi từ Tờ trình tín dụng đính kèm.
Căn cứ: Chỉ lấy số liệu có trong tờ trình, nghiêm cấm ngoại suy.
Định dạng đầu ra:
- Khách hàng & Ngành nghề:
- Hạn mức đề xuất & Thời hạn:
- Tài sản bảo đảm & Tỷ lệ cấp tín dụng (LTV):
- Nhận xét và Đề xuất của Chi nhánh:`,
    techniqueUsed: 'Grounding & Document Extraction',
    versionNumber: 1,
    department: 'Khối Tín dụng',
    author: 'Nguyễn Văn Hùng - Ban Thẩm định',
    createdAt: '2026-09-20',
    isRecommended: false,
    sampleOutputSnippet: '- Khách hàng: Công ty CP Chế biến Nông sản An Phú\n- Hạn mức: 25 tỷ VNĐ...',
    businessEvaluation: {
      formatAdherence: true,
      completeness: true,
      actionability: true,
      groundedness: true,
      toneFit: true,
    }
  }
];

const SOP_STORAGE_KEY = 'promptify_saved_library';

/**
 * Lấy danh sách các Prompt đã lưu trong thư viện
 */
export function getSavedPromptLibrary(): SavedPromptTemplate[] {
  try {
    const saved = localStorage.getItem(SOP_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Lỗi khi đọc thư viện prompt từ localStorage', err);
  }
  // Mặc định lưu seed data vào localStorage
  localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(INITIAL_SOP_TEMPLATES));
  return INITIAL_SOP_TEMPLATES;
}

/**
 * Lưu một Prompt mới vào Thư viện SOP
 */
export function savePromptToLibrary(item: Omit<SavedPromptTemplate, 'id' | 'createdAt'>): SavedPromptTemplate {
  const current = getSavedPromptLibrary();
  const newItem: SavedPromptTemplate = {
    ...item,
    id: `sop-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
  };
  const updated = [newItem, ...current];
  localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(updated));
  return newItem;
}

/**
 * Bật/tắt trạng thái Khuyên dùng (Recommended)
 */
export function togglePromptRecommended(id: string): SavedPromptTemplate[] {
  const current = getSavedPromptLibrary();
  const updated = current.map(item => 
    item.id === id ? { ...item, isRecommended: !item.isRecommended } : item
  );
  localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export interface LearningInsight {
  promptChanges: string[];
  outputImprovements: {
    beforeDesc: string;
    afterDesc: string;
  };
  whyBetter: string;
  takeaway: string;
  chips: string[];
}

/**
 * Tạo bản tóm tắt học tập trực quan (Learning Insight) cho Compare View
 */
export function generateLearningInsight(
  beforePrompt: string,
  afterPrompt: string,
  beforeOutput: string,
  afterOutput: string,
  labFallback?: { 
    whyBetter?: string; 
    promptChanges?: string[]; 
    outputChanges?: { before: string; after: string } 
  }
): LearningInsight {
  const bComp = detectPromptComponents(beforePrompt);
  const aComp = detectPromptComponents(afterPrompt);

  const chips: string[] = [];
  const promptChanges: string[] = [];

  if (!bComp.hasRole && aComp.hasRole) {
    chips.push('Đã thêm Role');
    promptChanges.push('Bổ sung vai trò chuyên môn cụ thể (Role) để định hình góc nhìn cho AI.');
  }
  if (!bComp.hasContext && aComp.hasContext) {
    chips.push('Đã thêm Context');
    promptChanges.push('Cung cấp thêm ngữ cảnh và dữ liệu hồ sơ thực tế (Context).');
  }
  if (!bComp.hasTask && aComp.hasTask) {
    chips.push('Đã thêm Task');
    promptChanges.push('Làm rõ nhiệm vụ trọng tâm và mục tiêu cần giải quyết (Task).');
  }
  if (!bComp.hasConstraint && aComp.hasConstraint) {
    chips.push('Đã thêm Constraint');
    promptChanges.push('Bổ sung ràng buộc rủi ro và giới hạn không tự suy diễn số liệu (Constraint).');
  }
  if (!bComp.hasFormat && aComp.hasFormat) {
    chips.push('Đã thêm Format');
    promptChanges.push('Yêu cầu định dạng bảng hoặc các gạch đầu dòng rõ ràng (Output Format).');
  }
  if ((!bComp.hasExample && aComp.hasExample) || (!bComp.hasGrounding && aComp.hasGrounding)) {
    chips.push('Đã thêm Căn cứ / Ví dụ');
    promptChanges.push('Bổ sung dữ liệu đối chiếu hoặc ví dụ minh họa mẫu (Example/Evidence).');
  }

  // Nếu không có thay đổi nào được nhận diện tự động, dùng fallback từ lab hoặc mô tả mặc định
  if (promptChanges.length === 0) {
    if (labFallback?.promptChanges && labFallback.promptChanges.length > 0) {
      promptChanges.push(...labFallback.promptChanges);
    } else {
      promptChanges.push('Câu lệnh được cấu trúc chặt chẽ, mạch lạc và súc tích hơn.');
    }
  }

  // Chips kết quả output
  const hasTable = afterOutput.includes('|') && afterOutput.includes('---');
  if (hasTable) {
    chips.push('Bảng dữ liệu chuẩn');
  } else {
    chips.push('Kết quả rõ hơn');
  }

  const beforeDesc = labFallback?.outputChanges?.before || 
    (beforeOutput.length < 150 
      ? 'Câu trả lời ngắn, nhận xét chung chung, thiếu căn cứ số liệu.' 
      : 'Văn bản đàm thoại dài dòng, dàn trải, khó trích xuất thông tin hành động.');

  const afterDesc = labFallback?.outputChanges?.after || 
    (hasTable 
      ? 'Được trình bày thành bảng biểu mạch lạc, tách bạch rõ ràng số liệu và kiến nghị xử lý.' 
      : 'Bố cục phân lớp rõ ràng, có tiêu chí cụ thể và đề xuất hướng xử lý thực tế.');

  const whyBetter = labFallback?.whyBetter || 
    'Khi bạn cung cấp rõ vai trò chuyên gia và yêu cầu cụ thể định dạng (bảng/danh sách), mô hình AI không phải tự đoán mà sẽ tập trung phân tích đúng trọng tâm nghiệp vụ.';

  const takeaway = 
    'Luôn ghi nhớ công thức 4 phần: [Vai trò] + [Ngữ cảnh dữ liệu] + [Nhiệm vụ cụ thể] + [Khuôn mẫu đầu ra mong muốn] trước khi nhấn gửi.';

  return {
    promptChanges,
    outputImprovements: {
      beforeDesc,
      afterDesc
    },
    whyBetter,
    takeaway,
    chips
  };
}

