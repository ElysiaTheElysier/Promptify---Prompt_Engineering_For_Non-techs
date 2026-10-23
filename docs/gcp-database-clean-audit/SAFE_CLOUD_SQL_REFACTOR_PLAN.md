# Safe Cloud SQL refactor plan — approval gates, no execution

**Status:** REQUIRES APPROVAL for implementation/test mutations/IAM/DDL/cutover; current source findings VERIFIED STATIC, live catalog and staging parity NOT VERIFIED. The completed work is audit/proposal only. This plan preserves all capabilities and 50 table identities. No source migration rewrite, code deployment, cloud mutation or production Phase 5 performed.

## Release rules

Separate platform migration, correctness fixes, indexing/performance and future embedding-model migration. Every change set has source/config hashes, scoped SQL diff, public contract manifest, fixture results, lock/data budget, release order and rollback command plan reviewed against actual catalog. New forward migrations only; applied history/rollbacks stay immutable. Never use historical lean B/C as acceptance criteria.

Not all bugs can be fixed while preserving their accidental behavior. Product/security owner approves the invariant and observable corrected cases before implementing F01/F06/F10/F12/N01 changes. Preserve intended workflows, IDs/history/security boundaries; no feature toggle or removal masquerading as cleanup. Known integrity/security flaws must be resolved and retested before claiming production DoD.

## Phases 0–5

| Phase | Concrete work after approvals | Exit evidence | Current status |
|---|---|---|---|
| 0 — Evidence | Read actual target catalog/active migration state, source/platform drift, owners/ACL/roles/policies/defaults/trigger state, function signatures, complete flags, installed extensions, region/maintenance/service identities and source scope | Signed source-vs-live-vs-target diff; all unknowns named; model/config/API contract manifest; no secret/PII in artifacts | Static completed; live access **NOT VERIFIED**, IAM denied |
| 1 — Correctness | F02 canonical/mixed keys; F07 binding guards and relation selector compatibility; F10 owner/claims/EXECUTE trust; F15 scoped closure; N01 exact generation evidence; N02 claim recovery. Resolve approved F01/F06/F12 expectations | Before failing case + after pass, no wider behavior drift, historical data exceptions preserved and reconciled | Proposal **REQUIRES APPROVAL** |
| 2 — Internal cleanup | Document canonical writable fields; remove only proven redundant internal operations after parity, preserve public wrappers/defaults/callers; reconcile handoff/template/config docs; retain every feature/mode/projection | Dependency/contract diff unchanged externally; all legacy readers supported; rollback build tested | Proposal **REQUIRES APPROVAL** |
| 3 — Performance | Measure plans/pool/locks/write amplification/vector latency; select index changes or branch-before-vector-read/identical-provenance dedup/coalescing with measured benefit | Representative workload before/after, authorization/retrieval/error/cost parity, reviewed write/storage/DDL budgets | **NOT VERIFIED**, no automatic index add |
| 4 — Cloud SQL staging | Isolated provision/config with full flag diff; approved extensions/IAM/model probes; production-shaped dry-run imports and forward DDL; pgTAP/PL/API/UI/pool/recovery tests | All suite results in regression plan; reconciliation/rollback/PITR drill; capability preservation including BQ/Firestore/Sheets/Drive | **NOT VERIFIED**, requires staging and budget |
| 5 — Production readiness | Review backups/PITR, release/compatibility window, worker replay, monitoring/cutover/rollback; execution only under separate explicit deployment approval | Signed go/no-go package with current catalog, release hashes, achieved RPO/RTO and known issue closure | **NOT EXECUTED**; no deployment authorization |

## Evidence package before implementation

Record project/instance/database IDs rather than assuming handbook values. Template uses dedicated PG18 `promptify_db`, current handbook conflicts with tier/database/model/migration order; correct documentation after approved source of truth. Include 004 in actual required target migration chain, do not apply commands from stale START_HERE blindly. `gcloud` IAM failure is not evidence that the project has no instances.

Live table count remains unknown. Source migrations 48 business tables, source-derived GCP baseline 49 including identity bindings, target after patches 50 with projection outbox. Store exact catalog/table list/relkind, not a guessed count. Compare native tbls live JSON only after authorized introspection; no synthetic adapters relabeled as live dump.

Freeze all 77 app routines, 43 actions, required compatibility API paths, 40 triggers, 76 policies, auth shims and external integrations. Capture installed extension versions/native embedding signatures, actual document/query model, 768 dimension, region and task-type provenance. The configured source uses `text-multilingual-embedding-002`; `text-embedding-004` in user/docs is not automatically the runtime model. Both current model lifecycle deadlines require an independently reviewed future migration, no silent swap.

Owner approvals needed: Studio global/class scope; department correction auto policy/course selection and roster reconciliation; instructor progress visibility; legacy/new score/completion/report semantics; export shared-entity scope; indexing recovery timing; default model/retrieval mode; compatibility path inventory; retained fields/retention. These are decision gates, not prerequisites for finishing this audit.

## Data preservation and scoped import

For every selected entity capture stable PKs, FK tuples, counts, canonical row hashes, JSON/numeric/date/timezone representations, vectors/model metadata, source object generations/checksums, audit/correction/roster/award history and memberships. Counts alone cannot prove preservation. R15 closure manifest lists inside-scope rows, legitimate shared parents and exceptional outside-scope rows with reasons. No auto-delete/dedup/reparent or cross-tenant closure simply to satisfy FK load.

Use a consistent approved export snapshot and documented ordering. Existing import USER trigger suppression can avoid side effects, but doesn't establish semantic guards, extension compatibility or outbox consistency. Isolated target integrity probes before enabling workers; projection backfill/replay produces current sink state while preserving original delivery/audit history. Files, Firebase subjects, IAM/Secrets and BQ/Firestore are separate state from SQL backup.

Preserve old threshold NULLs, issued award evidence, requested contribution document NULLs, old unknown claim outcomes and legacy outbox event history. Additive JSON fields do not fabricate old Generate inputs. Any historical repair needs a row-level reviewed manifest with immutable before evidence and reversible action, not cleanup SQL hiding anomalies.

## Selected change sets and release order

### F02 key repair

1. Deploy mixed-event-compatible consumer/backfill/key allowlist and tests first. It must accept canonical and old quoted metadata safely and quote an identifier once.
2. Reconcile legacy malformed/null-key events by original source/version/tombstone-aware process; no guessed position and no wholesale discard of pending events. Record old/new sink snapshots and delivery outcomes.
3. Apply reviewed short trigger rebind in [proposal SQL](CLEAN_DATABASE_PROPOSAL.md), then canonical metadata producer. Verify chunk insert/update/delete and worker replay on staging.
4. Rollback producer independently; mixed consumer remains compatible through the rollback window. Stop only the affected delivery attempt under reviewed recovery control, preserving durable events and UI fallback; do not retire a sink capability.

### F07 tuple guards

1. Validate current data and approve class/document/version invariant. Resolve anomalies by explicit preservation policy, not forced reassignment.
2. Release relation metadata/selector support for constraint-only guard FKs; current multiple-parent ambiguity must be solved before adding guards. Same nested JSON contract under both old/new catalog.
3. Outside a transaction, build two reviewed parent unique indexes concurrently. Check actual existing indexes first, session timeouts/capacity, `pg_index.indisready/indisvalid`; failed concurrent builds can leave invalid indexes and need separately reviewed cleanup/retry. Do not run blind `IF NOT EXISTS` and assume a valid equivalent index.
4. In a short lock-budgeted transaction add two NOT VALID FKs, keeping original FKs. New writes immediately checked; existing rows remain unproven until validation.
5. Separately validate each constraint with observed scan/lock/WAL budget; verify `convalidated` and R07 legal/illegal writes + nested reads. Proposed target 50 tables/104 FKs only after both validations.
6. Roll back only named new guards under reviewed lock budget if necessary; retain original constraints and data. Extra parent indexes may remain temporarily to avoid risky cleanup during incident. Reader supports both schemas. No removal of original FK/type/history.

Online index creation is not allowed inside BEGIN; NOT VALID/VALIDATE are different stages. Exact lock levels/scan costs depend on actual statement/version, measured on staging. [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html), [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html).

### N01/N02 evidence and recovery

N01: write additive actual-input/hash JSON first, Judge reader supports old rows, no forced backfill. Preserve current Generate request; approved switch to RAG-generated context would be a separate observable correctness change with benchmarks. Old build must tolerate unknown JSON fields; rollback reader/writer together after comparing before/after inputs and outputs.

N02: optional nullable timestamp first; mixed reader/recovery logic retains NULL legacy uncertainty. Atomic claim/time acquisition and matching claim/source/hash completion, known failure release vs unknown outcome reconciliation. Race/crash tests before enabling recovery. Keep new field on rollback until old/new writers quiesce; do not drop metadata or expire old claims blindly.

### F10 privileges and pooled trust

Collect actual owner, membership and ACL first; explicit least-privilege reviewed diff, no owner/BYPASS service shortcut, no blanket FORCE RLS/EXECUTE ALL. Verify runtime login capability separate from application trusted-backend authorization. Release compatible session-local claims/role handling and test cancellation/failure on real pool before any revoke. Preserve helper/RPC/default/trigger authorization with owned search_path; test recursion. Rollback restricted grants only to reviewed prior state, never grant broad access to bypass a failure.

IAM is a separate change package: Run SA vs SQL instance SA vs developer vs SQL roles. ML requires approved instance setting plus flag and SQL instance's prediction permission; inventory **all** existing flags before composing a full diff. No `patch --database-flags` here. Changing configuration can restart/disrupt connections and must be rehearsed. [Cloud SQL ML integration](https://docs.cloud.google.com/sql/docs/postgres/integrate-cloud-sql-with-vertex-ai), [flags](https://docs.cloud.google.com/sql/docs/postgres/flags).

## Lint and performance backlog interpretation

Actual source Squawk: 296 warnings across 62 history/target SQL files; actual tbls: 37 FK-index findings. Context matters: new empty baseline, legacy rollback, online populated DDL and unsupported concurrent transaction modes have different risk. No rewrite of applied files, no 37-index migration. Initial strict left-prefix audit's 56 candidates count differs by algorithm/granularity and is not a conflicting live result.

Select index additions/removal only from query pattern, parent delete/update requirements, lock/write/storage costs and actual plans. Generated vector conversion/HNSW in existing target 004 can be expensive on populated data; staging-sized rehearsal required before classifying safe. Measure embedding dedup exact provenance/task/error/quota behavior, retrieval mode branch cost and notification coalescing replay/lag. Keep all public functions and engines until redundant work is demonstrated through full parity, even if source reference count is zero.

## Rollback and recovery package

Every change is independently revertible through compatible readers/writers and forward repair where data was legitimately added. Record rollback triggers (unapproved response/scope drift, failed invariants, duplicate charges, projection loss, budget exhaustion), owner, command set, expected schema/config, evidence retention and maximum reconciliation window. Thresholds TBD from staging; don't invent availability/cost promises.

Restoring a backup/PITR snapshot can lose legitimate writes after restore time and cannot undo external provider charges/messages. Test PITR to a **new instance**, never overwrite production under this audit; reconcile post-snapshot SQL and sinks/files/auth mapping before any approved switch. [Cloud SQL PITR documentation](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/pitr). Source platform remains recoverable during platform cutover; don't dual-write both authoritative stores without a specifically approved conflict/ownership protocol.

Future model change keeps original vectors/index/model provenance until retrieval benchmarks and query/document dual-space routing pass; model change, provider deployment and cleanup not bundled. Persist external uncertainty rather than fabricate success. SQL restore alone is not full system recovery.

## Production readiness checklist — all unresolved until executed

- [ ] Actual live catalog/config/access drift resolved and documented.
- [ ] Intended behavior and reviewed bug corrections approved; all known integrity/security risks closed.
- [ ] Complete 16 UI / 43 action / 77 routine / 40 trigger / 76 policy coverage passes on actual Cloud SQL with real pool.
- [ ] Native ML signature/region/model/dimension/provenance and Vertex authorization work; pgvector/BQ/JS/private feature contracts preserved.
- [ ] Scoped import/reconciliation and file/history/auth/projection parity validated without data loss.
- [ ] Concurrent DDL/capacity/write amplification observed within approved budget; compatible release/rollback tested.
- [ ] Backup/PITR recovery drill measured, monitoring and worker replay idempotency proven.
- [ ] Separate explicit Phase 5 deployment/IAM/migration approval obtained.

Audit artifacts are complete when delivered; implementation DoD remains **NOT VERIFIED**. No box above is marked complete by a parser, lint output or an IAM-denied inventory attempt.
