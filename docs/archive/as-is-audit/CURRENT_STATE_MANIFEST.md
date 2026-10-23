# Promptify Current State Manifest

> Audit ngày 2026-10-05 · local `main` · commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.

## Scope manifest

- Audit local repository tại commit ghi trên đầu trang; tracking main behind4, không checkout remote/deploy.
- Không đọc Refined BRD, không dùng future/proposal direction làm current capability.
- Chỉ docs audit + temporary runner/log; không commit/push/deploy/DB mutation/application changes.
- Stack/product/DB/architecture/AI/access/strengths/weaknesses/debt ở bảng dưới; executive summary10 là điểm bắt đầu đọc.

| Topic | Current state | Artifact |
| --- | --- | --- |
| Stack | React19/TypeScript5.7/Vite6/Tailwind3; Supabase JS/Auth/Postgres; Vercel handlers; OpenAI/Gemini | 01_SYSTEM_OVERVIEW.md |
| Capabilities | 33 audit units: 21 Real, 9 Partial, 3 Mock; scope/rules explained | 02_FEATURE_INVENTORY.md |
| DB model | 14 repo-declared public tables; schema baseline +002–017; attempts event/progress aggregate; no live catalog verified | 03_DATABASE_AND_SQL.md |
| Architecture | SPA directly Auth/Data API/RPC; AI API authorizes and calls provider, browser saves DB | 04_CURRENT_ARCHITECTURE.md |
| User flows | Google→role→enrollment→Hybrid run/evaluate/save; Instructor CRUD and snapshot KPI | 05_USER_FLOWS.md |
| AI flow | Server OpenAI priority; Gemini per-model retries; client context/rubric; 5x2 Judge; simulation no persistence | 06_AI_FLOW.md |
| Access | JWT/RLS/RPC owner checks; public metadata/nonUUID gap; no common clock expiry; instructor global | 07_ACCESS_CONTROL.md |
| Strengths | Atomic progress, canonical curriculum relationships, client/server contract validation, explicit simulated safety | 10_AS_IS_EXECUTIVE_SUMMARY.md |
| Weakness/debt | Trust client score, browser data isolation, access inconsistencies, content drift, test/API/scale limits | 08_TECH_DEBT_AND_RISKS.md |
| Runtime | tsc/Vite PASS; 19/22 scripts PASS; 3 FAIL;5 SKIP; no live DB/browser/provider certification | 09_TEST_AND_RUNTIME_STATUS.md |
| Unresolved | Deployed revision/migration ledger, actual data/config, role scope, completion meaning, expiry process, assessment trust | 10_AS_IS_EXECUTIVE_SUMMARY.md |

## Artifacts / reading order

- [10_AS_IS_EXECUTIVE_SUMMARY.md](10_AS_IS_EXECUTIVE_SUMMARY.md)
- [01_SYSTEM_OVERVIEW.md](01_SYSTEM_OVERVIEW.md)
- [02_FEATURE_INVENTORY.md](02_FEATURE_INVENTORY.md)
- [03_DATABASE_AND_SQL.md](03_DATABASE_AND_SQL.md)
- [04_CURRENT_ARCHITECTURE.md](04_CURRENT_ARCHITECTURE.md)
- [05_USER_FLOWS.md](05_USER_FLOWS.md)
- [06_AI_FLOW.md](06_AI_FLOW.md)
- [07_ACCESS_CONTROL.md](07_ACCESS_CONTROL.md)
- [08_TECH_DEBT_AND_RISKS.md](08_TECH_DEBT_AND_RISKS.md)
- [09_TEST_AND_RUNTIME_STATUS.md](09_TEST_AND_RUNTIME_STATUS.md)

## Evidence policy

Code/SQL ưu tiên hơn historical docs. Static declarations không là bằng chứng production object đang tồn tại. File inventory hashes/line count ở01, exact DDL/index/trigger ở03, latest policy bodies ở07, command output ở09. No production secrets copied. Future/proposal files chỉ được ghi nhận tên và loại khỏi căn cứ. Không có Gap Analysis hay rebuild proposal.

## SQL validator caveat

HIGH SQL-01: valid_evaluation_total dùng <> với jsonb_typeof trên key thiếu, SQL NULL có thể làm incomplete scores được trả declared total hợp lệ. Phân tích static; chưa execute DB. Details ở03/07/08.
