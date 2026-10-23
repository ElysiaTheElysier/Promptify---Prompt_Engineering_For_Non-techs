# Promptify system audit — final handoff

Updated: 2026-10-23 (Asia/Ho_Chi_Minh). AUDIT ONLY. No fixes, cloud calls, deployment, migrations, commits or pushes authorized by this audit.

## Recovery completed

- Branch: `codex/two-app-isolation`. Extensive existing modified/deleted/untracked files, including the entire app; ownership cannot be inferred from Git status. Preserve all of them.
- Read `docs/README.md`, `docs/01_CURRENT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/05_OPEN_ISSUES.md`, newest handoff `docs/handoffs/HANDOFF_JUDGE_DEMO_CLAUDE_2026-10-23.md`, `AGENTS.md` and `CLAUDE.md`.
- No existing `docs/audits/` report set was present. Earlier audits live in `docs/database-audit-intrepid/`, `docs/gcp-database-clean-audit/`, `docs/repository-audit/` and dated evidence. No completed Claude full-system audit/checklist was located; do not invent one.
- Recovered shared tracker `C:/Users/Admin/AppData/Local/Temp/promptify-coordination/TRACKER.md`, Claude's `C:/Ki_OJT/_claude-work/coordination/JUDGE_ADMISSION_CONTRACT.md`, benchmark and already-integrated patch location. Do not reapply patch or copy that stale worktree.
- Claude completed local Judge B/C call reduction and mock tests. Codex integrated admission/fencing/recovery. These are joint work, not all Claude changes.
- Later tracker entries supersede the handoff: Claude reports safeguards/streaming (016), messaging and hint requests (017/018) deployed through `hint3-1023` / Hosting `e7f637fe`. These are historical operator claims pending evidence reconciliation, NOT a live read in this audit.
- Prior local result was 69 tests, later 73; current allowlist contains 73. Earlier docs claiming no SSE/access expiry/session cap are stale relative to current source.

## Supported evidence and remaining uncertainty

- CODE: candidate SQL-global admission (013), async Generation (014), Judge fencing (015), B/C strategies, safeguards/streaming and hint request sources exist.
- Historical OFFLINE/mock evidence: 100/100 fake-provider pipelines with p95 18.57s; not Firebase users, actual Cloud SQL, real Gemini or HTTP throughput. Monte Carlo Judge timings are assumptions.
- Historical LIVE reports: async Judge, manual synthetic roster lifecycle, synthetic SOP originals and saved learner scorecard. Real B/C quality equivalence and Judge-to-visible-five-scores <10s have not been established.
- Unknown: currently serving revision/configuration/schema, activation of candidate flags, current Scheduler/monitoring, representative document formats, cross-role browser acceptance and genuine multi-instance behavior.

## Progress checklist

- [x] Recover branch/tree, canonical documents, tracker and Claude patch provenance.
- [x] Identify completed local implementation vs unfinished acceptance; avoid re-running patch/paid benchmarks.
- [x] Reconcile dated evidence with present source and produce feature/action inventory.
- [x] Independently run safe local checks, retaining generated artifacts outside the existing working tree.
- [x] Review authorization, SQL/Firestore scope, jobs/concurrency, safeguards and request performance.
- [x] Write all seven consolidated audit reports with issue evidence, effort, dependencies and acceptance gates.
- [x] Final documentation links/tree preservation check (record result below).

## Blockers / operating boundaries

Do not run live scripts, provider probes, load tests, cloud commands or database mutations. No current runtime read has been performed. Historical access failures are not evidence of current IAM denial. `rg` is unavailable; use targeted Python/PowerShell reads. Standard `npm test` overwrites an existing evidence report and the certificate test creates output files; inspect and redirect generated artifacts before execution. Build output must likewise avoid overwriting existing `dist/`. No comparison with `main` is needed, so no fetch/comparison performed.

## Independent checks completed (current audit)

- lint / Dependency Cruiser PASS (174 modules, 559 dependencies; one known Workspace cycle warning); typecheck PASS; boundary negative tests PASS.
- Build PASS with output redirected to an OS temporary directory; existing dist retained. Known large-chunk warning remains.
- `npm test` unchanged allowlist: 72/73 initially; export test failed because the audit's artifact redirect intercepted writes but not its temporary-directory creation. Targeted rerun of unchanged `verify_cloud_export.mjs` with only temporary-directory redirection PASS. Thus all 73 allowlisted assertions passed across the run plus targeted rerun, not a single untouched 73/73 runner result. Existing output evidence report/certificate samples were not overwritten.
- HTTP smoke exit 1: Vite reports ready but localhost fetch never succeeds. Hosting and Cloud Run public health probes both ENOTFOUND. Current runtime readback remains BLOCKED.
- Additional no-provider in-memory probes: two budget checks at 49,000/50,000 both accepted, two 2,000-token settlements yield 53,000 (PGlite); an old in-flight charge after reset enters session 2; enabled safeguards allow missing schema; bounded mock pool of five service scopes plus nested actor acquisition produces one timeout. The pool reproduction is a deterministic pool model, not real multi-connection PostgreSQL.
- Recovered Claude's partial audit evidence at `apps/promptify-intrepid/outputs/audit-2026-10-23/`: short offline-check summary and seven-day runtime log capture. No complete system-audit report was found. Do not publish these raw files.
- Read historical result files for async Judge phase 3, safeguards, workshop messaging and hint inline release. These corroborate tracker history, but do not replace a new service/config/schema read. Judge historical observations: 43.0s and 131.4s worker duration, not population percentiles.

## Completed audit deliverables

1. [SYSTEM_INVENTORY.md](SYSTEM_INVENTORY.md): runtime/data/role/screen inventory, all 60 dispatcher actions, migration/flag reconciliation.
2. [FUNCTIONAL_AUDIT.md](FUNCTIONAL_AUDIT.md): bounded feature classifications, actual local checks and historical LIVE limits.
3. [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md): boundaries, RBAC/RLS, SQL/Firestore, jobs, recovery, deployment and production gates.
4. [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md): incident reconciliation, actual vs simulated timings, current parallel/retry path, admission/cost gaps and sub-10s benchmark design.
5. [ISSUES_REGISTER.md](ISSUES_REGISTER.md): 18 issues with severity/location/root cause/impact/correction/risk/verification/effort. Nine P1, eight P2 and one P3; no demonstrated P0.
6. [REMEDIATION_ROADMAP.md](REMEDIATION_ROADMAP.md): executive answers to all ten questions, ordered top ten, dependencies and release gates.
7. This handoff: recovery, evidence, resumption and audit boundaries.

## Additional confirmed findings and exact reproduction scope

- I01: current withServiceScope/sqlTransaction helpers, bounded five-slot mock pool. Barrier holds five service transactions before nested actor requests. At least one timeout; existing unit pool is unbounded. Not an actual Cloud SQL load test.
- I02: actual pg Pool, configured offline.invalid but never connected; listenerCount('error')=0, error event throws. Historical capture contains two idle connection termination errors. No assertion about current frequency/restart rate.
- I03: current safeguard helpers with enabled flags and missing schema permit budget/access. In-memory PGlite only.
- I04: actual session helper SQL on minimal equivalent session/charge tables in PGlite; concurrent preflights at49,000 allow two charges totaling53,000; delayed charge after reset attributed to session2. No provider call.
- I10: current createHintRequest against a deterministic mocked READ COMMITTED schedule: two transactions both see four pending, then insert distinct IDs → six. Real PostgreSQL two-connection confirmation pending.
- These probes were executed from stdin; no application/test source added. Session probe used equivalent minimal session tables, not a claim to execute the full live database. Existing full regression tests separately execute relevant baseline/migrations in PGlite.

## Claude findings independently reconciled

| Earlier statement | Current assessment |
| --- | --- |
| No global admission/async Generation/fencing code | Superseded: 013/014/015 + services/tests present. Live schema/flags still unconfirmed. |
| Supervisor then five Workers | Superseded: current Supervisor/workers start concurrently; A six normal logical Judge calls. |
| Judge first timeout12s, retry24s; max13calls/Run | Superseded by current remaining-deadline logic plus layered capacity/stage/task retry. No universal13-call claim. |
| No SSE/session/expiry/injection middleware | Superseded: current code + offline tests and historical safeguards LIVE report. New enforcement gaps identified; not blanket feature absence. |
| Broadcast/private hints invisible | Historical defect corroborated; current rendering/inbox/approval fix and local tests exist. Two-browser acceptance pending, not a current proven fail. |
| B/C ready because mock/simulation passes | Not accepted: format/contract tests pass; real labeled quality and request-to-UI latency absent. |
| Deployed revision ja1-1023 is current | Superseded historical reports/logs progress to hint3. Current traffic/config requires fresh read, not inferred from either record. |
| No5xx since async Judge | Earlier bounded observation only: later saved capture includes two hint1 HTTP503s. No denominator/filter-completeness proof for a service-wide failure rate. |

## Private evidence index (do not copy raw files)

All paths here are app-relative. Read only sanitized aggregates if continuing:

- `outputs/audit-2026-10-23/offline-checks.txt`: Claude's short73-test/lint/boundary/smoke summary.
- `outputs/audit-2026-10-23/run-logs-7d.json`:4,848 captured entries,17/10–23/10 08:15:43Z. Capture filtering/completeness not established. Sanitized counts: hint3 HTTP200=15,401=3,403=1,404=1,204=1; hint1 HTTP503=2. Logs are not full current-service readback or a benchmark dataset.
- `outputs/staging-release-2026-10-23-judge-async-p3/PHASE3_RESULT.md`: historical actual async Judge completion43.0/131.4s; generation29.9s; overlay/governance description.
- `outputs/staging-release-2026-10-23-test-log-gaps/LIVE_RESULT.md`: historical three streamed Runs,818 saved Generation tokens, two blocked injection requests, expiry enforcement; notes one Run above prior operator's two-Run budget. That history grants no live-test authorization in this audit.
- `outputs/staging-release-2026-10-23-workshop-messaging/RESULT.md`, `...hint-requests/RESULT.md`, `...hint-multi/RESULT.md`, `...hint-inline/RESULT.md`: release sequence, latest historical hint3/Hostinge7f637fe, browser acceptance pending.
- `outputs/admission-offline-pipeline-benchmark.json`, `outputs/admission-offline-benchmark.json`: previously measured mocks, not rerun as new live evidence.
- Dated public-safe evidence reused under `docs/evidence/` and `docs/STAGING_LIFECYCLE_LEARNER_ACCEPTANCE_2026-10-21.md`. No raw identities, learner prompts/output, secrets, signed URLs or governance metadata reproduced in audit reports.

## What remains unfinished and why

The repository-based audit and requested seven documents are complete. Current LIVE acceptance is not complete: terminal DNS fails; no authenticated browser/runtime read attempted in this audit. No cloud configuration, active revision/env/migration state, Scheduler, monitoring or permissions may be inferred from the latest historical report. Full real PostgreSQL concurrency, signed role browser workflows, restore/rollback, representative real source formats, and paid quality/capacity/tail-latency tests remain pending.

The original Claude full-system audit completion boundary cannot be reconstructed more precisely than the recovered artifacts: there was no complete system-audit checklist/report. Do not attribute all existing work to Claude or claim unseen areas were investigated. This pass inspected central entrypoints/contracts and targeted high-risk integrations; it is not line-by-line review of every source/dependency or a penetration test. No dependency vulnerability registry scan, live Firestore emulator test or authenticated app load was run.

## Resume safely

1. Read the roadmap/register first; do not repeat repository-wide recovery or reapply Claude patch.
2. If still audit-only, collect authorized read-only service/schema/config/queue/provenance evidence and append dated corrections to these same reports; avoid additional competing state documents.
3. Implementation, migration, deployment, IAM/billing/model/strategy/quota changes, live data mutation, paid/load tests and commit/push require separate explicit authorization. Existing old-session allowances recorded in tracker do not authorize them here.
4. Preserve all prior dirty/untracked files and sensitive output evidence. Standard build/test output was redirected to scratch; do not overwrite historical evidence to obtain a cleaner test summary.

**Assessment:** production sign-off withheld; no evidence establishes a sub-10s Judge SLO. Highest immediate reliability/correctness work is I01–I05; existing B/C offers a bounded future optimization behind a real quality gate.

## Final preservation/documentation check

Exactly the seven requested Markdown reports exist under `docs/audits/`; their relative Markdown links and code fences validate. Git remains on `codex/two-app-isolation`; status adds the untracked audit directory to the pre-existing dirty tree. No source/config/test/migration fix, commit, push, reset, clean, deployment, cloud mutation or paid request was performed.

Two snapshots taken during this audit matched across792 files under app `src/api/tests/scripts/gcp`, existing docs excluding `docs/audits`, and `.github`: aggregate SHA-256 `d7223437788e07350cec6d6802b80094619ef52e5c3abc27ffa30a218edf785b` (sorted path→file-hash JSON). This is a scoped preservation check between those snapshots, not a Git commit, full backup or proof of the serving image. Generated build/test artifacts went to OS scratch; existing dist and historical result/certificate files were not intentionally overwritten. No raw private evidence was copied into the deliverables.
