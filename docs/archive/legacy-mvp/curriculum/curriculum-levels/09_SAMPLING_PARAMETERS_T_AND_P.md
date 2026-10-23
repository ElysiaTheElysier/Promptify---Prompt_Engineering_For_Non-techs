# BÀI 09: SAMPLING PARAMETERS (ĐIỀU CHỈNH THAM SỐ T, TOP-P, TOP-K)
> **Mã chuyên đề:** `MOD-09-SAMPLING-PARAMS`  
> **Thuộc nhóm:** Điều khiển tham số & Định dạng dữ liệu (Generation Control)  
> **Mục tiêu:** Hiểu cặn kẽ ý nghĩa vật lý và toán học của các tham số lấy mẫu (Sampling Parameters): Temperature ($T$), Top-P (Nucleus), Top-K, Frequency Penalty và Stop Sequences để làm chủ độ sáng tạo và độ chính xác của câu trả lời.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Khi sinh một từ (token) tiếp theo, mô hình AI không chọn bừa bãi. Mô hình tính toán một danh sách xác suất cho hàng chục ngàn từ khả dĩ trong từ điển.  
Các **tham số lấy mẫu (Sampling Parameters)** chính là **"bộ lọc và núm vặn"** quyết định cách AI nhặt từ ra khỏi danh sách xác suất đó:
- **Temperature ($T$):** Núm vặn độ "nóng/lạnh" của sự lựa chọn.
- **Top-P (Nucleus Sampling):** Giới hạn tổng xác suất tích lũy của nhóm từ được phép chọn.
- **Top-K:** Giới hạn số lượng $K$ từ có xác suất cao nhất.
- **Stop Sequences:** Tín hiệu ngắt câu lập tức khi gặp chuỗi ký tự quy định.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Hộp bút màu ma thuật có núm vặn"*

Em có một hộp bút màu thần kỳ có một cái núm xoay từ số 0 đến số 10:
- **Khi vặn về số 0 (Lạnh ngắt):** Bút vẽ cực kỳ ngoan. Nếu vẽ quả táo, bút chỉ chọn đúng màu đỏ. Nếu vẽ lá cây, bút chỉ chọn đúng màu xanh lá cây như thật. Không bao giờ sai một ly!
- **Khi vặn lên số 8 hoặc 10 (Sôi nổi):** Bút vẽ bắt đầu nghịch ngợm và bay bổng! Quả táo có thể được tô thành màu tím ánh kim, lá cây có thể biến thành màu ngũ sắc cầu vồng lấp lánh như trong truyện cổ tích!  
👉 **Temperature** chính là cái núm vặn xem em muốn bạn Robot nghiêm túc làm toán (số 0) hay muốn bạn ấy kể chuyện cổ tích vui nhộn (số 8).

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Cách nêm gia vị cho nồi canh gia đình"*

Trong việc nấu nướng gia đình, tùy vào bữa ăn mà người nội trợ sẽ có cách nêm nếm khác nhau:
- **Bữa cơm thanh đạm hàng ngày (T = 0):** Nấu canh rau ngót thì chỉ cần chút muối hột và nước luộc thịt ngọt thanh. Chuẩn mực, an toàn, trăm bữa như một, không bao giờ sợ bị lạ miệng hay đau bụng.
- **Bữa tiệc liên hoan đổi món (T = 0.8):** Nấu món lẩu Thái hay canh chua thì phải nêm thêm ớt cay, sả thơm, me chua, dứa ngọt để hương vị bùng nổ, tạo cảm giác mới lạ, hào hứng cho khách khứa.  
👉 Khi làm việc với máy tính, nếu bác cần tính tiền nong sổ sách thì bác chọn cách "nêm muối nhạt" (T=0). Khi muốn máy gợi ý câu chúc Tết độc đáo thì bác "nêm đậm vị" (T cao).

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Bảng quy tắc vặn núm tham số theo từng phòng ban ngân hàng"*

Người dùng văn phòng thường gặp 2 lỗi đối nghịch:
1. *Tại sao tôi nhờ AI trích xuất số liệu từ báo cáo tài chính mà mỗi lần chạy nó lại ra một con số khác nhau?* ➔ **Lỗi: Để Temperature quá cao ($T=0.7$) khiến AI sáng tác lung tung.**
2. *Tại sao tôi nhờ AI nghĩ slogan PR chiến dịch mới mà nó cứ lặp đi lặp lại những câu cũ rích nhàm chán?* ➔ **Lỗi: Để Temperature quá thấp ($T=0$) khiến AI không dám phá cách.**

#### Bảng tra cứu thông số khuyến nghị thực chiến:
| Nghiệp vụ áp dụng | Temperature ($T$) | Top-P | Ghi chú & Mục đích |
| :--- | :---: | :---: | :--- |
| **Kế toán, Tính lãi, Tín dụng, So sánh văn bản pháp luật** | `0.0` đến `0.1` | `0.1` | Tuyệt đối chính xác, không bịa đặt, định danh số liệu 100%. |
| **Soạn email từ chối khiếu nại, Thư ngỏ đối tác** | `0.3` đến `0.5` | `0.8` | Giữ văn phong lịch sự, mềm mại nhưng vẫn đúng quy chế. |
| **Viết bài PR Fanpage, Đặt tiêu đề bài viết, Slogan truyền thông** | `0.7` đến `0.9` | `0.95` | Tối đa hóa tính sáng tạo, đa dạng từ ngữ, tạo bất ngờ. |

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Kiểm soát tính ngẫu nhiên (Randomness) và Giới hạn bộ lọc khi gọi API*

Khi gọi API của OpenAI hoặc Gemini, bạn không cần quan tâm đến công thức toán vi phân phức tạp, chỉ cần nắm rõ cơ chế hoạt động của 4 tham số sau:

1. **Temperature ($T$) — Độ ngẫu nhiên:**
   - **$T = 0$ (Chế độ tất định - Deterministic / Greedy):** Với cùng 1 prompt đầu vào, AI luôn luôn chọn từ có điểm số cao nhất $\to$ Chạy 100 lần trả về cùng 1 kết quả y hệt nhau. Bắt buộc dùng khi làm việc với JSON, SQL query, phân tích báo cáo và code.
   - **$T \in [0.7, 0.9]$ (Chế độ sáng tạo):** Mở rộng xác suất cho các từ xếp hạng 2, 3 $\to$ Giúp câu văn linh hoạt, không bị rập khuôn. Dùng cho viết bài PR, sinh ý tưởng marketing.

2. **Top-P (Nucleus Sampling) — Lọc nhóm từ an toàn:**
   - Thay vì nhặt từ trong toàn bộ từ điển (dễ nhặt phải từ ngớ ngẩn gây bug ảo giác), Top-P (ví dụ `0.9`) yêu cầu: *"Chỉ được chọn trong nhóm các từ hàng đầu chiếm 90% độ tin cậy, cắt bỏ 10% các từ hiếm gặp ở đuôi"*. Giúp văn phong sáng tạo mà không bị nói nhảm.

3. **Max Tokens & Stop Sequences:**
   - `maxOutputTokens`: Đặt trần số lượng token trả về để kiểm soát chi phí (Cost) và tránh việc AI sinh văn bản tràn lan làm chậm frontend.
   - `stopSequences`: Mảng các ký tự ngắt (ví dụ `['\n\n', '###', 'User:']`), hễ AI vừa gõ đến chuỗi này là request lập tức đóng lại.

```typescript
// Cấu hình Gemini SDK tối ưu theo nghiệp vụ
export const DeterministicConfig = {
  temperature: 0.0,
  topP: 0.1,
  maxOutputTokens: 2048,
  stopSequences: ['### END', '---']
};

export const CreativeMarketingConfig = {
  temperature: 0.85,
  topP: 0.95,
  presencePenalty: 0.6, // Phạt việc lặp lại chủ đề cũ
  frequencyPenalty: 0.4  // Phạt việc lặp lại các từ ngữ vừa dùng
};
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Thử vặn "núm thật thà" và "núm mơ mộng" của bạn Robot khi kể chuyện chú mèo đi dã ngoại.
- **Prompt mẫu để thử (Thử ở 2 chế độ núm vặn trên ứng dụng hoặc quy định trong prompt):**
  ```text
  [Lần 1 - Chế độ Thật thà (Nhiệt độ = 0)]:
  Kể 1 đoạn văn 3 câu về chú mèo Miu đi dã ngoại trong công viên. Chỉ kể những điều có thật, diễn ra bình thường mỗi ngày.
  ```
  ```text
  [Lần 2 - Chế độ Mơ mộng (Nhiệt độ cao = 0.9)]:
  Kể 1 đoạn văn 3 câu về chú mèo Miu đi dã ngoại. Hãy tưởng tượng ra những điều kỳ diệu nhất: bầu trời kẹo bông, mây bay bằng bong bóng xà phòng!
  ```
- **Kết quả mong đợi:** 
  - Lần 1: Chú mèo ăn hạt, nằm sưởi nắng và đuổi bướm.
  - Lần 2: Chú mèo cưỡi mây kẹo ngọt và bay vào thế giới cổ tích đầy màu sắc lung linh.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác muốn máy tính giúp làm 2 việc khác hẳn nhau: một bên cần chính xác cẩn thận (hướng dẫn bảo quản thuốc tiểu đường), một bên cần cảm xúc dạt dào (bài thơ mừng thọ bạn già).
- **Prompt mẫu để thử:**
  ```text
  [Việc 1 - Cần chính xác tuyệt đối]:
  Nêu đúng 3 nguyên tắc bảo quản insulin tại nhà theo khuyến cáo y tế. Trả lời thật chuẩn xác, từng câu ngắn gọn, không suy đoán.
  ```
  ```text
  [Việc 2 - Cần bay bổng, ấm áp]:
  Viết một bài thơ 4 câu mừng thượng thọ 80 tuổi của một người bạn tri kỷ thời quân ngũ. Dùng lời thơ đầm ấm tình đồng đội, nhiều kỷ niệm sâu lắng.
  ```
- **Kết quả mong đợi:** Việc 1 chuẩn y khoa (nhiệt độ tủ lạnh 2-8 độ C, tránh ánh sáng, không để ngăn đá); Việc 2 lời thơ dạt dào nghĩa tình đồng chí, vần điệu trầm ấm.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Phân biệt rõ rệt hai bài toán tác nghiệp: Trích xuất số dư công nợ (cần Nhiệt độ = 0.0) và Đặt slogan cho chiến dịch thẻ tín dụng hè (cần Nhiệt độ = 0.85).
- **Prompt mẫu để thử:**
  ```text
  [Bài toán 1 - Báo cáo nợ / Zero Randomness]:
  Từ đoạn văn: 'Công ty Nam An nợ gốc 12.5 tỷ, nợ lãi 850 triệu, quá hạn 45 ngày.'
  Hãy trích xuất:
  - Doanh nghiệp:
  - Nợ gốc:
  - Nợ lãi:
  - Số ngày quá hạn:
  Tuyệt đối không làm tròn, không thêm bớt 1 con số.
  ```
  ```text
  [Bài toán 2 - Ý tưởng Marketing / High Creativity]:
  Hãy sáng tạo 5 câu Slogan ngắn (dưới 10 chữ) cho chiến dịch thẻ tín dụng 'Vi vu Hè 2026'. Yêu cầu: Trẻ trung, bắt trend, khơi gợi cảm hứng du lịch trải nghiệm.
  ```
- **Tiêu chuẩn nghiệm thu:** Bài toán 1 khớp 100% dữ liệu gốc không sai 1 chữ số; Bài toán 2 có 5 góc tiếp cận đa dạng, độc đáo, không bị lặp lại ý tứ.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Tinh chỉnh tham số `Temperature` (0.0 vs 0.9) và `Top-P` (0.1 vs 0.95) trên Prompt Playground / System Prompt để kiểm soát tính xác định (determinism) khi chuẩn hóa mã lỗi hệ thống (Error Code Mapping).
- **Yêu cầu thực hành (Thực hiện trực tiếp trên Playground hoặc qua System Prompt):**
  ```text
  System Prompt:
  Bạn là một API Error Code Standardizer. Nhiệm vụ: Nhận log lỗi tự do từ ứng dụng và ánh xạ về chuẩn HTTP Status Code & Error Key nội bộ.
  Input: "Database connection timeout after 30000ms while executing query"

  Cấu hình thử nghiệm trên Playground:
  - Session 1: Đặt Temperature = 0.0, Top-P = 0.1 (Chế độ Greedy / Deterministic)
  - Session 2: Đặt Temperature = 1.0, Top-P = 0.95 (Chế độ High Entropy)
  
  Mỗi session bấm Run (Gửi lại) 3 lần liên tiếp.
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - Session 1 cho ra kết quả đồng nhất 100% qua cả 3 lần chạy (`504 Gateway Timeout` hoặc `500 Internal Server Error`, key: `DB_TIMEOUT`). Không có hiện tượng trôi lệch format.
  - Session 2 ghi nhận sự biến thiên từ ngữ và cấu trúc giải thích giữa các lần chạy, chứng minh rủi ro trôi dạt dữ liệu (Format Drift) khi dùng temperature cao cho bài toán tích hợp hệ thống.

## ⚠️ Quy Tắc Vàng
- Khi làm việc với **JSON, Code, Bảng số liệu hoặc Pháp lý**: Luôn luôn đặt $T = 0$.
- Không tăng đồng thời cả $T$ và Top-P lên mức kịch trần (ví dụ $T=1.5$, $\text{Top-P}=1.0$) vì sẽ làm mô hình nói nhảm hoặc lặp từ không kiểm soát.
