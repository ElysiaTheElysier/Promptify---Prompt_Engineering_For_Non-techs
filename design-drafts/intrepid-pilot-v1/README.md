# Promptify Intrepid — Enterprise AI Learning Workbench Prototype Suite
**Phiên bản UI tĩnh đa biến thể phục vụ Review & Handoff Stakeholders**  
*Cập nhật theo 4 tài liệu MD và Kế hoạch triển khai Excel (Mục tiêu nghiệm thu: 23/10/2026)*

---

## 1. Hướng dẫn mở và gửi đi (Zero Dependency)

Toàn bộ prototype nằm trong thư mục `design-drafts/intrepid-pilot-v1/`:
- **Không cần chạy terminal**, không cần `npm run dev` hay kết nối database.
- Có thể nén zip thư mục này hoặc gửi trực tiếp file HTML qua Email / Slack. Người nhận chỉ cần **double-click mở bằng bất kỳ trình duyệt nào** (Chrome, Edge, Safari, Firefox).

### Các tệp chính:
1. [**`index.html`**](file:///c:/Ki_OJT/PromptforNontech/design-drafts/intrepid-pilot-v1/index.html): **Master Deck & Switchboard** — Bộ điều khiển trung tâm cho phép chuyển đổi tức thì giữa cả 3 vai trò (Learner, Trainer, Head), 2 phong cách giao diện (V1 Spatial vs V2 Guided), và 2 chế độ (Onboarding vs Workspace).
2. [**`version-1-workbench.html`**](file:///c:/Ki_OJT/PromptforNontech/design-drafts/intrepid-pilot-v1/version-1-workbench.html): **Version 1 (AI Studio Spatial Workbench)** — Bản thiết kế mật độ cao, 3 cột liền mạch, tối ưu cho thực hành tốc độ cao và chuyên sâu.
3. [**`version-2-guided.html`**](file:///c:/Ki_OJT/PromptforNontech/design-drafts/intrepid-pilot-v1/version-2-guided.html): **Version 2 (Guided Executive Enterprise)** — Bản thiết kế dạng quy trình từng bước (stepper), trực quan cho quản lý doanh nghiệp và báo cáo nghiệm thu.
4. `styles.css` & `prototype.js`: Hệ thống design tokens, logic mô phỏng AI Judge, đồng bộ Google Sheet, và so sánh Attempt.

---

## 2. Bám sát Nguồn sự thật (4 Files MD & 1 Excel Plan)

Mọi luồng nghiệp vụ và chi tiết giao diện được ánh xạ chính xác từ bộ tài liệu `docs/`:

### 1. `00_PRODUCT_SOURCE_OF_TRUTH.md` & `03_DECISION_LOG.md`:
- **Target Product Phase 1**: Bản Promptify nội bộ phục vụ Intrepid, đào tạo và thực hành prompt theo từng Business Function (27 phòng ban, 6 quốc gia).
- **Nguyên lý cốt lõi**: *"Output là đích, kỹ thuật prompt là phương tiện."*
- **3 Nhóm người dùng đã xác nhận**:
  1. **Learner (Nhân viên Intrepid)**: Nguyễn Hải Đăng (`dang.nguyen@intrepid.asia`, Commercial Operations, Singapore).
  2. **Trainer chính duy nhất**: Thầy Võ Tự Đức (`duc.vo@intrepid.asia`).
  3. **Head / PIC phòng ban**: Sarah Tan (`sarah.tan@intrepid.asia`, Head of Commercial, Singapore).
- **Bảo mật GCP AI Key**: Key dùng chung của Intrepid trong môi trường GCP do IT kiểm soát; học viên **không tự cấp key** và hệ thống chỉ hiển thị trạng thái kết nối masked (`GCP AI Gateway: Active`), tuyệt đối không lộ secret thô.

### 2. `02_IMPLEMENTATION_PLAN.md` & Excel `Promptify_Intrepid_Progress_06-23_Oct_2026.xlsx`:
- **5 Mốc triển khai (M1 → M5)** được tích hợp trực tiếp vào thanh theo dõi của Trainer:
  - **M1 (06–08/10)**: Identity foundation, Corporate SSO, chặn tài khoản ngoài `@intrepid.asia`.
  - **M2 (09–12/10)**: Google Sheet Roster Connector, đối chiếu hồ sơ và Department Zone.
  - **M3 (13–16/10)**: Learning Vertical Slice (SOP-MKT-042, Run AI thật, Rubric, Compare).
  - **M4 (17–20/10)**: Quyền Trainer & Head (Phân lập quyền truy cập tuyệt đối theo phòng ban).
  - **M5 (21–23/10)**: Rehearsal bằng dữ liệu thật, sửa blocker và nghiệm thu pilot 23/10.

---

## 3. Chi tiết Mock chức năng cho từng loại User

### 🎓 1. Learner (Nhân viên Intrepid — Commercial Operations)
- **Luồng Onboarding (Bước 1 → 3)**:
  - **Bước 1**: Đăng nhập Corporate SSO bằng email `@intrepid.asia`.
  - **Bước 2**: Đối chiếu Google Sheet Roster & Xác nhận hồ sơ (Họ tên, Email, Business Function, Quốc gia). Có nút **"Xác nhận & Vào Zone"** hoặc **"Báo lỗi Roster"** gửi đến Thầy Đức (không tự ý tăng quyền).
  - **Bước 3**: Điều hướng chính xác vào Learning Zone của phòng ban Commercial Operations.
- **Không gian thực hành bài học (M3 Vertical Slice)**:
  - **Bài học thực tế**: *Lesson 02: SOP-MKT-042 CAC Anomaly Synthesis & Reporting*.
  - **Tài liệu nghiệp vụ**: Link tài liệu SOP-MKT-042 (ngưỡng cảnh báo chi phí CAC tăng >25% WoW) và bảng dữ liệu chiến dịch Q4 Lazada (Ad spend, ROAS, CAC).
  - **Prompt Composer**: Thẻ cấu trúc prompt (`+ Role`, `+ Context`, `+ Constraints`, `+ Format`), đếm token, model Gemini 1.5 Pro qua GCP.
  - **Live AI Execution**: Nút **Run Live AI** kèm hiệu ứng gọi API và trả về báo cáo chuẩn format markdown.
  - **AI Judge Scorecard**: Đánh giá 4 tiêu chí rubric (Mục tiêu & Role, SOP Grounding, Ràng buộc, Định dạng bảng), chấm điểm (Attempt 1: 7.2 → Attempt 2: 8.8 / 10).
  - **So sánh 2 lần chạy (Compare Attempts)**: Modal xem diff song song giữa Attempt 1 (viết sơ sài) và Attempt 2 (bám sát SOP), hiển thị rõ mức cải thiện +1.6 điểm.

---

### 👨‍🏫 2. Trainer (Võ Tự Đức — Trainer chính duy nhất)
- **Bảng điều khiển tiến độ Pilot**:
  - Đếm ngược đến deadline 23/10/2026.
  - Thanh trạng thái trực quan 5 Milestones (M1 → M5) lấy trực tiếp từ file Excel tiến độ.
- **Google Sheet Roster Connector (M2 Requirement)**:
  - Kết nối Sheet ID và Tab `Pilot_Learners_Oct26`.
  - Nút **"Sync Google Sheet Roster"** mô phỏng đồng bộ dữ liệu thời gian thực.
  - Bảng chẩn đoán dữ liệu theo từng dòng:
    - Hiển thị 25 học viên hợp lệ đã được pre-onboard.
    - Cảnh báo dòng lỗi rõ ràng: Dòng 14 (sai email domain ngoài intrepid.asia), Dòng 22 (thiếu phòng ban).
- **Quản lý học liệu & Gán SOP (M4 Requirement)**:
  - Form gán link tài liệu SOP (`https://intrepid.box.com/s/...`) và mẫu dữ liệu thực tế vào bài học.
  - Phân bổ bài học cho cohort phòng ban Commercial Operations.

---

### 👔 3. Head / PIC phòng ban (Sarah Tan — Head of Commercial)
- **Cô lập quyền truy cập tuyệt đối (Department Isolation Banner)**:
  - Banner bảo mật hiển thị rõ: *Scoped strictly to: Commercial Operations (14 Learners) · Read-Only Access*.
  - Không có quyền xem hay can thiệp vào dữ liệu của các phòng ban khác (HR, Finance, Ops).
- **Báo cáo tiến độ đội ngũ (Read-Only)**:
  - 4 thẻ KPI: Tỷ lệ Onboard (100%), Tỷ lệ hoàn thành lượt chạy (85.7%), Tỷ lệ đạt chuẩn thành thạo (64.3%), Điểm trung bình (8.4/10).
  - Bảng theo dõi tiến độ chi tiết từng nhân viên (Số lần chạy, Điểm cao nhất, Trạng thái Completed vs Mastery).
- **Cổng phản hồi SOP & Dữ liệu mẫu (D04 Requirement)**:
  - Form tương tác để Trưởng phòng xác nhận SOP hiện tại còn chuẩn không, gửi link SOP mới và dán dữ liệu mẫu thực tế của doanh nghiệp cho Thầy Đức tích hợp vào bài giảng.

---

## 4. Bảng so sánh 2 phong cách giao diện (Version 1 vs Version 2)

| Đặc tính | Version 1: Spatial Workbench | Version 2: Guided Executive Enterprise |
| :--- | :--- | :--- |
| **Cảm hứng** | Google AI Studio & Linear | Enterprise LMS & Stepped Wizard |
| **Bố cục** | 3 cột không gian liền mạch (SOP → Prompt → Output & Rubric) | 2 cột lớn kết hợp Stepper thanh tiến trình ở trên |
| **Mật độ thông tin** | Cao (High-density), tối ưu cho người làm việc liên tục | Thoáng, phân đoạn rõ ràng từng bước |
| **Phù hợp nhất cho** | Nhân viên làm việc hàng ngày, thực hành prompt chuyên sâu | Buổi thuyết trình quản lý, demo cho ban giám đốc/stakeholder |
| **File mở trực tiếp** | `version-1-workbench.html` | `version-2-guided.html` |

---

## 5. Hướng dẫn Test các luồng trực tiếp trên `index.html`

Trên thanh điều khiển màu đen ở đầu trang:
1. **Đổi vai trò**: Bấm vào `🎓 Learner`, `👨‍🏫 Trainer`, hoặc `👔 Head` để thấy giao diện và quyền hạn của từng người.
2. **Xem luồng Onboarding**: Bấm nút `🟢 Onboarding Flow` để trải nghiệm từng bước đăng nhập SSO, đối chiếu Roster và vào Zone.
3. **Chạy thử AI**: Bấm nút `Run Live AI (Cmd+Enter)` để xem quá trình giả lập gửi prompt tới GCP và nhận điểm Rubric 8.8/10.
4. **Xem So sánh**: Bấm nút `⚖️ Compare` để xem bảng so sánh diff giữa 2 lần chạy.
5. **Thử đồng bộ Roster**: Đổi sang vai trò Trainer rồi bấm `Sync Google Sheet Roster`.
6. **Thử gửi phản hồi SOP**: Đổi sang vai trò Head và gửi form đóng góp dữ liệu mẫu.
7. **Đổi ngôn ngữ**: Bấm `EN` hoặc `VI` ở góc phải thanh điều khiển.

