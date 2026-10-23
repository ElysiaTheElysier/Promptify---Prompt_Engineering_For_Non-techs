# BÀI 05: TREE-OF-THOUGHTS (TOT) — CÂY TƯ DUY, KHÁM PHÁ VÀ QUAY LUI
> **Mã chuyên đề:** `MOD-05-TREE-OF-THOUGHTS`  
> **Thuộc nhóm:** Chuỗi suy nghĩ & Lập luận nâng cao (Advanced Reasoning)  
> **Mục tiêu:** Vượt qua giới hạn của chuỗi suy nghĩ tuyến tính đơn lẻ, làm chủ kỹ thuật chia nhánh tư duy (Branching), tự đánh giá tiềm năng (Evaluation) và quay lui (Backtracking) để tìm lời giải tối ưu cho bài toán đa mục tiêu.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Nếu như **Chain-of-Thought (CoT)** là một đường thẳng duy nhất (nếu bước 1 sai thì cả chuỗi sau sụp đổ), thì **Tree-of-Thoughts (ToT)** mô phỏng cách bộ não con người giải quyết các bài toán chiến lược:
1. **Phát sinh nhánh ý tưởng (Thought Generation):** Đề xuất đồng thời 3 hoặc 4 hướng tiếp cận khác nhau.
2. **Đánh giá trạng thái (State Evaluation):** Tự chấm điểm từng nhánh theo các tiêu chí (Khả thi / Rủi ro cao / Bế tắc).
3. **Tìm kiếm & Quay lui (Search & Backtracking):** Tiếp tục đào sâu nhánh tốt nhất, nếu gặp ngõ cụt thì lùi lại quay sang nhánh tiềm năng kế tiếp (BFS / DFS).

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Đi tìm lối thoát trong mê cung lâu đài phép thuật"*

Em đã từng chơi trò vẽ đường đi trong mê cung trên báo thiếu nhi chưa?  
Nếu em vừa cầm bút vừa vẽ bừa một mạch thật nhanh, rất có thể em sẽ đâm sầm vào ngõ cụt và phải lấy cục tẩy xóa đi rất xấu.  
Cách chơi của một nhà thám hiểm thông minh:
- Đứng ở ngã ba, nhìn xem có mấy ngả đường (Đường A, Đường B, Đường C).
- Dùng ngón tay chỉ thử vào đường A: *"Ôi, đường này đi 3 bước là gặp đá chặn rồi, loại!"*.
- Thử tiếp đường B: *"Đường này thông thoáng và dẫn tới chìa khóa vàng này!"*.
- Thế là em chọn vẽ theo đường B!  
👉 **Tree-of-Thoughts** chính là việc dạy Robot AI biết dừng lại ở ngã ba đường để ngó nghiêng trước sau, chứ không cắm đầu chạy bừa vào ngõ cụt.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Bàn tính việc dựng nhà, gả con: Cân nhắc 3 phương án để vẹn cả đôi đường"*

Trong đời người, khi gặp việc đại sự như làm nhà hay cưới xin cho con cái, các cụ ngày xưa không bao giờ quyết định bộp chộp một đường:
- **Phương án 1 (Tháng Giêng):** Thời tiết mát mẻ nhưng con cháu vừa ăn Tết xong, kinh tế còn eo hẹp. *(Điểm: Trung bình)*.
- **Phương án 2 (Tháng Ba):** Vào mùa mưa bão, thợ xây dựng khó thi công, đổ móng dễ ngập nước. *(Ngõ cụt, loại bỏ ngay)*.
- **Phương án 3 (Tháng Tám):** Vừa xong vụ gặt, thóc lúa đầy bồ, thời tiết hanh khô mát mẻ, họ hàng rảnh rỗi phụ giúp. *(Phương án tối ưu nhất!)*.  
Nhờ vạch ra các nhánh trên trang giấy, cân đo nặng nhẹ rồi mới chọn, việc lớn của gia đình luôn êm đẹp, không bao giờ phải ân hận thốt lên câu "Giá như...".  
👉 **ToT** trên máy tính chính là sự thấu đáo, chín chắn của người già được lập trình vào câu lệnh.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Lập 3 kịch bản xử lý khoản nợ có nguy cơ rủi ro cao"*

Khi một khoản vay doanh nghiệp 20 tỷ VNĐ tại Agribank bị quá hạn 60 ngày, một cán bộ tín dụng chuyên nghiệp sẽ không vội vàng chọn ngay một biện pháp cực đoan. Họ sẽ dùng Prompt ToT để AI mô phỏng **Cây quyết định 3 nhánh**:

```text
BẠN LÀ: Trưởng ban Xử lý nợ chi nhánh ngân hàng.
HỒ SƠ: Doanh nghiệp chế biến thủy sản nợ quá hạn 20 tỷ. Tài sản thế chấp là nhà xưởng và kho lạnh (định giá 25 tỷ). Doanh nghiệp đang thiếu vốn lưu động tạm thời vì đối tác Mỹ chậm thanh toán lô hàng.

YÊU CẦU: Áp dụng phương pháp Cây tư duy (Tree-of-Thoughts) để phân tích:

NHÁNH 1: KHỞI KIỆN RA TÒA VÀ THU GIỮ TÀI SẢN NGAY
- Chi phí pháp lý & thời gian kéo dài: ?
- Giá trị tài sản phát mại khi thị trường đóng băng: ?
- Đánh giá khả năng thu hồi: [Khả thi / Bất lợi / Loại bỏ]

NHÁNH 2: TÁI CƠ CẤU THỜI HẠN TRẢ NỢ & GIÁM SÁT DÒNG TIỀN
- Điều kiện ràng buộc: Yêu cầu doanh nghiệp nộp lại toàn bộ hợp đồng xuất khẩu sang Mỹ.
- Rủi ro phát sinh: Nếu đối tác Mỹ quỵt nợ thì ngân hàng mất thêm 6 tháng.
- Đánh giá khả năng thu hồi: [Khả thi / Bất lợi / Loại bỏ]

NHÁNH 3: PHƯƠNG ÁN LAI (HYBRID)
- Vừa gia hạn 60 ngày, vừa yêu cầu bổ sung bảo lãnh cá nhân của Tổng giám đốc và phong tỏa tài khoản thanh toán nhận tiền từ Mỹ.
- Đánh giá khả năng thu hồi: [Tối ưu]

TỔNG HỢP & KẾT LUẬN:
So sánh 3 nhánh trên theo 3 tiêu chí: (1) Tỷ lệ bảo toàn vốn, (2) Thời gian xử lý, (3) Rủi ro pháp lý. Đưa ra lộ trình hành động chi tiết cho phương án thắng thế.
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Góc nhìn cấu trúc dữ liệu:** *Mô phỏng thuật toán Cây (Tree Traversal) và Bộ lọc (Filter/Backtrack)*

Nếu CoT là xử lý tuần tự một luồng (Single-thread linear), thì **Tree-of-Thoughts (ToT)** biến câu lệnh thành một thuật toán duyệt cây logic:
1. **Rẽ nhánh (Branching):** Yêu cầu AI sinh ra một mảng gồm 3 hướng giải quyết độc lập `[Branch A, Branch B, Branch C]`.
2. **Đánh giá & Cắt tỉa (Filter & Prune):** Chấm điểm từng nhánh. Bất kỳ nhánh nào gặp lỗi logic hoặc vi phạm ràng buộc sẽ bị loại bỏ (`filter(b => b.isValid)`).
3. **Quay lui (Backtracking):** Nếu nhánh đang đi dẫn tới ngõ cụt (Dead-end), AI tự động lùi lại trạng thái trước đó để thử nhánh tiếp theo.
4. **Tại sao Dev cần biết:** Khi xây dựng các tính năng như gợi ý code, thiết kế kiến trúc hệ thống, hoặc phân tích tài chính phức tạp, ToT giúp bạn kiểm soát được nhiều kịch bản mà không sợ AI bị "thiển cận" đâm đầu vào một phương án tồi ngay từ đầu.

```typescript
// Mô phỏng ToT Controller Engine
interface ThoughtNode {
  id: string;
  thought: string;
  score: number; // Đánh giá bởi Evaluator Prompt (0 -> 10)
  status: 'active' | 'pruned' | 'optimal';
  children: ThoughtNode[];
}

export const TreeOfThoughtsPrompt = `
You are a Tree-of-Thoughts Reasoning Engine.
Follow this strict algorithmic loop:
1. Phase 1 (Generate): Propose exactly 3 distinct, mutually exclusive strategies (Branch A, B, C).
2. Phase 2 (Evaluate): Critique each branch objectively. Assign a score from 0-10 based on feasibility, cost, and safety.
3. Phase 3 (Prune): Explicitly discard any branch scoring below 6 with justification.
4. Phase 4 (Synthesize): Continue expanding the highest-scoring branch to derive the final execution plan.
`;
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Chọn trò chơi hay nhất trong buổi tiệc sinh nhật mà không làm đổ vỡ đồ đạc.
- **Prompt mẫu ToT để thử:**
  ```text
  Hãy đưa ra 3 trò chơi cho tiệc sinh nhật 5 bạn nhỏ tại nhà:
  - Nhánh 1: Trò đá bóng trong phòng khách.
  - Nhánh 2: Trò thi hát kể chuyện vui.
  - Nhánh 3: Trò thi xếp tháp bánh kẹo.
  Hãy chấm điểm từng trò chơi theo 2 tiêu chí: (1) Có vui không? (2) Có an toàn và không làm vỡ bình hoa của mẹ không? Loại bỏ trò nguy hiểm nhất và chọn ra trò chơi số 1!
  ```
- **Kết quả mong đợi:** AI loại ngay nhánh đá bóng vì nguy cơ vỡ đồ; chọn trò xếp tháp kẹo là phương án tối ưu nhất.

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Gia đình bàn tính việc chọn ngày tổ chức Lễ mừng thọ 80 tuổi cho Cụ ông giữa 3 dịp trong năm.
- **Prompt mẫu ToT để thử:**
  ```text
  Hãy giúp gia đình tôi phân tích 3 thời điểm tổ chức Lễ mừng thọ 80 tuổi:
  - Nhánh 1: Dịp Tết Nguyên Đán (Tháng 1 Âm lịch).
  - Nhánh 2: Dịp tiết trời mùa thu mát mẻ (Tháng 8 Âm lịch).
  - Nhánh 3: Dịp nghỉ lễ dài ngày 30/4 - 1/5.
  Hãy phân tích ưu/nhược điểm từng nhánh theo 3 điều kiện: (1) Sức khỏe cụ già không chịu được quá nóng hoặc quá rét; (2) Con cháu ở xa có về đông đủ không; (3) Chi phí tàu xe đi lại. Đưa ra lựa chọn vẹn toàn nhất.
  ```
- **Kết quả mong đợi:** Nhánh tháng 8 Âm lịch được chọn vì thời tiết dịu mát, sức khỏe cụ đảm bảo nhất.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Xử lý khoản nợ quá hạn 10 tỷ của doanh nghiệp xuất khẩu thủ công mỹ nghệ bị đình trệ dòng tiền.
- **Prompt mẫu ToT:**
  ```text
  Bạn là Trưởng ban Xử lý Nợ Agribank.
  Hồ sơ: Khách hàng nợ quá hạn 60 ngày số tiền 10 tỷ. Tài sản thế chấp là nhà xưởng định giá 14 tỷ. Doanh nghiệp vừa ký được hợp đồng bao tiêu mới nhưng cần 4 tháng nữa mới giao hàng và nhận tiền thanh toán.
  
  Hãy áp dụng Cây tư duy (Tree-of-Thoughts) phân tích 3 nhánh hành động:
  - Nhánh 1: Khởi kiện ra tòa án, tiến hành phong tỏa và phát mại tài sản ngay.
  - Nhánh 2: Cơ cấu gia hạn nợ thêm 120 ngày kèm điều kiện mở tài khoản chuyên thu tại Agribank để quản lý dòng tiền từ hợp đồng mới.
  - Nhánh 3: Yêu cầu bổ sung thêm bảo lãnh cá nhân của các cổ đông và cho vay bổ sung 500 triệu vốn lưu động.
  
  Chấm điểm từng nhánh theo: (1) Khả năng thu hồi vốn 100%; (2) Thời gian giải quyết; (3) Rủi ro pháp lý. Kết luận phương án tối ưu nhất.
  ```
- **Tiêu chuẩn nghiệm thu:** AI chọn nhánh 2 là phương án hài hòa, tránh đưa tài sản vào giai đoạn phát mại kéo dài 2-3 năm gây đọng vốn.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Dùng ToT để lựa chọn giải pháp lưu trữ dữ liệu (Database Architecture) cho hệ thống ghi nhận lịch sử giao dịch ngân hàng lớn.
- **Yêu cầu thực hành (Chạy trực tiếp trên Prompt Playground):**
  ```text
  Role: Enterprise Solutions Architect.
  Task: Evaluate 3 Database Architecture branches for storing 50 million transaction logs/month:
  - Branch A: Single PostgreSQL instance with table partitioning by month.
  - Branch B: Managed MongoDB cluster with sharding.
  - Branch C: AWS S3 Data Lake + Parquet columnar format queried via Athena.
  
  Evaluation Matrix: Score each branch (1-10) on:
  1. Operational Maintenance Overhead (ít tốn công DevOps nhất).
  2. Query Latency for compliance auditing (tra cứu theo số tài khoản < 2 giây).
  3. Monthly Storage Cost.
  
  Pruning Rule: Discard any branch with operational overhead score < 7.
  Synthesize the final winning architecture recommendation.
  ```
- **Tiêu chuẩn nghiệm thu:** AI phân tích rõ ràng ma trận điểm số, loại bỏ phương án có chi phí DevOps cao, đưa ra khuyến nghị kiến trúc rõ ràng.

## ⚠️ Quy Tắc Vàng
- **Đừng để cây quá rậm rạp:** Số nhánh sinh ra ở mỗi bước chỉ nên từ 2 đến 3 nhánh ($b \le 3$). Nếu để AI sinh 10 nhánh, mô hình sẽ bị loãng bối cảnh và tốn chi phí token theo cấp số nhân ($O(b^d)$).
