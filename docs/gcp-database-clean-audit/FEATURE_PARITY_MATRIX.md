# Feature-to-database regression / parity matrix

**Ngày:** 2026-10-13. Current route/action/function wiring **VERIFIED STATIC**. Before/after actual Cloud SQL/UI/API parity **NOT VERIFIED**. No feature deferred/disabled/removed; tests/setup/data changes **REQUIRES APPROVAL**. Existing observed defect expectations require explicit corrected invariant, not rewriting expected result to get PASS.

## UI00–UI15 — full coverage

| UI | Current capability giữ nguyên | DB/API/state | Before/after evidence / regressions |
|---|---|---|---|
| UI00 | Landing, Google entry, public Basic/trial, enterprise lead form | enterpriseRequest/enrollBasic; users/classes/enrollments/leads/budgets | Correct audience/deny cases, same response/duplicate request, no private content/keys; preserve trial/public flow, not lean cut |
| UI01 | Firebase Google login/session/account chooser | verified token → users/gcp_identity_bindings/legacy subject | Invalid/unverified/revoked token, existing mapping/new roster user/unlisted, issuer/UID/email conflict, native provider UX |
| UI02 | Confirmation + approved auto department correction | confirmProfile/profileCorrection; users/corrections/classes/enrollments | S13 immediate approved behavior, old/new log, target/default class, replay after old access removed, country/roster semantics R06 |
| UI03 | Access denied/support/reopen account | Auth scope outcome; no private rows leaked | Same allowed/denied role/domain/roster scope, error copy/status, no secret disclosure |
| UI04 | Hub/assigned curriculum/progress/SOP requests/library/awards | snapshot; lessons/Studio/progress/SOP/library/award/attendance | Same visible records/score labels/eligibility/citations; refresh/limited metrics; R01/R12/R07 |
| UI05 | Prompt compose/settings/private context, drafts, support/reflection, Generate/Judge | saveDraft/uploadLearnerContext/unlockSupport/generate/judge/savePromptLibrary | Real persisted outputs/rubric, exact input evidence RN01, ownership, model/settings, budget/replay/no double-charge, support disclosure, uploads SP01 |
| UI06 | Stored version compare/restore | attempts/runs/evaluation/settings/context IDs, draft | Both same owner/class/lesson, same metadata/score/context, restore no historical overwrite; deterministic before/after fixtures |
| UI07 | Judge scorecard/diagnostics/feedback/retry/language | Judge claim/evaluation/progress/frozen rubric | Valid weighted results/threshold, known failure vs uncertain retry, same previous evidence; R12/RN01/concurrent claims |
| UI08 | SOP inspector/citation/original/search | sourceDownload/searchSop; versions/bindings/chunks/Storage | Same approved scope/source/citations/page/order; pgvector/BQ/JS modes/fallback preserved; stale revocation denial RSP02 |
| UI09 | Workshop/control/analytics/broadcast/learner list/polling | sessionControl/broadcast/privateHint/snapshot; grants/progress/messages | Exact Trainer/head permission, freeze/end behavior, no lost notifications, freshness/reload/fallback RSP03 |
| UI10 | Learner inspector/attempt history/private coaching/notes/clearance | privateHint/trainerAction; hints/actions/attempts | Authorized learner details only; notes history/replay; no score overwrite/misrepresented clearance; recipient privacy |
| UI11 | Full Studio authoring/config/rubric/scheduling/awards/sandbox/SOP review | saveStudio/createLesson/sandboxGenerate/sandboxJudge/reviewSop/publishSop | All tabs/capabilities kept; scope decision R01, config validation/revision, sandbox isolated, claim recovery RN02, source version guards R07 |
| UI12 | Head/Trainer analytics + prompt moderation | analytics/reviewPromptLibrary; scoped SQL/BQ reports/library | Same role/class/date range, metrics semantics/PII, existing ROI absent behavior, SQL/BQ parity R12 |
| UI13 | SOP contribute/upload/Drive/source review | prepareSopUpload/listDriveFolder/submitSop/reviewSopPreview/reviewSop | Pending/private vs published visibility, extraction/model/pages/file checksum/size, atomic approved version, retry/claim RN02 |
| UI14 | Governance/domains/access/budgets/rotation/session/correction log/audit | governance/saveDomain/setAccess/requestRotation/approveRotation/departmentCorrections | IAM status vs secrets, same approvals/history/no raw key, actor capabilities/audit, config compatibility and access matrix R10 |
| UI15 | Sheet connections/mapping/manual and auto sync/logs | saveSheet/setSheetAutoSync/syncSheet; worker roster RPCs | Preserve manual+scheduled capability, source field mapping/country/department, retry result, removed membership/correction reconciliation R06/R15 |

Components/runtime source: [ProductionApp](../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx), compiled source variants under same app; authoring/form state cannot be assumed fake solely from component suffix. EN/VI, responsiveness, exact supplied screen capabilities and existing privacy/error/no-fake-success behavior included. Current Country/UI gaps are requirement questions, not claim newly implemented.

## Complete backend operation register

**43 named actions**, including branch variants such as pending vs auto correction. No action omitted by optional chaining scan.

| Action | Database/external operations | Before/after suite / invariant | Status |
|---|---|---|---|
| `analytics` | SQL or configured BQ aggregate over authorized IDs | R12/R10; same metrics/cutoffs/privacy, no fictitious ROI | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `approveRotation` | distinct approver/approval threshold | R00/R10; history/replay/roles/current application workflow | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `broadcast` | durable class message/request replay | R00/R10/RSP03; private recipients/class-only/reload | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `confirmProfile` | users full_name/confirmed_at | R06/R10; no role/email/identity escalation | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `createCohort` | new class scoped client/course | R06/R10; source class capability/lifecycle/audit | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `createLesson` | draft lesson/module/default content | R01/R10; assigned editor/publication/key/order | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `departmentCorrections` | correction history with user metadata | R06/R10; admin only, privacy and ordering | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `downloadAward` | scoped immutable award→preview/PDF | R12/R10; same ID/evidence/language/issuer/eligibility/name fidelity | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `enrollBasic` | users/learner/public class enrollment | R00/R06/R10; authorized trial/public policy, no enterprise grant | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `enterpriseRequest` | unscoped enterprise request ledger | R00/R15; validation/idempotency/public isolation | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `generate` | begin run/model output/finish persisted attempt | R03/R10/RN01/RSP02; frozen input/quota/replay | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `governance` | scoped domain/rotation/config-state/telemetry/audit | R10/R12; server-only secrets, actual configured state, no invented consumer | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `judge` | owned attempt/claim/evaluation/progress/awards | R03/R12/R10/RN01; no duplicate paid call/forged score | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `listDriveFolder` | approved workspace shared folder read | R07/R10; identity/file ACL and source scope | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `prepareSopUpload` | scoped upload size/path/generation signed URL | R07/R10; 25MB/expiry/ownership/generation conditions | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `privateHint` | private learner hint | R00/R10/RSP03; actual enrollment/recipient visibility | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `profileCorrection` | correction log + enrollment/class transition | R06; preserve auto policy + legacy pending requests | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `publishSop` | document/version/binding atomicity | R07/RN02; same citations/version allocation/lock | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `recordAttendance` | human attendance + eligibility/award refresh | R12/R10; no forged presence/cross-class evidence | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `requestRotation` | fingerprint/provider/request/audit | R00/R10; no plaintext, approved admin scope | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `requestSopSync` | pending contribution Drive request | R07/RN02; scope/idempotency/source approval before ingestion | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `reviewPromptLibrary` | Head/admin moderation state | R00/R10; status transition/reason/visibility, no scope widening | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `reviewSop` | review/reject/indexing claim→publish | R07/RN02/RSP02; atomicity/model/source/claim recovery | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `reviewSopPreview` | pending/source review read | R07/R10; editor scope/private content | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `sandboxGenerate` | trainer isolated paid run state | R00/R10; replay/result and no learner progress/award | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `sandboxJudge` | sandbox-owned evaluation/claim | R00/R10; one claim/no learner score overwrite | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `saveClass` | class lifecycle + audit | R00/R06; allowed statuses/reasons and downstream scope | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `saveDomain` | mutable client domain + audit | R06/R10/RSP03; current admin scope/revocation | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `saveDraft` | own user/class/lesson revision | R00/R10; optimistic concurrency/refresh/no false success | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `savePromptLibrary` | own prompt/settings/score/template request snapshot | R00/R10; replay/body conflict/owner/class/source score correctness | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `saveSheet` | class Sheet source/name/mapping | R06/R10; editor/column mapping approved, no auth role from data | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `saveStudio` | global/class fields/config/revision/rubric | R01/R12/R07; approved scope + all configs/tabs preserved | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `searchSop` | admitted versions/chunks/configured vector mode | RSP02/R07/RN01; authorized top-k/model/citation/revoke | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `sessionControl` | class live state/revision + run guard | R00/R10; freeze/end transitions and no scope change | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `setAccess` | user role/course assignment or Head class grant | R06/R10; exact allowed permission matrix/mutations/audit | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `setSheetAutoSync` | config schedule toggle | R06/R10; capability/owned connection, worker contract preserved | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `snapshot` | All scoped read models plus existing award refresh | R00/R01/R12/R10; golden visible fields and exact authorized side effects | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `sourceDownload` | approved version metadata→GCS short signed read | R07/R10; current binding/owner/publication, checksum/private original | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `submitSop` | pending source/content/metadata + audit | R07/RN02; idempotency/private request/document target | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `syncSheet` | manual Sheets read→import ledger/logs | R06/R15; validation/country/department/retry/batch failures | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `trainerAction` | attempt note/clearance request | R00/R10; scope/history/replay/not canonical AI score change | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `unlockSupport` | support disclosure/reflection | R00/R10; current requirements/solution privacy/replay | VERIFIED STATIC wiring / NOT VERIFIED staging |
| `uploadLearnerContext` | owner text/hash/chunks/embedding | RSP01/R10; extraction/privacy/dedup/model/readiness/replay | VERIFIED STATIC wiring / NOT VERIFIED staging |

## RPC / SQL helper / trigger parity

All **77 app functions** individually registered in [TABLE_FUNCTION_TRIGGER_DEPENDENCIES](TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md), with identity args/defaults/result/security/callers; **40 triggers**, **76 policies**, **50 tables**. Coverage is not limited to 38 literal runtime RPC names. Each requires R00 catalog/ACL/signature snapshot plus its business suite in test plan. Table defaults (`generate_learner_code`), identity predicates, old maintenance/external SQL wrappers and non-RPC trigger callbacks also retained.

Auth shims `auth.jwt()`/`auth.uid()` and extension functions are separate integration coverage: actual schema/signature/permissions/claim-reset tests. No generic adapter metadata entry itself proves function exposed via external API. Generated nested SELECT JSON compatibility is covered before adding guard FKs.

## Background/external processes — preserve full contracts

| Process | SQL / external effect | Before/after test evidence |
|---|---|---|
| Scheduled roster OIDC worker | accept nonce, claim/finish sync, Sheets, membership/logs | Existing due interval/auto flag, private OIDC audience, duplicates, retries/crash/role of connection owner; same records/log state |
| Projection worker/Scheduler | SKIP LOCKED claim, retry/backoff/DLQ, canonical SQL → Firestore/BQ | R02/SP03 event IDs/revisions/tombstones, partial failure, old/new consumers, activation catch-up, every watched table relation |
| SOP review/index workflow | Drive/GCS/extract/chunk/embed/publish | Retain source format/pages/model/citations/privacy, exact publication atomicity, claim uncertainty recovery |
| pgvector SQL→Vertex | pool/role/signature/model/rate/cost/search | Actual Cloud SQL integration, same model-space/dimensions/task/settings, filtered recall/plan; not PGlite mock |
| BQ analytics/vector | Projection MERGE/version tombstone, authorized reports/search | Real SDK/dry-run/data permissions/location, SQL recheck, duplicates/reorder/revoke, same metric definitions |
| Firestore browser + polling | Own UID notice + API authorization reload | Other UID/no client writes, lost notice fallback, debounce/freshness, role/domain revocation |
| Credential rotation application | approval count/fingerprint/provider/deployment/audit receipt | No live rotate during audit; isolated accepted provider validation, no plaintext/old key restoration |
| Export/import/reconcile/file transfer | Scope closure/hash/sequence/USER triggers/files/identity | R15 before/after IDs/JSON/timestamps/checksums, no external tenant expansion, no fabricated fixtures imported production |
| Data/version reembed tooling | Explicit target model/index provenance writes | Separate approval/benchmark/data-preservation/rollback; existing tool retained, no model changed here |

## Before/after comparison protocol

Freeze baseline build/source/catalog/contracts + authorized role fixtures and input payloads. Deterministic state/API/SQL results compare exact normalized JSON/IDs/errors/order; timestamps/IDs generated in test require approved normalization, không normalize away evidence. Provider text is stochastic: compare exact request/context/model/settings/provenance and validity/quality contract on approved corpus, not every text byte across new paid calls. Reuse fixed provider output for deterministic state transition tests but label mocks supplemental; real Cloud SQL/Vertex/E2E separate.

Record affected DB rows/side effects, external sink revisions, role/owner, query count/latency/pool/locks, and regression expectation for every change. **100% parity is a gate, not a result of this audit.** Native `/api/generate`/`evaluate`/legacy worker route exposure gap RN04 must resolve against actual released contract; no accidental 404 conversion of a required API.
