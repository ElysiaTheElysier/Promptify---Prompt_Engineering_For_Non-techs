# ĐẶC TẢ BÀI LAB 01: BẢO MẬT DỮ LIỆU & BÚT XÓA PII (PII SCRUBBING)
> **Mã bài lab:** `LAB-01-PII-SCRUBBING`  
> **Cấp độ:** Đi từ số 0 (Zero to Hero cho Dân Văn Phòng)  
> **Thời lượng khuyến nghị:** 30 - 45 Phút  
> **Mục tiêu kỹ thuật:** Hiểu bản chất token của LLM, cơ chế rò rỉ dữ liệu qua prompt và thuần thục kỹ thuật khử định danh (Sanitization / PII Scrubbing) bằng biến giữ chỗ.

---

## PHẦN 1: KIẾN THỨC NỀN TẢNG (DÀNH CHO DÂN VĂN PHÒNG ĐI TỪ SỐ 0)

### 1.1 Bản chất Kỹ thuật Đằng sau LLM (Under The Hood)
- **Cơ chế hoạt động:** Mô hình ngôn ngữ lớn (LLM như ChatGPT, Gemini, Claude) không "suy nghĩ" như con người. Bản chất của chúng là **Mô hình Dự đoán Từ tiếp theo (Next-Token Prediction)** dựa trên xác suất thống kê của hàng tỷ văn bản đã học.
- **Dữ liệu bạn nhập đi về đâu?**
  - Khi bạn gõ một văn bản vào ô chat của các nền tảng AI công cộng (Public Web UI), đoạn văn bản đó được gửi về máy chủ đám mây của nhà cung cấp.
  - Các nhà cung cấp có thể lưu trữ lịch sử đoạn chat của bạn để làm dữ liệu huấn luyện tiếp (RLHF - Học tăng cường từ phản hồi con người) hoặc phục vụ việc kiểm duyệt nội dung (Content Moderation).
  - Nhân viên gắn nhãn dữ liệu (Human annotators) hoặc các thuật toán quét tự động có thể đọc được văn bản bạn đã nhập.
- **Rủi ro PII (Personally Identifiable Information):**
  - **Khái niệm:** PII là bất kỳ thông tin nào có thể dùng để định danh trực tiếp hoặc gián tiếp một cá nhân cụ thể (Họ tên đầy đủ, Số CMND/CCCD, Số điện thoại, Địa chỉ nhà, Số tài khoản ngân hàng, Số thẻ tín dụng, Hồ sơ bệnh án, Dư nợ vay vốn).
  - **Hậu quả pháp lý:** Đưa PII của khách hàng lên dịch vụ AI bên ngoài là vi phạm nghiêm trọng **Nghị định 13/2023/NĐ-CP** về Bảo vệ dữ liệu cá nhân tại Việt Nam và quy chế bảo mật thông tin nội bộ ngành Ngân hàng.

### 1.2 Ẩn dụ Văn phòng (Mental Model)
> *"Hãy coi AI công cộng như một **người viết thuê tài năng ngồi ngoài quán cà phê**: Họ rất giỏi viết lách, nhưng họ không phải là nhân viên ngân hàng và không ký cam kết bảo mật. Nếu bạn đưa nguyên tập hồ sơ có số CCCD, sổ đỏ và số tài khoản của khách hàng cho họ xem, tập giấy đó có thể bị bỏ quên trên bàn cà phê cho bất kỳ ai nhặt được."*

### 1.3 Quy tắc Kỹ thuật: "Bút Xóa PII" (Scrubbing / Anonymization Rule)
Trước khi gửi bất kỳ dữ liệu nghiệp vụ nào cho AI, hãy áp dụng quy trình 3 bước:
1. **Quét nhận diện (Scan):** Tìm tất cả các thực thể định danh cụ thể (Tên riêng, Số CCCD, SĐT, Số TK, Tên chi nhánh cụ thể).
2. **Bôi đen & Thay thế (Redact & Replace):** Đổi các thực thể đó thành các **Biến giữ chỗ chuẩn hóa** (Standardized Placeholders) theo cú pháp dấu ngoặc kép hoặc ngoặc vuông:
   - `Nguyễn Văn Tèo` $\rightarrow$ `[TÊN_KHÁCH_HÀNG]` hoặc `{{TEN_KH}}`
   - `034091002847` $\rightarrow$ `[SỐ_CCCD_X]`
   - `0912.345.678` $\rightarrow$ `[SỐ_ĐIỆN_THOẠI_X]`
   - `7800.205.123456` $\rightarrow$ `[SỐ_TÀI_KHOẢN_X]`
   - `120.000.000 VNĐ` $\rightarrow$ Có thể giữ lại số tiền nếu không mang tính định danh, hoặc chuyển thành `[KHOẢN_VAY_A]` nếu là số tiền nhạy cảm.
3. **Phục hồi sau sinh (Post-Processing):** Sau khi AI viết xong bài văn hoàn chỉnh, bạn copy văn bản về máy tính nội bộ của mình và dùng tính năng **Find & Replace (Ctrl + H)** trong Word/Excel để điền lại thông tin thật nếu cần xuất bản nội bộ.

---

## PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)

### 2.1 Tình huống Nghiệp vụ (Scenario)
Phòng Truyền thông nhận được một email từ Chi nhánh Agribank Trấn Yên (Yên Bái) đề nghị viết một bài phóng sự ngắn về gương mặt hộ nông dân vượt khó sau cơn bão lũ số 3. Tài liệu gửi kèm là trích lục nội bộ của phòng Tín dụng:

```text
=== TÀI LIỆU NỘI BỘ CHI NHÁNH GỬI LÊN (CHƯA XỬ LÝ) ===
Họ và tên khách hàng: Nguyễn Văn Tèo (Số CCCD: 034091002847, Cấp ngày: 15/04/2021)
Số điện thoại liên lạc: 0912.345.678
Địa chỉ thường trú: Thôn 3, Xã An Lạc, Huyện Trấn Yên, Tỉnh Yên Bái.
Số tài khoản tiền gửi Agribank: 7800.205.123456 tại PGD Cổ Phúc.
Mã hợp đồng tín dụng: HĐTD-2024-TY-889. Số dư nợ gốc: 120.000.000 VNĐ.
Tài sản thế chấp: GCN QSDĐ (Sổ đỏ) số seri BS 123456 mang tên Nguyễn Văn Tèo và vợ Lê Thị Mận.
Thiệt hại sau thiên tai: Lũ quét tràn qua cuốn trôi 2 sào bưởi đặc sản sắp thu hoạch và trang trại 300 con gà giống, ước tính thiệt hại 90 triệu đồng.
Biện pháp hỗ trợ của Chi nhánh: Đã hoàn tất thủ tục khoanh nợ khoản vay cũ 120 triệu; đồng thời giải ngân khẩn cấp 50 triệu đồng từ gói tín dụng ưu đãi hỗ trợ sau thiên tai (lãi suất 0.5%/năm) để khách hàng sửa chuồng và mua lại con giống.
```

### 2.2 Nhiệm vụ Học viên (Task)
1. Hãy đóng vai trò Chuyên viên Truyền thông Agribank, áp dụng kỹ thuật **Bút xóa PII** để làm sạch hoàn toàn đoạn trích lục trên thành dữ liệu an toàn.
2. Thiết kế một câu lệnh (Prompt) yêu cầu AI:
   - Đóng vai: Chuyên viên Báo chí & Truyền thông Agribank.
   - Sử dụng dữ liệu đã làm sạch để phác thảo **03 góc tiếp cận tiêu đề** (Tiêu đề + Thông điệp cốt lõi) cho bài phóng sự trên website/báo chí:
     - *Góc 1:* Nghị lực kiên cường vượt khó của người nông dân.
     - *Góc 2:* Sự đồng hành, kịp thời của Agribank hỗ trợ bà con sau thiên tai.
     - *Góc 3:* Niềm tin hồi sinh trang trại và khát vọng tương lai.

### 2.3 Cấu trúc Khung Prompt Chuẩn (Prompt Architecture)
```text
=== SYSTEM CONTEXT & VAI TRÒ ===
Bạn là Chuyên viên Truyền thông của Agribank.
Nguyên tắc bảo mật: Tuyệt đối không sử dụng thông tin PII thật. Chỉ làm việc trên các dữ liệu đã được ẩn danh hóa.

=== NGUYÊN LIỆU ĐÃ LÀM SẠCH (SCRUBBED DATA) ===
[Dán dữ liệu sau khi đã dùng Bút xóa PII]

=== NHIỆM VỤ & YÊU CẦU ĐẦU RA ===
Hãy xuất bản 03 góc tiếp cận tiêu đề bài viết theo 3 khía cạnh: (1) Nghị lực nhà nông, (2) Nghĩa tình Agribank, (3) Niềm tin hồi sinh. Mỗi góc độ gồm:
- Tiêu đề gợi ý (Mộc mạc, xúc động, không giật tít câu view)
- Thông điệp cốt lõi (1-2 câu)
- Đoạn mở đầu gợi ý (30-50 từ)
```

---

## PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION & TEST CASES)

### Test Case 1: Kiểm Tra Độ Sạch Dữ Liệu PII (Zero-Tolerance Redaction Test)
- **Mục tiêu:** Đảm bảo học viên không để sót bất kỳ mảnh dữ liệu định danh nào lọt vào prompt.
- **Dữ liệu kiểm thử:** Quét toàn bộ nội dung prompt của học viên qua bộ lọc kiểm tra:
  - Regex số CCCD: `\b\d{12}\b` (VD: `034091002847`)
  - Regex số điện thoại VN: `\b(0\d{9,10}|(\+84)\d{9,10})\b` (VD: `0912.345.678`)
  - Regex số tài khoản / hợp đồng: `\b\d{4}[.\s]?\d{3}[.\s]?\d{6}\b` hoặc chuỗi `7800.205.123456`
  - Chuỗi tên riêng: `"Nguyễn Văn Tèo"`, `"Lê Thị Mận"`, `"BS 123456"`.
- **Kỳ vọng:** KHÔNG TỒN TẠI bất kỳ chuỗi nào nêu trên trong câu lệnh.
- **Đánh giá:** 
  - ĐẠT: Toàn bộ thông tin nhạy cảm đã chuyển thành biến `{{TEN_KH}}`, `{{SO_CCCD}}`,... $\rightarrow$ +50 Điểm.
  - KHÔNG ĐẠT (THẺ ĐỎ): Còn sót dù chỉ 1 số điện thoại hay số CCCD $\rightarrow$ **0 Điểm toàn bài**.

### Test Case 2: Kiểm Tra Tính Bảo Mật Của Đầu Ra AI (Output Sanitization Test)
- **Mục tiêu:** AI không được "bịa" ra thông tin nhạy cảm giả và giữ nguyên dạng biến đại diện để học viên dán ngược lại sau.
- **Kỳ vọng đầu ra:** 
  - Các tiêu đề và đoạn văn không chứa tên người thật.
  - Nếu cần nhắc đến danh xưng, AI sử dụng: *"người nông dân vùng đất bão lũ Yên Bái"*, *"bác T."*, *"hộ gia đình tại Trấn Yên"*.

### Test Case 3: Kiểm Tra Tính Phù Hợp Nghiệp Vụ (Business Quality Test)
- **Mục tiêu:** Tiêu đề và đoạn văn phải đúng tinh thần Agribank (chân thành, mộc mạc, nhân văn).
- **Từ khóa tiêu cực cấm xuất hiện:** `"siêu rẻ"`, `"cơn sốt"`, `"thần tốc"`, `"giá sốc"`.
- **Từ khóa tích cực khuyến khích:** `"vượt khó"`, `"đồng hành"`, `"nghĩa tình"`, `"hồi sinh"`, `"Tam nông"`.

### Bảng Rubric Đánh Giá (100 Điểm):
| Tiêu chí | Trọng số | Điều kiện đạt |
| :--- | :---: | :--- |
| **An toàn PII Tuyệt đối** | 50đ | Không còn bất kỳ CCCD, SĐT, STK, Số sổ đỏ nào trong prompt. |
| **Chuẩn hóa Thẻ biến** | 20đ | Dùng đúng cú pháp biến đại diện (`[TÊN_KH]` hoặc `{{TEN_KH}}`). |
| **Đủ 3 Góc Tiếp cận** | 15đ | Xuất đủ 3 khía cạnh theo yêu cầu đề bài. |
| **Văn phong Báo chí Agribank** | 15đ | Ngôn từ ấm áp, nhân văn, tôn trọng nhân vật, không dùng từ sáo rỗng. |

---

## PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)
*Khi bạn đưa file đặc tả này cho một AI để sinh nội dung Lab chi tiết trên nền tảng, hãy dùng câu lệnh sau:*

```text
Dựa trên tài liệu đặc tả [LAB-01-PII-SCRUBBING], hãy tạo dữ liệu bài lab chuẩn cấu trúc JSON/TypeScript LabStep gồm:
1. scenario mô tả hấp dẫn bằng ngôn ngữ văn phòng ngân hàng.
2. baselinePrompt mô phỏng lỗi sai điển hình của học viên non-tech (dán thẳng số CCCD và SĐT vào ô prompt).
3. improvedPrompt chứa kỹ thuật Bút xóa PII kèm System Context mẫu mực.
4. simulatedBaselineOutput thể hiện nguy cơ khi AI in cả số CCCD và số tài khoản lên bài viết kèm cảnh báo vi phạm Nghị định 13.
5. simulatedImprovedOutput chứa 3 góc tiếp cận tiêu đề lay động cảm xúc, chuẩn văn phong Agribank.
```
