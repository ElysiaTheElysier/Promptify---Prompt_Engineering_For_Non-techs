# ĐẶC TẢ BÀI LAB 05: LÀM CHỦ THAM SỐ SINH VĂN BẢN (TEMPERATURE, TOP-P & MAX TOKENS)
> **Mã bài lab:** `LAB-05-TEMPERATURE-SAMPLING`  
> **Cấp độ:** Đi từ số 0 (Từ Người Dùng Bị Động Sang Người Kiểm Soát Xác Suất)  
> **Thời lượng khuyến nghị:** 40 - 50 Phút  
> **Mục tiêu kỹ thuật:** Hiểu cơ chế phân phối xác suất từ tiếp theo (Next-token probability distribution), làm chủ các tham số điều khiển LLM Configuration (Temperature, Top-P, Max Tokens, Stop Sequences) để loại bỏ tính ngẫu nhiên khi xử lý số liệu hoặc kích hoạt tính sáng tạo khi làm truyền thông.

---

## PHẦN 1: KIẾN THỨC NỀN TẢNG (DÀNH CHO DÂN VĂN PHÒNG ĐI TỪ SỐ 0)

### 1.1 Bản chất Kỹ thuật Đằng sau LLM (Under The Hood)
- **Tại sao cùng một câu lệnh, mỗi lần bấm AI lại trả lời một kiểu?**
  - Khi sinh từ tiếp theo, mô hình ngôn ngữ không chỉ chọn một từ duy nhất. Nó chấm điểm xác suất cho hàng chục ngàn từ trong từ điển (Vocabulary).
  - Ví dụ sau cụm từ *"Ngân hàng Nông nghiệp và..."*, xác suất của từ *"Phát triển"* là 92%, từ *"Nông thôn"* là 5%, từ *"Thương mại"* là 1%.
- **Tham số Temperature (Nhiệt độ sáng tạo: từ 0.0 đến 1.0, thậm chí 2.0):**
  - **Temperature = 0.0 (Greedy Decoding / Cực kỳ Bảo thủ):** Mô hình luôn luôn 100% chọn từ có xác suất cao nhất. Kết quả hoàn toàn đơn định (Deterministic), nói 10 lần như 1, không tưởng tượng, tuyệt đối chuẩn xác cho việc tính toán, trích xuất số liệu báo cáo tài chính và pháp chế.
  - **Temperature = 0.7 - 0.9 (Cân bằng Sáng tạo):** Mô hình làm phẳng phân phối xác suất, cho phép chọn các từ xếp hạng 2, hạng 3. Câu chữ trở nên bay bổng, sinh động, thích hợp cho việc viết thông cáo báo chí, đặt tiêu đề bài đăng Fanpage hoặc gợi ý ý tưởng sự kiện.
  - **Temperature > 1.2:** Mô hình bắt đầu chọn các từ xác suất cực thấp, dẫn đến câu từ lộn xộn, mất logic và sinh ảo giác (Gibberish/Hallucination).
- **Tham số Top-P (Nucleus Sampling):**
  - Thay vì chọn toàn bộ từ điển, Top-P (ví dụ 0.9) bảo mô hình: *"Chỉ xem xét nhóm từ có tổng xác suất tích lũy đạt 90%, vứt bỏ 10% các từ kỳ dị nhất"*.
- **Max Tokens & Stop Sequences (Kiểm soát Độ dài):**
  - **Max Tokens:** Giới hạn trần chi phí và độ dài đầu ra, ngăn AI viết lê thê không dứt điểm.
  - **Stop Sequences (Ký tự dừng):** Dấu hiệu bảo AI dừng bút ngay lập tức khi gặp một ký hiệu đặc biệt (ví dụ: `[HẾT_BÁO_CÁO]`, `---`, `###`).

### 1.2 Ẩn dụ Văn phòng (Mental Model)
> *"Hãy coi LLM như một **chiếc quạt máy có núm vặn tốc độ (Temperature)**:*  
> *• Khi bạn cần đếm tiền hay ký hợp đồng (Kế toán / Pháp chế / Thẩm định tín dụng): Hãy **vặn nút về số 0** (Gió lặng). Bạn cần sự chuẩn xác tuyệt đối từng con số, không cho phép một hạt bụi sáng tạo nào làm bay giấy tờ.*  
> *• Khi bạn cần phòng PR họp động não (Brainstorming) tìm khẩu hiệu mới: Hãy **vặn nút lên số 0.8** (Gió mát rượi). Bạn cần AI phóng khoáng, kết hợp những từ ngữ độc đáo để tìm ra ý tưởng đột phá."*

### 1.3 Quy tắc Vàng cho Dân Văn Phòng:
| Mục đích Công việc | Temperature Khuyến nghị | Top-P | Tính chất Đầu ra |
| :--- | :---: | :---: | :--- |
| **Báo cáo Tài chính / Pháp chế / Thẩm định / Trích xuất Bảng** | **`0.0` - `0.2`** | `0.1` | Chuẩn xác 100%, không bịa đặt, lặp lại nhất quán. |
| **Soạn thảo Email / Biên bản Họp / Tóm tắt Văn bản** | **`0.3` - `0.5`** | `0.7` | Chuẩn mực, rõ ràng, gãy gọn. |
| **Viết Bài Fanpage / Ý tưởng Truyền thông / Thơ ca** | **`0.7` - `0.9`** | `0.9` | Cảm xúc, từ vựng phong phú, góc nhìn mới lạ. |

---

## PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)

### 2.1 Tình huống Nghiệp vụ (Scenario)
Chi nhánh Agribank vừa ban hành biểu lãi suất tiền gửi và gói vay ưu đãi mới cho vụ mùa đông xuân. Trưởng phòng giao hai nhiệm vụ trái ngược nhau cho cùng một cán bộ:
- **Nhiệm vụ 1 (Chính xác Tuyệt đối - Số học):** Trích xuất bảng số liệu lãi suất và điều kiện vay từ thông báo dài 3 trang thành bảng Markdown chuẩn xác, không được sai lệch 0.01% hoặc tự ý thêm bớt điều kiện.
- **Nhiệm vụ 2 (Sáng tạo Truyền thông - Cảm xúc):** Đặt 05 khẩu hiệu (Slogan) quảng bá gói vay vụ mùa đông xuân sao cho gần gũi, giàu vần điệu ca dao dân ca, lay động người nông dân.

```text
=== NGUYÊN LIỆU THÔNG BÁO TỪ CHI NHÁNH ===
"Thông báo số 189/TB-NHNo: Triển khai gói tín dụng 'Đồng hành Vụ Đông Xuân 2026'.
Quy mô gói: 5.000 tỷ đồng.
1. Lãi suất cho vay nông nghiệp nông thôn: Cố định 5.2%/năm trong 6 tháng đầu; từ tháng thứ 7 thả nổi bằng lãi suất huy động 12 tháng cộng biên độ 2.5%/năm.
2. Thời hạn vay: Tối đa 18 tháng (phù hợp chu kỳ canh tác lúa và cây ăn trái).
3. Hạn mức vay không tài sản bảo đảm: Tối đa 200 triệu đồng/hộ cá thể có xác nhận của Hội Nông dân xã; trên 200 triệu phải có tài sản thế chấp hợp pháp.
4. Miễn 100% phí trả nợ trước hạn trong 3 tháng cuối hợp đồng."
```

### 2.2 Nhiệm vụ Học viên (Task)
Học viên phải thực hành cấu hình tham số trực tiếp:
1. **Thực hành Cấu hình Báo cáo (Temp = 0.0):** Thiết lập cấu hình hệ thống ở mức `temperature: 0.0` kèm yêu cầu trích xuất bảng biểu. Quan sát xem kết quả có tính nhất quán 100% qua 3 lần chạy lại (Reproducibility).
2. **Thực hành Cấu hình Sáng tạo (Temp = 0.8):** Đổi sang `temperature: 0.8` và yêu cầu sáng tác 5 câu khẩu hiệu truyền thông đậm chất ca dao dân ca. Quan sát độ phong phú của từ ngữ.
3. **Thử nghiệm Bẫy Lỗi (Temp = 1.5):** Cố tình tăng vọt Temperature lên 1.5 để quan sát AI bắt đầu nói lảm nhảm hoặc xuất hiện các liên tưởng phi thực tế (Hallucination).

---

## PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION & TEST CASES)

### Test Case 1: Kiểm Tra Tính Nhất Quán Ở Nhiệt Độ Thấp (Deterministic Consistency Test)
- **Mục tiêu:** Ở `temperature: 0.0`, chạy prompt 3 lần liên tiếp phải cho ra kết quả gần như trùng khớp hoàn toàn từng chữ số.
- **Tiêu chí kiểm thử:** Quét số liệu trong bảng:
  - Lãi suất: `"5.2%/năm"` (tháng 1-6) và `"biên độ 2.5%"`
  - Hạn mức tín chấp: `"200 triệu"`
  - Phí trả nợ trước hạn: `"Miễn 100%"` (3 tháng cuối)
- **Đánh giá:** Nếu ở Temp thấp mà AI tự ý bịa thêm con số ngoài văn bản → **Trừ 40đ**.

### Test Case 2: Kiểm Tra Độ Đa Dạng Ngôn Ngữ Ở Nhiệt Độ Cao (Creativity Diversity Test)
- **Mục tiêu:** Ở `temperature: 0.8`, 5 câu khẩu hiệu không được lặp lại khuôn mẫu từ ngữ sáo rỗng.
- **Kỳ vọng:** Xuất hiện các từ ngữ giàu hình tượng nông nghiệp: *"mùa vàng"*, *"hạt ngọc"*, *"bội thu"*, *"ấm no"*, *"đồng hành"*.
- **Đánh giá:** Cả 5 câu giống hệt nhau về cấu trúc → **Trừ 20đ** (chưa tận dụng được Temperature).

### Test Case 3: Kiểm Tra Giới Hạn Dừng (Stop Sequences Test)
- **Mục tiêu:** Khi thiết lập ký tự dừng `[HẾT]`, AI phải dừng ngay lập tức, không được viết thêm lời chào hỏi thừa thãi.

### Bảng Rubric Đánh Giá (100 Điểm):
| Tiêu chí | Trọng số | Điều kiện đạt |
| :--- | :---: | :--- |
| **Phân định Tham số Đúng Nghiệp vụ** | 35đ | Chọn Temp 0.0 cho dữ liệu tài chính và Temp 0.7-0.8 cho Slogan truyền thông. |
| **Độ Chính xác Bảng Biểu (Temp 0.0)** | 35đ | Bảng 4 dòng chuẩn xác từng chữ số 5.2%, 2.5%, 200 triệu, miễn phí 3 tháng. |
| **Chất lượng Sáng tạo Slogan (Temp 0.8)** | 20đ | 5 câu khẩu hiệu giàu vần điệu ca dao, đậm chất bản sắc văn hóa Agribank. |
| **Kiểm soát Độ dài & Stop Sequence** | 10đ | Dừng đúng độ dài, không nói thừa xã giao. |

---

## PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)
```text
Dựa trên tài liệu đặc tả [LAB-05-TEMPERATURE-SAMPLING], hãy tạo dữ liệu bài lab chuẩn cấu trúc JSON/TypeScript LabStep gồm:
1. scenario về việc một chuyên viên vừa phải chốt số liệu lãi suất chính xác (Temp 0.0) vừa phải nghĩ slogan vụ mùa (Temp 0.8).
2. baselinePrompt dùng Temp mặc định 0.7 cho việc tính số liệu dẫn đến kết quả nhảy múa lung tung.
3. improvedPrompt hướng dẫn học viên cách tinh chỉnh cấu hình Temperature, Top-P và Max Tokens.
4. simulatedBaselineOutput mô phỏng lỗi khi Temp cao làm sai lệch số liệu lãi suất 5.2% thành 5.5%.
5. simulatedImprovedOutput hiển thị bảng đối soát số liệu chuẩn 100% ở Temp 0.0 và chùm slogan mộc mạc xuất sắc ở Temp 0.8.
```
