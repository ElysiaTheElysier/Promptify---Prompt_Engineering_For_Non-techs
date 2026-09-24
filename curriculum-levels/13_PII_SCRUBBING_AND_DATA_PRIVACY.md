# BÀI 13: PII SCRUBBING & BẢO VỆ DỮ LIỆU CÁ NHÂN (KHỬ ĐỊNH DANH DỮ LIỆU)
> **Mã chuyên đề:** `MOD-13-PII-PRIVACY`  
> **Thuộc nhóm:** Bảo mật doanh nghiệp & Ràng buộc thực tế (Enterprise Defense)  
> **Mục tiêu:** Nắm vững nguyên tắc sống còn về bảo vệ bí mật kinh doanh và dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) khi ứng dụng AI. Làm chủ kỹ thuật khử định danh 2 chiều (Masking / Tokenization) trước khi gửi prompt lên điện toán đám mây.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
**PII (Personally Identifiable Information - Thông tin định danh cá nhân)** bao gồm: Số Căn cước công dân (CCCD), Số tài khoản ngân hàng, Số thẻ tín dụng, Họ tên thật, Số điện thoại, Địa chỉ nhà, Số dư tiền gửi.  
**Nguyên tắc số 1 trong ngành tài chính ngân hàng:**  
> *"TUYỆT ĐỐI KHÔNG BAO GIỜ dán trực tiếp dữ liệu PII thật của khách hàng vào các dịch vụ Public AI."*

**Kỹ thuật PII Scrubbing (Khử định danh 2 chiều):**
1. **Tại máy tính của bạn (Local Client):** Quét và thay thế dữ liệu nhạy cảm bằng các nhãn giả lập (`[KHACH_HANG_A]`, `[SO_TK_01]`).
2. **Gửi lên AI:** AI phân tích logic trên dữ liệu đã khử định danh.
3. **Nhận kết quả về máy:** Máy tính tự động map ngược các nhãn giả lập trở lại thông tin thật. AI không bao giờ biết khách hàng đó là ai!

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Cây bút xóa thần kỳ bôi đen tên trên bìa vở"*

Khi em mang cuốn vở bài tập mẫu lên lớp cho các bạn xem để học hỏi cách làm văn hay: Mẹ dặn em lấy chiếc bút xóa màu trắng bôi đè lên dòng chữ ghi **"Họ tên: Nguyễn Văn An - Địa chỉ: Nhà số 5 ngõ 10"** trên bìa vở.  
Các bạn trong lớp đọc được bài văn rất hay của em để học theo, nhưng không ai biết được địa chỉ nhà riêng hay số điện thoại của bố mẹ em cả!  
👉 **PII Scrubbing** chính là cây bút xóa thần kỳ giúp bảo vệ em an toàn trước người lạ!

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Dùng ngón tay che mã số bí mật khi rút tiền tại cây ATM"*

Khi bác ra cây ATM ở đầu ngõ để rút tiền lương hưu hàng tháng, con cháu luôn dặn bác:  
*"Bác đưa thẻ vào máy, lúc bấm 6 con số mật khẩu thì bác nhớ lấy bàn tay trái che lên trên bàn phím nhé, đừng để người đứng xếp hàng phía sau nhìn thấy số mật mã!"*.  
Tương tự như vậy, cuốn sổ tiết kiệm ở nhà bác cất kỹ trong tủ, không bao giờ đem số sổ hay số dư khoe cho người ngoài quán nước xem.  
👉 Khi dùng máy tính thông minh, việc "che tay" giấu đi số thẻ và họ tên người thân cũng quan trọng y như khi bác rút tiền ở cây ATM vậy.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Mô hình Bút xóa PII: Khử định danh trước khi gửi chuyên gia ngoài"*

Nhiều cán bộ ngân hàng rất muốn dùng AI để phân tích sao kê hoặc viết tờ trình tín dụng nhanh nhưng lo sợ bị vi phạm quy chế bảo mật của Agribank và Nghị định 13/2023/NĐ-CP của Chính phủ.

#### Bảng ánh xạ Khử định danh thực tế:
| Dữ liệu gốc nhạy cảm (CẤM GỬI) | Dữ liệu sau khi Khử (ĐƯỢC PHÉP GỬI) | Mục đích nghiệp vụ vẫn được bảo toàn |
| :--- | :--- | :--- |
| Ông Nguyễn Văn Tuấn | `[KHACH_HANG_A]` | AI vẫn hiểu đây là chủ thể khoản vay. |
| Số CCCD: 001201008945 | `[SO_DINH_DANH_01]` | AI vẫn kiểm tra được tính duy nhất của mã số. |
| STK: 1500205839201 Agribank | `[TAI_KHOAN_THANH_TOAN_01]` | AI vẫn đối chiếu được luồng tiền vào/ra. |
| Số dư: 4,850,200,000 VNĐ | `4.85 tỷ VNĐ` (Làm tròn) | AI vẫn tính toán được chỉ số tài chính. |

```text
PROMPT ĐÃ ĐƯỢC BẢO VỆ:
"Hãy phân tích dòng tiền sao kê trong 3 tháng của [KHACH_HANG_A] có tài khoản [TAI_KHOAN_01]:
- Ngày 05 hàng tháng nhận tiền về từ [DOI_TAC_X]: 150 triệu VNĐ.
- Ngày 10 hàng tháng chi trả tiền mua nguyên liệu: 80 triệu VNĐ.
Đánh giá xem [KHACH_HANG_A] có đủ khả năng thanh toán khoản vay 30 triệu/tháng không?"
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Cơ chế Masking bằng Regex và Bảng tra cứu cục bộ (In-Memory Key-Value)*

Kiến trúc an toàn dữ liệu đòi hỏi quá trình scrubbing phải diễn ra **100% tại Client (Browser/Local Server)** trước khi payload rời khỏi ranh giới mạng nội bộ:

```
[Raw User Input] ──> [Regex & NER Masker] ──> [Sanitized Prompt] ──> [Cloud LLM]
                            │                                             │
               [Local Memory Mapping Table]                               ▼
                            │                                    [Raw LLM Output]
                            ▼                                             │
             [Local De-anonymize Rehydration] <───────────────────────────┘
                            │
                            ▼
              [Final Result with Original PII]
```

```typescript
// Mẫu Client-side PII Scrubbing Service đơn giản
export class PiiScrubbingService {
  private mappingTable = new Map<string, string>();
  private reverseTable = new Map<string, string>();
  private counter = 1;

  public mask(text: string): string {
    // Regex nhận diện số CCCD (12 số) và Số điện thoại VN (10 số)
    const cccdRegex = /\b\d{12}\b/g;
    const phoneRegex = /(0[3|5|7|8|9]\d{8})\b/g;

    let sanitized = text.replace(cccdRegex, (match) => {
      if (!this.mappingTable.has(match)) {
        const placeholder = `[CCCD_TOKEN_${this.counter++}]`;
        this.mappingTable.set(match, placeholder);
        this.reverseTable.set(placeholder, match);
      }
      return this.mappingTable.get(match)!;
    });

    return sanitized;
  }

  public unmask(response: string): string {
    let restored = response;
    this.reverseTable.forEach((originalValue, token) => {
      restored = restored.split(token).join(originalValue);
    });
    return restored;
  }
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Chơi trò "Mật vụ nhí": Giấu tên thật, trường học và địa chỉ nhà của bé bằng các biệt danh siêu anh hùng trước khi gửi thư cho bạn robot.
- **Prompt mẫu để thử:**
  ```text
  Đoạn thư gốc: 'Em tên là Nguyễn Bảo Long, học lớp 3A trường Tiểu học Chu Văn An, nhà ở số 12 phố Huế. Em rất thích robot siêu nhân.'
  Nhiệm vụ: Hãy giấu tên, trường và địa chỉ nhà của em bằng các biệt danh vui:
  - Tên -> [Mật Vụ Sao Băng]
  - Trường học -> [Căn Cứ Bí Mật]
  - Địa chỉ -> [Hành Tinh Pha Lê]
  Viết lại bức thư sau khi đã thay thế.
  ```
- **Kết quả mong đợi:** Bức thư được viết lại hoàn hảo: *"Em tên là [Mật Vụ Sao Băng], học lớp 3A [Căn Cứ Bí Mật], nhà ở [Hành Tinh Pha Lê]. Em rất thích robot siêu nhân."*

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác muốn nhờ AI tóm tắt giùm một giấy tờ nhà đất hoặc sao kê lương nhưng phải che kín số Chứng minh nhân dân/CCCD và số tài khoản ngân hàng để phòng kẻ gian lấy cắp.
- **Prompt mẫu để thử:**
  ```text
  Đoạn văn: 'Bà Nguyễn Thị Mai, số CCCD: 001158009988, tài khoản nhận lương hưu số: 19028889998888 tại Techcombank, số tiền nhận tháng này là 6.800.000 đồng.'
  
  Yêu cầu an toàn dữ liệu:
  Hãy che toàn bộ số CCCD và Số tài khoản ngân hàng bằng ký hiệu [ĐÃ CHE THÔNG TIN]. Sau đó ghi rõ số tiền lương nhận được là bao nhiêu.
  ```
- **Kết quả mong đợi:** AI hiển thị: CCCD: `[ĐÃ CHE THÔNG TIN]`, Số tài khoản: `[ĐÃ CHE THÔNG TIN]`, Lương nhận: 6.800.000 đồng. Không để lọt bất kỳ chữ số bảo mật nào.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Khử định danh (Anonymization) hồ sơ tín dụng khách hàng VIP trước khi chuyển dữ liệu cho đối tác phân tích dữ liệu bên ngoài.
- **Prompt mẫu để thử:**
  ```text
  Văn bản gốc: 'Khách hàng VIP Đỗ Hoàng Quân, Chủ tịch HĐQT Công ty CP Khoáng Sản Đại Nam, CCCD 025088123456, SĐT 0903123456, địa chỉ Biệt thự R2 VinHomes Riverside Hà Nội, đang vay 45 tỷ VNĐ để nhập khẩu dây chuyền nghiền đá.'

  Quy tắc PII Scrubbing (Bắt buộc):
  - Tên cá nhân -> [BORROWER_01]
  - Tên doanh nghiệp -> [CORP_ALPHA]
  - CCCD và SĐT -> [MASKED_PII]
  - Địa chỉ cụ thể -> [PROVINCE_TIER_1]
  - Giữ nguyên số tiền và mục đích kinh tế.
  Xuất bản văn bản đã được làm sạch 100% PII.
  ```
- **Tiêu chuẩn nghiệm thu:** Không còn một định danh nhạy cảm nào lọt ra ngoài, văn bản sẵn sàng gửi qua môi trường Cloud công cộng mà không vi phạm Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế một System Prompt đóng vai trò làm Data Redaction Gateway (Cổng làm sạch dữ liệu đầu vào) tự động phát hiện và che giấu các trường PII (Email, Phone, Credit Card, IP Address, API Key) theo mẫu Token chuẩn trước khi chuyển tiếp dữ liệu.
- **Yêu cầu thực hành (Prompt Architecture trên Playground):**
  ```text
  System Prompt:
  You are an Automated Security Redaction Proxy.
  Task: Scan the input text and replace sensitive tokens according to these exact substitution patterns:
  - Phone numbers (VN format) -> <MASKED_PHONE>
  - Email addresses -> <MASKED_EMAIL>
  - Credit Card (16 digits) -> <MASKED_CC>
  - Private Keys / Bearer Tokens -> <MASKED_SECRET_KEY>

  Maintain all surrounding sentence structure and non-PII technical logs exactly as input.

  User Input:
  "Alert: User dev_admin logged in from email john.doe@fintechcorp.vn (phone 0912.345.678) using authorization header Bearer sk-live-99214ab88219. Payment processed on card 4111-2222-3333-4444 successfully."
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - Kết quả ra: *"Alert: User dev_admin logged in from email <MASKED_EMAIL> (phone <MASKED_PHONE>) using authorization header Bearer <MASKED_SECRET_KEY>. Payment processed on card <MASKED_CC> successfully."*
  - Toàn bộ thông tin nhạy cảm được che giấu chuẩn xác, không bị rò rỉ token thực.

## ⚠️ Quy Tắc Vàng
- An toàn bảo mật dữ liệu là **lằn ranh đỏ không thể thương lượng** trong môi trường doanh nghiệp.
- Mọi giải pháp AI trong ngân hàng phải tuân thủ triết lý: **Dữ liệu nhạy cảm ở lại nội bộ, chỉ có logic trừu tượng được gửi lên mây**.
