# 01 — Hiện trạng Promptify

Tổng hợp: 06/10/2026. **CURRENT-AS-IS**, dựa trên audit local 05/10/2026 tại commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Audit khi đó ghi local chậm hơn tracking origin/main 4 commit. Không audit runtime mới, không chứng nhận deployment/DB production.

11 file audit giữ nguyên trong [archive/as-is-audit](archive/as-is-audit/). Điểm bắt đầu: [executive summary](archive/as-is-audit/10_AS_IS_EXECUTIVE_SUMMARY.md), [manifest](archive/as-is-audit/CURRENT_STATE_MANIFEST.md). Audit mô tả implementation, không thay đổi hướng sản phẩm ở [00](00_PRODUCT_SOURCE_OF_TRUTH.md).

## Architecture / stack

- React SPA; App quản lý session/role/class/navigation bằng state/URL. Hybrid workspace đang được mount.
- Browser gọi Supabase Auth/Data API bằng JWT + RLS. AI qua POST `/api/generate` và `/api/evaluate`, kiểm session/quyền rồi gọi provider.
- API chưa tự lưu attempt; frontend gọi RPC sau response để ghi attempt và sync progress bằng trigger.
- History/library/assistance còn browser-local. Cấu hình repo: Vercel static frontend + serverless API; Vite middleware dùng cùng services khi dev.
- Stack theo dải khai báo: React 19, TypeScript 5.7, Vite 6, Tailwind 3, Supabase JS/Auth/Postgres, OpenAI/Gemini. Không thấy React Router/Redux/ORM/backend framework riêng, worker/queue/Redis/retrieval DB trong runtime. Dải khai báo khác version resolved.

Evidence: [01 system](archive/as-is-audit/01_SYSTEM_OVERVIEW.md), [04 architecture](archive/as-is-audit/04_CURRENT_ARCHITECTURE.md), [06 AI](archive/as-is-audit/06_AI_FLOW.md).

## Features

| Nhóm | Có gì / giới hạn |
| --- | --- |
| Identity/lớp | Google OAuth, role learner/instructor/admin, chọn lớp/enrollment/public self-enroll; chưa là SSO/roster Intrepid |
| Học liệu | Published Course → Module → Lesson, rubric/resources; curriculum editor CRUD nhiều request |
| Thực hành | Hybrid brief/theory/context/data/editor, live AI, Judge/retry, attempts và compare thật; có compare mẫu/simulation riêng |
| Progress | Attempts/lesson_progress DB qua RPC/trigger; completed = run đã persist, không chứng minh mastery |
| Giảng viên | Enrollment/course/curriculum CRUD, KPI/activity snapshot; role global |
| History/library | Save/search/star/copy/export nhưng browser-local, chưa shared library server; action mở library chưa nối editor đúng |
| Hỗ trợ | Structure/coach/PII chủ yếu heuristic; tutorial account-scoped; chưa có LLM coach hội thoại hoặc PII hard block |

Inventory: **33 capability: 21 Real / 9 Partial / 3 Mock**. Real chỉ nghĩa có code path. Notebook/reminder legacy không được mount; hoạt ảnh chữ không phải provider streaming/SSE.

Evidence: [02 inventory](archive/as-is-audit/02_FEATURE_INVENTORY.md), [05 flows](archive/as-is-audit/05_USER_FLOWS.md), [06 AI](archive/as-is-audit/06_AI_FLOW.md).

## DB/data model chính

14 public tables được khai báo qua baseline + migrations 002–017; auth.users không tính trong 14. Chưa kiểm catalog live.

| Nhóm | Entities / quan hệ |
| --- | --- |
| Identity | users → learners; auth_provider_id TEXT nullable, chưa unique/FK với auth.users |
| Tổ chức/lớp | clients → classes; courses → classes; learners ↔ classes qua enrollments |
| Học liệu | courses → course_modules → lessons → lesson_rubric_criteria / lesson_resources; course_instructors lưu assignment metadata |
| Thực hành | prompt_attempts event/output/evaluation; lesson_ref_id UUID song song lesson_id TEXT legacy |
| Progress | lesson_progress aggregate learner/class/lesson; RPC/trigger atomic, backfill deterministic |
| Tutorial | user_tutorial_progress theo user và tutorial key |

lesson_resources là text/URL/metadata; enum file không chứng minh upload/storage pipeline. Chưa thấy department/roster/country chuẩn hóa hoặc shared prompt library table. DB published curriculum là nguồn chính nhưng seed fallback có thể khác course.

Evidence: [03 DB/SQL](archive/as-is-audit/03_DATABASE_AND_SQL.md), [07 access](archive/as-is-audit/07_ACCESS_CONTROL.md).

## Có thể reuse

Khả năng reuse theo audit, chưa phải technical decision đã được stakeholder duyệt:

- OAuth/session/role routing; bổ sung identity Intrepid, roster và scope.
- users/learners/classes/enrollments, Course → Module → Lesson; bổ sung membership/department/country.
- Curriculum editor, brief/resources/editor/output/compare UI; nối SOP/sample data và i18n.
- Generate/Judge services và evaluation contract; thay boundary credential/canonical input/provenance.
- Attempts/progress RPC/trigger; xử lý validator/semantics/retry-delete consistency.
- Instructor shell/KPI và tutorial account-scoped; thêm Head role/scope phù hợp.

## 5 technical debts lớn nhất

| # | Debt | Evidence |
| --- | --- | --- |
| 1 | Access chưa nhất quán: public-class/non-UUID API gap, expiration không enforce chung, instructor global, identity bridge yếu | [07](archive/as-is-audit/07_ACCESS_CONTROL.md), [08](archive/as-is-audit/08_TECH_DEBT_AND_RISKS.md): TD-01/03/07/13 |
| 2 | Assessment integrity: score/output/context do client gửi; SQL validator missing-key NULL gap; completed chỉ là persisted run | [03](archive/as-is-audit/03_DATABASE_AND_SQL.md), [06](archive/as-is-audit/06_AI_FLOW.md), [08](archive/as-is-audit/08_TECH_DEBT_AND_RISKS.md): TD-02, SQL-01 |
| 3 | State/persistence phân tán: browser storage chung account/class, library-editor wiring, run overlap và UI/DB score lệch | [08](archive/as-is-audit/08_TECH_DEBT_AND_RISKS.md): TD-04/08/09/10/12/22 |
| 4 | Curriculum/schema/migration drift: DB/seed lệch, rubric/resources update không atomic, baseline chưa final, rollout 016/017 cần đồng bộ phiên bản | [03](archive/as-is-audit/03_DATABASE_AND_SQL.md), [08](archive/as-is-audit/08_TECH_DEBT_AND_RISKS.md): TD-06/11/16 |
| 5 | Verification/scale: regex tests/fixtures cũ, build không typecheck API/tests, instructor tải collections rồi aggregate client | [09](archive/as-is-audit/09_TEST_AND_RUNTIME_STATUS.md), [08](archive/as-is-audit/08_TECH_DEBT_AND_RISKS.md): TD-14/15/17/21 |

Audit không đủ bằng chứng gán CRITICAL; findings HIGH là kết luận static, chưa exploit production.

## Kiểm chứng / chưa biết

Audit ghi tsc/Vite PASS; **19/22 scripts PASS, 3 FAIL, 5 SKIP**. Fail gồm public-class assertion cũ, vertical-slice fixtures cũ và access test có nghi vấn fallback ID collision. Không có coverage đo được, OAuth browser E2E, SQL/RLS runtime hay provider live certification.

Chưa biết deployed commit/migration ledger 016/017, OAuth/provider config, actual production data và ý nghĩa quản lý completion/mastery. Không gọi kết quả audit cũ là kiểm thử mới.

Evidence: [09 test/runtime](archive/as-is-audit/09_TEST_AND_RUNTIME_STATUS.md).
