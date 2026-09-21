import { UIMode, LabStep } from '../types';

export interface TutorialStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  targetId: string;
  description: string;
  labAdvice: string;
  fallbackNote?: string;
}

/**
 * Sinh danh sách 8 bước hướng dẫn làm bài chuẩn trong PromptLab,
 * được cá nhân hóa câu từ theo Mode (Notebook / Hybrid / Playground) và theo Lab cụ thể.
 */
export function getTutorialSteps(mode: UIMode, lab: LabStep): TutorialStep[] {
  // 1. Lời khuyên cụ thể theo từng loại kỹ thuật trong Lab
  let labSpecificAdvice = {
    scenario: 'Đọc kỹ yêu cầu nghiệp vụ để xác định đúng vai trò cần nhập vai.',
    data: 'Quan sát dữ liệu kiểm soát cố định đính kèm để dùng làm dữ liệu đầu vào.',
    prompt: 'Bắt đầu bằng một câu lệnh cơ bản, rõ ràng.',
    run: 'Bấm nút để AI xử lý và trả về phản hồi đầu tiên.',
    output: 'Đọc câu trả lời xem đã đủ ý và đúng định dạng chưa.',
    coach: 'Bấm vào Bé Trợ Lý ở góc phải nếu bạn cần gợi ý thêm.',
    compare: 'Chạy thử ít nhất 2 lần để đối chiếu sự khác biệt giữa hai phiên bản.',
    library: 'Lưu lại câu lệnh tốt nhất vào Thư viện để chia sẻ cho đồng nghiệp.',
  };

  const labId = lab.id.toLowerCase();
  const labBadge = lab.badge.toLowerCase();

  if (labId.includes('zero') || labBadge.includes('zero')) {
    labSpecificAdvice = {
      scenario: 'Ở bài Zero-shot, bạn đang thử thách AI giải quyết bài toán mà không đưa ví dụ mẫu.',
      data: 'Xem kỹ hồ sơ tín dụng của khách hàng để nắm rõ các chỉ số tài chính.',
      prompt: 'Hãy thử viết câu lệnh thô đầu tiên xem AI phản hồi ra sao trước khi bổ sung quy tắc.',
      run: 'Bấm Chạy Prompt để xem AI có tự hiểu đúng ý bạn không.',
      output: 'Xem AI trả lời theo văn xuôi dài dòng hay đã tóm tắt được rủi ro.',
      coach: 'Nhờ Bé Trợ Lý gợi ý cách thêm vai trò thẩm định viên vào câu lệnh.',
      compare: 'So sánh xem khi thêm Vai trò chuyên gia, câu trả lời bớt lan man như thế nào.',
      library: 'Lưu mẫu câu lệnh Zero-shot chuẩn để xử lý các hồ sơ vay vốn tương tự.',
    };
  } else if (labId.includes('structured') || labBadge.includes('structured')) {
    labSpecificAdvice = {
      scenario: 'Bài Cấu trúc 4 phần yêu cầu bạn phân tách rõ: Vai trò, Ngữ cảnh, Nhiệm vụ, Định dạng.',
      data: 'Dữ liệu khiếu nại của khách hàng là căn cứ duy nhất để AI phản hồi.',
      prompt: 'Nhớ áp dụng công thức 4 phần để AI trả lời theo đúng khuôn khổ chuẩn ngân hàng.',
      run: 'Gửi prompt có cấu trúc và quan sát tốc độ và chất lượng phản hồi.',
      output: 'Kiểm tra xem AI đã xuất đúng bảng Markdown phân loại cảm xúc và giải pháp chưa.',
      coach: 'Bé Trợ Lý sẽ chỉ ra bạn có đang thiếu phần Ràng buộc an toàn (Guardrails) không.',
      compare: 'Đối chiếu xem việc chia rõ 4 phần giúp output mạch lạc gấp nhiều lần ra sao.',
      library: 'Lưu quy trình xử lý khiếu nại này thành SOP chuẩn cho phòng ban.',
    };
  } else if (labId.includes('one-shot') || labBadge.includes('one')) {
    labSpecificAdvice = {
      scenario: 'Bài One-shot giúp AI hiểu đúng "gu" văn phong của Agribank thông qua 1 ví dụ mẫu.',
      data: 'Dữ liệu gồm lịch sử giao dịch và tài liệu mẫu chuẩn.',
      prompt: 'Cung cấp 1 cặp Input mẫu -> Output mẫu để AI bắt chước chuẩn mực.',
      run: 'Chạy prompt để xem AI có áp dụng đúng phong cách của ví dụ mẫu không.',
      output: 'Quan sát tính đồng nhất về văn phong giữa câu trả lời và mẫu bạn cung cấp.',
      coach: 'Hỏi Bé Trợ Lý xem ví dụ của bạn đã đủ tiêu chuẩn cho AI học theo chưa.',
      compare: 'So sánh giữa lúc không có mẫu (Zero-shot) và khi có 1 mẫu chuẩn (One-shot).',
      library: 'Lưu lại câu lệnh kèm ví dụ mẫu để áp dụng cho các thông báo lãi suất khác.',
    };
  } else if (labId.includes('few-shot') || labBadge.includes('few')) {
    labSpecificAdvice = {
      scenario: 'Bài Few-shot cung cấp 2-3 ví dụ đa dạng để AI xử lý các trường hợp biên phức tạp.',
      data: 'Dữ liệu gồm nhiều trường hợp hồ sơ khó cần phân loại nợ.',
      prompt: 'Đưa 2-3 tình huống mẫu (hồ sơ tốt, hồ sơ trung bình, hồ sơ rủi ro) vào prompt.',
      run: 'Chạy prompt để kiểm tra khả năng suy luận đa tình huống của AI.',
      output: 'Kiểm tra xem AI có phân loại chính xác các trường hợp khó không.',
      coach: 'Hỏi Bé Trợ Lý cách chọn 3 ví dụ mẫu mang tính đại diện cao nhất.',
      compare: 'Đối chiếu xem thêm ví dụ thứ 2, thứ 3 giúp AI giảm thiểu sai sót ra sao.',
      library: 'Lưu mẫu phân loại nợ Few-shot vào Thư viện SOP của Khối Tín dụng.',
    };
  } else if (labId.includes('ground') || labBadge.includes('ground')) {
    labSpecificAdvice = {
      scenario: 'Bài Grounding yêu cầu AI tuyệt đối chỉ trả lời dựa trên văn bản nghiệp vụ, cấm bịa đặt.',
      data: 'Bắt buộc mở xem tài liệu quy chế ngân hàng đính kèm trước khi viết prompt.',
      prompt: 'Thêm mệnh lệnh nghiêm ngặt: "Chỉ căn cứ vào văn bản được cung cấp, không suy diễn".',
      run: 'Chạy prompt để kiểm tra xem AI có tuân thủ quy tắc dữ liệu gốc không.',
      output: 'Đối chiếu số liệu trong kết quả với tài liệu gốc xem có bị sai lệch con số nào không.',
      coach: 'Hỏi Bé Trợ Lý mẹo viết câu lệnh chống ảo giác (hallucination) cho AI.',
      compare: 'So sánh câu lệnh không căn cứ (bị bịa số liệu) vs câu lệnh có grounding (chính xác 100%).',
      library: 'Lưu lại prompt chuẩn thẩm định có kiểm soát tài liệu gốc.',
    };
  }

  // 2. Tinh chỉnh câu chữ theo từng Mode UI
  const isNotebook = mode === 'notebook';
  const isHybrid = mode === 'hybrid';
  const isPlayground = mode === 'playground';

  const modeContextDesc = isNotebook
    ? 'Trong chế độ Sổ tay (Notebook), bài học được thiết kế tuần tự từng ô từ trên xuống dưới như một vở bài tập tương tác.'
    : isHybrid
    ? 'Trong chế độ Tích hợp (Hybrid), màn hình được chia đôi: Cột trái chứa Tình huống & Dữ liệu, Cột phải là nơi Soạn thảo Prompt & Xem kết quả.'
    : 'Trong chế độ Thực nghiệm (Playground), bạn có không gian làm việc tự do để thử nghiệm nhiều kỹ thuật prompt và tinh chỉnh tham số AI.';

  const steps: TutorialStep[] = [
    // BƯỚC 1: Đọc tình huống
    {
      id: 'step-scenario',
      stepNumber: 1,
      totalSteps: 8,
      title: '1. Đọc Tình Huống Nghiệp Vụ',
      targetId: 'tour-scenario',
      description: isHybrid
        ? 'Bắt đầu ở Cột Trái: Đọc tình huống thực tế và dòng "Bạn cần làm gì" để nắm rõ bài toán nghiệp vụ ngân hàng cần xử lý.'
        : 'Đầu tiên, hãy đọc nhanh tình huống và dòng "Bạn cần làm gì" để hiểu rõ bài toán nghiệp vụ ngân hàng cần xử lý.',
      labAdvice: labSpecificAdvice.scenario,
    },

    // BƯỚC 2: Xem dữ liệu tham khảo
    {
      id: 'step-data',
      stepNumber: 2,
      totalSteps: 8,
      title: '2. Xem Dữ Liệu Tham Khảo (Control Data)',
      targetId: 'tour-data',
      description: 'Bấm mở mục "Xem dữ liệu" để quan sát dữ liệu đầu vào cố định (hồ sơ vay, bảng số liệu, email khách hàng). Dữ liệu này được giữ nguyên qua mọi lần thử để bạn đối chiếu.',
      labAdvice: labSpecificAdvice.data,
      fallbackNote: 'Mục này nằm ngay dưới phần tình huống. Bạn có thể bấm "Sao chép dữ liệu" để dán vào prompt.',
    },

    // BƯỚC 3: Viết prompt
    {
      id: 'step-prompt',
      stepNumber: 3,
      totalSteps: 8,
      title: '3. Soạn Thảo Câu Lệnh (Prompt)',
      targetId: 'tour-prompt',
      description: isHybrid
        ? 'Chuyển sang Cột Phải: Đây là ô soạn thảo câu lệnh gửi cho AI. Bạn viết càng rõ vai trò, yêu cầu và biểu mẫu đầu ra, AI phản hồi càng chính xác.'
        : 'Đây là nơi bạn giao việc cho AI. Hãy bắt đầu bằng phiên bản đầu tiên của câu lệnh. Có thể bấm "Xem gợi ý & Prompt mẫu" nếu cần tham khảo.',
      labAdvice: labSpecificAdvice.prompt,
    },

    // BƯỚC 4: Chạy prompt
    {
      id: 'step-run',
      stepNumber: 4,
      totalSteps: 8,
      title: '4. Chạy Thử Nghiệm Prompt',
      targetId: 'tour-run',
      description: 'Sau khi viết xong câu lệnh, bấm nút "Chạy prompt" (hoặc nhấn tổ hợp phím Ctrl + Enter) để gửi yêu cầu đến mô hình AI và chấm điểm chất lượng tự động.',
      labAdvice: labSpecificAdvice.run,
    },

    // BƯỚC 5: Quan sát kết quả
    {
      id: 'step-output',
      stepNumber: 5,
      totalSteps: 8,
      title: '5. Quan Sát Kết Quả & Bảng Chấm Điểm',
      targetId: 'tour-output',
      description: 'Đọc câu trả lời từ AI trong khung kết quả để xem văn phong đã đạt chuẩn chưa. Xem bảng điểm chất lượng (Vai trò, Nhiệm vụ, Ràng buộc, Định dạng) và lời khuyên rút ra.',
      labAdvice: labSpecificAdvice.output,
      fallbackNote: 'Vùng kết quả sẽ xuất hiện ngay sau khi bạn bấm Chạy prompt lần đầu tiên.',
    },

    // BƯỚC 6: Cải thiện prompt & AI Coach
    {
      id: 'step-coach',
      stepNumber: 6,
      totalSteps: 8,
      title: '6. Cải Thiện Prompt Với Trợ Lý AI',
      targetId: 'tour-coach',
      description: 'Nếu kết quả chưa tối ưu, bạn có thể chỉnh sửa prompt bằng cách thêm Vai trò (Role), Ngữ cảnh (Context) hoặc Định dạng bảng. Hãy bấm vào Bé Trợ Lý ở góc phải dưới nếu muốn xin gợi ý sư phạm.',
      labAdvice: labSpecificAdvice.coach,
    },

    // BƯỚC 7: So sánh trước / sau
    {
      id: 'step-compare',
      stepNumber: 7,
      totalSteps: 8,
      title: '7. So Sánh Tiến Bộ (Compare Mode)',
      targetId: 'tour-compare',
      description: 'Sau khi chạy ít nhất 2 lần, hệ thống sẽ mở khóa nút "So sánh với lần trước". Bấm nút này để mở bảng đối chiếu 2 cột song song chuẩn Google AI Studio, thấy rõ câu lệnh sửa ở đâu và kết quả tốt hơn thế nào.',
      labAdvice: labSpecificAdvice.compare,
      fallbackNote: 'Nút so sánh sẽ tự động xuất hiện ngay dưới kết quả sau khi bạn chạy thử lần thứ 2.',
    },

    // BƯỚC 8: Lưu prompt tốt vào SOP
    {
      id: 'step-library',
      stepNumber: 8,
      totalSteps: 8,
      title: '8. Lưu Prompt Xuất Sắc Vào Thư Viện (SOP)',
      targetId: 'tour-library',
      description: 'Khi tìm ra phiên bản prompt mang lại kết quả xuất sắc, bấm nút "Lưu vào Thư viện" để lưu giữ quy trình chuẩn cho phòng ban. Bạn có thể mở Thư viện Prompt trên thanh Header bất cứ lúc nào.',
      labAdvice: labSpecificAdvice.library,
      fallbackNote: 'Nút mở Thư viện Prompt luôn có sẵn trên thanh Header toàn cục màu vàng ấm.',
    },
  ];

  return steps;
}

