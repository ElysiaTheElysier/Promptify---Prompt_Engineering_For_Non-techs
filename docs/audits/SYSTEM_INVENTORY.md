# Promptify — system inventory

Audit date: 2026-10-23, Asia/Ho_Chi_Minh. Scope: existing local tree on `codex/two-app-isolation`; audit only. Read [handoff](AUDIT_HANDOFF.md) for recovery, checks and limitations; [functional audit](FUNCTIONAL_AUDIT.md) for acceptance status; [issues](ISSUES_REGISTER.md) for remediation.

## Evidence convention and recovered work

**CODE** means inspected current implementation. **OFFLINE** means local assertions against mocks/in-memory SQL, not cloud acceptance. **Historical LIVE** means dated saved runtime evidence, independently read during this audit; it does not establish the currently serving configuration. **Current LIVE is BLOCKED**: unauthenticated public Hosting and Cloud Run health probes both returned ENOTFOUND from this execution environment. No paid or mutating live checks were made.

No prior seven-report audit set existed. Claude's recovered work consists of Judge B/C patches and simulation, demo/role investigation, safeguards/streaming release, workshop inbox and facilitator-approved hint requests; the shared tracker also contains earlier Codex admission/Generation/fencing work. The only specifically named partial audit capture found was `outputs/audit-2026-10-23/` (short check summary and seven-day logs). Ownership of other dirty files is unknown. Historical repository/database audits were reused as context, not treated as current proof.

## Application and data plane

| Component | Current source/configuration | Role and evidence boundary |
| --- | --- | --- |
| Single supported app | `apps/promptify-intrepid` | React 19, TypeScript, Vite; no second app. Local runtime Node 24.14.0. |
| Browser entry | `src/main.tsx`, `components/rebuild/ProductionApp.tsx` | Production screens selected by URL/class/role; prototype route also exists behind build configuration. |
| API entry | `api/cloud-run.ts` → `services/cloudRunServer.ts` | Node HTTP, health/readiness, static fallback, product/compatibility/SSE/internal routes. |
| Product dispatcher | `services/productionServerService.ts` | 60 distinct action names extracted from current dispatcher, listed below. Service queries require explicit scope review. |
| Authentication | `firebaseIdentityService.ts`, `firebaseServerIdentityService.ts` | Google popup; server verifies revoked tokens, verified email and Google provider; SQL identity binding. |
| Authorization | `productionServerService.ts:85–114`, `apiAuthorizationService.ts`, SQL RLS | Admin; instructor shown as trainer; Head grants; learner enrollment; optional client domain restrictions. |
| Operational database | `cloudPostgresService.ts`, `cloudDatabaseService.ts`, `gcp/sql` | Cloud SQL PostgreSQL, RLS and service-role adapter. This is the source of truth, not Firestore. Default pool maximum 5 per instance. |
| Firestore | `cloudProjectionService.ts`, `firebaseIdentityService.ts`, `gcp/firestore.rules` | Own-user invalidation notices only; deny client writes, no prompt/output documents. Direct document subscriptions do not require composite query indexes (`firestore.indexes.json` empty). No fresh emulator/cloud rules test run. |
| Originals | `cloudStorageService.ts`, `sopIngestionService.ts` | Private GCS, immutable create precondition and SHA checks; signed downloads ≤300s, originals ≤25MB. Revocation cannot invalidate a previously issued URL immediately. |
| SOP/RAG | `cloudSopRetrievalService.ts`, `cloudSqlVectorService.ts`, `sopIndexingService.ts` | Class/lesson/version scope, canonical evidence fallback, frozen context/citations; pgvector and optional warehouse paths. Embedding calls have a separate capacity path from Gemini. |
| Generation/Judge | `rebuildRunService.ts`, `productionAiService.ts`, `parallelJudgeService.ts`, `weightedRubricService.ts` | Saved server evidence, weighted-v1 0–10 rubric, A/B/C code paths. Required deployed model/strategy remain Gemini 3.8 Flash / parallel-v1; B/C require separate approval/quality acceptance. |
| Provider transport | `vertexAiService.ts`, `admittedModelService.ts`, `providerAdmissionService.ts` | ADC/Vertex or legacy key path. Optional SQL admission per actual transport, including streaming; disabled by default. |
| Durable AI jobs | `judgeQueueService.ts`, `generationQueueService.ts`, SQL 012/014/015 | Cloud Tasks, per-job capability hashes, leases, bounded retries, owner status polling; later candidate migrations not proven active. |
| Safeguards/help | `learnerSafeguardService.ts`, `promptInjectionService.ts`, `workshopSupportService.ts`, `WorkshopMessaging.tsx` | Expiry, Generation token ledger/reset, injection signals, broadcasts/private hints, request/approve/decline hint workflow. |
| Workspace sources | `googleRosterService.ts`, `rosterWorkbookService.ts`, `workspaceSourcePolicyService.ts`, `driveFolderService.ts` | Sheets/Drive reads, explicit source bindings; roster ownership/removal rules, immutable Drive snapshots. No Drive permission-management implementation. |
| Background processing | `rosterWorkerService.ts`, `stagingRosterClaimService.ts`, `cloudProjectionService.ts` | Generic worker and separately gated staging fixture roster route; projection outbox retries/dead letters. Operational scheduling not freshly verified. |
| Analytics/governance | `cloudAnalyticsService.ts`, `providerOperationsService.ts`, `governanceTelemetryService.ts` | SQL/optional BigQuery reports; operator provider/job aggregates; audit events. Metrics code is not an alerting system. |
| Delivery | `.github/workflows/app-isolation.yml`, Dockerfile, `gcp/cloudbuild*`, `firebase.staging.json` | Local isolation/lint/type/build/smoke/offline gates; dated image overlays complicate source provenance. No deployment executed. |

Paths in this table are relative to the app unless explicitly rooted. Inventory contains 68 service files, 67 component files and five API files; test directory includes 155 files, of which **73 are explicitly allowlisted offline tests**. Counts are navigation aids, not a claim every line was audited.

## Screens and role surface

| Surface | Users | Important dependencies |
| --- | --- | --- |
| UI00–03 entry/onboarding/access | Public, authenticated roster users | Support configuration, request access/enterprise, profile correction and confirmation. |
| UI04 learner hub | Learner | Class selection, progress/awards, prompts, inbox, expiry/session state. |
| UI05–08 workspace/Judge/compare/SOP | Learner | Drafts/variables/private context, Run/SSE, automatic Judge/polling, restore/compare, originals/citations, approved hints. |
| UI09–10 workshop/inspector | Class editor (trainer/admin) | Active learners, attempts, stuck indicator, broadcast/private hint, hint request approval, notes/attendance. |
| UI11 Studio | Class editor | Class lesson overrides, publishing/schedule, rubric, resource/award rules, sandbox AI. Sandbox is deliberately unavailable under isolated-worker mode. |
| UI12 reporting | Head, trainer/admin with assigned scope | SQL/warehouse aggregates; Head report scope follows explicit grants, not an automatic department-name match. |
| UI13 SOP contribution/review | Learner contributor; authorized reviewer | Approved Workspace sources, extraction, review/indexing/publish, immutable originals. |
| UI14–15 governance/roster | Authorized manager/admin | Domains/grants/support/classes, rotation requests, Sheets bindings/import/sync. Fine-grained checks live in dispatcher/RPCs, not just UI gates. |

## Complete dispatcher action inventory

| Family | Actions |
| --- | --- |
| Entry/profile | `supportConfig`, `accessRequest`, `enterpriseRequest`, `enrollBasic`, `snapshot`, `saveProfileDetails`, `confirmProfile`, `departmentCorrections`, `profileCorrection` |
| Preferences/access | `accessRequests`, `reviewAccessRequest`, `saveWorkspacePreferences`, `saveDomain`, `setAccess`, `saveClass`, `setAccessExpiry` |
| Learner work | `generate`, `generationStatus`, `judge`, `judgeStatus`, `saveDraft`, `savePromptLibrary`, `reviewPromptLibrary`, `uploadLearnerContext`, `resetAiSession`, `recordOutcome`, `uiEvents` |
| SOP | `requestSopSync`, `sourceDownload`, `backfillDriveOriginal`, `searchSop`, `prepareSopUpload`, `listDriveFolder`, `submitSop`, `reviewSopPreview`, `reviewSop`, `publishSop`, `inspectWorkspaceSource` |
| Workshop/Studio | `requestHint`, `reviewHintRequest`, `unlockSupport`, `ackMessage`, `saveStudio`, `createLesson`, `createCohort`, `sessionControl`, `broadcast`, `privateHint`, `trainerAction`, `recordAttendance`, `sandboxGenerate`, `sandboxJudge`, `downloadAward` |
| Reporting/roster/governance | `analytics`, `saveSheet`, `setSheetAutoSync`, `syncSheet`, `requestRotation`, `approveRotation`, `governance` |

`supportConfig` and enterprise intake precede full roster context; access request and Basic enrollment still verify identity. The grouped list inventories implementation, not acceptance of each action or authorization of a Basic product launch.

## Deployment/schema reconciliation

Latest recovered release report is **historical** `outputs/staging-release-2026-10-23-hint-inline/RESULT.md`: API `hint3-1023`, Hosting `e7f637fef72a7263`, candidate 7/7; browser acceptance pending. The saved log capture contains requests on `hint3-1023`; it still cannot prove today's traffic allocation or flags. Canonical current-state documentation mostly describes earlier revisions.

| Migration set | Purpose | Evidence |
| --- | --- | --- |
| 001–011, including two differently named 006 files | Baseline, scope, vector/projections, roster lifecycle | Source plus historical deployment/acceptance reports. |
| 012 | Async Judge jobs | Historical phase-3 runtime evidence. |
| 013/014/015 | Global provider admission / async Generation / dispatch fencing | Current CODE + OFFLINE; application to live DB and flag activation not established. |
| 016/017/018 | Safeguards / hint requests / multiple pending hints | Historical release reports claim applied; not read back live in this audit. |

Do not run a generated full schema chain against an existing DB: the generator enumerates all numbered files and has no applied-version reconciliation. New migration numbers must preserve both existing 006 files. No schema, IAM, billing, model, score or cloud resource was changed.
