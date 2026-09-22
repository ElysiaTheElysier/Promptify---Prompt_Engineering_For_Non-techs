# ĐẶC TẢ BÀI LAB 04: VÒNG LẶP TÁC TỬ REACT (REASON + ACT AGENTIC WORKFLOW)
> **Mã bài lab:** `LAB-04-REACT-AGENTIC-WORKFLOW`  
> **Cấp độ:** Đi từ số 0 (Từ Viết Prompt Đơn Lẻ Sang Xây Dựng Quy Trình Tác Tử Thông Minh)  
> **Thời lượng khuyến nghị:** 45 - 60 Phút  
> **Mục tiêu kỹ thuật:** Hiểu bản chất của Hệ thống Tác tử AI (Agentic AI), nắm vững cơ chế vòng lặp ReAct (Reasoning + Acting) kết hợp sử dụng công cụ tra cứu (Tool Use) để triệt tiêu hoàn toàn ảo giác số liệu tài chính.

---

## PHẦN 1: KIẾN THỨC NỀN TẢNG (DÀNH CHO DÂN VĂN PHÒNG ĐI TỪ SỐ 0)

### 1.1 Bản chất Kỹ thuật Đằng sau LLM (Under The Hood)
- **Giới hạn Cố hữu của Mô hình Ngôn ngữ Thuần túy:**
  - LLM chỉ là một "bộ não trong bình thủy tinh": Mô hình không có máy tính bỏ túi, không có đồng hồ thời gian thực, và không tự động cập nhật được các văn bản quy chế mới ban hành nếu không được nạp vào.
  - Khi được yêu cầu tính toán lãi suất ngân hàng phức tạp, nếu chỉ dựa vào khả năng sinh từ, LLM rất dễ sinh ra các con số "nhìn có vẻ đúng nhưng tính toán sai bét" (Math Hallucination).
- **Mô hình ReAct (Reason + Act) là gì?**
  - ReAct là một kiến trúc thiết kế tác tử nổi tiếng được công bố bởi các nhà nghiên cứu từ Đại học Princeton và Google (Yao et al., 2022).
  - Thay vì bắt AI nhảy ngay vào trả lời, ReAct phân tách tư duy thành một **vòng lặp tương tác có kiểm chứng**:
    $$\text{Thought (Tư duy)} \longrightarrow \text{Action (Hành động Tra cứu)} \longrightarrow \text{Observation (Quan sát Kết quả)} \longrightarrow \text{Response (Phản hồi Cuối)}$$
  - Nhờ cơ chế này, AI biết tự bảo mình: *"Mình chưa có công thức tính lãi Thông tư 04, mình phải tra cứu đã"* $\rightarrow$ *Mở tài liệu ra đọc* $\rightarrow$ *Tính toán ra con số chính xác* $\rightarrow$ *Mới viết câu trả lời cho người dùng*.
- **Tác tử AI (Agent) trong Công việc Văn phòng:**
  - Agent không chỉ là một cái ô chat, mà là một **quy trình tự động hóa giải quyết vấn đề**: Có mục tiêu (Goal), biết suy nghĩ (Reasoning), biết dùng công cụ (Tool Use), và biết đánh giá kết quả để điều chỉnh hành động.

### 1.2 Ẩn dụ Văn phòng (Mental Model)
> *"Hãy coi AI như một **giao dịch viên mới ra trường tại quầy ngân hàng**:*  
> *Một nhân viên kém cỏi khi khách hàng hỏi về tiền lãi sẽ ngồi đoán mò hoặc ấp úng trả lời bừa, gây cãi cọ với khách.*  
> *Một nhân viên chuyên nghiệp sẽ có phản xạ: Mời khách ngồi uống nước, **nhấc máy gọi phòng Kế toán hoặc mở file Excel quy chế Thông tư 04** ra tra cứu chính xác từng đồng tiền lãi, rồi mới ân cần giải thích cho bà con hiểu."*

### 1.3 Quy trình Kỹ thuật ReAct 4 Bước:
1. **THOUGHT (Tư duy Nghiệp vụ):** Phân tích tâm lý lo âu của khách hàng; xác định bài toán kinh tế cốt lõi cần làm rõ để bảo vệ quyền lợi người gửi tiền.
2. **ACTION (Hành động Tra cứu):** Viện dẫn chính xác văn bản quy phạm pháp luật (Thông tư 04/2022/TT-NHNN) và biểu lãi suất không kỳ hạn hiện hành của ngân hàng.
3. **OBSERVATION (Quan sát & Tính toán Chuẩn xác):** Đưa ra phép tính định lượng cụ thể:
   - Số tiền lãi nếu giữ đúng hạn: $A$ đồng.
   - Số tiền lãi nếu rút ngay hôm nay: $B$ đồng.
   - Con số thiệt hại thực tế: $A - B$ đồng.
4. **RESPONSE (Bộ Lời Thoại Ứng Xử Tại Quầy):** Chuyển hóa con số khô khan thành lời nói mộc mạc, tôn trọng khách hàng, giải thích chân tình để bà con tự ra quyết định.

---

## PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)

### 2.1 Tình huống Nghiệp vụ (Scenario)
Tiếp nối tình huống khủng hoảng tin đồn ở Bài 3: Chiều cùng ngày, một số bà con nông dân lo lắng đã mang sổ tiết kiệm đến Chi nhánh Agribank Huyện X yêu cầu tất toán trước hạn.
- **Trường hợp cụ thể của Bác Ba:** Bác gửi một cuốn sổ tiết kiệm **200.000.000 VNĐ** kỳ hạn 12 tháng (lãi suất 6.5%/năm). Cuốn sổ đã gửi được **10 tháng**, chỉ còn đúng **2 tháng nữa** là đến ngày đáo hạn nhận trọn vẹn tiền lãi.
- **Rủi ro của khách hàng:** Theo quy định của Ngân hàng Nhà nước tại Thông tư 04/2022/TT-NHNN, nếu khách hàng rút trước hạn dù chỉ 1 ngày, toàn bộ khoản tiền gửi sẽ chỉ được áp dụng mức lãi suất không kỳ hạn (hiện tại Agribank là 0.2%/năm), khiến bác Ba mất trắng số tiền lãi tích góp suốt 10 tháng qua.
- **Nhiệm vụ của Giao dịch viên:** Cần một bộ cẩm nang 3 câu thoại bỏ túi: Tiếp đón ân cần, khẳng định tiền mặt luôn sẵn sàng trong két để bác an tâm, phân tích bài toán kinh tế mất mát hơn 10 triệu đồng bằng con số thực tế, tôn trọng quyền của khách hàng nếu bác vẫn muốn rút.

```text
=== TÀI LIỆU QUY CHẾ VÀ BIỂU PHÍ TRONG HỆ THỐNG AGRIBANK ===
1. Thông tư 04/2022/TT-NHNN: "Trường hợp khách hàng rút trước hạn toàn bộ tiền gửi, tổ chức tín dụng áp dụng mức lãi suất tối đa bằng mức lãi suất tiền gửi không kỳ hạn thấp nhất của tổ chức tín dụng đó tại thời điểm rút."
2. Biểu lãi suất tiết kiệm cá nhân Agribank:
   - Lãi suất kỳ hạn 12 tháng: 6.5%/năm.
   - Lãi suất tiền gửi không kỳ hạn: 0.2%/năm.
3. Dữ liệu tài khoản của Bác Ba:
   - Gốc: 200.000.000 VNĐ. Đã gửi: 10 tháng.
   - Nếu để đủ 12 tháng: Tiền lãi = 200.000.000 × 6.5% = 13.000.000 VNĐ (trung bình 10 tháng qua tích lũy được ~10.833.000 VNĐ).
   - Nếu rút ngay lúc này: Tiền lãi = 200.000.000 × 0.2% × (10/12) = 333.333 VNĐ.
   - THIỆT HẠI THỰC TẾ: 13.000.000 - 333.333 = ~12.666.000 VNĐ (so với cả kỳ) hoặc mất trắng hơn 10.500.000 VNĐ tiền lãi đã tích lũy.
```

### 2.2 Nhiệm vụ Học viên (Task)
Hãy xây dựng một câu lệnh ứng dụng mô hình **ReAct Agentic Workflow**:
1. Thiết lập vai trò: Trợ lý Hỗ trợ Nghiệp vụ Quầy Agribank.
2. Ép buộc AI phải thực hiện tuần tự qua đúng 4 khối: `THOUGHT`, `ACTION`, `OBSERVATION`, `RESPONSE`.
3. Trong khối `OBSERVATION`, AI phải đưa ra kết quả tính toán chính xác số tiền thiệt hại (~10.5 triệu đồng) dựa trên Thông tư 04.
4. Trong khối `RESPONSE`, AI phải soạn **Bộ 3 câu thoại đối thoại trực tiếp tại quầy** cho giao dịch viên:
   - *Câu 1:* Đón tiếp ân cần, mời ngồi uống nước, khẳng định tiền mặt trong két đã sẵn sàng chi trả ngay lập tức nếu bác muốn rút.
   - *Câu 2:* Phân tích thiệt hại kinh tế bằng con số thực tế hơn 10 triệu đồng bị mất oan nếu rút trước chỉ 2 tháng.
   - *Câu 3:* Cam kết uy tín Nhà nước của Agribank và để bác tự quyết định mà không hề ép buộc hay gây khó dễ.

### 2.3 Cấu trúc Khung Prompt Đề xuất (Prompt Architecture)
```text
=== SYSTEM INSTRUCTION: TRỢ LÝ QUẦY AGRIBANK (REACT PATTERN) ===
BẠN LÀ AI: Trợ lý Tham vấn Nghiệp vụ Khách hàng tại Quầy Agribank.
VĂN PHONG: Mộc mạc, ân cần, xưng hô "cháu/con" với "bác/cô chú" theo văn hóa người nhà Tam nông.
NGUYÊN TẮC: Khẳng định nguồn tiền mặt sẵn sàng, bảo vệ quyền lợi kinh tế của khách hàng bằng số liệu thực, tôn trọng tuyệt đối quyền quyết định của người dân.

=== TÀI LIỆU QUY CHẾ VÀ BÀI TOÁN KINH TẾ ===
[Dán dữ liệu Thông tư 04 và thông số sổ tiết kiệm 200 triệu của Bác Ba]

=== QUY TRÌNH REACT BẮT BUỘC (4 KHỐI TUẦN TỰ) ===
Bạn BẮT BUỘC phải thực hiện quy trình theo 4 khối sau:

THOUGHT (TƯ DUY NGHIỆP VỤ):
- Phân tích tâm lý hoang mang của khách hàng
- Xác định mấu chốt thuyết phục: Khẳng định có sẵn tiền mặt + Chỉ ra thiệt hại mất hơn 10 triệu tiền lãi nếu rút trước 2 tháng

ACTION (TRA CỨU QUY CHẾ):
- Tra cứu công thức tính lãi Thông tư 04/2022/TT-NHNN
- Lấy biểu lãi suất Agribank: Kỳ hạn 12 tháng (6.5%) vs Không kỳ hạn (0.2%)

OBSERVATION (KẾT QUẢ TÍNH TOÁN CON SỐ THỰC):
- Tiền lãi nhận được nếu đúng hạn 12 tháng
- Tiền lãi thực nhận nếu rút ngay hôm nay (lãi suất 0.2%)
- Con số thiệt hại thực tế của khách hàng

RESPONSE (BỘ 3 CÂU THOẠI CHO GIAO DỊCH VIÊN TẠI QUẦY):
- Câu 1: Đón tiếp niềm nở, khẳng định sẵn sàng chi tiền mặt ngay nếu bác muốn
- Câu 2: Chân thành phân tích con số thiệt hại hơn 10 triệu đồng tiền mồ hôi nước mắt
- Câu 3: Khẳng định uy tín Nhà nước và tôn trọng quyết định cuối cùng của bác
```

---

## PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION & TEST CASES)

### Test Case 1: Kiểm Tra Tính Toàn Vẹn Của Vòng Lặp ReAct (ReAct Loop Integrity Test)
- **Mục tiêu:** AI phải trải qua đầy đủ 4 trạng thái tư duy và hành động có cấu trúc.
- **Tiêu chí kiểm thử:** Quét sự hiện diện của 4 khối từ khóa:
  - `THOUGHT` hoặc `TƯ DUY`
  - `ACTION` hoặc `HÀNH ĐỘNG`
  - `OBSERVATION` hoặc `QUAN SÁT`
  - `RESPONSE` hoặc `PHẢN HỒI`
- **Đánh giá:** Thiếu bất kỳ khối nào $\rightarrow$ **Trừ 25đ**.

### Test Case 2: Kiểm Tra Độ Chính Xác Số Học Tài Chính (Math & Grounding Accuracy Test)
- **Mục tiêu:** Trợ lý không được bịa số tiền lãi, phải tính đúng chênh lệch lãi suất theo Thông tư 04.
- **Tiêu chí kiểm thử:** Quét sự hiện diện của các con số:
  - Lãi đúng hạn: `"13.000.000"` hoặc `"13 triệu"`
  - Lãi rút trước hạn (0.2%): xấp xỉ `"333.000"` hoặc `"330.000"` hoặc `"hơn 300 ngàn"`
  - Con số thiệt hại: `"10 triệu"` hoặc `"10.500.000"` hoặc `"10 triệu rưỡi"`
- **Đánh giá:** Tính sai con số thiệt hại hoặc bịa đặt con số vô căn cứ $\rightarrow$ **Trừ 30đ**.

### Test Case 3: Kiểm Tra Văn Hóa Giao Dịch & Thái Độ Phục Vụ (Empathy & Etiquette Test)
- **Mục tiêu:** Lời thoại phải đúng mực người cán bộ Agribank, không tranh cãi đôi co với người dân.
- **Tiêu chí kiểm thử:**
  - Có đại từ nhân xưng chuẩn mực: `"cháu"`, `"con"`, `"bác"`, `"bác Ba"`.
  - Có lời khẳng định sẵn sàng chi tiền: `"tiền trong két sẵn sàng"`, `"làm thủ tục chi tiền mặt ngay"`.
  - Tuyệt đối không dùng từ ngữ gây khó dễ: `"bác không được rút"`, `"chúng cháu cấm rút"`, `"bác tin linh tinh"`.
- **Đánh giá:** Vi phạm văn hóa giao tiếp tại quầy $\rightarrow$ **Trừ 25đ**.

### Bảng Rubric Đánh Giá (100 Điểm):
| Tiêu chí | Trọng số | Điều kiện đạt |
| :--- | :---: | :--- |
| **Quy trình ReAct Chuẩn** | 30đ | Đủ 4 khối THOUGHT $\rightarrow$ ACTION $\rightarrow$ OBSERVATION $\rightarrow$ RESPONSE. |
| **Tính toán Lãi suất Chuẩn xác** | 30đ | Tính đúng Thông tư 04, nêu bật con số thiệt hại hơn 10.5 triệu đồng. |
| **Văn phong Dân dã Gần gũi** | 25đ | Ngôn từ mộc mạc, ấm áp, xưng hô như người nhà Tam nông. |
| **Tôn trọng Quyền Khách hàng** | 15đ | Khẳng định tiền mặt sẵn sàng, không ép buộc hay tranh cãi với dân. |

---

## PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)
*Khi bạn đưa file đặc tả này cho một AI để sinh nội dung Lab chi tiết trên nền tảng, hãy dùng câu lệnh sau:*

```text
Dựa trên tài liệu đặc tả [LAB-04-REACT-AGENTIC-WORKFLOW], hãy tạo dữ liệu bài lab chuẩn cấu trúc JSON/TypeScript LabStep gồm:
1. scenario mô tả tình huống bà con mang sổ tiết kiệm 200 triệu rút trước hạn vì nghe tin đồn.
2. baselinePrompt là câu lệnh sơ sài ("Hãy viết câu khuyên bà con đừng rút sổ tiết kiệm").
3. improvedPrompt chứa cấu trúc ReAct Agent đầy đủ (Thought, Action, Observation, Response).
4. simulatedBaselineOutput là câu trả lời chung chung giáo điều ("Bác đừng rút, ngân hàng uy tín lắm"), khiến khách không tin.
5. simulatedImprovedOutput hiển thị trọn vẹn 4 khối ReAct: tính toán chính xác khoản mất 10.5 triệu tiền lãi, đưa ra bộ 3 câu thoại tại quầy ấm áp, mộc mạc, tôn trọng quyền khách hàng.
```
