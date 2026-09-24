# BÀI 12: STEP-BACK & META-PROMPTING (LÙI MỘT BƯỚC & DÙNG AI TỰ VIẾT LỆNH)
> **Mã chuyên đề:** `MOD-12-STEPBACK-META`  
> **Thuộc nhóm:** Chuỗi suy nghĩ & Lập luận nâng cao (Advanced Reasoning)  
> **Mục tiêu:** Nắm vững nghệ thuật "Lùi một bước để nhìn toàn cảnh" (Step-Back Prompting) và kỹ thuật Meta-Prompting — sử dụng chính trí tuệ của LLM để tự động thiết kế, tối ưu và tinh chỉnh câu lệnh cho bạn.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
1. **Step-Back Prompting** (Zheng et al., Google DeepMind, 2023): Thay vì lao đầu trực tiếp vào việc giải một câu hỏi chi tiết phức tạp, ta yêu cầu AI **"lùi lại một bước"** để phát biểu nguyên lý nền tảng hoặc khái niệm trừu tượng cấp cao của bài toán trước, sau đó mới dùng nguyên lý đó để giải bài toán cụ thể.
2. **Meta-Prompting (APE - Automatic Prompt Engineering):** Người dùng không cần phải là chuyên gia nhớ từng từ ngữ kỹ thuật. Bạn chỉ cần đóng vai người ra đề, giao cho AI vai trò **"Chuyên gia Kỹ nghệ Prompt cấp cao"** để AI tự sinh ra bộ câu lệnh chuẩn 5 thành tố tối ưu nhất.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Lùi lại một bước để nhìn bức tranh xếp hình khổng lồ"*

Khi em chơi trò ghép tranh 500 mảnh: Em đang cầm một mảnh ghép nhỏ xíu màu xanh dương và loay hoay không biết nhét vào đâu, em nhìn sát vào bàn thì chỉ thấy hoa cả mắt.  
Mẹ bảo em: *"Con đứng dậy, lùi ra xa 2 bước rồi nhìn vào vỏ hộp tranh mẫu xem nào!"*.  
Khi em lùi lại nhìn xa, em nhận ra ngay: *"A, góc trên bên phải là bầu trời, mảnh màu xanh này chắc chắn thuộc về đám mây trời rồi!"*.  
👉 **Step-Back** chính là việc lùi lại một bước để nhìn bức tranh lớn trước khi cắm cúi ghép từng mảnh nhỏ.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Lùi một bước trời cao biển rộng: Nhắc lại đạo nghĩa trước khi hòa giải"*

Khi trong gia đình có hai người con cãi nhau kịch liệt về việc chia tiền phụng dưỡng hay phân chia tài sản, người mẹ già có kinh nghiệm sống không bao giờ nhảy ngay vào tranh cãi ai đúng ai sai từng đồng bạc cắc.  
Người mẹ sẽ ôn tồn bảo: *"Hai đứa ngồi xuống uống chén trà đã. Trước khi nói chuyện tiền bạc, các con hãy nhớ lại ngày xưa bố mẹ vất vả nhịn ăn nuôi hai anh em ăn học thế nào, tình anh em máu mủ ruột rà quý giá ra sao..."*.  
Nhắc lại cái đạo lý lớn lao của gia đình trước, tự khắc câu chuyện tiền nong nhỏ nhặt phía sau sẽ được giải quyết vô cùng êm thấm.  
👉 Đó chính là đạo lý thâm thúy của **Step-Back Prompting** trong đời sống.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Dùng AI làm chuyên gia tư vấn viết prompt cho chính mình"*

Thay vì ngồi vò đầu bứt tai không biết viết prompt thế nào cho chuẩn để gửi cho sếp, bạn hãy dùng **Meta-Prompt Template** sau để biến AI thành "Trợ lý Prompt":

#### Mẫu Meta-Prompt kinh điển:
```text
BẠN LÀ: Chuyên gia hàng đầu thế giới về Prompt Engineering dành cho khối Ngân hàng & Tài chính.
Ý ĐỊNH CỦA TÔI: "Tôi muốn nhờ AI viết một bức thư nhắc nợ khách hàng doanh nghiệp vay vốn nông nghiệp nhưng giọng điệu không được đe dọa, phải khéo léo để họ tiếp tục hợp tác với Agribank."

NHIỆM VỤ CỦA BẠN:
1. Hãy phân tích xem ý định trên của tôi đang thiếu những thành tố nào (Bối cảnh, Ràng buộc, Định dạng).
2. Hãy đặt lại cho tôi 3 câu hỏi làm rõ quan trọng nhất.
3. Sau đó, hãy tự động soạn thảo một BỘ CÂU LỆNH HOÀN CHỈNH (Master Prompt) đạt chuẩn 5 thành tố (Role - Context - Task - Constraint - Format) để tôi chỉ việc copy và dán vào cửa sổ chat làm việc!
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Pipeline 2 bước gọi API (Two-stage Request) & Tính năng "Làm đẹp câu lệnh" (Prompt Enhancer)*

Dân làm sản phẩm và kỹ thuật có thể ứng dụng 2 kỹ thuật này rất thực tế:

1. **Pipeline 2 bước giải quyết bài toán khó (Two-stage API Pipeline):**
   Thay vì dồn tất cả vào 1 request duy nhất dễ làm AI bị quá tải logic, ta tách thành 2 lượt gọi API nhẹ nhàng:
   - **Lượt 1 (Trích xuất nguyên lý):** Gửi bài toán lên và hỏi: *"Quy định hoặc công thức toán học nền tảng cho bài toán này là gì?"* $\to$ Lưu kết quả vào biến `rules`.
   - **Lượt 2 (Giải chi tiết):** Gửi `(Bài toán gốc + rules)` sang request thứ 2 để ra kết quả cuối cùng. Cách làm này tăng tỷ lệ giải đúng từ 60% lên trên 90%.

2. **Xây dựng tính năng "Enhance Prompt" (Meta-Prompting):**
   Nếu bạn xây ứng dụng AI cho người dùng cuối (end-user), họ thường chỉ gõ được những câu rất ngắn ngủn như *"viết email xin nghỉ"*.  
   Bạn chỉ cần thêm một nút bấm **"Tối ưu câu lệnh"**: Khi bấm nút, server gửi câu ngắn đó vào một Meta-Prompt để tự động sinh ra một prompt chuyên nghiệp chuẩn 5 thành tố rồi điền ngược lại vào ô input cho người dùng!

```typescript
// Pipeline Step-Back Prompting tự động
export async function runStepBackPipeline(ai: any, detailedQuestion: string): Promise<string> {
  // Bước 1: Trừu tượng hóa nguyên lý
  const stepBackRes = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `What are the core foundational principles, financial rules, or legal concepts underlying this specific question: "${detailedQuestion}"? Be concise and general.`
  });
  const principles = stepBackRes.text;

  // Bước 2: Dùng nguyên lý để giải bài toán
  const finalRes = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Foundational Principles:\n${principles}\n\nSpecific Problem: ${detailedQuestion}\n\nSolve the specific problem adhering strictly to the foundational principles.`
  });

  return finalRes.text;
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Hai bạn nhỏ đang cãi nhau vì tranh 1 chiếc xe ô tô đồ chơi. Thử "lùi lại 1 bước" để tìm quy tắc chơi chung vui vẻ.
- **Prompt mẫu để thử:**
  ```text
  Bé Bo và bé Bi đang tranh nhau 1 chiếc xe ô tô đồ chơi màu đỏ và khóc nhè.
  Bước 1 (Lùi lại 1 bước): Ý nghĩa của việc cùng chơi đồ chơi là gì?
  Bước 2 (Giải quyết): Hãy đưa ra 2 cách công bằng để cả hai bạn cùng vui mà không ai phải khóc.
  ```
- **Kết quả mong đợi:** Bước 1 nhận định chơi chung là để chia sẻ niềm vui; Bước 2 đưa ra giải pháp luân phiên (mỗi bạn chơi 10 phút tính bằng đồng hồ cát hoặc chơi trò một bạn làm trạm xăng, một bạn lái xe).

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác đọc tin thấy giá vàng hôm nay biến động mạnh, trong lòng thấy bất an. Hãy nhờ AI lùi lại một bước nhìn vào bài học lịch sử để tâm lý vững vàng.
- **Prompt mẫu để thử:**
  ```text
  Hôm nay thấy giá vàng nhảy múa thất thường tôi sốt ruột quá.
  Hãy lùi lại 1 bước (Step-back): Nhìn lại quy luật thị trường tài chính và lịch sử giữ vàng qua nhiều thập kỷ, bản chất của vàng đối với người già tích lũy dưỡng già là gì? Từ đó cho tôi lời khuyên để giữ tâm an vui, không phải thấp thỏm xem bảng giá mỗi ngày.
  ```
- **Kết quả mong đợi:** AI phân tích bản chất vàng là tài sản bảo toàn giá trị dài hạn chứ không phải lướt sóng hàng ngày; khuyên bác an tâm sống khỏe, không cần theo dõi biến động từng giờ.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Khách hàng doanh nghiệp phàn nàn: "Hồ sơ vay vốn của tôi bị ngâm 3 tuần chưa xong". Thay vì chỉ xin lỗi sự vụ, hãy lùi lại một bước để phân tích căn nguyên quy trình.
- **Prompt mẫu để thử:**
  ```text
  Sự vụ cụ thể: Khách hàng VIP nộp hồ sơ xin cấp hạn mức 20 tỷ phàn nàn phòng Khách hàng Doanh nghiệp làm việc quá chậm trễ (21 ngày chưa có phê duyệt).
  
  Áp dụng Step-Back Prompting:
  1. Câu hỏi lùi (Nguyên lý bao quát): Chu trình cấp tín dụng doanh nghiệp thường gặp những điểm nghẽn (bottlenecks) cốt lõi nào giữa các bộ phận: Quan hệ khách hàng, Thẩm định rủi ro, và Tái thẩm định phê duyệt?
  2. Áp dụng vào sự vụ: Đưa ra 3 giải pháp cải tiến quy trình để rút ngắn thời gian xử lý hồ sơ từ 21 ngày xuống dưới 7 ngày làm việc.
  ```
- **Tiêu chuẩn nghiệm thu:** AI không sa đà vào đổ lỗi cá nhân mà chỉ ra nguyên lý xử lý hồ sơ song song (Parallel Processing), số hóa checklist chứng từ và phân quyền phê duyệt theo mức hạn mức.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế một Meta-Prompt (Prompt sinh ra Prompt) để chuẩn hóa và nâng cấp các prompt sơ sài của đội ngũ nhân viên mới thành prompt chuyên nghiệp đạt chuẩn doanh nghiệp.
- **Yêu cầu thực hành (Prompt-Engineering trực tiếp):**
  ```text
  System Prompt:
  Bạn là một Meta-Prompt Optimizer chuyên gia.
  Nhiệm vụ: Nhận một câu lệnh sơ sài (Raw Prompt) của người dùng, phân tích 3 khiếm khuyết cốt lõi (thiếu bối cảnh, thiếu ràng buộc định dạng, không kiểm soát rủi ro), sau đó viết lại thành một Production-Ready Prompt hoàn chỉnh tuân thủ cấu trúc 5 thành phần (Role, Context, Task, Constraints, Output Format).

  User Input:
  Raw Prompt cần tối ưu: "Viết giùm cái thông báo bảo trì hệ thống máy chủ đêm nay cho khách hàng biết."

  Hãy thực hiện nhiệm vụ tối ưu hóa.
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - AI chỉ ra chính xác 3 thiếu sót: chưa rõ khung giờ bảo trì, chưa có thông báo dịch vụ nào bị gián đoạn, chưa có hotline hỗ trợ khẩn cấp.
  - Sinh ra một System Prompt mẫu chuyên nghiệp kèm theo các biến thế chỗ như `{{maintenance_start}}`, `{{affected_services}}`, `{{support_contact}}`.

## ⚠️ Quy Tắc Vàng
- Khi gặp một bài toán hóc búa chưa từng thấy: Đừng hỏi cách giải ngay, hãy hỏi: *"Nguyên lý cơ bản chi phối bài toán này là gì?"*.
