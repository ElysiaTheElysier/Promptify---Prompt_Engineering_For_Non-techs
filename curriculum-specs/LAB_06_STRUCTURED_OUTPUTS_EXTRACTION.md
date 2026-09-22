# ĐẶC TẢ BÀI LAB 06: ĐỊNH DẠNG ĐẦU RA CÓ CẤU TRÚC & TRÍCH XUẤT CHO EXCEL (STRUCTURED OUTPUTS & DELIMITERS)
> **Mã bài lab:** `LAB-06-STRUCTURED-OUTPUTS`  
> **Cấp độ:** Đi từ số 0 (Từ Đoạn Văn Xuôi Rườm Rà Sang Bảng Biểu Trích Xuất Vào Excel)  
> **Thời lượng khuyến nghị:** 40 - 50 Phút  
> **Mục tiêu kỹ thuật:** Làm chủ kỹ thuật Structured Outputs (Markdown Table, CSV, JSON), kỹ thuật phân tách vùng dữ liệu bằng Delimiters (`"""`, ```` `, `<xml_tags>`), và loại bỏ triệt để câu từ đàm thoại xã giao (Conversational Preambles) để dữ liệu có thể copy-paste trực tiếp vào Excel/Sheets hoặc phần mềm quản lý.

---

## PHẦN 1: KIẾN THỨC NỀN TẢNG (DÀNH CHO DÂN VĂN PHÒNG ĐI TỪ SỐ 0)

### 1.1 Bản chất Kỹ thuật Đằng sau LLM (Under The Hood)
- **Nỗi khổ lớn nhất của dân văn phòng khi dùng AI:**
  - Bạn đưa cho AI 10 ý kiến phản hồi của khách hàng và bảo: *"Hãy tổng hợp cho tôi"*.
  - AI liền trả lời bằng 5 đoạn văn xuôi dài dằng dặc, mở đầu bằng: *"Chào bạn! Rất vui được hỗ trợ bạn hôm nay. Dưới đây là phân tích chi tiết của tôi..."* và kết thúc bằng *"Hy vọng thông tin trên hữu ích cho bạn, chúc bạn một ngày tốt lành!"*.
  - **Hậu quả:** Bạn không thể copy đoạn văn xuôi đó dán vào Microsoft Excel hay Google Sheets để làm báo cáo, mà lại phải mất công ngồi lọc tay từng dòng.
- **Structured Outputs (Đầu ra Có Cấu trúc) là gì?**
  - Là kỹ thuật ép buộc mô hình ngôn ngữ **phải tuân thủ một lược đồ (Schema) toán học khắt khe**: Chỉ xuất ra Bảng Markdown (`| Cột 1 | Cột 2 |`), hoặc định dạng dữ liệu có thể chuyển đổi thành bảng như CSV hoặc JSON.
  - Khi được thiết lập chuẩn, AI sẽ tự động đóng vai một **Bộ chuyển đổi Dữ liệu phi cấu trúc thành Dữ liệu có cấu trúc (Unstructured to Structured Parser)**.
- **Kỹ thuật Phân tách Vùng Bằng Delimiters (Dấu Phân Cách):**
  - LLM rất dễ nhầm lẫn giữa đâu là **Chỉ thị của bạn** và đâu là **Dữ liệu thô cần phân tích**.
  - Việc sử dụng các dấu phân cách rõ ràng như ba dấu ngoặc kép `"""`, ba dấu gạch chéo ``` ```` hoặc thẻ mở/đóng kiểu XML `<du_lieu> ... </du_lieu>` giúp mạng nơ-ron nhận diện ranh giới dữ liệu với độ chính xác tuyệt đối, tránh hiện tượng AI hiểu nhầm dữ liệu thô là mệnh lệnh.

### 1.2 Ẩn dụ Văn phòng (Mental Model)
> *"Hãy coi Structured Output như một **chiếc khuôn đúc bánh hoặc khay phân loại tiền**:*  
> *Nếu bạn bảo trợ lý 'Thu dọn đống hóa đơn này cho tôi', trợ lý sẽ gom thành một đống lộn xộn trên bàn.*  
> *Nhưng nếu bạn đưa sẵn một **Khay chia 5 ngăn dán nhãn** (Ngày | Mã Hóa Đơn | Khách Hàng | Số Tiền | Trạng Thái) và ra lệnh 'Chỉ được nhét số liệu vào đúng 5 ngăn này, cấm nói thêm một câu nào', bạn sẽ có ngay một tập dữ liệu ngăn nắp để mang đi hạch toán trong 3 giây."*

### 1.3 Quy tắc Kỹ thuật: "3 Không - 1 Chuẩn"
1. **Ràng buộc Tiêu cực Triệt để (Negative Constraint):** Bắt buộc câu lệnh phải có: *"Tuyệt đối không chào hỏi xã giao, không giải thích trước sau, không lặp lại câu hỏi. Đi thẳng vào dữ liệu."*
2. **Khai báo Tên Cột Tường minh (Explicit Schema):** Không nói chung chung "làm thành bảng", mà phải vẽ mẫu cấu trúc dòng tiêu đề:
   `| STT | Tên Khách Hàng | Vấn Đề Gặp Phải | Bộ Phận Xử Lý | Mức Độ Khẩn Cấp (Cao/Trung Bình/Thấp) |`
3. **Đóng gói Vùng Dữ liệu Bằng Delimiters:**
   `<danh_sach_y_kien>`  
   [Dán dữ liệu thô vào đây]  
   `</danh_sach_y_kien>`

---

## PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)

### 2.1 Tình huống Nghiệp vụ (Scenario)
Bộ phận Chăm sóc Khách hàng Agribank nhận được 5 thư khiếu nại/góp ý dài dòng của khách hàng gửi qua hòm thư điện tử và ứng dụng E-Mobile Banking trong buổi sáng. 
Trưởng phòng yêu cầu trước 11:30 phải tổng hợp toàn bộ 5 khiếu nại này thành **1 Bảng Excel chuẩn hóa** để gửi sang phòng Kỹ thuật công nghệ và phòng Dịch vụ thẻ xử lý gấp.

```text
=== NGUYÊN LIỆU THÔ CHƯA QUA XỬ LÝ (5 Ý KIẾN KHÁCH HÀNG) ===
1. Email từ khách hàng Trần Văn Long: "Tôi dùng thẻ ghi nợ nội địa rút tiền tại cây ATM số 14 phố Láng Hạ lúc 8h30 sáng nay, máy trừ tiền trong tài khoản 2.000.000đ nhưng không nhả tiền ra. Đề nghị ngân hàng tra soát hoàn tiền gấp cho tôi, tôi đang cần tiền đóng viện phí cho mẹ."
2. Đánh giá trên App Store từ user MaiPhuong_91: "Từ hôm cập nhật phiên bản 5.2.0, cứ mở app lên bấm vào mục Chuyển tiền quốc tế là bị văng ra màn hình chính. Tôi dùng iPhone 14 Pro Max iOS 18. Mong kỹ thuật sửa lỗi nhanh."
3. Phản ánh qua tổng đài từ bà con Lê Thị Tươi (Hải Dương): "Tôi muốn hỏi gói vay ưu đãi cho phụ nữ nông thôn làm kinh tế trang trại cần những giấy tờ gì? Tôi đã có sổ đỏ đất vườn nhưng ra xã họ bảo phải có xác nhận dự án nuôi gà đẻ trứng của Hội Phụ nữ xã mới được duyệt."
4. Khiếu nại từ chủ cửa hàng tạp hóa Nguyễn Hữu Đạt: "Mã QR Pay dán tại quầy thanh toán của tôi mấy hôm nay khách quét toàn báo lỗi kết nối máy chủ ngân hàng, làm khách không trả tiền được phải chuyển qua tiền mặt rất bất tiện."
5. Góp ý từ bạn trẻ Đỗ Minh Đức: "Giao diện mới đẹp nhưng mục lịch sử biến động số dư nên cho phép lọc theo số tiền và tìm kiếm theo tên người nhận tiền giống như các app ngân hàng số khác thì tiện hơn rất nhiều."
```

### 2.2 Nhiệm vụ Học viên (Task)
Thiết kế một câu lệnh chuẩn hóa (Structured Prompt) ứng dụng **Delimiters** và **Khuôn bảng Markdown**:
1. Sử dụng thẻ `<danh_sach_khieu_nai>` để bao bọc 5 ý kiến thô.
2. Yêu cầu AI trích xuất và phân loại thành duy nhất 1 Bảng Markdown gồm đúng 6 cột:
   - Cột 1: `Mã Số` (KN-01 đến KN-05)
   - Cột 2: `Khách Hàng` (Đã ẩn danh hóa, VD: Trần Văn L., Mai P.)
   - Cột 3: `Kênh Tiếp Nhận` (ATM / App Mobile / Tổng Đài / QR Pay)
   - Cột 4: `Nội Dung Cốt Lõi` (Tóm tắt dưới 15 từ)
   - Cột 5: `Đơn Vị Xử Lý` (Phòng Dịch Vụ Thẻ / Trung Tâm CNTT / Phòng Tín Dụng / Phòng Khách Hàng)
   - Cột 6: `Mức Khẩn Cấp` (Khẩn cấp / Cao / Bình thường)
3. Ràng buộc thép: Không có bất kỳ dòng chữ giải thích nào ngoài bảng dữ liệu để copy thẳng vào Excel.

### 2.3 Cấu trúc Khung Prompt Đề xuất (Prompt Architecture)
```text
Bạn là Trợ lý Dữ liệu Vận hành (Data Operations Specialist) tại Agribank.

Nhiệm vụ: Hãy phân tích toàn bộ các phản ánh của khách hàng nằm trong cặp thẻ <danh_sach_khieu_nai> dưới đây và trích xuất thành 01 BẢNG MARKDOWN DUY NHẤT.

<danh_sach_khieu_nai>
[Dán dữ liệu 5 phản ánh của khách hàng vào đây]
</danh_sach_khieu_nai>

YÊU CẦU ĐỊNH DẠNG KHUÔN BẢNG (SCHEMA):
Bảng Markdown phải có đúng 6 cột với tiêu đề sau:
| Mã Số | Khách Hàng | Kênh Tiếp Nhận | Nội Dung Cốt Lõi | Đơn Vị Xử Lý | Mức Khẩn Cấp |
| :--- | :--- | :--- | :--- | :--- | :--- |

RÀNG BUỘC THÉP (ZERO CHAT CONSTRAINT):
1. Tuyệt đối KHÔNG có lời chào mở đầu (VD: "Chào bạn", "Dưới đây là bảng...") và không có lời chúc kết thúc.
2. Đầu ra bắt đầu ngay lập tức bằng ký tự "|" của dòng tiêu đề bảng.
3. Cột "Mức Khẩn Cấp" chỉ được chọn 1 trong 3 giá trị: [Khẩn cấp, Cao, Bình thường]. Vụ việc liên quan đến nuốt tiền viện phí hoặc lỗi app hàng loạt phải xếp mức [Khẩn cấp].
```

---

## PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION & TEST CASES)

### Test Case 1: Kiểm Tra Cấu Trúc Bảng Markdown & Số Cột (Schema Conformance Test)
- **Mục tiêu:** Bảng phải có đúng 6 cột và 5 dòng dữ liệu để dán vào Excel không bị lệch ô.
- **Tiêu chí kiểm thử:**
  - Ký tự bắt đầu của output phải là `|` (không có chữ thừa).
  - Có dòng phân cách Markdown hợp lệ: `| :--- |` hoặc `|---|`.
  - Đếm chính xác số cột trong mỗi dòng: Phải có đúng 6 cột phân cách bởi dấu `|`.
- **Đánh giá:** Sai lệch số cột hoặc thiếu dòng phân cách $\rightarrow$ **Trừ 30đ**.

### Test Case 2: Kiểm Tra Lỗi Lời Chào Thừa Thãi (Preamble Zero-Tolerance Test)
- **Mục tiêu:** Loại bỏ 100% các câu xã giao làm hỏng định dạng copy-paste.
- **Từ cấm quét tự động ở đầu hoặc cuối output:**
  - `["chào bạn", "dưới đây là", "hy vọng", "chúc bạn", "tổng kết lại"]`
- **Đánh giá:** Xuất hiện lời chào thừa $\rightarrow$ **Trừ 25đ**.

### Test Case 3: Kiểm Tra Tính Chính Xác Của Việc Phân Loại Nghiệp Vụ (Classification Accuracy)
- **Mục tiêu:** Phân loại đúng đơn vị xử lý và mức độ khẩn cấp.
- **Tiêu chí kiểm thử:**
  - Vụ việc 1 (Nuốt tiền ATM, viện phí): Mức độ khẩn cấp phải là `"Khẩn cấp"`, Đơn vị là `"Phòng Dịch Vụ Thẻ"`.
  - Vụ việc 2 (App văng): Đơn vị là `"Trung Tâm CNTT"`.
  - Vụ việc 3 (Vay phụ nữ nông thôn): Đơn vị là `"Phòng Tín Dụng"`.
- **Đánh giá:** Phân loại sai lệch phòng ban $\rightarrow$ **Trừ 10đ/vụ việc**.

### Bảng Rubric Đánh Giá (100 Điểm):
| Tiêu chí | Trọng số | Điều kiện đạt |
| :--- | :---: | :--- |
| **Khuôn Bảng Markdown Chuẩn 6 Cột** | 35đ | Đúng 6 cột, đúng 5 dòng, dán vào Excel khớp từng ô dữ liệu. |
| **Sạch 100% Lời Chào Xã Giao** | 25đ | Không có một chữ thừa ngoài bảng biểu, bắt đầu ngay bằng `|`. |
| **Phân Loại Đúng Phòng Ban & Độ Khẩn** | 25đ | Đánh giá đúng tính chất nghiệp vụ ngân hàng. |
| **Ứng Dụng Chuẩn Thẻ Delimiters** | 15đ | Dùng thẻ XML `<danh_sach>` hoặc ``` phân định vùng dữ liệu. |

---

## PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)
```text
Dựa trên tài liệu đặc tả [LAB-06-STRUCTURED-OUTPUTS], hãy tạo dữ liệu bài lab chuẩn cấu trúc JSON/TypeScript LabStep gồm:
1. scenario về việc xử lý 5 khiếu nại buổi sáng cần xuất ra Excel trước 11:30.
2. baselinePrompt chỉ bảo chung chung "Hãy tổng hợp 5 khiếu nại này" dẫn đến AI sinh ra 5 đoạn văn xuôi dài dòng không thể copy vào bảng tính.
3. improvedPrompt chứa Delimiters XML, Schema khuôn bảng 6 cột và ràng buộc thép cấm nói thừa.
4. simulatedBaselineOutput là văn bản đàm thoại dài dòng, có chào hỏi chúc tụng, làm mất thời gian cán bộ.
5. simulatedImprovedOutput là 1 Bảng Markdown 6 cột tinh gọn tuyệt đối, bắt đầu ngay bằng dấu |, dán vào Excel là xong việc ngay.
```
