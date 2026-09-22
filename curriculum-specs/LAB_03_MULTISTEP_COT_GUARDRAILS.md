# ĐẶC TẢ BÀI LAB 03: CHUỖI TƯ DUY ĐA BƯỚC & CHỐT CHẶN PHÁP LÝ (MULTI-STEP COT & REGULATORY GUARDRAILS)
> **Mã bài lab:** `LAB-03-MULTISTEP-COT-GUARDRAILS`  
> **Cấp độ:** Đi từ số 0 (Từ Câu Trả Lời Trực Tiếp Sang Khóa Tư Duy Kiểm Duyệt)  
> **Thời lượng khuyến nghị:** 45 - 60 Phút  
> **Mục tiêu kỹ thuật:** Hiểu bản chất sinh từ theo xác suất dễ dẫn đến thiên kiến (Bias) và ảo giác (Hallucination) trong tình huống nhạy cảm; làm chủ kỹ thuật Multi-Step Chain-of-Thought (CoT) và Hard-Lock Guardrails để kiểm soát 100% rủi ro pháp lý.

---

## PHẦN 1: KIẾN THỨC NỀN TẢNG (DÀNH CHO DÂN VĂN PHÒNG ĐI TỪ SỐ 0)

### 1.1 Bản chất Kỹ thuật Đằng sau LLM (Under The Hood)
- **Căn bệnh "Nói Nhanh Hơn Nghĩ" của AI (Zero-Shot Direct Answer Pitfall):**
  - Khi bạn đưa một câu hỏi khẩn cấp cho AI kiểu: *"Mạng đang đồn chi nhánh vỡ nợ, hãy viết thông cáo thanh minh ngay"*, mô hình LLM sẽ sinh ngay từ đầu tiên dựa trên các từ khóa xuất hiện dày đặc nhất trong prompt của bạn.
  - Hậu quả: AI sẽ vô thức lặp lại chính các từ ngữ độc hại của tin đồn trong câu mở đầu: *"Chúng tôi xin đính chính là chi nhánh KHÔNG VỠ NỢ và giám đốc KHÔNG BỎ TRỐN..."*. Về mặt tâm lý truyền thông, hành động này vô tình xác nhận tin đồn và làm người dân hoang mang tột độ.
- **Chain-of-Thought (Chuỗi Tư Duy - CoT) là gì?**
  - Khái niệm CoT được giới thiệu bởi Google Research (Wei et al., 2022). Khi bị ép phải trả lời ngay lập tức, khả năng suy luận logic phức tạp của AI rất thấp.
  - Nhưng nếu bạn bắt AI phải sinh ra các **"Token Suy nghĩ Trung gian" (Reasoning Tokens)** từng bước một trước khi đưa ra câu trả lời cuối cùng, AI sẽ có không gian tính toán để kiểm tra chéo dữ kiện, đối chiếu quy định pháp luật và cân nhắc ngôn từ.
- **Hard-Lock Regulatory Guardrails (Chốt Chặn Pháp Lý Bất Di Bất Dịch):**
  - Đây là kỹ thuật thiết lập các "nguyên tắc thép" trong System Instruction. Bất kể người dùng thúc ép thế nào, AI bắt buộc phải đối chiếu qua các chốt chặn (Luật Ngân hàng Nhà nước, Thẩm quyền phát ngôn, Nghị định xử phạt tin giả) trước khi được phép xuất bản văn bản.

### 1.2 Ẩn dụ Văn phòng (Mental Model)
> *"Hãy coi AI như một **chuyên viên tập sự trẻ tuổi khi gặp sự cố khủng hoảng**: Nếu bạn giục 'Viết thông cáo thanh minh đi em', bạn ấy sẽ cuống cuồng viết một lá thư giải thích vụng về, càng giải thích càng lộ điểm yếu.*  
> *Giải pháp là hãy áp dụng **Quy trình Phê duyệt 4 Mắt (Maker - Checker)** của ngân hàng: Bắt chuyên viên phải in tờ trình ra, tích đủ 4 ô kiểm duyệt (Đánh giá tâm lý $\rightarrow$ Xin ý kiến Pháp chế $\rightarrow$ Bản thảo súc tích $\rightarrow$ Cảnh báo công an) rồi mới được đóng dấu phát hành."*

### 1.3 Quy trình Kỹ thuật: "4 Chốt Chặn Bất Di Bất Dịch"
Khi ứng phó khủng hoảng truyền thông ngân hàng, bắt buộc cấu trúc prompt phải chia thành 4 bước tuần tự:
- **Bước 1 (Psychology & Risk):** Phân tích xem người dân đang sợ điều gì nhất (mất tiền mồ hôi nước mắt) để định hướng trấn an bằng sự thật khách quan, tuyệt đối không đôi co tranh cãi.
- **Bước 2 (Legal & Liquidity Guardrails):** Neo chặt vào 2 trụ cột pháp lý vững chắc: (1) Agribank là NHTM Nhà nước 100% vốn điều lệ thuộc sở hữu Nhà nước, Trụ sở chính cam kết bảo đảm thanh khoản vô điều kiện; (2) Luật Các TCTD bảo hộ quyền lợi người gửi tiền.
- **Bước 3 (Crisis Draft < 300 words):** Soạn thông cáo báo chí khẩn cấp trong khuôn khổ dưới 300 từ. Nguyên tắc: Không nhắc lại từ bẩn của tin đồn, khẳng định tiền mặt dồi dào, mọi giao dịch thông suốt.
- **Bước 4 (Legal Deterrence):** Dẫn chứng chế tài pháp lý (Điều 101 Nghị định 15/2020/NĐ-CP và Điều 288 Bộ luật Hình sự) để răn đe kẻ tung tin giả.

---

## PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)

### 2.1 Tình huống Nghiệp vụ (Scenario)
**TÌNH HUỐNG BÁO ĐỘNG ĐỎ TRUYỀN THÔNG:**
14:00 chiều thứ Hai, trên mạng xã hội TikTok xuất hiện một đoạn video ngắn cắt ghép cảnh nhiều người tụ tập trước cửa một phòng giao dịch kèm tiêu đề kích động: *"Chi nhánh Agribank Huyện X vỡ nợ, Giám đốc ôm tiền bỏ trốn, bà con kéo đến đòi rút sổ tiết kiệm trước hạn"*. 
Clip đang lan truyền với tốc độ 5.000 lượt chia sẻ/giờ, nhiều hội nhóm Facebook địa phương bắt đầu chia sẻ lại. Hàng chục khách hàng tại địa phương bắt đầu kéo đến quầy giao dịch hỏi thực hư.

```text
=== DỮ LIỆU XÁC MINH NỘI BỘ TỪ BAN ĐIỀU HÀNH & PHÁP CHẾ ===
1. Thực tế hoạt động: Chi nhánh Huyện X đang hoạt động bình thường, an toàn. Hệ thống kho quỹ và nguồn tiền mặt dồi dào, đáp ứng 100% nhu cầu giao dịch của người dân.
2. Ban Giám đốc: Đồng chí Giám đốc Chi nhánh đang trực tiếp chỉ đạo điều hành tại trụ sở, không có chuyện vắng mặt hay bỏ trốn như tin đồn.
3. Cơ quan chức năng: Công an Huyện X đã lập chuyên án, triệu tập 2 đối tượng đăng clip câu view sai sự thật.
4. Chốt chặn pháp lý: Agribank là Ngân hàng Thương mại Nhà nước 100% vốn điều lệ thuộc sở hữu Nhà nước. Trụ sở chính Agribank cam kết bảo đảm khả năng chi trả và an toàn thanh khoản vô điều kiện.
```

### 2.2 Nhiệm vụ Học viên (Task)
Hãy đóng vai trò **Cố vấn Trưởng Ban Xử lý Khủng hoảng Truyền thông Agribank**, thiết kế một System Prompt với kỹ thuật **Multi-Step CoT Guardrails**:
1. Khóa chặt hành vi của AI bằng nguyên tắc cấm lặp lại từ ngữ tiêu cực của tin đồn.
2. Buộc AI phải hiển thị đầy đủ quy trình suy luận qua 4 bước: `[BƯỚC 1]`, `[BƯỚC 2]`, `[BƯỚC 3]`, `[BƯỚC 4]`.
3. Bản thảo Thông cáo báo chí ở Bước 3 phải khống chế dung lượng **dưới 300 từ**: Điềm đạm, đanh thép, rõ ràng, dập tắt hoang mang ngay trong 30 giây đọc lướt.
4. Cảnh báo chế tài pháp lý xử phạt hành vi tung tin giả ở Bước 4.

### 2.3 Cấu trúc Khung Prompt Đề xuất (Prompt Architecture)
```text
=== SYSTEM GUARDRAILS (CHỐT CHẶN PHÁP LÝ BẤT KHẢ XÂM PHẠM) ===
BẠN LÀ AI: Cố vấn Trưởng Ban Xử lý Khủng hoảng Truyền thông Agribank.
NGUYÊN TẮC BẤT DI BẤT DỊCH:
1. Tuyệt đối KHÔNG sử dụng lại các từ ngữ kích động tiêu cực của tin đồn (vỡ nợ, bỏ trốn, phá sản).
2. Mọi phát ngôn phải gắn liền với khẳng định: Agribank 100% vốn Nhà nước, cam kết chi trả vô điều kiện.
3. BẮT BUỘC thực hiện suy luận công khai qua đủ 4 bước dưới đây trước khi xuất bản kết quả.

=== BỐI CẢNH TÌNH HUỐNG KHẨN CẤP ===
[Dán dữ liệu xác minh nội bộ của Chi nhánh Huyện X]

=== QUY TRÌNH PHÊ DUYỆT 4 MẮT (MULTI-STEP COT) ===
Hãy thực hiện tư duy công khai theo đúng cấu trúc:
[BƯỚC 1: PHÂN TÍCH TÂM LÝ & MỨC ĐỘ RỦI RO]
- Phân tích bản chất sự việc (Hoảng loạn tâm lý cục bộ do tin giả)
- Nỗi lo lớn nhất của người gửi tiền và định hướng giải tỏa

[BƯỚC 2: ĐỐI CHIẾU 02 CHỐT CHẶN PHÁP LÝ VỮNG CHẮC]
- Chốt chặn 1: Vị thế Ngân hàng 100% vốn Nhà nước, bảo trợ thanh khoản từ Trụ sở chính
- Chốt chặn 2: Sự vào cuộc xử lý của Cơ quan Công an địa phương

[BƯỚC 3: DỰ THẢO THÔNG CÁO BÁO CHÍ KHẨN CẤP]
- Giới hạn: Dưới 300 từ
- Bố cục: Thông điệp an toàn hoạt động -> Cam kết quyền lợi người gửi tiền -> Khuyến cáo bà con bình tĩnh

[BƯỚC 4: THÔNG ĐIỆP CẢNH BÁO PHÁP LÝ]
- Trích dẫn Điều 101 Nghị định 15/2020/NĐ-CP và Điều 288 Bộ luật Hình sự
```

---

## PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION & TEST CASES)

### Test Case 1: Kiểm Tra Tính Tuân Thủ Đủ 4 Bước CoT (Step Completeness Test)
- **Mục tiêu:** AI không được phép nhảy cóc vào viết bài ngay mà phải trải qua tư duy kiểm duyệt.
- **Tiêu chí kiểm thử:** Quét sự hiện diện của 4 tiêu đề bước:
  - `[BƯỚC 1` hoặc `BƯỚC 1:`
  - `[BƯỚC 2` hoặc `BƯỚC 2:`
  - `[BƯỚC 3` hoặc `BƯỚC 3:`
  - `[BƯỚC 4` hoặc `BƯỚC 4:`
- **Đánh giá:** Thiếu bất kỳ bước nào trong quy trình $\rightarrow$ **Trừ 30đ**.

### Test Case 2: Kiểm Tra Chốt Chặn Pháp Lý & Thanh Khoản (Legal Grounding Test)
- **Mục tiêu:** Văn bản phải có căn cứ pháp lý vững chắc từ Nhà nước để người dân an tâm tuyệt đối.
- **Từ khóa bắt buộc phải có trong Bước 2 và Bước 3:**
  - `"100% vốn"` hoặc `"vốn Nhà nước"` hoặc `"sở hữu Nhà nước"`
  - `"thanh khoản"` hoặc `"chi trả đầy đủ"`
  - `"Công an"` hoặc `"cơ quan chức năng"`
- **Đánh giá:** Thiếu căn cứ bảo trợ thanh khoản Nhà nước $\rightarrow$ **Trừ 25đ**.

### Test Case 3: Kiểm Tra Lỗi Nhắc Lại Từ Tiêu Cực (Negative Word Leaking Test)
- **Mục tiêu:** Không được lặp lại từ ngữ của tin đồn trong thông cáo báo chí chính thức.
- **Từ cấm quét trong phần Thông cáo báo chí (Bước 3):**
  - `["không vỡ nợ", "chúng tôi không vỡ nợ", "không bỏ trốn", "giám đốc không trốn"]`
- **Đánh giá:** Bắt gặp bất kỳ cụm từ thanh minh vụng về trên $\rightarrow$ **Trừ 25đ**.

### Test Case 4: Kiểm Tra Giới Hạn Dung Lượng (Length Constraint Test)
- **Mục tiêu:** Trong khủng hoảng, thông cáo phải dưới 300 từ để dập tắt tin giả trong 30 giây đọc lướt.
- **Tiêu chí:** Phần văn bản thông cáo báo chí ở Bước 3 có số từ $\le 320$ từ.
- **Đánh giá:** Vượt quá 350 từ (dài dòng, thiếu tính khẩn cấp) $\rightarrow$ **Trừ 10đ**.

### Bảng Rubric Đánh Giá (100 Điểm):
| Tiêu chí | Trọng số | Điều kiện đạt |
| :--- | :---: | :--- |
| **Quy trình CoT 4 Mắt Đầy đủ** | 35đ | Thể hiện tường minh 4 bước tư duy, không nhảy cóc. |
| **Chốt chặn Pháp lý Vững chắc** | 30đ | Khẳng định ngân hàng 100% vốn Nhà nước, bảo trợ thanh khoản toàn diện. |
| **Không Dính Bẫy Thanh Minh** | 20đ | Tuyệt đối không lặp lại từ ngữ tiêu cực của kẻ tung tin giả. |
| **Súc tích Dưới 300 Từ** | 15đ | Đi thẳng vào sự thật, đanh thép, chuẩn mực công quyền. |

---

## PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)
*Khi bạn đưa file đặc tả này cho một AI để sinh nội dung Lab chi tiết trên nền tảng, hãy dùng câu lệnh sau:*

```text
Dựa trên tài liệu đặc tả [LAB-03-MULTISTEP-COT-GUARDRAILS], hãy tạo dữ liệu bài lab chuẩn cấu trúc JSON/TypeScript LabStep gồm:
1. scenario mô tả tình huống khủng hoảng báo động đỏ tin đồn chi nhánh Agribank huyện X vỡ nợ.
2. baselinePrompt thể hiện một câu lệnh tự phát hoảng loạn ("Viết thông cáo thanh minh là ngân hàng không vỡ nợ và giám đốc không trốn").
3. improvedPrompt chứa đầy đủ System Guardrails và 4 bước CoT ép AI suy nghĩ công khai.
4. simulatedBaselineOutput là bản thông cáo vụng về, nhắc lại nguyên văn "không vỡ nợ, không ôm tiền trốn", làm khủng hoảng trầm trọng hơn.
5. simulatedImprovedOutput hiển thị 4 bước [BƯỚC 1] đến [BƯỚC 4] hoàn hảo, thông cáo báo chí 240 từ đanh thép, trích dẫn cam kết thanh khoản Nhà nước và cơ quan Công an.
```
