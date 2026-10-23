# Promptify Intrepid — GCP database architecture audit

**Ngày:** 2026-10-13. **Deliverable:** audit/research/proposal, không implementation. **Production target:** Google Cloud SQL PostgreSQL + pgvector/google_ml_integration, Vertex AI, Firebase Auth, Cloud Run, GCS, Firestore, BigQuery, Sheets/Drive, IAM/Secret Manager.

## Kết luận

Giữ **50 bảng target**, toàn bộ UI00–15, public/API/RPC capabilities, authoring, semantic retrieval, embeddings, certificates, roster, progress, analytics, workshop, governance và projections. Không đề xuất merge/retire feature hay đổi model/provider/retrieval architecture trong clean refactor. B/C của audit trước **không còn là mục tiêu** theo yêu cầu mới; lịch sử báo cáo vẫn giữ để trace evidence.

Source cho thấy integrity và atomicity có nhiều điểm tốt: request/Judge claims, row/advisory locks, versioned SOP, issued award IDs, transaction-local role/claims, private uploads và durable outbox. Tuy nhiên chưa thể certify production-grade: live Cloud SQL inventory bị IAM từ chối, không có DB staging connection được xác nhận, và có correctness/provenance/compatibility risks chưa regression trên target.

**Finding mới đáng ưu tiên:** `rebuildRunService.ts` tính `inputContext` trước RAG, sau đó thay snapshot context; Generate vẫn dùng biến cũ còn Judge dùng snapshot sau thay đổi. Cần bảo vệ “Generate/Judge dùng đúng frozen evidence”, không tự đổi nội dung gửi provider để sửa lỗi này. Chi tiết N01 ở [issues](DATABASE_DESIGN_ISSUES.md).

## Trạng thái bằng chứng

| Label | Nghĩa |
|---|---|
| VERIFIED STATIC | Đã đọc/hash/parse source, đối chiếu official docs hoặc chạy tool offline; không chứng minh deployment |
| VERIFIED STAGING | Đã chạy trên Cloud SQL staging thật đúng build/roles; **chưa có kết luận nào đạt mức này trong lượt này** |
| VERIFIED LIVE READ-ONLY | Đã đọc live catalog/config được cấp quyền; **chưa có kết luận nào đạt mức này** |
| NOT VERIFIED | Chưa truy cập/đo/execute đủ; historical report không tự nâng level |
| REQUIRES APPROVAL | SQL diff, behavior expectation, roles/IAM/flags/extensions/test mutations/cutover chưa được áp dụng |

Label là evidence state, không phải severity. Với policy chưa chốt, một source fact có thể VERIFIED STATIC nhưng fix là REQUIRES APPROVAL.

## Scope và review audit cũ

Đã đọc lại 11 inputs: DB_AUDIT_REPORT, TABLE_INVENTORY, AUDIT_EVIDENCE, VALIDATION_RESULTS, FEATURE_TO_TABLE_MATRIX, ARCHITECTURE_COMPLEXITY_REVIEW, LEAN_DATABASE_PROPOSAL, SIMPLIFICATION_DECISION_MATRIX, SCHEMA_SIMPLIFICATION_PLAN, ERD_CURRENT, ERD_PROPOSED trong [thư mục audit trước](../database-audit-intrepid/README.md). Hashes của 325 source/history entries vẫn khớp; re-check SQL target 001–005, services/API, UI route/action wiring, tests và deployment templates. Không lấy kết luận cũ làm truth.

| Nhận định trước | Disposition theo yêu cầu mới | Status |
|---|---|---|
| 50→47 hoặc B/C→32/23 | Không chọn; giữ cả tables/capabilities, chưa có proof merge parity | REQUIRES APPROVAL nếu ever reconsider; ngoài proposal này |
| KEEP trên từng bảng | Giữ state boundaries nếu lifecycle/security/history có lý do; document owners thay vì count KPI | VERIFIED STATIC / proposal |
| F01 class/global writes | Source fact đúng; kết luận “bug” phụ thuộc approved editing scope. Không tự đổi shared course behavior | VERIFIED STATIC; expectation REQUIRES APPROVAL |
| F02 outbox quoted key | Source key defect vẫn tồn tại; consumer/backfill xây quoting sai | VERIFIED STATIC; staging NOT VERIFIED |
| F06 department transfer | S13 ghi explicit auto approval; không revert pending. Same-course chỉ ưu tiên; same-client restriction giữ | VERIFIED STATIC; new staging NOT VERIFIED |
| SP06 sync re-add old membership hypothesis | Current import RPC không reactivate removed enrollment: ON CONFLICT DO NOTHING rồi reject non-active. Risk batch failure/reconciliation cần test, không khẳng định re-enroll defect | VERIFIED STATIC correction to hypothesis |
| SP01/SP02/SP03 unnecessary machinery | Được dùng làm optimization hypotheses; không delete feature/model/vector/projection modes | VERIFIED STATIC data flow; parity proof NOT VERIFIED |
| README handbook là deployment proof | Không. START_HERE có tier/database/model/order khác current templates | VERIFIED STATIC drift |

## Count nguồn, candidate và live

| Scope | Tables | Other source-derived objects | Status |
|---|---:|---|---|
| Root source business migrations | 48 | 002–050; original history/rollback giữ nguyên | VERIFIED STATIC |
| Baseline offline catalog | 49 | 73 public functions, 18 triggers, 75 policies, 96 indexes | VERIFIED STATIC; không live dump |
| GCP target 001–005 | 50 | 385 columns, 102 FK, 77 public app functions, 40 triggers, 76 policies; native tbls projection có 100 indexes | VERIFIED STATIC; exclude extension-owned objects/auth shims |
| Actual source/live GCP | Unknown | Version, tables, grants, owner, RLS flags, installed extensions, rows/stats unknown | NOT VERIFIED |
| BQ/Firestore | BQ 3 physical tables/3 views; notices riêng UID/class | Derived capabilities vẫn giữ; không cộng vào 50 relational tables | VERIFIED STATIC declaration; provision NOT VERIFIED |

77 app functions không đồng nghĩa 77 externally callable business APIs: có helper/default/trigger functions; metadata generic cũng có trigger entries. Runtime có 38 distinct literal RPC names cộng raw SQL call/worker paths. Full function/signature coverage nằm ở [dependency register](TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md).

## Tools/research thực sự đã dùng

Mình áp dụng `supabase-postgres-best-practices` cho PostgreSQL design/privileges/locks/pooling/index/RLS; không dùng Supabase deployment/Auth/Storage assumptions cho Cloud SQL. Nguồn [skill](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices), các rule pages và PostgreSQL official docs được đọc mới trong lượt này. Platform precedence: GCP → PostgreSQL semantics → skill → lint evidence.

| Tool/reference | Thực hiện | Result / limitation |
|---|---|---|
| [tbls](https://github.com/k1LoW/tbls), **1.96.1** | Cài binary chính thức chỉ ở tmp; native JSON adapter từ source catalog + patches; doc/ERD/lint offline | doc và ERD exit 0; lint exit 1, **37 findings**. Không live introspection/diff |
| [Squawk](https://github.com/sbdchd/squawk), **2.68.0** | Local tmp install; `--pg-version=18.0 --reporter=json` trên explicit 62 SQL history/target files | **296 warnings**, exit 1; không Error-level diagnostic. Không execution hay semantic PL/pgSQL proof |
| [pgTAP](https://github.com/theory/pgtap) | Đọc API/docs, viết SQL regression templates trong test plan | Chưa install hoặc chạy extension/test trên DB |
| [plpgsql_check](https://github.com/okbob/plpgsql_check) | Đọc docs, prepare function/trigger review queries và compatibility gates | Chưa install/chạy; staging installed version/permissions unknown |
| pglast | Existing parser; draft SQL được parse-only khi verify artifacts | Syntax evidence; không semantic correctness/behavior |
| gcloud | Read-only `sql instances list` cho project ID từ handbook | SDK cache cần local access, sau đó cloud API từ chối IAM. `[]` đi cùng error **không chứng minh zero instances** |
| Official GCP/PG research | Extensions, ML settings/IAM, signatures, flags, lifecycle, RLS/locks/PITR | Documentation compatibility, không deployed proof |

Artifacts tool giữ ở [outputs/gcp-db-clean-audit](../../outputs/gcp-db-clean-audit): source-derived tbls JSON/docs/ERD, lint logs, current function/trigger inventory, Squawk JSON. Dữ liệu này không chứa DB rows/credentials. Tool install chỉ ở ignored tmp, không app dependencies hoặc production. Các native tbls fields không chứa live role/ACL/RLS telemetry; không dùng fake table comments để claim DB COMMENT ON đã có.

Squawk nhiều warnings phát sinh từ fresh-baseline DDL, historical rollback và source schemas: không tự rewrite applied migrations, không suy ra 296 production defects. Target 004 có generated vector column/index inside BEGIN nên cần separate live-migration review; baseline trên empty staging là context khác.

## Ưu tiên refactor giữ parity

1. **Correctness/security:** F02 key/worker/backfill; F07 SOP tuples; F10 owner/roles/claims/ACL matrix; F15 explicit export closure; N01 exact provider context provenance; claim recovery. Không tự restrict approved F06 behavior.
2. **Ownership/semantics decisions:** F01 global/class edit contract, F12 legacy/current pass/report/award rules; giữ snapshots/thresholds/award evidence. Known unintended behavior sửa bằng reviewed test expectation, không bảo tồn security flaw để “parity”.
3. **Internal cleanup:** single canonical writers cho each state, normalize relation selection metadata khi thêm FK, explicit extension/function contracts; public names/signatures/return JSON vẫn giữ.
4. **Performance:** actual plans/index/lock/pool metrics; dedup embedding calls chỉ khi model/task/content/provenance/failure-contract parity proven; branch retrieval trước unnecessary full-vector read; coalesce notifications nhưng giữ Firestore/BQ/replay/fallback capability.
5. **Staging/production gates:** detailed phases ở [safe plan](SAFE_CLOUD_SQL_REFACTOR_PLAN.md); không Phase 5 execution.

## Bộ tài liệu

| Document | Nội dung |
|---|---|
| [CLOUD_SQL_COMPATIBILITY_MATRIX](CLOUD_SQL_COMPATIBILITY_MATRIX.md) | Platform/tool/runtime compatibility và unknowns |
| [DATABASE_DESIGN_ISSUES](DATABASE_DESIGN_ISSUES.md) | Root cause, invariant, minimal fix, impact, tests, migration, rollback |
| [CLEAN_DATABASE_PROPOSAL](CLEAN_DATABASE_PROPOSAL.md) | 50-table domain design và SQL/diff đề xuất |
| [TABLE_FUNCTION_TRIGGER_DEPENDENCIES](TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md) | Complete table/function/trigger/policy dependencies |
| [DATA_OWNERSHIP_AND_INTEGRITY](DATA_OWNERSHIP_AND_INTEGRITY.md) | Writers/readers/lifecycle/retention/security cho 50 bảng |
| [VERTEX_AI_PGVECTOR_INTEGRATION_AUDIT](VERTEX_AI_PGVECTOR_INTEGRATION_AUDIT.md) | Model/signature/region/provenance/cost/rollback |
| [FEATURE_PARITY_MATRIX](FEATURE_PARITY_MATRIX.md) | UI00–15, all actions/RPC/helpers/background processes |
| [DATABASE_REGRESSION_TEST_PLAN](DATABASE_REGRESSION_TEST_PLAN.md) | pgTAP/API/concurrency/staging templates, before/after evidence |
| [SAFE_CLOUD_SQL_REFACTOR_PLAN](SAFE_CLOUD_SQL_REFACTOR_PLAN.md) | Phases 0–5, lock/data/compatibility/rollback gates |
| [GCP_IAM_SETUP_CHECKLIST](GCP_IAM_SETUP_CHECKLIST.md) | Developer/Run/SQL-instance/PG role separation |
| [ERD_BEFORE_AFTER](ERD_BEFORE_AFTER.md) | 50→50 entities, conditional integrity changes |

**DoD hiện tại:** audit/proposal và static artifacts, chưa đạt refactor production DoD. Không claim resolved known defects, 100% staging parity, Cloud SQL integration success hoặc backup/PITR readiness. Không sửa app/DB/source migrations, cloud resources/IAM/flags/models, không chạy paid AI hoặc data mutation.

## Kiểm tra bộ deliverables đã thực hiện

**VERIFIED STATIC:** đủ 12 Markdown files; tất cả local links trong bộ tài liệu resolve; 15 SQL code blocks parse-only bằng pglast thành công. Hash-check lại **325/325** source/history files trong evidence cũ không đổi. Không chạy app build/tests như một substitute cho Cloud SQL regression vì không sửa runtime.

Squawk đã chạy riêng trên 15 draft SQL blocks: **8 Warning diagnostics**, exit 1, không Error-level. Trong đó 4 `prefer-robust-stmts` cần migration-state/precondition/retry design thay vì thêm IF NOT EXISTS rồi bỏ qua state; 2 `require-lock-timeout` và 2 `require-statement-timeout` ở concurrent-index/constraint-validation phases cần session budgets cụ thể được review. Proposal đã ghi prerequisite/budget, nhưng draft chưa trở thành production-ready migration. Không suppress warnings hoặc claim zero-risk DDL.

tbls đã sinh thêm actual proposed ERD offline, exit 0: cùng **50 tables / 385 columns**, quan hệ **102 → 104** chỉ là hai F07 guard FKs cần approval. Không live schema diff. Regression plan có assignment riêng cho **77/77 routines** ngoài UI/actions/background coverage. Các SQL mẫu pgTAP/plpgsql_check chưa execute; source-derived diagrams không chứng minh deployed schema.

Machine-readable kết quả nằm ở [artifact-validation.json](../../outputs/gcp-db-clean-audit/artifact-validation.json), [Squawk draft output](../../outputs/gcp-db-clean-audit/squawk-drafts.json), [proposed ERD](../../outputs/gcp-db-clean-audit/tbls-after-proposed.mmd). **VERIFIED STAGING / VERIFIED LIVE READ-ONLY: chưa có**. Triển khai vẫn chờ evidence/config/behavior gates trong safe plan và approval riêng.
