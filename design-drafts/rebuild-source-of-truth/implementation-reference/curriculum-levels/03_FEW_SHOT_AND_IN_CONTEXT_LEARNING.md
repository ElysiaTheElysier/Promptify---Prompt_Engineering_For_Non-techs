# BÀI 03: FEW-SHOT & IN-CONTEXT LEARNING (DẠY AI BẰNG VÍ DỤ MẪU)
> **Mã chuyên đề:** `MOD-03-FEW-SHOT`  
> **Thuộc nhóm:** Nền tảng cốt lõi (Core Foundations)  
> **Mục tiêu:** Hiểu cơ chế In-Context Learning giúp ép mô hình sao chép chuẩn mực 100% văn phong, định dạng và logic nghiệp vụ bằng cách cung cấp từ 1 đến 5 cặp ví dụ mẫu.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
**Few-Shot Prompting** (hoặc In-Context Learning - ICL) là kỹ thuật cung cấp một vài cặp ví dụ `[Đầu vào mẫu -> Kết quả mẫu]` ngay bên trong câu lệnh trước khi đưa ra câu hỏi thực tế.
- **One-Shot:** Cung cấp 1 ví dụ mẫu duy nhất.
- **Few-Shot:** Cung cấp 2 đến 5 ví dụ mẫu.
- **Nguyên lý:** *"Trăm lời mô tả trừu tượng không bằng một ví dụ cụ thể."*

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Trò chơi bắt chước theo tranh mẫu"*

Em có bao giờ chơi trò chơi tô màu theo tranh mẫu chưa?  
Nếu mẹ chỉ bảo: *"Tô màu chú chim đi con"*, em có thể tô chú chim thành màu tím hoặc màu xanh lá.  
Nhưng nếu mẹ đưa cho em một bức tranh mẫu vẽ sẵn: *"Đây, chú chim mẫu có mỏ vàng và cánh màu xanh da trời này!"*. Em chỉ cần nhìn tranh mẫu là biết ngay cách tô bức tranh thứ hai giống hệt như vậy!  
👉 **Few-shot** chính là việc em đưa tranh mẫu cho AI xem trước để AI bắt chước chuẩn 100%.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Đưa mẫu thêu hoa văn truyền thống cho thợ may"*

Khi bác muốn đặt may một chiếc áo dài gấm có thêu hoa sen ở tà áo, nếu bác chỉ dặn thợ: *"Thêu cho tôi bông hoa sen thanh thoát nhé"*, mỗi người thợ sẽ tự tưởng tượng ra một kiểu hoa sen khác nhau.  
Nhưng nếu bác mang theo một mảnh vải mẫu có sẵn đường kim mũi chỉ mẫu của bà ngoại ngày xưa để lại và bảo: *"Cháu nhìn mẫu này thêu đúng mũi này cho bác"*, người thợ sẽ làm ra sản phẩm chuẩn y như ý bác muốn.  
👉 Đưa ví dụ mẫu cho máy tính cũng y hệt như việc bác đưa miếng vải mẫu cho người thợ vậy.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Định hình văn phong thương hiệu Agribank (Brand Voice Dossier)"*

Rất nhiều nhân viên nghiệp vụ cố gắng viết những dòng mô tả rất dài như: *"Hãy viết giọng điệu ấm áp, mang đậm tính nhân văn, gần gũi với bà con nông dân, chuẩn mực tài chính nhưng không xa cách..."*. Kết quả AI vẫn viết ra giọng dịch máy vô hồn.  
**Giải pháp triệt để:** Bỏ hết tính từ mô tả trừu tượng, thay bằng **2 ví dụ mẫu thực tế**.

#### Cấu trúc Prompt Few-Shot văn phòng chuẩn:
```text
Nhiệm vụ: Chuyển đổi thông báo khô khan của ngân hàng thành tin nhắn Zalo thân thiện gửi bà con nông dân.

--- VÍ DỤ MẪU 1 ---
Đầu vào: "Thông báo chi nhánh tạm ngừng giao dịch ngày 02/09 theo quy định nghỉ lễ của Nhà nước."
Đầu ra: "Dạ thưa Bác, nhân dịp Quốc khánh 02/09, Agribank xin chúc Bác và gia đình kỳ nghỉ lễ an vui, dồi dào sức khỏe! Chi nhánh xin phép nghỉ lễ từ ngày... và sẽ mở cửa đón Bác vào ngày... Bác cần chuyển tiền gấp trong dịp này cứ mở app Agribank E-Mobile Banking dùng bình thường Bác nhé!"

--- VÍ DỤ MẪU 2 ---
Đầu vào: "Nhắc nợ: Hợp đồng tín dụng số 456 đến hạn thanh toán gốc lãi ngày 25."
Đầu ra: "Agribank xin chào anh Tuấn! Khoản vay nuôi tôm của anh sắp tới kỳ hạn trả lãi vào ngày 25 tới đây rồi ạ. Anh nhớ sắp xếp nguồn tiền trước ngày 25 để giữ lịch sử tín dụng thật đẹp và được hưởng mức lãi suất ưu đãi cho mùa vụ sau nhé anh!"

--- BÀI TOÁN CẦN GIẢI ---
Đầu vào: "Thông báo: Khách hàng cần cập nhật sinh trắc học khuôn mặt trước ngày 01/07."
Đầu ra: [AI sẽ tự động bắt chước văn phong ấm áp, xưng hô bà con thân tình y như 2 ví dụ trên]
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Học trong ngữ cảnh (In-Context Learning) mà không cần Fine-tune lại Model*

Trong lập trình với LLM, **Few-Shot** là cách nhanh nhất để định hình output mà không tốn công huấn luyện hay fine-tune lại mô hình:
- **Cơ chế Pattern Matching:** AI hoạt động như một cỗ máy nhận diện quy luật cực mạnh. Khi bạn đưa ra các cặp `Input -> Output`, AI sẽ tự động "bắt chước" cấu trúc cú pháp, kiểu dữ liệu và định dạng mà bạn mong muốn.
- **Thứ tự ví dụ (Order matters):** Ví dụ mẫu nằm ở vị trí cuối cùng (ngay trước câu hỏi cần xử lý) thường có tác động mạnh nhất đến câu trả lời của AI.
- **Bài toán đánh đổi Token & Độ trễ (Cost/Latency Tradeoff):** 
  - Thêm ví dụ đồng nghĩa với việc tăng số lượng Token đầu vào (Prompt Tokens).
  - Khuyến nghị thực chiến: Thường chỉ cần **2 đến 3 ví dụ chất lượng cao** là đủ. Đừng nhồi 10-20 ví dụ vì sẽ làm request bị chậm và tốn tiền API không cần thiết.

```typescript
// Exemplar Interface cho LLM Service
export interface FewShotExemplar {
  input: string;
  output: string;
  explanation?: string;
}

export function formatFewShotPrompt(task: string, exemplars: FewShotExemplar[], query: string): string {
  let prompt = `${task}\n\n`;
  exemplars.forEach((ex, idx) => {
    prompt += `### Example ${idx + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\n\n`;
  });
  prompt += `### Current Task:\nInput: ${query}\nOutput:`;
  return prompt;
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Dạy bạn Robot phân biệt món ăn tốt cho sức khỏe qua 2 ví dụ mẫu.
- **Prompt mẫu để thử:**
  ```text
  Hãy học theo các ví dụ mẫu sau để nhận xét món ăn:
  Ví dụ 1: Quả táo đỏ -> [Tốt cho sức khỏe: Có nhiều vitamin, giúp da dẻ hồng hào]
  Ví dụ 2: Kẹo mút nhiều đường -> [Không tốt: Ăn nhiều dễ bị sâu răng và đau bụng]
  
  Bây giờ hãy nhận xét món sau theo đúng mẫu trên:
  Món ăn: Củ cà rốt luộc -> 
  ```
- **Kết quả mong đợi:** Robot xuất ra: `[Tốt cho sức khỏe: Có nhiều vitamin A, giúp mắt sáng tinh anh]`.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Dạy máy tính cách viết lời chúc mừng thọ đúng nề nếp gia phong qua 1 câu văn mẫu của gia đình.
- **Prompt mẫu để thử:**
  ```text
  Hãy xem ví dụ mẫu câu chúc của gia đình tôi:
  Mẫu: "Kính chúc Cụ ông thượng thọ 80 tuổi, phúc như Đông hải, thọ tỷ Nam sơn, luôn là bóng cây đại thụ rợp mát che chở cho đàn con cháu."
  
  Dựa vào văn phong trên, hãy viết câu chúc mừng thọ 85 tuổi cho Cụ bà hàng xóm thích ăn chay, niệm Phật và sống hiền lành.
  ```
- **Kết quả mong đợi:** Câu chúc trang trọng, ấm áp, có hình ảnh Bồ Đề, hoa sen thanh bạch.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Chuẩn hóa thông báo thu nợ qua tin nhắn Zalo theo văn phong thân tình người nhà Tam nông.
- **Prompt mẫu 2-Shot:**
  ```text
  Nhiệm vụ: Chuyển đổi thông báo hành chính sang tin nhắn Zalo thân thiện Agribank.
  
  --- VÍ DỤ MẪU 1 ---
  Đầu vào: "HĐTD 123 đến hạn trả nợ gốc lãi ngày 15/09."
  Đầu ra: "Dạ thưa Bác Năm, khoản vay mở rộng đầm tôm của Bác sắp đến ngày trả gốc lãi ngày 15/09 rồi ạ. Bác nhớ sắp xếp tiền gửi vào tài khoản trước ngày 15 để được xếp hạng khách hàng uy tín và nhận ưu đãi giảm lãi cho vụ tôm sau Bác nhé!"
  
  --- BÀI CẦN LÀM ---
  Đầu vào: "HĐTD 456 đến hạn trả lãi khoản vay mua máy gặt đập liên hợp vào ngày 20/09."
  Đầu ra:
  ```
- **Tiêu chuẩn nghiệm thu:** AI tự động bắt chước đại từ xưng hô, gắn với hình ảnh máy gặt mùa vụ, lời dặn thân thương.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Dạy mô hình trích xuất mã lỗi hệ thống từ log server thành định dạng JSON chuẩn qua 2 ví dụ Few-Shot.
- **Yêu cầu thực hành:**
  ```text
  Input-Output Examples:
  Example 1:
  Log: "2026-09-24 10:20:00 [ERROR] Connection to Postgres at port 5432 failed: Connection refused"
  Output: {"service": "POSTGRES", "error_code": "CONN_REFUSED", "is_fatal": true}

  Example 2:
  Log: "2026-09-24 10:21:05 [WARN] High memory usage: heap memory at 88%"
  Output: {"service": "SYSTEM", "error_code": "HIGH_MEMORY", "is_fatal": false}

  Current Log to Parse:
  Log: "2026-09-24 10:22:15 [ERROR] Redis cache lookup failed for key session_123: Timeout after 2000ms"
  Output:
  ```
- **Tiêu chuẩn nghiệm thu:** Trả về chính xác JSON: `{"service": "REDIS", "error_code": "TIMEOUT", "is_fatal": true}` mà không bịa thêm trường mới.

## ⚠️ Cạm Bẫy Phổ Biến
- 🚫 **Đưa ví dụ sai:** Nếu trong ví dụ mẫu có lỗi chính tả hoặc dữ liệu sai, AI sẽ học luôn cả lỗi đó vào kết quả mới.
- 💡 **Quy tắc vàng:** Chỉ cần từ 2 đến 3 ví dụ chất lượng cao là đủ để AI nắm bắt quy luật, không nên nhồi nhét quá 10 ví dụ gây lãng phí token.
