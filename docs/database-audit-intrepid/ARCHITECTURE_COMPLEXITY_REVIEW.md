# Architecture complexity review — Second pass

**Ngày:** 2026-10-13. Chỉ audit/proposal. [Feature matrix](FEATURE_TO_TABLE_MATRIX.md), [Lean proposal](LEAN_DATABASE_PROPOSAL.md), [decision matrix](SIMPLIFICATION_DECISION_MATRIX.md).

## Kết luận

Hệ thống có dấu hiệu **over-engineering ở orchestration và scope feature**, dù nhiều table boundaries hợp lý. Internal training đã phát triển đồng thời thành live workshop control, SOP ingestion/search, private-document indexing, credential approval/deployment, certification và public sales/trial funnel. Không có evidence hiện tại cho thấy tất cả cần để vận hành learner loop hoặc một operator nhỏ. Việc từng workflow có idempotency/RLS tốt không chứng minh workflow cần tồn tại ngay.

Điểm phản biện với first pass: KEEP về schema chỉ trả lời “nếu feature này giữ thì nên tách state không?”. Second pass trả lời thêm “có nên giữ feature không?”. **14 bảng first-pass KEEP không thuộc footprint B; 23 bảng first-pass KEEP không thuộc C** (đếm theo matrix và scope đề xuất, không xóa data). Savings lớn hơn 50→47 trước đây đến từ feature retirement, không merge tables.

Các giới hạn: latest UI và full-GCP preparation đã được yêu cầu; không được dùng product brief 06/10 để tự hủy yêu cầu mới hơn. B/C là lựa chọn cần review lại scope, không phải bản đã được sign-off. Historical trial/QA/deploy notes là evidence về work đã làm, không phải live adoption/operating cost hiện nay.

## Cost inventory: đếm đúng, không cộng trùng

| Layer | Count / trạng thái |
|---|---|
| Live source DB/current GCP | **UNKNOWN** — chưa có current catalog, approved staging connection hoặc function ACL/roles dump |
| Source migration business schema | 48 public business tables; source 050 thêm columns/FK/RPC, không thêm table |
| Repository baseline | 49 tables, 73 public functions, 18 triggers, 75 policies, 96 indexes |
| Target GCP 001–005 | Source-derived **50 tables, 77 public functions, 40 triggers, 76 policies**; không tính auth shims/extension-owned functions |
| RPC usage | **38 distinct literal runtime RPC names**, không phải 38 HTTP endpoints; còn raw SQL/default/trigger/policy helpers |
| Generic adapter metadata | 49 tables/75 function entries, bao gồm 10 baseline trigger-return functions; không được gọi tất cả là business RPCs |
| Background delivery | 2 worker handlers: roster/projections trong một private Cloud Run worker service; 2 one-minute Scheduler jobs đề xuất |
| Roster timing | Cron tick một phút khác due interval 15 phút; worker manual/auto enable là hai quyết định |
| BigQuery template | 3 physical tables: operational_entities, version_state, sop_chunks; 3 views; rebuildable projections |
| Firestore | Private per-user/class notices, không business DB authority |
| Other external state/services | Firebase Auth/Hosting, Cloud SQL, Cloud Run, AI provider/Vertex, private GCS, Sheets/Drive, IAM/Secret Manager/Monitoring |

77 public functions = baseline 73 + queue-trigger function + vector embed/search functions + correction RPC. 40 triggers = 18 baseline + 22 projection watches. 76 policies = 75 baseline + private outbox policy; baseline includes 49 broad GCP backend policies. Đếm policies không đo independent workflows hoặc chứng minh security coverage.

Không thấy Pub/Sub, Redis, Cloud Tasks runtime active trong current target; tên của chúng trong proposed architecture không được cộng vào actual operational cost. SQL→Vertex embeddings hiện synchronous; không có separate durable ingestion worker được chứng minh. Không có volume/rate/pricing evidence để đưa USD estimate hoặc performance score giả.

## Complexity theo subsystem

Primary table/RPC ownership dùng để không cộng trùng tổng bảng/38 RPC names. Trigger/policy đếm theo bảng owner. SQL defs touching tables là union references của mỗi subsystem từ first-pass evidence; shared helper lặp ở nhiều rows nên **không cộng cột đó** thành global count. Cost/service ở cột cuối vẫn là dependency khi bật feature, không là proof service đã được provision live.

| Feature ID | Own tables | Primary runtime RPC names | SQL defs touching tables (shared) | Triggers own tables | Policies own tables | Worker/external/operations |
|---|---:|---:|---:|---:|---:|---|
| F01 | 9 | 6 | 44 | 10 | 19 | Firebase Auth/SQL; verified identity và mutable scope |
| F02 | 6 | 2 | 19 | 10 | 11 | SQL; global/class revisions, config validators |
| F03 | 4 | 4 | 17 | 9 | 9 | Cloud Run/SQL/AI; snapshots, paid outcome, retry recovery |
| F04 | 4 | 2 | 6 | 1 | 4 | Sheets/Workspace/SQL; manual Sync now + validation/log |
| F05 | 1 | 4 | 1 | 0 | 1 | Scheduler/OIDC/private worker/Sheets; lease, nonce, due interval |
| F06 | 1 | 2 | 2 | 0 | 1 | SQL membership/provisioning; migration history + idempotency |
| F07 | 1 | 1 | 1 | 0 | 1 | SQL revision/polling; server autosave |
| F08 | 1 | 1 | 2 | 0 | 1 | SQL private support gate/reflection validators |
| F09 | 1 | 1 | 2 | 1 | 1 | SQL run guard/revision; workshop coordination |
| F10 | 3 | 2 | 3 | 2 | 6 | SQL polling/inbox; Firestore optional; privacy/receipt |
| F11 | 1 | 1 | 2 | 0 | 1 | SQL private attempt action/history |
| F12 | 3 | 2 | 3 | 2 | 3 | SQL citations/bindings; GCS originals optional |
| F13 | 1 | 1 | 2 | 1 | 1 | SQL review; Drive/GCS/parsers/embedding automation optional |
| F14 | 1 | 1 | 2 | 1 | 1 | SQL pgvector/Vertex or BQ/projection; JS fallback also exists |
| F15 | 1 | 0 | 0 | 0 | 1 | SQL/parsers/AI embeddings; private data retention |
| F16 | 1 | 0 | 0 | 0 | 1 | SQL moderation/settings/score snapshots |
| F17 | 2 | 2 | 2 | 2 | 2 | SQL eligibility/advisory lock/triggers; PDF/fonts |
| F18 | 1 | 1 | 1 | 0 | 1 | SQL counters/run locks; AI budget without Redis |
| F19 | 1 | 0 | 16 | 0 | 1 | SQL retention/mutation reasons; access reviews |
| F20 | 2 | 2 | 3 | 0 | 2 | Secret owner/provider/Secret Manager/deployment/apply script |
| F21 | 1 | 0 | 0 | 0 | 1 | SQL singleton; business consumer unverified |
| F22 | 1 | 0 | 1 | 1 | 1 | AI/SQL; second pending/result/claim recovery lifecycle |
| F23 | 1 | 0 | 0 | 0 | 4 | SQL old tutorial/export compatibility |
| F24 | 1 | 1 | 1 | 0 | 1 | SQL public PII lead; sales owner/SLA unverified |
| F25 | 1 | 0 | 1 | 0 | 1 | 22 watches + Scheduler/private worker/Firestore/BQ; lease/retry/DLQ |
| F26 | 0 | 1 | 0 | 0 | 0 | SQL core reuse; advanced warehouse/ROI inputs optional |
| F27 | 0 | 1 | 0 | 0 | 0 | Core reuse + public Basic quota guard; trial scope separate |
| F28 | 0 | 0 | 0 | 0 | 0 | Locale/local preference + attempts reuse; no new DB state |
| F29 | 0 | 0 | 0 | 0 | 0 | SQL allowlisted generic adapter; native transport compatibility |

## Những điểm over-engineering đáng xử lý nhất

| Priority | Finding mới từ nhu cầu / evidence | Complexity cost | Cơ chế nhỏ hơn và trade-off |
|---|---|---|---|
| P1 | **SP01: private uploads được embed nhưng không retrieval.** uploadLearnerContext gọi embedSopChunks rồi lưu chunks; rebuildRunService chọn `id,content` và ghép full text. Shared SOP RAG chỉ search product_sop_chunks | Paid embedding latency/provider failures, 768-value copies trong private JSON, retention; không có measured benefit cho current generation | Nếu uploads giữ trong A: extraction/content/hash + page metadata, bỏ future embedding work cho private context sau contract review. Mất future semantic private retrieval chưa tồn tại; không xóa old snapshots |
| P1 | **SP02: ba đường SOP retrieval cho cùng use case.** JS cosine/full chunks, pgvector SQL + SQL→Vertex, BQ vector projection; template chọn pgvector nhưng API tải 1000 chunks trước branch | Model-space/default migration, extensions/IAM, index build, projection freshness, nhiều permission rechecks/test matrices | Một bounded curated context hoặc keyword path cho small corpus; khi proven need chọn đúng một semantic engine. Defer BQ không làm mất SQL SOP authority |
| P1 | **SP03: realtime và polling cùng tồn tại; warehouse tắt vẫn tạo event.** ProductionApp polling UI09 5s/others 15s + subscribe notices; worker SELECT canonical trước mode gate. Chunk event không có class_id và warehouse=false không có active sink ngoài ack | 22 triggers + outbox/worker/Scheduler/Firestore/BQ code; write amplification, fan-out, DLQ; F02 làm một event class fail | Giữ authorized polling nếu freshness SLA đủ; future watches chỉ active consumers. Nếu realtime thật mandatory, KEEP durable delivery và sửa/rehearse, không fire-and-forget |
| P1 | **SP04: table-preserving port giữ toàn product expansion.** Runtime preparation gồm internal paid training + public Basic + B2B leads + certificates + secret workflow | Operator duties/scope/RLS/privacy/test surface mở rộng ngay cả 1 tenant | Tách trial/internal surface và acceptance scope. B/C là proposed reductions, cần reconcile latest UI/GCP mandate |
| P1 | **SP05: class Studio/global lesson double authority (F01) không xuất phát từ proven variation need.** saveStudio theo class nhưng update global content/rubric | Revision/ownership bugs, cross-class changes; config validators và duplicate rubric | Một global course authoring authority cho C; B giữ class override chỉ cho fields thật cần, không mirror rubric/state tùy ý |
| P2 | **SP06: manual + scheduled roster; profile correction không write back Sheet.** correction switches memberships; import yêu cầu scoped department và có thể re-add old enrollment nếu lifecycle logic không chặn | Source-of-truth reconciliation, stale roster/new default selection, due/lease/log/replay workflows | B manual Sync now; C one approved Sheet import route. S13 auto approval giữ; cần correction-vs-Sheet acceptance, không tự revert membership |
| P2 | **SP07: pedagogical trace, notes, clearance, certification làm learning loop thành compliance system.** D35 cần feedback/persisted progress, chưa có policy buộc attendance/reflection/issued awards | 8 tables F08/F09/F10/F11/F17 cộng nhiều state transitions, hidden snapshot writes và threshold policies | Defer whole optional state/workflow khi pilot không cần; vẫn giữ Trainer/Head progress và learning evidence. Không infer attendance từ AI run |
| P2 | **SP08: sandbox là second AI orchestration.** Separate sandbox pending/result/Judge claim, limiter; generation retry có uncertainty riêng | Duplicate provider call/failure recovery/test paths, không phải duplicate table lifecycle dễ merge | Manual controlled author validation nếu đủ; nếu in-app Execute test mandatory thì retain sandbox riêng, không pollute learner attempts/awards |
| P2 | **SP09: rotation approval/deployment UI trong IAM-first target.** Historical secret rotation có thật, không speculative; ongoing key mode cần xác nhận | Two-person workflows, provider validation + deployment effects ngoài transaction, receipt/old-key retirement | IAM + existing secret-owner process nếu credential mode cho phép. Applied receipts và old-key status phải preserve; không thay bằng một boolean |
| P2 | **SP10: compatibility adapter trở thành mini-PostgREST.** Depth-limited embedded selections, filters, upsert cardinality, 75 metadata functions kể cả trigger functions | Framework-like maintenance, semantics parity/native transport bugs, manual metadata drift | Trong cutover keep adapter có tests; sau đó shrink tới actual query contracts, không thêm generalized repository/event framework |
| P3 | **SP11: unused singleton/legacy tracking được mang qua vì migration history.** Governance config no consumer; tutorials legacy | Table/grant/export/retention docs, operator ambiguity | Preserve historical data, stop future feature surface sau external-reader check; đừng tạo consumer chỉ để justify table |

SP01/SP02/SP03 là positive data-flow evidence, không chỉ tên bảng grep không thấy. SP06 là hypothesis cần test: same data family được update qua Sheet và correction khác nhau; chưa chứng minh một real user đã bị re-enroll sai. Cả SP07 group sở hữu **8 bảng** (support 1 + session 1 + messaging 3 + note 1 + attendance/awards 2), nhưng việc cancel tất cả phải do product scope quyết định.

### Runtime envelope và cost chưa đo

Template API maxScale=2, worker maxScale=1, PGPOOL_MAX=5 → khoảng **15 pooled connections steady-state**, chưa tính deployment overlap/admin jobs. API concurrency=20/instance gây pool queue khi synchronous SQL embedding giữ connections. Projection batch default 10/tick và tick mỗi phút → nominal **10 events/minute** trước lỗi/fan-out/overlap, không phải measured throughput. Roster bulk import có thể tạo nhiều watched user/enrollment events, kể cả khi BQ disabled. Global user/domain/course assignment events có thể fan-out mỗi identity × class SQL permission checks.

Chi phí thấp về orchestration: F07 autosave, F16 library state, F19 minimal audit (vẫn có retention/permission work). Chi phí trung bình: identity/RLS, curriculum authoring, manual roster, SOP versioning. Chi phí cao về integration/failure modes: F03 paid AI outcome, F05 scheduler, F13 automated extraction/index, F14 multi-engine retrieval, F20 secret/deployment workflow, F25 multi-service projection. Đây là relative engineering cost, **không score ROI hoặc USD**; nhu cầu có thể justify chi phí nếu được kiểm chứng.

### Duplicate state nào không nên giản lược bằng merge

Progress là read model khác attempt evidence; run pending khác successful attempt; Judge claim khác score; draft khác library moderation; attendance khác pass/completion; award evidence khác current rules; contribution pending khác published version; private context khác shared SOP; broadcast khác private recipient hint; receipt khác message; import ledger khác connection/job log; rotation approval khác request. Đề xuất loại cả feature khi không cần, không hợp nhất các boundaries này.

## F01/F02/F06/F10/F15: executable staging verification

**Current staging execution: NOT VERIFIED cho cả năm finding.** Kiểm tra process không có SOURCE_DATABASE_URL/TARGET_DATABASE_URL/DATABASE_URL/PGHOST/PGUSER; các local env files không cung cấp staging DB connection được xác nhận. App `.env.example` chỉ có template names, không quyền/endpoint thật. Không có verified isolated staging + actor tokens + scoped test fixture. Không sử dụng production service key hoặc historical QA identity làm quyền staging. Không chạy migration/live script/test DB mutations trong audit này.

Existing executable tests đã được **đọc**, chưa chạy lại: [verify_cloud_migration.ts](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts), [verify_cloud_export.mjs](../../apps/promptify-intrepid/tests/verify_cloud_export.mjs), [verify_firebase_identity.ts](../../apps/promptify-intrepid/tests/verify_firebase_identity.ts). Cloud migration test tạo PGlite schema và mocks provider/Firebase/BQ; không là Cloud SQL staging test. Test pool serialize qua một connection, không chứng minh concurrent production pool isolation. Fewer “PASS” statements không được coi acceptance.

| Finding | Evidence hiện tại | Existing test coverage / gap | Executable staging case cần thực hiện khi có môi trường phù hợp | Current result |
|---|---|---|---|---|
| F01 Studio cross-class write | Source RPC global lesson/rubric UPDATE/DELETE+INSERT; source hashes unchanged | Có authoring/permissions tests, chưa assert A-save không đổi B lesson/config/revision | Synthetic A/B same course, instructor assigned intended scope; saveStudio A qua real API; query B/global rubric + revisions và run snapshot. Expected phải dựa quyết định global-vs-class rõ, không sửa expected để pass | NOT VERIFIED |
| F02 quoted chunk outbox key | Trigger/keys chứa quoted position; worker/backfill wrap thêm quotes; pure source/key reproduction | Test count 22 triggers/rollback, không drain actual chunk event qua worker | Approved synthetic SOP chunk insert/update/delete; real outbox key; worker consumer với staging Firestore/warehouse hoặc isolated stub sinks; assert processed không DLQ, correct canonical row/revocation; backfill assertion riêng | NOT VERIFIED; static defect reproduced trước đây |
| F06 course/client scope + auto correction | Same-client predicate, course chỉ ORDER BY; course instructor rights dùng global course scope | S13 **historically reports** production rollback synthetic QA; covers same-course transfer/custom workspace/idempotency. Không covers same course across clients hoặc same department different course đầy đủ | Two clients sharing course + inactive domain variants; unassigned instructor manage/reads; learner correction existing same-client/different-course target, completed/removed memberships, repeated Sheet sync, new class without SOP clone. Compare expected với S13 approved auto policy | NOT VERIFIED mới; historical reported partial |
| F10 runtime trust/RLS | Runtime login membership authenticated+service_role; authenticated progress SELECT global is_instructor policy | Offline auth denial/reset có, owner/Cloud SQL role/ACL/BYPASS actual chưa; serialized fake pool bỏ concurrency | Connect actual non-owner runtime; RLS/EXECUTE grants read-only inventory; wrong-class instructor progress SELECT; verified actor vs service path; concurrent requests/reused pool after COMMIT/ROLLBACK; record allowed vs intended matrix | NOT VERIFIED |
| F15 scoped export closure | Export follows FKs và global user corrections; class allowlist alone chưa prove tenant isolation | File preflight checks checksums/FK/correction parents, không live-export approve closure | Staging synthetic shared users/course/corrections across clients; source READ ONLY export approved class; assert closure IDs/tenants vs explicit allowlist, stop on unapproved expansion; record checksum/count and no source mutations | NOT VERIFIED |

Case execution cần recorded build/schema hash, DB/roles, actor scopes, synthetic fixtures và expected policy. Rollback transaction không bảo đảm zero side effect: sequence có thể advance, API calls commit riêng và external Firestore/model work không rollback cùng SQL. Không dùng historical rollback script trên production như substitute staging. Existing [verify_department_correction_rollback.sql](../../apps/promptify-intrepid/scripts/verify_department_correction_rollback.sql) là historical executable reference, không instruction chạy ngay.

**Các finding chưa xác minh không được bỏ qua vì chọn B/C.** F01/F06/F10/F15 vẫn ảnh hưởng core; F02 chỉ có thể bỏ runtime relevance sau khi entire projection workflow retired và backlog/history preserved, không chỉ warehouse=false.
