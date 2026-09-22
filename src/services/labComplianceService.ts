/**
 * Lab Compliance & PII Sanitizer Service
 * 
 * Kiểm tra tính tuân thủ bảo mật và đặc tả riêng cho từng bài Lab:
 * - Lab 01: Zero-tolerance PII Leakage Detection (CCCD, SĐT, STK, Tên riêng, Sổ đỏ)
 * - Lab 02: Negative keywords & Tam Nông context
 * - Lab 03: Multistep CoT reasoning steps
 * - Lab 04: ReAct pattern (Thought -> Action -> Observation)
 * - Lab 05: Deterministic parameters & sampling
 * - Lab 06: Delimiter tags & Markdown table schemas
 * - Lab 07: Prompt injection defense & override lock
 * - Lab 08: Step-back question & abstraction
 *
 * Cung cấp:
 * 1. Hàm phát hiện PII (detectPiiEntities)
 * 2. Hàm Bút xóa PII 1-chạm (sanitizePii)
 * 3. Bộ chẩn đoán tuân thủ theo từng bài lab (auditLabCompliance)
 * 4. Thư viện gợi ý hoàn thiện Tabnine-style & Auto-Fix theo đặc tả
 */

import { LabStep } from '../types';

export interface PiiDetectionResult {
  hasPii: boolean;
  piiItems: Array<{
    type: 'cccd' | 'phone' | 'bank_account' | 'person_name' | 'contract_id' | 'serial_id';
    label: string;
    value: string;
  }>;
  summary: string;
}

export interface LabComplianceAudit {
  isCompliant: boolean;
  isRedCard: boolean; // Thẻ đỏ: vi phạm bảo mật nghiêm trọng (như rò rỉ PII ở Lab 1)
  redCardReason?: string;
  violations: string[];
  suggestions: string[];
  autoFixAvailable: boolean;
  autoFixSnippet?: string;
  autoFixActionName?: string;
}

/**
 * 1. QUÉT & PHÁT HIỆN THÔNG TIN PII (PERSONALLY IDENTIFIABLE INFORMATION)
 */
export function detectPiiEntities(text: string): PiiDetectionResult {
  if (!text || typeof text !== 'string') {
    return { hasPii: false, piiItems: [], summary: 'Không có dữ liệu.' };
  }

  const items: PiiDetectionResult['piiItems'] = [];

  // A. Số CCCD (12 chữ số liên tiếp)
  const cccdRegex = /\b\d{12}\b/g;
  let match: RegExpExecArray | null;
  while ((match = cccdRegex.exec(text)) !== null) {
    items.push({
      type: 'cccd',
      label: 'Số CCCD (12 số)',
      value: match[0]
    });
  }

  // B. Số điện thoại Việt Nam (0912.345.678 hoặc 09xxxxxxxx hoặc +84xxxxxxxxx)
  const phoneRegex = /\b(0\d{3}[.\s]?\d{3}[.\s]?\d{3}|(0|\+84)\d{9,10})\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    // Tránh nhầm với số tiền nếu không phải dạng số điện thoại
    const val = match[0];
    if (val.replace(/\D/g, '').length >= 10 && val.replace(/\D/g, '').length <= 11) {
      items.push({
        type: 'phone',
        label: 'Số điện thoại',
        value: val
      });
    }
  }

  // C. Số tài khoản ngân hàng / Hợp đồng tín dụng (VD: 7800.205.123456 hoặc HĐTD-2024-TY-889)
  const bankAccRegex = /\b\d{4}[.\s]\d{3}[.\s]\d{6}\b/g;
  while ((match = bankAccRegex.exec(text)) !== null) {
    items.push({
      type: 'bank_account',
      label: 'Số tài khoản ngân hàng',
      value: match[0]
    });
  }

  const contractRegex = /\b(HĐTD[-_A-Z0-9]+|HĐ[-_A-Z0-9]+)\b/gi;
  while ((match = contractRegex.exec(text)) !== null) {
    items.push({
      type: 'contract_id',
      label: 'Mã hợp đồng tín dụng',
      value: match[0]
    });
  }

  // D. Tên riêng khách hàng thật trong dữ liệu trích lục mẫu
  const specificNames = [
    { name: 'Nguyễn Văn Tèo', label: 'Tên khách hàng' },
    { name: 'Lê Thị Mận', label: 'Tên người liên quan (vợ)' },
    { name: 'BS 123456', label: 'Số seri Sổ đỏ GCN QSDĐ' }
  ];

  for (const { name, label } of specificNames) {
    if (text.includes(name)) {
      items.push({
        type: name === 'BS 123456' ? 'serial_id' : 'person_name',
        label,
        value: name
      });
    }
  }

  const uniqueItems = items.filter((item, idx, self) => 
    idx === self.findIndex(t => t.value === item.value)
  );

  return {
    hasPii: uniqueItems.length > 0,
    piiItems: uniqueItems,
    summary: uniqueItems.length > 0 
      ? `Phát hiện ${uniqueItems.length} thông tin định danh cá nhân (PII): ${uniqueItems.map(i => `${i.label} "${i.value}"`).join(', ')}`
      : 'Dữ liệu sạch, không phát hiện PII định danh thật.'
  };
}

/**
 * 2. KỸ THUẬT BÚT XÓA PII (SANITIZATION / ANONYMIZATION) 1-CHẠM
 * Thay thế toàn bộ thực thể nhạy cảm thật bằng biến giữ chỗ chuẩn hóa.
 */
export function sanitizePii(rawText: string): string {
  if (!rawText) return rawText;

  let sanitized = rawText;

  // 1. Tên riêng cụ thể
  sanitized = sanitized.replace(/Nguyễn Văn Tèo/g, '{{TEN_KH}}');
  sanitized = sanitized.replace(/Lê Thị Mận/g, '{{VO_KH}}');
  sanitized = sanitized.replace(/BS\s*123456/g, '{{SERI_SO_DO}}');
  sanitized = sanitized.replace(/HĐTD[-_0-9A-Z]+/gi, '{{MA_HDTD}}');

  // 2. Số CCCD (12 chữ số)
  sanitized = sanitized.replace(/\b\d{12}\b/g, '{{SO_CCCD}}');

  // 3. Số tài khoản ngân hàng định dạng 7800.205.123456
  sanitized = sanitized.replace(/\b\d{4}[.\s]\d{3}[.\s]\d{6}\b/g, '{{SO_TK_NGAN_HANG}}');

  // 4. Số điện thoại định dạng 0912.345.678 hoặc 09xxxxxxxx
  sanitized = sanitized.replace(/\b(0\d{3}[.\s]?\d{3}[.\s]?\d{3}|(0|\+84)\d{9,10})\b/g, '{{SO_DIEN_THOAI}}');

  // 5. Nếu còn chuỗi [Dán dữ liệu sau khi đã dùng Bút xóa PII] thì thay bằng dữ liệu đã khử
  return sanitized;
}

/**
 * 3. KIỂM ĐỊNH TÍNH TUÂN THỦ TỪNG BÀI LAB (LAB COMPLIANCE AUDIT)
 */
export function auditLabCompliance(promptText: string, lab: LabStep): LabComplianceAudit {
  const textLower = promptText.toLowerCase();
  const labId = (lab.id || '').toLowerCase();
  const violations: string[] = [];
  const suggestions: string[] = [];
  let isRedCard = false;
  let redCardReason: string | undefined;

  // LAB 1: BẢO MẬT DỮ LIỆU & BÚT XÓA PII
  if (labId.includes('lab-1') || labId.includes('pii') || lab.title?.toLowerCase().includes('bút xóa pii')) {
    const piiCheck = detectPiiEntities(promptText);
    if (piiCheck.hasPii) {
      isRedCard = true;
      redCardReason = `CẢNH BÁO VI PHẠM NGHỊ ĐỊNH 13: Còn tồn tại thông tin PII thật trong câu lệnh: ${piiCheck.piiItems.map(i => i.value).join(', ')}. Không đạt tiêu chuẩn an toàn dữ liệu ngân hàng!`;
      violations.push(...piiCheck.piiItems.map(i => `Chưa khử: ${i.label} (${i.value})`));
      suggestions.push('Hãy bấm nút "Bút Xóa PII Tự Động" để thay thế toàn bộ số CCCD, SĐT, STK thành biến {{BIẾN}} an toàn.');

      return {
        isCompliant: false,
        isRedCard: true,
        redCardReason,
        violations,
        suggestions,
        autoFixAvailable: true,
        autoFixActionName: '✨ Tự Động Bút Xóa PII (Redact)',
        autoFixSnippet: sanitizePii(promptText)
      };
    }
  }

  // LAB 2: CONTEXT ENGINEERING & THƯƠNG HIỆU TAM NÔNG
  if (labId.includes('lab-2') || labId.includes('context') || lab.title?.toLowerCase().includes('context')) {
    const forbiddenWords = ['siêu rẻ', 'cơn sốt', 'thần tốc', 'giá sốc', 'bùng nổ', 'khủng'];
    const foundForbidden = forbiddenWords.filter(w => textLower.includes(w));
    if (foundForbidden.length > 0) {
      violations.push(`Câu lệnh chứa từ cấm trong truyền thông ngân hàng: ${foundForbidden.join(', ')}`);
      suggestions.push('Cần bổ sung danh sách từ cấm hoặc phong cách chuẩn: Mộc mạc, chân thành, tôn trọng Tam Nông.');
    }
    if (!textLower.includes('tam nông') && !textLower.includes('mộc mạc') && !textLower.includes('agribank')) {
      suggestions.push('Nên bổ sung bối cảnh tĩnh thương hiệu Agribank (gắn bó với Tam nông và bà con nông dân).');
    }
  }

  // LAB 3: MULTISTEP COT & GUARDRAILS
  if (labId.includes('lab-3') || labId.includes('cot') || lab.title?.toLowerCase().includes('cot')) {
    const hasCot = textLower.includes('bước 1') || textLower.includes('step 1') || textLower.includes('từng bước') || textLower.includes('quy trình');
    if (!hasCot) {
      violations.push('Chưa thiết lập quy trình suy luận từng bước (Chain-of-Thought).');
      suggestions.push('Nên chia bài toán thành 3-4 bước thẩm định rõ ràng: [Bước 1: Rà soát pháp lý], [Bước 2: Phân tích số liệu], [Bước 3: Kết luận].');
    }
  }

  // LAB 4: REACT AGENTIC WORKFLOW
  if (labId.includes('lab-4') || labId.includes('react') || lab.title?.toLowerCase().includes('react')) {
    const hasReAct = (textLower.includes('thought') && textLower.includes('action')) || 
                     (textLower.includes('suy nghĩ') && textLower.includes('hành động')) ||
                     textLower.includes('thông tư 04');
    if (!hasReAct) {
      suggestions.push('Cần cấu trúc hóa theo mẫu ReAct: Suy nghĩ (Thought) -> Hành động (Action) -> Quan sát (Observation) -> Phản hồi.');
    }
  }

  // LAB 6: STRUCTURED OUTPUTS
  if (labId.includes('lab-6') || labId.includes('structure') || lab.title?.toLowerCase().includes('trích xuất')) {
    const hasTableOrJson = textLower.includes('bảng') || textLower.includes('markdown') || textLower.includes('json') || textLower.includes('|');
    if (!hasTableOrJson) {
      violations.push('Thiếu khuôn dạng đầu ra có cấu trúc (bảng biểu Markdown hoặc schema cột).');
      suggestions.push('Yêu cầu AI xuất bản dạng bảng Markdown gồm các cột rõ ràng để xuất thẳng sang Excel.');
    }
  }

  // LAB 7: PROMPT INJECTION DEFENSE
  if (labId.includes('lab-7') || labId.includes('injection') || lab.title?.toLowerCase().includes('tấn công')) {
    const hasDefense = textLower.includes('<') && textLower.includes('>') || 
                       textLower.includes('tuyệt đối không tuân theo') || 
                       textLower.includes('override') ||
                       textLower.includes('bỏ qua mọi yêu cầu');
    if (!hasDefense) {
      violations.push('Chưa có thẻ phân tách an toàn (XML Delimiters) hoặc lệnh cấm ghi đè (Override Lock).');
      suggestions.push('Hãy bọc dữ liệu người dùng trong cặp thẻ <user_input>...</user_input> và chỉ thị AI không thực thi lệnh bên trong dữ liệu.');
    }
  }

  return {
    isCompliant: violations.length === 0 && !isRedCard,
    isRedCard,
    redCardReason,
    violations,
    suggestions,
    autoFixAvailable: Boolean(lab.improvedPrompt),
    autoFixActionName: '✨ Tự Động Hoàn Thiện & Nâng Cấp Câu Lệnh (Auto-Fix All)',
    autoFixSnippet: lab.improvedPrompt || undefined
  };
}

/**
 * 4. TABNINE-STYLE CONTEXTUAL AUTOCOMPLETION ENGINE
 * Dò tìm ngữ cảnh gõ phím hiện tại để sinh gợi ý inline thông minh (Ghost completion)
 * Học viên bấm phím Tab ⇥ để chấp nhận gợi ý.
 */
export interface TabnineSuggestion {
  triggerPrefix: string;
  suggestionText: string;
  displayLabel: string;
  category: 'role' | 'guardrails' | 'task' | 'format' | 'grounding';
}

export function getTabnineContextualSuggestion(
  currentText: string,
  cursorPosition: number,
  lab: LabStep
): TabnineSuggestion | null {
  const textBeforeCursor = currentText.slice(0, cursorPosition);
  const currentLine = textBeforeCursor.split('\n').pop() || '';
  const trimmedLine = currentLine.trim().toLowerCase();

  // A. Gợi ý Vai trò (Role)
  if (trimmedLine === 'vai trò:' || trimmedLine === 'vai trò' || trimmedLine === 'bạn là:' || trimmedLine === 'bạn là') {
    return {
      triggerPrefix: currentLine,
      suggestionText: ' Chuyên viên Truyền thông & Báo chí Agribank với 10 năm kinh nghiệm gắn bó cùng Tam Nông.',
      displayLabel: 'Chuyên viên Truyền thông Agribank (10 năm kinh nghiệm)',
      category: 'role'
    };
  }

  // B. Gợi ý Ràng buộc & Bảo mật (Guardrails / PII)
  if (
    trimmedLine === 'ràng buộc:' || 
    trimmedLine === 'ràng buộc' || 
    trimmedLine === 'nguyên tắc bảo mật:' ||
    trimmedLine === 'nguyên tắc:' ||
    trimmedLine === 'chốt chặn:' ||
    trimmedLine.endsWith('tuyệt đối không')
  ) {
    const isPiiLab = lab.id?.includes('1') || lab.title?.includes('PII');
    return {
      triggerPrefix: currentLine,
      suggestionText: isPiiLab 
        ? ' Tuyệt đối không sử dụng thông tin PII thật. Chỉ làm việc trên dữ liệu đã được ẩn danh hóa.'
        : ' Tuyệt đối không suy diễn ngoài tài liệu đã cấp, không dùng từ ngữ giật gân, đao to búa lớn.',
      displayLabel: isPiiLab 
        ? 'Tuyệt đối không dùng PII thật. Chỉ làm việc trên dữ liệu ẩn danh.' 
        : 'Không suy diễn ngoài tài liệu, không dùng từ giật gân.',
      category: 'guardrails'
    };
  }

  // C. Gợi ý Nhiệm vụ (Task)
  if (trimmedLine === 'nhiệm vụ:' || trimmedLine === 'nhiệm vụ' || trimmedLine === 'hãy:' || trimmedLine === 'yêu cầu:') {
    return {
      triggerPrefix: currentLine,
      suggestionText: ' Xuất bản 03 góc tiếp cận tiêu đề bài viết: (1) Nghị lực nhà nông, (2) Nghĩa tình Agribank, (3) Niềm tin hồi sinh.',
      displayLabel: 'Xuất bản 03 góc tiếp cận tiêu đề theo chuẩn nghiệp vụ Agribank',
      category: 'task'
    };
  }

  // D. Gợi ý Định dạng (Format)
  if (trimmedLine === 'định dạng đầu ra:' || trimmedLine === 'định dạng:' || trimmedLine === 'khuôn mẫu:' || trimmedLine === 'đầu ra:') {
    return {
      triggerPrefix: currentLine,
      suggestionText: '\n| STT | Khía Cạnh Tiếp Cận | Tiêu Đề Đề Xuất | Thông Điệp Cốt Lõi |\n| :--- | :--- | :--- | :--- |\n| 1 | Nghị lực nhà nông | ... | ... |',
      displayLabel: 'Bảng Markdown hoàn chỉnh với 4 cột nghiệp vụ',
      category: 'format'
    };
  }

  // E. Gợi ý Bằng chứng (Grounding / Dữ liệu đã làm sạch)
  if (trimmedLine.includes('[dán dữ liệu') || trimmedLine === 'bối cảnh:' || trimmedLine === 'dữ liệu:') {
    return {
      triggerPrefix: currentLine,
      suggestionText: '\nHọ tên: {{TEN_KH}} | CCCD: {{SO_CCCD}} | SĐT: {{SO_DT}} | Địa chỉ: Trấn Yên, Yên Bái | HĐTD: {{MA_HDTD}}',
      displayLabel: 'Dữ liệu đã khử PII bằng biến {{TEN_KH}}, {{SO_CCCD}} an toàn',
      category: 'grounding'
    };
  }

  return null;
}
