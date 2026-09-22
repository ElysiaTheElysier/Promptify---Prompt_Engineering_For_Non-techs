# BỘ TÀI LIỆU ĐẶC TẢ BÀI LAB (CURRICULUM SPECIFICATIONS)
## CHƯƠNG TRÌNH ĐÀO TẠO THỰC CHIẾN AI & PROMPT ENGINEERING CHO DÂN VĂN PHÒNG (NON-TECH)

Thư mục này chứa toàn bộ các **File Đặc tả Chuẩn (Lab Specifications)** được thiết kế theo phương pháp **Đi từ số 0 (Zero to Hero)**, chọn lọc tinh hoa từ Mindmap Kỹ nghệ Prompt & Cấu hình LLM hiện đại để phục vụ trực tiếp cho nhân sự nghiệp vụ văn phòng (Doanh nghiệp, Ngân hàng, Truyền thông, Vận hành, CSKH, Tín dụng).

Mỗi file trong thư mục này vừa là **Giáo án sư phạm chi tiết**, vừa là **Prompt Mẫu Mực (Meta-Specification)** để bạn có thể nạp trực tiếp vào bất kỳ mô hình AI nào (Gemini, Claude, GPT-4o) nhằm tự động sinh ra mã nguồn bài lab, slide bài giảng, hoặc bài tập thực hành.

---

## 🗺️ BẢN ĐỒ LỘ TRÌNH 8 BÀI LAB THỰC HÀNH (CURATED MASTER CURRICULUM)

Lộ trình được tuyển chọn và chuẩn hóa từ Mindmap kỹ thuật sang năng lực công việc văn phòng thực tế:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: NỀN TẢNG KỸ NGHỆ PROMPT & BẢO MẬT DOANH NGHIỆP (CORE WORKFLOWS)           │
├─────────────────────────┬─────────────────────────┬────────────────────────────────────┤
│ 🛡️ Lab 01: PII Scrubbing│ 📑 Lab 02: Context Eng. │ ⚖️ Lab 03: CoT Guardrails          │
│ Khử định danh dữ liệu   │ Phân tách Tĩnh / Động   │ Suy luận 4 mắt, chống ảo giác      │
├─────────────────────────┼─────────────────────────┼────────────────────────────────────┤
│ 🤖 Lab 04: ReAct Agent  │ 🎛️ Lab 05: Sampling     │ 📊 Lab 06: Structured Outputs      │
│ Vòng lặp tra cứu quy chế│ Temperature, Top-P, Stop│ Trích xuất khuôn bảng cho Excel    │
├─────────────────────────┴─────────────────────────┴────────────────────────────────────┤
│ GIAI ĐOẠN 2: AN TOÀN NÂNG CAO & TỰ ĐỘNG HÓA TƯ DUY (ENTERPRISE DEFENSE & META-PROMPT)  │
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│ 🛡️ Lab 07: Prompt Injection Defense               │ 💡 Lab 08: Step-Back & Meta-Prompt │
│ Vùng cách ly dữ liệu lạ & Kiểm định nợ xấu        │ Lùi một bước & Dùng AI tự viết lệnh│
└───────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 📂 CHI TIẾT DANH MỤC 8 FILE ĐẶC TẢ BÀI LAB

| STT | Tên File Đặc tả | Cấp độ | Ánh xạ từ Mindmap | Ẩn Dụ Văn Phòng (Mental Model) |
| :---: | :--- | :---: | :--- | :--- |
| **01** | [`LAB_01_PII_SCRUBBING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_01_PII_SCRUBBING.md) | Số 0 | *Tokens, Context Window, Data Privacy* | *"Bút xóa PII: Bôi đen giấy tờ trước khi đưa cho cộng sự quán cà phê"* |
| **02** | [`LAB_02_CONTEXT_ENGINEERING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_02_CONTEXT_ENGINEERING.md) | Cơ bản | *Contextual Prompting, Few-Shot, Delimiters* | *"Tập Bìa Hồ Sơ Bàn Làm Việc (Brand Dossier): Cố định văn phong Tam nông"* |
| **03** | [`LAB_03_MULTISTEP_COT_GUARDRAILS.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_03_MULTISTEP_COT_GUARDRAILS.md) | Trung cấp | *Chain of Thought (CoT), Guardrails, Latency* | *"Quy trình Phê duyệt 4 Mắt: Ép AI suy nghĩ công khai trước khi phát ngôn"* |
| **04** | [`LAB_04_REACT_AGENTIC_WORKFLOW.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_04_REACT_AGENTIC_WORKFLOW.md) | Nâng cao | *ReAct Prompting, Agents, Tool Use* | *"Trợ lý Nhấc máy Tra cứu: Mở Thông tư 04 tính tiền lãi trước khi trả lời khách"* |
| **05** | [`LAB_05_TEMPERATURE_AND_SAMPLING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_05_TEMPERATURE_AND_SAMPLING.md) | Cơ bản | *Temperature, Top-P, Top-K, Max Tokens, Stop Sequences* | *"Núm vặn nhiệt độ sáng tạo: Vặn số 0 khi làm kế toán/số liệu, vặn 0.8 khi làm slogan/PR"* |
| **06** | [`LAB_06_STRUCTURED_OUTPUTS_EXTRACTION.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_06_STRUCTURED_OUTPUTS_EXTRACTION.md) | Cơ bản | *Structured Outputs, Markdown, CSV, XML tags, Zero preamble* | *"Khuôn dập bánh quy: Ép AI chỉ đổ dữ liệu vào 6 cột, cấm nói thừa để dán thẳng vào Excel"* |
| **07** | [`LAB_07_PROMPT_INJECTION_AND_DEFENSE.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_07_PROMPT_INJECTION_AND_DEFENSE.md) | Trung cấp | *Prompt Injection, Hallucination, LLM Self-Evaluation, Boundary* | *"Bức thư cài mã độc: Phòng ngừa việc AI bị tài liệu lạ sai khiến và cơ chế tự kiểm chứng chéo"* |
| **08** | [`LAB_08_STEPBACK_AND_META_PROMPTING.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/LAB_08_STEPBACK_AND_META_PROMPTING.md) | Nâng cao | *Step-back Prompting, Automatic Prompt Engineering (APE), Prompt Tuning* | *"Lùi một bước để nhìn toàn cảnh & Nhờ chuyên gia AI tự viết bộ câu lệnh chuẩn"* |

---

## 🏗️ CẤU TRÚC 4 PHẦN CHUẨN MỰC TRONG MỖI FILE ĐẶC TẢ

Mỗi bài lab đều tuân thủ chặt chẽ cấu trúc 4 phần phục vụ cả 2 mục đích: **Dạy người** và **Dạy máy**:

```
┌─────────────────────────────────────────────────────────────┐
│ PHẦN 1: KIẾN THỨC NỀN TẢNG (TỪ SỐ 0 CHO DÂN VĂN PHÒNG)     │
│ • Under The Hood: Bản chất kỹ thuật máy tính hoạt động ra sao.│
│ • Mental Model: Hình tượng hóa thành công việc bàn giấy quen thuộc. │
│ • Bẫy nhận thức: Sai lầm phổ biến mà người mới thường mắc phải.   │
│ • Quy tắc vàng kỹ thuật: Bảng thông số & công thức thực chiến.    │
├─────────────────────────────────────────────────────────────┤
│ PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)       │
│ • Tình huống nghiệp vụ chân thực (Ngân hàng, CSKH, Tín dụng)│
│ • Dữ liệu đầu vào thô kèm bẫy thực tế (Raw Data & Context)  │
│ • Nhiệm vụ học viên & Cấu trúc Prompt mẫu mực khuyến nghị.  │
├─────────────────────────────────────────────────────────────┤
│ PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION)    │
│ • Test Case 1: Standard Verification (Kiểm tra nghiệp vụ).  │
│ • Test Case 2: Negative Constraint / Blacklist / Injection. │
│ • Test Case 3: Boundary & Formatting (Khớp số liệu, ô bảng).│
│ • Bảng Rubric chấm điểm tự động 100 điểm với trọng số rõ ràng.│
├─────────────────────────────────────────────────────────────┤
│ PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)     │
│ • Lệnh mẫu sẵn sàng để bạn copy-paste cho AI sinh tiếp nội dung.│
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 QUY CHUẨN THIẾT KẾ TRẢI NGHIỆM TƯƠNG TÁC & SO SÁNH TRƯỚC / SAU
Xem tài liệu đặc tả chi tiết: 👉 [`INTERACTION_DESIGN_AND_BEFORE_AFTER_SPEC.md`](file:///c:/Users/Admin/Documents/ThayDucStartup/Promptify---Prompt_Engineering_For_Non-techs/curriculum-specs/INTERACTION_DESIGN_AND_BEFORE_AFTER_SPEC.md)

### 3 Nguyên tắc Tương tác Cốt lõi cho Dân Non-tech:
1. **Quy trình 2 Lần Chạy (2-Run Interactive Flow):** 
   - *Lần 1 (Trước - Before):* Bấm nút chạy câu lệnh thô $\rightarrow$ Thấy ngay lỗi sai điển hình (Lộ PII, văn sáo rỗng, vỡ nợ, sai số, văn xuôi không dán được vào Excel).
   - *Lần 2 (Sau - After):* Bấm nút nạp kỹ thuật chuẩn $\rightarrow$ Kết quả lột xác hoàn toàn, chuyên nghiệp, an toàn 100%.
2. **Đối chiếu A/B Song Song (Side-by-Side Diff View):** 
   - Cột Đỏ (Trước) vs Cột Xanh (Sau) đặt cạnh nhau giúp học viên nhìn thấy ngay sự khác biệt về câu chữ và cấu trúc.
   - Hộp *"Tại sao kết quả sau tốt hơn?" (Why It's Better)* tạo khoảnh khắc **"Aha!"** ngay tại lớp.
3. **Thao tác 1-Chạm (Zero-Friction UI):** 
   - Luôn có sẵn nút "Nạp câu lệnh gợi ý", "Sao chép dữ liệu thô", "Xem gợi ý của Bé Trợ lý AI" để học viên không bao giờ bị tắc ý tưởng.

---

## 🤖 HƯỚNG DẪN DÙNG CÁC FILE NÀY ĐỂ AI TỰ ĐỘNG GEN NỘI DUNG

Khi bạn muốn dùng một mô hình AI (như Gemini 1.5 Pro, Claude 3.5 Sonnet hoặc GPT-4o) để tự động sinh ra các tài liệu phái sinh, hãy làm theo các câu lệnh mẫu sau:

### Cách 1: Sinh mã nguồn TypeScript nạp vào hệ thống Promptify
```text
Hãy đọc kỹ tài liệu đặc tả đính kèm [TÊN_FILE.md] và chuyển đổi thành một đối tượng TypeScript 
tuân thủ chính xác interface `LabStep` của nền tảng Promptify:
- ĐẢM BẢO TÍNH TƯƠNG TÁC VÀ SO SÁNH TRƯỚC/SAU RÕ RỆT theo quy chuẩn [INTERACTION_DESIGN_AND_BEFORE_AFTER_SPEC.md].
- Viết đầy đủ các trường: id, order, title, badge, focusSkill, scenario, conceptTag, conceptTitle, 
  conceptExplanation, baselinePrompt, improvedPrompt, simulatedBaselineOutput, 
  simulatedImprovedOutput, hints, expectedOutputFormat, rubricCriteria, comparisonHighlights, miniChallenge.
- simulatedBaselineOutput PHẢI THỂ HIỆN RÕ LỖI SAI ĐIỂN HÌNH; simulatedImprovedOutput PHẢI KHẮC PHỤC HOÀN HẢO.
- Giữ nguyên toàn bộ số liệu và văn phong nghiệp vụ như tài liệu mô tả.
```

### Cách 2: Sinh Slide bài giảng cho Giảng viên (Slide Deck Script)
```text
Dựa trên Phần 1 (Kiến thức nền tảng) và Phần 2 (Bài toán thực hành) của [TÊN_FILE.md], 
hãy thiết kế cấu trúc 5 Slide bài giảng cho Giảng viên:
- Slide 1: Bẫy nhận thức & Rủi ro thực tế của dân văn phòng
- Slide 2: Ẩn dụ công việc (Mental Model) giải thích bản chất công nghệ
- Slide 3: Công thức cấu trúc câu lệnh vàng (Formula)
- Slide 4: Thử thách tại lớp & Dữ liệu thô
- Slide 5: Phân tích Đối chiếu Trước / Sau (Before vs After) với khoảnh khắc "Aha!"
```

### Cách 3: Tạo Bộ Đề Thi Trắc Nghiệm Ôn Tập (Gamified Quiz)
```text
Dựa trên các khái niệm kỹ thuật và Test Cases trong [TÊN_FILE.md], hãy tạo 03 câu hỏi 
trắc nghiệm tình huống dạng Kahoot/Mentimeter (kèm 4 đáp án và giải thích chi tiết) 
để thử thách học viên trong 5 phút khởi động đầu giờ.
```
