# Database design issues — parity-preserving refactor

**Ngày:** 2026-10-13. All source findings below are **VERIFIED STATIC** unless qualified; all implementation/DDL is **REQUIRES APPROVAL**, all Cloud SQL behavior is **NOT VERIFIED**. No issue is marked resolved. Existing feature/APIs/names stay. Invalid/unsafe behavior cannot simultaneously be fixed and retained: approve exact corrected expectation while proving valid-flow parity; không tự coi observed bug là approved business rule.

## F01 — Studio class/global ownership

- **Root/source:** Studio PK `(class_id,lesson_id)` và expected revision riêng, nhưng [044 product_save_studio](../../supabase/migrations/044_product_atomic_policies.sql) updates global lessons, deletes/inserts global rubric. Hai lớp dùng course/lesson chung thấy global changes, revision của lớp kia không đổi.
- **Invariant:** Một edit có scope/owner rõ; no accidental cross-class revision/source mismatch; frozen prior run unchanged. “B không đổi” chỉ invariant nếu edit **được approved là class-local**, chưa có evidence final policy.
- **Minimal fix:** Preserve current shared-course behavior nếu đó là approved intent: explicit course-level authorization/revision and invalidate all affected classes, class config still separate. Nếu approved class overrides, store approved override fields in existing Studio JSON and resolve defaults consistently, không rewrite global lesson. **Không tự chọn hai cách này.** No new tables/API contract change required.
- **Impact:** UI04/05/08/11, create/save lesson, scheduled availability, rubric/evaluation, pass thresholds/awards, run snapshot, analytics and projection invalidation; class overrides must not omit fields from existing response.
- **Regression R01:** Two classes share lesson; instructor/editor/viewer/head cases; record global+both config/revisions before save. Assert after theo selected policy; previous snapshots/evaluation/certificates stable; concurrent expected revisions one winner; EN/VI authored text unchanged.
- **Migration/data:** JSON additive overrides/version metadata only if approved; no broad copy global lesson into every class, no generated seed replay. SQL outline in proposal. Existing historical class-specific intent cannot be guessed from one current global row.
- **Rollback:** Prior resolver/function version + compatible JSON, preserved pre-edit records; target writes require approved reverse mapping. No deleting class configs.

## F02 — SOP chunk outbox key and delivery repair

- **Root/source:** [002](../../apps/promptify-intrepid/gcp/sql/002_projection_outbox.sql) TG_ARGV contains `'"position"'`; [keys](../../apps/promptify-intrepid/src/services/cloudProjectionKeys.json) same string. JSON row has `position`. Worker/backfill wrap key in quotes again, producing malformed identifier; SELECT occurs even warehouse=false.
- **Invariant:** A committed chunk mutation yields routable event with canonical `(version_id,position)`, at-least-once consumers deliver exactly permitted final projection effects; no silent DLQ/authorization bypass.
- **Minimal fix:** Canonical key string `position` in trigger/key metadata/backfill. Quote SQL identifiers once after allowlist. Consumer accepts legacy quoted key through a narrow normalization adapter; for legacy null key **do not guess chunk position**, reconcile whole version using canonical current chunks and correct revision/tombstone, mark original event outcome with audit. Keep Firestore/BQ/search capability and event IDs.
- **Impact:** Trigger producer, CloudProjectionKeys, worker claim/SELECT/version refresh, backfill, BQ vector tombstone, current mode behavior and dashboards. SQL trigger diff provided separately; not sufficient without consumer/version repair path.
- **Regression R02:** Actual insert/update/delete, rollback emits no event; native canonical JSON key; legacy quoted/null events, reordered/replayed events, version revoke/binding change, retries/DLQ, migration-window mixed producer/consumer. Assert final warehouse rows and notices same permitted content.
- **Migration/data:** Update target trigger binding in short lock window; old events preserved, repair staged and reconcile, not blanket update/delete backlog. Native producer rollout after dual-compatible reader.
- **Rollback:** Old producer readable by compatible consumer; stop/retry affected deliveries with preserved leases/event IDs, no stale vector restoration. Never revert to known-failing consumer to satisfy rollback wording.

## F06 — authorization and approved correction

- **Root/source:** Current S13/050 explicitly auto approves same-client department transfer/log; selects active target, same course prioritized, fallback course allowed; new text department may create class without copying SOP. Course instructors are assigned by course; class/client access depends also domain/actor checks.
- **Invariant:** Preserve **approved auto approval**, exact target-selection/lifecycle behavior and history. Head/instructor rights never self-granted; no cross-client target, no unintended global role change. Existing same-client target SOP access follows approved workspace access, not a new hidden restriction.
- **Minimal fix:** One shared authorization predicate per existing capability, reuse it in API/RLS/RPC without changing allowed matrix. Document course-sharing and target selection; same-course-only restriction **requires separate approval**, không đưa vào cleanup. Add preflight/business tuple tests and accurate error/result handling.
- **Impact:** UI02/14/role-home, snapshots/default selected class, enrollment updates, country/roster metadata, Sheets sync, class creation, SOP access, reports/export. Current import **rejects removed/non-active memberships**, không tự re-add source; test potential batch-failure handling, không sửa hypothesis thành fact.
- **Regression R06:** Same client/different course, cross-client denial, same-course classes across clients, domain change, active/completed/removed source and target, repeat request after source removal, custom new class/no SOP clone, next Sheet sync, returned class/default snapshot.
- **Migration/data:** No new business constraint restricting approved correction; existing log IDs/old attempts remain. Any country/profile metadata correction is approved data task, not blanket backfill.
- **Rollback:** Compatible API/RPC version; preserve logs and resulting memberships; do not change back to pending or revive old active membership without approved inverse action.

## F07 — composite SOP integrity

- **Root/source:** Individual FK version/document/class IDs exist, but a binding can join a version of another document or document of another class through trusted/import writes. Public publish RPC checks course/class and locks document; backend bypass of semantic relation remains possible. New doc contribution can retain `document_id=NULL` because it records requested target; resulting document is derived through `version_id`.
- **Invariant:** Binding.version belongs Binding.document and document belongs Binding.class. Contribution requested-document semantics preserved; pending/new-document null not forcibly changed. Learner/class/lesson tuples validated without deleting post-enrollment history.
- **Minimal fix:** Preflight all bindings, add **two composite FKs** after concurrent parent unique indexes + NOT VALID/VALIDATE, keep old FKs. Leave contribution null semantics; validate nonnull requested target against resulting version only after policy/mismatch evidence. Candidate unique `rebuild_runs.attempt_id` independent and data-gated, no automatic dedup.
- **Impact:** Publishers, binding/retrieval/citations, intake preview, export/import/manifests, SQL metadata and embedded select resolver. **New FK alongside old FK makes CloudQuery options.length >1** for same table pair: adapt relation selection/metadata before schema activation, or exclude constraint-only redundant paths from generated query metadata with explicit proof.
- **Regression R07:** Cross-doc/version and cross-class binding rejection, valid multiple lessons using same version, new contribution null target remains valid, version retarget preserves citation, imported history closure, unchanged embedded JSON shape, concurrent version numbers unique.
- **Migration/data:** Mismatches inventory; no automatic re-parent/delete. DDL proposal has preflight/lock/validate/rollback annotations; 50 tables retained, candidate FK count 102→104 only after approval.
- **Rollback:** Remove only added guard constraints/indexes when reviewed, existing IDs/old FKs stay. No destructive data rollback. Disable incompatible metadata release before reverting guard if needed.

## F10 — Cloud SQL roles/RLS/claims

- **Root/source:** Runtime role is NOINHERIT/NOBYPASSRLS but can SET authenticated/service_role. Source-derived target has broad explicit backend policies and 70 SECURITY DEFINER app functions; auth shims consume server-set GUCs. `lesson_progress` authenticated SELECT uses global is_instructor. Actual owner/ACL/FORCE flags unknown.
- **Invariant:** Normal application connection never owner/superuser/BYPASSRLS; verified Firebase identity → correct business actor; no claims leakage across concurrent/reused pool; approved admin/global and instructor/course/head/class permissions preserved.
- **Minimal fix:** Declare compatibility roles as ordinary custom PG roles, verify memberships/SET options; separate narrow actor reads, identity binding and trusted mutation/worker privileges as needed without reducing allowed endpoints. Definer functions owned by controlled NOLOGIN authority, explicit search_path/EXECUTE allowlists. Tighten direct progress read only against reviewed allowed access matrix, not ad-hoc deny all instructors. Don't blanket FORCE RLS leaf identity helpers before recursion/owner review.
- **Impact:** All actions/RPCs, nested SELECT, Firebase first login, worker, signed source access, governance/analytics. Rename private roles only with dual-compatible runtime; public names and valid returns unchanged.
- **Regression R10:** Actual non-owner SQL login, no JWT/no auth, cross-class actor/head/editor/viewer, direct table+RPC access, disallowed function execution, token revocation/email conflict, concurrent pool reuse success/failure/cancellation, definer-owner changes and helper recursion.
- **Migration/data:** ACL/owner/role changes only after before/after diff and function dependency tests. Source Supabase service semantics never assumed; GCP policies explicit and reviewed. No user ID remapping.
- **Rollback:** Previous reviewed ACL/role memberships/function owner manifests, compatible runtime connections; never fallback owner/BYPASSRLS for outage recovery.

## F12 — progress/completion/awards/reporting semantics

- **Root/source:** Legacy null threshold means generation can count complete; new attempts capture threshold and require valid score. Progress is monotonic best/status read model. Awards evaluate published lessons, attempt threshold, average+attendance and current Studio issuance config. Analytics uses progress; BQ current-row mirror differs in score null filtering; snapshot average limited 200 attempts.
- **Invariant:** Current approved legacy/new behavior preserved, old issued UUID/evidence immutable, repeated evaluation does not increment attempts_count, reports explain same metric/grain and cutoff where intended. No retroactive regrading or conflating practice completion with official mastery.
- **Minimal fix:** Name/document each existing metric and implement shared SQL semantics helpers retaining thresholds/history/return fields; explicit total vs limited snapshot fields additive only where backward compatible. Keep certificate refresh/eligibility side effects until caller/trigger parity proven. No silently remove “read performs award refresh”.
- **Impact:** UI04/07/09/12/11 awards, attendance RPC, Judge/update triggers, snapshot, PDF, SQL+BQ reports/projections.
- **Regression R12:** Null legacy threshold, pending score, pass/fail/re-evaluation, changed current threshold vs frozen threshold, empty/unpublished curriculum, required attendance, avg boundary, completed/removed memberships, stable issued evidence/UUID, date range/tz and truncated snapshot vs full reports, BQ delayed/reordered mirror.
- **Migration/data:** Read-only reconcile first; any rebuild of derived progress explicit scoped/reviewed. Preserve old attempt evaluation/threshold/award evidence and approved completion semantics.
- **Rollback:** Helper version/compatibility view + preserved read model backup; no certificate renumber/reissue or stale history rewrite.

## F15 — scoped export and reconciliation

- **Root/source:** Approved class roots followed by FK parent closure; global user corrections/budgets/tutorial can pull referenced classes/users/courses. Export halts when correction references outside class list, but approved expansion must be intentional. Import disables USER triggers, preserves FK but not all semantic tuples.
- **Invariant:** All required history preserved **within approved entity scope**; no hidden tenant expansion; own source identities/files/sequence/timestamps match exact imported rows. Shared source/MVP data remains untouched.
- **Minimal fix:** Dry-run closure manifest class/client/course/user/identity/file sets with reason edges and protected unscoped selections, approval hash pinned before actual export. Complete final closure revalidation for late-added children. Reconciliation includes semantic tuples and actual role access, not just count/hash. No “fix” by deleting external parent or omitting required history.
- **Impact:** Export/check/import/reconcile/file transfer, correction history, awards, snapshots, identity, outbox backfill. Pure source read transaction never paid embedding call.
- **Regression R15:** Shared course/user across clients, correction both classes, old lesson refs, deleted memberships/issued awards, unscoped optional data, new child FK after F07, Unicode/timestamp precision/numeric IDs, source version drift, no unapproved entities/files.
- **Migration/data:** Scope approval before movement; post-import role/data checks. Current migration owner credentials only target import, never normal application.
- **Rollback:** Source retained, immutable export custody/checksum; if target writes occurred, require reviewed delta/reverse mapping or preserve target; not just traffic switch to stale source.

## SP01 — private embedding work

- **Root/source:** Upload writes embedded chunks; generation reads whole owner-scoped content. No current private semantic consumer identified. This supports a redundant-work hypothesis, not permission to remove embedding capability/field.
- **Invariant:** Private upload/extraction/dedup/replay/restoration plus configured embedding feature and externally visible error/readiness behavior remain.
- **Minimal fix:** Keep current pipeline by default. Reuse identical embeddings only when content hash + approved model/version + dimensions + task/settings + provenance exactly match. Do not reuse upload vector as query vector with different task type. Skip a call only after proof it has no consumer/observable readiness/error/quota effect and explicit parity approval. Preserve stored vectors.
- **Impact:** Upload latency, budget counts/provider failures, chunks JSON, context selection, snapshots; no move into shared SOP corpus.
- **Regression RSP01:** Cold/hit/miss, model/task change, owner/class/lesson boundaries, provider failure semantics, chunk/page/content parity, independent private retrieval capability if any external consumer exists.
- **Migration/rollback:** No data/column deletion; cache provenance additive only after schema proposal review. Rollback recomputes same approved model, never relabel old vectors.

## SP02 — multiple retrieval implementations

- **Root/source:** JS cosine, pgvector SQL, BQ candidates+SQL recheck. searchSop loads full chunks/vectors before branch. Same configured mode/fallback paths have differing citation/model checks.
- **Invariant:** Keep all requested modes, authorized top-k/citations/full-context fallback, model-space boundaries, no unauthorized stale BQ content sent to provider.
- **Minimal fix:** Keep mode adapters and contracts; shared admissibility/citation assembly with identical outputs. Resolve branch before unnecessary full-vector loading, fetch canonical chunks only for relevant mode; exact-mode fixtures and tie-ordering before change. Don't select a new engine or delete fallback modes.
- **Impact:** UI08 searches, Generate RAG, Inspector indexed metadata, SOP publish/readiness, BQ projection, model call budgets.
- **Regression RSP02:** Same-mode before/after ranked keys/similarity tolerance/tie policy, authorized filters, stale/revoked versions, wrong model, zero vector, no results/outage fallback; real HNSW plan/recall separate from exact logical outputs.
- **Migration/rollback:** Query-only refactor initially, no reembed/model/index switch. Preserve old path behind reviewed rollout compatibility; no broad new service.

## SP03 — polling/Firestore/outbox overlap

- **Root/source:** 5s/15s polling plus class notices; many watched writes. Warehouse disabled still claims/selects events. No measured freshness/backlog. Notices and BQ side effects differ lifecycle/consumer.
- **Invariant:** Keep Firebase/Firestore notifications, polling outage fallback, BQ analytics/search delivery, delete/revoke/ordering/replay; authoritative permission reload on SQL.
- **Minimal fix:** Coalesce browser refresh while maintaining worst-case accepted freshness; coalesce same-entity projection work only with preserved per-consumer revisions/delete tombstones and success/retry status. Keep outbox events/history, don't ack BQ work as successful merely because mode temporarily false if activation relies on it; readiness/backfill contract explicit.
- **Impact:** UI09/05/12 response cadence, Firestore UID docs, BQ raw/vector mirrors, workers/Scheduler leases/DLQ, source/target cutover/backfill.
- **Regression RSP03:** Dropped notices, polling recovery, repeated/out-of-order updates, grants/domain revocation, BQ activation catch-up, partial consumer failure, source row delete/recreate and old version binding change; no missing final state.
- **Migration/rollback:** Consumer contract change needs before/after replay snapshot and existing backlog preservation; no deletion/drop. Rollback reader understands event shape and tombstones.

## N01 — actual provider context vs frozen evidence (new)

- **Root/source:** [rebuildRunService](../../apps/promptify-intrepid/src/services/rebuildRunService.ts) lines 55/67/80/99: const inputContext pre-RAG; mutate lesson.sample_input_context + freeze; Generate receives earlier const; Judge later uses snapshot sample context. Resource text also assembled into input variable rather than guaranteed exact Judge controlData.
- **Invariant:** Prompt/output evaluation must use exactly recorded approved input evidence actually used by generation; prior run remains unchanged. Keep retrieval execution/status/citations/model/config.
- **Minimal parity-first fix:** Store additive `actual_generation_context` + hash in snapshot before provider call; Judge uses it for new runs, legacy behavior fallback remains. **Do not automatically change provider input to RAG context** in cleanup; intended RAG content substitution is a separately approved correctness change with benchmark. Review system instruction/learner private input/resource text provenance together.
- **Impact:** Generate/Judge/RAG/snapshots/history/compare/governance/provider diagnostics; public RPC signatures/returns remain.
- **Regression RN01:** Intercept real staging request builder (no fabricated success): full context/hash equals saved exact text; resource + private upload + RAG/fallback cases; Judge evidence hash same; replay makes no new provider call; old snapshot doesn't silently reinterpret.
- **Migration/rollback:** JSON additive for future runs; existing snapshots not invented/backfilled. DB row size/PII access reviewed; no new table/model needed. Restore legacy reader for old version without deleting new evidence; approved fixed reader can stay.

## N02 — stuck indexing claim/recovery (new detail)

- **Root/source:** reviewSop obtains indexing_claim, calls provider, stores indexed_chunks; no lease timestamp and no acquired-claim cleanup after known provider failure. Next approve may report uncertainty permanently. Need distinguish truly failed vs outcome uncertain.
- **Invariant:** Single concurrent index producer, no duplicate paid work/publication, recoverability without dropping source/history.
- **Minimal fix:** Add nullable claim timestamp/owner metadata or audited scoped recovery RPC in existing contribution. Lease reclaim only after evidence/outcome classification; known failure may release owned claim, unknown outcome manual reconcile. SQL outline/test plan; no automatic TTL purge.
- **Impact:** UI11/13 approval/My Requests, source edits/hash/model, provider retries, atomic publish/rollback, outbox events.
- **Regression RN02:** Competing approvals, provider 429/timeout after ambiguous result, crash before/after chunks save, stale owned claim, source/model changed, replay published returns same version; no duplicate publication/call.
- **Migration/rollback:** Nullable additive metadata, preserve existing claims; no fabricated claimed_at for history. Reader compatibility first, no bulk reset. Rollback keeps claim records/audited resolution.

## N03 — GCP handoff/schema/model drift

VERIFIED STATIC: current create template dedicated-core/PG18 + ML setting/flag/custom SQL-SA predict role; START_HERE still micro tier, different DB name, Gemini embedding and omitted 004, mode descriptions differ. Minimal fix is one reviewed manifest per release, docs/scripts rendered from approved config; no provisioning/mode/model changes during cleanup. Regression: rendered-name/DDL-order/flag-map/model-version contract snapshots, native startup, real target SQL capability probes. Actual provision/access remains NOT VERIFIED; script/doc correction and any resource patch REQUIRES APPROVAL.

## Performance findings retained, not automatic fixes

F08/F09: native tbls 37 FK-index lints vs previous strict-prefix scan 56 FK candidates, plus at least 5 same-key index groups. Measure actual query pattern/plans/locks/WAL and constraint-owned indexes; no 37/56-index batch. Source-compatible optimization may preserve 50 tables and all functions. DDL locks/timeout/concurrent phases and rollback in [safe plan](SAFE_CLOUD_SQL_REFACTOR_PLAN.md).

## N04 — compatibility HTTP routes in native target

VERIFIED STATIC: source has `api/generate.ts`, `api/evaluate.ts`, `api/roster-worker.ts` compatibility entries; native CloudRunServer only routes public `/api/product` and private `/internal/roster`/`projections`, others 404. That is a **potential external contract gap**, not proof those legacy paths have active clients or should be exposed with weaker auth. Freeze current released endpoint manifest/consumers; if generate/evaluate routes are externally required, keep aliases through same validated services/response/status rules. Legacy signed worker vs private OIDC worker must preserve intended scheduler capability without exposing private trusted actions. Regression RN04: before/after actual native container route/method/body/auth/scope/timeout responses for every frozen endpoint. No route implementation changed here; actual active contract NOT VERIFIED, alias/retirement decision REQUIRES APPROVAL. Rollback via compatible routing release, no provider/key/schema change.
