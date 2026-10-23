# BÀI 08: TOOL & FUNCTION CALLING (GỌI CÔNG CỤ NGOÀI QUA PROMPT)
> **Mã chuyên đề:** `MOD-08-TOOL-CALLING`  
> **Thuộc nhóm:** Chuỗi suy nghĩ & Lập luận nâng cao (Advanced Reasoning)  
> **Mục tiêu:** Hiểu cơ chế cho phép mô hình ngôn ngữ không chỉ trả về văn bản suông, mà biết tự động lựa chọn và xuất ra cấu trúc gọi hàm (Function Call) để tương tác với phần mềm bên ngoài một cách an toàn.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Mô hình AI dù thông minh đến đâu cũng có 2 điểm yếu chí mạng:
1. **Không biết thông tin thời gian thực** (ví dụ: giá vàng hôm nay, số dư tài khoản hiện tại).
2. **Không thể tự thực hiện hành động vật lý** (không thể tự gửi email, không thể tự cập nhật cơ sở dữ liệu).

**Function Calling** (Gọi hàm) giải quyết triệt để vấn đề này: Bạn cung cấp cho AI danh sách các "công cụ" được mô tả bằng cú pháp chuẩn (JSON Schema). Khi gặp yêu cầu của người dùng, AI sẽ quyết định công cụ nào cần dùng và **trích xuất chính xác các tham số (arguments)** cần truyền vào hàm.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Túi bảo bối thần kỳ của chú mèo máy Doraemon"*

Doraemon có một chiếc túi thần kỳ chứa hàng trăm bảo bối:
- **Cánh cửa thần kỳ:** Cần biết *"Điểm đến là đâu?"* (Ví dụ: Công viên khủng long).
- **Chong chóng tre:** Cần biết *"Gắn lên đầu bạn nào?"* (Ví dụ: Nobita).
- **Bánh mì trí nhớ:** Cần biết *"Áp vào trang sách nào?"* (Ví dụ: Trang 15 môn Toán).  
Khi Nobita khóc lóc: *"Tớ muốn sang nhà Shizuka ngay bây giờ!"*, Doraemon không cần phải bay sang đó, mà chú thò tay vào túi, chọn đúng **Cánh cửa thần kỳ** và cài đặt điểm đến là *"Nhà Shizuka"*.  
👉 **Function Calling** chính là việc AI biết thò tay vào túi công cụ, chọn đúng món đồ và điền đúng thông tin để dùng!

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Bàn phím gọi nhanh số khẩn cấp trên điện thoại"*

Bác hình dung trên chiếc điện thoại bàn ở nhà, các con cài sẵn các nút gọi nhanh tiện lợi:
- Nút số 1: Gọi xe cứu thương (Cần báo địa chỉ nhà).
- Nút số 2: Gọi công an phường (Cần báo việc khẩn cấp).
- Nút số 3: Gọi cho con trai cả (Để hỏi thăm).  
Khi nhà có việc cần gọi cứu thương, bác chỉ cần bấm phím số 1 và đọc địa chỉ nhà số 12 ngõ Huyện. Điện thoại sẽ tự động kết nối máy và truyền thông tin đi. Bác không cần phải học cách vận hành cả mạng lưới viễn thông phức tạp.  
👉 Máy tính cũng vậy: AI chỉ cần chọn đúng "phím gọi" phù hợp với yêu cầu của bác.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Trợ lý ảo ngân hàng lập lệnh chuyển tiền nhưng KHÔNG tự ý chuyển"*

Một sai lầm rất lớn là lo sợ AI sẽ tự tiện trừ tiền trong tài khoản khách hàng. Trên thực tế, **AI không bao giờ có quyền chạm vào tiền**. AI chỉ đóng vai trò là người thư ký lập phiếu lệnh chuẩn xác:

```text
KHÁCH HÀNG CHAT: "Em ơi chuyển cho anh 15 triệu từ tài khoản thanh toán sang cho vợ anh là Nguyễn Thị Mai ở Vietcombank nhé."

AI TỰ ĐỘNG CHỌN CÔNG CỤ:
Tên hàm: TaoLenhChuyenKhoan
Các tham số AI trích xuất được:
{
  "tai_khoan_nguon": "TK_THANH_TOAN_DEFAULT",
  "so_tien": 15000000,
  "ngan_hang_thu_huong": "Vietcombank",
  "ten_nguoi_nhan": "NGUYEN THI MAI",
  "noi_dung": "Chuyen tien cho vo"
}

QUY TRÌNH TIẾP THEO (DO HỆ THỐNG AN NINH NGÂN HÀNG THỰC HIỆN):
1. Hệ thống Core Banking nhận dữ liệu trên từ AI.
2. Hiển thị popup xác nhận: "Quý khách có chắc chắn muốn chuyển 15.000.000 VNĐ cho NGUYEN THI MAI (Vietcombank)?".
3. Yêu cầu khách hàng nhập mã PIN Smart OTP hoặc quét khuôn mặt (Sinh trắc học).
4. Chỉ khi khách hàng xác thực thành công, giao dịch mới được chuyển đi.
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Dùng AI làm bộ Parser ngôn ngữ tự nhiên thành Tham số gọi hàm (API Arguments)*

Với các lập trình viên backend/frontend, **Function Calling** giúp bạn không phải viết hàng chục câu lệnh Regex phức tạp để bóc tách dữ liệu từ chat:
1. **Khai báo hàm (Function Declaration):** Bạn gửi cho AI một danh sách các hàm mà hệ thống của bạn có (gồm Tên hàm, Mô tả công dụng và các kiểu dữ liệu `string`, `number`, `boolean`).
2. **Cơ chế gọi tự động (Tool Dispatch):** Thay vì trả về một câu chat dài, AI sẽ trả về một object JSON chứa đúng tên hàm và các tham số đã trích xuất sạch sẽ (Type-safe parameters).
3. **Chính sách gọi (Tool Choice Config):**
   - `AUTO`: AI tự quyết định khi nào cần gọi tool, khi nào chỉ cần chat trả lời bình thường.
   - `ANY`: Bắt buộc AI phải chọn một tool để gọi (hữu ích cho các form tự động nhập liệu).
   - `NONE`: Tắt gọi tool, chỉ trả về text thuần.

```typescript
// Khai báo công cụ chuẩn Gemini SDK
import { FunctionDeclaration, Type } from '@google/genai';

export const loanCalculatorDeclaration: FunctionDeclaration = {
  name: 'calculateLoanInstallment',
  description: 'Tính toán lịch trả nợ gốc lãi hàng tháng cho khoản vay ngân hàng Agribank',
  parameters: {
    type: Type.OBJECT,
    properties: {
      principal: { type: Type.NUMBER, description: 'Số tiền vay gốc (VNĐ)' },
      annualRate: { type: Type.NUMBER, description: 'Lãi suất năm (ví dụ 0.08 cho 8%)' },
      termMonths: { type: Type.INTEGER, description: 'Thời hạn vay tính theo tháng' },
      method: { 
        type: Type.STRING, 
        enum: ['DU_NO_GIAM_DAN', 'DEU_HANG_THANG'],
        description: 'Phương thức tính lãi'
      }
    },
    required: ['principal', 'annualRate', 'termMonths']
  }
};
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Chơi trò gọi bảo bối Doraemon để giúp Nobita làm bài tập và đi dã ngoại.
- **Prompt mẫu để thử:**
  ```text
  Túi thần kỳ của Doraemon có 2 bảo bối:
  1. [BanhMiTriNho(mon_hoc, so_trang)]: Giúp nhớ bài học ngay lập tức.
  2. [ChongChongTre(ten_nguoi, noi_den)]: Giúp bay trên trời đến điểm dã ngoại.

  Nobita mếu máo: "Doraemon ơi, tớ chưa học thuộc 5 trang thơ môn Tiếng Việt ngày mai thi rồi!".
  Hãy chọn đúng bảo bối và điền đúng thông tin Nobita cần vào tên bảo bối!
  ```
- **Kết quả mong đợi:** AI chọn bảo bối: `BanhMiTriNho(mon_hoc="Tiếng Việt", so_trang=5)`.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác muốn nhờ máy tính bấm phím gọi nhanh cho người thân khi trong người thấy chóng mặt.
- **Prompt mẫu để thử:**
  ```text
  Danh bạ điện thoại khẩn cấp của bác có:
  - Phím 1: [GoiCapCuu(dia_chi_nha)]
  - Phím 2: [GoiConTraiTruong(ten_con, so_dien_thoai)]
  
  Bác nói vào điện thoại: "Bác thấy hoa mắt chóng mặt quá, gọi cho thằng Tuấn con trai bác về nhà gấp với!".
  Hệ thống hãy chọn đúng phím bấm và trích xuất đúng tên người cần gọi.
  ```
- **Kết quả mong đợi:** Hệ thống kích hoạt hàm `GoiConTraiTruong(ten_con="Tuấn")`.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Phân tích yêu cầu khách hàng qua tin nhắn để tự động lập lệnh chuyển tiền vào hệ thống.
- **Prompt mẫu Function Calling nghiệp vụ:**
  ```text
  Danh sách công cụ của Trợ lý Ngân hàng:
  - [TaoLenhChuyenTien(tai_khoan_nhan, ngan_hang, so_tien_vnd, noi_dung)]
  - [KhoaTheKhanCap(so_the_hoac_cmnd, ly_do)]
  
  Tin nhắn của khách hàng: "Em ơi chuyển cho anh 25 triệu sang số tài khoản 0912345678 tại Vietcombank để thanh toán tiền mua phân bón nhé."
  
  Yêu cầu: Hãy trích xuất đúng tên công cụ cần dùng và các tham số tương ứng dưới dạng bảng hoặc JSON để chuyển giao dịch sang bộ phận kiểm soát.
  ```
- **Tiêu chuẩn nghiệm thu:** AI trích xuất đủ: số tiền 25.000.000, STK nhận, ngân hàng Vietcombank, nội dung mua phân bón.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế cấu trúc JSON Schema cho công cụ tính toán hạn mức vay vốn (Loan Eligibility Calculator).
- **Yêu cầu thực hành:**
  ```text
  Role: API Schema Architect.
  Task: Define a function declaration schema named "calculateLoanLimit" for Gemini/OpenAI API:
  - Parameters required: monthlyIncome (number), currentDebt (number), loanType (string enum: 'MORTGAGE' | 'BUSINESS' | 'CONSUMER').
  - Include parameter descriptions in Vietnamese.
  - Demonstrate a mock user prompt that triggers this function call with all required arguments.
  ```
- **Tiêu chuẩn nghiệm thu:** Schema hợp lệ chuẩn JSON Schema (type, properties, required), prompt mẫu kích hoạt trúng 100% tham số.

## ⚠️ Quy Tắc Vàng
- **Quyền hạn tối thiểu (Principle of Least Privilege):** Không bao giờ cấp các hàm nguy hiểm (như `XoaTaiKhoan`, `TruTien`) cho AI gọi trực tiếp mà không có bước xác thực người dùng (Human-In-The-Loop).
