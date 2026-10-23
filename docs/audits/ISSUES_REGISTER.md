# Promptify — evidence-backed issues register

2026-10-23. All app paths below are relative to `apps/promptify-intrepid/`. No fixes were implemented. P0 = immediate critical compromise/data-loss risk; P1 = production blocker/high reliability or enforcement impact; P2 = material correctness/acceptance/operability gap; P3 = maintenance/perceived performance. **No P0 was demonstrated**, which is not a security certification. Estimates are engineering effort ranges, excluding approvals, cloud access and stakeholder review. New tests/corrections below are recommendations for later authorized work.

| ID | Priority | Issue | Evidence |
| --- | --- | --- | --- |
| I01 | P1 | Nested service/actor transactions can exhaust the SQL pool | CODE + bounded-pool OFFLINE reproduction |
| I02 | P1 | Idle pg Pool error has no listener and can terminate process | CODE + actual Pool event reproduction; historical log corroboration |
| I03 | P1 | Enabled safeguards silently allow missing schema | CODE + PGlite/helper OFFLINE reproduction |
| I04 | P1 | Session budget is post-charged, non-atomic and reset-ambiguous | CODE + PGlite OFFLINE reproduction |
| I05 | P1 | Delayed workers omit new expiry/session/revocation checks | CODE; end-to-end runtime impact not reproduced |
| I06 | P1 | Real global capacity protection/scaling acceptance unestablished | Historical LIVE failure + CODE/OFFLINE candidate |
| I07 | P1 | Sub-10s Judge and B/C quality equivalence unestablished | Historical LIVE samples + OFFLINE/schema mocks only |
| I08 | P1 | Release source provenance/reproducibility is incomplete | Git status + dated overlay configuration |
| I09 | P1 | Operational production acceptance missing | Historical settings + absent restore/SLO acceptance evidence |
| I10 | P2 | Five-pending-hints limit races after 018 | CODE + deterministic mock interleaving |
| I11 | P2 | Repeated large snapshots and truncated statistics | CODE; live performance impact unmeasured |
| I12 | P2 | Missing model/strategy configuration falls back to legacy behavior | CODE; not asserted as active live misconfiguration |
| I13 | P2 | Retry/usage/latency observability is incomplete | CODE + historical capture limitations |
| I14 | P2 | Scheduled roster end-to-end acceptance unfinished | Historical paused Scheduler + CODE/OFFLINE |
| I15 | P2 | Cross-role messaging/library/format acceptance incomplete | Historical release reports + current OFFLINE |
| I16 | P2 | Authorization-denial UI misdiagnoses class access as email failure | CODE + historical Head incident |
| I17 | P2 | Stale documentation and missing applied-migration reconciliation | CODE + conflicting dated reports |
| I18 | P3 | Maintenance/prototype/cycle/bundle debt | CODE + current boundary/build warnings |

## I01 — SQL pool starvation from nested acquisition

- **Affected/location/evidence:** `cloudPostgresService.ts:12–18,23,34–40`; `productionServerService.ts:84–109,131–196`; `tests/verify_service_sql_scope.ts:5–22`. A service scope holds one of five default connections while `c.reader.rpc` opens an actor transaction from the same pool. Existing test pool never blocks on a maximum.
- **Root cause/impact:** acquire-hold-acquire pattern. Five simultaneous scopes can hold all connections and wait for second connections; real pool connection timeout is 10s. Learner class loading/snapshots can fail despite DB health. Deterministic five-slot pool probe exercised current helpers: five concurrent scopes, at least one timeout. Real PostgreSQL/load reproduction remains pending.
- **Smallest correction:** finish actor reads outside the connection-holding service scope, or restructure the scope so no nested actor acquisition is needed. Preserve actor/RLS isolation; do not reuse service authority for actor SQL. Raising pool size alone does not correct the pattern.
- **Regression risk/verification:** medium, authorization/transaction changes. Verify max-five constrained adapter plus actual multi-connection PostgreSQL, five or more simultaneous learner snapshots, rollback/release on errors and cross-role denials. **Effort:** 1–2 days.

## I02 — Unhandled idle pool errors

- **Affected/location/evidence:** `cloudPostgresService.ts:21–24` constructs pg Pool without `.on('error',...)`. Probe on the actual constructed Pool: zero error listeners, emitting an offline idle-error throws; zero connections opened. Private historical log capture contains two `Connection terminated unexpectedly` entries on `life-1021`.
- **Root cause/impact:** no idle-client error handler. An error outside a request transaction can become an uncaught EventEmitter error and restart the service; the old log does not establish current restart frequency.
- **Smallest correction:** sanitized pool-level idle error handling and bounded reconnection behavior consistent with pg lifecycle; leave active-request failures visible. Do not swallow transaction failures or log credentials/query values.
- **Regression risk/verification:** low–medium. Test idle error emission, unhealthy client removal/replacement, startup/readiness recovery and no leaked connections. **Effort:** 0.5–1 day.

## I03 — Safeguards fail open on absent schema

- **Affected/location/evidence:** `learnerSafeguardService.ts:16–17,26–33,45–55,84–88`; schema 016. With `ACCESS_EXPIRY_MODE=enforce`/session cap configured but tables/columns missing, helpers return writable/no cap instead of reporting unavailable. Reproduced using current helpers and PGlite without the required schema.
- **Root cause/impact:** compatibility fallback treats enabled-but-missing schema like disabled functionality. A rollout/restore/config drift can silently disable learner restrictions and security-event persistence. No current live schema failure is asserted.
- **Smallest correction:** retain flag-off compatibility; when an enforcement flag is on, require its schema at startup/readiness and fail closed before provider/mutating work if unavailable. Reads may show a clear unavailable state.
- **Regression risk/verification:** medium during rollout. Test off+absent, on+present, on+absent and database outage separately; verify no provider call in denied cases. **Effort:** 0.5–1 day.

## I04 — Session cap and reset do not provide atomic admission

- **Affected/location/evidence:** `learnerSafeguardService.ts:50–81`, `rebuildRunService.ts:129,182–185,400–401`. Current PGlite reproduction: tokens 49,000, cap 50,000; two preflight checks pass; two successful 2,000-token charges produce 53,000. `chargeSession` charges the session number at finish; a delayed pre-reset Run was charged to session 2 in the probe. Charge failures warn and return false.
- **Root cause/impact:** read-before-provider and later charge are separate transactions, with no reservation/session identity frozen into the Run. Single output can also cross remaining allowance; failed-but-billed saves/charges and Judge calls are not included. The historical 818-token ledger proves Generation accounting, not a hard budget across all AI.
- **Smallest correction:** clarify whether cap is a soft Generation session allowance or strict AI ceiling. For a strict cap, reserve conservative bounded usage atomically with session identity/request key, reconcile actual/uncertain outcomes and prevent reset from reattributing in-flight work. Keep existing identity quotas/scoring unchanged; settle valid output even if accounting repair is needed.
- **Regression risk/verification:** medium–high for quota/idempotency semantics. Test concurrent admissions, reset during provider work, missing usage, charge failure/reconciliation and repeated save; obtain approval for any contract interpretation change. **Effort:** 1–3 days after policy decision.

## I05 — Authorization at enqueue is insufficient for delayed execution

- **Affected/location/evidence:** `rebuildRunService.ts:275–309,341–401`; `gcp/sql/012_judge_jobs.sql:64–80`, `014_generation_jobs.sql:71–89`; safeguards added later in 016. Generation lease rechecks active enrollment/published content/SOPs but not access_expires_at or session cap; worker checks codelab availability only. Judge lease checks token/state/TTL; worker goes straight from saved evidence to evaluate without a current enrollment/expiry check.
- **Root cause/impact:** asynchronous jobs predate safeguards; feature combinations were tested in isolation. A job queued before expiry/revocation or cap exhaustion can still consume provider work afterward. This is an execution-policy gap, not demonstrated cross-tenant data disclosure. Current 014 activation is unknown.
- **Smallest correction:** revalidate the same required authorization/enforcement state under the job's verified scope immediately before a provider call; settle a revoked job without retry. Define policy for already-started work and retain immutable evidence/grades.
- **Regression risk/verification:** medium. Queue → revoke/expire/reset/exhaust → dispatch tests for both workers, including no-RAG and fallback paths, must prove zero provider calls and terminal state. **Effort:** 1–2 days.

## I06 — Provider capacity/scaling is not accepted live

- **Affected/location/evidence:** `providerAdmissionService.ts:45–72`, `gcp/sql/013_provider_admission.sql`; historical capacity root-cause report and fake-provider benchmark. Default unset/disabled admission sends directly. No new traffic/env/schema read confirms 013 or flags. Historical corrected job completed 6/100; 88 were harness circuit stops, six actual 429 responses.
- **Root cause/impact:** provider fan-out with no proven active global protection; application quotas are different from provider capacity. Candidate single-row locking, token reservation and polling may themselves bottleneck SQL. Embeddings are outside this budget. 100 simultaneous signed pipelines cannot be promised.
- **Smallest correction:** validate deployed schema/flags, payload budgets and existing queue settings, then stage the existing limiter with authorized small representative concurrency steps. Do not add Redis/new services or change quotas by assumption. Test Unicode/context reservation size against accepted input limits.
- **Regression risk/verification:** medium–high, throughput/backpressure/DB contention. Real multiple PostgreSQL connections/instances, fair identities, 429/timeout uncertainty, queue TTL, worker routing, Cloud SQL connections and successful grade rate; paid load needs explicit approval. **Effort:** 2–4 days plus access/test budget.

## I07 — Judge quality/latency acceptance gap

- **Affected/location/evidence:** `parallelJudgeService.ts:22–128`, `productionAiService.ts:140–148`; historical Judge worker 43.0/131.4s; B/C mocks and Monte Carlo. A runs Supervisor and five workers concurrently already. Current B/C 2/1 normal logical calls are implemented, not quality accepted.
- **Root cause/impact:** six provider stages amplify tail/usage; queue and transport retries add variability. No representative labeled paired benchmark or request-to-five-visible-scores SLO. A demo fast result would not establish p95 or score equivalence.
- **Smallest correction:** use existing B/C behind the unchanged production strategy; prepare labeled frozen cases and paired quality/latency/token acceptance. Preserve model, rubric/anchors, weighted-v1 and threshold. Strategy rollout requires separate approval.
- **Regression risk/verification:** high scoring-quality risk despite small code change. See benchmark method in [performance audit](PERFORMANCE_AUDIT.md). Report boundary pass/fail disagreements, criterion error and all failed/retried requests. **Effort:** 2–5 days including labeling/review; runtime testing budget separate.

## I08 — Source/release provenance not reproducible from a reviewed revision

- **Affected/location/evidence:** initial Git status: app, GCP migrations, most docs and CI untracked; extensive prior root deletions/changes. `gcp/Dockerfile.hint-inline-20261023:1–3` derives a pinned earlier image and overlays one service; other dated overlays exist. Full Dockerfile builds current entire source, a potentially different combination.
- **Root cause/impact:** substantial uncommitted work and layered releases; “deployed” does not identify all runtime bytes/configuration. Rebuild/recovery could lose source or unintentionally enable/include untested code. No evidence that every dirty change belongs to Claude.
- **Smallest correction:** owner-reviewed source/config/schema manifest and protected backup, then separately authorized source checkpoint and reproducible full-image candidate; compare complete file graph/image digest/Hosting release before promotion. Audit must not commit/push or replace overlays.
- **Regression risk/verification:** low for documentation/manifest, medium for future rebuild. Clean isolated reproduction using same lockfile; full source hash parity and rollback capture; all offline/HTTP gates. **Effort:** 1–2 days, excluding authorization/release.

## I09 — Production operations evidence incomplete

- **Affected/location/evidence:** `docs/01_CURRENT_STATE.md`, `docs/04_OPERATIONS.md`, `providerOperationsService.ts`; historical zero alerts/uptime checks and no restore rehearsal. Current resources not read back. Local /readyz validates SELECT 1 only.
- **Root cause/impact:** completion-focused staging lacks demonstrated SLO/alert/restore/retention ownership. Failure detection and recovery time/data loss cannot be promised. This is an evidence gate, not a claim all controls are currently absent.
- **Smallest correction:** define owner, concurrency/SLO, retention, RPO/RTO; accept read-only operations inventory, queue/error/age monitoring and a restore rehearsal. Configure cloud resources only with explicit authorization.
- **Regression risk/verification:** low for plan/read-only checks; controlled restore requires isolated target and approval. Exercise alerts and documented restore/rollback without mutating existing learner data. **Effort:** 2–4 days plus stakeholder decisions.

## I10 — Hint pending-count race

- **Affected/location/evidence:** `workshopSupportService.ts:35–45`, `gcp/sql/018_hint_requests_multiple.sql:4–5`. Count then insert has no common learner/class/lesson lock after one-pending index is dropped. Current helper under mocked two-transaction interleaving accepted two requests at count 4, yielding 6 despite limit 5.
- **Root cause/impact:** application-only count at READ COMMITTED is not atomic. Queue flood/limit inconsistency across tabs/instances; no live exploitation claimed. Unique request ID still prevents duplicate identity for the same request, not six different requests.
- **Smallest correction:** serialize pending-count decision and insert with a stable per-learner/class/lesson row/advisory transaction lock, while preserving multi-request capability and idempotency.
- **Regression risk/verification:** low–medium. Real two-connection race at count 4 must allow exactly one; decision processing/idempotent replay must remain valid. Do not recreate the old one-request limit. **Effort:** 0.5–1 day.

## I11 — Snapshot cost, polling amplification and partial statistics

- **Affected/location/evidence:** `productionServerService.ts:131–208`; `ProductionApp.tsx:100`. Snapshot fetches lesson/resources/SOP text, 200 attempts, result snapshots, support/progress/library; awards refresh is a write in the read path. 5s/15s polling and Firestore invalidation reload the snapshot. SQL branches serialize within a scoped connection. Attempts/progress/award-derived numbers can have different data horizons; snapshot reports data_limit/truncated.
- **Root cause/impact:** coarse snapshot coupling increases SQL work, data transfer and perceived UI latency. Repeated full content reads and per-identity invalidation can limit scaling. No measured cloud byte/CPU/latency regression is asserted.
- **Smallest correction:** instrument and prioritize lightweight status/summary reads, request coalescing and pagination/versioned content; keep full SQL analytics authoritative. Avoid moving sensitive content to Firestore or adding caches before measuring authority/invalidation requirements.
- **Regression risk/verification:** medium UI freshness/scope. Measure byte/query/pool-wait counts on representative cohorts and verify no missing latest attempt/award or changed authorization. **Effort:** 1–3 days after measurements.

## I12 — Legacy default model/strategy path

- **Affected/location/evidence:** `productionAiService.ts:31–38,140–158`, `productionServerService.ts:198`, `rebuildRunService.ts:130`. Missing GEMINI_MODEL defaults to gemini-2.5-flash; unset/unrecognized JUDGE_STRATEGY executes the older evaluator outside the A/B/C model guard.
- **Root cause/impact:** general compatibility defaults are broader than repository invariants. A bad future environment could silently change behavior; historical staging explicitly configured 3.8/parallel-v1, so this is not proof of a live model change.
- **Smallest correction:** validate required staging/production model/strategy at startup and readiness; fail clearly for missing/unsupported configuration while preserving separately designated offline/legacy tooling. Do not change live configuration during audit.
- **Regression risk/verification:** low–medium for old tooling. Test missing, typo, valid fixed model and approved candidate flag; zero provider calls on invalid state. **Effort:** 0.5 day.

## I13 — Metrics hide some attempts, cost and user latency

- **Affected/location/evidence:** `productionAiService.ts:49–55`, `parallelJudgeService.ts:30–51`, `providerAdmissionService.ts:45–47,99–106`, `providerOperationsService.ts:20–27,37–59`. Logical stage attempts omit internal transport resends; successful stage token totals omit earlier uncertain work. Admission-disabled mode has no admission/provider event. Pipeline aggregate covers 014 only; provider SQL timing includes settlement; p50/p99/browser visibility and complete billing fields absent.
- **Root cause/impact:** multiple overlapping clocks/counters; successes can mask retry cost and denominator excludes other flows. Historical capture contains two hint1 HTTP 503s; cannot extrapolate a global success rate or claim no failures after ja1.
- **Smallest correction:** per-transport correlation/stage/ordinal and known-vs-unknown usage independent of limiter flag; explicit server/user clocks and flow labels; retain null costs until verified pricing/usage are available.
- **Regression risk/verification:** low for sanitized metadata; test retries/failures/stream completion/redaction and count actual sends. **Effort:** 1–2 days.

## I14 — Scheduled roster not accepted

- **Affected/location/evidence:** `rosterWorkerService.ts:15–83`, `stagingRosterClaimService.ts`, `cloudRunServer.ts:40–46,118–129`; historical Scheduler PAUSED. OFFLINE tests cover claims/signatures/OIDC/scope; manual synthetic lifecycle passes historically.
- **Root cause/impact:** operation/delivery remains unproven; staging API route is fixture-specific, generic worker has a different schedule/claim path. Stale roster may retain/remove access later than expected. Current Scheduler state unknown.
- **Smallest correction:** read current target/audience/state and source approval; separately authorized end-to-end delivery/owned add-update-omission run with rollback and failure replay. Do not unpause or sync under this audit.
- **Regression risk/verification:** medium data/source ownership risk. Verify complete snapshots only, manual preservation, shared-source ownership and effective learner revocation. **Effort:** 0.5–1.5 days plus access.

## I15 — Important integrations still lack user acceptance

- **Affected/location/evidence:** `WorkshopMessaging.tsx`, `workshopSupportService.ts`, dispatcher library/SOP actions; release reports for messaging/hint inline explicitly say browser acceptance pending. SOP live evidence covers synthetic TXT, not every supported format; library evidence covers personal saves plus offline approval rules.
- **Root cause/impact:** successful deployment/SSR/API-negative checks were insufficient to detect the earlier invisible-message bug. Teacher requests may be saved without proving the intended learner sees/acts on them; peers and real documents remain unverified, not proven broken.
- **Smallest correction:** bounded role-based acceptance: trainer send/learner receipt/non-target denial/ack; learner hint request/review/history; author→Head→peer; one representative file of each claimed format including failure/retry. Reuse existing cases rather than create a parallel framework.
- **Regression risk/verification:** low for read-only existing evidence; mutating live acceptance needs explicit scope/accounts/data approval. **Effort:** 1–2 days.

## I16 — Misleading access-denied UI/onboarding choices

- **Affected/location/evidence:** `ProductionApp.tsx:87`; `ProductionEntry3.tsx:19`; `productionServerService.ts:116–127`. Snapshot 403 clears state and navigates UI03; UI03 defaults to unlisted_roster_email. Tracker records Head denied for foreign classId despite valid profile/grants. Department choices come only from accessible client classes.
- **Root cause/impact:** denial categories collapsed; URL scope error appears like bad identity; an unenrolled user can see empty department choices. Causes avoidable support/grant changes and onboarding confusion. Current UI behavior inferred from code plus historical incident.
- **Smallest correction:** propagate stable denial code and offer authorized class selection; distinguish unrostered email, forbidden class/view and service outage. Decide department-list business source before broadening visibility.
- **Regression risk/verification:** low. Browser stale class URL across all roles, unlisted user, empty assignments and backend outage; no privilege escalation. **Effort:** 0.5–1 day.

## I17 — Stale state/architecture docs and migration provenance

- **Affected/location/evidence:** canonical `docs/01_CURRENT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/05_OPEN_ISSUES.md`, `docs/evidence/TEST_LOG_GAP_REVIEW_2026-10-23.md`; `scripts/render_gcp_config.mjs:26–30`; two 006 files. Some docs still say no SSE/Cloud Tasks/global limiter code or sequential Supervisor, and show earlier serving revisions. Later tracker/result reports contradict those details.
- **Root cause/impact:** append-only state from several sessions; applied migration identity is not reconciled by a bootstrap chain. Operators could use obsolete rollback targets, skip candidate migrations or replay applied files. Duplicate historical prefixes alone do not prove either migration is missing.
- **Smallest correction:** after authorized runtime readback, update canonical state once with source/evidence date, flag/schema matrix and current rollback proof; record applied filenames/hashes. Preserve history and both applied 006 files. Audit changes are restricted to these reports.
- **Regression risk/verification:** low for documentation; live schema apply remains high-impact and separate. Cross-check links, actual service and schema identities; never infer applied migrations from largest number. **Effort:** 0.5–1 day.

## I18 — Maintenance and frontend payload debt

- **Affected/location/evidence:** known Workspace/V7 cycle; production build contains >500KB chunks (ProductionApp ~1,122KB, exceljs ~940KB, prototype RebuildApp ~616KB minified in this audit build). `supabaseClient.ts`, legacy API/Vercel tools, prototype code and historical schema still have maintenance/test/dynamic uses. `noUnusedLocals/Parameters` false; lint is architecture-focused, not comprehensive semantic lint.
- **Root cause/impact:** accumulated compatibility surface and monolithic UI increase review and first-load cost; emitted bundle size does not mean all chunks load initially. No current unused-code deletion has been justified.
- **Smallest correction:** separately review entrypoints/dynamic imports/scripts/Docker/history, remove the type-only cycle, measure actual production network waterfall, and split expensive feature imports where useful. Retain required maintenance dependencies; do not delete from Knip/filenames alone.
- **Regression risk/verification:** medium if entrypoints are removed, low for isolated type import/route loading changes. Boundaries/build/smoke plus affected UI/maintenance contracts. **Effort:** 1–3 days, after production blockers.
