# ĐẶC TẢ BÀI LAB 02: KỸ NGHỆ BỐI CẢNH & VĂN PHONG TAM NÔNG (CONTEXT ENGINEERING & FEW-SHOT)
> **Mã bài lab:** `LAB-02-CONTEXT-ENGINEERING`  
> **Cấp độ:** Đi từ số 0 (Từ Prompt Tự phát sang Thiết kế Bối cảnh Chuyên nghiệp)  
> **Thời lượng khuyến nghị:** 45 - 60 Phút  
> **Mục tiêu kỹ thuật:** Hiểu cơ chế Cửa sổ Ngữ cảnh (Context Window), In-Context Learning, phân tách Bối cảnh Tĩnh (Static) vs Bối cảnh Động (Dynamic), và kỹ thuật Few-Shot Prompting để cố định văn phong thương hiệu.

---

## PHẦN 1: KIẾN THỨC NỀN TẢNG (DÀNH CHO DÂN VĂN PHÒNG ĐI TỪ SỐ 0)

### 1.1 Bản chất Kỹ thuật Đằng sau LLM (Under The Hood)
- **Cửa sổ Ngữ cảnh (Context Window):** 
  - LLM không có trí nhớ dài hạn như con người giữa các phiên làm việc độc lập. Toàn bộ những gì mô hình "biết" trong một phiên làm việc chỉ gói gọn trong **Cửa sổ Ngữ cảnh** (Context Window) được nạp vào tại thời điểm đó.
  - Khi bạn chat qua lại quá nhiều lượt (Multi-turn Chat) để sửa lỗi, bối cảnh ban đầu sẽ bị trôi dạt (Context Drift), khiến AI dần quên mất quy định ban đầu và bắt đầu sinh văn bản ngẫu nhiên hoặc lặp từ.
- **In-Context Learning (Học trong Bối cảnh):**
  - Khác với việc phải "dạy lại mô hình" (Fine-tuning - việc của kỹ sư IT), dân văn phòng hoàn toàn có thể điều khiển AI thông qua **In-Context Learning**: Cung cấp nguyên liệu và luật chơi trực tiếp ngay trong lời nhắc.
  - **Sức mạnh của Ví dụ Mẫu (Few-Shot Prompting):** Với LLM, việc bạn đưa ra 1-2 ví dụ mẫu thực tế (Inputs → Outputs) có hiệu quả định hình văn phong gấp 10 lần việc bạn viết hàng trang tài liệu mô tả dài dòng. AI sẽ tự động học được: độ dài câu, nhịp ngắt dòng, mật độ emoji, và phong cách xưng hô từ ví dụ mẫu.
- **Phân tách Tĩnh (Static) và Động (Dynamic):**
  - **Static Context (Bối cảnh Tĩnh):** Những quy chuẩn không bao giờ đổi theo ngày (Sứ mệnh Agribank, giọng văn Tam nông mộc mạc, đối tượng độc giả, danh sách từ cấm kỵ).
  - **Dynamic Context (Bối cảnh Động):** Dữ liệu thay đổi theo từng sự kiện/bài viết (Số liệu báo cáo tháng này, thông tin hội nghị hôm nay, gói tín dụng mới).

### 1.2 Ẩn dụ Văn phòng (Mental Model)
> *"Hãy coi AI như một **trợ lý mới vào việc**: Nếu mỗi sáng bạn đều phải nhắc lại 'Này em, ngân hàng mình là Agribank nhé, văn phong phải mộc mạc nhé, đừng dùng từ bán hàng online nhé', cả bạn và trợ lý đều mệt mỏi.*  
> *Giải pháp là hãy đóng một **Tập Bìa Hồ Sơ Thương Hiệu (Brand Dossier)** để cố định trên bàn làm việc của trợ lý. Khi có việc mới, bạn chỉ cần ném số liệu báo cáo thô vào kẹp tài liệu, trợ lý sẽ tự động mở hồ sơ ra và xuất bản bài viết chuẩn 100%."*

### 1.3 Cấu trúc Kỹ thuật: "Bộ Hồ Sơ Bối Cảnh 4 Tầng"
Một cấu trúc Context Engineering chuyên nghiệp gồm 4 khối phân định rõ ràng bằng ranh giới ký tự (Delimiters):
1. **Tầng 1 - Định vị & Tôn chỉ (Persona & Brand Voice):** Khẳng định vai trò chuyên môn và phong cách ngôn từ cốt lõi.
2. **Tầng 2 - Hàng rào Bảo vệ & Từ cấm (Guardrails & Forbidden Words):** Những điều AI TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP làm.
3. **Tầng 3 - Nguyên liệu Báo cáo Động (Dynamic Raw Data):** Dữ liệu thô mới nhận được, chưa qua chế biến.
4. **Tầng 4 - Mẫu mực Tham chiếu (Few-shot Exemplars):** 1-2 bài viết xuất sắc đã được duyệt đăng trước đây.

---

## PHẦN 2: BÀI TOÁN & CÂU HỎI THỰC HÀNH (CHALLENGE SPEC)

### 2.1 Tình huống Nghiệp vụ (Scenario)
Agribank vừa chính thức phát động chiến dịch an sinh xã hội trọng điểm năm 2026 mang tên **"Mái ấm Tam nông - Vững bước tương lai"**. Ban Lãnh đạo giao cho phòng Truyền thông xuất bản ngay một bài đăng Fanpage chính thức để thông tin đến cộng đồng và khách hàng.

```text
=== DỮ LIỆU BÁO CÁO THÔ TỪ BAN ĐIỀU HÀNH (DYNAMIC RAW DATA) ===
- Tên chương trình: "Mái ấm Tam nông - Vững bước tương lai" (Triển khai từ 10/2026 - 01/2027 đón Tết Nguyên Đán).
- Nguồn kinh phí an sinh: 100 tỷ đồng (Trích từ quỹ an sinh xã hội Agribank và đóng góp 01 ngày lương của hơn 40.000 cán bộ, nhân viên toàn hệ thống).
- Mục tiêu cụ thể: Xây dựng và bàn giao 2.000 căn nhà Đại đoàn kết (mức hỗ trợ 50 triệu đồng/căn) cho các hộ nghèo, hộ có hoàn cảnh đặc biệt khó khăn về nhà ở tại vùng sâu, vùng xa, biên giới, hải đảo.
- Gói tín dụng bổ trợ: Dành riêng gói tín dụng quy mô 10.000 tỷ đồng với lãi suất siêu ưu đãi 0.5%/năm hỗ trợ người dân khu vực bão lũ vay vốn sửa chữa cơ ngơi và tái thiết sản xuất nông - lâm - thủy sản.
```

### 2.2 Nhiệm vụ Học viên (Task)
Hãy áp dụng phương pháp **Context Engineering 4 Tầng**, thiết kế một câu lệnh mẫu mực:
1. **Tầng 1 (Static Dossier):** Thiết lập vai trò Chuyên gia Truyền thông cấp cao của Agribank; văn phong mộc mạc, chân phương, ấm áp, đậm đà tình nghĩa Tam nông.
2. **Tầng 2 (Guardrails):** Cấm tiệt các từ ngữ quảng cáo giật gân, thương mại hóa: *"siêu rẻ"*, *"bùng nổ"*, *"hot deal"*, *"sale sập sàn"*, *"thần tốc"*. Quy định sử dụng emoji nhã nhặn: `🌾`, `🏦`, `💚`, `🏡`.
3. **Tầng 3 (Dynamic Data):** Nhúng toàn bộ số liệu báo cáo thô ở trên vào.
4. **Tầng 4 (Few-shot):** Đưa vào 1 đoạn mẫu bài viết năm trước để AI bắt nhịp ngắt câu giàu cảm xúc.
5. **Đầu ra:** Xuất bản 01 bài đăng Fanpage hoàn chỉnh: Tiêu đề gợi mở cảm xúc, 3 đoạn thân bài súc tích dễ đọc trên điện thoại, số liệu chính xác 100%, lời kết ấm áp và hashtag nhận diện.

### 2.3 Cấu trúc Khung Prompt Đề xuất (Prompt Architecture)
```text
=== TẦNG 1: BỘ BÌA THƯƠNG HIỆU TĨNH (STATIC BRAND DOSSIER) ===
BẠN LÀ AI: Chuyên gia Truyền thông & Thương hiệu Agribank với 15 năm gắn bó cùng người nông dân.
SỨ MỆNH: "Agribank - Mang phồn thịnh đến khách hàng", thủy chung cùng sự nghiệp Tam nông.
GIỌNG VĂN (BRAND TONE): Chân phương, mộc mạc, ấm áp, sẻ chia; tôn vinh tinh thần tương thân tương ái.
QUY TẮC EMOJI: Sử dụng vừa phải, tinh tế mang bản sắc nông nghiệp & ngân hàng (🌾, 🏦, 💚, 🏡).

=== TẦNG 2: BỘ TỪ CẤM & HÀNG RÀO BẢO VỆ (GUARDRAILS) ===
- TUYỆT ĐỐI KHÔNG dùng từ ngữ đao to búa lớn, quảng cáo giật gân: "siêu rẻ", "bùng nổ", "cơn sốt", "vô địch", "thần tốc".
- KHÔNG biến hoạt động từ thiện thành chiêu trò đánh bóng tên tuổi; trọng tâm là niềm vui an cư của bà con.

=== TẦNG 3: NGUYÊN LIỆU BÁO CÁO ĐỘNG (DYNAMIC DATA) ===
[Dán dữ liệu báo cáo 100 tỷ đồng, 2.000 căn nhà, 0.5% vào đây]

=== TẦNG 4: BÀI MẪU NĂM TRƯỚC (FEW-SHOT EXAMPLE) ===
"🌾 CÓ MỘT MÁI NHÀ ẤM, ĐỂ MÙA ĐÔNG NAY BỚT LẠNH HƠN...
Những ngày cuối năm, khi cái rét vùng cao tràn về từng vách nứa, ước mơ về một mái nhà vững chãi không còn dột nước sau mỗi cơn mưa của gia đình bác Mùa A Súa đã thành hiện thực..."

=== YÊU CẦU ĐẦU RA ===
Hãy xuất bản 01 bài đăng Fanpage hoàn chỉnh:
- Tiêu đề mộc mạc, chạm đến trái tim người đọc
- Bố cục 3 đoạn ngắn (Mobile-friendly)
- Khớp chính xác 100% các con số thực tế
- Lời kêu gọi chung tay và bộ hashtag chuẩn (#Agribank #TamNong #MaiAmTamNong)
```

---

## PHẦN 3: BỘ TEST CASES & TIÊU CHÍ ĐÁNH GIÁ (VERIFICATION & TEST CASES)

### Test Case 1: Kiểm Tra Độ Bám Sát Dữ Liệu 100% (Data Grounding Test)
- **Mục tiêu:** AI không được "bịa thêm số" hoặc làm tròn cẩu thả các số liệu nghiệp vụ.
- **Tiêu chí kiểm thử:** Quét chuỗi văn bản đầu ra xem có chứa chính xác các số liệu sau:
  - Số tiền an sinh: `"100 tỷ"` hoặc `"100 tỷ đồng"`
  - Số lượng nhà: `"2.000 căn"` hoặc `"2.000 mái ấm"`
  - Định mức hỗ trợ: `"50 triệu"` hoặc `"50 triệu đồng/căn"`
  - Quy mô gói tín dụng: `"10.000 tỷ"` hoặc `"10.000 tỷ đồng"`
  - Mức lãi suất: `"0.5%/năm"` hoặc `"0.5%"`
  - Số lượng cán bộ chung tay: `"40.000 cán bộ"` hoặc `"40.000 cán bộ, nhân viên"`
- **Đánh giá:** Sai lệch hoặc thiếu sót bất kỳ con số nào → **Trừ 10đ/lỗi**.

### Test Case 2: Kiểm Tra Bộ Lọc Từ Cấm (Negative Constraint / Blacklist Test)
- **Mục tiêu:** Đảm bảo tính trang trọng, loại bỏ triệt để giọng văn bán hàng online.
- **Danh sách từ cấm quét tự động:**
  - `["siêu rẻ", "bùng nổ", "cơn sốt", "hot deal", "vô địch", "thần tốc", "giá sốc", "quá đã", "rẻ nhất"]`
- **Kỳ vọng:** KHÔNG ĐƯỢC CHỨA bất kỳ từ nào trong danh sách trên.
- **Đánh giá:** Bắt gặp 1 từ trong blacklist → **Trừ 25đ**.

### Test Case 3: Kiểm Tra Phong Cách Định Dạng Di Động (Mobile Layout Test)
- **Mục tiêu:** Bài đăng Fanpage phải đọc tốt trên smartphone của người dân và cán bộ.
- **Tiêu chí kiểm thử:**
  - Tiêu đề có icon mở đầu và viết hoa gây ấn tượng mộc mạc.
  - Mỗi đoạn văn không dài quá 4 dòng (không bị hiệu ứng "bức tường chữ").
  - Có đầy đủ cụm hashtag cuối bài: `#Agribank`, `#TamNong`, `#MaiAmTamNong`.

### Bảng Rubric Đánh Giá (100 Điểm):
| Tiêu chí | Trọng số | Điều kiện đạt |
| :--- | :---: | :--- |
| **Cấu trúc Bối cảnh 4 Tầng** | 30đ | Prompt phân tách mạch lạc giữa Bìa tĩnh, Từ cấm, Số liệu động, Bài mẫu. |
| **Data Grounding 100%** | 30đ | Số liệu 100 tỷ, 2.000 căn, 50 triệu, 0.5%, 40.000 cán bộ chính xác từng số. |
| **Không Dính Từ Cấm** | 20đ | Sạch bóng các từ ngữ giật gân, thương mại hóa. |
| **Định dạng Fanpage Chuẩn** | 20đ | Đoạn văn ngắn gọn, emoji tinh tế, hashtag thương hiệu nhận diện tốt. |

---

## PHẦN 4: HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)
*Khi bạn đưa file đặc tả này cho một AI để sinh nội dung Lab chi tiết trên nền tảng, hãy dùng câu lệnh sau:*

```text
Dựa trên tài liệu đặc tả [LAB-02-CONTEXT-ENGINEERING], hãy tạo dữ liệu bài lab chuẩn cấu trúc JSON/TypeScript LabStep gồm:
1. scenario mô tả tình huống chiến dịch an sinh xã hội 100 tỷ của Agribank.
2. baselinePrompt thể hiện một câu lệnh tự phát sơ sài của nhân viên mới ("Viết bài FB thật hay và bùng nổ về gói 100 tỷ").
3. improvedPrompt thể hiện kiến trúc 4 tầng hoàn hảo (Static Dossier, Guardrails, Dynamic Data, Few-shot).
4. simulatedBaselineOutput mô phỏng một bài viết giật gân kiểu bán hàng online (dùng icon lửa, bùng nổ, deal khủng, siêu rẻ) làm mất uy tín ngân hàng.
5. simulatedImprovedOutput là một bài Fanpage mộc mạc, xúc động, giàu chất thơ Tam nông, số liệu chính xác 100%.
```
