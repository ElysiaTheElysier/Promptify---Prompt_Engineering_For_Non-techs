# BÀI 19: ACTION BREAKDOWN & RACI SYNTHESIS (BIẾN BIÊN BẢN HỌP THÀNH VIỆC LÀM 15 PHÚT)
> **Mã chuyên đề:** `MOD-19-ACTION-BREAKDOWN`  
> **Thuộc nhóm:** Kỹ năng công sở & Nghiệp vụ thực chiến (Workplace Superpowers)  
> **Mục tiêu:** Giải quyết triệt để vấn đề "họp xong để đó". Biến các ghi chép lộn xộn sau cuộc họp 2 tiếng thành một bản phân bổ công việc sắc bén theo Ma trận RACI và danh sách các đầu việc nhỏ hoàn thành trong 15 phút.

---

## 🧭 Khái Niệm Tổng Quan (Executive Summary)
Một trong những nỗi thất vọng lớn nhất chốn công sở: Cuộc họp kéo dài 2 tiếng với hàng chục ý kiến tranh luận sôi nổi, nhưng khi bước ra khỏi phòng họp, không ai biết sáng mai mình phải làm gì trước.  
Các biên bản cuộc họp thường mắc 3 căn bệnh:
1. Giao việc chung chung: *"Phòng Kế toán phối hợp với phòng Tín dụng triển khai"* ➔ Không ai chịu trách nhiệm chính.
2. Thiếu mốc thời gian (Deadline) cụ thể.
3. Đầu việc quá to tát khiến nhân viên bị tê liệt (Procrastination).

**Action Breakdown Prompting** biến AI thành một **"Thư ký điều phối dự án chuyên nghiệp"**: Tự động bóc tách các cuộc tranh luận thành công thức bất biến:  
> **"AI LÀM CÁI GÌ — XONG TRƯỚC MẤY GIỜ — NỘP SẢN PHẨM GÌ CHO AI"**.

---

## 👥 4 Tầng Nhận Thức (Multi-Persona Explanation)

### 👶 Level 1: Trẻ Em (Explain Like I'm 5 / Kid)
> **Ẩn dụ:** *"Phân công dọn dẹp sau bữa tiệc sinh nhật"*

Sau khi bữa tiệc sinh nhật kết thúc, phòng khách bừa bãi đầy vỏ hộp bánh, bóng bay và vỏ kẹo.  
Nếu mẹ chỉ đứng ở cửa và bảo: *"Các con ơi, dọn phòng đi nhé!"*, tất cả các bạn nhỏ sẽ nhìn nhau và không ai chịu làm, vì phòng quá bừa bộn không biết bắt đầu từ đâu.  
Mẹ thông minh sẽ chia việc rành rọt:
- *"Bạn Bi: Cầm túi rác nhặt hết vỏ hộp bánh trên sàn trong 3 phút!"*.
- *"Bạn Bông: Lấy khăn lau sạch bàn ăn!"*.
- *"Bạn Tí: Gom toàn bộ bóng bay cất vào góc phòng!"*.  
Mỗi bạn nhận một việc nhỏ xíu, thế là chỉ 5 phút sau, căn phòng đã sạch bong kin kít!  
👉 **Action Breakdown** chính là việc chia một đống việc khổng lồ thành từng việc nhỏ làm xong trong chớp mắt.

---

### 👵 Level 2: Người Cao Tuổi (Seniors / Elders)
> **Ẩn dụ:** *"Ban Khánh tiết làng chuẩn bị lễ hội đình làng đầu xuân"*

Mỗi dịp làng mở hội đình đầu xuân, các cụ trong làng họp bàn chuẩn bị trước cả tháng trời:  
Cụ Trùm làng cầm cuốn sổ tay, phân công rành mạch từng họ, từng người:
- *Ông Trưởng thôn:* Lo giấy phép trên ủy ban xã, xong trước ngày mùng 5.
- *Bác Đội trưởng tế:* Rà soát lại toàn bộ áo the khăn xếp của đội tế, giặt ủi sạch sẽ trước ngày mùng 8.
- *Tổ thanh niên:* Dựng rạp, cắm cờ ngũ sắc quanh sân đình, xong trước 17h chiều ngày mùng 9.  
Nhờ việc nào việc nấy có người đứng tên chịu trách nhiệm rõ ràng, đến ngày hội đình, lễ rước diễn ra tôn nghiêm, trật tự, trăm năm nay không bao giờ có chuyện lộn xộn, đùn đẩy trách nhiệm.  
👉 Đó chính là nghệ thuật điều phối công việc của tiền nhân: Tên người gắn liền với thời hạn dứt khoát.

---

### 💼 Level 3: Dân Nghiệp Vụ / Văn Phòng (Business / Banking Non-Tech)
> **Ẩn dụ:** *"Bảng phân bổ ma trận RACI và Nhiệm vụ 15 phút"*

#### Mẫu Prompt Xử lý Biên bản cuộc họp chuẩn mực:
```text
BẠN LÀ: Trợ lý Giám đốc Dự án kiêm Chuyên gia Điều phối Công việc Agribank.
DỮ LIỆU THÔ: [Dán toàn bộ ghi chép cuộc họp hoặc đoạn chat giao ban vào đây]

NHIỆM VỤ: Hãy chuyển đổi toàn bộ ghi chép trên thành một BẢNG HÀNH ĐỘNG THỰC THI (ACTIONABLE WORK PLAN) theo 3 phần bắt buộc:

PHẦN 1: BẢNG PHÂN CÔNG MA TRẬN RACI (BẢNG MARKDOWN 5 CỘT)
| Đầu việc cụ thể | Người phụ trách chính (R) | Người phê duyệt (A) | Người phối hợp (C) | Hạn chót (Deadline) |
(Ràng buộc: Cột 'Người phụ trách' bắt buộc phải ghi ĐÍCH DANH tên cá nhân, cấm ghi chung chung là 'phòng ban').

PHẦN 2: DANH SÁCH NHIỆM VỤ KHỞI ĐỘNG 15 PHÚT (QUICK WINS)
- Trích xuất 3 việc đơn giản nhất có thể làm xong ngay trong 15 phút đầu giờ sáng mai để tạo đà tiến độ (ví dụ: gửi email xin mẫu biểu, nhấc máy gọi phòng nhân sự).

PHẦN 3: CÁC NÚT THẮT CẦN GIẢI TỎA (BLOCKERS)
- Những vấn đề đang bị tắc chưa thể triển khai và ai có thẩm quyền quyết định để thông tắc.
```

---

### 💻 Level 4: Dân Kỹ Thuật (Base Tech / Developers / IT)
> **Bản chất kỹ thuật thực tế:** *Trích xuất thực thể hành động (Action Entity Extraction) thành cấu trúc JSON*

Trong xử lý dữ liệu cuộc họp:
- **Khử trùng lặp (Deduplication):** Cuộc họp 2 tiếng thường có nhiều người cùng nói về 1 chủ đề theo các từ ngữ khác nhau. Prompt cần thực hiện chuẩn hóa về một `Task Node` duy nhất.
- **Micro-task Slicing:** Ép mô hình phân rã các tác vụ có độ phức tạp cao (`Epic`) thành các đơn vị hành động nhỏ có thể định lượng (`Sub-tasks`).

```typescript
// Interface dữ liệu chuẩn cho Action Items
export interface ActionItem {
  id: string;
  description: string;
  assignee: string; // Tên cá nhân đích danh
  approver: string;
  deadline: string; // YYYY-MM-DD HH:mm
  isQuickWin15Min: boolean;
  deliverable: string; // Output cụ thể (file excel, email, tờ trình)
}
```

---

## 📝 Bộ Bài Tập Thực Hành Đa Tầng (Hands-on Practice by Level)

### 👶 Thử thách Level 1: Trẻ Em (Kid / Học sinh)
- **Tình huống:** Phòng ngủ của bé sau một ngày chơi đùa đang ngổn ngang đồ chơi, sách truyện và quần áo bẩn. Hãy nhờ AI chia nhỏ việc dọn phòng thành 3 màn chơi game vui nhộn.
- **Prompt mẫu để thử:**
  ```text
  Phòng của em bừa bộn quá: gấu bông dưới sàn, lego vương vãi, sách truyện trên bàn học và quần áo bẩn vứt trên giường. Em thấy ngại dọn quá.
  Hãy biến việc dọn phòng thành 3 'Màn chơi game mini', mỗi màn chỉ mất 5 phút và có tên thật ngầu để em dọn dẹp thật vui vẻ!
  ```
- **Kết quả mong đợi:** 
  - Màn 1: "Giải cứu Vương quốc Lego" (nhặt lego vào hộp).
  - Màn 2: "Đưa gấu bông và truyện về tổ" (xếp truyện lên giá).
  - Màn 3: "Biệt đội giặt là siêu tốc" (bỏ quần áo vào giỏ).

### 👵 Thử thách Level 2: Người Cao Tuổi (Seniors / Elders)
- **Tình huống:** Bác chuẩn bị tổ chức một mâm cơm giỗ gia đình chu đáo vào cuối tuần (khoảng 3 mâm cỗ). Hãy nhờ AI lập bảng phân chia công việc từ khâu đi chợ, sơ chế trước một ngày đến khâu nấu nướng để không bị vất vả dồn việc vào sáng hôm sau.
- **Prompt mẫu để thử:**
  ```text
  Tôi cần chuẩn bị 3 mâm cỗ giỗ truyền thống gồm: Gà luộc, nem rán, canh măng miến sườn, nộm tai heo, xôi gấc.
  Hãy phân chia công việc theo thời gian khoa học cho tôi:
  - Chiều hôm trước: Đi chợ mua gì, sơ chế trước món nào bảo quản tủ lạnh?
  - Sáng ngày giỗ: Thứ tự nấu các món ra sao để các món đều nóng sốt lúc 11h trưa?
  Trình bày bảng rõ ràng, dễ nhớ.
  ```
- **Kết quả mong đợi:** AI phân rã việc ngâm măng, gói nem sẵn từ chiều hôm trước; sáng hôm sau chỉ cần đồ xôi, luộc gà và rán nem, giúp bác chuẩn bị mâm cỗ thong thả, đẹp mắt.

### 💼 Thử thách Level 3: Dân Nghiệp Vụ / Văn Phòng (Business Non-Tech)
- **Tình huống ngân hàng:** Phân rã quy trình giải ngân một khoản vay vốn mua nhà dự án phức tạp thành Ma trận Hành động (Action Matrix - RACI sơ bộ) và Tổng hợp tiến độ thành 1 trang Dashboard tóm tắt.
- **Prompt mẫu để thử:**
  ```text
  Hồ sơ vay mua nhà dự án Masterise trị giá 4.5 tỷ đã được phê duyệt. Để giải ngân cần qua các bước: Công chứng hợp đồng mua bán, Đăng ký giao dịch bảo đảm, Mở tài khoản thanh toán phong tỏa tại ngân hàng, Thu phí bảo hiểm cháy nổ, Phát hành thông báo giải ngân.
  
  Nhiệm vụ:
  1. Phân rã thành Action Matrix bảng 5 cột: [Bước] | [Nội dung công việc] | [Bên thực hiện (Khách hàng/Ngân hàng/Công chứng)] | [Thời hạn tối đa] | [Chứng từ đầu ra].
  2. Tổng hợp (Executive Synthesis): Viết 3 gạch đầu dòng then chốt để Cán bộ Tín dụng giám sát không bị tắc nghẽn hồ sơ.
  ```
- **Tiêu chuẩn nghiệm thu:** Bảng phân rã chi tiết, rõ trách nhiệm từng bên, chỉ rõ khâu đăng ký giao dịch bảo đảm tại Văn phòng Đăng ký đất đai là điểm then chốt nhất cần theo dõi sát sao.

### 💻 Thử thách Level 4: Dân Kỹ Thuật / IT (Base Tech - Không nặng code)
- **Tình huống kỹ thuật:** Thiết kế một Task Decomposition Prompt phân rã một User Story phức tạp ở cấp độ Epic thành danh sách các Technical Sub-tasks chuẩn Jira/GitHub Issues kèm acceptance criteria mà không cần dùng tool ngoài.
- **Yêu cầu thực hành (Prompt Architecture trên Playground):**
  ```text
  System Prompt:
  You are an Agile Technical Lead & Scrum Master.
  Task: Break down a high-level Feature Request into granular Technical Implementation Sub-tasks across 4 layers:
  1. Database & Schema Migrations
  2. Backend Services & Business Logic APIs
  3. Frontend State & UI Components
  4. Integration & Edge-case Verification
  Format output strictly in Markdown Table format with columns: [Layer] | [Task Title] | [Acceptance Criteria] | [Risk Level (Low/Med/High)].

  Feature Request:
  "Implement a Biometric Quick-Login (FaceID / Fingerprint) for Mobile Banking app with automatic fallback to PIN when biometrics fail 3 times."
  ```
- **Kết quả mong đợi & Tiêu chuẩn nghiệm thu:**
  - AI phân rã thành các task kỹ thuật cụ thể: Cấu hình bảng lưu Biometric Token hash (Database); Endpoint xác thực và đếm số lần fail (Backend); Tích hợp React Native Biometrics SDK và UI Fallback màn hình nhập PIN (Frontend); Test case giả lập biometric mismatch và lockout policy.

## ⚠️ Quy Tắc Vàng
- **Không có tên người = Không ai làm.**
- **Không có giờ chót = Không bao giờ xong.**
- Prompt phân công công việc luôn phải có ràng buộc: *"Nếu trong biên bản không rõ ai làm, hãy liệt kê việc đó vào cột CẢNH BÁO: CHƯA CÓ NGƯỜI NHẬN TRÁCH NHIỆM"*.
