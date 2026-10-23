# Promptify — functional audit

2026-10-23. Read [inventory](SYSTEM_INVENTORY.md) and [issue register](ISSUES_REGISTER.md). All current-runtime verification is **BLOCKED** by this execution environment's outbound DNS failure; no authenticated live action was attempted. Historical LIVE below means the dated evidence was read, not that the audit retested the service. No complete role browser acceptance is claimed.

## Classification rules

- **VERIFIED PASS**: specified assertions passed with the stated evidence level and scope.
- **VERIFIED FAIL**: a specific assertion was reproduced or a dated runtime failure is explicitly identified.
- **PARTIAL**: bounded successful evidence exists but important acceptance remains open.
- **CODE-INSPECTED ONLY**: implementation inspected, no adequate behavioral execution for this feature.
- **NOT TESTED**: no behavioral verification performed for the identified path.
- **BLOCKED**: required environment/access unavailable.

A passing unit/SQL test does not promote its entire feature to a LIVE pass. The feature table deliberately retains PARTIAL when end-to-end acceptance is missing.

## Feature/role matrix

Source abbreviations below resolve under `apps/promptify-intrepid/src/services/` or `src/components/rebuild/`; tests are in the app's `tests/`.

| Feature | Classification | Supporting evidence | Limits / acceptance still needed |
| --- | --- | --- | --- |
| Google sign-in and roster identity | PARTIAL | Historical LIVE lifecycle 21/10; current `firebaseServerIdentityService.ts:10–31`; OFFLINE auth/error/cloud tests pass | Fresh sign-in/revocation/ambiguous-email browser matrix across roles not run. |
| RBAC and class/source isolation | PARTIAL | OFFLINE `verify_cloud_migration`, SOP authorization, service SQL scope, library visibility; historical foreign class/source denials | Service-role operations rely on manual filters; no exhaustive cross-tenant endpoint penetration test. |
| Head grants/denied class URL | PARTIAL | Tracker records valid Head denied for foreign class URL; dispatcher `classScope`; historical access investigation | A reported grant data fix is historical. Current grants not read. Generic 403 still routes to unlisted-email screen (I16). |
| Profile confirmation/department correction | PARTIAL | OFFLINE mentor/profile contracts; historical partial onboarding | Department choices depend on accessible clients; zero enrollment can yield no choices. Country edit and full onboarding acceptance unproven. |
| Public support/access and enterprise intake | CODE-INSPECTED ONLY | Dispatcher actions before full profile context; syntax/scope checks | Anonymous intake abuse controls and successful notification/business handling not established. |
| Public Basic enrollment | NOT TESTED | Action/RPC exists | Product scope remains disputed in decision docs. Do not launch or remove based on this audit. |
| Learner hub/progress/awards | PARTIAL | Historical learner/SOP acceptance 19/10; OFFLINE class loading, rubric, award PDF and cloud SQL | Full browser course-completion/attendance/certificate issuance matrix not rerun. |
| Certificate document generation | VERIFIED PASS | OFFLINE `verify_award_pdf`: seven synthetic name/layout/font fixtures and invalid input checks | Artifact assertions only, not live award issuance. Audit redirected sample files to scratch. |
| Workspace saved Run and generation evidence | PARTIAL | Historical actual learner output; OFFLINE run/evidence/recovery/provider-contract tests | Current service provenance and complete loss/recovery UI test blocked. |
| Generation SSE | PARTIAL | Current stream code + OFFLINE stream test; historical 23/10 report: three streamed saved Runs | Time-to-first-token percentiles, disconnect/reconnect browser behavior and loaded multi-instance test missing. Streaming is disabled with async Generation/isolation. |
| Automatic async Judge A | PARTIAL | OFFLINE automatic/async/claim/schema/alignment tests; historical phase-3 worker durations 43.0s and 131.4s with saved grades | Small samples prove completion only. Latency goal and revocation-before-dispatch remain open. |
| Weighted-v1 rubric bounds/rounding | VERIFIED PASS | OFFLINE weighted rounding, invalid criterion rejection, bilingual/schema and strategy tests | Mathematical contract validation; no blanket assurance of human scoring quality. |
| Judge B/C candidates | PARTIAL | OFFLINE mocked A/B/C, per-call admission and malformed-response rejection | Human-scored equivalence and real latency/cost not measured. No authority to switch live strategy. |
| Judge below 10s | NOT TESTED | No measured current request-to-five-visible-criteria benchmark | Historical long runs do not prove every run fails; there is no SLO pass. |
| Prompt variables/settings/private context | PARTIAL | OFFLINE mentor, settings, provider/evidence isolation tests | Live variable expansion/settings persistence/source selection acceptance not identified. |
| Draft/history/attempt compare and restore | PARTIAL | OFFLINE comparison/state/text-diff/tab tests; historical saved attempts | Browser restore must preserve exact prompt/settings/context and score provenance. |
| Personal prompt library | PARTIAL | Historical personal save; OFFLINE visibility/provenance tests | Current live acceptance not rerun. |
| Shared prompt approval/peer read | PARTIAL | OFFLINE role/owner/status checks | Real author → Head approval → permitted peer, plus non-target denial, not demonstrated. No 85% save prerequisite in current rules. |
| SOP reader/citations/original download | PARTIAL | Historical 21/10 scoped immutable download/hash proof; OFFLINE authorization/download/immutable tests | Representative real documents and immediate access change after signed URL issuance need bounded acceptance. |
| SOP extraction/indexing/review/publish | PARTIAL | OFFLINE ingestion/indexing recovery/submission scope; historical four synthetic TXT files | PDF/DOCX/XLSX/native Docs/Sheets each need authorized live acceptance. No claim of 550 production SOPs. |
| Vector retrieval / warehouse fallback | PARTIAL | OFFLINE scoped retrieval, evidence freezing, revocation/fallback tests | Actual Cloud SQL vector plan, embedding latency/cost and warehouse parity not benchmarked. |
| Manual Sheet roster add/update/omission | PARTIAL | Historical synthetic lifecycle 21/10; OFFLINE roster lifecycle/table/workbook/source/worker tests | Real company workbook acceptance not established; original-source ownership/manual-preservation rules must stay unchanged. |
| Scheduled roster every five minutes | PARTIAL | Code/OFFLINE worker schedule and OIDC checks; historical Scheduler PAUSED | No fresh Scheduler delivery → full import → revocation proof. Gate remains open (I14). |
| Google Drive access administration | NOT TESTED | Drive integration is read-only; no grant/revoke permission implementation found | DB/source revocation is not a change to Google Drive ACLs. This is a capability boundary, not an inferred missing requirement. |
| Broadcast/private hint inbox | PARTIAL | OFFLINE messaging SSR/receipt/SQL tests; historical save-without-render bug, later release report | Two-browser delivery/read receipt/privacy acceptance still pending; do not label old bug currently broken solely from earlier evidence. |
| Facilitator hint request/approve/decline/history | PARTIAL | Current 017/018 + OFFLINE messaging; historical hint3 release | Browser acceptance pending; mock interleaving exceeds five pending requests (I10). |
| Hint limit concurrency | VERIFIED FAIL | OFFLINE mocked READ COMMITTED schedule: two reads of 4, two inserts, result 6 with declared limit 5 | Current function exercised, real multi-connection PostgreSQL reproduction pending. |
| Workshop stuck/inspector/notes/attendance | PARTIAL | Current workshop/inspection services; OFFLINE mentor/workshop/cloud contracts; saved Inspector scorecard observed historically | Non-target denial and facilitator workflows not fully rehearsed live. Stuck rule is more than five scored attempts below 8. |
| Studio/class lesson/rubric/schedules | PARTIAL | OFFLINE lifecycle/config/mentor tests; historical Studio QA | Live publish/schedule/in-flight change matrix incomplete. Sandbox returns 503 by design under worker isolation. |
| Analytics/Head/cohort reporting | PARTIAL | OFFLINE cloud/mentor contracts; SQL `product_analytics`; explicit unknown ROI fields | Live totals/filter/heatmap accuracy not accepted. Snapshot stats cover latest 200 attempts, not full history (I11). |
| Domains/grants/rotation governance | CODE-INSPECTED ONLY | Dispatcher plus SQL contracts; separation of IAM-based provider rotation | No live IAM/secret rotation exercised or authorized. Head scope is grant-based, not automatically department-based. |
| Access expiry/read-only controls | PARTIAL | OFFLINE safeguard tests; historical expired learner 403 + audit records | Missing schema allows access; delayed worker rechecks incomplete (I03/I05). |
| Session token ledger/idempotency/reset | PARTIAL | OFFLINE ledger tests; historical 818 tokens across three Generation saves | Concurrent preflight, reset attribution and failed charges violate strict-cap expectations (I04). Judge tokens excluded from this ledger. |
| Strict concurrent session cap | VERIFIED FAIL | OFFLINE PGlite: at 49,000/50,000, two preflights pass; two 2,000-token saves reach 53,000 | A single Run can also cross remaining allowance. Provider calls = 0 in reproduction. |
| Safeguard fail-closed configuration | VERIFIED FAIL | OFFLINE real helpers with enabled flags and missing tables/columns return writable/budget allowed | Deployment/schema drift becomes silent enforcement loss; no evidence of current live schema failure. |
| Injection/PII filtering | PARTIAL | OFFLINE signal/guard/provider tests; historical two blocked injection requests | Regex signals are not comprehensive injection prevention. Curriculum adversarial-practice allowance must be retained. |
| Global provider admission | PARTIAL | OFFLINE SQL fairness/fence/token/breaker tests and mock pipeline benchmark | Flag activation/current schema and real multiple-instance behavior unverified; no default active global limiter proven. |
| Durable async Generation | PARTIAL | OFFLINE job/retrieval/dispatch/idempotency tests | Candidate 014 not established live; safeguards after waiting are incomplete. |
| Dispatch fencing / lost worker recovery | PARTIAL | OFFLINE PGlite 015 and recovery tests | Activation not established. Generation suppresses uncertain replay; Judge may retry paid uncertain calls. |
| Projection outbox/Firestore invalidation | PARTIAL | Current retries/dead letters and owner-only notice rules; OFFLINE projection tests | Fresh emulator tests not run; scheduler/worker liveness and backlog recovery unknown. |
| Backups/PITR/restore | NOT TESTED | Historical docs record backups/PITR | No restore rehearsal/RPO/RTO evidence. |
| CI/boundaries/local compilation | VERIFIED PASS | Current lint, typecheck, negative boundaries, redirected build; all 73 tests pass across main run + one targeted rerun | Known cycle/large chunks remain. Not a production-runtime guarantee. |
| Local HTTP smoke | BLOCKED | Exit 1; Vite ready, loopback fetch cannot connect | No claim of passing smoke. Prior Claude smoke pass is historical and a different execution environment. |
| Fresh cloud/runtime/configuration | BLOCKED | Hosting and Run health probes ENOTFOUND | Current traffic/image/env/schema/queues/Scheduler/IAM/alerts not read. |

## Current checks and caveats

The normal explicit offline allowlist was used; no glob, live test, load script, credential file or migration was executed. `npm test` normally overwrites `outputs/offline-test-results.json` and certificate samples, so audit execution redirected these generated writes to OS scratch using an in-memory Node preload. One export test initially failed because its temporary-directory creation had not been redirected; the unchanged test passed on a targeted rerun with the correct directory redirect. Report **73/73 covered across main run + targeted rerun**, not a clean single-run 73/73. Other tests were not broadened/repeated unnecessarily.

Additional probes exercised current service helpers in memory without adding source/test files. PGlite proves ledger/check behavior; the bounded-pool and hint-interleaving probes model scheduling deterministically and do not substitute for real PostgreSQL concurrency. See I01–I05/I10 for methods and limits. Existing regression tests passing alongside these failures indicates missing assertions, not that the failures are harmless.
