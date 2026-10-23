# BÀI 10: STRUCTURED OUTPUTS (ĐỊNH DẠNG DỮ LIỆU CÓ CẤU TRÚC & JSON SCHEMA)
> **Mã chuyên đề:** `MOD-10-STRUCTURED-OUTPUTS`  
> **Thuộc nhóm:** Điều khiển tham số & Định dạng dữ liệu (Generation Control)  
> **Mục tiêu:** Ép mô hình AI tuân thủ tuyệt đối cấu trúc dữ liệu nghiêm ngặt (JSON Schema, Bảng Markdown, XML tags), triệt tiêu hoàn toàn lời chào thừa thãi ("Chắc chắn rồi...") để tích hợp liền mạch vào hệ thống phần mềm và Excel.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Mô hình ngôn ngữ tự nhiên được huấn luyện để trò chuyện lịch sự như con người. Vì vậy, phản xạ mặc định của nó là thêm các câu râu ria: *"Chào bạn! Dưới đây là kết quả phân tích theo yêu cầu của bạn... Hy vọng câu trả lời này giúp ích!"*.  
Trong lập trình phần mềm và tự động hóa văn phòng, những câu nói này là **"rác dữ liệu"** làm gãy toàn bộ pipeline:
- Làm hàm `JSON.parse()` bị crash.
- Khiến thao tác copy-paste bảng biểu vào Excel bị lệch dòng, lệch cột.  
**Structured Outputs** là nghệ thuật và kỹ thuật ép AI chỉ đổ dữ liệu vào đúng "khuôn đúc" mà không được phát ngôn thêm bất kỳ một ký tự thừa nào.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Khuôn dập bánh quy hình chú gấu và ngôi sao"*

Khi mẹ làm bánh quy bơ cho em ăn, mẹ có những chiếc khuôn bằng nhôm hình chú gấu, hình ngôi sao hoặc hình trái tim.  
Mẹ ấn khuôn dập mạnh xuống tảng bột bánh, sau đó nhấc khuôn ra. Bánh nướng xong sẽ có đúng hình chú gấu sắc nét, vừa vặn chằn chặn, không hề bị thừa một mẩu bột nào dính xung quanh!  
👉 **Structured Outputs** chính là chiếc khuôn dập bánh quy, ép bạn Robot AI chỉ được làm ra đúng hình dạng chiếc khuôn đó!

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Hộp chia thuốc uống 7 ngày trong tuần"*

Các bác cao tuổi thường phải uống nhiều loại thuốc theo đơn bác sĩ: thuốc huyết áp, thuốc bổ xương khớp, thuốc tiểu đường.  
Để không bị quên hay uống nhầm, con cháu thường mua cho bác một **hộp chia thuốc thông minh** có 7 hàng (từ Thứ Hai đến Chủ Nhật) và mỗi hàng có 4 ô: Sáng - Trưa - Chiều - Tối.  
Thuốc chia vào ô nào thì tới giờ chỉ việc mở đúng ô đó uống. Tuyệt đối không ai bỏ lẫn lộn tất cả các vỉ thuốc vào một túi nilon rồi bốc bừa.  
👉 Việc bắt máy tính trả lời theo bảng biểu hoặc khuôn khổ cũng giống như xếp thuốc vào từng ngăn ô ngăn nắp như vậy.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Khuôn bảng 5 cột dán thẳng vào Excel trong 3 giây"*

Nỗi khổ lớn nhất của dân văn phòng khi dùng ChatGPT hoặc Gemini là AI trả về một đoạn văn dài lòng thòng. Để đưa vào báo cáo, nhân sự phải ngồi đọc từng dòng rồi gõ lại vào Excel mất cả tiếng đồng hồ.

#### Kỹ thuật "Zero-Preamble Constraint" (Cấm nói lời mở đầu):
```text
NHIỆM VỤ: Trích xuất thông tin khách hàng từ biên bản cuộc họp giao dịch sau:
"Sáng nay chị Đỗ Thị Lan, đại diện Công ty TNHH May mặc Hoàng Gia (Mã số thuế 0102938475), đến chi nhánh đề nghị cấp bảo lãnh dự thầu gói thầu xây lắp 12 tỷ đồng. Chị Lan cam kết ký quỹ 30% bằng tiền gửi tại Agribank. Người liên hệ phụ trách hồ sơ là anh Tuấn (kế toán trưởng, SĐT 0912345678)."

RÀNG BUỘC ĐỊNH DẠNG BẮT BUỘC:
1. Xuất kết quả duy nhất dưới dạng Bảng Markdown gồm 5 cột:
   | Tên Doanh Nghiệp | Mã Số Thuế | Nhu Cầu Dịch Vụ | Giá Trị (VNĐ) | Tỷ Lệ Ký Quỹ |
2. QUY TẮC SỐNG CÒN (ZERO PREAMBLE):
   - CẤM viết lời chào ("Dưới đây là bảng...", "Chào bạn...").
   - CẤM viết lời chúc hoặc ghi chú giải thích ở cuối.
   - Ký tự đầu tiên của câu trả lời PHẢI LÀ dấu gạch đứng (|).
```

*Kết quả nhận được là một bảng Markdown nguyên chất. Bạn chỉ việc bôi đen, nhấn `Ctrl + C` và dán thẳng vào Excel là các ô tự động khớp 100%!*

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Chống lỗi crash `JSON.parse()` và Đảm bảo Type-safety cho Frontend/Backend*

Bất kỳ lập trình viên nào từng tích hợp AI vào web đều từng nếm trải cơn đau đầu này:
1. **Lỗi kinh điển `Unexpected token in JSON`:** Khi bạn dặn AI "Trả về JSON", nó rất hay bọc thêm ba dấu backtick ```` ```json ```` hoặc viết thêm lời chào *"Dưới đây là kết quả..."*. Khi server chạy lệnh `JSON.parse()`, ứng dụng sẽ crash ngay lập tức!
2. **Giải pháp sạch từ API (`responseMimeType`):** Các SDK hiện đại (Gemini, OpenAI) cho phép bạn truyền trực tiếp cấu hình `responseMimeType: 'application/json'`. Khi bật cờ này, mô hình bị khóa chặt chỉ được trả về chuỗi JSON thô, sạch 100%, không có bất kỳ lời chào thừa thãi nào.
3. **Định kiểu chuẩn qua Schema (Type-Safety):** Bằng cách truyền `responseSchema`, bạn ép AI phải trả về đúng các trường dữ liệu với kiểu chuẩn (`number`, `string`, `boolean`). Frontend và Backend có thể map thẳng vào TypeScript Interface mà không cần lo lắng về runtime type errors.

```typescript
// Cấu hình Structured Output thuần JSON Schema trên Gemini 2.5 Flash
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractCustomerStructured() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Trích xuất thông tin: Anh Lê Hoàng vay mua nhà 1.8 tỷ trong 15 năm, tài sản thế chấp là căn hộ chung cư Ecolife.',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          borrowerName: { type: Type.STRING },
          loanAmount: { type: Type.NUMBER },
          loanTermYears: { type: Type.INTEGER },
          collateralType: { type: Type.STRING }
        },
        required: ['borrowerName', 'loanAmount', 'loanTermYears']
      }
    }
  });

  const data = JSON.parse(response.text!);
  console.log(data.loanAmount); // 1800000000 (Type number chuẩn xác)
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Tạo "Thẻ bài Chiến binh Robot" gồm các mục rõ ràng như thẻ game Pokemon để không bị lộn xộn.
- **Prompt mẫu để thử:**
  ```text
  Tạo giúp em 1 Thẻ bài nhân vật Robot Đất Sét theo đúng khung sau:
  - Tên Robot:
  - Màu sắc:
  - Chiêu thức mạnh nhất:
  - Điểm năng lượng (từ 1 đến 100):
  Chỉ điền vào 4 mục trên, không viết thêm lời mở đầu hay kết thúc.
  ```
- **Kết quả mong đợi:** AI trả lời đúng 4 gạch đầu dòng gọn gàng, bé có thể chép ngay vào vở vẽ.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Tạo Bảng lịch uống thuốc trong ngày rõ ràng, chia theo Sáng - Trưa - Tối để dán lên tủ lạnh cho dễ nhớ.
- **Prompt mẫu để thử:**
  ```text
  Bác sĩ kê cho tôi: Thuốc huyết áp (Amlor 5mg) uống 1 viên buổi sáng sau ăn, Thuốc dạ dày (Nexium 20mg) uống 1 viên trước ăn sáng 30 phút, Thuốc bổ xương khớp uống 1 viên buổi trưa sau ăn.
  Hãy lập cho tôi Bảng lịch uống thuốc gồm 4 cột: Buổi trong ngày | Tên thuốc | Liều lượng | Thời điểm uống.
  Trình bày bảng thật ngay ngắn, chữ to rõ ràng.
  ```
- **Kết quả mong đợi:** Bảng kẻ 3 dòng chuẩn xác, phân chia sáng trưa rành mạch, không bị lẫn lộn giữa thuốc uống trước ăn và sau ăn.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Trích xuất thông tin tờ trình vay vốn thành bảng đối chiếu chỉ tiêu rủi ro để nạp vào hệ thống quản lý tín dụng.
- **Prompt mẫu để thử:**
  ```text
  Từ báo cáo thẩm định: 'Khách hàng Trần Văn Nam vay 2.5 tỷ VNĐ mục đích mua nhà tại Dự án EcoPark, thu nhập hàng tháng 75 triệu, dư nợ hiện tại 300 triệu tại Vietcombank, giá trị tài sản bảo đảm định giá 4.2 tỷ VNĐ.'
  
  Hãy trích xuất thông tin theo bảng chuẩn:
  | Chỉ tiêu | Giá trị |
  | Họ và tên | ... |
  | Số tiền vay đề xuất | ... |
  | Mục đích vay | ... |
  | Tỷ lệ vay trên giá trị định giá (LTV %) | ... (tự tính = Vay / Tài sản) |
  | Đánh giá sơ bộ LTV (Đạt nếu <= 70%) | ... |
  ```
- **Tiêu chuẩn nghiệm thu:** AI điền đúng thông tin và tự tính LTV = 2.5 / 4.2 ≈ 59.5% -> Kết luận: "Đạt". Không có lời văn rườm rà.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế Prompt ép buộc mô hình sinh chuẩn JSON Schema có lồng cấu trúc (Nested Object) và định dạng nghiêm ngặt (Strict Schema / Zero Preamble) để tích hợp vào Webhook backend.
- **Yêu cầu thực hành (Thực hiện trên Prompt / Playground):**
  ```text
  System Prompt:
  You are a Strict JSON Extraction Engine.
  Rules:
  1. Output MUST be a valid JSON object matching the TypeScript interface below.
  2. Output ONLY the raw JSON string. Do NOT enclose in markdown ```json blocks. Do NOT include preambles or explanations.

  Interface:
  interface CreditEvaluationResult {
    applicantId: string;
    riskScore: number; // integer 300 - 850
    decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
    riskFactors: string[];
    collateralSummary: {
      assetType: 'REAL_ESTATE' | 'VEHICLE' | 'DEPOSIT';
      estimatedValueVND: number;
    };
  }

  User Input:
  "Khách hàng ID: CUST-8831. Chấm điểm rủi ro: 720 điểm. Quyết định: Phê duyệt giải ngân. Yếu tố rủi ro: Thu nhập phụ thuộc mùa vụ. Tài sản bảo đảm là căn hộ chung cư định giá 3.5 tỷ VNĐ."
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - AI trả về đúng một chuỗi JSON hợp lệ có thể parse được ngay bằng `JSON.parse()`.
  - Không chứa markdown backticks (```), không có chữ "Here is your JSON:".
  - Các trường dữ liệu đúng kiểu (number, array, enum `APPROVED`, nested object `collateralSummary`).

## ⚠️ Quy Tắc Vàng
- Khi cần định dạng bảng: Luôn dùng cú pháp Markdown Table chuẩn với hàng phân cách `| :--- | :--- |`.
- Khi tích hợp API: Luôn bật `responseMimeType: 'application/json'` và truyền `responseSchema` thay vì chỉ viết "trả về json" trong prompt.
