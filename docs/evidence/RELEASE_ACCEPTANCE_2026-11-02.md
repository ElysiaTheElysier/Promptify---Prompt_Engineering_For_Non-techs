# Nghiệm thu trước release — Promptify Intrepid (02/11/2026)

Tổng hợp từ code hiện tại, check offline chạy hôm nay, và evidence staging đã lưu (`docs/`, `apps/promptify-intrepid/outputs/`, TRACKER điều phối). **Không** đọc lại cloud live, **không** đăng nhập staging, **không** gọi AI trong lần nghiệm thu này.

Mức bằng chứng: **LIVE** = đã chạy trên staging, có evidence (ghi ngày) · **OFFLINE** = test offline · **CODE** = chỉ có source · **[?]** = chưa có bằng chứng.

## Kết luận

**Chưa release được cho người dùng thật ở quy mô rộng.** Luồng chính của học viên (đăng nhập → làm lab → Run → AI Judge) và của giảng viên (tạo lab, rubric, sync roster thủ công) đã chạy thật trên staging. Nhưng còn 7 nhóm blocker: capacity chưa chứng minh, lỗi độ tin cậy đã tái hiện còn mở, bản đang chạy không dựng lại được từ git, chưa có alert/restore, chưa có production, hầu hết bản UI từ 25/10 chưa được kiểm khi đăng nhập, và các quyết định sản phẩm còn treo.

Có thể cân nhắc **pilot nhỏ, có giám sát, trên staging** sau khi làm xong "Bước A" ở cuối file.

## Môi trường (theo evidence 01/11, chưa đọc lại live)

| Thành phần | Bản đang chạy | Ghi chú |
| --- | --- | --- |
| API Cloud Run | `promptify-intrepid-api-auth1-1101` (100%) | Image dựng bằng overlay file, không phải từ một commit |
| Hosting | `a1567a0774ab4ab5` (01/11) | Dựng từ source **chưa commit** (24 file đang sửa trong `git status` hôm nay) |
| Cloud SQL | migration tới 021 | Có backup + PITR, **chưa diễn tập restore** |
| Scheduler roster | PAUSED | Roster theo lịch chưa chạy live |
| Monitoring | 0 alert, 0 uptime check | |
| Production | **Không có** | Chỉ staging `ai-transformation-510302` |

## Check offline hôm nay (02/11, OFFLINE)

| Check | Kết quả |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 lỗi, 1 warning đã biết (cycle `ProductionWorkspace` ↔ `ProductionWorkspaceV7`) |
| `npm run test:boundaries` | PASS |
| `npm run build` | PASS, warning chunk > 500 kB đã biết |
| `npm test` | **87/87 PASS** |
| `npm run test:smoke` | Không chạy lần này |

Test offline pass không có nghĩa tính năng chạy đúng trên staging.

## Chức năng theo vai

Ký hiệu: ✅ LIVE pass · 🟡 một phần / LIVE cũ, sau đó UI đã đổi · ⬜ chỉ OFFLINE/CODE · ❌ lỗi đã thấy hoặc thiếu

### Học viên (Learner)

| Chức năng | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| Đăng nhập Google + đối chiếu roster | 🟡 | LIVE 21/10. Bản phân loại lỗi đăng nhập (01/11) chỉ kiểm khi chưa đăng nhập. Gmail cá nhân có trong roster vẫn vào được |
| Xác nhận profile, sửa phòng ban (UI02) | 🟡 | Một phần LIVE. 01/11 đổi Employee ID/Office thành chỉ đọc, chưa kiểm khi đăng nhập |
| Hub, tiến độ (UI04) | 🟡 | LIVE 19/10; layout đổi 01/11, chưa kiểm khi đăng nhập |
| Run prompt (Generation) | ✅ | LIVE 28/10, trả lời đúng ngôn ngữ học viên. Run vẫn đồng bộ |
| AI Judge stream từng tiêu chí | ✅ | LIVE 26/10: 33 lần chấm, 0 lỗi, p95 6,9 s (5 tiêu chí). 28/10 với rubric động: p95 17,5 s (3 tiêu chí) → 37,6 s (8 tiêu chí) |
| Refresh / tab 2 / bấm trùng chỉ tạo 1 job | ✅ | LIVE 26/10 |
| So sánh / khôi phục attempt (UI06) | ❌ | LIVE 28/10: bấm Compare không chuyển màn. 01/11 thêm nút Single/Compare ở header, chưa kiểm |
| Biến prompt, scaffold, mask PII | ⬜ | OFFLINE |
| Thư viện prompt cá nhân | 🟡 | LIVE phần cá nhân (cũ) |
| Chia sẻ prompt → Head duyệt → đồng nghiệp thấy | ⬜ | OFFLINE, chưa có luồng thật giữa 2 người |
| Xem SOP + tải bản gốc | ✅ | LIVE 21/10, hash khớp. Quay lại bài lab giữ nháp: chỉ kiểm local |
| Xin gợi ý / nhận broadcast, gợi ý riêng | ⬜ | OFFLINE. **Lỗi race giới hạn 5 gợi ý chờ** (I10, tái hiện offline) |
| Chứng chỉ PDF, badge | 🟡 | Tạo PDF: OFFLINE pass. Cấp chứng chỉ thật: chưa kiểm |
| Xin quyền Advanced | ⬜ | Chưa kiểm |

### Giảng viên (Instructor)

| Chức năng | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| Studio: tạo lab, lưu các tab, chuyển Active | ✅ | LIVE 28/10. Lỗi nhỏ 28/10: nút "Create draft" không có chữ; "Key Practice Objectives" không có ô nhập; placeholder tiếng Việt khi đang EN (chưa kiểm lại) |
| Rubric động 1–8 tiêu chí | ✅ | LIVE 28/10 (giới hạn 8, chặn tên trống, cân 100%) |
| Sandbox chấm thử | 🟡 | LIVE QA 18/10. Sandbox không trừ ngân sách AI |
| Quản lý lớp (cohort) | 🟡 | Sửa lỗi không hiện (28/10) đã lên Hosting; 01/11 chuyển vào dialog ở header, chưa kiểm khi đăng nhập |
| Roster "Sync now" thêm/sửa/xoá | ✅ | LIVE 21/10 và 28/10, chỉ với Sheet giả lập |
| Roster theo lịch | ❌ | Chưa chạy live, Scheduler PAUSED |
| Workshop: pulse, broadcast, gợi ý riêng, Inspector (UI09/10) | ⬜ | OFFLINE; Inspector scorecard chỉ thấy ở dữ liệu cũ |
| Đóng góp SOP: upload/Drive/duyệt/index | ✅ | 02/11: PDF, DOCX, XLSX, Google Doc từ Drive đọc đúng, duyệt và index (xem E2E đợt 2, mục 1) |
| Nâng học viên thành facilitator | 🟡 | Có release 23/10; chưa có lần kiểm theo E2E guide |

### Trưởng phòng (Head)

| Chức năng | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| Analytics theo lớp, lọc ngày | 🟡 | Chưa nghiệm thu bộ lọc/heatmap live. Số liệu snapshot chỉ tính 200 attempt gần nhất (I11) |
| Export CSV / Print PDF | ⬜ | Chưa kiểm |
| Chỉ thấy lớp được cấp | 🟡 | Có bằng chứng từ chối URL lớp lạ (cũ); lỗi báo nhầm "không có trong roster" đã sửa 01/11, chưa kiểm khi đăng nhập |
| Duyệt prompt chia sẻ | ⬜ | Chưa kiểm |

### Quản trị (Admin)

| Chức năng | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| Domain whitelist thêm/tắt/bật | ✅ | LIVE 28/10. Lỗi: thẻ đếm domain hiện 0 |
| Audit log | 🟡 | Có ghi, nhưng cột Actor chỉ hiện UUID |
| Cấp/thu hồi quyền lớp | ⬜ | 28/10 bị chặn khi test, chưa kiểm |
| Duyệt yêu cầu truy cập | ⬜ | Chưa kiểm |
| Rotation credential | ⬜ | CODE; không được thử |

### So với test log tham chiếu (còn thiếu)

Rate limit 20/phút; hạn mức 50k token/phiên (có cờ nhưng **không chặn được khi chạy đồng thời**, I04); chế độ chỉ đọc khi hết hạn (một phần); ma trận test đối kháng prompt injection.

## Blocker release

| # | Blocker | Bằng chứng | Cần làm |
| --- | --- | --- | --- |
| B1 | **Capacity chưa chứng minh.** 100 pipeline đồng thời chỉ xong 6/100 (22/10). Hàng đợi provider toàn hệ thống (013) chưa deploy. Queue Judge 3 dispatch song song, pool DB 5. Chưa bao giờ thử quá 2 lần chấm đồng thời | LIVE 22/10, 26/10 | Chủ sản phẩm chốt "bao nhiêu người dùng cùng lúc". Giới hạn pilot theo số đã đo, hoặc deploy 013 + load test có duyệt |
| B2 | **Lỗi độ tin cậy còn mở trong code** (audit 23/10, chưa sửa): I01 cạn pool DB khi 5 request đồng thời; ~~I02 pool không có handler lỗi idle~~ **đã sửa ở local 02/11, chưa deploy** (handler `sql_pool_idle_error` chỉ log mã lỗi; client ROLLBACK lỗi bị huỷ thay vì trả về pool; test `verify_sql_pool_errors.ts`, OFFLINE 88/88); I03 safeguard cho qua khi thiếu schema; I04 hạn mức phiên không atomic; I05 worker trễ không kiểm lại hết hạn/thu hồi; I10 race giới hạn gợi ý | CODE + OFFLINE | Sửa I02 (nhỏ), I01, I10 trước pilot; I03–I05 trước production |
| B3 | **Bản đang chạy không dựng lại được từ git.** Hosting 01/11 từ source chưa commit; API là image overlay; source local chứa phần chưa deploy (013–015, identity memo) | `git status`, RESULT 01/11 | Commit + tag đúng source của Hosting `a1567a07` và API `auth1-1101`; ghi manifest revision/image/migration |
| B4 | **Chưa vận hành được:** 0 alert, 0 uptime check, chưa diễn tập restore, chưa có RPO/RTO, chưa có người nhận alert | `01_CURRENT_STATE.md` | Chỉ định người nhận; tạo alert 5xx/503/tuổi job Judge/chi phí Vertex; diễn tập restore 1 lần |
| B5 | **Chưa nghiệm thu khi đăng nhập** cho phần lớn release từ 25/10, gồm thay đổi UI lớn 01/11 (header mới, UI02/04/05/09/11/12/14/15) | Mọi RESULT từ 25/10 ghi "Not checked signed in" | Chạy [E2E guide](../E2E_TEST_GUIDE_2026-10-28.md) đủ 4 vai trên bản hiện tại |
| B6 | **Bảo mật** (threat model 31/10): TM-002 lọc domain cho qua khi client chưa cấu hình domain (high); TM-003 gắn danh tính theo email tái cấp; TM-006 API mở `allUsers` + pool 5 dễ bị DoS; TM-007 parser file chạy chung process API; chưa chạy `npm audit` | `evidence/promptify-intrepid-threat-model.md` | Đổi TM-002 sang fail-closed; chạy `npm audit`; quyết định chấp nhận rủi ro TM-003/006/007 cho pilot |
| B7 | **Quyết định sản phẩm còn treo:** Basic/Public có trong code nhưng ngoài phạm vi Phase 1; nghĩa của "100 người đồng thời" và ngân sách; ai nhận alert; RPO/RTO; Drive/Sheets có bắt buộc lúc launch; thời gian lưu dữ liệu; cho phép Gmail cá nhân trong roster | `05_OPEN_ISSUES.md` | Gửi bộ câu hỏi cho chủ sản phẩm (đã soạn, chưa gửi) |
| B8 | Chưa có môi trường production | | Sau B1–B7 |

## Lộ trình tối thiểu

**Bước A — trước pilot nhỏ trên staging (vài chục học viên, có người trực):**
1. Commit + tag source khớp bản live (B3).
2. Sửa I02, I10 và các lỗi UI 28/10 (Compare attempts, Actor UUID, đếm domain, nút Create draft, ô Key Practice Objectives, placeholder EN, lớp Northstar không thấy).
3. Chạy E2E guide đủ 4 vai, ghi PASS/FAIL (B5).
4. Tạo alert tối thiểu + uptime check, có người nhận (B4).
5. Tắt Basic/Public nếu ngoài phạm vi; TM-002 fail-closed.
6. Giới hạn số người chạy AI cùng lúc theo mức đã đo (≤ 2–3 lần chấm đồng thời), báo trước cho học viên.

**Bước B — trước production:** hàng đợi provider 013 + load test có duyệt (B1); sửa I01, I03–I05; diễn tập restore; roster theo lịch chạy live; kiểm SOP thật PDF/DOCX/XLSX/Google Doc; review chất lượng chấm của Judge với người chấm; dựng project production.

## Cập nhật 02/11 (chiều) — đã sửa ở local, chưa deploy

Bằng chứng: CODE + OFFLINE (typecheck, lint 0 lỗi, boundaries, build, smoke, `npm test` 89/89). Chưa có bản nào lên staging.

| Mục | Sửa | Test |
| --- | --- | --- |
| I01 cạn pool | Đọc theo quyền actor (RLS) chạy sau khi nhả kết nối service, ở `readClasses` và `snapshot` | `verify_service_sql_scope.ts` chặn `c.reader` trong service scope |
| I02 pool lỗi idle | Đã sửa sáng 02/11 | `verify_sql_pool_errors.ts` |
| I03 safeguard cho qua khi thiếu schema | Khi cờ bật mà thiếu 016: chặn ghi/budget bằng 503 `safeguard_schema_missing`; màn hình vẫn hiển thị | `verify_learner_safeguards.ts` |
| I05 worker trễ | Worker Judge và Generation kiểm lại quyền lớp (RLS), hạn truy cập, ngân sách phiên ngay trước khi gọi AI; bị thu hồi → `failed` + `access_revoked`, không gọi AI, không retry | `verify_delayed_job_access.ts` (SQL thật) |
| I10 race gợi ý | Khoá `pg_advisory_xact_lock` theo học viên/lớp/bài trước khi đếm | `verify_workshop_messaging.ts` (chỉ kiểm thứ tự lệnh; PGlite không tạo được race 2 kết nối) |
| TM-002 | Cờ `DOMAIN_POLICY=require` (mặc định tắt) | `verify_tenant_isolation.ts` |
| Basic/Public | Cờ `DISABLE_PUBLIC_BASIC=true` (mặc định tắt) | `verify_tenant_isolation.ts` |
| Dependency | `npm audit fix`: hết lỗi high (`re2js` 2.9.1); còn 11 moderate qua `exceljs` cần bản breaking | `npm audit --omit=dev` |
| UI 28/10 | Nút "Create draft" bị CSS `.prod-app button` làm trắng chữ; ô "Key Practice Objectives" không hiện khi danh sách rỗng; placeholder tiếng Việt khi EN; Actor trong audit log hiện tên/email; Admin/Head/… mở URL gốc tự vào màn chính | Typecheck/build; **chưa kiểm trên trình duyệt** |
| UI 28/10 chưa sửa | Thẻ đếm domain hiện 0 (không tái hiện được từ code: thẻ và danh sách cùng nguồn); lớp Northstar không thấy (dữ liệu, cần Admin kiểm); Compare attempts đã được thay bằng công tắc Compare Mode ngày 01/11 | Cần kiểm khi đăng nhập |

Chuẩn bị production (owner chọn: chung project staging, tài nguyên riêng): [runbook](../proposals/PRODUCTION_LAUNCH_RUNBOOK_2026-11-02.md), `gcp/10-create-production.sh.template`, `gcp/11-production-alerts.sh.template`, `gcp/production.env`. Câu hỏi gửi owner: [OWNER_QUESTIONS_2026-11-02.md](../proposals/OWNER_QUESTIONS_2026-11-02.md).

Còn mở: I04 (chờ owner chọn chặn mềm/cứng), capacity B1 (chờ số người đồng thời), alert/restore B4 (chờ người nhận + chạy script), E2E 4 vai B5, deploy staging bản đã sửa.

## E2E có đăng nhập trên staging 02/11 tối (LIVE, API `rel1-1102`, Hosting `ee654fb3`)

Owner tự đăng nhập trong browser pane; Claude thao tác. 1 lần Run + 1 lần AI Judge thật.

| Bước | Vai | Kết quả |
| --- | --- | --- |
| 1.1 Admin mở URL gốc → UI14 | Admin | ✅ PASS (lỗi 28/10 hết) |
| Thẻ đếm domain | Admin | ✅ PASS (khớp danh sách: 1 → 3) |
| Audit log: Actor | Admin | ✅ PASS hiện tên. Cột Target vẫn là UUID lớp |
| Lớp Northstar không thấy (28/10) | Admin/Learner | ✅ Nguyên nhân là **dữ liệu**: client chỉ có domain `example.test` → ẩn lớp với mọi email khác. Đã thêm `intrepid.asia`, `gmail.com`; learner thấy lại lớp |
| 3.4 Roster Sheet Sync now | Admin (quyền giảng viên) | ✅ success, 4 dòng, 0 lỗi. Cột Added/Updated hiện "—"; màn hình ghi "checked every 15 minutes" nhưng Scheduler PAUSED |
| Drive: đọc thư mục được phép | Admin | ✅ liệt kê 2 file TXT. **PDF/DOCX/XLSX/Google Doc chưa kiểm** (thư mục không có file loại đó) |
| Studio: nút Create draft | Admin | ✅ PASS (nền xanh, chữ trắng). Nút "Create new Codelab" nằm trong menu "More actions" |
| Analytics | Admin | 🟡 hiển thị được; số liệu không khớp nhau: "Competency 8.07/10, -19.35%" vs bảng "Avg AI Score 8.92" |
| 6.1 Hub | Learner | ✅ PASS |
| 6.5 Run | Learner | ✅ 3,06 s, output đúng định dạng; thanh token phiên hiện đúng |
| 6.6 AI Judge (async + kiểm quyền I05) | Learner | ✅ 10/10, 5 tiêu chí, ~5 s từ lúc bấm (queue 0,14 s, chấm 3,6 s) |
| 6.7 Reload sau khi chấm | Learner | ✅ giữ 35 attempt, điểm giữ nguyên, không chấm lại |
| 6.8 Compare Mode | Learner | ✅ hiển thị so sánh attempt có đánh dấu khác biệt |
| 6.11 SOP từ bài lab | Learner | ✅ drawer: tìm kiếm, Insert context, Copy citation; đóng lại giữ nguyên nháp |
| 4.4 Xin gợi ý | Learner | ✅ "Waiting for your facilitator" (khoá I10 chạy live). Phía giảng viên duyệt: chưa kiểm |
| "Core elements 1/5" khi prompt viết trên một dòng | Learner | ❌ → **đã sửa ở local**: thẻ `[Task]:` giữa dòng giờ được nhận; chưa deploy |
| Thương hiệu | Mọi vai | ❌ `<title>` "… Agribank & Corporate"; landing quảng cáo gói Basic $0 và logo Agribank |
| Bố cục hẹp (~570 px) | Admin | 🟡 UI14 tràn ngang (939 px) |
| Log API trong E2E | — | ✅ 0 ERROR/5xx, không có `sql_pool_idle_error` |

Chưa kiểm: Head đăng nhập riêng (Analytics theo grant, export CSV, duyệt thư viện prompt), giảng viên duyệt gợi ý, cấp/thu hồi quyền lớp, chứng chỉ PDF, SOP PDF/DOCX/XLSX/Google Doc.

## E2E đợt 2 trên staging (02–03/11, LIVE, API `rel2-1102`, Hosting `198d9a75`)

| # | Mục | Kết quả |
| --- | --- | --- |
| — | Analytics sửa nhãn | ✅ thẻ lớn = bảng = 8.95/10; "lần đầu → mới nhất 10 → 8.07 (2 bài)"; thanh theo bài hiện |
| — | Header tràn ngang | ✅ 443/443 px (trước 767) |
| — | Roster "15 phút" | ✅ sửa chữ (chưa xem live khi đăng nhập giảng viên) |
| — | Landing khi đăng xuất | ✅ không còn bảng giá/Basic/Agribank |
| 1 | SOP Drive PDF/XLSX/DOCX/Google Doc | ✅ sau khi sửa API (`b70c7c5`): file trong thư mục đã duyệt được chấp nhận; cả 4 đọc đúng canary, duyệt + index, hiện trong Studio |
| 2 | Giảng viên duyệt gợi ý | ✅; học viên thấy "Approved" (bài chưa có nội dung gợi ý soạn sẵn) |
| 3 | Broadcast + gợi ý riêng → học viên A | ✅ thấy cả hai, Got it/Mark as read hoạt động. Học viên B (`manhmanh100127@gmail.com`) **không thuộc lớp Northstar** → chưa kiểm được "B không thấy" |
| 4 | Head | ✅ (owner test trên điện thoại 03/11) chỉ thấy 2 lớp được cấp (Northstar + lớp QA cấp từ 19/10); thẻ 8.94 = bảng = report; −7.91% đúng (8.42 − 9.14)/9.14; export tải được nhưng là **JSON** (checklist muốn CSV/PDF); duyệt prompt chia sẻ → "Department shared" + lý do lưu. Lỗi bố cục thẻ prompt và dòng "not audited ROI" lạc chỗ → đã sửa, Hosting `42d51b13` (chưa xem lại khi đăng nhập Head) |
| 5 | Thu hồi quyền lớp | ❌ **chưa có chức năng** (UI/API/SQL chỉ có cấp) |
| 6 | Studio: tạo lab, rubric 3 tiêu chí, sandbox, publish | ✅; học viên chấm theo đúng 3 tiêu chí (4.2/2.9/2.9) |
| 7 | Badge + chứng chỉ | ✅ chứng chỉ sau khi áp **migration 022 lên staging 03/11** (owner duyệt; backup trước; kiểm hàm mới): học viên A nhận chứng chỉ, PDF 1,2 MB tạo được. Chứng chỉ bị đếm vào "My Digital Badges". Badge mới tạo mặc định DRAFT, chưa bật ACTIVE nên chưa kiểm badge |
| 8 | Đóng lớp → mở lại | ✅ sau 2 bản sửa (API `rel4-1103`, Hosting `215e3618`): ban đầu học viên bị **sập cả trang** (inbox RPC lỗi → 409 chung) và Run báo nhầm "service not ready". Giờ: trang vẫn mở, banner "Class ended", Run khoá; server trả 403 `class_closed`, 0 lời gọi AI. Mở lại Active → học viên Run được ngay (2,33 s) |
| 7b | Badge | ✅ sau khi owner bật ACTIVE: học viên A nhận "Escalation Pro (E2E)". Nút DRAFT thay bằng công tắc "Award to learners" có mô tả |
| — | Header | ✅ 2 hàng cố định, avatar luôn góc phải (kiểm 375 / 704 / 1440 px), nền đặc |
| — | Bảng Codelab Studio, nút "Credential handling policy" | đã sửa (`b592569`); **chưa xem lại khi đăng nhập Admin** |

Lỗi nhỏ ghi nhận: nhãn "STUCK (>5 fails)" cho học viên đã 10/10; thông báo "Folder submission stopped" không tự xoá; "Uploaded “”" tên rỗng; 2 file .txt gửi lại đang chờ duyệt.

## Giới hạn của lần nghiệm thu này

- Không đăng nhập staging: việc nhập mật khẩu tài khoản phải do người dùng làm. Mọi ô "chưa kiểm khi đăng nhập" cần người có tài khoản test chạy E2E guide.
- Không đọc lại cấu hình cloud live; bảng môi trường lấy từ evidence 01/11.
- Không xác minh lại từng lỗi UI 28/10 trong code mới; có thể một phần đã được sửa trong đợt UI 01/11.

## E2E đợt 3 trên staging (03/11, LIVE: API `roster-1103`, Hosting `4874f7ae`)

| Mục | Kết quả |
| --- | --- |
| Roster đồng bộ theo lịch | ✅ Scheduler `promptify-roster-staging-qa` ENABLED `*/5`, OIDC vào `/internal/roster` của API hiện tại. 11:10:03 tự chạy: success, processed 5, không ai bấm |
| Học viên B được tự thêm từ Sheet | ✅ `manhmanh100127@gmail.com` (dòng có sẵn trong tab `ScheduledQA20261022`, owner bổ sung Department/Country) vào thẳng Northstar |
| B không thấy gợi ý riêng của A | ✅ B chỉ thấy broadcast WHOLE CLASS |
| Giảng viên thật `lhbjune101@gmail.com` | ✅ được cấp Instructor/Editor, bật auto sync được; `?ui=14` bị chặn. Màn bị chặn đã đổi thành thông báo gọn trong khung app (trước: màn REJECTED đỏ) |
| Export Head | ✅ CSV (Excel, chống chèn công thức) + Print/PDF thay cho JSON. **Chưa bấm thử khi đăng nhập Head** |
| STUCK, chứng chỉ vs badge, thông báo Drive, nút lưu prompt, "Uploaded “”" | ✅ đã sửa; đã thấy live: chứng chỉ trong thẻ chứng chỉ, badge đếm 1 |
| Log sync Added/Removed | ✅ đã sửa ánh xạ (`added+reactivated`, `removed`); log cũ hiện "—" |
| Mật độ giao diện | ✅ prompt 14px/1.6, thẻ 16px, 3 cột vừa khít màn ở 1280×720 và 1536×864 (ảnh chụp), header 1 hàng ở ≥1600px, avatar luôn phải. **Owner cần xem lại trên máy thật** |

Còn lại: production chưa có migration 022 và các bản sửa này (T4).

## Thu hồi quyền lớp (03/11, CODE + OFFLINE + LIVE staging)

- Migration `023_revoke_class_access.sql` (+ rollback): `product_revoke_class_access(class,user,role,reason)`, chỉ Admin, bắt buộc lý do, ghi audit `access.revoke`. Giảng viên bị thu hồi theo **khoá học** (mọi lớp của khoá), Head theo **lớp**. Vai trò tài khoản và dữ liệu cũ giữ nguyên; người bị thu hồi thấy thông báo không có quyền.
- API `revokeAccess` (Admin, phạm vi quản lý lớp); payload governance có danh sách người đang có quyền.
- Quản trị → Class access: danh sách "People with access" + nút Thu hồi có hộp xác nhận nhập lý do.
- Test `verify_class_access_revoke.ts` (SQL thật trong PGlite qua adapter RPC): chặn non-admin, kiểm vai trò/lý do, thu hồi theo khoá vs lớp, thu hồi lần 2 báo "Access not found", audit, cấp lại được, rollback. `npm test` 92/92.
- **LIVE staging 03/11:** backup `before-023-revoke-class-access-20261103` → áp 023 bằng `gcloud sql import` (kiểm: hàm tồn tại, `authenticated` gọi được, `anon` không; quyền tạm bucket đã gỡ). API `promptify-intrepid-api-rel5-1103` (image `sha256:5fba939e…`, commit `3b96a5b`) 100% traffic, health/readyz 200, không token 401, giữ `gemini-3.8-flash`/`parallel-v1`/biến roster; rollback = `roster-1103`. Hosting `ed33bc9e` (rel1103i).
- **Bấm thử khi đăng nhập Admin** (lớp Juniper): danh sách hiện 2 giảng viên của khoá; cấp Head cho `revoke-test-1103@example.test` → hiện ngay trong danh sách; Thu hồi → hộp xác nhận khoá nút tới khi nhập lý do → "Saved on the server", dòng biến mất; audit có `access.grant` 19:09:27 và `access.revoke` 19:09:50 do Admin. Tài khoản thử còn lại trong `users` (vai trò head, không lớp nào).
- Chưa kiểm LIVE: thu hồi giảng viên thật (cố ý không đụng tài khoản thật); người bị thu hồi đăng nhập lại thấy thông báo không có quyền (đã có test offline cho luồng không lớp).

## Test nốt khi đăng nhập Admin (03/11 tối, LIVE staging: API `rel5-1103`, Hosting `ed33bc9e`)

| Mục | Kết quả |
| --- | --- |
| Export CSV (Analytics, Northstar) | ✅ file `promptify-learning-report-2026-11-03.csv`, có BOM UTF-8, số khớp màn hình (7 ghi danh, 1 hoàn thành, 8.94, 9.14 → 8.42, 4 lab) |
| Print / PDF | ✅ gọi hộp in của trình duyệt; CSS in ẩn header |
| Lọc Analytics theo ngày | ❌ **không có trên màn đang dùng**; bộ lọc chỉ có ở màn cũ không còn hiển thị. API đã nhận `start`/`end` |
| Heatmap (Workshop) | ✅ có ma trận tiến độ theo học viên |
| STUCK | ✅ 0 bị đánh dấu là đúng: lab có 6 lượt trượt nhưng đã có 3 lượt đạt |
| Điểm học viên ở heatmap | ❌ → sửa local: hiện "—/10" khi lượt mới nhất chưa chấm; giờ lấy lượt đã chấm gần nhất |
| Yêu cầu hỗ trợ truy cập | ✅ gửi từ màn từ chối (mã `10827d63`) → hiện ở Roster → Mark resolved → "Resolved" |
| Nâng học viên lên giảng viên | ✅ `learner03@juniper.example.test` (giả lập) → viewer; danh sách quyền chỉ cập nhật sau 15 giây → sửa local |
| Thu hồi giảng viên | ✅ thu hồi Gray Fiction (giả lập) kèm lý do; biến khỏi danh sách |
| Nhãn đồng bộ roster | ❌ → sửa local: luôn ghi "manual sync" vì `vite.config.ts` không cho `VITE_ROSTER_SCHEDULER_ACTIVE` vào bản build; thẻ "Sync Interval" viết cứng |

Các bản sửa ở commit `79fd3ed` (OFFLINE: `npm test` 92/92, build có cờ), **chưa deploy Hosting**. Chưa kiểm: chữ nút lưu prompt (cần đăng nhập học viên), mật độ giao diện trên máy thật.

**Deploy 03/11 tối:** Hosting `5104d53c` (rel1103j, commit `79fd3ed`, API giữ `rel5-1103`). LIVE: Roster ghi "Every 15 minutes · Scheduled" và "15-minute scheduled sync" (lần sync tự động 19:40); heatmap học viên Demo hiện 9.13/10 thay cho "—/10". Chưa kiểm live: danh sách quyền tự làm mới ngay sau khi nâng quyền (không nâng thêm tài khoản để thử).
