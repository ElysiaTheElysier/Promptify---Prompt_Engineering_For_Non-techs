# BÀI 04: CHAIN-OF-THOUGHT (COT) — CHUỖI SUY NGHĨ TỪNG BƯỚC
> **Mã chuyên đề:** `MOD-04-CHAIN-OF-THOUGHT`  
> **Thuộc nhóm:** Chuỗi suy nghĩ & Lập luận nâng cao (Advanced Reasoning)  
> **Mục tiêu:** Nắm vững kỹ thuật khai phóng năng lực suy luận logic sâu của LLM thông qua việc ép mô hình viết nháp các bước suy luận trung gian trước khi đưa ra kết luận.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
**Chain-of-Thought (CoT)** là kỹ thuật yêu cầu mô hình AI phân rã bài toán phức tạp thành một chuỗi các bước suy luận trung gian kế tiếp nhau, thay vì nhảy bổ ngay vào đáp án cuối cùng.

- **Câu thần chú kinh điển (Zero-shot CoT):** *"Hãy suy nghĩ từng bước một (Let's think step by step)."*
- **Few-shot CoT:** Cung cấp ví dụ mẫu có kèm sẵn đoạn phân tích tư duy chi tiết.
- **Tác động:** Tăng độ chính xác trong các bài toán số học, logic tài chính, pháp lý và phân tích chính sách từ 30% lên tới hơn 85%.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Đặt phép tính ra giấy nháp trước khi viết đáp số vào bài thi"*

Khi cô giáo cho em một bài toán đố: *"Trong rổ có 10 quả táo. Mẹ cho thêm 5 quả, sau đó em chia cho bạn Nam 3 quả. Hỏi trong rổ còn mấy quả?"*.  
Nếu em đoán bừa ngay lập tức bằng mồm, em rất dễ bị nhầm.  
Nhưng nếu em lấy giấy nháp ra và viết từng bước:
- Bước 1: Lúc đầu có 10 quả táo.
- Bước 2: Mẹ cho thêm 5 quả ➔ có $10 + 5 = 15$ quả.
- Bước 3: Cho bạn Nam 3 quả ➔ còn $15 - 3 = 12$ quả.  
Viết xong bước 3, em mới điền số 12 vào ô đáp án. Đố ai có thể làm sai được!  
👉 **CoT** chính là việc bắt bạn Robot AI lấy giấy nháp ra viết từng bước như em làm toán vậy.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Cuốn sổ tay ghi chép chi tiêu giỗ chạp, tính từng món rồi mới cộng tổng"*

Bác hình dung lúc nhà có công việc lớn, phải đi chợ mua sắm rất nhiều thứ: thịt gà, giò chả, rau củ, hoa quả thắp hương.  
Nếu người đi chợ chỉ ước lượng vo trong đầu rồi nói một con số tổng: *"Hết tầm 4 triệu đấy bác ạ"*, thì rất dễ bị hụt tiền hoặc nhầm lẫn.  
Người cẩn thận sẽ mở cuốn sổ tay con, cầm bút chì ghi từng dòng:
- Mua 3 con gà: 600 nghìn.
- Mua 2 cây giò lụa: 300 nghìn.
- Tiền hoa quả, trầu cau: 250 nghìn...  
Ghi rõ ràng từng khoản rồi mới dùng thước kẻ cộng một đường ra con số cuối cùng.  
👉 Yêu cầu máy tính làm việc theo kiểu **Chain-of-Thought** chính là bắt máy mở sổ tay ra tính từng dòng, không cho máy nói vội vàng con số vu vơ.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Quy trình thẩm định tín dụng 4 mắt: Phải lập luận trước khi kết luận PHÊ DUYỆT / TỪ CHỐI"*

Trong ngành ngân hàng hoặc kế toán, không bao giờ được phép có chuyện một chuyên viên vừa nhìn hồ sơ vay vốn đã vội gõ ngay: *"Từ chối cho vay"*. Cán bộ bắt buộc phải lập **Tờ trình thẩm định tín dụng** gồm các bước suy luận:

#### Mẫu Prompt CoT chuẩn nghiệp vụ Ngân hàng:
```text
BẠN LÀ: Trưởng phòng Thẩm định Tín dụng Agribank.
HỒ SƠ KHÁCH HÀNG:
- Doanh thu hàng tháng: 120 triệu VNĐ.
- Chi phí vận hành: 70 triệu VNĐ.
- Nghĩa vụ trả nợ các ngân hàng khác hiện tại: 20 triệu VNĐ/tháng.
- Đang đề nghị vay thêm 1 khoản mới có số tiền trả nợ dự kiến: 25 triệu VNĐ/tháng.
- Lịch sử tín dụng CIC: Từng chậm trả thẻ tín dụng 5 ngày vào năm ngoái.

YÊU CẦU:
Hãy suy luận từng bước (Chain-of-Thought) theo cấu trúc bắt buộc sau:
1. BƯỚC 1 - TÍNH TOÁN DÒNG TIỀN THỰC TẾ:
   - Thu nhập ròng (Dòng tiền rỗi còn lại) sau chi phí vận hành.
2. BƯỚC 2 - TÍNH CHỈ SỐ KHẢ NĂNG TRẢ NỢ (DTI - Debt to Income):
   - Tổng nghĩa vụ nợ (Cũ + Mới) / Thu nhập hàng tháng. So sánh với ngưỡng an toàn 40%.
3. BƯỚC 3 - ĐÁNH GIÁ RỦI RO LỊCH SỬ CIC:
   - Chậm 5 ngày thuộc nhóm nợ nào theo Thông tư NHNN? Có đủ điều kiện loại trừ không?
4. BƯỚC 4 - KẾT LUẬN & KIẾN NGHỊ:
   - Chỉ đưa ra quyết định "Chấp thuận" hoặc "Từ chối" sau khi đã hoàn thành 3 bước phân tích trên.
```

*Nếu không có CoT, AI sẽ vội vàng trả lời "Cho vay được" vì thấy doanh thu 120 triệu lớn, bỏ qua mất việc DTI vượt ngưỡng an toàn.*

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Tạo vùng nhớ nháp (Scratchpad Buffer) để AI tính toán tuần tự*

Dưới góc nhìn lập trình, tại sao câu lệnh *"Hãy suy nghĩ từng bước"* lại nâng cao độ chính xác rõ rệt?
- **Cơ chế sinh từ tuần tự (Token-by-token):** LLM sinh từng từ một và không thể "quay lại sửa từ đã in ra". Nếu bạn bắt AI đưa ngay đáp án cuối cùng, nó chỉ có 1 cơ hội duy nhất để đoán con số đó. Tỷ lệ đoán mò sai là cực kỳ cao.
- **Tận dụng Context Window làm bộ nhớ đệm (Scratchpad):** Khi bạn ép AI viết từng bước giải thích (Step 1, Step 2...), các con số và logic trung gian này được ghi thẳng vào bộ nhớ ngữ cảnh. Khi đến câu kết luận cuối cùng, AI chỉ cần đọc lại dữ liệu nó vừa tính toán ở các bước trên để đưa ra đáp án chính xác 100%.
- **Dễ Debug và Ghi Log:** Khi hệ thống trả về kết quả sai, tester và dev có thể nhìn ngay vào từng `Step` trong log để biết AI bị "hổng" ở bước nào (do dữ liệu đầu vào thiếu hay do công thức sai) thay vì phải đoán mò một hộp đen (Black-box).

```typescript
// Triển khai CoT Engine qua Structured Steps
export interface ReasoningStep {
  stepNumber: number;
  thought: string;
}

export interface CoTResponse {
  steps: ReasoningStep[];
  conclusion: string;
}

export const CoTSystemPrompt = `
You are an expert analytical reasoning engine.
When given a complex problem:
1. NEVER output the final answer directly.
2. Break your analysis down into explicit, sequentially numbered reasoning steps.
3. Verify calculations in intermediate steps.
4. Conclude only after all dependencies have been resolved.
Return format:
Step 1: ...
Step 2: ...
Conclusion: ...
`;
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Giải bài toán đố vui mua sắm đồ dùng học tập bằng cách viết từng dòng giấy nháp.
- **Prompt mẫu để thử:**
  ```text
  Hãy giải bài toán sau bằng cách viết từng bước nháp rõ ràng, không nhảy cóc:
  "Bé An có 50 nghìn đồng. Bé mua 1 chiếc compa giá 18 nghìn đồng và mua 3 cuốn vở, mỗi cuốn giá 8 nghìn đồng. Hỏi bé An còn lại bao nhiêu tiền?"
  ```
- **Kết quả mong đợi:** AI nháp bước 1 tính tiền 3 cuốn vở (24 nghìn), bước 2 tính tổng tiền compa và vở (42 nghìn), bước 3 lấy 50 trừ 42 còn 8 nghìn đồng.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Tính toán chia tiền mua quà cáp ngày giỗ tổ tiên cho 4 người con trong gia đình.
- **Prompt mẫu để thử:**
  ```text
  Hãy mở sổ tay tính toán từng bước chi tiêu cho đám giỗ cụ:
  - Mua 2 con gà luộc: 500 nghìn.
  - Mua hoa quả và trầu cau thắp hương: 300 nghìn.
  - Tiền làm mâm cỗ mặn đặt nấu: 1 triệu 200 nghìn.
  Chi phí này do 4 người con cùng chia đều nhau. Hỏi mỗi người con cần đóng góp bao nhiêu tiền?
  Quy tắc: Viết rõ từng bước cộng tổng chi phí trước, sau đó mới chia đều cho 4 người.
  ```
- **Kết quả mong đợi:** Tổng tiền 2.000.000 VNĐ, mỗi người con đóng góp 500.000 VNĐ.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Thẩm định khả năng trả nợ (DTI) của khách hàng vay mua nhà.
- **Prompt mẫu CoT chuẩn nghiệp vụ:**
  ```text
  Bạn là Chuyên viên Thẩm định Tín dụng Agribank.
  Hồ sơ khách hàng:
  - Lương cố định chuyển khoản: 35 triệu VNĐ/tháng.
  - Chi tiêu sinh hoạt gia đình cố định: 15 triệu VNĐ/tháng.
  - Đang trả nợ góp xe máy ở ngân hàng khác: 3 triệu VNĐ/tháng.
  - Đề xuất vay mua nhà: Khoản trả nợ gốc + lãi dự kiến là 14 triệu VNĐ/tháng.
  
  Yêu cầu bắt buộc suy luận từng bước (Chain-of-Thought):
  Bước 1: Tính thu nhập khả dụng còn lại sau khi trừ chi phí sinh hoạt.
  Bước 2: Tính tổng nghĩa vụ nợ hàng tháng (khoản cũ 3 triệu + khoản mới 14 triệu).
  Bước 3: Tính tỷ lệ DTI = (Tổng nợ / Tổng thu nhập). So sánh với ngưỡng an toàn quy định của Agribank (45%).
  Bước 4: Đưa ra kết luận có đủ điều kiện cấp tín dụng không và giải thích lý do.
  ```
- **Tiêu chuẩn nghiệm thu:** AI chỉ ra DTI = 48.57% (vượt ngưỡng 45%), kết luận không đủ điều kiện nếu không có nguồn thu phụ hoặc người đồng trả nợ.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Áp dụng CoT để AI phân tích nguyên nhân gốc rễ (Root Cause Analysis - RCA) của một sự cố sập server web.
- **Yêu cầu thực hành:**
  ```text
  Incident: "Hệ thống web đăng ký thi tốt nghiệp bị sập lúc 9:00 sáng. Báo cáo log cho thấy CPU đạt 100%, bộ nhớ RAM còn trống 70%, kết nối Database pool đạt tối đa 100/100, số lượng request tăng đột biến 10 lần so với ngày thường."
  
  Task: Phân tích theo chuỗi suy luận 3 bước:
  Step 1 - Bottleneck Isolation: Điểm nghẽn nằm ở đâu (CPU, RAM, Network, hay Database)?
  Step 2 - Failure Mechanism: Tại sao CPU chạm 100% trong khi RAM vẫn còn trống?
  Step 3 - Remediation: Đề xuất 2 giải pháp cấu hình tức thời để hệ thống sống lại mà không cần nâng cấp RAM.
  ```
- **Tiêu chuẩn nghiệm thu:** AI nhận định chính xác nút thắt ở Database Connection Pool làm treo các tiến trình gây tràn CPU; đề xuất bật rate limiting và tăng pool size/cache.

## ⚠️ Cạm Bẫy Phổ Biến
- 🚫 **CoT bị dài dòng quá mức:** Khiến thời gian phản hồi (Latency) bị lâu và tốn token vô ích cho các câu hỏi đơn giản thường thức.
- 💡 **Quy tắc vàng:** Chỉ bật CoT cho các bài toán nhiều bước (Multi-hop Reasoning), tính toán tài chính, logic điều kiện, hoặc phân tích pháp lý.
