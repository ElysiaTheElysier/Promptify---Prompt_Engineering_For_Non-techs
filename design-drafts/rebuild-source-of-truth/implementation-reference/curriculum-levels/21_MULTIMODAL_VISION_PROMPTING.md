# BÀI 21: MULTIMODAL VISION PROMPTING (KỸ NGHỆ PROMPT HÌNH ẢNH & CHỨNG TỪ SCAN)
> **Mã chuyên đề:** `MOD-21-MULTIMODAL-VISION`  
> **Thuộc nhóm:** Kỹ nghệ đa phương tiện & Thực chiến (Multimodal & Frontier)  
> **Mục tiêu:** Làm chủ kỹ thuật tương tác với các mô hình thị giác AI (Vision LLMs như Gemini, GPT-4o). Biết cách ra lệnh để AI đọc chuẩn xác hóa đơn đỏ, trích xuất bảng biểu từ file scan bị mờ, và phân tích hiện trạng tài sản thế chấp qua ảnh chụp thực địa.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Trước đây, Prompting chỉ giới hạn ở văn bản gõ phím. Với sự xuất hiện của các mô hình đa phương tiện (Multimodal LLMs), **Hình ảnh giờ đây cũng là một phần của Prompt**.  
Đối với người làm văn phòng, kế toán và ngân hàng, đây là một cuộc cách mạng:
- Thay vì ngồi gõ lại 50 dòng từ một tờ hóa đơn VAT giấy hoặc ảnh chụp bảng cân đối kế toán, bạn chỉ cần chụp ảnh và gửi kèm câu lệnh.
- Thay vì đọc lướt các biểu đồ tài chính phức tạp, AI có thể đọc các đường cong xu hướng và cảnh báo rủi ro ngay lập tức.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Bạn Robot có đôi mắt thần kỳ và chiếc kính lúp"*

Bình thường bạn Robot chỉ biết nghe em nói chuyện bằng chữ.  
Nhưng hôm nay bạn Robot được lắp thêm một **đôi mắt thần kỳ**!  
Em mở cuốn truyện tranh ra và đưa một bức tranh đố vui: *"Tìm 5 điểm khác nhau giữa 2 chú gấu trúc"*.  
Bạn Robot chớp mắt nhìn bức tranh qua chiếc kính lúp và reo lên:  
- *"Điểm 1: Chú gấu bên trái đang cầm cành trúc, chú bên phải cầm quả táo!"*.  
- *"Điểm 2: Chú gấu bên trái có chiếc mũ đỏ, chú bên phải không có mũ!"*.  
Robot nhìn tranh tinh tường hệt như một người bạn ngồi cạnh em vậy!  
👉 **Vision Prompting** chính là việc em mở mắt cho Robot nhìn vào tranh ảnh và tài liệu cùng em.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Nhờ đứa cháu đọc hộ đơn thuốc viết tay của bác sĩ"*

Khi đi khám bệnh ở bệnh viện về, bác cầm trên tay tờ đơn thuốc:  
Chữ bác sĩ viết tay ngoáy nhanh như rồng bay phượng múa, mắt người già kèm nhèm đọc không ra tên thuốc hay liều uống ngày mấy viên trước bữa ăn.  
Bác lấy điện thoại chụp một tấm ảnh tờ đơn thuốc rõ nét, gửi cho đứa cháu:  
*"Cháu nhìn vào ảnh đơn thuốc này, đọc kỹ từng dòng giúp bà xem thuốc huyết áp tên gì, uống sáng hay tối, mỗi lần uống nửa viên hay một viên nhé!"*.  
Đứa cháu nhìn ảnh và đọc rành rọt từng loại thuốc, dặn dò bà cẩn thận.  
👉 Khi đưa ảnh lên máy tính, bác cũng dặn máy y hệt như đang dặn đứa cháu mắt sáng đọc giúp bà vậy.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Trích xuất hóa đơn đỏ và Thẩm định hiện trường tài sản thế chấp"*

#### Tình huống 1: Trích xuất bảng kê từ hóa đơn VAT scan bị nghiêng
- **Ảnh đính kèm:** Ảnh chụp hóa đơn bán lẻ hoặc bảng sao kê viết tay.
- **Mẫu Prompt Vision chuẩn:**
  ```text
  NHIỆM VỤ: Trích xuất toàn bộ dữ liệu bảng hàng hóa từ hình ảnh hóa đơn đính kèm.
  QUY TẮC BẮT BUỘC:
  1. Chỉ đọc những gì nhìn thấy rõ trong ảnh. Nếu chữ số nào bị mờ hoặc nhòe mực, hãy ghi [MỜ_KHÔNG_RÕ], TUYỆT ĐỐI CẤM đoán mò con số.
  2. Bỏ qua các hình mờ hoa văn chìm chống giả mạo của hóa đơn.
  3. Xuất kết quả duy nhất dưới dạng Bảng Markdown gồm 5 cột:
     | STT | Tên Hàng Hóa / Dịch Vụ | Số Lượng | Đơn Giá | Thành Tiền |
  4. Ở dòng cuối cùng, đối chiếu xem: [Tổng các dòng thành tiền] có khớp với [Tổng tiền thanh toán ghi bằng chữ] ở chân hóa đơn không?
  ```

#### Tình huống 2: Đánh giá hiện trạng nhà xưởng qua 3 ảnh chụp thực địa
- **Prompt:** *"Hãy đối chiếu 3 bức ảnh chụp kho lạnh của Công ty X: (Ảnh 1 chụp năm 2024, Ảnh 2 chụp sau đợt bão tháng 09/2026, Ảnh 3 chụp cổng chính). Hãy chỉ ra: Mái tôn kho lạnh có dấu hiệu tốc mái hay rỉ sét không? Máy móc bảo quản có dấu hiệu ngập nước không? Đưa ra đánh giá sơ bộ về mức độ suy giảm giá trị tài sản bảo đảm."*

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Tọa độ không gian (Spatial Bounding Boxes) và Tối ưu hóa Token Hình ảnh*

Khi làm việc với Vision API (Gemini multimodal hoặc GPT-4o):
- **Image Token Overhead:** Mỗi bức ảnh có độ phân giải cao thường được cắt thành nhiều ô gạch (Tiles) và tiêu tốn từ 258 đến hơn 1000 tokens. Cần resize ảnh về độ phân giải vừa đủ (khoảng 1024x1024) trước khi upload để tiết kiệm chi phí và tăng tốc độ xử lý.
- **Tọa độ chuẩn hóa (Normalized Bounding Boxes):** Mô hình có thể trả về vị trí chính xác của vật thể dưới dạng mảng 4 số `[ymin, xmin, ymax, xmax]` trên thang đo $0 \to 1000$.

```typescript
// Mẫu gọi Vision Prompt với Gemini SDK
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function analyzeCollateralImage() {
  const imageBase64 = fs.readFileSync('kho_lanh_tham_dinh.jpg').toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      },
      {
        text: 'Phân tích hiện trạng tài sản thế chấp trong ảnh: Kiểm tra rỉ sét mái tôn, ngập úng và xuất ra danh sách hư hại kèm mức độ rủi ro (Cao/Trung bình/Thấp).'
      }
    ]
  });

  console.log(response.text);
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Bé dùng sáp màu vẽ bức tranh "Tàu vũ trụ bay lên sao Hỏa", chụp hình bức tranh và nhờ bạn Robot thông minh đếm xem có bao nhiêu ngôi sao và nhận xét bức tranh.
- **Prompt mẫu kèm ảnh (Copy & Paste cùng hình vẽ):**
  ```text
  [Kèm hình chụp bức tranh vẽ tay]
  Chào bạn Robot! Đây là bức tranh do chính tay em tự vẽ.
  Hãy quan sát thật kỹ bức tranh và trả lời em:
  1. Trong tranh có những màu sắc nào nổi bật nhất?
  2. Đếm giúp em xem có bao nhiêu ngôi sao nhỏ xung quanh con tàu vũ trụ?
  3. Khen em 1 câu về chi tiết độc đáo nhất trong bức tranh này nhé!
  ```
- **Kết quả mong đợi:** AI nhận diện đúng màu sắc bút sáp, đếm chính xác số lượng ngôi sao và đưa ra lời khen ngợi kích thích trí sáng tạo của bé.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác chụp hình tờ đơn thuốc của phòng khám tư do chữ bác sĩ viết hơi ngoáy khó đọc. Nhờ AI đọc rõ tên thuốc, công dụng và cách dùng để đối chiếu lại với dược sĩ nhà thuốc.
- **Prompt mẫu kèm ảnh (Copy & Paste cùng hình chụp đơn thuốc):**
  ```text
  [Kèm hình chụp đơn thuốc]
  Tôi chụp lại đơn thuốc này nhưng mắt kém và chữ viết tay của bác sĩ hơi khó đọc.
  Nhờ bạn:
  1. Đọc rõ từng dòng: Tên thuốc là gì? Liều lượng uống mấy viên một ngày? Uống trước hay sau ăn?
  2. Bổ sung lời nhắc nhở quan trọng: Đây là bản hỗ trợ đọc chữ, tôi vẫn cần đem đơn này ra quầy thuốc hỏi lại dược sĩ chuyên môn đúng không?
  ```
- **Kết quả mong đợi:** AI trích xuất bảng thuốc rõ ràng từng dòng, đồng thời hiển thị khuyến cáo an toàn y tế bắt buộc người cao tuổi phải tham vấn dược sĩ khi mua thuốc.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Chụp ảnh hoặc đính kèm ảnh chụp Báo cáo tài chính quý (Bảng cân đối kế toán dạng ảnh scan/PDF chụp lại), yêu cầu AI trích xuất dữ liệu thành bảng số liệu và tính toán chỉ số thanh toán hiện hành.
- **Prompt mẫu kèm ảnh:**
  ```text
  [Kèm ảnh chụp Bảng Cân Đối Kế Toán quý 4/2025]
  Nhiệm vụ trích xuất và phân tích thị giác:
  1. Trích xuất chính xác 4 chỉ tiêu từ ảnh scan đính kèm:
     - Tiền và tương đương tiền (Mã số 110)
     - Tổng tài sản ngắn hạn (Mã số 100)
     - Nợ ngắn hạn (Mã số 310)
     - Vốn chủ sở hữu (Mã số 400)
  2. Tự động tính Chỉ số thanh toán hiện hành (Current Ratio = Tài sản ngắn hạn / Nợ ngắn hạn).
  3. Đánh giá sơ bộ: Chỉ số này có đảm bảo khả năng thanh toán nợ đến hạn của doanh nghiệp không?
  ```
- **Tiêu chuẩn nghiệm thu:** AI trích xuất chính xác 100% số liệu từ ảnh, không bị nhận diện nhầm số 0 thành số 8 hoặc dấu phẩy ngăn cách hàng nghìn.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Tải lên ảnh chụp màn hình bản vẽ kiến trúc hệ thống (Cloud Architecture Diagram) hoặc ảnh phác thảo giao diện (Wireframe UI), yêu cầu AI phân tích luồng dữ liệu (Data Flow) và xuất mã Mermaid Diagram tương đương mà không cần cài đặt thêm phần mềm.
- **Yêu cầu thực hành (Prompt Vision Architecture trên Playground):**
  ```text
  [Kèm hình ảnh sơ đồ kiến trúc hệ thống gồm Client -> Cloudflare -> API Gateway -> Microservices -> PostgreSQL]
  
  Prompt:
  You are a Cloud Infrastructure Visual Auditor.
  Analyze the uploaded architecture diagram image and perform the following:
  1. Identify all system components and their respective connectivity protocols (HTTPS, gRPC, TCP).
  2. Detect any potential network bottleneck or security perimeter missing (e.g., WAF, Private Subnet).
  3. Recreate the exact topology of this diagram in valid, clean Mermaid.js syntax inside a ```mermaid codeblock.
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - AI đọc đúng các khối thành phần trong hình ảnh.
  - Sinh ra đoạn mã Mermaid diagram chuẩn cú pháp (graph TD / flow), có thể dán vào Markdown preview để render lại sơ đồ nguyên bản.

## ⚠️ Quy Tắc Vàng
- **Quy tắc cấm đoán mò số tiền:** Với ảnh chứng từ tài chính, luôn luôn có câu lệnh: *"Nếu con số bị mờ hoặc che khuất, phải ghi rõ là KHÔNG ĐỌC ĐƯỢC, tuyệt đối không được tự ý điền số giả định"*.
