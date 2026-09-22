# ĐẶC TẢ BÀI LAB 08: TƯ DUY LÙI MỘT BƯỚC & DÙNG AI TỰ THIẾT KẾ CÂU LỆNH (STEP-BACK PROMPTING & META-PROMPTING)
> **Mã bài lab:** `LAB-08-STEPBACK-META-PROMPT`  
> **Cấp độ:** Đi từ số 0 (Từ Người Soạn Prompt Thủ Công Sang Kiến Trúc Sư Tự Động Hóa Lời Nhắc)  
> **Thời lượng khuyến nghị:** 45 - 60 Phút  
> **Mục tiêu kỹ thuật:** Làm chủ kỹ thuật Step-Back Prompting (Tư duy trừu tượng hóa để giải quyết bài toán phức tạp) và kỹ thuật Meta-Prompting / Automatic Prompt Engineering (Sử dụng chính mô hình AI để tự động thiết kế, tối ưu và mở rộng các bộ câu lệnh chuyên nghiệp cho công việc văn phòng).

---

## PHẦN 1: KIẾN THỨC NỀN TẢNG (DÀNH CHO DÂN VĂN PHÒNG ĐI TỪ SỐ 0)

### 1.1 Bản chất Kỹ thuật Đằng sau LLM (Under The Hood)
- **Căn bệnh "Sa lầy vào Chi tiết" (Detail Bias / Local Minima):**
  - Khi bạn đưa cho AI một bài toán phức tạp nhiều rắc rối (ví dụ: mâu thuẫn giữa quy chế phòng ban A và phòng ban B trong xử lý một hồ sơ khó), nếu hỏi ngay *"Hãy giải quyết ca này thế nào?"*, AI sẽ bị cuốn theo các chi tiết nhỏ lẻ, đưa ra giải pháp chắp vá, giải quyết được việc A nhưng lại phá hỏng nguyên tắc của việc B.
- **Kỹ thuật Step-Back Prompting (Lùi một bước để nhìn toàn cảnh - Google DeepMind, 2023):**
  - Thay vì lao thẳng vào chi tiết, ta ép AI thực hiện một bước **Trừu tượng hóa (Abstraction Step)**:
    1. *Câu hỏi Lùi (Step-Back Question):* Hỏi về nguyên tắc nền tảng hoặc quy định bao trùm chi phối vấn đề này là gì?
    2. *Tư duy Cụ thể:* Dùng chính nguyên tắc nền tảng vừa tìm được ở bước 1 để soi chiếu và giải quyết ca nghiệp vụ cụ thể.
  - Kết quả: Câu trả lời mang tính chiến lược, chuẩn chỉ theo tầm nhìn của nhà quản lý cấp cao thay vì góc nhìn hẹp của nhân viên tác nghiệp.
- **Meta-Prompting / Automatic Prompt Engineering (AI Tự Viết Prompt):**
  - Dân văn phòng thường lo lắng: *"Tôi có quá nhiều việc, làm sao nhớ hết Role, Context, Constraints, Few-shot, Markdown schema để viết prompt dài mỗi ngày?"*.
  - Câu trả lời: **Hãy dùng chính AI để viết Prompt cho bạn!**
  - Bạn chỉ cần đưa ra ý tưởng thô sơ (Intent), AI sẽ đóng vai một **Kỹ sư Prompt Cao cấp (Prompt Architect)**, tự động phân tích và sinh ra một bộ câu lệnh chuẩn 5 thành tố chuyên nghiệp, có sẵn biến số, có sẵn rubric và test case để bạn lưu vào thư viện dùng quanh năm.

### 1.2 Ẩn dụ Văn phòng (Mental Model)
> *"Hãy coi Step-Back & Meta-Prompting như **hai cố vấn cấp cao trên bàn làm việc của bạn**:*  
> *• Khi gặp một vụ tranh chấp nghiệp vụ rắc rối: Vị cố vấn thứ nhất bảo bạn **'Lùi lại một bước (Step-back)':** Đừng vội cãi nhau về câu chữ trong biên bản, hãy mở cuốn Luật Doanh nghiệp và Tôn chỉ Ngân hàng ra xem nguyên tắc cao nhất là gì.*  
> *• Khi bạn cần tạo một quy trình mới: Vị cố vấn thứ hai là **Trưởng ban Cải tiến Quy trình (Meta-Prompting):** Bạn chỉ cần nói 'Tôi muốn một công cụ đánh giá nhân viên thử việc', vị cố vấn này sẽ lập tức soạn cho bạn một bản quy chế kèm biểu mẫu hoàn hảo từng dấu chấm phẩy."*

---

## PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)

### 2.1 Tình huống Nghiệp vụ (Scenario)
Ngân hàng Agribank chuẩn bị bước vào giai đoạn chuyển đổi số toàn diện các phòng giao dịch xã (Kiosk Agribank Digital). Ban Lãnh đạo nhận thấy các phòng ban đang làm việc rời rạc:
- Phòng CNTT chỉ chăm chăm vào công nghệ kỹ thuật (nhận diện khuôn mặt, CCCD gắn chip).
- Phòng Truyền thông chỉ lo làm băng rôn, tờ rơi quảng cáo chung chung.
- Phòng Dịch vụ Khách hàng thì lo lắng bà con nông dân lớn tuổi mù công nghệ sẽ không biết dùng và gây ùn tắc tại quầy.

Trưởng ban Đổi mới sáng tạo giao cho bạn 2 nhiệm vụ:
- **Nhiệm vụ 1 (Ứng dụng Step-Back Prompting):** Không giải quyết vụn vặt từng việc, hãy dùng Step-Back Prompting yêu cầu AI lùi lại một bước để xác định: *"Bản chất và triết lý cốt lõi của việc bình dân hóa công nghệ số cho người nông dân (Inclusive Digital Banking) là gì?"*, từ đó xây dựng một Kế hoạch Hành động Đồng bộ cho cả 3 phòng ban.
- **Nhiệm vụ 2 (Ứng dụng Meta-Prompting):** Yêu cầu AI tự động thiết kế một "Bộ Prompt Chuẩn Nghiệp Vụ" để chuyển giao cho toàn bộ cán bộ chi nhánh cấp huyện dùng hàng ngày khi triển khai Kiosk Digital.

### 2.2 Nhiệm vụ Học viên (Task)
1. **Thiết kế Step-Back Prompt:**
   - Đặt câu hỏi trừu tượng nền tảng: Xác định 3 nguyên tắc bất biến khi đưa công nghệ số về nông thôn.
   - Vận dụng 3 nguyên tắc đó để giải bài toán phân công phối hợp giữa CNTT - Truyền thông - Dịch vụ Khách hàng.
2. **Thiết kế Meta-Prompt (Kỹ sư Prompt Tự động):**
   - Đưa câu lệnh mồi (Seed Prompt): *"Tôi muốn một prompt giúp giao dịch viên hướng dẫn bà con nông dân mở tài khoản trên Kiosk số"*.
   - Ép AI xuất bản một **System Prompt Hoàn Chỉnh** có đầy đủ: Role, Tone văn hóa Tam nông, Guardrails an toàn bảo mật, các bước chỉ dẫn bằng tiếng dân dã, và kịch bản ứng phó khi máy quét lỗi.

### 2.3 Cấu trúc Khung Prompt Đề xuất (Prompt Architecture)
```text
=== KỸ THUẬT 1: STEP-BACK PROMPTING TRONG HOẠCH ĐỊNH CHIẾN LƯỢC ===
Bạn là Cố vấn Chiến lược Chuyển đổi số Ngân hàng Nông nghiệp.

BƯỚC 1 (STEP-BACK QUESTION - TƯ DUY NỀN TẢNG):
Trước khi lập kế hoạch chi tiết, hãy trả lời câu hỏi trừu tượng nền tảng:
"Nguyên lý cốt lõi và rào cản tâm lý lớn nhất của người nông dân vùng sâu vùng xa khi tiếp cận dịch vụ ngân hàng tự động (Kiosk Digital) là gì? 3 nguyên tắc bất di bất dịch để thành công là gì?"

BƯỚC 2 (VẬN DỤNG VÀO TÌNH HUỐNG THỰC TẾ):
Dựa trên 3 nguyên tắc cốt lõi đã rút ra ở Bước 1, hãy xây dựng Kế hoạch Hành động Đồng bộ 3 bên (CNTT - Truyền thông - Dịch vụ Quầy) để triển khai Kiosk số tại 50 phòng giao dịch huyện trong Quý 4/2026.

-------------------------------------------------------------

=== KỸ THUẬT 2: META-PROMPTING (AI VIẾT PROMPT CHUẨN DOANH NGHIỆP) ===
Bạn là Chuyên gia Cao cấp về Kỹ nghệ Lời nhắc (Lead Prompt Architect).

Ý TƯỞNG SƠ SÀI CỦA NGƯỜI DÙNG:
"Cần một prompt cho giao dịch viên Agribank dùng để sinh lời thoại hướng dẫn bà con nông dân dùng Kiosk tự động."

NHIỆM VỤ CỦA BẠN:
Hãy chuyển hóa ý tưởng sơ sài trên thành một BỘ PROMPT CHUYÊN NGHIỆP CHUẨN 5 THÀNH TỐ:
1. System Role & Persona
2. Context & Task Specification
3. Guardrails & Negative Constraints (Cấm thuật ngữ IT rườm rà)
4. Few-shot Example (1 đoạn thoại mẫu mộc mạc)
5. Output Formatting (Khuôn dạng phân loại theo 3 tình huống tại Kiosk)
```

---

## PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION & TEST CASES)

### Test Case 1: Kiểm Tra Hiệu Quả Tư Duy Step-Back (Strategic Depth Test)
- **Mục tiêu:** AI không đưa ra các giải pháp bề nổi (như "tặng quà", "phát tờ rơi"), mà phải chạm đến tâm lý học hành vi của người nông dân.
- **Tiêu chí kiểm thử:** Trong Bước 1, AI phải chỉ ra được:
  - Nỗi sợ mất tiền do bấm nhầm nút.
  - Thói quen "thấy người thật mới tin".
  - Nguyên tắc "Cầm tay chỉ việc - Đơn giản hóa tối đa".
- **Đánh giá:** Thiếu bước trừu tượng hóa tâm lý → **Trừ 30đ**.

### Test Case 2: Kiểm Tra Cấu Trúc Meta-Prompt Sinh Ra (Meta-Prompt Completeness)
- **Mục tiêu:** Bộ prompt do AI tự động thiết kế phải có đầy đủ 5 thành tố của một System Prompt cấp doanh nghiệp.
- **Tiêu chí kiểm thử:** Quét bộ prompt được sinh ra có chứa:
  - Khối vai trò: `Role` / `Persona`
  - Khối bối cảnh: `Context`
  - Khối ràng buộc: `Constraints` (Cấm dùng từ như "sinh trắc học", "xác thực OTP", "giao thức")
  - Đoạn mẫu: `Few-shot`
- **Đánh giá:** Thiếu một trong các thành tố cốt lõi → **Trừ 20đ**.

### Test Case 3: Tính Hành Động Ngay Của Bản Kế Hoạch (Actionability Test)
- **Mục tiêu:** Bản kế hoạch 3 bên phải rõ việc cho từng phòng: CNTT làm gì, Truyền thông làm gì, Quầy làm gì.

### Bảng Rubric Đánh Giá (100 Điểm):
| Tiêu chí | Trọng số | Điều kiện đạt |
| :--- | :---: | :--- |
| **Tư Duy Step-Back Xuất Sắc** | 35đ | Tách bạch 2 bước: Nguyên lý nền tảng → Kế hoạch hành động thực tế. |
| **Chất Lượng Bộ Meta-Prompt** | 35đ | Bộ prompt được sinh ra đạt chuẩn công nghiệp, dùng được ngay tại chi nhánh. |
| **Đồng Bộ Phối Hợp 3 Phòng Ban** | 15đ | Phân công rõ ràng giữa CNTT, Truyền thông và Giao dịch viên. |
| **Văn Hóa Phục Vụ Nông Dân** | 15đ | Thấm đẫm tinh thần kiên nhẫn, gần gũi, xóa bỏ rào cản số cho bà con. |

---

## PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)
```text
Dựa trên tài liệu đặc tả [LAB-08-STEPBACK-META-PROMPT], hãy tạo dữ liệu bài lab chuẩn cấu trúc JSON/TypeScript LabStep gồm:
1. scenario về việc triển khai Kiosk số Agribank Digital tại nông thôn đòi hỏi tầm nhìn chiến lược và bộ công cụ câu lệnh chuẩn cho giao dịch viên.
2. baselinePrompt là một câu hỏi sự vụ ngắn ("Làm sao để người dân chịu dùng Kiosk số?") dẫn đến câu trả lời chắp vá, hời hợt.
3. improvedPrompt kết hợp cả 2 kỹ thuật đỉnh cao: Step-Back Prompting và Meta-Prompting.
4. simulatedBaselineOutput là những lời khuyên lý thuyết sáo rỗng ("nên tuyên truyền nhiều hơn", "nên giảm phí").
5. simulatedImprovedOutput là một kế hoạch chiến lược xuất sắc chạm đến tâm lý học người nông dân và 1 bộ Prompt hoàn chỉnh sẵn sàng chuyển giao cho 2.300 phòng giao dịch toàn quốc.
```
