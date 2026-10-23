# ĐẶC TẢ THIẾT KẾ TRẢI NGHIỆM TƯƠNG TÁC & ĐỐI CHIẾU TRƯỚC/SAU (INTERACTIVE & BEFORE-AFTER DESIGN SPECIFICATION)
## DÀNH CHO DÂN VĂN PHÒNG KHÔNG CHUYÊN KỸ THUẬT (NON-TECH LEARNERS)

Tài liệu này là **Bộ Quy chuẩn Thiết kế Trải nghiệm Bài Lab (UX/Pedagogical Framework)** bắt buộc áp dụng cho toàn bộ 8 bài lab trong chương trình. 

Mục tiêu tối thượng: **Học viên không cần biết kỹ thuật vẫn thao tác dễ dàng trong 3 bước, tương tác liên tục và nhìn thấy ngay sự "lột xác" kỳ diệu giữa kết quả Trước (Before) và Sau (After) khi áp dụng kỹ thuật Prompt.**

---

## 🎯 3 NGUYÊN TẮC THIẾT KẾ BẤT BIẾN (CORE UX PRINCIPLES)

```
┌───────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│  1. TƯƠNG TÁC 1-CHẠM      │     │  2. GIẢM TẢI NHẬN THỨC    │     │  3. KHOẢNH KHẮC "AHA!"    │
│  (High Interactivity)     │ ──► │  (Zero Cognitive Load)    │ ──► │  (Visual Before/After)    │
│  • Bấm là chạy ngay       │     │  • Không bắt gõ từ đầu    │     │  • So sánh song song A/B  │
│  • Giả lập stream từng từ │     │  • 1 màn hình duy nhất    │     │  • Thấy rõ lỗi dở vs đẹp  │
└───────────────────────────┘     └───────────────────────────┘     └───────────────────────────┘
```

---

## I. QUY TRÌNH HỌC TẬP "2 LẦN CHẠY" (THE 2-RUN INTERACTIVE FLOW)

Để học viên thấy rõ sự thay đổi, mỗi bài lab **bắt buộc phải dẫn dắt học viên trải qua đúng 2 lần bấm máy**:

```
[BƯỚC 1: CHẠY THỬ PROMPT SƠ SÀI]      ──►   [BƯỚC 2: QUAN SÁT KẾT QUẢ DỞ & CẢNH BÁO]
  (Bấm "Nạp Prompt Thô" -> Bấm "Chạy")             (AI in ra lỗi sai điển hình, điểm Rubric thấp)
                                                               │
                                                               ▼
[BƯỚC 4: MỞ ĐỐI CHIẾU A/B TRƯỚC - SAU] ◄──   [BƯỚC 3: KÍCH HOẠT KỸ THUẬT & CHẠY LẦN 2]
  (Bảng so sánh 2 cột: Đỏ vs Xanh)                 (Bấm "Nạp Kỹ Thuật Chuẩn" -> Bấm "Chạy")
```

### 1. Lần Chạy Thứ Nhất (Lần 1 - TRƯỚC / BEFORE): "Nếm trải Sai Lầm Thực Tế"
- **Hành vi học viên:** Học viên bấm 1 nút *"Nạp câu lệnh thô thường dùng"* rồi bấm nút *"Chạy thử nghiệm"*.
- **Trải nghiệm quan sát:**
  - AI phản hồi với một kết quả "dở tệ" hoặc chứa đựng nguy cơ thực tế:
    - *Lab 1:* AI in thẳng số CCCD và số tài khoản lên bài viết → Hệ thống hiện cảnh báo đỏ **Vi phạm Nghị định 13**.
    - *Lab 2:* AI viết một bài quảng cáo nhố nhăng như bán hàng online ("siêu rẻ, bùng nổ deal khủng") làm mất uy tín ngân hàng.
    - *Lab 3:* AI cuống cuồng thanh minh "chúng tôi không vỡ nợ, giám đốc không trốn" làm người dân càng hoang mang.
    - *Lab 4:* AI khuyên chung chung giáo điều, không tính được số tiền lãi thiệt hại hơn 10 triệu đồng.
    - *Lab 5:* Số liệu lãi suất nhảy múa lung tung mỗi lần bấm chạy do để nhiệt độ quá cao.
    - *Lab 6:* AI trả lời bằng văn xuôi dài dòng kèm lời chào xã giao, không thể copy vào Excel.
    - *Lab 7:* AI bị dính bẫy Prompt Injection, tự ý xóa nợ xấu và đề xuất duyệt vay sai luật.
    - *Lab 8:* AI đưa ra lời khuyên chắp vá, hời hợt, không có tính phối hợp chiến lược.
- **Tâm lý học viên:** Nhận ra ngay: *"Hóa ra thói quen gõ lệnh sơ sài bấy lâu nay của mình tai hại như vậy!"*.

### 2. Lần Chạy Thứ Hai (Lần 2 - SAU / AFTER): "Trải Nghiệm Sự Chuyên Nghiệp"
- **Hành vi học viên:** Học viên bấm nút *"Nạp giải pháp tối ưu"* (hoặc tự sửa theo gợi ý của Bé Trợ Lý AI) rồi bấm nút *"Chạy thử nghiệm"*.
- **Trải nghiệm quan sát:**
  - Kết quả sinh ra lột xác 180 độ: Ngôn từ mộc mạc chuẩn Tam nông, an toàn 100% về dữ liệu, bảng biểu Markdown tinh gọn copy sang Excel trong 1 click, trích dẫn đầy đủ điều luật bảo vệ người dân.
  - Điểm số Rubric nhảy vọt từ 20đ → 95đ.

---

## II. BẢNG ĐỐI CHIẾU SONG SONG A/B (SIDE-BY-SIDE DIFF COMPARISON)

Ngay sau lần chạy thứ 2, hệ thống tự động hiển thị thẻ kích hoạt:
> 🔍 **"Bạn đã có 2 lần thử trong bài này! Bấm để xem đối chiếu tiến bộ Trước & Sau"**

Khi bấm vào, màn hình mở ra **Bảng So Sánh 2 Cột Trực Quan**:

| Thành phần So sánh | Cột Trái (TRƯỚC - Lần 1: Prompt Thô) 🔴 | Cột Phải (SAU - Lần 2: Đã Tối Ưu) 🟢 |
| :--- | :--- | :--- |
| **Câu lệnh (Prompt)** | Câu lệnh ngắn củn, thiếu vai trò, không có ràng buộc, dán thẳng dữ liệu nhạy cảm. | Có cấu trúc phân tầng rõ ràng, dùng biến giữ chỗ `[TÊN_KH]`, có System Role và Guardrails. |
| **Kết quả AI sinh ra (Output)** | Dài dòng, văn phong đàm thoại, dính lỗi số liệu hoặc vi phạm bảo mật. | Ngắn gọn, bảng biểu rõ ràng, ngôn từ chuẩn văn hóa Agribank, chính xác từng chữ số. |
| **Đánh giá Nghiệp vụ** | ❌ Vi phạm bảo mật / ❌ Sai định dạng / ❌ Giọng văn sáo rỗng. | ✅ An toàn dữ liệu / ✅ Đúng khuôn Excel / ✅ Văn phong Tam nông chuẩn mực. |
| **Hộp Giải thích:**<br>*(Why It's Better)* | \- | 💡 **"Tại sao kết quả sau vượt trội?"**<br>*Giải thích ngắn gọn 2 câu bằng tiếng Việt bình dân lý do tại sao kỹ thuật này tạo nên sự khác biệt.* |

---

## III. THIẾT KẾ GIAO DIỆN TỐI GIẢN DÀNH CHO DÂN VĂN PHÒNG (MINIMAL COGNITIVE LOAD)

Để một nhân sự U40, U50 chưa từng học công nghệ vẫn thao tác thuần thục, bài lab phải tuân thủ thiết kế:

### 1. Không gian làm bài 2 Cột Song song (Hybrid Workspace)
- **Cột Trái (Đề bài & Nguyên liệu):** 
  - Đề bài thực tế dưới 4 dòng.
  - Nút **"📋 Copy Dữ Liệu Thô"** (Bấm 1 cái là tự copy vào clipboard).
  - Khung **Gợi ý từng bước (Hints)** có thể đóng/mở để không làm rối mắt.
- **Cột Phải (Khu vực Thao tác):**
  - Ô soạn thảo Prompt có sẵn nút **"Nạp câu lệnh gợi ý"** (dành cho người lười gõ).
  - Nút bấm to, rõ ràng: **"🚀 Chạy Câu Lệnh (Ctrl + Enter)"**.
  - Khung kết quả hiển thị streaming chữ chạy sinh động kèm huy hiệu điểm số.

### 2. Trợ Lý Ảo Đồng Hành 1-Click (AiCoach Widget)
- Một linh vật nhỏ ở góc dưới màn hình luôn hiển thị lời khuyên ngữ cảnh:
  - *"Bài này bác nhớ dùng biến giữ chỗ xóa số CCCD đi nhé!"*
  - *"Thử thêm bảng Markdown vào prompt xem kết quả có bất ngờ không nào!"*

### 3. Không Cần Đăng Ký Tài Khoản Kỹ Thuật Phức Tạp
- Hỗ trợ nút chọn nhanh tài khoản mẫu (Cán bộ Ban Truyền thông, Cán bộ Tín dụng) để vào học ngay trong 5 giây.
- Động cơ giả lập Streaming mô phỏng như AI thật 100% mà không bắt học viên phải có thẻ tín dụng hay tạo tài khoản OpenAI/Google phức tạp.

---

## IV. BẢN ĐỐI CHIẾU TRƯỚC/SAU CỦA TRỌN BỘ 8 BÀI LAB

| Bài Lab | Kết Quả TRƯỚC (Before) - Lần 1 | Kết Quả SAU (After) - Lần 2 | Khoảnh khắc "Aha!" của Học viên |
| :---: | :--- | :--- | :--- |
| **Lab 01** | AI in thẳng số CCCD và SĐT khách hàng lên bài viết → **Vi phạm pháp luật bảo mật**. | Bản thảo ẩn danh hóa an toàn 100%, 3 góc tiếp cận tiêu đề lay động cảm xúc. | *"Thì ra chỉ cần bôi đen tên thật là AI vẫn viết bài siêu hay mà ngân hàng an toàn tuyệt đối!"* |
| **Lab 02** | Bài viết giật gân rẻ tiền: *"Bùng nổ deal sốc 100 tỷ, siêu rẻ"* → **Mất uy tín Agribank**. | Bài viết mộc mạc ấm áp: *"Có một mái nhà vững chãi sau bão giông"*, số liệu 100 tỷ chuẩn xác. | *"Thêm Bìa bối cảnh Tam nông và từ cấm là AI đổi giọng văn từ bán hàng online sang chuẩn mực ngân hàng ngay!"* |
| **Lab 03** | AI hoảng loạn thanh minh: *"Chúng tôi không vỡ nợ, giám đốc không trốn"* → **Đổ thêm dầu vào lửa**. | Báo cáo 4 mắt: Thông cáo đanh thép 240 từ trích dẫn cam kết thanh khoản Nhà nước và cơ quan Công an. | *"Không cho AI trả lời vội, bắt suy nghĩ qua 4 bước pháp lý là văn bản đanh thép chuẩn mực ngay!"* |
| **Lab 04** | Câu khuyên lý thuyết sáo rỗng: *"Bác đừng rút, ngân hàng uy tín lắm"* → **Khách không nghe**. | Trợ lý tra Thông tư 04 tính ra khách mất hơn 10.5 triệu tiền lãi, đưa 3 câu thoại ân cần tại quầy. | *"AI biết tự mở Thông tư ra tính tiền lãi thiệt hại để thuyết phục bà con thấu tình đạt lý!"* |
| **Lab 05** | Để Temp 0.8: Số liệu lãi suất nhảy múa lung tung mỗi lần bấm, lúc 5.2%, lúc 5.5% → **Rủi ro kiểm toán**. | Vặn Temp về 0.0: Bảng số liệu cố định 100% qua 10 lần chạy; vặn Temp lên 0.8 ra chùm slogan ca dao tuyệt đỉnh. | *"Biết núm vặn nhiệt độ này rồi thì không bao giờ sợ AI chém gió sai số liệu kế toán nữa!"* |
| **Lab 06** | AI viết 5 đoạn văn xuôi dài dòng chào hỏi chúc tụng → **Không thể dán vào Excel**. | AI xuất duy nhất 1 bảng Markdown 6 cột thẳng tắp, bôi đen copy dán vào Excel vừa in từng ô. | *"Chỉ cần đóng thẻ XML và vẽ khuôn cột là AI thành máy trích xuất dữ liệu cho Excel trong 3 giây!"* |
| **Lab 07** | AI bị bẫy override trong hồ sơ thầu lừa: xóa nợ xấu Nhóm 2 và giục duyệt vay 5 tỷ → **Thảm họa rủi ro**. | AI phát hiện ngay dấu hiệu gian lận lệnh hệ thống, vạch trần khoản nợ 45 ngày và yêu cầu tra CIC. | *"Biết cách lập vùng cách ly dữ liệu thì không kẻ xấu nào lừa được AI của mình nữa!"* |
| **Lab 08** | Hỏi sự vụ ngắn: AI đưa ra giải pháp rời rạc, chắp vá, 3 phòng ban cãi cọ nhau. | Lùi lại 1 bước tìm nguyên lý rồi mới lập kế hoạch đồng bộ 3 bên; AI tự động viết luôn bộ prompt cho quầy. | *"Tư duy lùi một bước giúp giải quyết vấn đề từ gốc rễ và để AI tự viết prompt cho mình dùng cả năm!"* |

---

## V. HƯỚNG DẪN BẮT BUỘC KHI ĐƯA VÀO AI GENERATOR

Khi bạn gửi file đặc tả cho AI sinh nội dung bài lab, hãy thêm đoạn chỉ thị nguyên tắc này:

```text
QUY TẮC BẮT BUỘC VỀ TRẢI NGHIỆM TƯƠNG TÁC:
1. Đảm bảo bài lab CỰC KỲ DỄ DÙNG: Luôn có sẵn baselinePrompt và improvedPrompt mẫu để học viên chỉ cần bấm nút là chạy thử được ngay.
2. Thiết kế kết quả Trước (simulatedBaselineOutput) và Sau (simulatedImprovedOutput) PHẢI TƯƠNG PHẢN RÕ RỆT:
   - Bản Trước: Phải mắc đúng lỗi sai nghiệp vụ điển hình (Lộ PII, văn sáo rỗng, vỡ nợ, sai số, văn xuôi dài dòng...).
   - Bản Sau: Hoàn hảo, chuyên nghiệp, khắc phục 100% lỗi sai của bản trước.
3. Điền đầy đủ trường `comparisonHighlights` trong đối tượng LabStep gồm:
   - promptChanges: 3 điểm cốt lõi đã nâng cấp trong câu lệnh.
   - outputChanges: So sánh Before vs After.
   - whyBetter: Lời giải thích trực quan vì sao kết quả sau tốt hơn để tạo khoảnh khắc "Aha!" cho học viên.
```
