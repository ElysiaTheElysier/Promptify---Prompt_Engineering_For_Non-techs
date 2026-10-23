# BÀI 06: SELF-CONSISTENCY & ENSEMBLING (LẤY MẪU ĐA LUỒNG & BỎ PHIẾU ĐA SỐ)
> **Mã chuyên đề:** `MOD-06-SELF-CONSISTENCY`  
> **Thuộc nhóm:** Chuỗi suy nghĩ & Lập luận nâng cao (Advanced Reasoning)  
> **Mục tiêu:** Nắm vững kỹ thuật lấy mẫu nhiều chuỗi suy nghĩ độc lập và tổng hợp kết quả theo nguyên tắc đa số phiếu (Majority Vote) để loại trừ triệt để ảo giác ngẫu nhiên trong các bài toán rủi ro cao.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
**Self-Consistency** (Wang et al., Google Brain, 2022) dựa trên một quan sát tâm lý học trực quan: *Một bài toán phức tạp thường có nhiều con đường suy luận khác nhau, nhưng nếu các con đường đó đều dẫn về cùng một kết luận, thì độ tin cậy của kết luận đó là cực kỳ cao.*

- Thay vì chỉ hỏi AI 1 lần duy nhất với $T=0$ (Greedy Decoding), ta cho AI sinh ra **5 đến 10 chuỗi suy luận CoT độc lập** với nhiệt độ nhẹ ($T=0.7$).
- Trích xuất câu trả lời cuối cùng từ mỗi chuỗi.
- Chọn kết quả có số lượt xuất hiện nhiều nhất (Majority Voting).

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Hỏi 5 bạn cùng lớp xem ngày mai có phải mang màu vẽ không"*

Chiều nay tan học về, em không nhớ ngày mai có tiết Mỹ thuật để mang màu vẽ đi học hay không.  
Nếu em chỉ gọi điện hỏi đúng 1 bạn, nhỡ bạn ấy nhớ nhầm thì sáng mai em sẽ bị cô giáo phạt.  
Em làm cách thông minh hơn:
- Nhắn tin hỏi 5 bạn trong tổ: Bạn Nam, bạn Hoa, bạn Bình, bạn Linh, bạn Tùng.
- Kết quả: Có 4 bạn bảo: *"Có, ngày mai cô dặn mang hộp màu sáp!"*, chỉ có 1 bạn bảo: *"Hình như không"*.  
Vì có tới 4 bạn cùng đồng thanh nói *"Có"*, em hoàn toàn yên tâm bỏ hộp màu vào cặp!  
👉 **Self-Consistency** chính là việc nhờ nhiều bạn Robot cùng giải một lúc rồi chọn đáp án mà nhiều bạn đồng ý nhất.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Hội chẩn y khoa 3 bác sĩ trước khi quyết định phẫu thuật"*

Khi trong gia đình có người lớn tuổi bị bệnh nặng, đứng trước việc có nên mổ hay không, con cháu hiếm khi chỉ nghe theo lời của một bác sĩ duy nhất ở một phòng khám tư.  
Gia đình thường đưa hồ sơ bệnh án đi xin ý kiến của **3 vị bác sĩ chuyên khoa đầu ngành** ở các bệnh viện tuyến trung ương khác nhau (Bệnh viện Bạch Mai, Bệnh viện Chợ Rẫy, Bệnh viện Việt Đức).  
Nếu cả 3 vị bác sĩ, dù có phương pháp phân tích hơi khác nhau một chút, nhưng đều đưa ra cùng một lời khuyên: *"Nên điều trị bảo tồn bằng thuốc, chưa cần can thiệp dao kéo"*, thì cả gia đình đều vô cùng an tâm làm theo.  
👉 Kỹ thuật này giúp máy tính không bao giờ đưa ra lời phán vội vàng nguy hiểm.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Định giá bất động sản thế chấp trong bối cảnh thị trường biến động mạnh"*

Khi thẩm định một mảnh đất thổ cư 300m² tại vùng ven để làm tài sản thế chấp cho khoản vay lớn, các nguồn tin giá thị trường thường bị nhiễu. Nếu chỉ chạy 1 lần câu lệnh phân tích giá, AI có thể vô tình lấy phải một tin rao "ngáo giá" trên mạng.  
**Ứng dụng Self-Consistency trong Prompt:**

```text
YÊU CẦU: Hãy độc lập phân tích và ước tính giá thị trường của mảnh đất thế chấp sau theo 3 phương pháp thẩm định khác nhau:
- Lần 1: Phương pháp so sánh giá giao dịch thực tế của 3 lô đất tương đồng xung quanh trong 6 tháng gần nhất.
- Lần 2: Phương pháp dòng tiền cho thuê tạo thu nhập giả định trên đất.
- Lần 3: Phương pháp chi phí thay thế (Giá đất theo bảng giá nhà nước nhân hệ số K + Giá trị xây dựng còn lại).

ĐỊNH DẠNG:
Với mỗi phương pháp, hãy trình bày ngắn gọn các bước tính toán và xuất ra con số đơn giá cuối cùng (triệu VNĐ/m²).
Ở phần TỔNG HỢP:
- So sánh khoảng giá của 3 phương pháp.
- Loại bỏ giá trị bất thường (nếu có).
- Đưa ra con số bình quân thận trọng (Conservatism Principle) để làm cơ sở cấp hạn mức an toàn cho ngân hàng Agribank.
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Góc nhìn thuật toán thực tế:** *Mô hình Bỏ phiếu Đa số (Majority Vote / Frequency Counter)*

Với anh em lập trình, **Self-Consistency** chính là một thuật toán Consensus (đồng thuận) đơn giản:
1. **Lấy mẫu đa luồng (Multi-sampling):** Bạn gọi API $N$ lần (ví dụ $N=3$ hoặc $N=5$) song song với nhiệt độ vừa phải (`temperature: 0.7`). Cần $T > 0$ để các lần chạy không sao chép y hệt nhau.
2. **Thuật toán đếm tần suất (Voting Logic):** Đưa các đáp án trả về vào một mảng, đếm số lần xuất hiện (Hash Map / Frequency counter) và chọn giá trị có tần suất cao nhất.
3. **Tại sao loại trừ được Bug ảo giác?** Các lỗi ảo giác của LLM thường xuất hiện ngẫu nhiên và phân tán. Nhưng logic toán học và dữ liệu đúng thì các chuỗi suy luận độc lập đều sẽ **hội tụ về cùng một kết quả**.
4. **Đánh đổi tài nguyên (Resource Tradeoff):** Gọi $N$ lần sẽ tốn $N \times$ chi phí token. Do đó kỹ thuật này chỉ nên áp dụng cho các tác vụ then chốt (như chấm điểm tự động, duyệt hạn mức tín dụng lớn).

```typescript
// Triển khai Majority Voting cho Self-Consistency
export function majorityVote(answers: string[]): { winner: string; confidence: number } {
  const counts: Record<string, number> = {};
  for (const ans of answers) {
    const normalized = ans.trim().toLowerCase();
    counts[normalized] = (counts[normalized] || 0) + 1;
  }
  
  let maxCount = 0;
  let winner = answers[0];
  
  for (const [ans, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      winner = ans;
    }
  }
  
  return {
    winner,
    confidence: maxCount / answers.length // Tỷ lệ đồng thuận (ví dụ: 4/5 = 80%)
  };
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Giải bài toán đố hóc búa bằng cách hỏi 3 bạn Robot AI độc lập.
- **Prompt mẫu để thử:**
  ```text
  "Một người nông dân chở một con sói, một con dê và một bắp cải qua sông bằng một chiếc thuyền nhỏ. Thuyền chỉ chở được người nông dân và 1 trong 3 thứ đó. Nếu không có người nông dân, sói sẽ ăn thịt dê, dê sẽ ăn bắp cải. Hỏi người nông dân phải làm sao để đưa cả 3 thứ qua sông an toàn?"
  ```
- **Thực hành Self-Consistency:** Chạy câu hỏi trên 3 lần độc lập. Đối chiếu xem cả 3 lần AI có đều đưa ra cùng một bước đầu tiên là: *"Mang con dê qua sông trước"* hay không!

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Kiểm chứng thông tin sức khỏe về việc uống nước lá tía tô hạ sốt và huyết áp.
- **Prompt mẫu để thử:**
  ```text
  Hỏi độc lập 3 câu hỏi để kiểm chứng:
  Lần 1: Người lớn tuổi bị huyết áp cao uống nước lá tía tô hàng ngày có an toàn không?
  Lần 2: Có lưu ý hoặc chống chỉ định gì khi người già dùng lá tía tô cùng thuốc tây y?
  Lần 3: Liều lượng lá tía tô tươi nấu nước uống mỗi ngày bao nhiêu gam là vừa đủ?
  ```
- **Kết quả mong đợi:** Tổng hợp kết quả từ 3 góc nhìn để có bức tranh y học an toàn, không tin vào các lời đồn thổi quá đà trên mạng xã hội.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Thẩm định giá trị thị trường của lô đất thổ cư 300m² tại ven đô làm tài sản thế chấp.
- **Prompt mẫu Self-Consistency:**
  ```text
  Nhiệm vụ: Hãy độc lập ước tính đơn giá thị trường (triệu VNĐ/m²) cho mảnh đất 300m² tại thị trấn Trạm Trôi (Hoài Đức) theo 3 phương pháp thẩm định độc lập:
  - Phương pháp 1: Phương pháp so sánh thị trường (dựa trên 3 giao dịch tương đồng gần nhất).
  - Phương pháp 2: Phương pháp dòng tiền cho thuê giả định.
  - Phương pháp 3: Phương pháp bảng giá nhà nước nhân hệ số điều chỉnh K.
  
  Sau khi tính toán cả 3 phương pháp:
  - Liệt kê 3 con số đơn giá nhận được.
  - Loại bỏ con số có sự chênh lệch bất thường (Outlier).
  - Lấy con số có tính an toàn, bảo thủ nhất để làm căn cứ phê duyệt cho ngân hàng.
  ```
- **Tiêu chuẩn nghiệm thu:** AI đưa ra 3 kết quả độc lập, giải thích tại sao chọn con số cận dưới để bảo toàn vốn cho Agribank.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế Prompt giả lập cơ chế Majority Voting ngay trong một lượt gọi (Single-Turn Ensemble) để thẩm định kết quả kiểm thử.
- **Yêu cầu thực hành:**
  ```text
  System Role: Multi-Perspective Code Vulnerability Auditor.
  Input Code: "const query = 'SELECT * FROM users WHERE email = "' + req.body.email + '"';"
  
  Task:
  Simulate 3 independent security auditors evaluating this SQL line:
  - Auditor 1 (Focus on SQL Injection risk)
  - Auditor 2 (Focus on Input Sanitization standards)
  - Auditor 3 (Focus on Parameterized Query best practices)
  
  Output Format:
  - Auditor 1 Verdict: [SAFE / VULNERABLE] + 1 sentence explanation
  - Auditor 2 Verdict: [SAFE / VULNERABLE] + 1 sentence explanation
  - Auditor 3 Verdict: [SAFE / VULNERABLE] + 1 sentence explanation
  - Final Consensus (Majority Vote): [SAFE / VULNERABLE] with confidence ratio (e.g. 3/3).
  ```
- **Tiêu chuẩn nghiệm thu:** Cả 3 kiểm toán viên đều đồng thuận xuất kết quả `VULNERABLE` với độ tin cậy 100%, chỉ rõ lỗi nối chuỗi trực tiếp.

## ⚠️ Quy Tắc Vàng
- Không áp dụng Self-Consistency cho các câu hỏi mở đòi hỏi sự sáng tạo (viết thơ, viết slogan PR) vì sự đa dạng trong các câu trả lời sáng tạo là điểm tốt, không cần tìm "đa số phiếu".
- Chỉ áp dụng cho các bài toán có **đáp án định lượng, phân loại dứt khoát hoặc quyết định nhị phân (Yes/No)**.
