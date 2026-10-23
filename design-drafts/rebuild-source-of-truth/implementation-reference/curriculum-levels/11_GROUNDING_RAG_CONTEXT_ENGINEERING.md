# BÀI 11: GROUNDING & CONTEXT ENGINEERING (NEO DỮ LIỆU & CHỐNG BỊA ĐẶT)
> **Mã chuyên đề:** `MOD-11-GROUNDING-RAG`  
> **Thuộc nhóm:** Bảo mật doanh nghiệp & Ràng buộc thực tế (Enterprise Defense)  
> **Mục tiêu:** Xóa bỏ hoàn toàn nỗi sợ "AI bịa đặt" (Hallucination) trong nghiệp vụ ngân hàng bằng kỹ thuật phân tách ngữ cảnh (Context Engineering) và neo chặt câu trả lời vào tài liệu nguồn (Grounding).

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
**Ảo giác (Hallucination)** là hiện tượng AI nói dối với một phong thái vô cùng tự tin. Nguyên nhân là vì mô hình được thiết kế để dự đoán từ tiếp theo có xác suất cao nhất, chứ không có khái niệm về "sự thật khách quan".  
**Grounding (Neo dữ liệu)** là kỹ thuật biến AI từ một "nhà thơ sáng tác" thành một **"thẩm phán tra cứu hồ sơ"**:
- Đưa trực tiếp văn bản quy chế, thông tư vào prompt.
- Ép AI: *"Chỉ được phép sử dụng duy nhất các sự thật có trong văn bản được cung cấp. Nếu thông tin không có trong văn bản, BẮT BUỘC phải nói 'Tài liệu không đề cập', tuyệt đối không được suy đoán."*

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Bài thi mở sách giáo khoa: Chỉ chép những gì có trong trang sách"*

Em hãy tưởng tượng hôm nay lớp mình có một bài kiểm tra môn Lịch sử đặc biệt: Cô giáo cho phép em **mở sách giáo khoa trang 45** ra để làm bài!  
Nhưng cô ra một luật rất nghiêm khắc:
- Câu nào có trong trang 45 thì em chép ra.
- Câu nào không có trong trang 45, em phải viết: *"Thưa cô, trang 45 không có câu này ạ"*.  
Nếu bạn nào tự ý bịa thêm chuyện siêu nhân hay khủng long bay vào bài thi, bạn đó sẽ bị 0 điểm ngay lập tức!  
👉 **Grounding** chính là việc bắt bạn Robot AI chỉ được mở đúng trang sách tài liệu mình đưa và không được phép bịa thêm một chữ nào.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Nhờ người đọc hộ giấy tờ công chứng sổ đỏ có dấu đỏ"*

Khi bác có việc liên quan đến đất đai nhà cửa, cầm tờ giấy công chứng quyền sử dụng đất có mộc đỏ của ủy ban nhân dân huyện, mắt kém nên bác nhờ người đọc hộ:  
*"Cháu đọc kỹ từng chữ trên giấy cho bác nghe, xem trong này ghi diện tích bao nhiêu, giáp ranh nhà ai. Cháu chỉ đọc đúng những chữ có mộc đỏ trên giấy này thôi nhé, ngoài đời người ta đồn thổi nhà bên cạnh lấn đất thế nào cháu không được nói vào đây, cứ đúng giấy tờ mà đọc!"*.  
👉 Đó chính là cách dặn dò máy tính chuẩn xác nhất: Đúng giấy tờ, đúng mộc đỏ, không thêm bớt lời thị phi bên ngoài.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Nguyên tắc Tra cứu Quy chế: Trích dẫn chính xác Điều, Khoản"*

Trong ngân hàng Agribank, một câu trả lời sai về lãi suất ưu đãi hoặc điều kiện thế chấp có thể dẫn đến kiện tụng hoặc tổn thất hàng tỷ đồng.  
**Kỹ thuật Grounding Prompt tiêu chuẩn:**

```text
BẠN LÀ: Chuyên viên Pháp chế Agribank.
NGỮ CẢNH TÀI LIỆU NGUỒN (SOURCE CONTEXT):
<tai_lieu_dinh_kem>
Quyết định số 123/QĐ-HĐTV-Agribank ngày 15/03/2026:
Điều 4. Hạn mức cấp tín dụng không có tài sản bảo đảm đối với hộ nông dân:
- Khoản 1: Mức cho vay tối đa không có TSBĐ đối với cá nhân, hộ gia đình sản xuất nông nghiệp là 200 triệu đồng.
- Khoản 2: Đối với hộ nuôi trồng thủy sản có hợp đồng liên kết bao tiêu sản phẩm với doanh nghiệp, mức cho vay tối đa là 500 triệu đồng.
- Khoản 3: Mọi khoản vay trên 500 triệu đồng bắt buộc phải có tài sản bảo đảm bằng bất động sản hoặc phương tiện vận tải.
</tai_lieu_dinh_kem>

CÂU HỎI HỌC VIÊN:
"Hộ gia đình nuôi cá tra có ký hợp đồng bao tiêu với công ty thủy sản Minh Phú muốn vay 600 triệu tín chấp (không TSBĐ) thì Agribank có cho vay không?"

QUY TẮC PHÊ DUYỆT (STRICT GROUNDING):
1. Chỉ sử dụng thông tin trong thẻ <tai_lieu_dinh_kem> ở trên.
2. Trả lời dứt khoát: Được hay Không được.
3. Trích dẫn rõ ràng: Căn cứ vào Điều mấy, Khoản mấy của Quyết định số 123.
4. NẾU khách hàng hỏi nội dung không có trong tài liệu (ví dụ: lãi suất cá tra là bao nhiêu %), BẮT BUỘC PHẢI TRẢ LỜI: "Tài liệu được cung cấp không đề cập đến thông tin này". CẤM tự ý tra cứu trí nhớ ngoài.
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Kiến trúc RAG (Retrieval-Augmented Generation) & Phân tách ranh giới dữ liệu*

Để AI không bịa thông tin khi trả lời các câu hỏi về tài liệu nội bộ, dân kỹ thuật áp dụng mô hình RAG với 3 nguyên tắc sau:
1. **Luồng dữ liệu (Data Pipeline):**
   `User gửi câu hỏi` $\to$ `Backend tìm kiếm các đoạn văn liên quan trong Database/Vector Store` $\to$ `Ghép đoạn văn đó vào biến context của Prompt` $\to$ `Gửi sang LLM`.
2. **Dùng thẻ XML phân tách ranh giới (Delimiters):**
   Luôn bọc tài liệu tìm kiếm được vào các thẻ như `<context>...</context>`. Điều này giúp bộ parser của AI hiểu rõ: *Đâu là mệnh lệnh của hệ thống, và đâu chỉ là dữ liệu văn bản cần tra cứu*.
3. **Mã lỗi từ chối rõ ràng (Error Code Signal):**
   Ràng buộc AI: *"Nếu tài liệu không có câu trả lời, hãy trả về đúng từ khóa: NOT_FOUND"*. Nhờ đó, code frontend có thể dễ dàng bắt điều kiện `if (res === "NOT_FOUND")` để hiển thị nút gợi ý liên hệ tổng đài viên thật.

```typescript
// Mẫu RAG Grounding Prompt Builder
export function buildGroundedPrompt(userQuery: string, sourceDocuments: string[]): string {
  const contextBlock = sourceDocuments
    .map((doc, idx) => `<document id="${idx + 1}">\n${doc}\n</document>`)
    .join('\n\n');

  return `
You are a strictly grounded factual verification agent.
Context:
${contextBlock}

Task: Answer the user question based SOLELY on the documents provided above.
Rules:
1. Every claim must have an inline citation referring to the document id, e.g. [1].
2. If the answer cannot be found in the context, respond strictly with: "INSUFFICIENT_INFORMATION".
3. Do not extrapolate or introduce external pre-trained assumptions.

Question: ${userQuery}
Answer:`;
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Chơi trò "Thám tử đọc mẩu giấy bí mật". AI chỉ được trả lời dựa trên mẩu giấy, nếu mẩu giấy không viết thì phải nói "Em không biết", không được bịa ra.
- **Prompt mẫu để thử:**
  ```text
  Đây là mẩu giấy của mẹ:
  'Chiều nay mẹ đi chợ mua cà rốt, táo và sữa tươi. Hộp bánh quy cất ở ngăn tủ trên cùng. Tối nay cả nhà sẽ ăn lẩu gà.'

  Câu hỏi: Mẹ cất kem dâu tây ở đâu?
  Quy tắc: Chỉ tìm trong mẩu giấy. Nếu mẩu giấy không nói đến, hãy trả lời đúng 4 từ: 'Mẩu giấy không nói.'
  ```
- **Kết quả mong đợi:** AI trả lời đúng: *"Mẩu giấy không nói."* (chứng minh AI không tự bịa ra vị trí cây kem).

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác có tờ hướng dẫn sử dụng máy đo huyết áp điện tử Omron, muốn AI hướng dẫn đúng theo sách, không đoán mò bậy bạ.
- **Prompt mẫu để thử:**
  ```text
  Tài liệu gốc kèm theo:
  'Quy trình đo huyết áp đúng:
  1. Nghỉ ngơi yên tĩnh ít nhất 5 phút trước khi đo.
  2. Quấn vòng bít cách nếp gấp khuỷu tay 1 - 2 cm, ngang tầm với tim.
  3. Trong khi đo ngồi thẳng lưng, chân đặt phẳng trên sàn, tuyệt đối không nói chuyện.'

  Hỏi: Khi đo huyết áp tôi có được vừa đo vừa nói chuyện điện thoại không? Dựa vào điều mấy trong tài liệu để trả lời?
  ```
- **Kết quả mong đợi:** AI trả lời rõ ràng: *"Dạ không được nói chuyện, theo đúng Điều số 3 trong tài liệu gốc vì sẽ làm sai lệch chỉ số huyết áp."*

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Thẩm định chính sách cho vay dựa trên Văn bản quy định nội bộ số 108/QĐ-TGĐ. Ngăn chặn triệt để hiện tượng AI bịa đặt chính sách (Hallucination).
- **Prompt mẫu để thử:**
  ```text
  [VĂN BẢN QUY ĐỊNH NỘI BỘ 108/QĐ-TGĐ]
  "Điều 12: Thời hạn cho vay mua ô tô phục vụ kinh doanh tối đa là 60 tháng. Tỷ lệ cho vay tối đa là 70% giá trị định giá xe. Khách hàng bắt buộc phải mua bảo hiểm thân vỏ xe trong suốt thời gian vay vốn."

  Yêu cầu thẩm định:
  Một khách hàng đề xuất vay 80% giá trị xe Hyundai Tucson trong 72 tháng để chạy dịch vụ Grab.
  Dựa DUY NHẤT vào Điều 12 ở trên, hãy chỉ ra 2 điểm vi phạm của đề xuất vay này. Trích dẫn rõ ràng số liệu quy định.
  ```
- **Tiêu chuẩn nghiệm thu:** AI chỉ rõ 2 điểm vi phạm: (1) Thời hạn đề xuất 72 tháng vượt mức tối đa 60 tháng; (2) Tỷ lệ vay 80% vượt mức tối đa 70%.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế cấu trúc Context Boundary (Grounding Delimiters) và cơ chế dẫn nguồn (Source Citation Chunking) để ngăn Prompt Injection từ văn bản người dùng đưa vào và xử lý dứt điểm trường hợp thiếu thông tin (Out-of-domain query).
- **Yêu cầu thực hành (Prompt Architecture trên Playground):**
  ```text
  System Prompt:
  You are an Enterprise Grounded Question-Answering Engine.
  Instructions:
  1. Rely ONLY on the facts provided within <context></context> XML tags.
  2. For every assertion in your answer, you MUST append a citation in format: [Doc_<ID>_Chunk_<Index>].
  3. If the context does not contain enough evidence to answer the question, output EXACTLY:
     "ERROR_CODE_404: INSUFFICIENT_CONTEXT_EVIDENCE". Do not attempt to synthesize from pre-trained knowledge.

  Context:
  <context>
  [Doc_KB01_Chunk_0] Hệ thống OpenBanking API hỗ trợ chuẩn OAuth2.0 với cơ chế PKCE cho mobile apps.
  [Doc_KB01_Chunk_1] Giới hạn Rate Limit đối với API truy vấn số dư là 100 requests/phút/IP.
  </context>

  Test Case A: "Rate limit của API số dư là bao nhiêu?"
  Test Case B: "Cơ chế mã hóa Database của hệ thống dùng AES-256 hay RSA?"
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - Test Case A: Trả về 100 requests/phút/IP kèm citation `[Doc_KB01_Chunk_1]`.
  - Test Case B: Trả về chính xác mã `ERROR_CODE_404: INSUFFICIENT_CONTEXT_EVIDENCE`, không tự suy đoán AES-256.

## ⚠️ Quy Tắc Vàng
- Luôn đặt tài liệu nguồn vào trong các thẻ phân tách rõ ràng như `<context>...</context>`.
- Câu lệnh ràng buộc *"Nếu không có trong tài liệu, hãy nói không biết"* phải được nhắc lại ở cuối prompt ngay trước câu hỏi để tận dụng Recency Attention của LLM.
