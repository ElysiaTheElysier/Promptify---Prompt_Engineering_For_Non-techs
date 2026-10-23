# Clean database proposal — giữ 50 bảng và 100% capabilities

**Status:** REQUIRES APPROVAL cho mọi design/SQL change; VERIFIED STATIC cho current evidence. Không migration đã apply, không production setup command. Đích Cloud SQL; Supabase là source/legacy, không target fallback. Giữ model/retrieval modes và all UI/API/RPC contract.

## Domain ownership, không đổi schema layout chỉ vì naming

| Domain | Responsibility / canonical authority | Giữ boundaries |
|---|---|---|
| Identity & Access | Firebase identity → stable SQL business UUID; verified actors, role/class/course/client/domain access | User/learner/mapping, course assignments và class grants riêng |
| Curriculum & Studio | Global course/module/lesson default; class config scope được chốt; each writable field một authority | Không blindly mirror global rubric và class JSON; giữ both representations với one owner/default/override policy |
| AI Runs & Evaluation | Request/uncertain provider outcome, immutable actual inputs, successful attempts, Judge claim, sandbox, drafts/library | No merge pending run/attempt/claim hoặc sandbox vào learner evidence |
| Learner Progress & Certification | Derived progress + support evidence; attendance fact; issued awards immutable | Preserve legacy completion/new threshold semantics và certificate history |
| Roster & Membership | Sheet source, scoped validated import, config/job/ledger, member lifecycle và approved correction | Country snapshot riêng đến có privilege/cardinality merge proof; no overwrite source Sheet |
| SOP & Semantic Retrieval | Intake pending → immutable published document/version → pinned binding → approved indexed chunks; private uploads owner-scoped | Shared/private corpus khác; retrieval models/modes preserved; citations/index readiness/provenance explicit |
| Workshop & Messaging | Session control, broadcast, private coaching, per-recipient receipt, attempt notes | Không generic mega-message/event table làm yếu privacy/lifecycle |
| Administration & Audit | Mutable budgets/config, lead workflow, rotation approvals/receipts, scoped admin audit | Keep all built features, including public/trial scope; no inactive-table retirement |
| Cloud Integration & Projections | Durable delivery → Firestore/BQ; SQL authority, per-consumer success/lag/replay/tombstones | Outbox khác audit; notices không cấp quyền; BQ analytical/index projection không authoritative |

Grouping là documentation/ownership. Tất cả existing `public.*` names giữ; không di chuyển qua 9 PostgreSQL schemas, không cross-app shared package. Detailed 50-table owners ở [ownership](DATA_OWNERSHIP_AND_INTEGRITY.md), full graph ở [dependencies](TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md).

**Decisions:** KEEP 50 physical table identities, MERGE = none selected. RESTRUCTURE nội bộ F01/F07/N01/N02 cần gates, không feature cancellation. Governance singleton/tutorial/enterprise lead cũng giữ contracts/history dù old reports nghi unused. Index cleanup/function helper consolidation chỉ sau actual references/behavior/plan parity.

## Contract freezes

- All 77 public app function signatures/argument defaults/return types được inventory, not only 38 literal `.rpc` names. Helpers/default/trigger callers, external SQL/admin/maintenance và old release readers phải kiểm.
- `/api/product` action payloads/validation/role scope/return JSON and status/request replay preserved. Generate/Judge model/settings/private context/citations unchanged trừ reviewed bug expectation.
- Stable UUIDs, learner codes, attempt numbers, request IDs, certificate IDs/evidence, SOP versions/citations, source file logical paths/checksums, roster corrections/history remain.
- Role names/auth shims may remain compatibility names; implementation is explicit generic PostgreSQL role/GUC policy. No normal app owner/BYPASSRLS.
- Feature modes/worker/delivery interfaces retained. Changing default activation/model/endpoints is separate release approval, không “schema cleanup”.

## Concrete SQL/migration diff proposals

Những đoạn sau là **review drafts**, không saved/app migration or applied commands. Diff nhỏ có thể parse nhưng chưa semantic/staging acceptance. Runtime reader/metadata compatibility phải đi trước any structural DDL. Online DDL tách nontransactional concurrent index phase khỏi transactional constraint/trigger phase. Lock/statement budgets ví dụ phải được owner duyệt theo measured workload, không universal SLA.

### P02 — canonical trigger key

```diff
- EXECUTE FUNCTION public.gcp_queue_projection('version_id','"position"');
+ EXECUTE FUNCTION public.gcp_queue_projection('version_id','position');
```

```sql
-- PROPOSAL ONLY: after mixed-event-compatible worker/keys/backfill release.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
DROP TRIGGER gcp_projection_product_sop_chunks ON public.product_sop_chunks;
CREATE TRIGGER gcp_projection_product_sop_chunks
AFTER INSERT OR UPDATE OR DELETE ON public.product_sop_chunks
FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('version_id','position');
COMMIT;
```

Không DROP table/data. Short trigger rebind preserves event production, nhưng block concurrent writes trong lock window; rollback retains mixed-event compatible consumer. Existing malformed/null event không sửa bằng guessed position. Whole-version reconcile/before-after sink snapshot + event outcome history required.

Internal metadata diff cùng issue:

```diff
- "product_sop_chunks": ["version_id", "\"position\""]
+ "product_sop_chunks": ["version_id", "position"]
```

Không chỉ sửa JSON là xong: quote once from allowlist, accept legacy key, verify delete/revoke/mode activation contract, no sink/event removal.

### P07 — binding tuple guard, không redesign history

Read-only preflight queries (chưa chạy):

```sql
SELECT b.class_id,b.lesson_id,b.document_id,b.version_id,
       d.class_id AS document_class,v.document_id AS version_document
FROM public.rebuild_sop_bindings b
JOIN public.rebuild_sop_documents d ON d.id=b.document_id
JOIN public.rebuild_sop_versions v ON v.id=b.version_id
WHERE b.class_id<>d.class_id OR b.document_id<>v.document_id;

SELECT attempt_id,count(*)
FROM public.rebuild_runs
WHERE attempt_id IS NOT NULL
GROUP BY attempt_id HAVING count(*)>1;
```

Nếu mismatch/duplicates có thật, dừng và phân tích business/data-preservation; không DELETE/reparent/dedup tự động. Contributions nullable requested document không tự chuyển thành produced-document FK; produced identity derives through version.

```sql
-- PROPOSAL ONLY: separate non-transactional online phase, not inside BEGIN.
-- Require existing-index inventory and reviewed timeouts on the DDL session.
CREATE UNIQUE INDEX CONCURRENTLY audit_sop_document_class_identity_uq
ON public.rebuild_sop_documents(class_id,id);
CREATE UNIQUE INDEX CONCURRENTLY audit_sop_version_document_identity_uq
ON public.rebuild_sop_versions(document_id,id);
```

Indexes enforce/reference tuples (not “every FK needs index”); document class prefix also fits actual class-scoped document reads. Parent IDs individually unique already, so extra index cost must be measured. Referenced nonpartial unique indexes meet generic PostgreSQL FK requirements; attach named UNIQUE constraints only if approved tooling requires, in separately budgeted lock phase.

```sql
-- PROPOSAL ONLY: parent unique indexes valid, mixed relation metadata tested.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.rebuild_sop_bindings
 ADD CONSTRAINT audit_binding_document_class_fk
 FOREIGN KEY (class_id,document_id)
 REFERENCES public.rebuild_sop_documents(class_id,id) NOT VALID;
ALTER TABLE public.rebuild_sop_bindings
 ADD CONSTRAINT audit_binding_version_document_fk
 FOREIGN KEY (document_id,version_id)
 REFERENCES public.rebuild_sop_versions(document_id,id) NOT VALID;
COMMIT;
```

```sql
-- PROPOSAL ONLY: independent measured validation phase; budget may differ.
ALTER TABLE public.rebuild_sop_bindings
 VALIDATE CONSTRAINT audit_binding_document_class_fk;
ALTER TABLE public.rebuild_sop_bindings
 VALIDATE CONSTRAINT audit_binding_version_document_fk;
```

NOT VALID does not allow new invalid writes, nhưng existing bad rows có thể còn đến validate; no claim full integrity before validation. Existing single-column FKs remain. **CloudQuery currently treats multiple same-parent relations as ambiguous**: generated selection metadata must distinguish canonical navigation from constraint-only guards, with unchanged embedded JSON result. This is a prerequisite, not automatic regeneration.

Optional `UNIQUE(rebuild_runs.attempt_id)` is only proposed after approved one-run/attempt cardinality + duplicate check. Không đưa vào selected 2-FK ERD count hoặc index-savings KPI. Current API `.single()` alone is not proof historical cardinality.

### PN02 — indexing lease metadata

```sql
-- PROPOSAL ONLY: nullable additive field; no invented historical timestamp.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.product_sop_contributions
 ADD COLUMN indexing_claimed_at timestamptz;
COMMIT;
```

Claim acquisition stores ID/time atomically, chunks completion must match claim/source/model hash, recovery distinguishes known failure/unknown outcome. Existing claims stay intact; timestamp NULL does not mean safe automatic reclaim. New recovery RPC/signature would require API addition approval; prefer preserving existing public approve contract and reviewed internal helper. Retention/recovery parameters TBD; no automatic purge/lease expiry policy in draft.

### PN01 — exact generation evidence, no model/retrieval swap

```diff
  snapshot.retrieval = existing approved evidence
+ snapshot.actual_generation_context = exact_input_sent_to_generate
+ snapshot.actual_generation_context_hash = approved_hash(exact_input_sent_to_generate)
- judge.controlData = snapshot.sample_input_context
+ judge.controlData = snapshot.actual_generation_context ?? snapshot.sample_input_context
```

Đây là internal JSON contract outline, không new DB table/column migration. Before/after response/PII access checked; no backfill fabricated context for old runs. Existing immutable historical evidence retained. Changing Generate to consume newly assembled RAG text is separate correctness approval, because current outputs/context can change; không làm âm thầm trong cleanup.

### P01 — Studio alternatives require scope approval

Class-local option (nếu approved) dùng existing Studio JSON, không table mới:

```sql
-- Expression proposal only; field allowlist/null semantics must be specified.
SELECT l.id,
       CASE WHEN s.config ? 'lesson_overrides'
            AND (s.config->'lesson_overrides') ? 'title'
            THEN s.config#>>'{lesson_overrides,title}' ELSE l.title END AS title
FROM public.lessons l
LEFT JOIN public.product_studio s
 ON s.lesson_id=l.id AND s.class_id=$1;
```

Không dùng blanket coalesce nếu NULL/empty override có business meaning; same resolver for authored bilingual text/rubric/snapshot/reports. Global-edit option giữ global lesson update, nhưng revision/change propagation và authorization rõ cho shared course. Không publish either option until R01 expectations approved.

### P10 — runtime privilege review, không runnable broad role patch

Actual read-only evidence queries:

```sql
SELECT rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin
FROM pg_roles WHERE rolname IN ('promptify_runtime','authenticated','service_role');
SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p');
SELECT p.oid::regprocedure AS signature,pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef,p.proconfig,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f';
```

No wildcard `GRANT EXECUTE ALL`/owner/BYPASS shortcut proposed. Owner/ACL diff generated from actual stage, preserve explicit public signatures and authorized callers. If approved least-privilege table/RPC roles differ, release compatible role switching and tests before revoke; no hardcoded Cloud Run IAM→PG role equivalence.

## DDL safety interpretation

Online indexes outside transaction, verify pg_index.indisvalid/indisready and duplicate-build cleanup; short metadata changes may wait on long transactions. FK validation still scans/locks and writes WAL; timing budget observed. Generated vector column in existing 004 can rewrite table/build HNSW and needs its own staging rehearsal; **not modified here**. Ordinary fresh-empty baseline index creation is different from online refactor. [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html), [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html).

All SQL lint warnings contextualize draft, not suppress globally. No live model/extension/flags/IAM change or applied migration rewrite. Selected structural target after approval: **50 tables, 104 FK (candidate), claim timestamp optional; all original data and contracts preserved**. Without those approvals, before/after graph remains 50/102 and only proposal exists.
