# BÀI 15: FLIPPED INTERACTION & SOCRATIC PROMPTING (ĐẢO NGƯỢC VAI TRÒ: BẢO AI PHỎNG VẤN TÔI)
> **Mã chuyên đề:** `MOD-15-FLIPPED-INTERACTION`  
> **Thuộc nhóm:** Kỹ năng công sở & Nghiệp vụ thực chiến (Workplace Superpowers)  
> **Mục tiêu:** Chữa dứt điểm căn bệnh "sợ ô chat trắng" khi người dùng không biết phải diễn đạt thế nào. Đảo ngược vai trò để AI chủ động đặt câu hỏi khai thác thông tin từ bạn từng bước một.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Phần lớn người dùng nghiệp vụ (Non-tech) khi mở giao diện chat thường gặp tình trạng bế tắc: Bạn có một ý tưởng trong đầu, nhưng không biết phải viết prompt ra sao cho đầy đủ. Nếu bạn chỉ gõ 1 câu sơ sài, AI sẽ đoán mò và đưa ra kết quả không như ý.

**Flipped Interaction (Tương tác đảo ngược)** là một tuyệt chiêu đơn giản nhưng có sức mạnh thay đổi hoàn toàn cuộc chơi:  
Thay vì bạn phải tự nghĩ ra mọi thứ để cung cấp cho AI, bạn ra lệnh cho AI:  
> *"Đừng vội làm ngay! Hãy đóng vai chuyên gia và phỏng vấn tôi từng câu hỏi một để lấy đủ thông tin cần thiết."*

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Trò chơi bác sĩ khám bệnh"*

Khi em đi khám bác sĩ vì bị đau bụng:  
Bác sĩ không bao giờ vừa nhìn thấy em đã vội vàng kê đơn thuốc ngay lập tức!  
Bác sĩ sẽ ôn tồn hỏi em từng câu:
- *"Cháu đau ở bên trái hay bên phải?"* (Em trả lời: Bên phải ạ).
- *"Cháu đau từ sáng hay mới đau lúc chiều?"* (Em trả lời: Lúc chiều ạ).
- *"Trưa nay cháu có ăn đồ lạnh hay kẹo ngọt không?"* (Em trả lời: Cháu có ăn kem ạ).  
Sau khi hỏi xong 3 câu, bác sĩ mới biết chính xác em bị làm sao để cho thuốc uống ngon lành.  
👉 **Flipped Interaction** chính là việc em bảo bạn Robot AI đóng vai bác sĩ hỏi em từng câu, thay vì em phải tự nghĩ ra đơn thuốc!

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Người thợ may đo quần áo tận nhà"*

Khi bác gọi người thợ may giỏi đến nhà để may một bộ đồ bà ba mặc đi chùa:  
Bác không cần phải học nghề may, không cần biết phải cắt bao nhiêu mét vải hay chừa đường may mấy phân.  
Bác chỉ cần đứng đó, người thợ may sẽ cầm thước dây hỏi bác:
- *"Bác thích may cổ tròn thanh thoát hay cổ tim truyền thống?"*
- *"Bác thích vải lụa tơ tằm mềm mát hay vải đũi đứng dáng?"*
- *"Tà áo bác thích dài ngang gối hay chấm bắp chân để dễ ngồi xe?"*  
Bác chỉ việc thong thả trả lời từng câu, thế là người thợ may sẽ làm ra bộ quần áo vừa vặn, đẹp mắt nhất cho bác.  
👉 Máy tính cũng vậy: Hãy bảo máy "đo ni đóng giày" bằng cách hỏi bác từng ý một.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Buổi Briefing dự án: Để chuyên gia tư vấn khai thác yêu cầu của khách hàng"*

Thay vì ngồi vò đầu bứt tai 30 phút để viết một bản kế hoạch tổ chức sự kiện hay đề án marketing, bạn chỉ cần gửi 1 câu lệnh kích hoạt sau:

#### Mẫu Prompt Flipped Interaction thực chiến:
```text
BẠN LÀ: Chuyên gia Tổ chức Sự kiện & Truyền thông nội bộ Agribank.
MỤC TIÊU CỦA TÔI: "Tôi muốn tổ chức Ngày hội Văn hóa Thể thao cho cán bộ nhân viên chi nhánh nhân dịp kỷ niệm ngày thành lập ngân hàng."

QUY TRÌNH BẮT BUỘC:
1. ĐỪNG vội lập kế hoạch ngay lúc này.
2. Hãy phỏng vấn tôi để làm rõ các chi tiết cần thiết.
3. QUY TẮC PHỎNG VẤN:
   - Mỗi lần chỉ được đặt duy nhất 01 câu hỏi ngắn gọn.
   - Chờ tôi trả lời xong câu hỏi đó rồi mới được đặt câu hỏi tiếp theo.
   - Hỏi tối đa 5 câu hỏi trọng tâm nhất (về số lượng người, ngân sách dự kiến, thời gian tổ chức, địa điểm trong nhà hay ngoài trời).
4. Sau khi tôi đã trả lời đủ 5 câu hỏi, hãy tự động xuất bản một KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT trình Giám đốc chi nhánh phê duyệt.
```

*Trải nghiệm thực tế:* Bạn chỉ việc thư thả trả lời từng câu ngắn gọn như đang chat Zalo với một người trợ lý đắc lực, kết quả cuối cùng nhận được sẽ chuẩn xác đến kinh ngạc!

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Xây dựng Form Wizard động qua cơ chế State Machine*

Dưới góc nhìn lập trình, **Flipped Interaction** là cách triển khai một **Dynamic Multi-Step Form Wizard** mà không cần code cứng giao diện:
- **State Machine Loop:** AI giữ vai trò quản lý trạng thái (`currentState: Gathering_Info`).
- **One-Question Constraint:** Ràng buộc `Ask only one question at a time` giúp kiểm soát Context Window không bị phình to đột ngột và giữ cho người dùng không bị "ngợp" thông tin (Cognitive Overload).
- **Termination Trigger:** Đặt điều kiện dừng dứt khoát: Khi đã thu thập đủ các trường dữ liệu bắt buộc (`required_fields: [budget, headcount, date, venue]`), mô hình tự động chuyển trạng thái sang `currentState: Generate_Final_Plan`.

```typescript
// Mẫu Prompt System cho Flipped Interaction Assistant
export const flippedSocraticPrompt = `
You are a consultative business requirement gathering agent.
Goal: Guide the user to define their business project specifications.
State: INTERVIEW_MODE
Rules:
1. Ask exactly ONE question per turn.
2. Track user inputs internally.
3. When you have collected [Target, Budget, Deadline, Scope], switch state to EXECUTION_MODE and output the complete specification document.
`;
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Bé muốn vẽ một chú khủng long thật ngầu nhưng chưa biết bắt đầu từ đâu. Nhờ AI làm "Thầy giáo hội họa" hỏi bé từng câu một để cùng lên ý tưởng.
- **Prompt mẫu để thử (Kỹ thuật Flipped Interaction):**
  ```text
  Em muốn vẽ một bức tranh về chú khủng long, nhưng em chưa biết vẽ thế nào.
  Thầy giáo AI ơi, thầy ĐỪNG gợi ý ngay một bức tranh dài dòng nhé! Hãy đóng vai Thầy giáo hội họa vui tính, hỏi em TỪNG CÂU HỎI MỘT để giúp em tự nghĩ ra: khủng long tên gì, màu gì, đang ăn cỏ hay bay trên trời. Khi em trả lời xong câu nào thì thầy mới hỏi tiếp câu sau nhé! Bắt đầu câu số 1 đi thầy!
  ```
- **Kết quả mong đợi:** AI chào bé thân thiện và chỉ hỏi đúng 1 câu duy nhất: *"Chào con! Đầu tiên con muốn chú khủng long của con to lớn như tòa nhà hay nhỏ nhắn tinh nghịch nào?"*

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác muốn tập dưỡng sinh nâng cao sức khỏe tuổi già nhưng thể trạng mỗi người mỗi khác. Nhờ AI phỏng vấn sức khỏe từng bước trước khi đưa ra bài tập phù hợp.
- **Prompt mẫu để thử:**
  ```text
  Tôi muốn tìm bài tập dưỡng sinh buổi sáng phù hợp với tuổi 70.
  Bạn đừng đưa ra bài tập vội. Hãy đóng vai Chuyên gia y học cổ truyền, hỏi tôi lần lượt 3 câu hỏi (về huyết áp, khớp gối, và thời gian tập mỗi ngày). Hỏi tôi từng câu một, đợi tôi trả lời xong câu trước rồi mới hỏi câu tiếp theo. Hãy bắt đầu câu hỏi đầu tiên.
  ```
- **Kết quả mong đợi:** AI hỏi từng câu ân cần, lắng nghe bệnh nền (ví dụ thoái hóa khớp gối) rồi mới đề xuất bài vẩy tay Dịch Cân Kinh nhẹ nhàng, không gây áp lực lên khớp.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Cán bộ Quan hệ khách hàng (RM) chuẩn bị hồ sơ cấp hạn mức tín dụng 30 tỷ cho một doanh nghiệp dệt may. Thay vì tự đoán, yêu cầu AI đóng vai Trưởng phòng Thẩm định Rủi ro phỏng vấn ngược lại RM để hoàn thiện hồ sơ.
- **Prompt mẫu để thử:**
  ```text
  Tôi là Chuyên viên Tín dụng đang làm tờ trình cấp hạn mức 30 tỷ cho Công ty Dệt may Hòa Bình.
  Hãy đóng vai Trưởng phòng Thẩm định Rủi ro khó tính, nắm rõ các rủi ro cốt lõi của ngành dệt may (tồn kho nguyên phụ liệu sợi, đơn hàng xuất khẩu đi Mỹ/EU, biến động tỷ giá USD/VND).
  Nhiệm vụ: Bạn hãy phỏng vấn tôi từng câu hỏi một để kiểm tra tính khả thi của hồ sơ. Mỗi lượt chỉ hỏi đúng 1 câu trọng tâm nhất, đợi tôi trả lời rồi mới phản biện và hỏi tiếp câu sau. Hãy bắt đầu!
  ```
- **Tiêu chuẩn nghiệm thu:** AI hỏi đúng các điểm yếu sống còn của doanh nghiệp xuất khẩu (ví dụ: chứng chỉ xanh ESG, hợp đồng hedging tỷ giá), giúp RM lường trước mọi câu hỏi khi họp Hội đồng Tín dụng.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế một Flipped System Prompt để đóng vai Solutions Architect, thu thập đầy đủ yêu cầu phi chức năng (Non-Functional Requirements - NFR) của hệ thống trước khi xuất bản bản thiết kế kiến trúc High-Level Architecture (HLA).
- **Yêu cầu thực hành (Prompt Architecture trên Playground):**
  ```text
  System Prompt:
  You are an Enterprise Cloud Solutions Architect.
  A developer approaches you requesting a cloud database solution.
  OPERATING PROTOCOL:
  1. Do NOT recommend any architecture or cloud service immediately.
  2. You must interview the user sequentially across 4 critical pillars:
     - Pillar 1: Throughput & Latency (Target QPS & SLA)
     - Pillar 2: Data Volume & Growth Rate (GB/TB per month)
     - Pillar 3: Consistency vs Availability requirements (CAP theorem preference)
     - Pillar 4: Budget & Compliance constraints
  3. Ask exactly ONE concise question at a time.
  4. Only after all 4 pillars are fully answered, synthesize the requirements and produce the final HLA recommendation in structured markdown table format.

  Start immediately by asking Pillar 1.
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - AI khởi động bằng đúng 1 câu hỏi về throughput (QPS) và độ trễ mong muốn.
  - Tuyệt đối không tự ý "trả lời trước" danh sách database như RDS hay DynamoDB khi chưa đủ thông tin 4 trụ cột.

## ⚠️ Quy Tắc Vàng
- **Luôn giới hạn: "Mỗi lần chỉ hỏi 1 câu duy nhất":** Nếu bạn không ghi rõ ràng buộc này, AI sẽ lập tức tuôn ra một danh sách 10 câu hỏi cùng lúc khiến bạn nản lòng không muốn trả lời!
