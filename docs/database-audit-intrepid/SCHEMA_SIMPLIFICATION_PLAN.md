# Schema simplification and safe migration plan — Intrepid

**Ngày:** 2026-10-13. **Trạng thái:** đề xuất để review; không có DDL/DML triển khai, không migration nào được chạy. Đọc [audit report](DB_AUDIT_REPORT.md), [table inventory](TABLE_INVENTORY.md), [ERD hiện tại](ERD_CURRENT.md) và [ERD đề xuất](ERD_PROPOSED.md).

## Quyết định kiến trúc đề xuất

Giữ Cloud SQL PostgreSQL là authority cho identity mapping nghiệp vụ, membership, curriculum, attempts/progress/awards, private context và SOP publication. Cloud Storage giữ file bytes. Firebase Auth giữ authenticated subject, không giữ role/class permission authoritative. Cloud Run kiểm token và scope trước trusted SQL; RLS/transactional RPC giữ integrity ở DB. Firestore chỉ gửi invalidation notices riêng UID và protected payload luôn reload từ SQL.

Đối với quy mô **chưa có số đo live**, chọn một operational path dễ vận hành: SQL analytics + một SOP retrieval mode. Template hiện chọn pgvector, cloudsql embedding và warehouse=false; có thể giữ lựa chọn đó nếu extensions/IAM/model readiness qua staging, nhưng đổi model phải được đánh giá riêng. Code BigQuery có thể giữ để review/phase sau; không bật SQL và BQ thành hai authorities. Đề xuất trì hoãn BQ không phải quyết định tự hủy yêu cầu full-GCP trước đây: cần product/engineering chốt rollout scope, không xóa mã trong audit.

Không tạo thêm bảng chỉ để “chuẩn hóa” mỗi trường JSON hoặc class config. Những fields quan hệ/authorization cần constraints; snapshot/model input/config variable-length có thể giữ JSONB với schema validators. Không thêm generic grants table hay mega-table activity chứa run, award, audit, hint và receipt.

### Authority và grain cần thống nhất

| Dữ liệu | Authority / grain đề xuất | Compatibility cần giữ |
|---|---|---|
| Curriculum | course/module/lesson global; course edits phải explicit course scope | UUID và lesson_key cũ, published/history |
| Class lesson overrides | Studio `(class_id,lesson_id)`, bao gồm config/rubric và content overrides nếu cần | Không ghi global lesson/rubric khi save riêng lớp |
| Rubric | global rubric default; Studio rubric override; run snapshot frozen | Giữ lesson_rubric_criteria đến khi toàn reader/generator/seed xác nhận authority |
| Membership | enrollment learner/class/status; optional imported roster metadata | Giữ removed/completed/history, learner UUID/code |
| Attempt | persisted learner output/score/threshold | lesson_ref_id canonical, lesson_id text evidence |
| Run / Judge | request snapshot + provider outcome; claim riêng cho concurrency | subject/request idempotency, uncertain outcomes, claim UUID |
| Progress / Award | progress read model; award evidence bất biến theo policy đã cấp | Không tính lại/renumber chứng chỉ đã cấp |
| SOP | document identity → immutable version → class/lesson pinned binding → searchable chunks | Citation IDs, original metadata/file bytes, approval boundaries |
| Search/report projections | derived, rebuildable, freshness contract | Current SQL authorization thắng stale projection |

## Số bảng và điều kiện giảm

| Phương án | PostgreSQL count | Điều kiện | Mức tin cậy |
|---|---:|---|---|
| Platform cutover bảo toàn hiện tại | 50 | 48 source business + identity binding + outbox | Cao source-level; chưa live |
| Gộp roster metadata | 49 | Gate M1: cardinality, scope, data/consumer parity | Trung bình |
| Retirement governance singleton | 48 | Gate D1: không external consumer; archive đầy đủ | Trung bình |
| Retirement tutorial ở target Intrepid riêng | 47 | Gate D2: feature không dùng, MVP không bị tác động, giữ export lịch sử | Thấp–trung bình |
| Giảm an toàn đã được xác minh live ngay | **0** | Chưa có catalog/data/usage thật | Cao về giới hạn evidence |

**47 là upper bound có điều kiện của phương án hiện tại**, không phải mục tiêu KPI. Ba NEEDS INVESTIGATION là lesson rubric và hai bảng rotation; không tính chúng vào savings. Không tính việc tắt BQ là giảm business SQL tables. Không cộng bảng Auth/Storage hệ thống, Firestore collections hay BQ views vào SQL count.

## Impact analysis theo candidate

### M1 — product_roster_profiles → enrollments

- Evidence: product_import_roster tạo user/learner/enrollment rồi upsert profile `(user_id,class_id)`; country/department là membership metadata. PK learners.user_id unique tạo đường map 1 user → 1 learner.
- Phải chứng minh: mọi profile map tới đúng 1 learner và đúng 1 enrollment; không instructor/admin profiles; không profile surviving unenrollment cần lifecycle riêng; country/department có nghĩa snapshot hay current. Không suy ra “0 rows nghĩa unused”.
- Preserve: country, imported department text, profile updated_at và source PK mapping. Không thay imported_department bằng classes.department. Nếu metadata có nhiều revisions hoặc cần sống ngoài enrollment, **hủy merge** và KEEP.
- Consumers: product_import_roster, product_finish_roster_sync, rebuild_import_roster compatibility nếu vẫn được gọi, export/import/check/reconcile manifests, metadata generators, offline fixtures/contracts, support/admin SQL. Export root source vẫn là lịch sử shared; target adapter có thể đọc dạng cũ qua compatibility view, không cross-app import.
- Security: profile hiện service-only. Thêm country/department vào enrollments có thể làm lộ qua authenticated SELECT hoặc `.select('*')`; cần preserve column privileges/projection behavior và negative tests. Nếu cần RLS riêng mà column permissions/API projections không bảo đảm, **không merge**.
- Rollback: giữ source profile table và mapping/archive trong expand/contract window. Backfill reverse dùng đúng timestamps/imported fields; enrollment mutations không được làm mất previous profile snapshots. Chỉ contract khi rollback drill chứng minh.

### D1 — product_governance_config

- Evidence: singleton DDL + service policy/export opt-in; không có current business function/API reader/writer. Governance screen lấy env/domains/audit; budgets không lấy config. Đây là absence evidence đã đối chiếu nhiều access routes, vẫn có khả năng external SQL.
- Gate: review external admin scripts/BI, live contents, config keys, grants/owners và query/audit logs trong observation window. Xác nhận có phải intended future feature đang được provisioned. Nếu feature còn cần, KEEP với owner rõ ràng thay vì bảng placeholder không consumer.
- Preserve: archive row/config/revision/updated_by/time/checksum. Không biến JSON config thành env từng key nếu chưa biết semantics. Không giảm source schema shared hoặc migration history.
- Rollback: target restore archived row bằng mapping gốc; tương thích permission/revision. Giai đoạn đầu chỉ stop future use/exclude optional target provisioning khi được duyệt; không destructive retirement sớm.

### D2 — user_tutorial_progress

- Evidence: có migration 007, old application purpose và user-scoped export; Intrepid Firebase/ProductionEntry/onboarding không gọi bảng. Không có căn cứ xóa dữ liệu shared source vì MVP có thể dùng.
- Gate: xác nhận Intrepid tutorial tracking đã retired, không pending rebuild feature; review user support/history/analytics consumers. Observation phải bao gồm onboarding và profile confirmation, không chỉ một buổi workshop.
- Preserve: toàn selected-user tutorial_key/completed_at, cả key không biết hiện tại; giữ archived export/checksum ngoài Git nếu chứa business data. Tutorial API compatibility nếu có external callers.
- Rollback: rehydrate original `(user_id,tutorial_key)` và completion times; không reset completed status của người học.

### Không gộp các cặp dễ bị nhầm

| Cặp | Lý do KEEP riêng |
|---|---|
| run + attempt + judge claim | Run có thể chưa có attempt; provider uncertainty/claim lifecycle khác learning evidence. |
| progress + attendance + award | Learning aggregate, human attendance và issued evidence có authority khác. |
| contribution + document/version | Unapproved private intake khác published canonical content/citation. |
| SOP version + binding | Many lessons/classes pin version; remove binding không được mất history. |
| learner context + shared SOP chunks | Owner privacy không phải enterprise approved corpus. |
| sheet connection + sync log + import ledger | Config, background job failure và import idempotency có lifecycle khác; manual import không cần connection. |
| draft + library | Autosave thay đổi liên tục khác submission/moderation snapshot. |
| class grants + course instructors | Class/head scope khác course editor scope; cần sửa semantics chứ không generic hóa. |
| hint + broadcast + receipt | Recipient privacy, class scope và per-user read state khác nhau. |
| rotation request + approvals | Approval cardinality và separation of duties phải giữ nếu workflow còn sống. |
| audit + outbox | Compliance/history khác delivery retry; retention và consumer khác. |

## Phases và acceptance gates

### Phase 0 — Chốt evidence trước thiết kế migration

Không có execution trong audit này. Công việc sau khi được duyệt cần source read-only role và target staging riêng:

1. Lấy live catalog, applied-migration versions, extensions, table owners, role memberships, table/column/function grants, definer ownership/search_path và RLS enable/force flags. Script export hiện có chưa xuất đầy đủ owners/function ACL/row-security flags nên phải bổ sung read-only collection; không dùng baseline dictionary làm truth.
2. Đối chiếu source 050, GCP 001–005, generated metadata/data-manifest và source catalog; ghi expected target-only additions riêng. Drift tool hiện loại identity/gcp policies nhưng dùng catalog baseline cũ và cần account outbox/vector/050; không coi diff đơn giản là migration instruction.
3. Kiểm kê row counts, tenant/class ownership, distinct/orphan membership, cross-client course sharing, email/legacy subjects, run→attempt cardinality, SOP document/version tuples và embedding model/dimensions/types. Có row ít hoặc zero vẫn phải review lifecycle/consumer.
4. Thu workload/consumer evidence: pg_stat_statements hoặc log window đủ chức năng, maintenance jobs/BI/admin SQL, application traces. Dùng approved data-minimized aggregates; không đưa raw prompt/email/key vào audit report.
5. Chốt Intrepid class/client/course IDs, PII retention, allowed region/model endpoint, RPO/RTO, traffic freeze window và export custody. Các giá trị này hiện **TBD**, không tự chọn.

**Gate 0:** live drift resolved hoặc documented, approved scope không kéo tenant ngoài ý muốn, catalog generation reproducible, nguồn/target và ownership xác nhận.

### Phase 1 — Sửa blockers ở staging trong công việc triển khai riêng

- F01: chốt global-vs-class content và rubric authority; không tự clone course cho từng class hoặc thêm abstraction.
- F02: sửa key contract thống nhất trigger/keys/worker/backfill; test actual chunk insert/update/delete → outbox → consumer drain, including retries và dead letter.
- F06/F10: same-course cross-client instructor, unassigned instructor lesson_progress read, head vs editor, removed/completed enrollment, domain revocation, existing-target correction khác course. Product owner xác nhận current self-service policy; không ngầm đổi policy đã phê duyệt.
- F03: khóa embedding contract. Default label phải đúng producer; imported vector validated; source hash/model/task/dimension preserved. Nếu đổi model, test chất lượng/citation/revocation và version readiness, không chỉ 768-length.
- F07: quyết định enforce relational tuple ở constraint/RPC phù hợp, preflight duplicate trước thêm unique run→attempt.
- F11/F12: maintain metrics definitions/snapshot consistency; không đưa tính lại certificate vào generic read endpoint mặc định.

**Gate 1:** negative authorization tests và semantic integrity tests pass trên engine/roles target thật; embedded PostgreSQL và mocked BQ chỉ supplemental, không substitute.

### Phase 2 — Platform migration bảo toàn 50 bảng

Tách phase này khỏi optional table merge. Nguồn Supabase/MVP tiếp tục hoạt động theo kế hoạch rollout được duyệt.

- Snapshot backup + restore drill và scoped source export repeatable-read; validate FK closure và business ownership, UUIDs, sequence state, timestamps/Unicode/JSON, certificate IDs/evidence, legacy subjects, raw storage bytes/checksums. Excluded seed/backfill statements review explicit; không replay seed SQL.
- Target staging empty và roles separate migration owner/runtime; schema/extensions/model integration validated. Review generated vector cast/HNSW resource/lock costs với production-shaped sample trước import lớn. Trong future migration review phải có lock/statement budget, WAL/disk budget và resumability; fresh-target build khác live ALTER.
- Import chính xác approved data; preserve trigger state rồi run semantic reconciliation trước cho app write. Identity prebinding/first-login collision tested. Mọi unexpected source/target class dependency là stop-and-review, không auto-expand export.
- Reconcile count + PK + canonical hashes + semantic tuples + source/target permissions. Reembed nếu đã approved xảy ra **sau** raw import reconciliation, tách expected derived-vector differences khỏi original evidence hashes; backup vectors cũ trước replace.
- Files verify byte checksum và metadata paths; private signed download scope phải đúng publication/class/owner.
- Backfill/drain outbox khi consumer đã proven; store original failed events trước repair/replay. BQ activation riêng với lag threshold và query parity; warehouse disabled không đồng nghĩa consumer không xử lý keys.

**Gate 2:** 100% approved IDs/rows/files reconcile hoặc signed documented exclusions; không unexpected tenant rows; no unresolved semantic mismatch; identity/certificate stable; live IAM/network/extensions proven; backup restored successfully.

### Phase 3 — Cutover và rollback drill

- Chọn một writer authority trong mỗi giai đoạn. Tạm freeze Intrepid writes theo window được duyệt, export final delta và reconcile rồi switch traffic. Không dual-write SQL/Firestore/BQ như một transaction giả.
- Kiểm thử UI00–15 trọng yếu: login/profile/correction, roster import + scheduled sync, global/class authoring, SOP intake/review/publication/download, learner private upload, autosave/library, generate/Judge retry, support reflection, progress/attendance/certificate, head analytics, grants/domains/session freeze.
- Concurrency: same request replay, same attempt Judge claim, concurrent roster import, Studio revision conflict, award ID stable, pooled claims reset commit/rollback, outbox reordered/duplicate delivery, deleted/rebound SOP và revoked identity/domain.
- Record reconciliation/export watermark, schema release hashes, target write start time và projection lag. Proposed acceptance SLOs phải do team điền (p95 request, pool wait, oldest outbox age, dead-letter count, retrieval recall/cost); không tuyên bố thresholds đã được đáp ứng.

**Rollback trước target writes:** quay routing về original Intrepid release/source, giữ target để forensic review; không cần reverse data migration.

**Rollback sau target writes:** không chỉ switch DNS về stale source. Freeze target writes, export/reconcile target-only delta (including new identity, attempts, enrollment moves, awards, library, SOP versions/files); replay theo reviewed reverse mappings với idempotency/UUID preservation hoặc restore target release cũ nếu source replay chưa safe. External provider calls không rollback được: preserve uncertain run/claim và không tự generate/Judge lại. RPO/RTO và reverse-delta procedure cần được diễn tập trước acceptance; nếu chưa có, rollback chỉ an toàn trong pre-write window.

**Gate 3:** rollout/rollback rehearsal có evidence; writer/data ownership rõ; rollback authorization matrix và files/certificates tested. Không dừng Supabase/Vercel/MVP như cleanup side effect.

### Phase 4 — Optional simplification sau observation window

Lần lượt M1 → D1 → D2, không gom cùng platform cutover hoặc model migration. Mỗi change có reviewed forward/backward mappings, preservation archive và explicit stop condition.

- Expand: thêm compatible shape/fields/view trong target theo thiết kế riêng, backfill có counts/hashes/orphan check, giữ old reader/writer compatibility.
- Switch: atomic/canonical single writer và adapter tương thích; nếu sync hai representations trong expand window thì phải cùng SQL transaction, không app-level two writes.
- Observe: kiểm tra older release, external jobs, support workflows, RLS/column exposure, logs; không chỉ grep tên bảng.
- Contract: chỉ khi old consumers retired và retention policy cho phép; không có thao tác contract trong audit. Giữ archived data/restore mapping đủ rollback period.
- Rollback M1: quay reader/writer old representation, reverse-backfill exact imported snapshot. Rollback D1/D2: restore archived rows + role/RPC compatibility, không reset user history.

**Gate 4:** M1/D1/D2 individually proven; còn nghi vấn thì giữ bảng. Sau cùng mới cập nhật dictionary/ERD/table count, không chỉnh immutable source migrations.

## Verification plan và những gì đã chạy

**Đã chạy trong audit:** static file coverage/hashes, PostgreSQL parse-only cho 62 SQL files, runtime/RPC/trigger/policy reference analysis, FK/index-prefix review, table decision coverage và ERD relationship coverage. Không kết nối DB hay model; không chạy tests thực thi DDL dù chỉ in-memory, để tuân thủ yêu cầu không chạy migration.

**Chưa chạy:** live catalog comparison, tbls live lint/docs, EXPLAIN/query stats, actual Cloud SQL RLS/roles, extension/IAM/Vertex connection, live Firebase/Storage/Firestore/BQ, migration/import/backfill/rollback rehearsal, app test suites. Existing test code đã đọc như evidence về phạm vi kiểm thử; kết quả cũ trong handbook không được ghi thành test mới pass.

Review findings và candidates với người chịu trách nhiệm sản phẩm/DB trước tạo implementation changes. Những gates là điều kiện cho công việc migration riêng, không yêu cầu execution lúc này.
