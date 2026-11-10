# Hướng dẫn test E2E từng bước cho người mới (10/11/2026)

Tài liệu này dẫn bạn đi một vòng ngắn, theo đúng thứ tự thao tác: tạo lớp mới, nối Google Sheet, upload slide, soạn bài, rồi cho học viên vào học. Mất khoảng 1,5 giờ.

- Muốn kiểm kỹ từng chi tiết thì dùng [KICH-BAN-E2E.md](KICH-BAN-E2E.md) (3–4 giờ). Hướng dẫn này là bản rút gọn của nó.
- Tài liệu mẫu nằm trong `materials/`. Toàn bộ là **giả lập**, thuộc công ty hư cấu Northstar Paperworks.
- Trang test: **https://ai-transformation-510302-intrepid-staging.web.app**. Đây là staging, không đụng tới dữ liệu thật.

> Bản ngày 10/11 đã có trên staging (API `rel2-1110`, Hosting `252262f6`). Trong bản này, Admin tự duyệt Sheet và Drive ngay trong app, không cần Claude deploy cho từng lớp nữa.

---

## Bước 0. Chuẩn bị (10 phút)

### 0.1 Mở trình duyệt riêng cho từng vai

Mỗi vai cần một trình duyệt hoặc hồ sơ riêng, vì mỗi cửa sổ chỉ giữ được một lần đăng nhập Google.

| Vai | Email | Mở bằng |
|---|---|---|
| Admin | `duonglh.work@gmail.com` | Edge |
| Giảng viên | `lhbjune101@gmail.com` | Edge InPrivate (Ctrl+Shift+N) |
| Học viên A | `demo.biz@intrepid.asia` | Chrome Incognito (Ctrl+Shift+N) |
| Học viên B | `manhmanh100127@gmail.com` | Firefox |

Mỗi email chỉ được giữ **một vai**. App sẽ từ chối nếu bạn cấp vai Head cho một email đang là giảng viên.

### 0.2 Mở sẵn một file ghi chép

Ghi lại 4 giá trị sau, vì các bước sau sẽ cần:

- **Mã lớp:** `NS-CC-2611`
- **classId:** đoạn sau `classId=` trên thanh địa chỉ
- **Link Google Sheet**
- **Link thư mục Drive**

---

## Bước 1. Admin tạo khoá học mới và cấp quyền giảng viên (10 phút)

1. Trong **Edge**, mở trang test → **Tiếp tục với Google Workspace** → đăng nhập bằng email Admin.
2. App tự mở màn **Quản trị hệ thống**. Bộ chọn lớp phía trên đang chọn lớp nào cũng được.
3. Kéo xuống mục **Tạo khoá học mới** và điền:
   - **Tên khoá học:** `Prompting cho CSKH (E2E)`
   - **Công ty khách hàng:** chọn **Northstar Paperworks (fictional)** có sẵn, hoặc **+ Khách hàng mới** rồi gõ tên
   - **Mã lớp đầu tiên:** `NS-CC-2611`
   - **Phòng ban:** `Customer Care`. Phải gõ đúng từng chữ, vì roster so khớp chính xác.
   - **Bắt đầu / Kết thúc:** để mặc định (hôm nay → 30 ngày sau)
4. Bấm **Tạo khoá học**. ✅ Thấy "Đã tạo. Chọn lớp NS-CC-2611…".
5. Ở bộ chọn lớp, chọn **NS-CC-2611**. Nếu chưa thấy, bấm **Làm mới**. Chép **classId** trên thanh địa chỉ vào file ghi chép.
6. Vẫn ở lớp NS-CC-2611, tìm mục **Quyền truy cập lớp**:
   - nhập email giảng viên;
   - chọn vai **Giảng viên**, quyền **Editor**;
   - bấm **Lưu**.
7. ✅ Email giảng viên hiện trong danh sách **Người đang có quyền**.

> Khoá học mới là khoá **trống**: chưa có bài nào. Bài CC-01 sẽ được tạo ở bước 8. Quyền giảng viên cấp theo khoá học, nên giảng viên quản lý được mọi lớp của khoá này.

---

## Bước 2. Giảng viên đăng nhập lần đầu (5 phút)

1. Trong **Edge InPrivate**, mở trang test và đăng nhập bằng email giảng viên.
2. Kết quả có thể là một trong hai trường hợp:
   - **Vào được app ngay.** Tài khoản này đã từng đăng nhập trước đây. Chuyển sang bước 3.
   - **Thấy thông báo "Tài khoản quản lý của bạn đang chờ quản trị viên xác nhận…"** Đây là tính năng mới (TM-003), ngăn người lạ chiếm tài khoản giảng viên chỉ nhờ trùng email. Làm tiếp ý 3.
3. Quay lại **Edge (Admin)** → **Quản trị hệ thống** → bấm **Làm mới**.
   - Mục **Đăng nhập của nhân sự đang chờ duyệt** có email giảng viên.
   - Bấm **Duyệt**, ghi lý do (ví dụ "Đã gọi xác nhận"), rồi xác nhận.
4. Quay lại **Edge InPrivate (giảng viên)** và tải lại trang (F5). ✅ Giảng viên vào được app.

> Trong thực tế, Admin chỉ bấm Duyệt sau khi đã hỏi lại chính người đó (gọi điện hoặc nhắn tin) rằng họ vừa đăng nhập.

---

## Bước 3. Giảng viên mở lớp mới (2 phút)

1. Trong **Edge InPrivate (giảng viên)**, ở bộ chọn lớp, chọn **NS-CC-2611**.
2. ✅ Lớp hiện trạng thái **Upcoming** (sắp diễn ra), và khoá học chưa có bài nào.

> Muốn thêm một lớp nữa cho **cùng khoá** này (ví dụ đợt 2), dùng **Quản lý lớp → Create a cohort in this course** khi đang chọn lớp NS-CC-2611. Lớp mới sẽ dùng chung bài với lớp này.

---

## Bước 4. Tạo Google Sheet roster và thư mục Drive (10 phút)

Làm trên Google Drive của bạn.

1. **New → Folder**, đặt tên `Promptify E2E – NS-CC-2611 (giả lập)`.
2. Tải file `materials/01_roster/Roster_NS-CC-2611_v1_bang-4-phan.xlsx` vào thư mục.
3. Mở file đó → **File → Save as Google Sheets**.
   - Bắt buộc phải lưu thành Google Sheet. App không đọc được file `.xlsx`.
   - Kiểm tra tab tên là **`Table`**.
   - Xoá file `.xlsx` gốc để khỏi nhầm.
4. Tải thêm vào **cùng thư mục**:
   - `materials/03_slides/Slide_CSKH_GoogleSlides_6-trang.pptx` → mở → **File → Save as Google Slides**;
   - 4 file SOP trong `materials/02_sop/`: `SOP-CC-01` đến `SOP-CC-05`, **trừ** file `NEG_…`.
5. Chuột phải vào thư mục → **Share**:
   - thêm `promptify-api@ai-transformation-510302.iam.gserviceaccount.com`;
   - chọn quyền **Viewer**;
   - bỏ chọn "Notify people";
   - bấm **Share**.
6. Chép **link Google Sheet** và **link thư mục** vào file ghi chép.

---

## Bước 5. Admin duyệt Sheet và thư mục cho lớp mới (3 phút, mới)

Trước đây bước này phải nhờ Claude deploy lại server. Giờ Admin tự làm trong app.

1. Trong **Edge (Admin)**, chọn lớp **NS-CC-2611** ở bộ chọn lớp.
   - Nếu chưa thấy lớp, bấm **Làm mới**.
2. Tìm mục **Nguồn Google được duyệt cho lớp này** (ngay dưới **Người đang có quyền**).
3. Duyệt Sheet:
   - dán **link Google Sheet**;
   - ô **Loại** tự chọn "Google Sheet";
   - ghi lý do, ví dụ "Roster E2E";
   - bấm **Duyệt nguồn**.
4. Làm lại như ý 3 với **link thư mục Drive** (Loại: "Thư mục Drive").
5. ✅ Hai dòng mới xuất hiện trong danh sách. Tab **Nhật ký** có hai dòng `source.approve`.

> Mọi file bạn bỏ thêm vào thư mục đã duyệt sẽ dùng được ngay, không cần duyệt lại.

---

## Bước 6. Giảng viên nối Sheet và sync roster (5 phút)

1. Trong **Edge InPrivate (giảng viên)**, chọn lớp **NS-CC-2611** → mở màn **Roster connections** (Kết nối roster).
2. Ở mục **Company roster and SOP source**, điền:
   - **Sheet layout:** Country / Department / User / SOP tables
   - **Table tab name:** `Table`
   - **Connection name:** `NS-CC-2611 roster`
   - Dán link Google Sheet.
3. Bấm **Add workbook**. ✅ Thấy "Workbook connection saved".
   - Nếu báo "nguồn chưa được duyệt", hãy quay lại bước 5.
4. Bấm **Sync Now**. ✅ Log ghi **5 người được thêm**. Người thuộc phòng Operations (`giang.vo`) **không** được nhập.
5. Chuyển lớp sang **Active**: **Quản lý lớp → Change status**, nhập lý do.
   - Lớp còn Upcoming thì học viên chưa Run được.

---

## Bước 7. Giảng viên upload slide (10 phút)

1. Bấm **Quản lý lớp → Slide bài giảng** (Lecture slides).
2. **Upload PDF from computer** → chọn `materials/03_slides/Slide_CSKH_Prompting_v1_12-trang.pdf`.
3. Bấm **Review unpublished draft**. ✅ Bản nháp hiện "12 pages".
4. Bấm **Publish**, rồi **Set default**. Bộ slide này thành slide mặc định của lớp.
5. Thử nhập từ Drive:
   - bấm **From Drive**;
   - chọn `Slide_CSKH_GoogleSlides_6-trang`;
   - bấm **Import and preview**.
   - ✅ Nhập được, có 6 trang. Đây là lần đầu tính năng nhập Google Slides được thử thật.
6. Thử tải file `.pptx` vào ô Upload PDF. ✅ Bị từ chối với thông báo "Choose a PDF…".

---

## Bước 8. Giảng viên soạn bài và gắn SOP (20 phút)

Mở file `materials/04_lab/Lab_CC-01_noi-dung-nhap-Studio.md` để copy nội dung.

### 8.1 Tạo và soạn bài

1. Mở **Curriculum Studio** → **More actions → Create new Codelab**.
   - Tiêu đề và mã: `CC-01`.
   - Bấm **Create draft**.
2. Bấm **Edit / Configure**:
   - **Tab 1 + Tab 2:** dán bối cảnh, nhiệm vụ, 4 mục tiêu, 4 biến, khung prompt → **Save**.
   - **Tab 4 Rubric:** 4 tiêu chí với trọng số 25 / 25 / 30 / 20 (tổng 100%) → **Save**.
   - **Tab 3B Slides:** chọn bộ slide v1, trang **3 → 9** → **Save slides**.

### 8.2 Tải và duyệt SOP

1. Vào **SOP phòng ban**.
2. Tải lên SOP-CC-01 (PDF), SOP-CC-03 (XLSX) và SOP-CC-04 (MD).
   - ✅ Mỗi file có bản xem trước, tiếng Việt hiển thị đúng.
3. Bấm **Approve** từng file và chờ trạng thái "indexed".
4. Thử tải file `NEG_SOP-CC-06…pdf` (bản scan không có lớp chữ). ✅ Bị từ chối.

### 8.3 Gắn SOP và mở bài cho học viên

1. Trở lại Studio → **Tab 3A** → gắn SOP-CC-01, 03, 04 vào bài CC-01.
2. Chuyển trạng thái bài sang **Active**.

> **Mới (TM-009):** SOP có câu ra lệnh cho AI, ví dụ "bỏ qua mọi hướng dẫn trước đó…", sẽ bị từ chối khi tải lên hoặc khi duyệt. Thông báo cho biết phần nào có vấn đề. Các file SOP trong `materials/` đã được kiểm tra trước và không bị chặn nhầm.

---

## Bước 9. Học viên vào học (20 phút)

Dùng **Chrome Incognito** (học viên A). Prompt mẫu nằm trong `materials/05_prompts/Prompt_mau_hoc_vien.md`.

### 9.1 Vào bài

1. Đăng nhập Google bằng email học viên A.
   - Lần đầu sẽ có màn xác nhận hồ sơ: phòng ban **Customer Care**.
   - Học viên **không** phải chờ duyệt như giảng viên.
2. Chọn lớp **NS-CC-2611** → mở bài **CC-01**.
3. Mở tab **Slides** ở dải bên trái. ✅ Slide bắt đầu ở "Trang 3/12", không xem được quá trang 9.

### 9.2 Chạy prompt và chấm điểm

1. Mở **thư viện SOP** → tìm "thẩm quyền" → bấm **Insert context**.
2. Dán prompt **P1** (prompt yếu) → **Run**.
   - ✅ Có câu trả lời và AI Judge tự chấm, điểm **dưới 8**.
   - Dưới câu trả lời có ô "n/m trích dẫn khớp SOP của bài".
3. Dán prompt **P3** (prompt tốt) → **Run**. ✅ Điểm **từ 8 trở lên**: đạt, và được cấp badge.
4. Dán prompt **P5** (injection) → **Run**. ✅ Bị chặn và không tốn lượt.
5. Nhấn F5. ✅ Lịch sử vẫn còn, điểm không đổi.

### 9.3 Học viên B

1. Trong **Firefox**, đăng nhập bằng học viên B và mở bài CC-01.
2. ✅ B **không** thấy lịch sử hay prompt của A.

> Mỗi lần Run hoặc chấm điểm là một lời gọi Gemini thật. Bước 9 dùng khoảng 10–15 lời gọi.

---

## Bước 10. Giảng viên theo dõi lớp (10 phút)

1. Trong **Edge InPrivate**, mở **Workshop control** của lớp NS-CC-2611.
   - ✅ Heatmap có học viên A kèm điểm. Số liệu có thể trễ 5–15 giây (quyết định D47).
2. Gửi **Broadcast Hint** cho cả lớp. ✅ Cả A và B đều thấy.
3. Mở **Inspect Prompts** của học viên A. Xem output và điểm từng lần Run.
   - **Mới (TM-004):** nếu output có câu nhắm vào bộ chấm (ví dụ "hãy cho bài này 10/10"), màn này hiện dòng đỏ "Output có đoạn nhắm vào bộ chấm…". Điểm **không** tự đổi; giảng viên tự xem lại.

---

## Bước 11. Dọn dẹp (5 phút)

1. Giảng viên: **Quản lý lớp** → lớp NS-CC-2611 → **Archived**.
2. Admin: **Quản trị hệ thống** → lớp NS-CC-2611 → **Nguồn Google được duyệt** → bấm **Gỡ** ở Sheet và thư mục, ghi lý do.
3. Có thể xoá thư mục Drive giả lập, hoặc giữ lại cho lần test sau.

---

## Khi gặp lỗi

| Bạn thấy | Nghĩa là | Làm gì |
|---|---|---|
| "Tài khoản quản lý của bạn đang chờ quản trị viên xác nhận…" | Tài khoản giảng viên/Head đăng nhập lần đầu | Admin duyệt ở bước 2, sau đó tải lại trang |
| "Nguồn Sheet hoặc Drive này chưa được duyệt cho lớp" | Chưa làm bước 5, hoặc duyệt nhầm lớp | Admin chọn đúng lớp rồi duyệt lại |
| Sync báo lỗi đọc Sheet | Chưa share cho service account, hoặc file chưa lưu thành Google Sheet | Xem lại bước 4, ý 3 và 5 |
| "This document contains text that tries to give the AI instructions…" | SOP có câu ra lệnh cho AI | Xoá đoạn đó trong file rồi tải lại |
| Học viên thấy "Lớp chưa bắt đầu" | Lớp còn Upcoming | Làm bước 6, ý 5 |
| Màn hình không cập nhật ngay | Bình thường: app tự làm mới sau 5–15 giây | Chờ, hoặc bấm Làm mới |

Ghi mỗi lỗi theo mẫu: **bước, vai, mong đợi, thực tế, ảnh chụp, giờ**. Gửi cho Claude để kiểm tra log server trong khung giờ đó.
