# BÀI 01: ZERO-SHOT PROMPTING (RA LỆNH TRỰC TIẾP KHÔNG VÍ DỤ)
> **Mã chuyên đề:** `MOD-01-ZERO-SHOT`  
> **Thuộc nhóm:** Nền tảng cốt lõi (Core Foundations)  
> **Mục tiêu:** Hiểu rõ bản chất, giới hạn và cách ứng dụng câu lệnh trực tiếp khi không cung cấp bất kỳ ví dụ mẫu nào.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
**Zero-Shot Prompting** là kỹ thuật cơ bản nhất trong giao tiếp với mô hình ngôn ngữ lớn (LLM). Bạn đưa ra yêu cầu hoặc câu hỏi trực tiếp cho AI và mong đợi câu trả lời ngay lập tức mà **không cung cấp bất kỳ ví dụ mẫu (exemplar)** nào về cách định dạng hay cách giải quyết bài toán trước đó.

- **Ưu điểm:** Nhanh gọn, tiết kiệm token, hữu ích cho các tác vụ thường thức hoặc dịch thuật đơn giản.
- **Nhược điểm:** Kết quả dễ bị chung chung, sáo rỗng, hoặc sai lệch phong cách doanh nghiệp do AI phải "tự đoán" ngữ cảnh.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Nhờ bạn gấu bông nhặt đồ chơi mà không chỉ vào giỏ nào"*

Tưởng tượng em có một bạn Robot gấu bông rất thông minh trong phòng. Em chỉ nói với bạn ấy: *"Gấu ơi, nhặt đồ chơi đi!"*.  
Bạn Gấu nghe lệnh là làm ngay, nhưng vì em không chỉ cho bạn biết phải nhặt xe ô tô cất vào rương đỏ, hay xếp gấu nhỏ lên giường, nên bạn Gấu gom bừa tất cả vào gầm bàn!  
👉 **Zero-shot** chính là lúc em ra lệnh thật nhanh cho Robot mà chưa kịp làm mẫu cho Robot xem một lần nào cả.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Bảo đứa cháu ra chợ mua rau thơm mà không dặn rau gì"*

Bác hình dung giống như việc bác sai một đứa cháu họ mới ở quê lên: *"Cháu chạy ra chợ mua cho bác ít rau thơm về nấu canh nhé!"*.  
Đứa cháu rất nhanh nhẹn, nhưng vì không dặn mua ngò gai, thì là hay rau mùi, lại không bảo mua ở sạp nào quen, nên cháu mang về một mớ rau húng quế! Cháu không làm sai lời bác, chỉ là vì bác chưa dặn cụ thể nên cháu tự mua theo thói quen của cháu.  
👉 Khi nói chuyện với máy tính, nếu bác chỉ gõ một câu ngắn ngủn không có ví dụ cụ thể, máy cũng sẽ "đoán mò" hệt như đứa cháu kia vậy.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Giao việc cho nhân viên thử việc mà không gửi mẫu báo cáo của phòng"*

Khi bạn nhắn tin cho một nhân viên mới: *"Làm cho anh báo cáo tình hình nợ xấu quý 3 nhé"*.  
Kết quả nhận lại là một bài văn luận dài 4 trang A4 kể lể chung chung, không có bảng phân loại nợ nhóm 1 đến nhóm 5, không có biểu đồ so sánh với chỉ tiêu Hội sở Agribank giao. Bạn bực mình vì mất công sửa lại, nhưng thực chất lỗi là do bạn chưa gửi kèm **mẫu biểu (template)** chuẩn.

#### So sánh Prompt Kém vs Prompt Khá trong Zero-shot:
- ❌ **Prompt sơ sài:** *"Hãy viết thư từ chối cấp tín dụng cho khách hàng."*
  - *Hậu quả:* AI sinh ra bức thư kiểu dịch máy phương Tây, lạnh lùng, dễ gây bức xúc cho khách hàng.
- ✅ **Prompt Zero-shot cải tiến (rõ ràng nhiệm vụ & mục tiêu):**  
  ```text
  Nhiệm vụ: Viết thư từ chối cấp hạn mức tín dụng cho khách hàng doanh nghiệp vừa và nhỏ.
  Văn phong: Lịch sự, thấu cảm, giữ uy tín thương hiệu ngân hàng Agribank.
  Lý do từ chối: Báo cáo tài chính năm gần nhất chưa đáp ứng tiêu chí dòng tiền thanh toán nhanh.
  Đề xuất hỗ trợ: Hướng dẫn khách hàng chuẩn hóa sổ sách để thẩm định lại vào quý sau.
  ```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Gọi API trực tiếp chỉ với Prompt thô mà không đính kèm dữ liệu mẫu (Sample Data)*

Với dân làm code/IT, **Zero-Shot** chính là request đơn giản nhất:
- **Payload tối giản:** Bạn chỉ truyền duy nhất `prompt` vào API mà không cần kèm theo dữ liệu ví dụ (Exemplars).
- **Cơ chế xử lý:** AI nhận chuỗi text đầu vào và tự suy diễn dựa trên toàn bộ tri thức đã học trong quá trình pre-train.
- **Ưu điểm về hiệu năng:** 
  - Tiết kiệm token đầu vào (Input Tokens thấp nhất), giảm chi phí gọi API.
  - Phản hồi nhanh (độ trễ Latency thấp) vì request ngắn.
- **Lưu ý khi tích hợp:** Nếu bài toán yêu cầu định dạng đầu ra cố định (như JSON hoặc mã lỗi), bạn bắt buộc phải chỉ định rõ trong `prompt` hoặc qua config API, nếu không parser code phía backend sẽ rất dễ bị lỗi runtime khi đọc dữ liệu trả về.

```typescript
// Ví dụ gọi Zero-Shot inference chuẩn qua Gemini API
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runZeroShot() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Phân loại sắc thái phản hồi của khách hàng (Tích cực / Tiêu cực / Trung tính): "App ngân hàng hôm nay chuyển khoản chậm quá, đợi mãi 5 phút mới nhận mã OTP."',
    config: {
      temperature: 0.1, // Zero-shot phân loại nên để nhiệt độ thấp để giảm entropy
    }
  });

  console.log(response.text); // Kết quả mong đợi: "Tiêu cực"
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Đố bạn Robot AI đoán tên con vật qua 3 manh mối.
- **Prompt mẫu để thử:**
  ```text
  Đoán xem tôi là ai: Tôi có bộ lông trắng như tuyết, đôi tai dài luôn vểnh lên, mắt tròn xoe như hạt cườm và tôi thích gặm cà rốt. Chỉ nói đúng tên con vật, không nói thêm gì khác.
  ```
- **Kết quả mong đợi:** Robot trả lời ngắn gọn: *"Bạn là Chú Thỏ"*.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác muốn biết cách ngâm gừng với mật ong để giữ ấm cổ họng mùa lạnh mà không muốn đọc tài liệu dài dòng.
- **Prompt mẫu để thử:**
  ```text
  Chỉ cho tôi cách làm gừng ngâm mật ong trị ho cho người già. Hướng dẫn từng bước thật đơn giản, dễ làm tại nhà, không dùng thuật ngữ khó hiểu.
  ```
- **Kết quả mong đợi:** AI liệt kê 4 bước ngắn gọn: Chọn gừng ta, cạo vỏ thái lát mỏng, xếp vào lọ ngâm mật ong, sau 1 tuần dùng mỗi sáng 1 thìa nhỏ pha nước ấm.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Phân loại 3 email gửi vào hòm thư Agribank để chuyển đúng phòng ban xử lý.
- **Prompt mẫu để thử:**
  ```text
  Nhiệm vụ: Phân loại email khách hàng vào đúng 1 trong 3 nhóm: [KHOA_THE_KHAN_CAP], [HOI_LAI_SUAT], [BAO_LOI_APP].
  Quy tắc: Chỉ xuất duy nhất tên nhóm, không viết lời mở đầu hay giải thích.
  
  Email 1: "Tôi vừa làm rơi ví ở bến xe Mỹ Đình, có thẻ ATM trong đó, khóa ngay giúp tôi!"
  Email 2: "Tiết kiệm 100 triệu gửi 12 tháng tại quầy hiện tại được mấy phần trăm một năm?"
  Email 3: "Sáng nay quét mã QR thanh toán tiền điện thì app báo lỗi kết nối máy chủ 500."
  ```
- **Kết quả mong đợi:** AI xuất đúng 3 dòng nhãn tương ứng.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế Prompt Zero-shot đóng vai trò bộ lọc phân loại lỗi hệ thống (Bug Triage Bot) để nạp vào hệ thống ticket.
- **Yêu cầu thực hành (Thử trực tiếp trên Chat/Playground):**
  ```text
  Role: System Error Classifier.
  Input: "Database connection timeout after 30000ms at pool connection checkout."
  Task: Return a raw JSON object with 2 fields:
  {
    "category": "DATABASE" | "NETWORK" | "AUTH" | "UNKNOWN",
    "severity": "P0" | "P1" | "P2"
  }
  Constraint: Output strictly valid JSON without markdown codeblock wrapper.
  ```
- **Tiêu chuẩn nghiệm thu:** AI trả về JSON sạch: `{"category": "DATABASE", "severity": "P0"}` để hàm `JSON.parse()` chạy ngay không bị lỗi.

## ⚠️ Cạm Bẫy Phổ Biến & Lời Khuyên (Pitfalls & Pro-Tips)
- 🚫 **Bẫy ảo tưởng năng lực:** Nghĩ rằng AI "đọc được suy nghĩ của mình", dẫn đến câu lệnh quá cụt ngủn ("tóm tắt giúp", "làm thơ đi").
- 💡 **Quy tắc vàng Zero-shot:** Nếu không cho ví dụ mẫu, bạn **bắt buộc phải nói rõ định dạng mong muốn** (Ví dụ: "Trả về kết quả dưới dạng danh sách gạch đầu dòng, không viết lời mở đầu").
