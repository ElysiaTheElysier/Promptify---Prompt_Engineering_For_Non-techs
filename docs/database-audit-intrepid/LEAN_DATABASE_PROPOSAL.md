# Lean database proposal — Second pass

**Ngày:** 2026-10-13. Đề xuất, không thay đổi code/schema/data. [Feature matrix](FEATURE_TO_TABLE_MATRIX.md) → [complexity review](ARCHITECTURE_COMPLEXITY_REVIEW.md) → [decision matrix](SIMPLIFICATION_DECISION_MATRIX.md).

## Khuyến nghị

**Chọn B làm scope để review với product owner**, không lấy A làm default vì code đã có và không lấy C làm production replacement tự động. Giữ identity/department isolation, Sheet roster, learning loop/persistence/progress, Trainer/Head basic operations, EN/VI và self-correction policy mới nhất. Giản lược cơ chế xử lý, rồi mới quyết định feature optional nào thật sự cần bật.

B được xây từ capability đã có nguồn xác nhận + một số supporting conveniences được giữ thận trọng (draft, manual Sheet configuration/log, curated SOP registry, form review, library). **Chưa có signed current launch feature list xác nhận toàn bộ footprint B**. Yêu cầu supplied UI và full-GCP prep vẫn tồn tại; đề xuất tắt/defer những phần đó cần scope decision mới. Không coi brief 06/10 là giấy phép hủy yêu cầu 10–13/10. C là validation experiment hoặc future approved cut list, có giảm functionality chứ không chỉ giảm schema.

SOP/sample data thật và basic reporting là nhu cầu; vector search/BQ/certification không tự mandatory để đáp ứng chúng. Official content/qualification approval, country onboarding completeness, operational roster source reconciliation và current live DB usage vẫn chưa xác minh.

## Ba phương án

| Dimension | A — Full capability | B — Lean Production proposal | C — Minimal Core validation proposal |
|---|---|---|---|
| Business scope | Giữ toàn internal + workshop + uploads/search + certificate + public/trial + governance workflows | Internal operation; basic authoring, manual roster, profile correction, curated SOP/review/library, learning/progress | Một controlled learning cohort/lesson loop, real approved context, Sheet-derived roster, scoped Trainer/Head report; manual content/submission operations |
| PostgreSQL future capability footprint | **50** | **32** | **23** |
| So với first-pass 44 KEEP | 44 retained | 30 retained / **14 conditionally inactive** | 21 retained / **23 conditionally inactive** |
| Core tables hợp nhất? | Không | Không | Không; stable IDs/boundaries giữ để không rewrite chỉ vì ít tables |
| SOP context | Full registry/intake/private upload; JS/pgvector/BQ variants cần chọn/operate | Approved versioned text/URL sources; manual intake/review; bounded canonical context, không semantic index | Approved lesson_resources/sample text + immutable run snapshot; no SOP library/upload pipeline |
| Roster | Manual + scheduled workers | Explicit Sync now, mapping/log, retry-safe import | One approved Sheet/config hoặc authorized Sheet-export import; nguồn vẫn Sheet, không arbitrary roster CSV |
| Authoring | Full class Studio/rules/sandbox | Basic course authoring + only meaningful class overrides; no persisted sandbox pipeline | Global approved lesson/rubric via controlled authoring process; no class Studio state |
| Learner extras | Draft, reflection/unlock tracking, private upload, shared library | Server draft + simple library; defer unlock ledger/private uploads | Browser local draft nếu accepted; curated templates/resources; no library moderation |
| Live workshop | Freeze, broadcast/private coaching/receipts, notes/clearance | Basic progress view/compare vẫn giữ; durable intervention/control workflow defer | Trainer trực tiếp theo dõi/feedback qua approved operating process, scoped progress report |
| Certification | Attendance + award evidence/PDF rules | Ngừng new issuance nếu business approval không cần; preserve issued records | Validation learning/progress; không formal certification |
| Reporting | SQL + optional BQ advanced path | SQL basic authorized reporting; ROI unset đến có measured inputs | SQL progress/attempt summary; không impact warehouse |
| Background jobs | 2 worker handlers + 2 Scheduler jobs | **0 proposed business jobs** nếu auto roster/projections retired | **0 proposed business jobs** |
| Additional derived storage | Firestore notices, optional 3 BQ tables/3 views, GCS originals | No Firestore/BQ active consumers; GCS chỉ nếu original bytes thực sự cần | No Firestore/BQ/semantic extension; no original-file ingestion cần vận hành |
| AI | Full provider/model/embedding options | Một approved generation/Judge provider; no search embeddings | Một approved provider; real outputs/feedback persist; không fake demo outcomes |
| Trade-off chính | Nhiều acceptance/failure/retention duties; chưa có measured adoption justify tất cả | Mất realtime interventions/automation/certificates/private uploads; manual operating work tăng | Giảm reuse/contribution/authoring convenience; không đáp ứng mọi requested screen capability |
| Khi hợp lý | Product xác nhận từng workflow, owner/SLA/budget có thật và staging parity | Internal product cần vận hành lean, willing reapprove optional rollout scope | Kiểm chứng learner demand/content/provider quality trước expansion; không tự thay active full-feature delivery |

Counts là **table allocations cho future design**, không optimized schema đã được compile/test. RPC/helper/trigger/policy counts B/C chưa thể suy ra bằng trừ vài rows: caller/trigger refactor phải xong và target catalog mới được kiểm tra. A hiện có 77 public functions/40 triggers/76 policies source-derived, 38 distinct literal runtime RPC names; B/C không tự chứng minh cost giảm tỷ lệ thuận số bảng.

## Danh sách chính xác để kiểm đếm

### B — 32 retained table contracts

| Group | Count | Tables |
|---|---:|---|
| Identity/zone/access | 9 | users, learners, clients, classes, enrollments, course_instructors, product_class_grants, product_domains, gcp_identity_bindings |
| Curriculum/basic Studio | 6 | courses, course_modules, lessons, lesson_resources, lesson_rubric_criteria, product_studio |
| Learning evidence/concurrency/progress | 4 | prompt_attempts, rebuild_runs, rebuild_judge_claims, lesson_progress |
| Manual Sheet ops | 4 | rebuild_roster_imports, product_roster_profiles, product_sheet_connections, product_sync_logs |
| Approved correction + draft | 2 | product_profile_corrections, product_prompt_drafts |
| Curated SOP registry | 3 | rebuild_sop_documents, rebuild_sop_versions, rebuild_sop_bindings |
| Manual SOP intake + simple library | 2 | product_sop_contributions, product_prompt_library |
| Cost bounds + audit | 2 | product_request_budgets, product_audit |
| **Total** | **32** | Giữ country metadata ở roster_profiles tạm thời; không merge chưa proven |

**18 conditionally inactive trong B:** product_worker_invocations; product_learner_support; product_session_controls; workshop_messages; workshop_message_receipts; trainer_hints; rebuild_trainer_actions; product_sop_chunks; product_learner_context; product_attendance; product_awards; product_rotation_requests; product_rotation_approvals; product_governance_config; product_sandbox_runs; user_tutorial_progress; product_enterprise_requests; gcp_projection_outbox.

Trong 18 bảng đó, 4 không thuộc first-pass KEEP (governance_config/tutorial deprecate, rotation requests/approvals investigation), nên **14 KEEP được re-challenge**, không phải 18 KEEP. B vẫn giữ rubric investigation và roster-profile merge candidate.

### C — 23 retained table contracts

| Group | Count | Tables |
|---|---:|---|
| Identity/zone/access | 9 | users, learners, clients, classes, enrollments, course_instructors, product_class_grants, product_domains, gcp_identity_bindings |
| Global approved curriculum | 5 | courses, course_modules, lessons, lesson_resources, lesson_rubric_criteria |
| Real learning loop | 4 | prompt_attempts, rebuild_runs, rebuild_judge_claims, lesson_progress |
| Sheet-derived import/history | 2 | rebuild_roster_imports, product_roster_profiles |
| Current approved correction | 1 | product_profile_corrections |
| Bounds/audit | 2 | product_request_budgets, product_audit |
| **Total** | **23** | Includes scoped Head report và EN/VI qua reused data, không own table |

**9 additional inactive so với B:** product_studio; product_prompt_drafts; product_sheet_connections; product_sync_logs; rebuild_sop_documents; rebuild_sop_versions; rebuild_sop_bindings; product_sop_contributions; product_prompt_library. Tổng C inactive = **27**, trong đó **23** first-pass KEEP.

C có thể dùng process/manual operations thay in-app features, nhưng phải chứng minh: Head vẫn có approved way gửi SOP/sample data; Đức vẫn author/publish bài và review contextual feedback; Country/department roster giữ; learner still actual run/Judge/compare/progress; Head own-department report; correction vẫn đúng S13. Không có process thay thế được chấp thuận thì C **không đáp ứng confirmed need**, không thể gọi usable bằng một demo static page.

### Không cộng savings hai lần

Nếu M1 roster_profiles→enrollments của first pass sau này proven safe, footprint B/C có thể là 31/22. Đây là **optional independent merge**, chưa được chọn ở second pass và không cần để đạt lean scope. Governance/tutorial already inactive B/C nên không trừ thêm “3 candidates” của first pass để quảng cáo số nhỏ hơn. Retiring Basic funnel tiết kiệm **0 core tables**; bỏ BQ không bỏ authoritative SQL tables.

## Những refactor bắt buộc trước khi footprint trở thành schema thực tế

### 1. Giản lược SOP workflow, không chỉ xóa chunk table

B giữ pending contribution khác approved registry, nhưng publisher hiện insert indexed chunks và validate embeddings. Nếu defer F14 thì phải review một canonical text/URL publication transaction không phụ thuộc embedding readiness; preserve review actor/reason/version/citation và original metadata nếu cần. Snapshot/Inspector không được đòi indexed status để xem approved content. Drive-folder discovery/extraction/file signing chỉ giữ khi operator cần, không tự động từ “form Head gửi SOP”.

C không registry: select approved lesson_resources/sample context, snapshot immutable content/rubric tại begin run, giữ source provenance đủ yêu cầu thực hành. Existing rebuild_class_sops, bindings queries, upload/source-download endpoints và snapshot fields phải được retire/adapt trước khi schema contract. Snapshot/citation history cũ vẫn có immutable export/read-only archive; không renumber version/certificate IDs.

### 2. Giữ basic Sheet roster, tách background automation

B giữ mapping/connections/manual sync log + import idempotency. Chỉ retire auto_sync worker/scheduler/nonce khi no active job và operator chấp nhận manual cadence. C một approved Sheet source/read-only read hoặc authorized export; ledger/country snapshots vẫn persist. Không cho người dùng arbitrary CSV tự tạo identity/role. Correction vs source roster reconciliation phải có acceptance: Sheet không được S13 sửa, nên sync sau auto transfer cần chứng minh không phá intended membership/default.

### 3. Ngừng optional writes nằm trong read/core paths

Award issuance hiện trigger từ attempt evaluation và refresh trong snapshot. Support records quyết định hint/solution redaction. Session control/Basic quotas là run triggers. Studio config được dùng cho pass threshold/schedule/rubric. Outbox watches nằm trên core tables. Do đó **ẩn UI không retire feature**: phải review actual call/trigger/default/policy graph, single writer authority và disclosure/threshold expectations trước contract.

### 4. Thay operational mechanism, không yếu security

Không gộp Head grants vào instructor, private hints vào broadcast, private learner uploads vào shared SOP, raw admin notes vào global audit, pending run vào successful attempt hay awards vào progress. B/C vẫn cần least-privilege Cloud SQL non-owner roles + verified claims reset; scope fixes F01/F06/F10/F15 không biến mất khi giản lược. Nếu no active projection consumer, retire full outbox/delivery workflow, không best-effort fire-and-forget.

### 5. Reduce generic infrastructure sau parity

Trong cutover, compatibility adapter có giá trị tránh rewrite vội. Sau parity, chỉ giữ query/RPC contracts thật của chosen scope; không phát triển thành ORM mini-framework hoặc generalized event bus. Một provider mode cho generation/Judge; embedding model migration/semantic warehouse là release riêng nếu có measurable need. Không thêm Redis/quota ledger/session/token-control abstractions chỉ vì có Word preconditions.

## Rollout, preservation và rollback

1. **Chốt scope B hoặc C bằng feature IDs**, không chốt target count trước. Ghi owner, expected user benefit và constraints; reconcile later UI/full-GCP requests. F13/16/17/25 scope không có adoption evidence thì đánh “pending”, không tự coi approved.
2. **Lấy live evidence**: table counts/roles/function ACLs, selected class/client/user closure, external admin/BI/job readers, pending runs/claims/contributions, issued awards, source model vectors. Current fresh live count UNKNOWN; historical applied-migration statements không thay catalog.
3. **Preserve initial schema/data** khi platform cutover: ưu tiên 50-table compatibility stage rồi retire chosen feature writes/consumers trong release riêng. A/B/C count không là lệnh DROP. Physical tables có thể vẫn 50 trong observation/archive window dù active capability footprint 32/23.
4. **Stop new optional work** có approved scope; drain/park known queues và isolate historical reads. Không tự cancel uncertain provider run/Judge để retry, không replay secrets hoặc grant rộng cho backward compatibility.
5. **Contract only after dependencies refactored/tested**, archive/export immutable IDs/timestamps/JSON/file checksums/approvals/awards; user/tenant scope không mở rộng ngầm. Không sửa applied source migrations/MVP, không làm cleanup cùng platform/model migration.
6. **Rollback scope reduction**: re-enable prior compatible release đọc original preserved state; keep old representation đến đủ window. Nếu target new writes xảy ra, cần approved delta reconciliation, không chỉ switch routing về stale source. Provider/Firestore effects/sequence không rollback cùng SQL.

Các gates data-preservation và compatibility trong [first-pass migration plan](SCHEMA_SIMPLIFICATION_PLAN.md) vẫn áp dụng, nhưng feature retirement thêm gate về business need và replacement operating process. B/C chưa có schema SQL/implementation/test acceptance: audit không giả deployability.

## Những bằng chứng có thể khiến recommendation đổi

| Evidence mới | Decision có thể đổi |
|---|---|
| Roster changes thường xuyên + manual sync làm onboarding trễ vượt SLA đã duyệt | B KEEP F05 worker, thêm nonce/job duty; count +1 nếu same schema |
| Live workshops cần freeze/private coaching/ack, measured async recipients | Giữ đúng parts F09/F10/F11 được chứng minh, không default toàn 5 tables |
| Corpus approved content vượt bounded context, benchmark retrieval tốt hơn full text | KEEP F14 một engine, thêm chunk table; không đồng thời mọi engine |
| Certificate/attendance là customer/HR obligation, policy và issuer approved | KEEP F17 cả attendance/award boundaries; bảo vệ evidence |
| Private upload thường xuyên giúp task success, privacy/retention approved | KEEP F15 riêng; embeddings chỉ nếu private semantic retrieval demonstrated |
| Provider secret vẫn dùng và organization cần two-person in-app rotation | KEEP F20 cả requests + approvals, không IAM-only assumption |
| Realtime freshness hoặc BQ advanced reports là contractual/full-GCP release requirement | KEEP F25 durable delivery + measured SLA/cost, fix F02; tables/services count tăng có lý do |
| Một feature được requested cho presentation nhưng chưa có operator adoption | Không automatically CORE; giữ requested screen fidelity khi còn mandate, negotiate phased functionality |

Không đưa adoption percentages/volume threshold bịa vào gate. Team cần định nghĩa observation window/benefit/SLA; một assigned owner và repeatable use case mạnh hơn số lần grep hoặc row count.
