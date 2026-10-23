# BÀI 02: CẤU TRÚC 5 THÀNH TỐ (ROLE - CONTEXT - TASK - CONSTRAINT - FORMAT)
> **Mã chuyên đề:** `MOD-02-STRUCTURED-PROMPT`  
> **Thuộc nhóm:** Nền tảng cốt lõi (Core Foundations)  
> **Mục tiêu:** Nắm vững công thức vàng 5 thành tố giúp biến mọi câu lệnh mơ hồ thành chỉ thị nghiệp vụ chuẩn xác, chống lệch hướng 100%.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Khung cấu trúc 5 thành tố là **"xương sống"** của kỹ nghệ prompt hiện đại dành cho người làm kinh doanh và chuyên viên nghiệp vụ. Thay vì gõ câu lệnh tùy tiện, một prompt chuyên nghiệp luôn được bóc tách thành 5 mảnh ghép logic:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. ROLE (Vai trò)         : AI đang đóng vai chuyên gia nào?           │
│ 2. CONTEXT (Bối cảnh)     : Tình huống công việc thực tế đang diễn ra? │
│ 3. TASK (Nhiệm vụ)        : Hành động cụ thể cần thực hiện là gì?      │
│ 4. CONSTRAINT (Ràng buộc) : Những giới hạn, điều cấm, yêu cầu bắt buộc?│
│ 5. FORMAT (Định dạng)     : Kết quả xuất ra dưới dạng bảng, JSON, email?│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Trò chơi đóng vai hiệp sĩ nhí đi giải cứu lâu đài"*

Tưởng tượng em cùng bạn chơi trò chơi nhập vai:
1. **Vai trò:** Em bảo bạn: *"Cậu là hiệp sĩ rồng dũng cảm!"*
2. **Bối cảnh:** *"Lâu đài đồ chơi đang bị quái vật bụi bẩn bao vây."*
3. **Nhiệm vụ:** *"Nhiệm vụ của cậu là dọn sạch 10 viên gạch LEGO trên sàn."*
4. **Luật chơi (Ràng buộc):** *"Không được ném mạnh làm vỡ đồ và không được gây ồn khi em bé đang ngủ."*
5. **Phần thưởng (Định dạng):** *"Xếp các viên gạch thành 1 hình tháp tam giác xinh xắn!"*  
👉 Khi nói đủ 5 điều này, bạn của em sẽ chơi cực kỳ vui và không bao giờ làm sai luật!

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Lời dặn con cháu chuẩn bị mâm cỗ giỗ tổ tiên"*

Khi bác muốn con cháu chuẩn bị một việc trọng đại như ngày giỗ gia đình, bác sẽ dặn dò rành rọt từng ý:
1. **Vai trò (Xưng hô):** Bác dặn đứa cháu gái lớn đảm đang trong nhà.
2. **Bối cảnh:** Nhân dịp giỗ cụ năm nay có các bác ở quê ra thăm đông đủ.
3. **Nhiệm vụ:** Chuẩn bị một mâm cỗ truyền thống tươm tất.
4. **Kiêng kỵ (Ràng buộc):** Các bác lớn tuổi có người bị tiểu đường nên nấu canh thanh đạm, tuyệt đối không cho đường hóa học, các món xào ít dầu mỡ.
5. **Trình bày (Định dạng):** Chia đều ra 2 mâm tròn, xếp gà luộc góc trên, đĩa xôi góc dưới theo nề nếp gia phong.  
👉 Nếu dặn dò mạch lạc như vậy, con cháu làm không bao giờ lúng túng. Máy tính thông minh cũng cần được dặn dò đầy đủ như thế.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Phiếu giao việc (Job Ticket) chuẩn mực trong ngân hàng"*

Người dùng văn phòng thường phàn nàn: *"Tôi nhờ AI viết báo cáo mà nó nói chung chung như sinh viên thực tập"*. Đó là vì câu lệnh thiếu mất **Bối cảnh**, **Ràng buộc** và **Định dạng**.

#### Bảng so sánh Prompt Tự do vs Prompt Chuẩn 5 Thành tố:

| Thành tố | Prompt Sơ sài (Thất bại) | Prompt Chuẩn 5 Thành tố (Thành công) |
| :--- | :--- | :--- |
| **Role** | *(Không có)* | Bạn là Chuyên viên Phân tích Tín dụng cao cấp tại Agribank. |
| **Context** | *(Không có)* | Chi nhánh đang thẩm định khoản vay 5 tỷ VNĐ cho Hợp tác xã Nông nghiệp công nghệ cao trồng dưa lưới xuất khẩu. |
| **Task** | "Phân tích rủi ro giúp tôi." | Đánh giá 3 rủi ro trọng yếu: Rủi ro thị trường tiêu thụ, rủi ro thiên tai sâu bệnh, và rủi ro dòng tiền thu hồi. |
| **Constraint** | *(Không có)* | Dựa trên thực tế thị trường nông sản Việt Nam. Không dùng từ ngữ cảm tính. Mỗi rủi ro phải kèm 1 biện pháp giảm thiểu. |
| **Format** | Văn bản lộn xộn | Trình bày thành Bảng Markdown 4 cột: `STT \| Rủi ro \| Mức độ (Cao/Trung bình/Thấp) \| Biện pháp giảm thiểu`. |

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Góc nhìn lập trình thực tế:** *Prompt 5 thành tố tương đương với một Hàm (Function) có đầy đủ Signature và Validation*

Dân kỹ thuật có thể hình dung việc viết Prompt 5 thành tố giống hệt như việc bạn viết một function sạch (Clean Code):
- **Role (Vai trò) $\to$ `System Instruction`:** Khởi tạo môi trường chạy hoặc cấu hình service (ví dụ: `new CreditRiskService()`).
- **Context (Bối cảnh) $\to$ `Input Parameters / State`:** Dữ liệu truyền vào qua payload để hàm xử lý.
- **Task (Nhiệm vụ) $\to$ `Function Body / Handler`:** Logic chính cần thực hiện.
- **Constraint (Ràng buộc) $\to$ `Validation & Guard Clauses`:** Các điều kiện `if/throw error` chặn trước các trường hợp ngoại lệ hoặc dữ liệu không mong muốn.
- **Format (Định dạng) $\to$ `Return Type / DTO`:** Định kiểu dữ liệu trả về (Return string, Markdown table, hay interface JSON).

*Lợi ích cho Dev:* Viết prompt theo 5 khối giúp bạn dễ dàng lưu trữ thành các biến riêng biệt trong code (Modular Prompts), dễ test unit test và dễ debug khi AI trả lời sai ý.

```typescript
// Prompt Template Generator chuẩn 5 thành tố
interface StructuredPromptConfig {
  role: string;
  context: string;
  task: string;
  constraints: string[];
  outputFormat: string;
}

export function buildStructuredPrompt(cfg: StructuredPromptConfig): string {
  return `### ROLE\n${cfg.role}\n\n` +
         `### CONTEXT\n${cfg.context}\n\n` +
         `### TASK\n${cfg.task}\n\n` +
         `### CONSTRAINTS\n${cfg.constraints.map(c => `- ${c}`).join('\n')}\n\n` +
         `### OUTPUT FORMAT\n${cfg.outputFormat}`;
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Viết một bức thư xin mẹ mua bộ đồ chơi LEGO mới sau khi đạt điểm 10.
- **Prompt mẫu áp dụng đủ 5 thành tố:**
  ```text
  [Role]: Em là một học sinh chăm ngoan học giỏi lớp 3.
  [Context]: Hôm nay em vừa được cô giáo chấm điểm 10 môn Toán.
  [Task]: Viết một bức thư ngắn xin mẹ mua cho em bộ xếp hình LEGO giá 150 nghìn đồng.
  [Constraint]: Phải có 3 lời hứa giúp mẹ nhặt rau, quét nhà và tự giác học bài.
  [Format]: Trình bày bức thư thật dễ thương, có lời chào và lời chúc mẹ luôn vui vẻ.
  ```
- **Kết quả mong đợi:** Bức thư cảm động, đủ 3 lời hứa, không vòi vĩnh quà đắt tiền.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Nhờ AI viết một tin nhắn Zalo gửi con trai cả đi làm xa ở Hà Nội nhờ mua hộ hộp dầu xoa bóp xương khớp.
- **Prompt mẫu áp dụng đủ 5 thành tố:**
  ```text
  - Vai trò: Người mẹ ở quê.
  - Bối cảnh: Dạo này miền Bắc trở gió, khớp gối mẹ hay bị đau nhức về đêm.
  - Nhiệm vụ: Nhắn con trai cuối tuần về quê ghé hiệu thuốc mua giúp mẹ 2 hộp cao dán ngải cứu.
  - Ràng buộc: Dặn con không mua loại thuốc ngoại đắt tiền tốn kém, dặn con giữ ấm và lái xe cẩn thận.
  - Định dạng: Một tin nhắn Zalo ấm áp, tình cảm gia đình.
  ```
- **Kết quả mong đợi:** Lời nhắn thân thương, đúng văn phong người mẹ quê dặn dò con cái.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Soạn thảo thông báo từ chối cấp hạn mức tín dụng cho khách hàng doanh nghiệp nhưng giữ quan hệ hợp tác.
- **Prompt mẫu chuẩn 5 thành tố:**
  ```text
  ### ROLE: Chuyên viên Thẩm định Tín dụng Agribank.
  ### CONTEXT: Công ty TNHH Vận tải Bắc Nam nộp hồ sơ xin vay vốn lưu động 2 tỷ VNĐ, nhưng báo cáo tài chính năm qua chưa chứng minh đủ dòng tiền hoàn vốn do công nợ tồn đọng.
  ### TASK: Viết thư thông báo tạm hoãn cấp hạn mức tín dụng kỳ này.
  ### CONSTRAINTS: 
  - Văn phong chuyên nghiệp, lịch sự, thấu hiểu khó khăn của doanh nghiệp.
  - Đưa ra lời khuyên cụ thể về việc thu hồi công nợ để chi nhánh hỗ trợ thẩm định lại vào quý tới.
  ### FORMAT: Bức thư trang trọng gửi Ban Giám đốc doanh nghiệp.
  ```
- **Tiêu chuẩn nghiệm thu:** Thư không làm mất lòng khách hàng, mở ra cơ hội vay vốn trong tương lai.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Viết Prompt 5 thành tố biến AI thành bộ sinh Mock Data người dùng cho dự án thử nghiệm hệ thống thẻ Agribank.
- **Yêu cầu thực hành:**
  ```text
  ### ROLE: Mock Data Generation Engine.
  ### CONTEXT: Cần dữ liệu giả lập để test giao diện danh sách giao dịch ngân hàng.
  ### TASK: Tạo 3 bản ghi giao dịch thanh toán quẹt thẻ.
  ### CONSTRAINTS:
  - Tên tiếng Việt không dấu.
  - Số tiền từ 50,000 đến 2,000,000 VNĐ.
  - Ngày giao dịch trong tháng 09/2026.
  ### FORMAT: Mảng JSON thuần túy gồm các key: id, cardLast4, amountVND, merchant, timestamp.
  ```
- **Tiêu chuẩn nghiệm thu:** Trả về đúng mảng JSON 3 phần tử, đúng schema, không kèm giải thích thừa.

## ⚠️ Quy Tắc Vàng
1. Nếu thiếu **Constraint**, AI sẽ mặc định sinh ra những gì dài dòng nhất.
2. Nếu thiếu **Format**, bạn sẽ mất thêm 15 phút copy-paste thủ công vào Excel.
