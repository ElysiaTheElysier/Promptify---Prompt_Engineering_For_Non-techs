# 02 — Kế hoạch pilot Promptify Intrepid đến 23/10/2026

> **Lịch sử (ghi chú ngày 22/10/2026):** kế hoạch này lập ngày 06/10, giả định dùng Supabase/Vercel. Thực tế đã chuyển sang GCP và chưa có production. Xem trạng thái ở [01_CURRENT_STATE.md](01_CURRENT_STATE.md) và việc còn lại ở [05_OPEN_ISSUES.md](05_OPEN_ISSUES.md). File được giữ nguyên đường dẫn vì `scripts/progress-tracker` đọc nó.

Cập nhật: 06/10/2026. **KẾ HOẠCH ĐỂ REVIEW — CHƯA IMPLEMENT.** Deadline và Google Sheet roster là **CONFIRMED** theo quyết định mới của người dùng. Cách sync, lựa chọn kỹ thuật và lịch milestone là **PROPOSED**, chưa phải kết quả đã bàn giao hoặc bảo đảm tiến độ.

Chỉ phụ thuộc:

- [00_PRODUCT_SOURCE_OF_TRUTH.md](00_PRODUCT_SOURCE_OF_TRUTH.md): product boundary ban đầu.
- [01_CURRENT_STATE.md](archive/as-is-audit/01_CURRENT_STATE-2026-10-06.md): baseline/evidence/reuse.
- [03_DECISION_LOG.md](03_DECISION_LOG.md): quyết định mới S3, trạng thái và câu hỏi cần chốt.

S3 trong 03 cập nhật deadline/roster/scope pilot và thay các ghi nhận cũ “chưa có deadline”, “chưa chọn nguồn roster”. Theo yêu cầu, không sửa 00/01 hoặc tạo tài liệu mới. Đợt này chỉ cập nhật plan và log; không sửa code, chạy migration, commit/push/deploy.

## Đi ngược từ deadline

**23/10:** nghiệm thu usable pilot → **21–22/10:** rehearsal bằng user/data thật và sửa lỗi chặn → **20/10:** toàn bộ learner + Trainer + Head flow đã nối, đóng băng feature mới → **16/10:** learner learning vertical slice có AI thật và persisted progress → **12/10:** Sheet → roster → login/profile → department zone → **08/10:** môi trường pilot/identity foundation và quyền truy cập dịch vụ sẵn sàng.

Ngày theo Asia/Saigon. Đây là ngày lịch, không giả định nhân sự làm cuối tuần. Cần xác nhận capacity ngay 06/10; ưu tiên việc găng vào ngày làm việc và chỉ lên lịch cuối tuần nếu đội đã có capacity. Không có buffer cho việc đổi stack toàn diện hoặc chờ credential đến M3.

## MUST HAVE BY 23/10

**CONFIRMED — S3 trong 03:**

- Google Sheet bắt buộc là nguồn roster Phase 1, tối thiểu Email, Full Name, Business Function/Department, Country.
- Trainer/Admin cập nhật Sheet; Promptify sync/import thành công, pre-onboard learner, đối chiếu login và xác nhận profile rồi route đúng department.
- Ít nhất một assigned course/lesson có scenario, SOP/context và sample data được phép sử dụng.
- Learner viết prompt, Run AI thật, nhận output và evaluation/feedback, sửa/rerun, compare; attempt/progress lưu bền vững và đọc lại sau refresh/login.
- Trainer xem learner/cohort, quản lý ít nhất một course/lesson, gắn SOP/sample data, xem progress cơ bản.
- Head login, chỉ đọc đúng department của mình và xem learner progress cơ bản.
- Department access isolation trên data/API, không chỉ ẩn menu hoặc lọc UI.
- Phiên bản hiện tại tiếp tục độc lập; credentials Intrepid backend-side, không hiển thị secret thô.

**Tiêu chí pilot đề xuất:** ít nhất một department có bài học thật; dùng hai department/account groups để kiểm thử isolation. Số cohort/users pilot cụ thể cần Đức xác nhận, không bắt rollout đủ 27 functions/550 SOP.

## Google Sheet strategy — đề xuất tối thiểu

**Nguồn Google Sheet là CONFIRMED; cơ chế dưới đây là PROPOSED (D33).**

1. Một Sheet/tab do Intrepid sở hữu với bốn cột bắt buộc. Trainer/Admin sửa tại Sheet; Postgres lưu snapshot/membership/enrollment và progress. Sheet không là database chính và learner login không phụ thuộc việc gọi Sheet trực tiếp.
2. **Explicit “Sync now”**, chỉ Trainer/Admin được phép gọi. Backend đọc private Sheet bằng danh tính có quyền read-only được IT cấp. Sheet ID/tab và secret nằm phía server; không public Sheet, không gửi credential xuống browser. Không chọn thư viện/auth credential cụ thể trong kế hoạch này.
3. Validate trước khi áp dụng: email trim/lowercase và unique; đủ bốn trường; department/country map theo danh mục được duyệt; dòng thiếu/sai/duplicate có row number và lý do. Full Name giữ Unicode. Role Trainer/Head được cấp riêng, không lấy từ cột tùy ý trong roster.
4. Preview create/update/unchanged/errors; apply batch hợp lệ theo email ổn định. Đề xuất từ chối cả batch khi có lỗi dữ liệu bắt buộc, tránh import nửa chừng. Sync lặp không tạo user/enrollment trùng. Có batch ID, timestamp, counts và lỗi ngắn để debug, không log toàn bộ dữ liệu cá nhân.
5. Giữ last successful snapshot khi Sheet/API lỗi; UI cho biết batch thất bại và thời điểm sync thành công cuối. Không báo success giả, không xóa identity/progress hay tự đổi quyền từ batch lỗi.
6. Department/country sửa trong profile không tự cấp quyền mới: learner gửi correction, Trainer duyệt roster/membership. Chuyển phòng ban hợp lệ phải đổi scope nhất quán; user vắng mặt trong Sheet không tự bị xóa dữ liệu. Cơ chế disable/revoke được Trainer thực hiện rõ và cần chốt trong M1/M2.
7. **Fallback nếu private API access chưa sẵn sàng ngày 08/10:** Trainer export CSV từ đúng Sheet được chỉ định rồi import qua cùng pipeline validate/preview/apply. Ghi source Sheet/batch và trainer thực hiện; không chấp nhận nguồn roster tùy tiện hay public CSV URL. Đây vẫn là Google Sheet roster, không thay bằng database/roster khác.
8. Chốt API “Sync now” hay fallback CSV ở gate M1, trước coding connector; tới 12/10 phải demo được ít nhất một đường lấy roster từ Sheet. Không xây cả hai connector nếu một đường ổn định đủ pilot.

**AFTER PILOT:** background sync 5 phút, worker/queue/Redis/cache scheduler, incremental sync, hai chiều và auto-deprovision. Không coi interval/quota/Redis/SSE là confirmed.

## Milestones 06/10 → 23/10

### M1 — Identity foundation và mở khóa dịch vụ | 06–08/10

- **Goal:** người dùng pilot đăng nhập được trong môi trường độc lập; xác định identity đáng tin và đủ access để bước tiếp.
- **Features:** login/session/role foundation; từ chối user ngoài phạm vi Intrepid; pilot department mapping tối thiểu; xác nhận Sheet/tab, OAuth/domain và GCP AI access.
- **Existing code reused:** Supabase Auth/Google login, App session/role routing, users/learners, API auth services, generate/evaluate services. Hiện trạng theo 01; callback/session cần kiểm runtime.
- **Required changes đề xuất:** tách môi trường pilot khỏi bản hiện tại; thắt identity bridge; bỏ đường public self-enroll cho pilot; cấu hình role Trainer/Head rõ. Chuẩn bị Sheet đọc được và smoke-check AI trên môi trường được phép khi triển khai.
- **Dependencies:** IT cấp Sheet reader hoặc quyền export; domain/SSO callback và credential GCP được duyệt; Đức cung cấp roster mẫu và scope pilot. Không đợi M3 mới xin AI access.
- **Definition of Done:** user Intrepid kiểm thử login/logout/session thành công; account ngoài phạm vi bị từ chối; Trainer role không do browser tự đặt; gate chọn connector Sheet rõ; AI credential/provider có đường gọi được xác minh hoặc blocker có owner và ngày xử lý.
- **Demo scenario:** Trainer và một user pilot login với identity kiểm thử được cấp rõ; account ngoài Intrepid bị chặn; Trainer cho thấy private Sheet truy cập được hoặc bản export được phép. Chưa coi user seed ở M1 là hoàn tất roster.
- **Main risk:** chờ IT/credential hoặc chọn cách deployment/SSO không tương thích; escalation cho owner ngay 07/10.
- **Owner dự kiến:** engineering phụ trách foundation; Đức xác nhận pilot/content; IT Intrepid cung cấp access. Tên người thực hiện cần chốt, chưa tự gán capacity.

### M2 — Google Sheet roster → onboarding → Department Zone | 09–12/10

- **Goal:** Trainer cập nhật Sheet, learner mới được pre-onboard và đến đúng zone.
- **Features:** Sync now hoặc CSV export/import được chọn ở M1; validate/preview/result; upsert roster; match login; confirmation/correction; department routing và quyền read/write tối thiểu.
- **Existing code reused:** dbService users/learners/enrollment, App resolve session/class selection, classes/course assignment và RLS ownership nền tảng.
- **Required changes đề xuất:** Sheet adapter/import boundary server; department/country mappings, batch snapshot; idempotent identity/enrollment; profile confirmation; Head department membership; API/DB guards gắn identity + department, không coi email suffix/UI filter là đủ quyền.
- **Dependencies:** M1; Sheet bốn cột, domain và membership policy; hai department groups để kiểm access; roster correction/revocation policy.
- **Definition of Done:** import batch thật từ Sheet; sync lần hai không trùng; lỗi dòng báo rõ và không áp dụng nửa batch; API lỗi giữ snapshot tốt; learner match/confirm/route đúng; sửa department chưa duyệt không tăng quyền. Learner/Head không đọc được bài/attempt/data phòng ban khác qua direct request.
- **Demo scenario:** Trainer thêm/sửa learner trên Sheet → sync/import → user đó login → confirm profile → zone; tiếp theo demo duplicate email, user không có roster và truy cập chéo department bị chặn.
- **Main risk:** identity/profile mismatch hoặc policy scope thiếu khiến routing đúng UI nhưng dữ liệu vẫn rò. Đây là gate bắt buộc trước bài học thật.

### M3 — One real learning vertical slice | 13–16/10

- **Goal:** learner hoàn thành một vòng thực hành thật có feedback, compare và progress lưu được.
- **Features:** một assigned course/module/lesson, scenario/SOP/sample data; Run AI → output → evaluation/feedback → rerun → compare → save/reload.
- **Existing code reused:** Course → Module → Lesson, curriculumAdapter, HybridView/PromptComposer/compare UI, generate/evaluate endpoints, evaluation contract, recordPromptAttemptAndProgress và retry RPC/lesson_progress.
- **Required changes đề xuất:** chỉ lấy canonical lesson/context đã được phép; nối GCP runtime được chốt; xử lý provider timeout/evaluate/save errors rõ; gắn kết quả đúng attempt khi async; giải quyết SQL validator NULL gap và client-supplied provenance cho path dùng báo cáo; bỏ seed fallback khác course và browser-cache leakage.
- **Dependencies:** M2 department gate; AI access đã mở ở M1; Đức duyệt ít nhất một lesson/SOP/sample data, rubric feedback đủ cho pilot; xác minh DB/RPC/migration compatibility khi triển khai.
- **Definition of Done:** hai lượt AI thật hiển thị đúng output/feedback và compare; refresh/login lại thấy attempts/progress của mình; Head khác department không đọc được; retry không nhân đôi attempt; client không tự gửi điểm tùy ý được tin làm progress assessment. Failure state không báo hoàn thành giả.
- **Demo scenario:** learner từ Sheet mở bài được giao, chạy prompt lần 1, dùng feedback sửa lần 2, compare, reload; demo một evaluate/save failure và retry an toàn.
- **Main risk:** quyền AI/model hoặc integrity/RPC debt làm loop không persist đáng tin. Không cứu demo bằng simulation; persisted run vẫn không được gọi là mastery.

### M4 — Trainer và Head dùng được tối thiểu | 17–20/10

- **Goal:** Đức vận hành bài học pilot và Head theo dõi đúng team.
- **Features:** Trainer xem learner/cohort, sửa ít nhất một course/lesson, gắn SOP link/sample text, publish/assign và xem progress; Head login/read-only own-department progress. Giữ EN/VI tối thiểu cho đường pilot.
- **Existing code reused:** InstructorViewShell, learner/enrollment table, CourseCurriculumEditor, replaceLessonRubrics/resources, lesson resources và DB-derived progress snapshot.
- **Required changes đề xuất:** chia Trainer/Head scopes ở queries/API/DB; không cho Head dùng quyền instructor global; status/publish/save đúng; basic dashboard count/last activity/completion có nhãn nghĩa rõ; minimal pilot translations và không để key raw xuất hiện.
- **Dependencies:** M2 role/membership, M3 attempt/progress; nội dung được duyệt; cách đo cơ bản và permissions đã chốt đủ.
- **Definition of Done:** Đức tự sửa/gắn/publish bài, learner nhận đúng bản và Đức xem persisted progress; Head thấy learner trong department mình và bị từ chối truy cập/sửa ngoài quyền. Reload giữ dữ liệu; UI phân biệt completed run với mastery. Full library/advanced analytics không là dependency.
- **Demo scenario:** Đức cập nhật SOP/sample data một bài → learner làm → Đức/Head xem progress; đổi sang Head phòng ban khác cho thấy không xem được dữ liệu này.
- **Main risk:** curriculum CRUD nhiều request và global instructor RLS gây scope/state lỗi. Dùng SOP link/text đã duyệt, không xây upload/ingestion mới để đạt mốc.
- **Gate 20/10:** flow ba vai trò đã nối; dừng feature mới, chỉ xử lý blocker/usability để rehearsal.

### M5 — Hardening, rehearsal và usable pilot | 21–23/10

- **Goal:** đến 23/10 có bản pilot thật dùng được và có thể lặp lại demo.
- **Features:** negative-access checks; Sheet error/retry/idempotency; refresh/relogin persistence; AI/error/retry path; cấu hình và nội dung pilot final; EN/VI thiết yếu; quyền Trainer/Head đúng.
- **Existing code reused:** test fixtures/contracts phù hợp, login/enrollment/curriculum/RPC tests, toàn bộ path M1–M4. Tests regex/stale fixtures trong 01 không thay runtime evidence.
- **Required changes đề xuất:** chỉ sửa blocker tìm thấy; check RPC/RLS trên môi trường pilot, provider thật và browser; basic request/batch/attempt correlation không lộ secrets; hướng dẫn sử dụng/recovery ghi trong phần này hoặc UI hiện có, không tạo tài liệu mới ở đợt update plan.
- **Dependencies:** M1–M4 done; Sheet roster/test accounts và lesson đã được Đức duyệt; người nghiệm thu và IT sẵn sàng.
- **Definition of Done:** 21/10 rehearsal toàn flow với roster thật; 22/10 rerun sau sửa blocker và kiểm isolation/error paths; 23/10 Đức nghiệm thu learner + Trainer + Head flow. Không còn blocker ở roster/login/routing/AI/feedback/compare/persistence/isolation; dữ liệu không mất qua refresh/login.
- **Demo scenario:** Trainer sửa Sheet và sync/import → learner login/match/confirm/zone → course/lesson/context → Run AI/feedback/rerun/compare → reload progress → Trainer quản lý bài/xem progress → Head xem đúng team; account khác department bị chặn.
- **Main risk:** rehearsal muộn phát hiện lỗi nối hệ thống. Giữ 21–22/10 cho sửa và kiểm lại, không dùng làm thời gian xây feature defer.

## Reuse matrix

Hiện trạng lấy từ 01; toàn bộ quyết định reuse là **PROPOSED**, không mặc định viết lại toàn bộ sản phẩm.

| Capability | Current As-Is | Decision | Thay đổi / lý do |
| --- | --- | --- | --- |
| Google login | OAuth thật | REUSE WITH CHANGES | Intrepid gate, roster, confirmation |
| users/learners | DB identity/learner | REUSE WITH CHANGES | Country/department và identity link |
| classes/enrollments | Course/class/enrollment | REUSE WITH CHANGES | Cohort/department scope, bỏ public entry |
| Course → Module → Lesson | Published DB chain | KEEP | Giữ cấu trúc |
| Curriculum editor | CRUD nhiều request | REUSE WITH CHANGES | SOP/sample data, publish consistency |
| Playground | Hybrid đang mount | REUSE WITH CHANGES | Context, i18n, async state |
| AI generation | Server API OpenAI/Gemini | REUSE WITH CHANGES | GCP runtime/credential/usage boundary |
| AI evaluation | Judge thật, client persistence | REBUILD | Provenance boundary; reuse UI/contract phù hợp |
| attempts/progress | RPC/trigger atomic | REUSE WITH CHANGES | Validator, retry/delete, completion semantics |
| Compare | Lượt thật và demo | REUSE WITH CHANGES | Persisted attempts đúng scope |
| History | Browser-local | REUSE WITH CHANGES | Chỉ cần attempts của bài đang học từ DB cho pilot; full history screen sau pilot |
| Prompt library | Browser-local | AFTER PILOT | Shared persistence/curation không cần cho pilot; không dùng cache chung account làm library phòng ban |
| Instructor dashboard | DB snapshot, global scope | REUSE WITH CHANGES | Trainer/Head views và metric semantics |
| RLS/access control | Ownership/enrollment có | REBUILD | Department isolation ở data/API |
| localStorage | History/library/assistance chung | REUSE WITH CHANGES | Chỉ giữ preference phù hợp, tránh leakage |
| API layer | Generate/evaluate endpoints | REUSE WITH CHANGES | Canonical input/provenance/auth |
| Tutorial | Account-scoped DB | KEEP | Giữ logic phù hợp |
| Public enrollment/BASIC/payment | Public enrollment có; chưa thấy payment runtime | NOT NEEDED IN PHASE 1 | Ngoài target |
| Notebook/reminder legacy | Unmounted/mock | NOT NEEDED IN PHASE 1 | Không tạo scope từ file tồn tại |


## Data model: chỉ phần phục vụ pilot, chưa có SQL

Tất cả delta kỹ thuật là PROPOSED; không thiết kế Google Sheet thành database chính.

| Existing entity | Vấn đề | Delta tối thiểu đề xuất |
| --- | --- | --- |
| users/learners | Identity bridge yếu, thiếu confirmation/membership | Stable verified-auth mapping + normalized roster email; profile confirmation không tự tăng quyền |
| Chưa có roster/department model | Chưa lưu snapshot/import/membership chuẩn | Sheet snapshot/batch và department/country mapping tối thiểu; chốt cardinality trước delta schema |
| clients/classes/enrollments | Client/class chưa enforce department | Intrepid cohort/department/course assignments, idempotent enrollments |
| courses/modules/lessons/resources | Generic context, CRUD nhiều requests | Một course/lesson published đúng context; references/text đã được phép, không ingest 550 nguồn |
| users.role/course_instructors | Global instructor scope | Trainer quản lý; Head own-department read-only; kiểm cả DB/API |
| prompt_attempts/lesson_progress | Provenance/validator/async gaps | Server-controlled result path, canonical lesson, attempts/progress đúng scope; không client-forged assessment |
| Browser history/library | Cache dùng chung account | Chỉ path compare/persisted attempts cần pilot; bỏ cache nhạy cảm khỏi scope dùng chung, shared library sau pilot |

## AFTER PILOT

- Automatic/background sync, interval 5 phút, Redis/worker/queue, incremental/bidirectional sync.
- Full prompt library với sharing/curation/search/permissions nhiều cấp; full history và analytics/impact/mastery dashboard.
- Head upload/review SOP/sample data, quản trị nhiều membership/country/cohort phức tạp ngoài nhóm pilot.
- Complex SOP ingestion, video processing, RAG/vector infrastructure, toàn bộ 550 nguồn.
- Provider streaming/SSE, advanced editor/coach và observability infrastructure.
- Advanced i18n polish/mở rộng ngôn ngữ. Giữ EN/VI tối thiểu trên pilot path; không biến “polish” thành cắt toàn bộ hỗ trợ ngôn ngữ đã confirmed.
- Multi-tenant/white-label/clone, payment/BASIC/Partner/ERP automation tiếp tục OUT Phase 1, không mặc định bắt đầu ngay sau pilot.

## Quyết định cần chốt sớm

| Điểm | Trạng thái / nguồn trong 03 | Gate |
| --- | --- | --- |
| Hạn usable pilot 23/10 và Google Sheet là nguồn bắt buộc | CONFIRMED D24/D34 | Không mở lại lựa chọn nguồn roster/deadline |
| Minimum flows, ưu tiên usability | CONFIRMED D35 | Must-have không đổi theo cut list |
| Capacity, pilot cohort/department và owner access/content | Lịch PROPOSED D36; capacity/owners/pilot size còn OPEN | 06–08/10 |
| SSO/provider/domain, deployment độc lập, GCP AI/runtime | OPEN D14/D15/D28 | M1; không đổi stack lớn vì deadline |
| Sync now/private reader hay Sheet-export CSV fallback | PROPOSED D33; cần chọn | M1 trước connector, demo M2 |
| Profile correction/membership/revocation, dữ liệu được phép | OPEN D23/D25 | M1/M2 trước quyền dữ liệu thật |
| Evaluation/provenance/rubric và progress semantics | PROPOSED D26 / OPEN D19 | M3; feedback thực hành không là mastery chính thức |
| Basic usage control | OPEN D20 | Trước AI pilot; không mặc định 20 req/min/50k/session/Redis |
| Sync interval/worker/SSE/advanced library/analytics | PROPOSED/OPEN; AFTER PILOT | Không chặn mốc pilot vì chưa build |

## Top 3 deadline risks

| Rủi ro | Tại sao có thể trễ | Hành động / latest gate |
| --- | --- | --- |
| Quyền Google Sheet/SSO/GCP AI đến muộn | Blocking ngoài code, không test provider/onboarding thật | IT + Đức mở access M1; chọn Sheet-export fallback 08/10 nếu cần; không thay GCP bằng provider khác chưa duyệt |
| Identity/department authorization debt | Global instructor, weak bridge, bypass/API và forged score trong baseline | Negative tests ở M2/M3; không cắt isolation/provenance; review boundary sớm |
| Nội dung/RPC integration và scope creep | Thiếu lesson/data được duyệt, DB drift, async save lỗi; thêm library/ingestion chiếm rehearsal | Đức chốt một lesson M2; learner E2E thật M3; freeze 20/10; cắt feature defer trước |

## Traceability

| Item | Source trong active docs | Status |
| --- | --- | --- |
| Product Intrepid / roles / data / i18n / credential | 00; 03 D01–D09 | CONFIRMED |
| Google Sheet roster bốn trường | 03 S3/D24 | CONFIRMED |
| Deadline 23/10/2026 | 03 S3/D34 | CONFIRMED |
| Minimum usable flows / ưu tiên pilot | 03 S3/D35 | CONFIRMED |
| Baseline/code reused | 01; reuse matrix | CURRENT-AS-IS; reuse lựa chọn PROPOSED |
| Sync now/import mechanics, milestones và data deltas | 03 D33/D36/D13/D26 | PROPOSED / OPEN |
| Quota/streaming/worker/library/analytics chi tiết | 03 D17/D20/D21/D22/D33 | PROPOSED / OPEN; defer phần không cần pilot |

## Critical Path to 23/10

**Sheet access/export được phép (08/10) → roster mapping/validated import → verified identity/profile → department authorization/routing (12/10) → assigned curriculum/SOP/sample data → AI output + evaluation/feedback → persisted attempts/progress/rerun/compare (16/10) → Trainer/Head basic operations (20/10) → rehearsal/fix (21–22/10) → nghiệm thu pilot (23/10).**

Nhánh song song không được chờ: **IT OAuth/domain + GCP credential/provider + deployment/DB compatibility từ M1**; **Đức duyệt lesson/SOP/sample data trước M3**. Quyền department là foundation, không là hạng mục hardening cuối cùng.

Nếu M2 chưa đạt ngày 12/10 hoặc M3 chưa đạt ngày 16/10: báo blocker/owner trong ngày, kích hoạt cut list, tập trung đúng flow tối thiểu. Không đổi ngày confirmed, không dùng simulation/demo seed thay learning flow thật, không declare usable khi isolation/persistence còn hỏng.

## Cut List

Thứ tự cắt/defer nếu lịch trễ, trước khi hy sinh rehearsal:

1. Full prompt library, advanced analytics/impact dashboard, full history UI.
2. Automatic background sync, worker/Redis, incremental/two-way sync; giữ đường lấy roster từ Google Sheet đã chọn và vận hành được.
3. Complex SOP ingestion/upload/video/RAG; dùng một lesson với references/sample text được duyệt.
4. Streaming/SSE, editor/coach/compare nâng cao; giữ AI output/feedback và compare hai attempts thật.
5. Head/Admin features nâng cao, submission/curation, multi-cohort automation, advanced i18n polish; giữ Head login/own-department progress, Trainer course/lesson basics, EN/VI thiết yếu.
6. Mở rộng số department/course/users ngoài pilot tối thiểu — phải thống nhất scope pilot với Đức; không bỏ bài thật hoặc kiểm access giữa departments.

**Không được cắt:** Google Sheet roster và successful sync/import, login/match/profile, department routing, một real learning flow có scenario/SOP/sample data, AI run/output/evaluation-feedback/rerun-compare, persistence/progress, department isolation; Trainer tối thiểu, Head own-department progress và rehearsal trước 23/10.

Lựa chọn fallback chỉ giảm cơ chế/infrastructure; không thay nguồn Sheet, không public roster/secret và không làm yếu quyền truy cập.
