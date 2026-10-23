# Kịch bản demo Promptify Intrepid — 24/10/2026

Cập nhật 23/10/2026 (đã kiểm tra live, chỉ đọc):
- Staging `https://ai-transformation-510302-intrepid-staging.web.app` đang chạy API `promptify-intrepid-api-ja1-1023` với 100% traffic. Cấu hình: `JUDGE_MODE=async`, `JUDGE_STRATEGY=parallel-v1`, `gemini-3.8-flash`.
- Hosting và trang Workspace trả HTTP 200. Queue Judge đang trống.
- Không có lỗi 5xx nào kể từ khi `ja1-1023` lên. Các lỗi 504/409 trong log đều thuộc revision cũ chạy Judge đồng bộ.
- **Không deploy gì thêm cho buổi demo.** Fast Judge (B/C) chỉ có ở local và chưa qua quality gate, nên không bật.

## 1. Chuẩn bị (làm trước demo 30–60 phút)

| # | Việc | Ghi chú |
| --- | --- | --- |
| 1 | Tạo **4 Chrome profile riêng** (hoặc 4 cửa sổ trình duyệt khác nhau). Mỗi profile đăng nhập sẵn **một** tài khoản Google | Firebase lưu phiên **chung cho mọi tab cùng profile**: đổi tài khoản ở một tab thì các tab khác cũng đổi theo và báo "Access Restricted". Cách nhanh nhất là dùng 4 vùng lưu trữ tách biệt: **Edge thường = Admin**, **Edge InPrivate = Head**, **Chrome thường = Learner**, **Chrome Incognito = dự phòng**. Trong mỗi vùng chỉ đăng nhập một tài khoản, không bấm "Sign In with Different Account" |
| 2 | **Admin:** tài khoản admin đã dùng cho staging. Theo bootstrap SQL là `duonglh.work@gmail.com` | Khi đăng nhập, app tự đưa vào màn **Governance (UI14)**. Nếu không vào đó thì tài khoản này không phải admin |
| 3 | **Trainer:** dùng **chính tài khoản Admin**. Hiện chưa có tài khoản instructor riêng, và admin có quyền quản lý lớp | Nói rõ với người xem: "vai Trainer do admin trình diễn" |
| 4 | **Head:** tài khoản Head QA `kangseobi…@gmail.com`. Ngày 23/10 đã được cấp thêm quyền xem lớp **Northstar** (trước đó chỉ có lớp QA `STAGING-ACCEPTANCE-20261019…`). Dữ liệu nằm ở `outputs/demo-access-check-2026-10-23/` | Mở **URL gốc, không kèm `?classId=`/`?ui=`**. Không dán link copy từ tab Admin: nếu `classId` là lớp chưa được cấp, app báo nhầm thành "Email Not Found in Company Roster" (thực chất là 403 "Class access denied"). Đăng nhập xong sẽ vào **Analytics (UI12)** |
| 5 | **Learner:** `demo.biz@intrepid.asia` hoặc learner QA `manhmanh…@gmail.com`, ghi danh lớp **Northstar** | Đăng nhập xong sẽ vào **Learner Hub (UI04)** |
| 6 | **Làm nóng hệ thống:** mở trang staging ở cả 4 profile khoảng 5 phút trước giờ demo, rồi bấm **Ctrl+Shift+R** | Tránh lần gọi DB đầu tiên sau thời gian idle bị lỗi (đã thấy 2 lần ngày 22/10) |
| 7 | **Chuẩn bị sẵn một bài đã chấm:** khoảng 10 phút trước demo, dùng Learner bấm **Run prompt** một lần với prompt mẫu ở mục 3 và đợi có điểm | Tốn 1 lần chạy AI (1 Generation + 6 Judge). Bài này là phương án dự phòng chính |
| 8 | Mở sẵn tab dự phòng ở profile Admin: **Workshop → Northstar → Demo → Open full learner inspector → V1** | Đã có output và 5 tiêu chí đạt 10/10 (kiểm tra ngày 23/10) |

Thời gian chấm AI hiện tại (đo live ngày 22/10): **khoảng 40 giây tới khoảng 2 phút 10 giây** cho một lần chấm, vì Vertex `gemini-3.8-flash` đang chậm. Hãy nói trước điều này với người xem, và trình bày Admin/Head trong lúc chờ.

## 2. Kịch bản 10 phút (đủ 4 vai trò)

### Bước 1 — Learner: bấm Run trước để AI chấm trong lúc demo các vai khác (0:00–1:30)
1. Mở profile **Learner**. Sau khi tải trang, app hiện **Learner Hub**.
2. Chỉ cho người xem: tên phòng ban, danh sách codelab, chứng chỉ, thư viện SOP.
3. Bấm vào bài **Northstar Operations → "Phân loại yêu cầu và trích dẫn nguồn"** (mã `PRACTICE-DELIVERY-01`). App mở **Workspace** gồm 3 cột: ngữ cảnh / prompt / kết quả.
4. Dán prompt mẫu (mục 3) vào ô **Your prompt** rồi bấm **Run prompt**.
5. Khi thấy "Đang tạo phản hồi…" rồi output hiện ra, nói: *"Câu trả lời đã được lưu; AI Judge đang chấm ở phía server, không giữ trình duyệt."* Màn hình sẽ hiện **"AI Judge đang xếp hàng… / đang chấm…"**.
6. **Không cần đợi.** Để nguyên tab này và chuyển sang Admin.

### Bước 2 — Admin: quản trị và phạm vi truy cập (1:30–3:30)
1. Mở profile **Admin**. App tự vào **Governance (UI14)**.
2. Chỉ cho người xem: domain email được phép, quyền theo từng lớp (Head chỉ thấy lớp được cấp), log sửa phòng ban.
3. Menu → **SOP (UI13)**: danh sách SOP đã duyệt, phiên bản, trạng thái index.
4. Menu → **Roster (UI15)**: kết nối Google Sheet của Northstar, lịch sử sync (thêm → cập nhật → bỏ, ngày 21/10).
5. **Không bấm** "Sync now", không đổi domain hay quyền.

### Bước 3 — Trainer (dùng tài khoản Admin): giảng dạy (3:30–5:30)
1. Menu → **Studio (UI11)**: chọn bài Northstar, chỉ rubric **5 tiêu chí** và trọng số (30/20/20/15/15), ngưỡng đạt **8/10**.
2. Menu → **Workshop (UI09)**: chọn cohort `STAGING-SYNTHETIC-20261020-NORTHSTAR`. Chỉ danh sách learner, cảnh báo "stuck", ô broadcast (**không gửi**).
3. Bấm learner **Demo** → **Inspect Prompts** → **Open full learner inspector (UI10)** → **V1**. Màn hình hiện output đã lưu và 5 tiêu chí đạt 10/10. *(Đây cũng là phương án dự phòng.)*
4. Không bấm Sandbox Run nếu không định tốn thêm lượt AI.

### Bước 4 — Head: kết quả của phòng ban (5:30–6:45)
1. Mở profile **Head**. App tự vào **Analytics (UI12)**.
2. Chọn lớp **Northstar** trong bộ chọn lớp. Chỉ cho người xem: Head **chỉ thấy các lớp được cấp** (Northstar + lớp QA, không thấy Juniper); có tỷ lệ hoàn thành và điểm. Số liệu nào không có thì để trống, không bịa.
3. Mở **Prompt Library**: nếu có mẫu đang chờ duyệt thì bấm duyệt (nếu không có thì chỉ trình bày phạm vi xem).

### Bước 5 — Learner: xem kết quả chấm (6:45–9:00)
1. Quay lại profile **Learner**. Lúc này AI Judge thường đã chấm xong; nếu chưa, đợi thêm hoặc dùng bài đã chuẩn bị ở bước 7 phần chuẩn bị.
2. Ở khung **AI Judge**: điểm **x/10**, mở **"Xem chẩn đoán AI Judge"** để thấy đủ **5 tiêu chí**, kèm lý do và gợi ý sửa.
3. Mở **SOP library / trích dẫn**, rồi bấm **Mở tệp gốc**: file gốc immutable được tải về, đúng bản đã duyệt.
4. Bấm **Compare attempts** nếu có từ 2 attempt trở lên.
5. Chuyển ngôn ngữ **EN/VI** ở menu.

### Bước 6 — Kết (9:00–10:00)
- AI chấm chạy nền qua hàng đợi Cloud Tasks, nên không còn lỗi 60 giây hay 409 kẹt như trước. Mỗi bài chỉ có đúng một điểm.
- Những điểm chưa làm, nói thẳng: chấm nhanh dưới 10 giây (B/C) chưa qua kiểm định chất lượng; chưa có production; 100 người dùng đồng thời chưa được nghiệm thu; roster đồng bộ theo lịch chưa chạy.

## 3. Prompt mẫu cho Learner

```text
[Role]: Operations analyst. [Task]: Classify fictional ticket 42 using only the approved SOP.
[Context]: Ticket 42 asks for a delivery-status update. [Constraint]: Do not invent facts; cite the section.
[Format]: Markdown table: Ticket, Priority, Deadline, Source. [Example]: | 41 | normal | 2 business days | [SOP:QA:v1] Section 1 |.
```

## 4. Kịch bản 5 phút (rút gọn)

| Thời gian | Vai trò | Làm gì |
| --- | --- | --- |
| 0:00–0:40 | Learner | Mở Workspace và bấm Run (bước 1) |
| 0:40–1:40 | Admin | Governance → SOP → Roster (chỉ xem) |
| 1:40–2:40 | Trainer (admin) | Studio rubric → Workshop → Inspector V1 (10/10) |
| 2:40–3:30 | Head | Analytics theo lớp được cấp |
| 3:30–5:00 | Learner | Điểm 5 tiêu chí, nhận xét, mở tệp gốc. Nếu Judge chưa xong, dùng bài đã chuẩn bị |

## 5. Sự cố và cách xử lý ngay

| Hiện tượng | Xử lý |
| --- | --- |
| "AI Judge đang chấm…" quá 2 phút | Tiếp tục demo vai khác; quay lại sau. Hoặc mở bài đã chấm sẵn / Inspector V1 của Admin |
| Báo lỗi "AI Judge chưa chấm được / hết hạn" | Bấm **Thử chấm lại AI Judge** một lần (output vẫn được lưu). Không bấm nhiều lần |
| Lỗi tải trang hoặc lỗi ngay lần đầu | Ctrl+Shift+R rồi thử lại (thường là kết nối DB idle) |
| Đăng nhập Google bắt "Verify it's you" | Dùng profile đã đăng nhập sẵn từ trước. Không đăng nhập mới ngay trong lúc demo |
| Học viên bị 403 | Đang dùng nhầm tài khoản (ví dụ admin mở trang learner). Đổi sang đúng profile |
| Cần quay lại trạng thái trước | API: chuyển traffic về `promptify-intrepid-api-jr5-1022` (Judge đồng bộ). Hosting: version `ecb5819780b0501c`. Không cần làm gì với DB |

---

## Phụ lục kỹ thuật (Codex, 23/10)

## Benchmark pipeline giả lập (OFFLINE)

Mô phỏng1 Generation→6 Judge calls,4 active job deliveries; Fake Vertex20ms, SQL013 thật trên PGlite, request adapter trong process. Đây không phải authenticated app API, Gemini chấm thật hay Cloud SQL đa kết nối. k6 chưa chạy do thiếu binary/DNS; socket HTTP localhost bị sandbox chặn. Fixture dùng token budget500000/min và backlog256, khác safety defaults120000/min và200 của ứng viên.

| Burst | Pipeline hoàn tất | Submit p95 | Admission p95 | Job queue p95 | Hoàn tất p95 | 429 phục hồi | Request trùng bị chặn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | 10/10 | 7.97ms | 0.78s | 1.58s | 2.27s | 0 | 10 |
| 25 | 25/25 | 14.22ms | 0.75s | 4.06s | 5.09s | 2 | 25 |
| 50 | 50/50 | 13.89ms | 0.75s | 8.87s | 9.60s | 4 | 50 |
| 100 | 100/100 | 45.32ms | 0.77s | 17.83s | 18.57s | 9 | 100 |

Global cap4 không bị vượt. Wave100:709 fake provider attempts (700 thành công+9 lỗi429 cố ý),4456 SQL roundtrips, SQL roundtrip p95=8.37ms. Một phép đo cấu hình head-only trước đó có completion p95=54.80s; eligible tenant batch cho18.57s. Đây là kết quả một burst/configuration, không phải bảo đảm latency thực tế. Provider cost thật của phiên=0; cost per grade thực tế chưa xác định.

## Lệnh kiểm chứng offline

Từ `apps/promptify-intrepid`: `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`.

Benchmark không mạng: `node node_modules/tsx/dist/cli.mjs scripts/benchmark_admission_offline.ts --in-process --pipeline` (Generation1+Judge6calls). Bỏ `--pipeline` để chỉ đo admission1call/job.

Khi host cho phép localhost và có k6: chạy fixture bằng `node node_modules/tsx/dist/cli.mjs scripts/benchmark_admission_offline.ts --serve --pipeline`, lấy loopback URL nó in ra, rồi `k6 run -e BASE_URL=http://127.0.0.1:PORT -e VUS=100 tests/performance/admission.k6.js`. Lặp riêng 10/25/50/100; restart fixture mỗi wave. Script k6 chặn URL ngoài loopback. Fixture này không phải authenticated app API và không gọi Vertex.

## Rollback ứng viên

Migrations 013/014/015 đều additive, kèm rollback. Chưa apply trong phiên này. Chụp live revision/Hosting version và governance trước release; không lấy revision cũ trong tài liệu làm rollback target mặc định. Khi rollback: ngừng admission mới, để work đang chạy drain, trả traffic về revision đã chụp và trả Hosting về version trước. Giữ bảng additive và output/grade đã lưu. Chỉ chạy SQL rollback sau khi mọi task/worker dùng schema mới đã dừng; không drop bảng khi còn task đang bay. Không thay IAM, secret, model hoặc scoring.
