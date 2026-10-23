# Schema Audit Report — Intrepid

**Date:** 2026-10-13 (Asia/Saigon)  
**Scope:** `apps/promptify-intrepid`, root `supabase/schema.sql`, migrations 002–050, rollback/staging SQL, gói `docs/intrepid-google-cloud` và các công cụ migration liên quan. MVP chỉ được dùng để giải thích dữ liệu/lịch sử chung; không đề xuất sửa MVP.  
**ORM/Framework:** Không có ORM model authoritative. Supabase `.from/.rpc` là nguồn lịch sử; target dùng `pg`, adapter `CloudQuery`, JSON metadata và SQL RPC/trigger.  
**Tables Audited:** 48 business tables nguồn; 50 PostgreSQL tables target, thêm identity binding và outbox. BigQuery có 3 bảng vật lý + 3 views trong template; Firestore chỉ giữ invalidation projection.

## Executive Summary

**Không nên giảm số bảng mạnh để “đơn giản hóa” Intrepid.** Phần phức tạp đáng xử lý trước là scope curriculum–class không nhất quán, nhiều authority cho rubric/progress/awards, các đường GCP tùy chọn và metadata schema bị lệch phiên bản. Có bằng chứng source-level cho **1 merge candidate và 2 deprecate candidates**, tương đương tối đa **50 → 47 bảng có điều kiện**; **0 bảng đã đủ bằng chứng live để loại an toàn ngay**.

Hai vấn đề cần chặn trước acceptance GCP là Studio chỉnh riêng lớp nhưng ghi vào curriculum dùng chung, và khóa outbox chunk có dấu nháy sai. Ngoài ra, việc đổi embedding model cùng lúc chuyển nền tảng làm tăng phạm vi migration. Mức trưởng thành tĩnh ước tính **3/5 — đã có contracts/atomicity nhưng thiếu kiểm chứng live và vận hành**; đây là đánh giá của audit, không phải chứng nhận theo một công cụ scoring.

## Evidence, coverage và giới hạn

- Kiểm tra `git status` trước khi tạo output: workspace có nhiều thay đổi separation/GCP và source untracked từ trước. Audit không sửa những file đó.
- Đã đọc/scan 325 file Intrepid/history trong evidence index; parse **62 SQL files** bằng PostgreSQL parser `pglast` có sẵn, không execute SQL. Bao gồm schema gốc, toàn bộ 49 migrations 002–050, rollback/staging, 5 GCP SQL. Đối chiếu 73 function definitions, 18 triggers, 75 policies, 96 indexes trong baseline catalog với patches hiện hành, adapter, API, UI/service calls và maintenance/export/import code. Các root bootstrap/schema-builder/catalog-export scripts được review bổ sung, không chạy.
- [AUDIT_EVIDENCE.json](AUDIT_EVIDENCE.json) chứa path/SHA-256, FK, runtime reference, SQL function reachability và index candidates. [TABLE_INVENTORY.md](TABLE_INVENTORY.md) liệt kê từng bảng, mục đích, dependencies, code, constraints, RLS/grants và quyết định. Đây là static evidence: tên bảng trong comment/type/export không được xem là truy vấn production đã chạy. Closure không phải whole-program proof; function gọi qua trigger/policy/raw SQL và maintenance phải review riêng.
- Baseline catalog là kết quả offline do repository dựng, **không phải live dump**. Nó kết thúc ở migration 049. Root 050/GCP 005 bổ sung 5 cột, 2 FK và 1 RPC; GCP 002 thêm outbox + 22 triggers; GCP 004 thêm vector column/index và 2 RPC. Số FK target source-derived là **102**, không phải 100 trong baseline handbook. Baseline 531 constraints bao gồm NOT NULL objects của PostgreSQL 18, không phải 531 business constraints.
- **Không có DB connection chỉ đọc được xác nhận:** không có connector PostgreSQL/Supabase phù hợp; process và env files kiểm tra không cung cấp SOURCE/TARGET/DATABASE_URL/PGHOST/PGUSER. Không dùng service key để giả lập read-only. Chưa xác minh live tables/functions/roles, data volume, usage, query plans, bloat, locks, latency hay production alias. Không fetch/compare main vì audit dựa trên working tree hiện tại, không kết luận về main.
- Không chạy migrations, tests tạo schema, maintenance/live scripts, model call, import, backfill, deployment, DROP hay TRUNCATE. Không đổi DB, runtime, env, IAM hoặc migration history. Chỉ tạo tài liệu/evidence/ERD và helper tĩnh trong ignored `tmp/`.

### Tài liệu bên ngoài áp dụng

Áp dụng 11 dimensions và severity checklist của [Schema Auditor](https://github.com/musher-dev/bundles/blob/main/database-schema-governance/agents/schema_auditor.md). Yêu cầu read-only của agent được giữ; việc ghi **báo cáo** là output được người dùng yêu cầu, không phải sửa schema. [Entity Boundaries SKILL.md được chỉ định](https://github.com/musher-dev/bundles/blob/main/database-schema-governance/skills/governing-entity-boundaries/SKILL.md) trả lỗi 404/cache miss khi truy xuất; chưa đọc được nội dung nên không tuyên bố đã áp dụng skill đó. Phần boundaries dưới đây dùng phân tích cardinality, ownership, lifecycle và integrity từ source, cùng [Supabase Postgres Best Practices](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices).

Đã tham khảo [tbls](https://github.com/k1LoW/tbls) cho catalog documentation/lint. Máy không có executable `tbls` hoặc `psql`, và không có read-only DSN; **tbls chưa được chạy**, không có kết quả lint live. [tbls.audit.yml](tbls.audit.yml) là config đề xuất cho bước catalog read-only sau này; ERD hiện tại được dựng từ constraints source-derived, không giả mạo tbls output.

## Findings Summary

| # | Severity | Dimension | Location | Finding / confidence |
|---|---|---|---|---|
| F01 | High | Entity boundaries | `product_save_studio`, Studio/config và global lessons | Class-scoped config nhưng global content/rubric write. Verified static; cao. |
| F02 | High | Projection integrity | GCP 002, projection keys/backfill/worker | Quoted `"position"` được giữ như tên JSON key/cột; chunk events có thể thất bại vĩnh viễn. Verified static; cao. |
| F03 | High | Migration/model contract | GCP 004, SOP publisher/reembed | Đổi model cùng platform migration; publish không nhận model provenance; JSON/vector cùng dimensions chưa đủ tương thích. Verified static; cao. |
| F04 | Medium | Entity fragmentation | `product_roster_profiles` | Membership metadata có thể gộp enrollments, nhưng cần bảo tồn roster snapshot và orphan. Candidate; trung bình. |
| F05 | Medium | Unused candidates | governance config/tutorial progress | Không có runtime/business-function consumer Intrepid, nhưng export/history vẫn tồn tại. Candidate; trung bình/thấp. |
| F06 | High | Authorization boundaries | course_instructors/classes/department correction | Permission theo course và self-correction chuyển membership; scope class/client/course cần quyết định rõ. Static behavior verified, policy judgment chưa xác nhận. |
| F07 | High | Referential integrity | SOP bindings và class/lesson tuples | FK riêng lẻ không bảo đảm version thuộc document, lesson thuộc class course, learner có membership. Verified static; cao. |
| F08 | Medium | Index strategy | FK/index catalog | 56 FK không có full left-prefix index; hot paths thiếu index phù hợp. Static candidate, performance impact chưa đo. |
| F09 | Medium | Write amplification | Curriculum/users indexes | Ít nhất 5 nhóm index trùng key với unique index; cân nhắc sau plans/constraint ownership. Verified static; cao. |
| F10 | High | RLS/runtime trust | GCP roles/auth shims, server client | API và worker cùng runtime login được SET ROLE trusted service. Không phải leak đã chứng minh; blast radius cao. |
| F11 | Medium | Query complexity | Product snapshot/classes/searchSop | Nhiều transaction/RPC lặp và tải toàn chunks trước pgvector branch. Verified static; cao. |
| F12 | Medium | Reporting semantics | SQL analytics/award/progress/BQ | Completion có nhiều định nghĩa; BQ là current entity mirror, không phải event-history warehouse. Verified static; cao. |
| F13 | Medium | Operations | Outbox/invalidation/Scheduler | Default batch 10/minute, fan-out identity/class và thiếu retention/freshness acceptance. Static; cao. |
| F14 | Medium | Migration/documentation | Catalog/handbooks/manifest | Tài liệu hướng postgres/BQ, template hướng pgvector; baseline metadata không ghi extensions/050/outbox. Verified static; cao. |
| F15 | High | Data preservation | Shared source → scoped export | FK closure có thể kéo thêm client/course/users; không được gọi là Intrepid-isolated export chỉ vì selected class IDs. Risk; cao về thuật toán, live impact chưa biết. |
| F16 | Medium | Lifecycle | Cascades, run/claim/contribution data | Delete cascades và claim mắc kẹt chưa có recovery/retention hợp nhất. Verified static; cao. |
| F17 | Medium | Credentials | Rotation requests/approvals | IAM target giảm nhu cầu secret rotation nhưng workflow cũ vẫn tồn tại. Needs investigation; trung bình. |
| F18 | Medium | Types/identity | users/auth binding/numeric parser | Email canonicalization, non-unique legacy subject mapping và numeric→Number cần contracts. Static; cao. |

Không gán Critical chỉ vì thiếu live data. F01/F06 có thể nâng Critical nếu staging chứng minh sửa nội dung/truy cập ngoài tenant trái policy. Chưa có bằng chứng một incident production.

## Detailed Findings by Dimension

### 1. Entity Boundaries

**F01 — High, cao.** `product_studio` có PK `(class_id,lesson_id)` và revision riêng. Nhưng `product_save_studio` [migration 044](../../supabase/migrations/044_product_atomic_policies.sql) cập nhật `lessons` bằng `id` và delete/insert `lesson_rubric_criteria` bằng `lesson_id`. Hai lớp cùng course dùng cùng lesson. Ví dụ lớp A lưu title/scenario/status/rubric thì lớp B đọc global lesson vừa bị đổi, dù Studio JSON/revision của B chưa đổi. Row locking tránh race dữ liệu nhưng không sửa ownership sai. Đây là duplication **khác grain**, không phải hai bảng có thể gộp trực tiếp. Đề xuất: course content chỉ sửa bằng explicit course-level permission; override riêng lớp nằm trong Studio hiện có; rubric global làm default, rubric Studio làm override, attempts lưu snapshot. Nếu sản phẩm thực sự muốn authoring toàn course, UI/API phải thể hiện scope đó và invalidate mọi class liên quan.

**F04 — Medium, trung bình.** `product_roster_profiles(user_id,class_id,country,department)` được `product_import_roster` upsert ngay sau enrollment. Learner có `UNIQUE(user_id)` nên có thể ánh xạ membership metadata vào enrollments. Tuy nhiên department nhập là snapshot, có thể khác department class sau thay đổi; profile có thể tồn tại sau enrollment biến mất. Chưa đủ căn cứ thay snapshot bằng JOIN classes hoặc bỏ bảng. Merge chỉ khi mapping 1:1 không orphan, giữ `imported_department`, country, timestamp và access restriction tương đương.

**F05 — Medium.** Governance singleton không có business reader/writer ngoài schema/type/export opt-in; quota trigger dùng hardcoded limits, governance response đọc env/domains/audit, không đọc config. Tutorial table được export theo selected users, source history chứng minh từng có learner/instructor tutorial; Intrepid entry/onboarding không dùng nó. Hai bảng là **deprecate candidates**, không tuyên bố “unused ở DB thật”. External admin SQL/BI, MVP cùng DB và lịch sử phải được xác minh trước bỏ khỏi target.

**Những boundaries nên giữ:** users/learners giữ subtype và IDs; course/module/lesson giữ content hierarchy; enrollment không phải progress; attempts không phải request run; judge claim không phải score; Studio sandbox không tạo learner progress; attendance không phải completion; award là evidence bất biến; draft không phải library entry; private learner context không phải approved shared SOP; document/version/binding/chunk/contribution có identity, lifecycle, access và publication riêng; receipts là per-user state; broadcast không phải private hint. Không có EAV/polymorphic mega-table cần được đưa vào thay thế.

### 2. Naming Conventions

**F14 — Medium.** `product_*` và `rebuild_*` cùng phục vụ runtime hiện tại, không chứng minh hai subsystem hoặc legacy dư thừa. Không rename hàng loạt trong migration GCP: RPC, generated metadata, tests, maintenance và citations bị ảnh hưởng. `classes` đang đồng thời biểu diễn cohort, workspace và department; cần mô tả grain rõ ràng, không tạo bảng department mới chỉ vì tên chưa đẹp. `prompt_attempts.lesson_id` là text legacy còn `lesson_ref_id` là UUID canonical: document authority, giữ legacy evidence trong giai đoạn chuyển đổi.

### 3. Data Types

**F03 — High.** [GCP 004](../../apps/promptify-intrepid/gcp/sql/004_pgvector_vertex.sql) tạo generated `embedding_vector vector(768)` từ JSONB và đổi default model sang `text-multilingual-embedding-002`. Các vector cũ `gemini-embedding-001` vẫn dài 768 nhưng thuộc model space khác; target search loại model cũ, có thể trả rỗng đến khi reembed. RPC publisher insert embedding nhưng **không insert model từ input**; provenance phụ thuộc default DB, có thể label sai nếu app override provider/model khác. Reembed upsert từng chunk qua transaction riêng: giữ source bytes/content nhưng thay JSON vector gốc ở target, không có atomic version swap. Snapshot backup/model provenance và readiness theo version là cần thiết; không sửa nhãn model để “làm search chạy”.

SQL `embedding()` hiện hỗ trợ model versioned và trả real array, nhưng instance extension/IAM/region chưa được audit live. [Google Cloud embedding documentation](https://docs.cloud.google.com/sql/docs/postgres/generate-manage-vector-embeddings). Việc database gọi Vertex giữ connection trong toàn network/model time; đây là coupling vận hành, không phải lý do tạo thêm table. Ưu tiên giữ model contract trong platform cutover; đổi model là phase riêng hoặc acceptance độc lập nếu lựa chọn GCP này đã được khóa.

**F18 — Medium.** UUID business IDs + opaque Firebase subject mapping là thiết kế phù hợp. `gcp_identity_bindings` có unique `(issuer,external_subject)`, `legacy_subject`, `(user_id,issuer)`; `users.auth_provider_id` source là text, không unique. `users.email` unique nhưng không canonical lower(trim) ở constraint; verifier lower(email), context query dùng exact normalized email, nên imported email có case/space có thể có hành vi lệch. Chỉ đề xuất kiểm kê duplicate case-insensitive, subject collision và backfill được review, không tự normalize identity. Numeric parser của `pg` chuyển tất cả numeric thành Number; score nhỏ ổn nhưng không mặc định đủ precision cho mọi JSON/reporting tương lai.

### 4. Anti-Patterns / Integrity

**F02 — High.** [GCP 002](../../apps/promptify-intrepid/gcp/sql/002_projection_outbox.sql) truyền trigger arg `'"position"'`; [cloudProjectionKeys.json](../../apps/promptify-intrepid/src/services/cloudProjectionKeys.json) cũng chứa chuỗi có dấu nháy. `to_jsonb(NEW)` có key `position`, không có key `"position"`, nên lookup trả null. Consumer dựng tên identifier từ key đã quoted thành tên cột chứa dấu nháy; backfill cũng bọc thêm dấu nháy. Kết quả dự kiến: chunk event không đọc được canonical row / backfill SQL sai; retry tối đa 10 rồi dead letter. Ngay cả warehouse=false, consumer vẫn SELECT canonical trước xét mode. Đã xác minh cấu trúc source và mô phỏng key lookup tĩnh; **chưa chạy DB repro**. Test hiện tại kiểm tra trigger count/rollback, chưa chứng minh worker drain chunk event thành công.

**F07 — High.** `rebuild_sop_bindings.document_id` và `.version_id` có FK độc lập, không composite consistency; contributions document/version cũng tương tự. FK class/lesson/learner riêng lẻ không đảm bảo tuple cùng course/enrollment. RPC hiện có scope checks, tốt, nhưng service_role direct writes/import không được FK ngăn semantic mismatch. `rebuild_runs.attempt_id` không unique trong baseline, dù code `.single()` giả định một run/attempt. Cần count duplicate và approved cardinality trước constraint; không thêm FK membership một cách máy móc nếu phải giữ attempts sau enrollment removal. Outbox routing hints không có FK là hợp lý để giữ delete event, nhưng entity-key validation phải đúng.

**F06 — High về cần xác nhận policy.** `course_instructors` cấp quyền theo course; instructor gán ở một course có thể quản lý mọi lớp dùng course đó, kể cả client khác nếu domain gate không chặn. Không gộp với class grants vì grain khác. [050 / GCP 005](../../supabase/migrations/050_department_correction_auto_approval.sql) chọn target same-client + department + active; course match chỉ là ORDER BY ưu tiên, không predicate. Self-correction có thể enroll vào existing class khác course hoặc tạo workspace từ text nhập, đồng thời remove active source enrollment. Source ghi rõ đây là self-service được product owner chấp thuận: **không tự đảo quyết định**, nhưng cần acceptance về department/course scope và private SOP access của existing target. Test “new workspace không copy SOP” chưa đủ chứng minh quyền existing target là đúng.

### 5. Index Strategy

**F08 — Medium, impact chưa đo.** Static check full non-partial left-prefix coverage tìm **56/102 FK** chưa có index đáp ứng riêng; danh sách đầy đủ trong evidence JSON. Đây là review queue, không phải đề nghị tạo 56 indexes. Index `(class_id,lesson_id)` không phục vụ lookup chỉ `lesson_id`; FK parent delete có thể scan child. Ưu tiên đo:

- `product_audit(class_id,created_at)`, contributions/sync logs theo class + timestamp/status.
- `rebuild_runs(attempt_id)` cho snapshot/evaluate, subject+created_at cho quotas; attempts class+created_at và class+learner+canonical lesson cho score/award paths.
- SOP bindings version/document reverse lookup; class grant class reverse lookup nếu revoke/import cần.
- Index learner-first và class-first cho attendance/awards khi các access patterns thật cần cả hai.

PostgreSQL không tự tạo child FK index; chọn thứ tự composite theo workload thay vì lint thuần túy. [Supabase FK index guidance](https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md). Chưa có EXPLAIN ANALYZE/statements live nên không khẳng định query đang chậm.

**F09 — Medium.** Ít nhất 5 nhóm unconditional btree cùng keys: modules `(course_id,position)`, resources `(lesson_id,position)`, rubrics `(lesson_id,position)`, lessons `(module_id,position)`, users `(email)`. Nonunique index có unique index tương đương là candidate redundancy. Phải xác minh constraint-owned index, ordering/include/predicate và live usage trước loại; giữ unique integrity. Các standalone prefix như enrollments learner index cũng cần review, chưa tính vào con số 5.

HNSW không chứng minh planner dùng index: query join authorized version JSON + model filter cần real plans, filtered recall và cosine ordering. Không partition trước khi có growth/retention evidence.

### 6. Schema Documentation

**F14 — Medium.** README/FULL_GCP_ARCHITECTURE còn nói outbox chưa implemented và không cần vector extension; template thực tế thêm outbox và extensions. START_HERE còn đề nghị mode `postgres`→BigQuery, trong khi deployment chọn `pgvector`, embedding provider `cloudsql`, warehouse=false. Catalog 49 tables/100 FK bị dùng như current snapshot trong dictionary dù 005 đã đổi correction contract. Phân biệt baseline, target DDL, generated runtime metadata và live dump; hash tất cả cùng release manifest. Outbox không ở CloudQuery metadata **là lựa chọn private raw SQL hợp lý**, không tự đánh dấu đó là missing schema bug.

tbls phù hợp cho documentation từ catalog read-only + lint indexes/comments; không phát hiện business scope, external consumers hay ownership chỉ từ diagram. Không dùng tbls để quyết định DROP.

### 7. Logic Placement / Query Complexity

**F10 — High.** `sqlTransaction(actor)` SET LOCAL authenticated + verified claims, trusted call SET LOCAL service_role, COMMIT/ROLLBACK/release. Đây là điểm mạnh chống identity leak qua pool. Auth shims không tự xác thực, và runtime `NOINHERIT/NOBYPASSRLS` không đủ cô lập nếu được SET ROLE service_role với broad gcp policies. API/worker dùng cùng SQL login có cả hai memberships; bất kỳ bug trong trusted query path có blast radius toàn business schema. Không có browser SQL endpoint đã thấy, nên không kết luận user có thể tự SET ROLE. Đề xuất tách quyền worker và auth-read path ở mức role/connection đã tồn tại, kiểm chứng owner/definer/ACL staging; không chuyển hết business RLS về frontend.

Baseline grants authenticated với users/learners/attempts/progress **chỉ SELECT**. Một số old write policies vẫn chứa `is_instructor()` global, nhưng hiện thiếu write grants nên không được gọi là active write leak. Lesson progress SELECT policy còn global `is_instructor()` không scoped class, có SELECT grant: cần negative test direct authenticated access cho instructor không assigned. Product API hiện lọc class không thay thế kiểm chứng này. RLS cần audit theo **ACL + policy + SECURITY DEFINER owner + call route**, không đếm policy. [Supabase RLS basics](https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/security-rls-basics.md).

**F11 — Medium.** `classes()` load assignments/memberships/domains, mỗi class lại một manage RPC; `classScope()` gọi lại classes. Snapshot ghép nhiều result qua nhiều transaction riêng, không phải một snapshot nhất quán. Một số actions gọi snapshot chỉ để xác nhận lesson/SOP, kéo thêm attempts/awards/roster. Snapshot learner còn gọi `product_refresh_awards` (write) trong load. `searchSop` tải tối đa 1000 vectors/chunks **trước** branch pgvector/BQ rồi mới top-k; indexed retrieval không tránh overhead này. Đề xuất query có mục đích và batch quyền class, canonical read-only snapshot; giữ atomicity trong existing write RPCs. Chưa cần tạo generic repository layer mới.

**F12 — Medium.** SQL analytics đọc lesson_progress completed; awards đọc max valid evaluation >= attempt threshold + published lessons + attendance + Studio rules; snapshot average chỉ dựa 200 recent attempts và đã trả truncated flag. Đây là các metrics khác nhau, không được trình bày cùng tên “completion” nếu không định nghĩa. BQ mirror giữ current row, không history despite raw label; `scored` SQL xét evaluation_json not null còn BQ xét score nonnull. Cần fixtures legacy/malformed score, historical thresholds, unpublished lessons và dates để parity. Không thêm materialized views, star schema hoặc event sourcing khi chưa có nhu cầu.

### 8. Credential Schemas

**F17 — Medium.** Không thấy bảng chứa plaintext provider key/token. Rotation lưu SHA-256 fingerprint, reason, status, approvals, receipt; secrets thật thuộc env/Secret Manager. GCP dùng Vertex/Workspace IAM nhưng API requestRotation, governance UI và app-local apply script còn tồn tại. Nếu vẫn giữ fallback key thì 2 bảng rotation còn cần; nếu IAM-only được chốt thì archive workflow riêng sau receipt preservation. Multi-approver là integrity boundary, không gộp approvals vào requests thành một boolean. Service credential names/config không được coi là proof về secret access policy thực tế.

### 9. Operational Health

**F13 — Medium.** Outbox SKIP LOCKED + claim UUID + retry/dead-letter là cơ chế đúng cho at-least-once. Default worker batch 10, tick mỗi phút: nominal tối đa 10 events/minute trước lỗi/fan-out/overlap; import 500 enrollment + các user events có thể tạo backlog nhiều tick. `invalidation()` đọc identities, chạy per-user SQL authorization, global user/domain/course_instructor events có thể fan-out toàn class. Old/new class/version routing khi delete/update curriculum cần review vì code lấy current row, có thể mất course lookup sau delete. Không phải leak protected content: notices riêng UID và reload SQL kiểm quyền; vẫn có freshness/cost concern.

Pool max=5, API maxScale=2, worker maxScale=1: envelope khoảng 15 connections ở steady state templates, chưa tính revision overlap/maintenance. Container concurrency 20 nghĩa có queue chờ pool; embedding SQL giữ connection có thể chiếm pool đáng kể. Cần pool wait, active connections, timeouts, outbox oldest age, dead-letter rate, model latency, Firestore writes, warehouse bytes billed. [Supabase pooling guidance](https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/conn-pooling.md). Chưa có bloat/XID/vacuum/lock metrics, không đề xuất tuning autovacuum/partition theo phỏng đoán.

### 10. Data Lifecycle

**F16 — Medium.** Attempts/progress cascade theo learner/class; historical awards/audit/SOP thường FK restrictive. Archive class/course hợp lý hơn hard delete. Judge claim completed có thể giữ riêng cho recovery; run pending ngăn retry khi outcome uncertain; contribution `indexing_claim` thiếu lease timestamp trong schema, API acquisition không tự release nếu embedding fail. Không nên “dọn” claim/ledger bằng TTL trước recovery và idempotency window. Worker nonce có purge 7 ngày; outbox processed/dead-letter, request budgets, sync/import PII, snapshots/vector copies chưa có retention policy thống nhất. Cho scale hiện tại, retention/recovery runbook tốt hơn thêm partition/event framework.

### 11. Migration Safety

**F15 — High.** Source shared với MVP; code isolation không data isolation. Export selected classes dùng FK closure bổ sung referenced parents. Global user-owned corrections có thể tham chiếu source/target class ngoài scope, script chặn và yêu cầu mở rộng UUID scope; việc mở rộng có thể kéo khác tenant/course. Không được tự cho phép scope expansion. User-owned budgets/tutorial là global records, cần ownership/data minimization review. `include-unscoped` gồm enterprise leads/config/worker nonces là deliberate opt-in; không import tất cả làm default.

Importer empty-target, hash validation, transaction + disable/re-enable USER triggers là safeguards tốt. Nhưng import data bypasses business triggers nên semantic tuple validation vẫn cần; count/hash/FK không phát hiện authorized-but-wrong target class hay version/document mismatch. GCP 004 generated vector cast có thể từ chối legacy 768 arrays chứa phần tử sai kiểu; embedding checks không thay live preflight. HNSW build/generated column rewrite cần lock/time/WAL budget và staging rehearsal, không giả định migration additive luôn zero downtime. Original source migration seeds/backfills không được replay để move live data.

Không đề xuất áp dụng bất kỳ migration nào trong audit này. [SCHEMA_SIMPLIFICATION_PLAN.md](SCHEMA_SIMPLIFICATION_PLAN.md) nêu phases/gates/rollback, tách platform cutover, behavior fixes và optional simplification.

## Maturity Assessment

**Current Level:** 3/5 — Managed ở source contracts; operational acceptance chưa hoàn tất. Điểm mang tính định hướng, không là numeric certification.

| Dimension | Score / 5 | Notes |
|---|---:|---|
| Boundaries / normalization | 3 | Hierarchy hợp lý; Studio scope và roster metadata cần xử lý. |
| Naming / types | 3 | UUID/timestamptz phù hợp; legacy names/identity/model provenance còn nợ. |
| Integrity / atomicity | 3 | RPC locks/idempotency tốt; semantic FK và claim recovery thiếu. |
| Security | 3 | Verified identity/RLS/private bytes; trusted role lớn và progress read scope cần staging. |
| Index/query design | 2 | Index gaps/redundancy/N+1 thấy tĩnh; chưa có plans. |
| Documentation / drift | 3 | Gói schema chi tiết nhưng current/baseline docs lệch nhau. |
| Operations / lifecycle | 2 | Retry/dead-letter có; chưa có retention/SLA/metrics live. |
| Migration / recovery | 3 | Scoped tools/hash/empty target có; chưa có live rehearsal/rollback proof. |

## Improvement Roadmap

**Before GCP acceptance:** xác nhận live catalog/roles; xử lý F01/F02; negative-test F06/F10; chốt model/default provenance F03; khóa Intrepid data scope F15; cập nhật current-vs-baseline release contract F14. Không cần giảm bảng để hoàn tất platform migration.

**Current sprint sau acceptance:** batch/class-scope queries F11, plans/index review F08/F09, completion definitions F12, claim recovery/outbox lag F13/F16.

**Sau một observation window bao gồm ít nhất một vòng roster/teaching/award/governance:** quyết định roster merge F04 và retirement F05 theo bằng chứng live/external consumers. ERD sau simplification là [phương án có điều kiện](ERD_PROPOSED.md), không là chỉ thị deploy.

**Backlog:** cân nhắc BQ reporting/vector chỉ khi có đo lường về query latency/cost và freshness. Giữ Firestore notices nếu realtime có lợi; polling là lựa chọn nhỏ hơn nếu đủ SLA. Không thêm partition, generalized grants, EAV, generic event bus hay cross-app shared package.

Các finding cần giao cho người thiết kế/triển khai DB trong **một công việc được duyệt riêng**: F01/F02/F03/F06/F07/F10/F15 trước; F04/F05 chỉ khi gates đủ. Audit này không tự sửa findings.
