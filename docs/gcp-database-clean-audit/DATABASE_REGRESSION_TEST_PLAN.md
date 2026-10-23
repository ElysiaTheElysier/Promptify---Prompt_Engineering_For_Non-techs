# Database regression test plan — Cloud SQL, before/after

**Status:** plan/templates REQUIRES APPROVAL; actual database/API/pgTAP/plpgsql_check results **NOT VERIFIED**. No staging connection, synthetic fixture authorization or paid-provider test budget was available. No tests below were executed against a database. Static parsing/lint is reported separately and cannot substitute for these tests.

## Acceptance method

Freeze the released Intrepid build, configuration, all UI00–15 flows, 43 product actions, 77 app function signatures/defaults/results, 40 triggers, 76 policies, auth shims and workers. The [feature matrix](FEATURE_PARITY_MATRIX.md) is the coverage contract; [dependency register](TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md) supplies the exact object definitions. Extension-owned functions have a separate compatibility manifest. Do not treat all 77 app routines as publicly callable APIs.

Use two isolated Cloud SQL staging databases/instances: **before** at the approved current target, **after** with only reviewed clean changes. Same synthetic identities, course/client/class scopes, models/settings, file objects, feature flags and fixture hashes. Read-only production evidence may identify representative shapes but must not be copied as unrestricted learner/private content. Capture request, actor, returned payload/status, SQL changes, outbox messages and external side effects for both. Deterministic fields compare exactly; provider output text is stochastic, so compare approved request/response contracts, provenance, score validation and retrieval benchmarks rather than requiring byte-identical AI prose.

Known bugs are recorded as baseline failures. Each proposed correction requires a signed expected invariant, including permitted differences from before behavior; don't silently change expectations to make tests pass. No feature omission, HTTP 200-only assertion or mock-only pass counts as parity. A failing security test blocks rollout even when old behavior also fails.

## Required environment and fixture manifest

- Actual Cloud SQL instance/version/maintenance, installed extension versions/signatures, complete flags, ML instance setting, region, network and four identity classes recorded. No `CREATE EXTENSION` on production; approved staging extension namespace must be supplied to tests.
- Non-owner/non-BYPASSRLS runtime login, real pool settings, authenticated and trusted-backend role switching; actual SECURITY DEFINER owners/search_path/EXECUTE ACL manifest. Tests must authenticate like deployed API, not solely `SET ROLE` as an owner.
- Two clients, two courses per client, two classes sharing one course, a different-course department target, Head/Trainer assigned and unassigned, enrolled/removed learners, public Basic, trial, pending/approved legacy corrections, Firebase subject conflicts and expired/revoked token cases. Include country fields, roster country snapshots and legitimate shared global users.
- SOP tuples valid/invalid across class/document/version, unpublished/revoked bindings, multi-page sources, private owner A/B, same text under distinct models/task types, vectors with approved dimension, empty corpus, legacy malformed outbox keys, failed/in-flight claims and projection tombstones.
- Legacy null-threshold attempts, captured-threshold attempts, weighted score boundaries, attendance/clearance, already-issued certificates, changed Studio revisions, capped report windows, old request replay and conflicting bodies.
- Isolated GCS/Firestore/BQ destinations, Sheets/Drive files and Scheduler endpoints. Exact model/cost limits and retry caps approved before real embedding/Generate/Judge probes. No production secrets in golden artifacts.

ROLLBACK only undoes database transactional effects: sequences, Vertex calls, storage writes and delivered messages need isolated destinations and explicit reconciliation. Never run repository live scripts or all tests by glob. Select explicit reviewed suites; existing offline fixtures remain static contracts, not Cloud SQL proof.

## Business and security suites

All suite outcomes below are **NOT VERIFIED**. Every suite has before/after assertions, failure injection and preserved history checks; proposed mutations require approval.

| Suite | Before/after executable scenario | Acceptance evidence |
|---|---|---|
| R00 — complete contracts | Inventory every app routine/overload/default/result/volatility/SECURITY DEFINER/search_path/owner/ACL, table constraints/indexes, enabled triggers/order/policies/default expressions; execute authorized and denied entry points using fixtures | No removed callable contract or unintended grant. All 77 routines assigned below; 40 triggers exercised by their writes, not just catalog counts; 76 policies mapped to applicable command and role |
| R01 — Studio scope F01 | Edit lesson and rubric in class A; read class B sharing course via snapshot, new run, Judge, reports and published SOP. Repeat with conflicting revision and unauthorized Trainer | Product owner chooses explicit global-edit or class-local expectation. Preserve bilingual content/config/sandbox/awards; prove revision propagation or override resolution. No chosen scope yet; source leak alone doesn't approve a new scope |
| R02 — chunk key F02 | Insert/update/delete positions 0/1 for one version, multiple versions, replay new and legacy quoted-key events; invoke backfill with canonical metadata; inject delivery failure | Correct primary key, valid bound SQL, no loss/duplicate final state/tombstone. Old null key requires whole-version reconciliation, never guessed position; actual affected legacy event history preserved |
| R03 — runs/Judge/quotas | Concurrent same request + different request; same body replay vs conflicting body; timeout after provider returns before commit; duplicate Judge; invalid evaluation; ended/frozen session; public Basic cap | One logical run/claim and permitted charge, stable attempt/request IDs, frozen evidence, correct budget boundary, uncertain outcomes recover without invented output or double payment |
| R06 — authorization/correction/roster F06 | Same-client same-course and different-course department targets, cross-client denied targets, auto-approved S13 and legacy pending request; correction replay; sync old sheet after removed membership; retry failed batch | Preserve current approved auto flow and course-selection priority (not invent a same-course-only filter). Record old/new class/history; imported non-active conflict isn't silently re-added. Failed batch and reconciliation must be visible; newly created class doesn't promise copied SOP/config |
| R07 — SOP tuple F07 | Publish new/existing document, pin version, cross-class document, wrong-document version, update binding; pending requested document NULL; inspect nested CloudQuery reads before/after two guard FKs | Valid workflows unchanged; invalid binding tuple rejected after approved guards. Existing single-column FKs kept; relation selection doesn't become ambiguous; JSON aliases/cardinality and returned citations unchanged; contribution requested-vs-produced identities preserved |
| R10 — runtime RLS/pool F10 | Real concurrent pool requests for A/B/admin/failure/transaction cancellation; repeat same physical connection after exception; direct SQL and each authorized/denied RPC; relation owner/helper recursion; Firebase mapping collision | No claims/role leakage; runtime isn't owner/super/BYPASS. Trusted backend role entered only through vetted service authorization. Test global instructor progress visibility against approved policy; existing source DML revocations considered. No blanket FORCE RLS breaking helpers |
| R12 — progress/awards/reporting F12 | Legacy null threshold generation, new captured threshold below/at/above pass, re-Judge lower score, threshold/rubric edits, attended/not attended, issued award after later changes; SQL/BQ reports across date/cap | Legacy/current completion contracts, monotonic progress and stable historical award evidence retained; max/last/average denominators and capped snapshots explicitly compared. Preserve eligibility/refresh behavior, not only aggregate row counts |
| R15 — scoped export F15 | Dry-run scope on two clients with shared users, outside-client corrections/grants/budgets/tutorial; list selected rows and complete FK parent closure; import into isolated target with preserved IDs/files | Explicitly approved entity scope; no accidental outside-client learner/private data. Export/import counts plus hashes/relationships/timezones/JSON/vector/source checksums reconcile. USER trigger suppression doesn't waive FKs/semantic validation; no automatic reparent/delete |
| RSP01 — private embeddings | Upload same/different content, owner B read, model/task/chunk/source changes, extraction failure and partial embeddings; exact-provenance retry | Private embedding capability and errors/readiness/quota contract preserved despite current Generate reading full content. No disabled pipeline. Dedup saves only proven identical work and retains metadata/history |
| RSP02 — all retrieval modes | Same admitted corpus through JS/SQL-pgvector/BQ, model mismatch, no vector, revoked binding, authorization change, citations/source download and fallback | Preserve configured/default modes and provider/model. Recall/order differences measured with approved acceptance; exact authorization/version/citation correctness required. Branch optimization tested without broadening corpus |
| RSP03 — delivery/freshness | Concurrent projection writes, consumer unavailable, Firestore success/BQ failure, replay/delete/revoke, worker crash before/after acknowledgement; live polling and reconnect | Per-consumer durable progress, bounded approved lag, no lost revoke/tombstone, idempotent final sink and fallback UI refresh. BQ disabled config retains capability; coalescing only after observable parity |
| RN01 — actual generation evidence | Spy approved provider request in staging; compare exact Generate input with persisted actual context/hash and subsequent Judge input; old rows without new JSON fields | New Judge uses actual sent context; historical fallback doesn't fabricate evidence. Default Generate input/model/retrieval unchanged unless separately approved correction; hidden UI fields do not leak private text |
| RN02 — ingestion claim recovery | Known provider error vs unknown outcome/crash; competing approval; old timestamp NULL claim; retry with changed source/model | No stuck known-failed claim, no concurrent/double publish or careless reclaim. Source/hash/claim ownership enforced; legacy unknown state requires reconciliation, not arbitrary expiration |
| RN04 — HTTP compatibility | Request released `/api/product`, `/api/generate`, `/api/evaluate`, required roster-worker compatibility path and internal authenticated worker endpoints on real native Cloud Run router | Freeze required released path/payload/status/auth contracts; current router gap measured. Preserve required behavior via vetted services; never publicly expose a private worker through weaker legacy authorization |

R00 also covers workshop inbox/receipt/read status, private hint/attempt note, session control, prompt-library moderation/replay, learner drafts/support/reflections, domain/rotation approvals and application evidence, sandbox isolation, public/trial enrollment, enterprise lead, tutorial state and roster country data. Each action's detailed acceptance is in [feature matrix](FEATURE_PARITY_MATRIX.md). Missing UI or background coverage blocks acceptance even if database suites pass.

## pgTAP executable templates — not executed

The examples assume approved pgTAP installed in `public`; discover and schema-qualify its actual namespace first. [pgTAP documentation](https://pgtap.org/documentation.html) defines assertions and TAP results. A transaction is useful for DB-only synthetic fixtures, not isolation from paid/external effects. Run with a TAP-aware runner and require zero failed assertions, an exact plan, and retained output. Do not use these six examples as the entire regression suite.

### Catalog/embedding prerequisite probe

```sql
BEGIN;
SELECT public.plan(6);
SELECT public.has_table('public','rebuild_sop_bindings','SOP binding retained');
SELECT public.has_table('public','gcp_projection_outbox','Durable projections retained');
SELECT public.ok(EXISTS(SELECT 1 FROM pg_extension WHERE extname='vector'),
                 'pgvector is installed on this staging database');
SELECT public.ok(EXISTS(SELECT 1 FROM pg_extension WHERE extname='google_ml_integration'),
                 'Cloud SQL ML extension installed');
SELECT public.col_type_is('public','product_sop_chunks','embedding_vector',
                         'vector(768)','Current dimension contract retained');
SELECT public.ok(EXISTS(
 SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='intrepid_embed_text'
 AND pg_get_function_identity_arguments(p.oid)='p_text text'
), 'Embedding wrapper signature present; provider success requires separate probe');
SELECT * FROM public.finish();
ROLLBACK;
```

Extension namespace/search_path can affect displayed type names and the wrapper identity argument may vary with deployed version: freeze actual expected catalog, don't silently loosen a failed assertion. No provider call in this catalog probe. The signature is checked against source target in static verification, not claimed deployed.

### F02 trigger argument regression

```sql
BEGIN;
SELECT public.plan(3);
SELECT public.is(
 (SELECT encode(tgargs,'escape') FROM pg_trigger
  WHERE tgrelid='public.product_sop_chunks'::regclass
    AND tgname='gcp_projection_product_sop_chunks' AND NOT tgisinternal),
 E'version_id\\000position\\000',
 'Canonical composite key names, each NUL terminated');
SELECT public.ok(jsonb_build_object('position',0) ? 'position',
                 'JSON row exposes unquoted field name');
SELECT public.ok(NOT (jsonb_build_object('position',0) ? '"position"'),
                 'Literal quote characters are a different JSON key');
SELECT * FROM public.finish();
ROLLBACK;
```

The first assertion is expected to fail on the current source target's malformed argument; that is a regression baseline, not a tool execution result. A fixture-driven DML test must additionally check the emitted event, actual worker bound query/backfill and delete delivery. Catalog-only correctness doesn't establish all F02 paths.

### F07 approved constraint validation probe

```sql
BEGIN;
SELECT public.plan(2);
SELECT public.ok(EXISTS(
 SELECT 1 FROM pg_constraint
 WHERE conrelid='public.rebuild_sop_bindings'::regclass
   AND conname='audit_binding_document_class_fk' AND contype='f' AND convalidated
), 'Document/class guard fully validated after proposed change');
SELECT public.ok(EXISTS(
 SELECT 1 FROM pg_constraint
 WHERE conrelid='public.rebuild_sop_bindings'::regclass
   AND conname='audit_binding_version_document_fk' AND contype='f' AND convalidated
), 'Version/document guard fully validated after proposed change');
SELECT * FROM public.finish();
ROLLBACK;
```

These constraints do not exist in the current source target. Before assertions should record absence; after assertions apply only if approved and implemented. Add fixture-specific `lives_ok` for legal publish/bind/update and `throws_ok` with SQLSTATE `23503` for cross-class/wrong-document binds. Fixture UUIDs and column requirements must come from the frozen schema/approved seed; no pseudo INSERT claiming executable acceptance.

### Role capability probe

```sql
BEGIN;
SELECT public.plan(3);
SELECT public.ok(NOT (SELECT rolsuper FROM pg_roles WHERE rolname='promptify_runtime'),
                 'Runtime is not superuser');
SELECT public.ok(NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname='promptify_runtime'),
                 'Runtime has no BYPASSRLS');
SELECT public.ok(NOT EXISTS(
 SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND pg_get_userbyid(c.relowner)='promptify_runtime'
), 'Runtime owns no business table');
SELECT * FROM public.finish();
ROLLBACK;
```

Check actual connection login and membership/SET ROLE capabilities separately. Passing these three assertions doesn't establish RLS effectiveness, SECURITY DEFINER safety or backend authorization. Owner-run fixtures are inadequate for R10. Prefer `pg_roles` capabilities and pgTAP `ok` to blanket role changes.

## PL/pgSQL analysis on approved staging

Discover installed `plpgsql_check` version/schema and supported signatures, then analyze all SQL-language routine contracts separately and all PL/pgSQL routines/trigger contexts with [plpgsql_check](https://github.com/okbob/plpgsql_check). PostgreSQL planner/privilege/trigger-time execution and dynamic SQL tests still required. Cloud SQL support is documented in [extension matrix](https://docs.cloud.google.com/sql/docs/postgres/extensions); availability is not installed proof. No Tracer assumption or production installation.

```sql
-- Read-only extension and routine discovery; unexecuted template.
SELECT e.extname,e.extversion,n.nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
WHERE e.extname IN ('plpgsql_check','pgtap','vector','google_ml_integration');
SELECT p.oid::regprocedure, l.lanname
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.prokind='f';
-- Only after confirming public extension schema + exact installed signature:
SELECT * FROM public.plpgsql_check_function_tb(
 'public.product_auto_correct_department(uuid,uuid,text,text,text)'::regprocedure);
-- Trigger check needs relation context; tgargs/dynamic branch tests separate.
SELECT * FROM public.plpgsql_check_function_tb(
 'public.gcp_queue_projection()'::regprocedure,
 'public.product_sop_chunks'::regclass);
```

Record unresolved relation/type/privilege/return-path diagnostics per routine. Trigger functions reused on multiple relations need each applicable relation/transition context, TG_ARGV and actual DML coverage; a context-free pass does not validate dynamic `FORMAT` SQL. Extension compatibility failure is NOT VERIFIED analysis, not proof app function is faulty.

## Performance, integration and recovery acceptance

Capture representative read/write plans, cardinality, p50/p95/p99, pool acquisition/active/queued connections, lock waits/deadlocks/long transactions, calls per operation, WAL/write amplification, outbox lag/retry, Vertex duration/errors/quotas/cost and vector recall/latency. Use reviewed `EXPLAIN` first; `EXPLAIN ANALYZE` executes queries and can mutate or call Vertex, so approve each measured statement on staging. Budget/SLAs are **TBD**, never invented production figures.

Exercise API maxScale 2 and worker maxScale 1 with pool max 5, plus deployment overlap/maintenance headroom. Current steady upper allocation ~15 connections doesn't establish actual DB capacity or safety under embedding latency. Verify synchronous SQL→Vertex budget vs 40s embed / 55s SQL / 60s HTTP source limits; cancellation and lost-response tests must not silently double-charge.

Round-trip fixed text through current native embedding wrapper with approved model/region/credentials; assert numeric finite 768-dimensional document/query space, task provenance, HNSW cosine usage and authorization. Keep JS/BQ modes and exact model config. Model retirement migration is independent, requires retrieval benchmark/dual provenance/rollback, not part of this cleanup.

Recovery drill restores backup/PITR to a **new isolated instance**, reattaches no production alias, checks identities/IDs/vector/JSON/file checksum relationships and replays outbox without duplicate side effects. [Cloud SQL PITR](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/pitr). Record RPO/RTO achieved, not just enabled flag. Restore plus post-check data reconciliation required for acceptance.

## Execution log state

| Evidence | Actual result this audit |
|---|---|
| Static source catalogs, native tbls documentation/ERD | VERIFIED STATIC; 50/77/40/76 inventory |
| Source Squawk lint | VERIFIED STATIC; 296 warnings on 62 explicit files, context reviewed |
| Source tbls lint | VERIFIED STATIC; 37 FK-index findings; workload confirmation pending |
| Draft SQL parser/lint | Offline artifact checks only; final result recorded in main report |
| pgTAP / PL checks / Cloud SQL integration / API or UI parity / actual pool | **NOT VERIFIED — not executed** |
| Real Vertex/provider costs / recovery/PITR / live export closure | **NOT VERIFIED — not executed** |

Every future test record must include build SHA/source hash, environment/config/role manifest, fixtures, approved expected difference, exact command, TAP/API artifacts, before result, after result and reviewer. This document is a runnable starting point and complete coverage plan, not evidence that 100% functionality was already proven.

## Per-routine suite assignment

Each entry additionally requires R00 signature/default/result/owner/ACL preservation and authorized/denied behavior. Trigger routines are invoked via actual triggering DML; helpers via direct allowed tests plus their callers. See dependency register for full definitions and callers. Outcomes for all entries: **NOT VERIFIED staging**.

| App routine | Suite in addition to R00 |
|---|---|
| `check_user_privilege_escalation` | R00/R10 |
| `current_user_id` | R00/R10 |
| `gcp_queue_projection` | R02/RSP03 |
| `generate_learner_code` | R00 |
| `has_active_class_enrollment` | R06/R10 |
| `has_active_course_enrollment` | R06/R10 |
| `intrepid_embed_text` | RSP01/RSP02 |
| `intrepid_search_sop` | R07/RSP02/R10 |
| `is_instructor` | R00/R10 |
| `legacy_valid_evaluation_total` | R12 |
| `lesson_belongs_to_class` | R06/R10 |
| `product_accept_worker_invocation` | R06/RSP03/R10 |
| `product_analytics` | R12 |
| `product_approve_rotation` | R00/R10 |
| `product_auto_correct_department` | R06/R10 |
| `product_awards_after_attempt` | R12 |
| `product_can_manage` | R00/R10 |
| `product_can_read_class` | R00/R10 |
| `product_can_read_course` | R00/R10 |
| `product_can_read_lesson` | R00/R10 |
| `product_can_read_user` | R00/R10 |
| `product_capture_attempt_threshold` | R12 |
| `product_claim_roster_sync` | R06/RSP03/R10 |
| `product_create_cohort` | R06/R10 |
| `product_create_lesson` | R01/R12 |
| `product_enroll_basic` | R06/R10 |
| `product_finish_roster_sync` | R06/RSP03/R10 |
| `product_finish_rotation` | R00/R10 |
| `product_guard_new_run` | R03/R10 |
| `product_import_roster` | R06/R10 |
| `product_limit_ai_run` | R03/R10 |
| `product_limit_basic_run` | R03/R10 |
| `product_publish_contribution` | R07/RN02/R10 |
| `product_record_attendance` | R12 |
| `product_refresh_awards` | R12 |
| `product_request_correction` | R06/R10 |
| `product_request_rotation` | R00/R10 |
| `product_save_class` | R06/R10 |
| `product_save_domain` | R06/R10 |
| `product_save_draft` | R00/R10 |
| `product_save_sheet` | R06/R10 |
| `product_save_studio` | R01/R12 |
| `product_session_control` | R00/R10 |
| `product_set_class_access` | R06/R10 |
| `product_set_sheet_auto_sync` | R06/R10 |
| `product_submit_enterprise_request` | R00/R10 |
| `product_take_budget` | R03/R10 |
| `product_unlock_support` | R00/R10 |
| `product_unlock_support_reflected` | R00/R10 |
| `product_validate_studio_config` | R01/R12 |
| `product_validate_studio_nested` | R01/R12 |
| `rebuild_ack_workshop_message` | R00/R10/RSP03 |
| `rebuild_begin_run` | R03/R10 |
| `rebuild_broadcast` | R00/R10/RSP03 |
| `rebuild_can_manage_class` | R00/R10 |
| `rebuild_can_teach` | R00/R10 |
| `rebuild_claim_judge` | R03/R10 |
| `rebuild_class_analytics` | R12 |
| `rebuild_class_attempts` | R00/R10 |
| `rebuild_class_sops` | R07/RSP02/R10 |
| `rebuild_confirm_profile` | R06/R10 |
| `rebuild_finish_judge` | R03/R10 |
| `rebuild_finish_run` | R03/R10 |
| `rebuild_import_roster` | R06/R10 |
| `rebuild_my_profile` | R06/R10 |
| `rebuild_publish_sop` | R07/RN02/R10 |
| `rebuild_record_trainer_action` | R00/R10 |
| `rebuild_save_evaluation` | R03/R10 |
| `rebuild_sop_lesson_options` | R07/RSP02/R10 |
| `rebuild_trainer_action_history` | R00/R10 |
| `rebuild_workshop_inbox` | R00/R10/RSP03 |
| `record_prompt_attempt_and_progress` | R12 |
| `self_enroll_public_class` | R06/R10 |
| `sync_lesson_progress_from_prompt_attempt` | R12 |
| `trigger_set_timestamp` | R00 |
| `update_prompt_attempt_evaluation_and_progress` | R12 |
| `valid_evaluation_total` | R12 |
