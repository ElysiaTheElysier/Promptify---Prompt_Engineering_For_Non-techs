# Hướng dẫn test E2E toàn bộ chức năng — Promptify Intrepid (staging)

Lập 28/10/2026 từ code hiện tại (`apps/promptify-intrepid/src/components/rebuild/*`) và tài liệu `01_CURRENT_STATE.md`, `DEMO_SCRIPT.md`, `UPDATES_2026-10-26_27.md`. Tên nút/màn hình lấy đúng từ code (EN / VI). Đánh `[x]` khi PASS, ghi lỗi vào cột ghi chú cuối file.

URL: `https://ai-transformation-510302-intrepid-staging.web.app` (mở URL gốc, **không** kèm `?classId=`).

## 0. Chuẩn bị

| # | Việc | Ghi chú |
| --- | --- | --- |
| 0.1 | 4 vùng trình duyệt tách biệt, mỗi vùng **một** tài khoản: Edge = **Admin**, Edge InPrivate = **Instructor/Head**, Chrome = **Learner A**, Chrome Incognito = **Learner B** | Firebase dùng chung phiên trong cùng profile; đổi tài khoản ở một tab là các tab khác bị "Access Restricted" |
| 0.2 | Admin: `duonglh.work@gmail.com`. Head: `kangseobi…@gmail.com`. Learner: `demo.biz@intrepid.asia`, `manhmanh…@gmail.com` | Instructor riêng: tạo ở bước 2.3 (hoặc dùng Admin đóng vai) |
| 0.3 | Một **Google Sheet giả lập** (dữ liệu hư cấu), share quyền đọc cho service account của staging | Tải mẫu ở bước 3.1. Không dùng danh sách nhân viên thật |
| 0.4 | Mở staging ở cả 4 vùng, Ctrl+Shift+R | Tránh lỗi DB idle lần gọi đầu |
| 0.5 | Ghi lại: giờ bắt đầu, số lần Run/Judge đã bấm | Mỗi Run = 1 lời gọi Generation; mỗi AI Judge = 1 lời gọi/tiêu chí + supervisor (5 tiêu chí ≈ 6 lời gọi). Quota learner: 40 Run/giờ, 200/ngày |

Màn hình theo vai (`?ui=`): Learner `04` Hub, `05` Workspace, `06` Compare, `07` Scorecard, `13` SOP. Instructor `09` Workshop, `10` Inspector, `11` Studio, `12` Analytics, `13`, `15` Roster. Head chỉ `12`. Admin thêm `14` Governance. Sau đăng nhập: learner → 04, head → 12, admin → 14, instructor → 09.

---

## 1. Đăng nhập và phân quyền (mọi vai)

- [ ] 1.1 Admin đăng nhập Google → tự vào **System governance / Quản trị hệ thống** (UI14).
- [ ] 1.2 Head đăng nhập → vào **Learning analytics** (UI12); menu chỉ có Analytics.
- [ ] 1.3 Learner A đăng nhập lần đầu → **Profile confirmation** (UI02): kiểm tra tên, phòng ban, country lấy từ roster; sửa phòng ban → xác nhận → vào Hub (UI04).
- [ ] 1.4 Email **không có** trong roster/domain → bị chặn (Access denied, UI03).
- [ ] 1.5 Learner tự gõ `?ui=14` hoặc `?ui=11` → không vào được màn quản trị (403 / bị đẩy về Hub).
- [ ] 1.6 Đổi ngôn ngữ **EN/VI** ở menu, mọi màn hình đổi theo.

## 2. Admin — Governance (UI14)

- [ ] 2.1 **Enterprise domain whitelist → Add domain**: thêm domain test (vd `example.test`), **Disable** rồi **Enable** lại. Có dòng mới trong **Immutable action audit**.
- [ ] 2.2 Xem **Server credential vault / Configured model**: phải là `gemini-3.8-flash`. **Không bấm** "Open provider to rotate".
- [ ] 2.3 **Class administration access → Grant assigned access**: nhập email Instructor test, Role = **Instructor**, Course permission = **Editor**, Reason. Đăng nhập email đó → vào **Workshop** (UI09).
- [ ] 2.4 Cấp quyền **Department head** (Viewer) cho Head trên đúng 1 lớp → Head chỉ thấy lớp đó trong bộ chọn lớp ở Analytics, không thấy lớp khác.
- [ ] 2.5 Thu hồi quyền vừa cấp ở 2.3 → instructor đó reload, mất quyền.
- [ ] 2.6 **Access requests** (nếu có yêu cầu từ learner ở bước 6.10): duyệt / từ chối.

## 3. Instructor — Tạo khoá/lớp và roster (UI11 Studio, UI15 Roster)

### 3.1 Tạo lab (Codelab) — **Curriculum Studio** (UI11)
- [ ] Bấm **Create Codelab**, nhập **New Codelab title** → Codelab mới ở trạng thái **Draft**.
- [ ] Tab **1. Onboarding & Scope**: Codelab title, Business scenario brief, Learning objectives (mỗi dòng 1 ý), Target competencies, Curriculum pillar, Eligible onboarding departments, Access tier (**Basic · Free** / **Advanced · Paid**), Starts at / Expires at (ISO có múi giờ, vd `2026-10-28T09:00:00+07:00`).
- [ ] Tab **2. System & Scaffolds**: Task requirement, Starter prompt, **Add variable** (Variable name, Sample value), **Add scaffold** + **Linked criterion**.
- [ ] Tab **3. SOP & Materials**: **Add material** (Material title, type), xem **Inspect indexed text** của SOP đã duyệt.
- [ ] Tab **5. Gamification & Awards**: **Add badge**, Certificate title, Certificate template URL.
- [ ] Lưu → reload trang → mọi trường còn nguyên. **Change log** có bản ghi.
- [ ] Đổi **Lifecycle** sang **Active** (hoặc **Scheduled** với Starts at ở tương lai) → Learner thấy lab ở Hub (bước 6.2). Lab **Draft** thì learner **không** thấy.
- [ ] Bỏ trường bắt buộc rồi lưu → báo lỗi, không lưu.
- [ ] Sửa rồi rời trang chưa lưu → hỏi **Discard unsaved changes?**

### 3.2 Sửa rubric — tab **4. Rubric & Sandbox** (RubricEditor)
- [ ] Rubric mặc định 5 tiêu chí (30/20/20/15/15), **Passing score (0–10)** = 8.
- [ ] **Add criterion** đến 8 tiêu chí → không thêm được tiêu chí thứ 9.
- [ ] **Remove** xuống 1 tiêu chí → không xoá được tiêu chí cuối.
- [ ] Sửa **Weight (%)** để **Total** ≠ 100 → hiện "Weights of graded criteria must total 100%." và chặn lưu.
- [ ] Để trống **Criterion name** → "Every criterion needs a name." và chặn lưu.
- [ ] Xoá tiêu chí đang gắn với badge/scaffold → bị chặn lưu (badge mất tiêu chí).
- [ ] Xem **Preview: what the AI Judge receives** khớp với rubric vừa sửa.
- [ ] **Restore 5-criterion template** → về lại mẫu 5 tiêu chí.
- [ ] Lưu rubric 3 tiêu chí → ở **Validation sandbox**: nhập **Test prompt** → **Run sandbox** → bảng điểm có đúng 3 tiêu chí. (Tốn AI; sandbox không trừ quota learner.) Nếu chưa lưu, phải hiện "Save changes before testing."
- [ ] Sau khi learner nộp bài (bước 6), Judge dùng **rubric mới** (số tiêu chí trong scorecard khớp).

### 3.3 Tạo lớp (cohort) — **Manage cohorts / Quản lý lớp**
- [ ] **Create a cohort in this course**: Cohort code, Department, Start date, End date → **Create cohort**. End < Start thì nút bị khoá.
- [ ] Lớp mới xuất hiện ở bộ chọn lớp (góc trên).
- [ ] Đổi trạng thái lớp: nhập **Reason** → **Upcoming / Active / Completed / Archived** → xác nhận. Không có Reason thì nút khoá. Lớp **Completed/Archived** → learner mất quyền vào lớp (kiểm ở bước 6.11).

### 3.4 Roster Sheet — **Roster connections** (UI15)
Chọn đúng lớp vừa tạo ở bộ chọn lớp trước khi làm.
- [ ] **Download six-tab Excel template** → mở được, có 6 tab Sync, Users, Department, SOPs, Main PIC, Report.
- [ ] Tạo Google Sheet (layout **Country / Department / User / SOP tables** hoặc **Six-tab workbook v1**), điền 3 học viên giả lập (Email, Full Name, Department = phòng ban của lớp, Country). Một học viên là **Learner B**.
- [ ] **Add connection** / **Add workbook**: Connection name + Google Sheets URL (+ **Column mapping**: Email, Department, Country bắt buộc; Full name tuỳ chọn; **Bounded range** có header) → lưu → hiện ở **Connections**.
- [ ] **Sync roster / Start new sync** → **Sync logs** có dòng **Success**, **Processed rows** = 3.
- [ ] Sheet sai (thiếu cột Email, sai tab, URL không share) → log **Failed**, không ghi dữ liệu nửa chừng; bấm sync lại được ngay (không bị 409).

### 3.5 Thêm học viên
- [ ] Thêm 1 dòng mới vào Sheet → **Sync** → Processed tăng; Learner B đăng nhập được, vào Profile confirmation rồi Hub thấy lab của lớp.
- [ ] Sửa tên/phòng ban 1 học viên trong Sheet → Sync → dữ liệu cập nhật (Update).
- [ ] Dòng có phòng ban **khác** phòng ban lớp → bị bỏ qua (sync theo phòng ban của lớp).

### 3.6 Xoá học viên
- [ ] Xoá dòng Learner B khỏi Sheet → Sync → Learner B reload: mất quyền vào lớp, không mở được Workspace/SOP gốc.
- [ ] Lịch sử bài làm của Learner B **không bị xoá** (Instructor vẫn thấy ở Inspector).
- [ ] Học viên được cấp **thủ công** (không phải từ Sheet, vd Demo/Manh) **không bị xoá** khi vắng trong Sheet.
- [ ] Thêm lại dòng Learner B → Sync → được vào lại.
- [ ] Lưu ý: với workbook **v1/v2** UI ghi "Missing users are not automatically deleted" — ghi lại hành vi thực tế quan sát được, đây là điểm cần làm rõ.
- [ ] (Tuỳ chọn) **Enable scheduled sync**: hiện **chưa chạy live** (Scheduler PAUSED) → chỉ kiểm nút bật/tắt đổi trạng thái, không kỳ vọng tự sync.

### 3.7 Chuyển vai học viên
- [ ] **Promote learner to facilitator**: email learner đã có + Permission + Reason → **Promote**. Người đó không còn vào không gian học viên. (Chỉ làm với tài khoản test.)

## 4. Instructor — Vận hành workshop (UI09, UI10)

- [ ] 4.1 **Workshop control**: chọn lớp, **Cohort pulse** hiện Active learners, Attempts, Average Judge score; **Find learner** lọc được.
- [ ] 4.2 **Broadcast message** → **Send broadcast** → Learner A thấy ở "Messages from your facilitator" → **Got it / Mark as read**.
- [ ] 4.3 **Private hint** cho đúng Learner A → Learner A thấy, Learner B **không** thấy.
- [ ] 4.4 Learner A gửi **Request a hint** (≥10 ký tự) → Instructor thấy ở **Hint requests** → **Approve & show hints** (lần sau thử **Decline**) → Learner thấy kết quả ở tab Hints.
- [ ] 4.5 **Inspect prompt** → **Open full learner inspector** (UI10): thấy các attempt V1, V2…, output, điểm từng tiêu chí.
- [ ] 4.6 **PII warning**: learner dán email/số điện thoại giả vào prompt → Instructor thấy cảnh báo PII.
- [ ] 4.7 **Live session controls**: kết thúc phiên → hỏi xác nhận "cannot be resumed" (chỉ làm ở lớp test).

## 5. Head — Báo cáo (UI12) và thư viện prompt

- [ ] 5.1 Analytics: chọn **Cohort**, **From/Through** → Enrolled, Completed, Attempts, Average score thay đổi theo bộ lọc. Không thấy lớp chưa được cấp.
- [ ] 5.2 **Export CSV** tải được và số khớp màn hình. **Print / PDF report** mở được.
- [ ] 5.3 **Hours saved / annual ROI**: không có dữ liệu thì hiện "Requires measured work-time and cost inputs." (không bịa số).
- [ ] 5.4 **Prompt library**: template learner chia sẻ ở bước 6.9 hiện "Awaiting Head review" → **Approve sharing** (lần sau **Reject** có Review reason) → learner khác cùng phòng ban thấy ở "Department shared".

## 6. Learner — Làm bài và nhận kết quả (UI04 → 05 → 07)

- [ ] 6.1 Hub: Welcome back, **Your labs**, **Search labs**, lọc pillar, tiến độ, **Department SOP library**.
- [ ] 6.2 Lab vừa Active ở bước 3.1 hiện ở **Your labs**; lab Draft / hết hạn / **Locked by schedule** không mở được.
- [ ] 6.3 **Start lab** → Workspace 3 cột (ngữ cảnh / prompt / kết quả). Thấy Lesson context, Authorized SOP, Starter prompt, biến (**Bound variables**).
- [ ] 6.4 Dùng **Insert scaffold** / **5 Standard Elements Framework** để chèn khung; **Mask personal information**.
- [ ] 6.5 Viết prompt (mẫu ở `DEMO_SCRIPT.md` mục 3) → **Run prompt** → "Generating your response…" → output hiện, **Copy output** được.
- [ ] 6.6 Bấm **AI Judge** → tiêu chí hiện dần (stream) → điểm **x/10**, mở **Full diagnostic scorecard**: đủ số tiêu chí **theo rubric hiện tại**, có lý do + gợi ý sửa. Thời gian kỳ vọng ~5–7 s (p95 hôm 26/10).
- [ ] 6.7 Refresh trang / mở tab thứ hai / bấm AI Judge 2 lần → vẫn **chỉ 1** kết quả chấm, không 409 kẹt.
- [ ] 6.8 Sửa prompt → Run lần 2 → **Attempt history** có V2 → **Compare attempts** so sánh 2 bản (OFFLINE trước đây — cần nghiệm thu live).
- [ ] 6.9 Lưu prompt vào **Prompt library** (Personal) → chia sẻ phòng ban → chờ Head duyệt (bước 5.4).
- [ ] 6.10 Lab Advanced khi đang Basic → **Request ADVANCE access** → "Access request submitted." (Admin duyệt ở 2.6).
- [ ] 6.11 Mở SOP từ bài lab (UI13) → **Copy citation**, **Mở tệp gốc** tải đúng file → quay lại: nút "Về bài lab: <tên bài>" giữ nguyên bản nháp (chưa kiểm khi đăng nhập trên staging).
- [ ] 6.12 Đạt ≥ ngưỡng → Hub cập nhật Best score, **labs completed**; **Your certificate → Download PDF** (nếu instructor đã cấu hình); badge ở **My digital badges**.
- [ ] 6.13 Đóng lớp (bước 3.3 → Completed) → learner mất quyền Run ở lớp đó.
- [ ] 6.14 Lỗi: tắt mạng khi Run → hiện lỗi cụ thể + **Keep my draft and retry**, bản nháp không mất.

## 7. Kiểm tra chéo cuối

- [ ] Instructor Inspector (4.5) thấy đúng attempt + điểm của 6.5–6.8.
- [ ] Head Analytics (5.1) đếm thêm đúng số attempt/learner.
- [ ] Admin audit log có đủ: domain, grant access, cohort status, roster sync, promote.

## Ghi nhận lỗi

| Bước | Vai | Kỳ vọng | Thực tế | Ảnh/giờ |
| --- | --- | --- | --- | --- |
| 1.1 | Admin | Đã đăng nhập, mở URL gốc → tự vào UI14 | Vẫn hiện landing page; phải gõ `?ui=14` | 28/10 |
| 1.x | Learner | Email có trong roster → vào Hub | URL còn `classId` lớp không được cấp → báo nhầm "Email Not Found in Company Roster" (thực chất 403) | 28/10 |
| 2.x | Admin | Audit log cho biết ai làm | Cột Actor chỉ hiện UUID | 28/10 |
| 2.x | Admin | Thẻ "Domain Whitelists" khớp danh sách | Hiện 0 trong khi có domain `example.test` active | 28/10 |
| 3.1 | Instructor | Hộp "New Codelab title" có nút rõ ràng | Nút "Create draft" không hiện chữ | 28/10 |
| 3.1 | Instructor | Nhập được "Key Practice Objectives" | Có nhãn nhưng không có ô nhập | 28/10 |
| 3.1 | Instructor | Placeholder theo ngôn ngữ EN | Ô biến hiện placeholder tiếng Việt khi đang EN | 28/10 |
| 3.3 | Instructor | Tạo lớp / đổi trạng thái lớp | "Manage cohorts" không render: UI 9/11/14/15 return sớm ở `ProductionApp.tsx:215-220`, trước dòng 235. **Đã sửa local 28/10** (mount trong `scoped`, test `verify_cohort_manager_mount.mjs`, OFFLINE 85/85), chưa deploy | 28/10 (CODE) |
| 3.6 | Learner/Head | Learner Demo và Head có lớp Northstar (theo DEMO_SCRIPT 23/10) | Hiện không thấy Northstar trong bộ chọn lớp; cần Admin kiểm tra | 28/10 |
| 6.8 | Learner | Compare attempts từ màn scorecard | Bấm không chuyển màn; chưa nghiệm thu | 28/10 |

PASS (LIVE 28/10): 2.1 domain thêm/tắt/bật; 3.1 tạo lab nháp + lưu Tab 1/2; 3.2 rubric (giới hạn 8, tên trống chặn lưu, tự cân 100%, lưu 4 tiêu chí); xuất bản lab Active; 3.4 Sync Now success (4 dòng, 0 lỗi); 6.5–6.6 Run + AI Judge 10/10. Bị chặn: 2.3 cấp quyền (auto-mode classifier). Video: `apps/promptify-intrepid/outputs/e2e-videos-2026-10-28/`.

## Ngoài phạm vi / đã biết chưa có

Không test (chưa tồn tại hoặc đã biết FAIL): đồng bộ roster theo lịch (Scheduler PAUSED), tải 100 người đồng thời, rate limit 20/phút, hạn mức 50k token/phiên, chế độ chỉ đọc khi hết hạn, chặn prompt injection. Không bấm "Open provider to rotate", không đổi model/ngưỡng/quota.
