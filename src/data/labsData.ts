import { LabStep } from '../types';

export const LABS_DATA: LabStep[] = [
  {
    id: 'lab-1',
    order: 1,
    title: 'Bài 1: Viết Prompt Cơ Bản (Chưa Có Mẫu)',
    badge: 'Cơ bản',
    focusSkill: 'Nhận diện điểm yếu của câu lệnh sơ sài',
    focusComponents: ['task', 'context'],
    scenario: 'Bộ phận Chăm sóc Khách hàng & Truyền thông Agribank nhận được 5 phản hồi thô của người dùng trên App Store về ứng dụng Agribank E-Mobile Banking. Bạn cần tổng hợp ý kiến phản hồi này để báo cáo trong cuộc họp ban sáng mai.',
    taskGoal: 'Thử nghiệm viết prompt đơn giản nhất (chưa kèm kỹ thuật) để quan sát xem AI trả lời ra sao khi thiếu chỉ dẫn cấu trúc.',
    conceptTag: 'Cơ chế sinh từ ngẫu nhiên',
    conceptTitle: 'Cơ chế sinh từ xác suất & Vì sao Prompt sơ sài dẫn đến kết quả chung chung',
    conceptExplanation: 'Khi bạn đưa ra một câu lệnh ngắn như "Phân tích đánh giá này", mô hình LLM phải tự đoán định dạng (văn xuôi, gạch đầu dòng hay bảng biểu), đoán đối tượng đọc báo cáo, và đoán mức độ chi tiết. Kết quả thường dài dòng, văn phong đàm thoại, không thể xuất ra Excel để làm việc ngay.',
    sampleInputContext: `Dữ liệu 5 phản hồi thô:
1. "App gì mà cứ mỗi lần cập nhật là lại lỗi đăng nhập bằng vân tay, bực cả mình. Sáng nay ra quầy chuyển tiền gấp mà không vào được."
2. "Giao diện mới nhìn sáng sủa hơn hẳn, chuyển khoản 24/7 siêu nhanh không mất phí, vote 5 sao cho Agribank!"
3. "Tính năng thanh toán tiền điện nước rất tiện, nhưng biểu đồ theo dõi chi tiêu tháng này bị lệch số liệu so với sao kê thẻ."
4. "Mỗi lần lấy mã OTP qua tin nhắn SMS chậm quá, nhiều khi hết 60s vẫn chưa nhận được tin nhắn."
5. "Mong ngân hàng sớm bổ sung tính năng tạo tài khoản số đẹp online ngay trên app, không muốn phải ra chi nhánh xếp hàng."`,
    promptPlaceholder: 'Hãy viết câu lệnh của bạn yêu cầu AI phân loại phản hồi khách hàng (Ví dụ: Phân tích 5 phản hồi sau và trích xuất thành bảng...). Bạn có thể bấm "Nạp câu lệnh thô" hoặc "Nạp câu lệnh chuẩn" ở trên để tham khảo.',
    baselinePrompt: 'Phân tích các đánh giá sau của khách hàng và cho tôi biết họ đang nghĩ gì:\n\n[Dán dữ liệu 5 phản hồi thô vào đây]',
    improvedPrompt: `Bạn là Chuyên viên Phân tích Dữ liệu Trải nghiệm Khách hàng (CX Analyst) tại Agribank.

Nhiệm vụ: Phân tích 5 phản hồi của người dùng về ứng dụng Agribank E-Mobile Banking dưới đây và trích xuất thành bảng Markdown chuẩn hóa.

Dữ liệu phản hồi:
{{customer_reviews}}

Yêu cầu định dạng đầu ra:
Xuất duy nhất 1 bảng Markdown gồm đúng 5 cột sau:
| Mã Phản Hồi | Cảm Xúc (Tích cực/Tiêu cực/Góp ý) | Tính Năng Liên Quan | Vấn Đề Cốt Lõi | Đề Xuất Hành Động Ngay |

Ràng buộc:
- Bỏ qua lời chào hỏi xã giao, đi thẳng vào bảng dữ liệu.
- Ngắn gọn, súc tích, các hành động đề xuất phải mang tính giải pháp nghiệp vụ ngân hàng.`,
    hints: [
      'Gán vai trò chuyên môn (CX Analyst) để định vị góc nhìn phân tích.',
      'Yêu cầu định dạng bảng Markdown với tên cột cụ thể để dễ copy sang Excel/Google Sheet.',
      'Thêm ràng buộc tiêu cực: "Bỏ qua lời chào hỏi xã giao, đi thẳng vào nội dung".'
    ],
    expectedOutputFormat: 'Bảng Markdown gồm 5 cột: Mã Phản Hồi, Cảm Xúc, Tính Năng, Vấn Đề Cốt Lõi, Đề Xuất Hành Động.',
    rubricCriteria: {
      persona: 'Có gán vai trò Chuyên viên Phân tích Trải nghiệm Dịch vụ Agribank rõ ràng.',
      task: 'Yêu cầu phân loại cảm xúc và đề xuất giải pháp nghiệp vụ cụ thể cho từng phản hồi.',
      guardrails: 'Ràng buộc loại bỏ từ ngữ thừa thãi, tập trung vào bảng dữ liệu.',
      format: 'Chỉ định cấu trúc cột bảng Markdown hoàn chỉnh.'
    },
    comparisonHighlights: {
      promptChanges: [
        'Thêm vai trò chuyên gia: Chuyên viên Phân tích Trải nghiệm Khách hàng (CX Analyst)',
        'Thêm yêu cầu định dạng: Bảng Markdown gồm 5 cột cụ thể',
        'Thêm ràng buộc tiêu cực: Bỏ qua chào hỏi xã giao, đi thẳng vào bảng dữ liệu'
      ],
      outputChanges: {
        before: 'Văn bản đàm thoại dài dòng, nhận xét chung chung, không thể xuất báo cáo',
        after: 'Bảng 5 cột chuẩn chỉnh: Mã phản hồi, Cảm xúc, Tính năng, Vấn đề cốt lõi, Đề xuất hành động ngay'
      },
      whyBetter: 'Mô hình AI được thiết lập "khuôn mẫu bảng biểu" rõ ràng thay vì phải tự đoán, giúp dữ liệu có thể copy ngay vào Excel để báo cáo lãnh đạo.'
    },
    miniChallenge: {
      title: 'Thử lại từ đầu mà không dùng gợi ý',
      instruction: 'Bạn hãy tự gõ lại một prompt hoàn toàn bằng lời văn của mình mà không nhìn mẫu: Yêu cầu AI phân tích cảm xúc của 5 phản hồi nhưng lần này chỉ cần đúng 3 cột: [Nội Dung Rút Gọn] | [Cảm Xúc] | [Phòng Ban Tiếp Nhận].',
      context: 'Bạn là Chuyên viên CSKH Agribank. Hãy trích xuất 5 phản hồi sau thành bảng Markdown gồm đúng 3 cột: Nội Dung Rút Gọn | Cảm Xúc | Phòng Ban Tiếp Nhận.\n\n{{customer_reviews}}',
      tip: 'Chỉ cần chỉ định rõ 3 tên cột và vai trò chuyên viên CSKH là AI sẽ tự hiểu và xuất bảng ngay.'
    },
    simulatedBaselineOutput: `Chào bạn! Dưới đây là phân tích của tôi về những đánh giá của khách hàng:

Khách hàng nhìn chung có cả ý kiến khen và chê:
- Có người khen giao diện mới sáng sủa, chuyển tiền nhanh không tốn phí và tính năng thanh toán hóa đơn rất tiện lợi.
- Tuy nhiên vẫn còn một số phàn nàn về việc app bị lỗi đăng nhập vân tay sau cập nhật, tin nhắn OTP gửi qua SMS còn chậm, và tính năng theo dõi chi tiêu hiển thị chưa khớp với sao kê thẻ.
- Ngoài ra khách hàng cũng mong muốn có thêm tính năng chọn số tài khoản đẹp trực tuyến để không phải ra quầy giao dịch.

Nhìn chung ngân hàng nên cải thiện hệ thống kỹ thuật và bổ sung thêm các tiện ích mới để làm hài lòng khách hàng hơn nhé!`,
    simulatedImprovedOutput: `| Mã Phản Hồi | Cảm Xúc | Tính Năng Liên Quan | Vấn Đề Cốt Lõi | Đề Xuất Hành Động Ngay |
| :--- | :--- | :--- | :--- | :--- |
| **FB-01** | Tiêu cực | Đăng nhập sinh trắc học | Lỗi xác thực vân tay sau bản update; gián đoạn giao dịch gấp | Đội ngũ Mobile App kiểm tra lỗi tương thích module Biometrics trên phiên bản mới; hướng dẫn tạm thời đăng nhập bằng mật khẩu |
| **FB-02** | Tích cực | Giao diện & Chuyển tiền 24/7 | Hài lòng với tốc độ chuyển tiền và chính sách miễn phí giao dịch | Ghi nhận phản hồi tích cực; duy trì hiệu năng chuyển mạch liên ngân hàng |
| **FB-03** | Trung lập / Góp ý | Quản lý tài chính cá nhân | Lệch số liệu biểu đồ chi tiêu so với sao kê thực tế | Bộ phận Core Banking & Data rà soát thuật toán đồng bộ giao dịch thẻ vào module báo cáo tài chính |
| **FB-04** | Tiêu cực | Xác thực giao dịch (SMS OTP) | Độ trễ mạng viễn thông khiến SMS OTP quá thời gian 60s | Khuyến khích khách hàng chuyển đổi sang Soft OTP / Smart OTP tích hợp sẵn trong app để đảm bảo nhận mã tức thì |
| **FB-05** | Góp ý xây dựng | Mở tài khoản số đẹp | Nhu cầu định danh eKYC mở tài khoản theo yêu cầu từ xa | Đưa tính năng đăng ký tài khoản số đẹp qua eKYC vào backlog ưu tiên trong quý tới |`
  },
  {
    id: 'lab-2',
    order: 2,
    title: 'Bài 2: Cấu Trúc Prompt Chuẩn (Khung Vai Trò - Ngữ Cảnh - Nhiệm Vụ - Ràng Buộc - Định Dạng)',
    badge: 'Cốt lõi',
    focusSkill: 'Áp dụng công thức 5 thành tố chuyên nghiệp',
    focusComponents: ['role', 'context', 'task', 'constraint', 'output_format'],
    scenario: 'Bộ phận Tín dụng Agribank đang tiếp nhận hồ sơ vay bổ sung vốn lưu động 15 tỷ VNĐ của Công ty Cổ phần Nông nghiệp Xanh Cao Nguyên. Cán bộ thẩm định cần lập tóm tắt sơ bộ các rủi ro tài chính và điều kiện giải ngân để trình Trưởng phòng.',
    taskGoal: 'Xây dựng prompt có cấu trúc chặt chẽ gồm 5 thành tố: Vai trò (Role), Ngữ cảnh (Context), Nhiệm vụ (Task), Ràng buộc (Constraints), Định dạng (Output Format).',
    conceptTag: 'Khung cấu trúc chuẩn',
    conceptTitle: 'Công thức 5 thành tố: Bí quyết viết prompt chuẩn mực cho người làm văn phòng',
    conceptExplanation: 'Mô hình AI chỉ hoạt động hiệu quả khi được thiết lập "đường ray". Khung cấu trúc 5 thành tố ngăn chặn hoàn toàn hiện tượng AI trả lời chung chung hoặc đưa ra nhận định cảm tính không phù hợp với nghiệp vụ ngân hàng.',
    sampleInputContext: `Thông tin doanh nghiệp:
- Tên: Công ty CP Nông nghiệp Xanh Cao Nguyên (Trồng & chế biến chè, cà phê xuất khẩu tại Lâm Đồng).
- Doanh thu năm 2025: 85 tỷ VNĐ (tăng trưởng 12% so với 2024).
- Lợi nhuận sau thuế: 4.2 tỷ VNĐ. Tỷ lệ nợ/Vốn chủ sở hữu: 1.8 lần.
- Đề nghị vay: 15 tỷ VNĐ thời hạn 12 tháng tài trợ thu mua nguyên liệu vụ đông xuân.
- Tài sản bảo đảm: Quyền sử dụng đất nhà xưởng chế biến định giá 22 tỷ VNĐ.
- Tồn đọng cần lưu ý: Khoản phải thu khách hàng quốc tế chiếm 45% tổng tài sản ngắn hạn, tiềm ẩn rủi ro biến động tỷ giá USD/VND.`,
    promptPlaceholder: 'Hãy xây dựng câu lệnh có cấu trúc 5 thành phần (Vai trò, Bối cảnh, Nhiệm vụ, Ràng buộc, Định dạng). Bạn có thể bấm "Nạp câu lệnh thô" hoặc "Nạp câu lệnh chuẩn" ở trên để tham khảo.',
    baselinePrompt: 'Viết báo cáo đánh giá rủi ro cho hồ sơ vay của Công ty CP Nông nghiệp Xanh Cao Nguyên.\n\n[Dán thông tin doanh nghiệp]',
    improvedPrompt: `# ROLE & PERSONA
Bạn là Chuyên viên Thẩm định Tín dụng Doanh nghiệp cao cấp tại Agribank.

# CONTEXT
Khách hàng là Công ty CP Nông nghiệp Xanh Cao Nguyên đề nghị vay vốn lưu động 15 tỷ VNĐ trong 12 tháng. Tài sản bảo đảm là bất động sản định giá 22 tỷ VNĐ. Doanh thu 85 tỷ VNĐ nhưng khoản phải thu quốc tế chiếm tỷ trọng lớn.

# TASK
Phân tích sơ bộ hồ sơ tín dụng, nhận diện rủi ro trọng yếu và đề xuất điều kiện kiểm soát khi giải ngân.

# CONSTRAINTS & GUARDRAILS
- Giọng văn: Khách quan, thận trọng, chuẩn mực ngôn ngữ tín dụng ngân hàng.
- Tuyệt đối không dùng các từ cảm tính vô căn cứ ("công ty rất uy tín", "khoản vay an toàn tuyệt đối").
- Mọi nhận định rủi ro phải gắn liền với số liệu tài chính đã cung cấp.

# OUTPUT FORMAT
Trình bày theo đúng 3 phần:
1. **Bảng Tóm tắt Chỉ số Tài chính & Tỷ lệ Bảo đảm** (gồm: Chỉ số | Giá trị | Nhận định rủi ro).
2. **Top 3 Rủi ro Trọng yếu cần giám sát** (Mỗi rủi ro nêu rõ: Bản chất rủi ro & Tác động).
3. **Điều kiện Giải ngân & Quản lý sau vay** (3 biện pháp kiểm soát cụ thể).`,
    hints: [
      'Xác định rõ vai trò Chuyên viên Thẩm định Tín dụng cao cấp.',
      'Sử dụng phân vùng rõ ràng bằng dấu thăng (#) hoặc XML tags (<role>, <task>).',
      'Đưa ra tiêu chuẩn ràng buộc tiêu cực: "Không dùng từ cảm tính vô căn cứ".'
    ],
    expectedOutputFormat: 'Báo cáo cấu trúc 3 phần: Bảng chỉ số tài chính, 3 Rủi ro trọng yếu, 3 Điều kiện kiểm soát giải ngân.',
    rubricCriteria: {
      persona: 'Thể hiện rõ thẩm quyền và tư duy thận trọng của cán bộ tín dụng ngân hàng.',
      task: 'Xác định rõ ràng việc phân tích hồ sơ và đưa ra điều kiện giải ngân.',
      guardrails: 'Ngăn chặn nhận định cảm tính, bắt buộc trích dẫn số liệu hồ sơ.',
      format: 'Cấu trúc 3 phần rành mạch có bảng chỉ số và danh sách biện pháp kiểm soát.'
    },
    comparisonHighlights: {
      promptChanges: [
        'Áp dụng cấu trúc RCTCO: Tách rõ Role, Context, Task, Constraints, Output Format',
        'Thêm ràng buộc khắt khe: Không dùng từ ngữ cảm tính ("có lẽ", "rất tốt")',
        'Quy định đầu ra: 3 phần cụ thể (Bảng tài chính, 3 Rủi ro, 3 Điều kiện giải ngân)'
      ],
      outputChanges: {
        before: 'Đánh giá cảm tính, lỏng lẻo ("Công ty này làm ăn khá tốt... an toàn về mặt tài sản")',
        after: 'Tờ trình tín dụng chuyên nghiệp: Bảng chỉ số tài chính, 3 rủi ro cốt lõi và 3 biện pháp kiểm soát thực tế'
      },
      whyBetter: 'Ràng buộc tiêu cực ngăn chặn hoàn toàn việc AI nhận định chủ quan, buộc mô hình phải dựa vào số liệu thẩm định thực tế của ngân hàng.'
    },
    miniChallenge: {
      title: 'Áp dụng cấu trúc 5 thành phần vào tình huống mới',
      instruction: 'Thử áp dụng cấu trúc Role - Context - Task - Constraint - Format để yêu cầu AI tóm tắt một văn bản tín dụng: Nêu rõ 3 rủi ro tín dụng tiềm ẩn và đề xuất 1 biện pháp phòng ngừa rủi ro ngoại hối.',
      context: 'Bạn là Chuyên viên Thẩm định Tín dụng Agribank.\nBối cảnh: Đang xem xét hồ sơ vay vốn 15 tỷ của Công ty Nông nghiệp Xanh.\nNhiệm vụ: Tóm tắt 3 rủi ro tín dụng tiềm ẩn và đề xuất 1 biện pháp phòng ngừa rủi ro ngoại hối.\nRàng buộc: Không dùng từ ngữ cảm tính, căn cứ vào số liệu công nợ 45%.\nĐịnh dạng: Gạch đầu dòng rõ ràng, ngắn gọn.',
      tip: 'Đảm bảo có đủ 5 thành phần: Role, Context, Task, Constraint, Output Format.'
    },
    simulatedBaselineOutput: `Báo cáo đánh giá rủi ro Công ty Nông nghiệp Xanh:

Công ty này làm ăn khá tốt, doanh thu đạt 85 tỷ đồng và có lãi hơn 4 tỷ. Khoản vay 15 tỷ được bảo đảm bằng nhà xưởng 22 tỷ nên khá an toàn về mặt tài sản thế chấp.

Tuy nhiên rủi ro là công ty bị khách hàng quốc tế nợ nhiều quá (45%), nếu tỷ giá biến động hoặc đối tác chậm trả thì công ty sẽ kẹt tiền trả nợ ngân hàng.

Đề nghị cho vay nhưng cần theo dõi sát sao việc thu hồi nợ của công ty nhé.`,
    simulatedImprovedOutput: `### TỜ TRÌNH ĐÁNH GIÁ SƠ BỘ RỦI RO HỒ SƠ TÍN DỤNG

#### 1. Bảng Tóm tắt Chỉ số Tài chính & Tỷ lệ Bảo đảm
| Chỉ số Tài chính / Pháp lý | Giá trị Thực tế | Nhận định Thẩm định |
| :--- | :--- | :--- |
| Doanh thu thuần 2025 | 85.0 tỷ VNĐ | Tăng trưởng ổn định (+12%), biên lợi nhuận ròng đạt 4.94% |
| Đòn bẩy tài chính (Nợ/VCSH) | 1.8 lần | Mức đòn bẩy trung bình khá; cần theo dõi chi phí lãi vay |
| Tỷ lệ Tài sản bảo đảm (TSBĐ/Dư nợ) | 146.6% (22 tỷ / 15 tỷ) | Tỷ lệ bảo đảm an toàn theo quy chế cho vay Agribank (>130%) |
| Tỷ trọng Phải thu ngắn hạn quốc tế | 45% TS ngắn hạn | **Rủi ro trọng yếu:** Tập trung vốn lớn ở thị trường xuất khẩu |

---

#### 2. Top 3 Rủi ro Trọng yếu cần giám sát
1. **Rủi ro thanh khoản từ công nợ nước ngoài:**
   - *Bản chất:* 45% tài sản lưu động nằm ở các đối tác quốc tế; nếu khách hàng nước ngoài kéo dài chu kỳ thanh toán sẽ dẫn đến nguy cơ chậm luân chuyển dòng tiền trả nợ ngân hàng.
2. **Rủi ro tỷ giá và biến động giá nông sản:**
   - *Bản chất:* Doanh thu xuất khẩu chịu biến động tỷ giá USD/VND và rủi ro chu kỳ giá cà phê, chè trên thị trường thế giới.
3. **Rủi ro thanh lý tài sản chuyên dùng:**
   - *Bản chất:* Dù nhà xưởng định giá 22 tỷ VNĐ, đây là bất động sản gắn liền dây chuyền chế biến nông sản đặc thù, tính thanh khoản trong trường hợp xử lý nợ sẽ cần thời gian dài hơn đất ở.

---

#### 3. Điều kiện Giải ngân & Quản lý sau vay
- **Kiểm soát dòng tiền về:** Bắt buộc doanh nghiệp cam kết chuyển tối thiểu 80% doanh thu xuất khẩu từ các hợp đồng ngoại thương về tài khoản thanh toán mở tại Agribank.
- **Giải ngân từng lần theo chứng từ thực tế:** Chỉ giải ngân dựa trên Hợp đồng thu mua nguyên liệu, Hóa đơn VAT và Biên bản giao nhận hàng hóa hợp lệ; không giải ngân một lần toàn bộ hạn mức.
- **Phòng ngừa rủi ro tỷ giá:** Yêu cầu doanh nghiệp sử dụng hợp đồng kỳ hạn ngoại hối (FX Forward) tại Agribank đối với các hợp đồng xuất khẩu thanh toán chậm trên 60 ngày.`
  },
  {
    id: 'lab-3',
    order: 3,
    title: 'Bài 3: Định Hình Phong Cách Bằng Ví Dụ Mẫu (Chuẩn Văn Phong Ngân Hàng)',
    badge: 'Nâng cao',
    focusSkill: 'Đưa ví dụ mẫu (Mẫu đầu vào - Mẫu đầu ra) để AI học theo chuẩn',
    focusComponents: ['example', 'output_format'],
    scenario: 'Ban Truyền thông Agribank thường xuyên phải soạn thảo thông báo gửi khách hàng khi nâng cấp hệ thống hoặc bảo trì dịch vụ số. Văn bản kỹ thuật từ IT chuyển sang thường khô khan và gây hoang mang nếu không được biên tập chuẩn văn phong ngân hàng.',
    taskGoal: 'Học cách đưa 1-2 cặp ví dụ mẫu (Đầu vào - Đầu ra chuẩn) vào prompt để AI học theo cấu trúc và văn phong "Tận tâm - Chu đáo - An tâm".',
    conceptTag: 'Học qua ví dụ mẫu',
    conceptTitle: 'Sức mạnh của ví dụ mẫu: Dạy bằng thực tế thay vì chỉ giải thích lý thuyết',
    conceptExplanation: 'Khi bạn miêu tả "Hãy viết với giọng văn thân thiện, ấm áp, chuyên nghiệp", mỗi mô hình sẽ hiểu một kiểu. Nhưng khi bạn cung cấp một ví dụ mẫu chuẩn, mô hình sẽ phân tích nhịp câu, đại từ xưng hô, và từ khóa thương hiệu để bắt chước chính xác 100%.',
    sampleInputContext: `Thông số kỹ thuật từ phòng IT:
- Thời gian: Từ 23h30 tối thứ Bảy (ngày 26/09/2026) đến 03h30 sáng Chủ nhật (ngày 27/09/2026).
- Phạm vi bảo trì: Nâng cấp cổng thanh toán quốc tế và hệ thống thẻ ghi nợ/thẻ tín dụng Agribank JCB & Mastercard.
- Ảnh hưởng: Trong khoảng thời gian trên, các giao dịch quẹt thẻ POS tại nước ngoài và thanh toán trực tuyến trên các trang thương mại điện tử quốc tế tạm thời gián đoạn.
- Dịch vụ không bị ảnh hưởng: Rút tiền tại cây ATM trong nước và chuyển tiền trên app Agribank E-Mobile Banking vẫn hoạt động bình thường.`,
    promptPlaceholder: 'Hãy viết câu lệnh có kèm ví dụ mẫu (Input mẫu -> Output mẫu) để AI học theo chuẩn văn phong thông báo của ngân hàng...',
    baselinePrompt: 'Viết thông báo bảo trì hệ thống thẻ quốc tế gửi khách hàng dựa trên thông tin IT sau:\n\n[Dán thông tin kỹ thuật]',
    improvedPrompt: `Bạn là Trưởng bộ phận Biên tập Truyền thông & Thương hiệu của Agribank.
Nhiệm vụ của bạn là chuyển thể các thông báo kỹ thuật khô khan thành thông điệp gửi khách hàng chuẩn phong cách Agribank ("Tận tâm - Chu đáo - Minh bạch").

Hãy nghiên cứu VÍ DỤ MẪU CHUẨN dưới đây:
---
[ĐẦU VÀO KỸ THUẬT]:
Bảo trì định kỳ máy chủ cơ sở dữ liệu core banking từ 01h00 đến 03h00 ngày 15/08. Tạm dừng chuyển tiền liên ngân hàng Napas.
[ĐẦU RA CHUẨN BRAND VOICE]:
"Kính gửi Quý khách hàng,
Nhằm không ngừng tối ưu hóa chất lượng dịch vụ và tăng cường bảo mật cho mọi giao dịch của Quý khách, Agribank trân trọng thông báo kế hoạch nâng cấp định kỳ hệ thống công nghệ:
⏰ Khung giờ thực hiện: Từ 01h00 đến 03h00, Thứ Bảy ngày 15/08/2026 (khung giờ đêm nhằm hạn chế tối đa ảnh hưởng đến công việc của Quý khách).
⚠️ Dịch vụ tạm gián đoạn: Chuyển tiền liên ngân hàng 24/7.
✅ Dịch vụ duy trì thông suốt: Rút tiền tại ATM Agribank và thanh toán hóa đơn nội mạng.
Agribank chân thành cáo lỗi vì sự bất tiện tạm thời này. Rất mong Quý khách chủ động sắp xếp thời gian giao dịch phù hợp. Tổng đài CSKH 24/7: 1900 5588 18 luôn sẵn sàng hỗ trợ Quý khách.
Trân trọng cảm ơn sự tin tưởng và đồng hành của Quý khách!"
---

BÂY GIỜ, HÃY ÁP DỤNG ĐÚNG CẤU TRÚC VÀ VĂN PHONG TRÊN CHO DỮ LIỆU KỸ THUẬT MỚI:
[ĐẦU VÀO KỸ THUẬT]:
{{it_technical_notice}}

[ĐẦU RA CHUẨN BRAND VOICE]:`,
    hints: [
      'Tạo cặp [ĐẦU VÀO KỸ THUẬT] và [ĐẦU RA CHUẨN BRAND VOICE] rõ ràng.',
      'Sử dụng các biểu tượng trực quan (⏰, ⚠️, ✅) tạo cảm giác dễ đọc trên di động/mạng xã hội.',
      'Đảm bảo luôn có thông điệp cảm ơn, đường dây nóng hỗ trợ 24/7 và lý do nâng cấp vì lợi ích khách hàng.'
    ],
    expectedOutputFormat: 'Thông điệp truyền thông hoàn chỉnh theo đúng cấu trúc của ví dụ mẫu chuẩn.',
    rubricCriteria: {
      persona: 'Định vị rõ vai trò Biên tập Truyền thông Thương hiệu Agribank.',
      task: 'Chuyển thể dữ liệu kỹ thuật thành thông điệp chăm sóc khách hàng.',
      guardrails: 'Tuân thủ chặt chẽ cấu trúc và biểu tượng của ví dụ mẫu được cung cấp.',
      format: 'Xuất văn bản sẵn sàng gửi qua Email/SMS Brandname/Fanpage.'
    },
    comparisonHighlights: {
      promptChanges: [
        'Cung cấp cặp ví dụ mẫu chuẩn: [ĐẦU VÀO KỸ THUẬT] ➔ [ĐẦU RA CHUẨN BRAND VOICE]',
        'Sử dụng các biểu tượng trực quan (⏰, ⚠️, ✅) để người đọc quét nhanh trên di động',
        'Bổ sung lời cảm ơn, cáo lỗi chân thành và hotline hỗ trợ 24/7'
      ],
      outputChanges: {
        before: 'Thông báo kỹ thuật khô khan, cộc lốc, dễ gây hoang mang cho khách hàng',
        after: 'Thông điệp chăm sóc khách hàng chuẩn mực Agribank: Chu đáo, minh bạch, tạo sự an tâm tuyệt đối'
      },
      whyBetter: 'Ví dụ mẫu (Few-shot) giúp AI học được chuẩn xác nhịp câu, văn hóa xưng hô và ngôn từ thương hiệu mà lý thuyết thuần túy không thể truyền tải được.'
    },
    miniChallenge: {
      title: 'Dạy AI phân loại bằng 1 ví dụ mẫu định dạng JSON',
      instruction: 'Thay vì viết thông báo, bạn hãy đưa 1 ví dụ mẫu định dạng JSON để AI phân loại phản hồi sự cố thẻ quốc tế. Xem AI có xuất chuẩn cấu trúc dữ liệu không.',
      context: 'Bạn là chuyên viên kỹ thuật hệ thống thẻ. Hãy phân loại thông báo sau theo đúng định dạng mẫu:\n[MẪU ĐẦU RA CHUẨN]:\n{\n  "ma_su_co": "CARD-01",\n  "kenh_anh_huong": "POS Quốc Tế",\n  "muc_do": "Trung bình"\n}\n\nÁp dụng cho:\n"Hệ thống thanh toán thẻ tín dụng JCB tạm dừng từ 23h đến 3h sáng mai"',
      tip: 'Chỉ cần 1 ví dụ mẫu chuẩn xác là AI sẽ sao chép đúng 100% cấu trúc ngoặc nhọn JSON.'
    },
    simulatedBaselineOutput: `THÔNG BÁO BẢO TRÌ HỆ THỐNG THẺ AGRIBANK

Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam xin thông báo:
Từ 23h30 ngày 26/09/2026 đến 03h30 ngày 27/09/2026, chúng tôi sẽ tiến hành bảo trì hệ thống thẻ ghi nợ và thẻ tín dụng JCB, Mastercard.

Trong thời gian này, quý khách sẽ không thể quẹt thẻ POS ở nước ngoài và không thanh toán online được trên các trang web quốc tế. Các dịch vụ rút tiền ATM trong nước và chuyển tiền trên app vẫn bình thường.

Xin thông báo để quý khách được biết và sắp xếp công việc. Xin cảm ơn.`,
    simulatedImprovedOutput: `Kính gửi Quý khách hàng,

Nhằm không ngừng tối ưu hóa trải nghiệm chi tiêu toàn cầu và nâng cao chuẩn mực bảo mật thanh toán quốc tế cho Quý khách, Agribank xin trân trọng thông báo kế hoạch nâng cấp hạ tầng xử lý giao dịch thẻ định kỳ:

⏰ **Thời gian thực hiện:** Từ 23h30 Thứ Bảy (26/09/2026) đến 03h30 Chủ Nhật (27/09/2026).
*(Agribank lựa chọn khung giờ đêm muộn cuối tuần nhằm giảm thiểu tối đa mọi gián đoạn trong sinh hoạt của Quý khách).*

⚠️ **Phạm vi tạm gián đoạn:**
- Giao dịch thanh toán trực tuyến quốc tế (E-commerce) qua thẻ Agribank JCB & Mastercard.
- Giao dịch quẹt thẻ tại các thiết bị POS ở nước ngoài.

✅ **Dịch vụ duy trì hoạt động thông suốt:**
- Toàn bộ giao dịch rút tiền mặt tại hệ thống ATM Agribank trên toàn quốc.
- Dịch vụ chuyển tiền nhanh 24/7 và thanh toán hóa đơn trên ứng dụng Agribank E-Mobile Banking.

Agribank chân thành cáo lỗi vì sự bất tiện tạm thời này. Kính mong Quý khách chủ động kế hoạch thanh toán trước thời gian nâng cấp hệ thống. 

Đội ngũ Chăm sóc Khách hàng Agribank luôn sẵn sàng hỗ trợ Quý khách 24/7 qua Hotline: **1900 5588 18** hoặc **(+84) 24 3205 3205**.

Trân trọng cảm ơn Quý khách đã luôn tin tưởng và đồng hành cùng Agribank!`
  },
  {
    id: 'lab-4',
    order: 4,
    title: 'Bài 4: Đối Chiếu Tài Liệu & Chống Bịa Đặt (Nói Có Sách, Mách Có Chứng)',
    badge: 'Chuyên gia',
    focusSkill: 'Đối chiếu tài liệu chính sách để AI không tự sáng tác thông tin',
    focusComponents: ['grounding', 'constraint'],
    scenario: 'Một cán bộ tín dụng chi nhánh nhận được câu hỏi từ khách hàng là nông dân trồng hồ tiêu tại Bình Phước hỏi về chính sách cho vay không cần thế chấp tài sản theo Nghị định của Chính phủ. Cán bộ muốn dùng AI để tra cứu nhanh nhưng sợ AI "bịa" thông tin sai chính sách tín dụng.',
    taskGoal: 'Thiết lập prompt có kèm tài liệu tham chiếu (Grounding) và cài đặt hàng rào bảo vệ (Ràng buộc nghiêm ngặt) để AI chỉ trả lời từ văn bản chính sách.',
    conceptTag: 'Đối chiếu tài liệu thực tế',
    conceptTitle: 'Kỹ thuật Đối chiếu tài liệu: Buộc AI nói có sách, mách có chứng',
    conceptExplanation: 'Mô hình ngôn ngữ có xu hướng tự tin "sáng tác" thông tin khi không chắc chắn (Hiện tượng ảo giác - Hallucination). Bằng cách cung cấp tài liệu tham chiếu và yêu cầu trích dẫn cụ thể điều khoản, bạn loại bỏ hoàn toàn rủi ro sai sót nghiệp vụ pháp lý.',
    sampleInputContext: `Văn bản căn cứ: Trích Nghị định 55/2015/NĐ-CP & Văn bản hướng dẫn số 2386/NHNo-TD của Tổng Giám đốc Agribank:
"Điều 9. Khoản cho vay không có tài sản bảo đảm
1. Cá nhân, hộ gia đình cư trú trên địa bàn nông thôn có dự án, phương án sản xuất kinh doanh trong nông nghiệp được Agribank xem xét cho vay không có tài sản bảo đảm theo các mức sau:
a) Tối đa 100 triệu đồng đối với cá nhân, hộ gia đình sản xuất nông nghiệp thông thường.
b) Tối đa 200 triệu đồng đối với cá nhân, hộ gia đình sản xuất nông nghiệp có tham gia chuỗi liên kết hoặc ứng dụng công nghệ cao có xác nhận của UBND cấp huyện.
2. Khách hàng vay vốn không có tài sản bảo đảm phải nộp bản chính Giấy chứng nhận quyền sử dụng đất (sổ đỏ) hoặc Giấy xác nhận của UBND cấp xã về việc chưa được cấp sổ đỏ và đất không có tranh chấp cho Agribank lưu giữ trong thời gian vay vốn.
3. Thời hạn cho vay tối đa theo chu kỳ sản xuất nhưng không quá 36 tháng đối với cây trồng lâu năm (hồ tiêu, cao su, cà phê)."`,
    promptPlaceholder: 'Hãy viết câu lệnh có ràng buộc neo chặt vào tài liệu được cung cấp (Grounding) và cấm AI suy diễn ngoài văn bản...',
    baselinePrompt: 'Hộ nông dân trồng hồ tiêu vay tối đa được bao nhiêu tiền không cần tài sản thế chấp tại Agribank và cần nộp những giấy tờ gì?',
    improvedPrompt: `<system_persona>
Bạn là Trợ lý Pháp chế & Nghiệp vụ Tín dụng Nội bộ của Agribank. Nhiệm vụ của bạn là giải đáp chính xác các thắc mắc chính sách cho cán bộ tín dụng dựa duy nhất trên tài liệu pháp lý được cung cấp.
</system_persona>

<policy_reference>
{{regulatory_document}}
</policy_reference>

<user_query>
Một nông dân trồng hồ tiêu tại Bình Phước thắc mắc:
1. Hộ của ông ấy có thể vay tối đa bao nhiêu tiền mà không có tài sản bảo đảm? Nếu muốn vay 200 triệu thì cần điều kiện gì?
2. Có cần phải nộp giấy tờ đất đai gì cho ngân hàng giữ không?
3. Thời hạn vay tối đa cho cây hồ tiêu là bao lâu?
</user_query>

<guardrails_and_constraints>
1. NGUYÊN TẮC BẰNG CHỨNG: Tuyệt đối chỉ trả lời dựa trên nội dung trong mục <policy_reference>. Không suy đoán hoặc thêm kiến thức ngoài văn bản.
2. TRÍCH DẪN BẮT BUỘC: Mọi câu trả lời phải ghi rõ căn cứ [Điều mấy, Khoản mấy].
3. ĐIỀU KHOẢN KHÔNG CÓ: Nếu tài liệu không đề cập đến một câu hỏi nào đó, phải nêu rõ: "Tài liệu được cung cấp không quy định về nội dung này."
</guardrails_and_constraints>

<output_format>
Trình bày rõ ràng theo 3 câu hỏi, mỗi mục gồm:
- **Nội dung trả lời súc tích**
- **Căn cứ pháp lý trích dẫn nguyên văn**
- **Lưu ý nghiệp vụ cho cán bộ chi nhánh**
</output_format>`,
    hints: [
      'Sử dụng các thẻ phân tách rõ ràng như <policy_reference> và <guardrails_and_constraints>.',
      'Yêu cầu bắt buộc trích dẫn [Điều ..., Khoản ...].',
      'Đưa quy tắc "Nếu tài liệu không đề cập thì báo ngay, không tự bịa thông tin".'
    ],
    expectedOutputFormat: 'Câu trả lời chuẩn mực 3 phần gắn kèm căn cứ Điều khoản Nghị định 55 chính xác 100%.',
    rubricCriteria: {
      persona: 'Đóng vai trò Trợ lý Pháp chế & Nghiệp vụ Tín dụng nội bộ trung thực, chuẩn xác.',
      task: 'Giải đáp đầy đủ 3 câu hỏi nghiệp vụ tín dụng nông nghiệp.',
      guardrails: 'Ràng buộc Zero-Hallucination, bắt buộc trích dẫn văn bản.',
      format: 'Chia tách câu trả lời, căn cứ pháp lý và lưu ý nghiệp vụ mạch lạc.'
    },
    comparisonHighlights: {
      promptChanges: [
        'Cung cấp văn bản căn cứ <policy_reference> (Nghị định 55/2015/NĐ-CP)',
        'Cài đặt quy tắc Bằng chứng & Trích dẫn bắt buộc: [Điều ..., Khoản ...]',
        'Ràng buộc chống ảo giác: "Nếu tài liệu không đề cập thì báo ngay, cấm đoán mò"'
      ],
      outputChanges: {
        before: 'AI đoán mò hạn mức 100-200 triệu, sai lệch quy định nộp sổ đỏ và thời hạn vay',
        after: 'Câu trả lời chuẩn mực pháp lý 100%, trích dẫn rõ Điều 9 và kèm lưu ý nghiệp vụ cho cán bộ chi nhánh'
      },
      whyBetter: 'Kỹ thuật Đối chiếu tài liệu (Grounding) loại bỏ triệt để rủi ro AI tự bịa thông tin sai lệch quy chế cho vay của ngân hàng.'
    },
    miniChallenge: {
      title: 'Thêm trường hợp đặc biệt vào danh sách ví dụ',
      instruction: 'Bổ sung thêm 1 ví dụ về "Khiếu nại gian lận/lừa đảo khẩn cấp" để kiểm tra xem AI có tự động nhận diện và cảnh báo đỏ ngay lập tức không.',
      context: 'Bạn là chuyên viên trực tổng đài Agribank. Hãy phân loại các trường hợp khẩn cấp theo ví dụ sau:\n[VÍ DỤ MẪU]:\n- Đầu vào: "Tài khoản tôi vừa bị trừ tiền lạ ở nước ngoài"\n- Đầu ra: [MỨC ĐỘ: KHẨN CẤP ĐỎ] - Khóa thẻ ngay lập tức.\n\nPhân loại phản hồi này:\n"Tôi vừa nhận được cuộc gọi mạo danh cán bộ Agribank yêu cầu đọc mã OTP"',
      tip: 'Few-shot với nhiều ví dụ đa dạng giúp AI phân loại chuẩn xác những ca nhạy cảm.'
    },
    simulatedBaselineOutput: `Chào bạn! Theo quy định hiện nay thì hộ nông dân trồng hồ tiêu có thể vay tín chấp tối đa khoảng 100 đến 200 triệu đồng tại Agribank tùy theo phương án sản xuất. 

Nếu vay không cần thế chấp sổ đỏ thì bà con thường không phải nộp sổ cho ngân hàng giữ, chỉ cần chứng minh thu nhập và có xác nhận của địa phương. Thời hạn vay đối với cây công nghiệp thường kéo dài khoảng 3 đến 5 năm để bà con kịp thu hoạch và trả nợ nhé.`,
    simulatedImprovedOutput: `Căn cứ theo trích đoạn Nghị định 55/2015/NĐ-CP và Hướng dẫn 2386/NHNo-TD, xin giải đáp cụ thể cho cán bộ tín dụng như sau:

---

### 1. Hạn mức vay tối đa không có tài sản bảo đảm
- **Nội dung trả lời:**
  - Mức thông thường: Hộ nông dân được vay tối đa **100 triệu đồng**.
  - Điều kiện nâng lên mức tối đa **200 triệu đồng**: Hộ sản xuất phải có tham gia chuỗi liên kết hoặc có ứng dụng công nghệ cao và **bắt buộc phải có văn bản xác nhận của UBND cấp huyện**.
- **Căn cứ pháp lý:** *Khoản 1, Điều 9 (Điểm a và Điểm b).*
- **Lưu ý nghiệp vụ:** Cán bộ cần kiểm tra kỹ con dấu và thẩm quyền ký xác nhận của cấp Huyện (UBND huyện/Phòng Nông nghiệp huyện), không chấp nhận xác nhận cấp Xã đối với mức 200 triệu đồng.

---

### 2. Quy định về lưu giữ giấy tờ đất đai
- **Nội dung trả lời:** 
  - Khách hàng vay không có TSBĐ **vẫn bắt buộc phải nộp bản chính** Giấy chứng nhận QSD đất (sổ đỏ) cho Agribank lưu giữ trong suốt thời gian vay vốn.
  - Trường hợp chưa có sổ đỏ: Phải nộp Giấy xác nhận của UBND cấp xã chứng minh đất không có tranh chấp và chưa được cấp giấy.
- **Căn cứ pháp lý:** *Khoản 2, Điều 9.*
- **Lưu ý nghiệp vụ:** Cán bộ chi nhánh cần giải thích rõ cho khách hàng: Đây là hình thức "lưu giữ giấy tờ chứng minh tư liệu sản xuất", không phải thủ tục công chứng thế chấp đăng ký giao dịch bảo đảm.

---

### 3. Thời hạn cho vay đối với cây hồ tiêu
- **Nội dung trả lời:** Thời hạn cho vay xác định theo chu kỳ chăm sóc - thu hoạch thực tế nhưng **tối đa không quá 36 tháng** (do hồ tiêu thuộc nhóm cây trồng lâu năm).
- **Căn cứ pháp lý:** *Khoản 3, Điều 9.*
- **Lưu ý nghiệp vụ:** Thỏa thuận kỳ hạn trả nợ gốc và lãi phù hợp với mùa vụ thu hoạch hồ tiêu tại Bình Phước (thường tập trung từ tháng 1 đến tháng 4 hàng năm).`
  },
  {
    id: 'lab-5',
    order: 5,
    title: 'Bài 5: Thực Hành Tự Do (Bài Toán Thực Tế Của Bạn)',
    badge: 'Sáng tạo',
    focusSkill: 'Tự do thử nghiệm & ứng dụng vào công việc hàng ngày',
    focusComponents: ['role', 'task', 'constraint', 'output_format', 'grounding'],
    scenario: 'Áp dụng toàn bộ các kỹ thuật đã học (Vai trò, Ngữ cảnh, Cấu trúc bảng, Ví dụ mẫu, Đối chiếu tài liệu) để giải quyết một bài toán thực tế trong công việc hàng ngày của bạn tại ngân hàng hoặc doanh nghiệp.',
    taskGoal: 'Soạn thảo prompt thực tế của chính bạn, chạy thử nghiệm, quan sát số lượng token, độ trễ và kiểm tra bảng chấm điểm tự động.',
    conceptTag: 'Ứng dụng thực tiễn',
    conceptTitle: 'Chuyển giao vào công việc hàng ngày: Xây dựng kho Prompt cá nhân',
    conceptExplanation: 'Khi bạn đã nắm vững cách định hình Vai trò, thiết lập Nhiệm vụ cụ thể, cài đặt Ràng buộc và yêu cầu Định dạng bảng, bất kỳ tác vụ văn phòng nào cũng có thể được tự động hóa chuẩn xác với AI.',
    sampleInputContext: `Gợi ý các tình huống thực hành tự do:
1. Soạn email từ chối khiếu nại khách hàng khéo léo nhưng tuân thủ đúng điều khoản hợp đồng.
2. Lập kế hoạch tổ chức sự kiện khai trương phòng giao dịch mới tại địa phương.
3. Tóm tắt biên bản họp thẩm định tín dụng dài 5 trang thành 1 trang A4 báo cáo Ban Giám đốc.`,
    promptPlaceholder: 'Hãy viết câu lệnh giải quyết bài toán thực tế của bạn tại cơ quan / doanh nghiệp (soạn thư, lập kế hoạch, tóm tắt báo cáo...)...',
    baselinePrompt: 'Viết cho tôi một bức thư từ chối yêu cầu hoàn tiền phí dịch vụ của khách hàng.',
    improvedPrompt: `Bạn là Trưởng nhóm Xử lý Khiếu nại Dịch vụ Khách hàng Agribank.

Ngữ cảnh: Khách hàng yêu cầu hoàn lại phí thường niên thẻ tín dụng 550.000 VNĐ vì cho rằng "ít sử dụng". Theo biểu phí công khai, phí thường niên được tính tự động vào đầu chu kỳ và chỉ miễn phí nếu doanh số chi tiêu năm trước đạt trên 30 triệu VNĐ (khách hàng chỉ chi tiêu 4 triệu VNĐ).

Nhiệm vụ: Soạn thư phản hồi qua email từ chối yêu cầu hoàn phí một cách thấu cảm, khéo léo nhưng giữ vững nguyên tắc chính sách.

Ràng buộc:
- Bày tỏ sự tri ân vì khách hàng đã đồng hành.
- Giải thích rõ ràng, minh bạch điều kiện miễn phí theo biểu phí đã niêm yết công khai.
- Đề xuất giải pháp thay thế: Tặng voucher ưu đãi 100.000 VNĐ khi thanh toán hóa đơn điện thoại trên app Agribank E-Mobile Banking trong tháng này.
- Giọng văn: Ấm áp, tôn trọng, không đổ lỗi cho khách hàng.`,
    hints: [
      'Xác định rõ vấn đề kinh doanh cần giải quyết.',
      'Sử dụng bảng kiểm tra Rubric Scorecard để xem prompt đã đủ 4 thành tố chưa.',
      'Lưu lại prompt ưng ý vào lịch sử để xuất file sử dụng cho công việc.'
    ],
    expectedOutputFormat: 'Thư điện tử chuẩn mực chăm sóc khách hàng.',
    rubricCriteria: {
      persona: 'Vai trò đại diện thương hiệu hoặc chuyên môn cụ thể.',
      task: 'Nhiệm vụ rõ ràng, giải quyết triệt để vấn đề đặt ra.',
      guardrails: 'Có các ràng buộc kiểm soát ngôn từ và giải pháp đề xuất thay thế.',
      format: 'Định dạng email chuyên nghiệp với tiêu đề, thân bài, lời chúc.'
    },
    comparisonHighlights: {
      promptChanges: [
        'Bổ sung bối cảnh chi tiết và lý do khách hàng khiếu nại phí thường niên',
        'Cài đặt ràng buộc thái độ: Thấu cảm, ấm áp nhưng tuân thủ đúng biểu phí niêm yết',
        'Đề xuất giải pháp thay thế thông minh: Tặng mã giảm giá 100k thay vì từ chối thẳng thừng'
      ],
      outputChanges: {
        before: 'Email từ chối ngắn ngủn, cộc lốc, đổ lỗi cho khách hàng không chi tiêu đủ 30 triệu',
        after: 'Bức thư chăm sóc khách hàng chuẩn mực, giải thích rõ ràng và tặng ưu đãi tri ân giữ chân khách hàng'
      },
      whyBetter: 'Biến AI từ người trả lời máy móc thành chuyên viên chăm sóc khách hàng khéo léo, vừa giữ vững chính sách ngân hàng vừa làm hài lòng khách.'
    },
    miniChallenge: {
      title: 'Thử thách phát hiện thông tin không có trong tài liệu',
      instruction: 'Thử hỏi AI một câu mà tài liệu biểu phí hoàn toàn KHÔNG đề cập (ví dụ: "Biểu phí rút tiền thẻ ATM tại quầy chi nhánh nước ngoài là bao nhiêu?") và kiểm tra xem AI có dũng cảm từ chối đoán mò không.',
      context: 'Chỉ dựa vào tài liệu biểu phí đính kèm ở trên, hãy cho biết: "Phí rút tiền mặt tại quầy giao dịch chi nhánh Agribank ở nước ngoài là bao nhiêu %?". Nếu tài liệu không có số liệu này, hãy trả lời chính xác: "Tài liệu không đề cập thông tin này, không được phép suy đoán."',
      tip: 'Kỹ thuật Grounding chuẩn mực là AI phải biết nói "Tôi không biết" khi tài liệu đính kèm không có thông tin.'
    },
    simulatedBaselineOutput: `Kính gửi khách hàng,

Về yêu cầu hoàn tiền phí thường niên 550.000đ của quý khách, chúng tôi xin thông báo ngân hàng không thể hoàn lại số tiền này vì đây là phí cố định hàng năm đã quy định trong hợp đồng.

Quý khách cần chi tiêu trên 30 triệu mới được miễn phí. Vì quý khách không đạt điều kiện nên mong quý khách thông cảm.

Trân trọng.`,
    simulatedImprovedOutput: `**Tiêu đề:** [Agribank] Phản hồi về yêu cầu hỗ trợ phí thường niên Thẻ tín dụng - Khách hàng Nguyễn Văn A

Kính gửi Quý khách Nguyễn Văn A,

Lời đầu tiên, Agribank xin trân trọng gửi lời cảm ơn chân thành đến Quý khách vì đã luôn tin tưởng lựa chọn đồng hành cùng dịch vụ thẻ Agribank trong suốt thời gian qua.

Bộ phận Chăm sóc Khách hàng đã tiếp nhận và xem xét kỹ lưỡng đề nghị hỗ trợ miễn hoàn phí thường niên thẻ tín dụng hạn mức Silver (số tiền 550.000 VNĐ) của Quý khách. Chúng tôi rất thấu hiểu mong muốn tối ưu chi phí sử dụng của Quý khách đối với những dịch vụ chưa có tần suất phát sinh giao dịch thường xuyên.

Về vấn đề này, Agribank xin phép được chia sẻ cùng Quý khách:
Theo Biểu phí dịch vụ thẻ được niêm yết công khai và thỏa thuận mở thẻ, phí thường niên là khoản phí duy trì hạ tầng kết nối thanh toán quốc tế và hệ thống bảo mật 3D-Secure 24/7. Agribank hiện có chính sách hoàn toàn miễn phí thường niên năm tiếp theo đối với các chủ thẻ có tổng doanh số chi tiêu năm liền trước đạt từ 30.000.000 VNĐ trở lên. Qua kiểm tra dữ liệu giao dịch, rất tiếc mức chi tiêu của Quý khách chưa đạt mốc ưu đãi nêu trên nên hệ thống chưa thể tự động hoàn lại khoản phí thường niên kỳ này.

Nhằm tri ân sự gắn bó của Quý khách và mong muốn mang đến trải nghiệm thanh toán số tiện ích hơn, Agribank xin trân trọng gửi tặng Quý khách **Mã ưu đãi AGRI100 (giảm 100.000 VNĐ)** áp dụng khi thanh toán hóa đơn điện/nước/viễn thông trên ứng dụng Agribank E-Mobile Banking trong tháng này. Đồng thời, tư vấn viên chi nhánh sẽ liên hệ để hướng dẫn Quý khách các chương trình tích điểm hoàn tiền để đạt điều kiện miễn phí trong các kỳ tiếp theo.

Agribank rất mong nhận được sự cảm thông và thấu hiểu từ Quý khách. Nếu cần hỗ trợ thêm thông tin, Quý khách vui lòng liên hệ Tổng đài CSKH 24/7: **1900 5588 18**.

Kính chúc Quý khách nhiều sức khỏe, an khang và luôn có những trải nghiệm hài lòng cùng Agribank!

Trân trọng,
**Phòng Dịch vụ Khách hàng - Agribank**`
  }
];

