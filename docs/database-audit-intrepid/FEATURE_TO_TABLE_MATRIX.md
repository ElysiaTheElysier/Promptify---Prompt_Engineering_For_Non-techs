# Feature to table matrix — Second pass

**Ngày:** 2026-10-13. Đánh giá ngược từ nhu cầu; 44 KEEP của first pass không phải 44 bảng bắt buộc cho sản phẩm. Code usage chỉ xác nhận implementation. Tất cả usage/need hiện tại vẫn thiếu telemetry và stakeholder acceptance mới.

## Nguồn và thứ tự quyết định

- **Dxx:** [00 product](../00_PRODUCT_SOURCE_OF_TRUTH.md), [03 decision log](../03_DECISION_LOG.md), [pilot cut list](../02_IMPLEMENTATION_PLAN.md), ngày 06/10. Nguồn trực tiếp cho internal training, Sheet roster, department isolation, learning loop, Trainer/Head progress; không tự override yêu cầu mới hơn.
- **S08:** [UI precedence](../reference/PRODUCTION_UI_BASELINE.md): người dùng yêu cầu giữ supplied UI và thêm feature; [backend architecture](../proposals/PRODUCTION_BACKEND_ARCHITECTURE_PLAN_2026-10-08.md) mở live-workshop scope nhưng tự ghi là proposed. UI fidelity không tự chứng minh operational demand cho mọi trạng thái.
- **S09:** [trial release](../archive/pre-gcp/PRODUCTION_TRIAL_RELEASE_2026-10-09.md): trial Basic, roster và historical QA/rotation đã được ghi nhận. Trial Basic có authorization riêng; không gọi đó là accidental code hoặc approved internal paid policy.
- **S10:** [learner upgrades](../archive/pre-gcp/LEARNER_UI_UPGRADE_2026-10-10.md): Word-driven private uploads, library, reflection/settings và reported QA. Có implementation request; chưa có adoption/benefit evidence.
- **S12:** [certificate work](../proposals/CERTIFICATE_SYSTEM_REDESIGN.md): artifact/rendering improvements; không chứng minh official qualification policy/attendance bắt buộc.
- **S13:** [sign-in/correction update](../evidence/LEARNER_SIGNIN_FIX_2026-10-13.md), phần cuối: người dùng explicit supersede pending policy bằng auto approval + review log. Audit không đề xuất âm thầm khôi phục pending.
- **Sg:** [GCP preparation](../intrepid-google-cloud/IMPLEMENTATION_REPORT.md), [full GCP architecture](../intrepid-google-cloud/FULL_GCP_ARCHITECTURE.md): platform preparation được yêu cầu; lợi ích BQ/vector/realtime và operational acceptance chưa được đo. Nếu B/C thay phạm vi đã yêu cầu, đó là quyết định mới cần review, không cancellation tự động.

CORE = nhu cầu trực tiếp cho internal learning/access/persistence. SUPPORTING = giúp vận hành nhu cầu đó, mechanism còn có thể nhỏ hơn. OPTIONAL = có giá trị/từng được yêu cầu nhưng không proven launch dependency. LEGACY = historical path. UNVERIFIED = chưa đủ business owner/use case cho target. OPTIONAL không có nghĩa chưa từng được yêu cầu.

Live source/GCP count **chưa xác minh**. Source migrations: **48 business tables**; baseline candidate: **49** (+identity); GCP target: **50** (+outbox). BQ có 3 physical tables/3 views, Firestore notices, không cộng vào 50. B/C là future capability footprints sau dependency refactor, không phải số bảng có thể DROP ngay.

## Feature → use case → UI/API

Các actions dưới đây chủ yếu là `POST /api/product`, không phải mỗi action một endpoint. UI number theo [ProductionApp](../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx); API operations theo [productionServerService](../../apps/promptify-intrepid/src/services/productionServerService.ts). Primary owner ở bảng tiếp theo chia đủ 50 tables; shared reporting/security/projection consumers không được cộng trùng bảng.

| ID / feature | Class | Ai dùng / vấn đề cần giải quyết | Evidence về nhu cầu và giới hạn | UI/API |
|---|---|---|---|---|
| F01 Identity/department access | CORE | Nhân viên, Trainer, Head vào đúng zone, dữ liệu đúng scope | D03/D35; S13. Provider/mapping là mechanism, không phải business persona mới | UI01–04/role routing, UI09/14 administration; confirmProfile, saveDomain, setAccess, saveClass, createCohort |
| F02 Curriculum/Studio | CORE | Đức soạn bài từ SOP/sample data; learner đọc nội dung đúng assignment | D04/D35; S08 UI. Per-class/global override ownership chưa được chốt rõ | UI04/05/08/11; saveStudio, createLesson |
| F03 AI learning loop/saved compare/progress | CORE | Run→feedback→sửa→compare; Trainer/Head xem kết quả bền và đáng tin | D35; historical QA S09/S10. Threshold/mastery cụ thể D19 còn open | UI04–07/09–12; generate, judge, snapshot |
| F04 Manual Sheet import | CORE | Trainer/Admin pre-onboard Email/Name/Department/Country chính xác | D24/D35 xác nhận nguồn Sheet; connector/mapping UI là lựa chọn D33 | UI15; saveSheet, syncSheet, product_import_roster |
| F05 Scheduled roster sync | OPTIONAL | Operator tránh nhấn Sync now khi roster đổi thường xuyên | D33 defer; S09 connections manual by default; chưa có sync SLA | UI15 setSheetAutoSync; `/internal/roster` |
| F06 Profile/department correction | SUPPORTING | Learner xử lý mismatch, L&D truy lại chuyển membership | S13 explicit auto-approval mới nhất; preserve history | UI02/14; profileCorrection, departmentCorrections |
| F07 Server draft autosave | SUPPORTING | Không mất prompt trước khi run; phục hồi session/chuyển máy | S10 upgrade; chưa đo cross-device demand hoặc browser-save sufficiency | UI05; saveDraft |
| F08 Hint/solution unlock + reflection ledger | OPTIONAL | Pedagogical support/gate; chưa biết ai sử dụng unlock analytics | S10 implementation; D35 feedback không yêu cầu audit từng unlock | UI05 dialog; unlockSupport |
| F09 Workshop freeze/end | OPTIONAL | Trainer điều phối nhịp workshop trực tiếp | S08 proposed workshop backend; chưa có frequency/SLA | UI09/14; sessionControl |
| F10 Broadcast/private hint/read receipts | OPTIONAL | Trainer hỗ trợ learner bị kẹt; durable inbox nếu async coaching cần | S08/S09 UI/QA; receipt operational need chưa chứng minh | UI05/09/10; broadcast, privateHint, inbox |
| F11 Trainer note/clearance | OPTIONAL | Ghi follow-up theo attempt; clearance policy khác AI score | S08 mockup; state ghi action không chứng minh mastery override đã duyệt | UI10; trainerAction |
| F12 Versioned curated SOP registry | SUPPORTING | Đức/Head quản nguồn cập nhật; learner có citation ổn định | D04 xác nhận content; không bắt buộc registry/RAG cho mọi pilot lesson | UI04/08/11; publishSop, sourceDownload, rebuild_class_sops |
| F13 SOP contribution/review form | SUPPORTING | Head/PIC gửi cập nhật, Đức duyệt trước dùng | D04 confirmed form; S10. Drive/extraction/index automation là subfeature optional | UI04 My Requests/11/13; submitSop, requestSopSync, reviewSop |
| F14 Semantic SOP search/index | OPTIONAL | Tìm đoạn liên quan khi approved bounded context không đủ | D18 chưa chốt; Sg preparation requested; chưa benchmark recall/size/latency | UI08 searchSop; generate RAG; intrepid_search_sop |
| F15 Private learner-uploaded context | OPTIONAL | Thực hành với dữ liệu riêng, cần privacy/retention nếu lưu | S10 request; current generation đọc full content, không dùng private chunk vectors | UI05 uploadLearnerContext; contextIds |
| F16 Shared prompt library/moderation | SUPPORTING | Tái sử dụng prompt chất lượng trong scope đã cấp | D05 confirmed general library; D21 details open; S10 later upgrade | UI05 save/clone, UI12 review; savePromptLibrary/reviewPromptLibrary |
| F17 Attendance/badge/certificate | OPTIONAL | Fact attendance và artifact công nhận nếu business cần | S12 rendering; chưa sign-off qualification/attendance obligation trong D19 | UI04 preview/download, UI11 awards; recordAttendance/downloadAward |
| F18 Cost/abuse bounds | SUPPORTING | Operator giới hạn chi phí AI, kiểm replay/abuse | D07/privacy, D20 numbers chưa approved; safety need khác proposed quota values | Generate/search/upload; product_take_budget |
| F19 Administrative audit | SUPPORTING | L&D biết ai đổi quyền/roster/source/correction và lý do | D03 privacy; S13 review log; không cần event-source mọi editor action | UI14 governance + business RPC mutations |
| F20 In-app secret rotation approval | OPTIONAL | Secret owner/admin hai người approve nếu vẫn dùng key | S09 historical real rotation; Sg IAM target có thể bỏ workflow tương lai | UI14 requestRotation/approveRotation; apply script |
| F21 Governance singleton | UNVERIFIED | Chưa xác định người đọc config để quyết định việc gì | F05 first pass; runtime governance đọc env/domains/audit, quota hardcoded; external reader unknown | Không business consumer được xác định |
| F22 Persisted trainer sandbox | OPTIONAL | Đức thử lesson trước publish; saved sandbox history chưa proven cần | S08 Studio Execute test; preview need có thật, second persisted run path chưa được đo | UI11; sandboxGenerate/sandboxJudge |
| F23 Tutorial completion ledger | LEGACY | Old MVP tutorial từng cần; khác current profile confirmation | Migration007/history/export, không current Intrepid tutorial tracking | Không current tutorial-key UI/API consumer |
| F24 Public B2B lead/quote form | UNVERIFIED | Sales prospect khác internal staff; chưa có owner follow-up/SLA | D11 OUT internal scope; S08 UI landing request; chưa reconcile commercial product mandate | UI00 Enterprise Pilot; enterpriseRequest |
| F25 Firestore/BQ projection delivery | OPTIONAL | Realtime notices/report freshness nếu SLA cần | Sg full-GCP prep requested; templates warehouse=false; polling đã chạy | `/internal/projections`; Firestore subscribe; BQ projection |
| F26 Basic progress/advanced impact reporting | SUPPORTING | Trainer/Head theo dõi đúng scope; ROI cần inputs thực | D05/D35 basic confirmed; D22 advanced mechanism open | UI09/12; analytics, snapshot |
| F27 Public Basic/self-enroll trial funnel | OPTIONAL | QA/demo riêng authorized, không tự thành internal production audience | D06/D11 internal paid; S09 authorized trial scope riêng | UI00 Start Free/enrollBasic; shared core tables |
| F28 EN/VI + compare presentation | CORE | Nhân viên đọc EN/VI và compare hai attempts thật | D08/D35; S10; không cần state table riêng | Locale UI00–15; UI06; local preference + existing attempts |
| F29 Generic SQL compatibility adapter | SUPPORTING | Port existing actions sang GCP; không phải business feature | Sg explicit migration; full mini-PostgREST surface không proven lâu dài cần | CloudQuery.from/rpc; metadata/transaction pool |

## Mapping đủ 50 tables → operations

Operations là source-level behavior, không tuyên bố traffic live. [TABLE_INVENTORY](TABLE_INVENTORY.md) và [AUDIT_EVIDENCE](AUDIT_EVIDENCE.json) chứa từng path/FK/functions; auth/projection có raw parameterized SQL ngoài `.rpc`. R = SELECT, I = INSERT, U = UPDATE/UPSERT, D = DELETE theo use case mô tả, không trao quyền CRUD mặc định.

| Table | Owner → UI/API từ registry | DB operations | Shared features/dependencies đáng chú ý |
|---|---|---|---|
| users | F01 | R profile; I roster/basic; U confirm/auth link | F03/04/06/19/27; parent gần mọi actor records |
| learners | F01 | R learner; I import/enroll | F03/04/17/27; UUID + learner_code |
| clients | F01 | R class client; I approved setup | Domain/class/F06 provisioning, export scope |
| classes | F01 | R authorized cohort; I createCohort/correction; U lifecycle | Curriculum/membership/Studio/SOP/reporting/Basic/outbox |
| enrollments | F01 | R memberships; I roster; U correction/lifecycle | Auth/run/progress/awards/reporting; F04/05/06/27 |
| course_instructors | F01 | R assignments; I/U setAccess | Course-level edit rights; shared-class scope F01/F02 |
| product_class_grants | F01 | R Head class grants; I/U setAccess | F26 scoped reporting; không thay course instructor |
| product_domains | F01 | R domain gate; I/U saveDomain | Client access; F25 invalidation |
| gcp_identity_bindings | F01 | R verified binding; I first mapping | Firebase UID→legacy subject; F25 audience mapping |
| courses | F02 | R curriculum; I setup; U authoring/publication | classes/modules/F26/F27; F25 watch |
| course_modules | F02 | R module; I/U authoring/publication | lesson hierarchy/F26; F25 watch |
| lessons | F02 | R task/context; I createLesson; U saveStudio currently global | F03 snapshots/progress; F12/13/17/26 |
| lesson_resources | F02 | R embedded ordered resources; I/U author/import | F03 canonical context; simple SOP alternative |
| lesson_rubric_criteria | F02 | R default rubric; D/I saveStudio currently | F03 fallback; overlap class JSON rubric unresolved |
| product_studio | F02 | R class config; I/U revision/config | Run guard/pass threshold/F08/F17/F22; no new table for every config field |
| prompt_attempts | F03 | I successful generation; U evaluation; R owned/history | F11 notes/F16 library/F17 awards/F26 reporting |
| rebuild_runs | F03 | I begin; U finish/snapshot; R replay | Pending provider outcome; snapshots; quota/Basic guards |
| rebuild_judge_claims | F03 | I claim; U complete; R claim; scoped D recovery | Prevent duplicate paid evaluation; different lifecycle from score |
| lesson_progress | F03 | I/U attempt trigger/read model; R scoped progress | F26 reporting; F17 completion; F25 watch |
| rebuild_roster_imports | F04 | I request ledger; R/lock replay; U result | Both manual/background import; rows/result contain PII |
| product_roster_profiles | F04 | I/U imported metadata; R maintenance/export | Country/department snapshot; F05 consumes import; M1 merge candidate |
| product_sheet_connections | F04 | R mapping; I/U saveSheet; U sync timestamps | F05 schedule config; F04 manual source remains |
| product_sync_logs | F04 | I running; U success/fail; R log | F05 claims; manual Sync now logs too |
| product_worker_invocations | F05 | I nonce; R replay; D >7 days | Worker-only guard; not manual import ledger |
| product_profile_corrections | F06 | I request/log; R replay/queue/history | Also updates memberships/classes via 050; source/target history |
| product_prompt_drafts | F07 | I/U revision; R own draft | F03 editor restore; not completed attempt/library |
| product_learner_support | F08 | I unlock; U reflection; R gate | Snapshot hint/solution redaction; removal needs disclosure policy |
| product_session_controls | F09 | I/U state/revision; R guard/snapshot | Run trigger/Studio/workshop; class lifecycle khác |
| workshop_messages | F10 | I broadcast; R class inbox | receipts + workshop inbox; F25 watch |
| workshop_message_receipts | F10 | I acknowledge; R read_at in inbox | message/user cardinality; ack runtime route not identified |
| trainer_hints | F10 | I privateHint; R own inbox | Private recipient RLS; F25 watch |
| rebuild_trainer_actions | F11 | I note/clearance action; R history | attempt/actor/request; not AI score authority |
| rebuild_sop_documents | F12 | I publish identity; R metadata | versions/bindings/contribution/index/source download |
| rebuild_sop_versions | F12 | I immutable version; R canonical content | citation/run snapshots; bindings/chunks/contributions |
| rebuild_sop_bindings | F12 | I/U pinned version; R authorized versions | F03 context/F14 search/F25 watch |
| product_sop_contributions | F13 | I submit; U review/claim/indexed data; R requests | F12 publication creates docs/versions/bindings; F14 chunk producer |
| product_sop_chunks | F14 | I publish; R search; I/U reembed | publisher, RAG, UI indexed status, vector extension/model, F25 |
| product_learner_context | F15 | I/U dedup upload; R owner content | context IDs/run snapshot; embedding written but full-content generation reads |
| product_prompt_library | F16 | I save; U moderate; R personal/approved | prompt/settings/score snapshot; F03 attempts referenced |
| product_attendance | F17 | I/U human fact; R qualification | awards conditions, class/learner/lesson; F25 |
| product_awards | F17 | I idempotent issuance; R owned evidence/PDF | attempt/attendance refresh, Studio rules, F25 |
| product_request_budgets | F18 | I/U actor/operation bucket/count | Upload/search/run cost controls; Basic has separate run-count guards |
| product_audit | F19 | I admin mutation event; R scoped audit | correction/access/roster/content/rotation; retention |
| product_rotation_requests | F20 | I request; U approve/apply state; R history | secret owner/apply script/deployment receipt |
| product_rotation_approvals | F20 | I distinct approval; R count | request/user; multi-approver integrity |
| product_governance_config | F21 | DDL/export only; no business CRUD verified | external admin config unknown; service-only singleton |
| product_sandbox_runs | F22 | I pending; U result/evaluation/claim; R replay | AI quota trigger/Studio; no learner progress |
| user_tutorial_progress | F23 | Historical I/U; current export R | Old MVP/history; current users.profile_confirmed_at is different |
| product_enterprise_requests | F24 | I public lead via RPC; export R | unscoped PII; no sales resolution UI verified |
| gcp_projection_outbox | F25 | Trigger I event; U claim/ack/retry; R canonical entity | 22 watched tables; worker/Firestore/BQ/backfill |

## Re-challenge từng bảng: need, alternative, whole-feature retirement

44 KEEP của first pass được bao phủ, cùng 6 bảng khác để không bỏ sót. “Cần state” dưới đây **có điều kiện feature được giữ**, không tự là approval. Actor/use case và independent need evidence ở registry phía trên. A = full capability; B = Lean proposal 32 retained tables; C = Minimal Core proposal 23. Hai footprint không phải deploy-ready schema.

| Table | Có thực sự cần state riêng? | Cơ chế hiện có nhỏ hơn / trade-off | Nếu bỏ feature thì dependency nào ngừng dùng? | B / C |
|---|---|---|---|---|
| users | Roster/business role bền qua login là core | Firebase thay auth, không business role/history | Không thể bỏ identity feature mà vẫn có internal learning; gần mọi actor FK | KEEP / KEEP |
| learners | Subtype/code/UUID history riêng; không phải persona mới | Greenfield dùng user FK có thể; retrofit một bảng tiết kiệm ít, đổi rất nhiều refs | enrollment/attempt/progress/award IDs và sequence | KEEP / KEEP |
| clients | Single client vẫn là boundary để không kéo shared source tenant khác | Config đủ tên đơn vị nhưng không referenced UUID integrity | class/domain/correction/export parent scope | KEEP / KEEP |
| classes | Cohort membership/lifecycle khác curriculum | Không dùng course làm department zone | enrollment/progress/Studio/SOP grants | KEEP / KEEP |
| enrollments | Membership nhiều class + removed/completed history | users.department đơn không chứa cohort history | auth/runs/import/correction/progress | KEEP / KEEP |
| course_instructors | Trainer cần assigned quyền; một Trainer không đồng nghĩa global access | Không gộp Head/instructor hoặc mở global role | manage-class helpers/RLS/course edits | KEEP / KEEP |
| product_class_grants | Head chỉ own class/department | Không dùng course-editor permission thay read scope | Head reporting authorization | KEEP / KEEP |
| product_domains | Mutable domain gate; Google identity chưa đủ business scope | Single approved domain server config có thể, nhưng phải rewrite gates/exception contracts | domain RPC/helper/invalidation | KEEP / KEEP |
| gcp_identity_bindings | Opaque Firebase UID và UUID history cần stable bridge ở GCP | Supabase-only không cần; target GCP đã được yêu cầu | Firebase login, legacy subjects, RLS claims | KEEP / KEEP |
| courses | Chương trình/publication là use case thật | Một course pilot vẫn giữ parent contract nhỏ, không generic SaaS requirement | modules/classes/analytics | KEEP / KEEP |
| course_modules | Ordering/publication theo hierarchy | Flat lessons greenfield có thể; chưa đáng restructure source | lesson parent/order/publication | KEEP / KEEP |
| lessons | Task/context canonical cho vòng học | Không duplicated per-class blob nếu không need override | snapshot/progress/canonical lesson refs | KEEP / KEEP |
| lesson_resources | Many ordered sources/sample data có type | Một context text có thể đủ C; giữ nhỏ để reuse confirmed source contract | embedded context/citations | KEEP / KEEP |
| lesson_rubric_criteria | Default rubric; double writable class/global authority chưa justified | B default+override rõ; C table rubric không Studio | Judge fallback, seed/generator/authoring | KEEP điều tra / KEEP |
| product_studio | Class overrides/schedule/awards chỉ cần nếu variation thật | C global approved curriculum/rubric, không override UI state; không gộp lifecycle tùy tiện | saveStudio, validators, guards, threshold resolver, sandbox/award config | SIMPLIFY / DEFER |
| prompt_attempts | Persistence/provenance/compare là core | Browser-only không đáp ứng reload/history/Trainer/Head | learning loop/history/report/library refs | KEEP / KEEP |
| rebuild_runs | Pending/uncertain provider outcome tồn tại trước attempt | Không ép vào completed attempt | begin/finish/quota/replay/Judge snapshot | KEEP / KEEP |
| rebuild_judge_claims | Durable claim tránh double charge/concurrency | Button disabled không enough; claim-in-attempt có thể nhưng không lợi đủ cho migration này | finishJudge/claim/retry recovery | KEEP / KEEP |
| lesson_progress | Derived read model tiện cho learner/Head; không thay attempt evidence | Query attempts ở small scale có thể; keep low-cost read model trước khi đo | reports/completion/UI progress | KEEP / KEEP |
| rebuild_roster_imports | Retry-key/body/result cần cho safe bulk import | Sync log không bao phủ import không connection; đừng bỏ idempotency | both manual/worker import RPCs | KEEP / KEEP |
| product_roster_profiles | Country/imported department là confirmed metadata | Merge enrollment fields sau privilege/orphan gate; B/C chưa cần merge | import/export/country snapshot | KEEP tạm / KEEP tạm |
| product_sheet_connections | B multiple source/mapping operator state useful | C một approved source config/export; Sheet vẫn nguồn bắt buộc | saveSheet/syncSheet/background source resolution | KEEP / DEFER |
| product_sync_logs | B operator biết Sync now result/errors | C transactional import ledger/result đủ; không background jobs | manual sync UX + worker claims/logs | KEEP / DEFER |
| product_worker_invocations | Chỉ cần nếu signed worker replay protocol tồn tại | Manual sync removes use case; OIDC retry + job idempotency cần review riêng | nonce RPC/worker route, không core roster tables | DEFER / DEFER |
| product_profile_corrections | Approved membership transition + old/new reason/idempotency | Không users.department/Sheet update thay log; không đảo auto approval | UI02/14/provision/class-selection/history | KEEP / KEEP |
| product_prompt_drafts | Cross-session mutable prompt helpful, chưa proven cross-device required | C browser autosave nếu approved; attempts chỉ successful runs | saveDraft/snapshot revision | KEEP / DEFER |
| product_learner_support | Unlock/reflection fact chỉ cần nếu có pedagogical decision sử dụng | Support without tracked unlock nhỏ hơn nếu disclosure policy cho phép | unlock RPC/private solution/hint gate; không public hóa đáp án | DEFER / DEFER |
| product_session_controls | Live freeze/end state khác class lifecycle | Không workshop thì class lifecycle đủ nhu cầu vận hành khác | run guard/snapshot/UI09 controls | DEFER / DEFER |
| workshop_messages | Durable async broadcast optional | Instructor nói trực tiếp/approved workplace channel nếu đủ | broadcast/inbox/receipt joins/projection | DEFER / DEFER |
| workshop_message_receipts | Per-user acknowledgement nếu receipt SLA tồn tại | Không receipt SLA thì bỏ tracking, không merge recipient security | ack RPC/inbox join/export; messages có thể vẫn giữ nếu cần | DEFER / DEFER |
| trainer_hints | Durable private coaching nếu async need | AI feedback/direct coaching đủ C; không merge broadcast | privateHint/inbox/private RLS/projection | DEFER / DEFER |
| rebuild_trainer_actions | Private attempt note/clearance khác score | Defer notes nếu không dùng; generic audit không an toàn thay private notes | UI10 note/history; không tự bỏ quyền mastery thật | DEFER / DEFER |
| rebuild_sop_documents | Reusable identity nếu nguồn thường cập nhật | C approved lesson_resources + run context snapshot | version/binding/intake/search/file contracts | KEEP / DEFER |
| rebuild_sop_versions | Immutable citation/history khi source đổi | C freeze curated lesson + snapshot; không separate registry | bindings/chunks/contributions/source IDs | KEEP / DEFER |
| rebuild_sop_bindings | Many lessons pin version nếu reuse có thật | C lesson-specific resources tránh registry scope; không merge version | rebuild_class_sops/search/snapshot/publish | KEEP / DEFER |
| product_sop_contributions | Confirmed Head/PIC form cần pending input khác approved source | B text/URL + manual review; C approved external submission process | submit/My Requests/review/publish/claim workflow | SIMPLIFY / DEFER |
| product_sop_chunks | Chỉ semantic retrieval cần persistent vector/model/chunks | Approved bounded context/keyword trên versions/resources | search/RAG/publisher chunk insert/extension/watch/UI indexing | DEFER / DEFER |
| product_learner_context | Saved private uploads cần owner lifecycle nếu feature giữ | A extraction/content/hash sufficient current generation; vector unnecessary; B/C defer uploads | upload/contextIds/snapshot replay/retention | DEFER / DEFER |
| product_prompt_library | Sharing/reuse snapshot khác mutable draft/run | C curated templates trong resources; không ép moderation vào draft | save/share/review/clone; archive old entries | SIMPLIFY / DEFER |
| product_attendance | Human fact cần nếu attendance business requirement | Không infer từ AI run; nếu pilot không certificate attendance, defer fact collection | attendance RPC/award qualification/projection | DEFER / DEFER |
| product_awards | Issued UUID/evidence cần bất biến nếu issuance giữ | Không certification requirement thì ngừng issuance, preserve lịch sử | attempt award trigger/refresh/snapshot/download/preview | DEFER / DEFER |
| product_request_budgets | Paid-provider cost guard needs atomic bound | Run counts/provider hard budgets possible; reuse one table tốt hơn Redis/new ledger | takeBudget callers; không bỏ guard cùng Basic funnel | KEEP / KEEP |
| product_audit | Access/roster/correction/content mutation reasons phục vụ operator | Minimal events/retention; Cloud logs không tự thay relational business evidence | governance/correction log/compliance | KEEP / KEEP |
| product_rotation_requests | Request/fingerprint/receipt chỉ cần key-based in-app rotation | IAM + approved standard secret-owner runbook nếu credential mode đủ | request/approve/apply/UI/receipts; no old key revival | DEFER / DEFER |
| product_rotation_approvals | Multi-approver cardinality/security boundary | Retire whole workflow nếu IAM-only; nếu active phải giữ separate approvals | retire cùng requests, không boolean replace | DEFER / DEFER |
| product_governance_config | Chưa verified actor/state question | Env/Secret Manager connection state đã có; không invent reader | external admin config unknown; archive before future retirement | REMOVE candidate / REMOVE candidate |
| product_sandbox_runs | Separate test không tạo learner awards; persisted history optional | Approved isolated validation process; không route trainer test vào real learner progress | sandboxGenerate/Judge + quota/recovery path | DEFER / DEFER |
| user_tutorial_progress | Old tutorial-key completion khác profile confirmed flag | Current users.profile_confirmed_at đủ current onboarding | old MVP/external tutorial retain; target only retirement | REMOVE candidate / REMOVE candidate |
| product_enterprise_requests | Durable sales PII only if actual sales operator follows | Internal pilot no prospect funnel; no owner thì không thu lead mới | enterpriseRequest/landing lead form/export | REMOVE candidate / REMOVE candidate |
| gcp_projection_outbox | Atomic retries cần khi real projection consumers/SLA exist | Existing authorized polling enough without consumers; no fire-and-forget replacement | 22 watches, worker/consumer/backfill, BQ/Firestore delivery | DEFER / DEFER |

## Shared dependency closure

F27 Basic dùng CORE identity/class/run/quota: bỏ public funnel tiết kiệm **0 core tables**. F05 scheduled sync chỉ own nonce: F04 manual Sheet config/log/import vẫn dùng 4 tables. F26 SQL reports không own table: bỏ BQ không bỏ authoritative attempts/progress. F14 bỏ search button không retire chunk producer trong contribution publisher. F17 bỏ PDF button không stop award trigger. F25 warehouse=false không stop outbox triggers/worker.

Mọi candidate removal cần review callers, triggers/defaults/policies/SQL functions, generated metadata/export, snapshot/citation refs, scheduled consumers và historical data. Không DROP source/MVP/shared history. “Table ngừng dùng” nghĩa future reads/writes của feature được retire qua contract riêng, không đồng nghĩa records có thể xóa.
