# BÀI 07: REACT & AGENTIC LOOPS (VÒNG LẶP SUY NGHĨ - HÀNH ĐỘNG - QUAN SÁT)
> **Mã chuyên đề:** `MOD-07-REACT-AGENTIC`  
> **Thuộc nhóm:** Chuỗi suy nghĩ & Lập luận nâng cao (Advanced Reasoning)  
> **Mục tiêu:** Nắm vững cấu trúc ReAct (Reasoning + Acting) — nền móng của toàn bộ hệ thống AI Agent hiện đại, giúp AI biết tự suy nghĩ, tự gọi công cụ tra cứu dữ liệu ngoài và phản ánh kết quả để sửa sai.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
**ReAct** (Yao et al., Google Brain / Princeton, 2022) là sự kết hợp nhuần nhuyễn giữa **Lập luận nội tại (Internal Reasoning)** và **Tương tác môi trường (External Action)** theo một vòng lặp tuần tự:

$$\text{Thought (Suy nghĩ)} \longrightarrow \text{Action (Hành động)} \longrightarrow \text{Observation (Quan sát kết quả)} \longrightarrow \text{Thought kế tiếp...}$$

Nếu không có Action, AI chỉ có thể "chém gió" dựa trên kiến thức cũ trong quá khứ (dễ sinh ảo giác).  
Nếu không có Thought, AI sẽ gọi công cụ một cách mù quáng, hỗn loạn.  
👉 **ReAct** biến mô hình ngôn ngữ từ một "nhà văn thụ động" thành một **"Trợ lý hành động tự chủ" (Autonomous Agent)**.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Thám tử nhí đi tìm món đồ chơi giấu kín"*

Tưởng tượng em đóng vai thám tử đi tìm bạn robot đồ chơi bị thất lạc trong nhà:
1. **Suy nghĩ (Thought):** *"Robot thường thích ở gần chỗ có pin sạc. Mình đoán bạn ấy đang ở phòng khách!"*
2. **Hành động (Action):** Chạy vào phòng khách và lật gối sofa lên xem.
3. **Quan sát (Observation):** Nhìn thấy chỉ có điều khiển tivi, không có robot ở đây.
4. **Suy nghĩ lại (Thought 2):** *"À, hồi chiều mình có mang robot ra ban công chơi với chậu cây!"*
5. **Hành động tiếp (Action 2):** Chạy ngay ra ban công tìm sau chậu hoa hồng.
6. **Quan sát (Observation 2):** Thấy robot đang nằm ngủ ngoan ở đó!
7. **Đáp án cuối cùng:** Cầm robot vào khoe với mẹ!  
👉 **ReAct** chính là việc Robot biết vừa đi tìm, vừa nhìn xung quanh xem mình đã tìm đúng chưa rồi mới quyết định bước tiếp theo!

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Nhờ đứa cháu tìm cặp kính lão và tờ báo sáng"*

Bác ngồi ở sân uống trà sáng, muốn đọc báo nhưng không nhớ để kính ở đâu, bèn nhờ đứa cháu: *"Cháu tìm giúp bà cái kính lão để đọc báo với"*.  
Đứa cháu ngoan sẽ làm từng bước:
- **Nghĩ trong đầu:** *"Bà vừa ngồi ăn sáng trong bếp, chắc để quên ở đó"*.
- **Hành động:** Cháu chạy vào bếp tìm trên bàn ăn.
- **Quan sát thấy:** Trên bàn chỉ có ấm trà và hộp bánh, không có kính.
- **Nghĩ tiếp:** *"Hôm qua bà ngồi khâu áo ở giường ngủ"*.
- **Hành động tiếp:** Cháu đi vào buồng ngủ, nhìn lên đầu giường.
- **Quan sát thấy:** Cặp kính nằm ngay ngắn cạnh giỏ kim chỉ!
- **Hoàn thành:** Cháu mang kính ra lễ phép trao tận tay bà.  
👉 Máy tính làm việc theo kiểu **ReAct** cũng ngoan và chu đáo như đứa cháu biết nghĩ trước làm sau vậy.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Trợ lý nhấc máy tra cứu Thông tư rồi mới trả lời khách hàng"*

Khách hàng gọi điện tới phòng giao dịch hỏi: *"Tôi vay 500 triệu làm nông nghiệp hữu cơ tại huyện Đan Phượng, được hưởng ưu đãi lãi suất gì theo chính sách mới nhất không?"*.  
Một nhân viên giỏi không bao giờ trả lời bừa từ trí nhớ mang tính ước lượng. Họ sẽ thực hiện chuỗi ReAct:

```text
BẠN LÀ: Trợ lý Nghiệp vụ Tín dụng Agribank.
CÁC CÔNG CỤ BẠN CÓ:
- [TraCuuQuyChe(từ khóa)]: Tìm kiếm văn bản quy định của NHNN và Agribank.
- [TinhToanLaiSuat(số tiền, lãi suất, thời hạn)]: Tính tiền lãi chi tiết.

CÂU HỎI KHÁCH HÀNG: "Vay 500 triệu trồng bưởi VietGAP tại Đan Phượng có ưu đãi gì?"

QUY TRÌNH BẮT BUỘC:
Thought 1: Cần xác định đối tượng khách hàng có thuộc lĩnh vực nông nghiệp ứng dụng công nghệ cao theo Nghị định 55/CP không.
Action 1: TraCuuQuyChe("Nghị định 55 ưu đãi nông nghiệp công nghệ cao VietGAP")
Observation 1: [Hệ thống trả về: Khách hàng có chứng nhận VietGAP được giảm 1.0%/năm lãi suất, mức trần 6.5%/năm].

Thought 2: Đã có mức lãi suất 6.5%/năm. Bây giờ cần tính tiền lãi hàng tháng cho khoản vay 500 triệu trong 12 tháng.
Action 2: TinhToanLaiSuat(500000000, 0.065, 12)
Observation 2: [Hệ thống trả về: Tiền lãi tháng đầu khoảng 2.708.000 VNĐ].

Thought 3: Đã đầy đủ cả căn cứ pháp lý và số liệu tính toán chi tiết. Bây giờ soạn câu trả lời hoàn chỉnh, dễ hiểu cho khách hàng.
Final Answer: "Dạ thưa Bác, mô hình trồng bưởi VietGAP của Bác thuộc diện ưu đãi theo Nghị định 55. Lãi suất tại Agribank được hỗ trợ chỉ còn 6.5%/năm..."
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Góc nhìn kiến trúc hệ thống:** *Vòng lặp `while` kết hợp ngắt dòng (Stop Token) và gọi API ngoài*

Về bản chất lập trình, **ReAct** biến AI từ một hàm sinh text một chiều thành một **vòng lặp tương tác (Interactive Loop)**:
```
[User gửi lệnh] ──> [LLM sinh Thought + Action] ──> [Server phát hiện lệnh gọi tool]
                           ▲                                      │
                           │                                      ▼
               [LLM đọc kết quả Observation] <── [Server chạy hàm thật & lấy data]
```

Quy trình xử lý thực tế trong mã nguồn:
1. **Bắt tín hiệu ngắt (Stop Token):** Server cấu hình Stop Sequence tại `\nObservation:`. Khi AI vừa gõ xong tên hàm cần gọi (ví dụ `Action: TraCuu(x)`), quá trình sinh text lập tức dừng lại.
2. **Thực thi hàm thật (Execute Local Code):** Server bóc tách tên hàm và tham số, tự chạy câu lệnh SQL hoặc gọi API bên ngoài để lấy dữ liệu thực tế.
3. **Nối dữ liệu vào lịch sử (Context Append):** Server đưa kết quả vừa tra cứu được vào dòng `Observation: <dữ liệu>`, rồi gửi ngược lại cho AI tiếp tục phân tích.
4. **Chặn lặp vô tận (Infinite Loop Guardrail):** Luôn đặt điều kiện dừng `max_iterations = 5`. Nếu sau 5 vòng mà AI vẫn chưa ra được `Final Answer` thì chủ động break vòng lặp để bảo vệ tài nguyên hệ thống.

```typescript
// Interface ReAct Execution Step
export interface ReActStep {
  thought: string;
  action?: {
    toolName: string;
    parameters: Record<string, any>;
  };
  observation?: string;
}

export function parseReActOutput(rawText: string): { thought: string; toolName?: string; toolArgs?: any } {
  const thoughtMatch = rawText.match(/Thought:\s*(.*?)(?=\nAction:|$)/s);
  const actionMatch = rawText.match(/Action:\s*(\w+)\((.*?)\)/s);
  
  return {
    thought: thoughtMatch ? thoughtMatch[1].trim() : '',
    toolName: actionMatch ? actionMatch[1] : undefined,
    toolArgs: actionMatch ? actionMatch[2] : undefined
  };
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Đóng vai Thám tử nhí đi tìm chiếc kính bơi bị thất lạc trước giờ đi học bơi.
- **Prompt mẫu ReAct để thử:**
  ```text
  Em hãy đóng vai thám tử nhí đi tìm chiếc kính bơi bị mất theo từng bước:
  Thought 1: Nhớ lại xem lần trước đi bơi về cất ở đâu.
  Action 1: Mở ngăn kéo tủ quần áo ra kiểm tra.
  Observation 1: Nhìn thấy chỉ có khăn tắm và mũ bơi, không có kính.
  Thought 2: Nhớ ra hôm qua có mang kính ra ban công ngâm nước rửa sạch.
  Action 2: Chạy ra ban công nhìn lên giá phơi đồ.
  Observation 2: Thấy kính bơi màu xanh đang treo ở đó!
  Final Response: Reo lên vui sướng và mang kính vào balo đi học!
  ```
- **Kết quả mong đợi:** AI mô phỏng đúng chuỗi hành động và suy luận sinh động, ngộ nghĩnh.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Hướng dẫn cụ ông 75 tuổi cách rút tiền lương hưu tại cây ATM mà không sợ bị nuốt thẻ.
- **Prompt mẫu ReAct để thử:**
  ```text
  Hãy đóng vai một trợ lý ngân hàng chu đáo hướng dẫn cụ già rút tiền ATM qua chuỗi ReAct:
  - Thought: Cụ tuổi cao, mắt kém và rất lo lắng bị kẻ gian nhìn lén mật mã hoặc bị máy nuốt thẻ.
  - Action: Chia quy trình thành 4 bước lớn với chữ to rõ ràng.
  - Observation: Cần nhấn mạnh thao tác lấy tay che bàn phím và nhớ nhận lại thẻ trước khi nhận tiền.
  - Response: Soạn lời dặn dò thân tình, mộc mạc như người con hướng dẫn cha mẹ.
  ```
- **Kết quả mong đợi:** Lời hướng dẫn từ tốn, ấm áp, có dặn dò kỹ lưỡng về bảo mật.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Xử lý tình huống bà con nông dân mang sổ tiết kiệm 200 triệu rút trước hạn 2 tháng do nghe tin đồn thất thiệt.
- **Prompt mẫu ReAct chuẩn mực:**
  ```text
  BẠN LÀ: Trợ lý Giao dịch viên tại quầy Agribank.
  TÀI LIỆU QUY CHẾ: 
  - Sổ tiết kiệm 200 triệu kỳ hạn 12 tháng, lãi suất 6.5%/năm. Đã gửi được 10 tháng.
  - Theo Thông tư 04/2022/TT-NHNN: Rút trước hạn toàn bộ sẽ tính lãi không kỳ hạn (0.2%/năm).
  
  HÃY THỰC HIỆN ĐÚNG 4 KHỐI REACT TUẦN TỰ:
  THOUGHT: Phân tích tâm lý hoang mang của khách hàng và bài toán kinh tế cần giải quyết.
  ACTION: Tra cứu công thức tính lãi Thông tư 04 và biểu phí Agribank.
  OBSERVATION: Tính toán chính xác con số: Tiền lãi nếu để tròn năm (13 triệu) vs Tiền lãi rút ngay (khoảng 333 nghìn) -> Mất trắng hơn 10.5 triệu đồng.
  RESPONSE: Soạn 3 câu thoại trực tiếp tại quầy: (1) Khẳng định tiền mặt sẵn sàng chi trả ngay; (2) Phân tích số tiền thiệt hại mồ hôi nước mắt; (3) Tôn trọng quyền tự quyết của bà con.
  ```
- **Tiêu chuẩn nghiệm thu:** AI tính toán chính xác số liệu tài chính và đưa ra lời thoại giao tiếp tại quầy đạt chuẩn thấu cảm.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế một cấu trúc Prompt ReAct Agent có khả năng tự gọi công cụ giả lập (Mock Tool Invocation) để kiểm tra trạng thái thanh toán đơn hàng.
- **Yêu cầu thực hành:**
  ```text
  You are an Agentic Customer Support Router.
  Available Mock Tools:
  - CheckOrderStatus(order_id: string): returns status JSON.
  - RequestRefund(order_id: string, reason: string): returns refund ticket id.

  User Query: "Đơn hàng AGRI-9982 của tôi 5 ngày rồi chưa thấy giao, kiểm tra giúp tôi với!"

  Task: Output the exact ReAct execution sequence:
  Thought: Determine which tool to invoke.
  Action: CheckOrderStatus(order_id: "AGRI-9982")
  Observation: {"status": "IN_TRANSIT", "location": "Kho Me Linh", "estimated_delivery": "Tomorrow"}
  Thought: Analyze observation and formulate empathetic user response.
  Final Answer: Write a professional status update to the user.
  ```
- **Tiêu chuẩn nghiệm thu:** AI giữ đúng định dạng Action và Observation, trích xuất chính xác `order_id` mà không bịa thêm tham số sai.

## ⚠️ Quy Tắc Vàng
- Tuyệt đối cấm AI "tự bịa" ra kết quả ở dòng `Observation`. Dòng `Observation` chỉ được phép do phần mềm máy chủ điền vào sau khi gọi công cụ thật.
