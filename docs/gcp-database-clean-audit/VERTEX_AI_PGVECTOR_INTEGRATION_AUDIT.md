# Vertex AI + pgvector integration audit

**Ngày:** 2026-10-13. Production target Cloud SQL. Source/docs facts **VERIFIED STATIC**; all installed/project/model invocations **NOT VERIFIED**; any setup/model/index/reembed change **REQUIRES APPROVAL**. Không đổi model/retrieval/provider trong audit.

## Current contracts detected, không suy từ ví dụ prompt

| Layer | Source fact | Status / consequence |
|---|---|---|
| Legacy/source chunks | product_sop_chunks.embedding JSONB, 768-length CHECK; default model gemini-embedding-001 | VERIFIED STATIC; actual row model/type/values unknown |
| Target 004 | Generated `embedding_vector vector(768)` từ JSONB; HNSW cosine; model default text-multilingual-embedding-002 | VERIFIED STATIC; table cast/index/extension install chưa chạy here |
| SQL embedding wrapper | intrepid_embed_text → **public.embedding('text-multilingual-embedding-002',p_text)**, validates length/cardinality | VERIFIED STATIC; actual installed overload/return/IAM/region unknown |
| Server SQL caller | embedThroughSql rejects model env khác text-multilingual-embedding-002; SET LOCAL statement timeout bounded; finite/nonzero 768 output | VERIFIED STATIC; live latency/rate/cost unknown |
| Direct Vertex/Gemini path | embedSopChunks model env/default gemini-embedding-001; taskType document/query passed to direct calls, 768 dimensions | VERIFIED STATIC; actual configured model/access unknown |
| CloudSQL branch | embedSopChunks uses embedThroughSql(chunk.content); taskType argument not forwarded by 2-arg native wrapper | VERIFIED STATIC; query/document task equivalence không assume |
| pgvector search | intrepid_search_sop class/lesson bindings authorization, model fixed text-multilingual-embedding-002, cosine top 10 | VERIFIED STATIC; plan/recall/region behavior unknown |
| BQ search/projection | model_id env/default + dimensions filter; SQL canonical content/current permissions rechecked | VERIFIED STATIC; SDK query/IAM/live warehouse unknown |
| JS similarity path | Computes cosine on loaded embedding values; model selection/provenance not carried through same consistent filter as SQL/BQ | VERIFIED STATIC mismatch candidate; query-space parity regression required |
| Approved model ID | Repo declarations/handbook disagree; request mentions text-embedding-004 as example, not code-selected current model | **NOT VERIFIED approval**; no replacement proposal silently selected |

**Release blocker:** 768 dimensions does not mean model space equivalence. Imports of Gemini vectors plus SQL query vectors from another model cannot be ranked together. Target 004 changes default/search predicate; old rows may remain historical model and return no matches until approved compatible index readiness. Không relabel old model or update old JSON vectors just to pass a search check.

## Official compatibility, checked in this audit

Native `embedding(model_id,text)` documentation returns `real[]`; versioned text-embedding-004/text-multilingual-embedding-002 examples and 768 storage contract are documented. `google_ml_integration` ≥1.2 for Vertex native models, ≥1.4.2 for custom/third-party model endpoint support. `vector` is SQL extension name. These are support references, not permission to run extension/model changes. [Cloud SQL embeddings](https://docs.cloud.google.com/sql/docs/postgres/generate-manage-vector-embeddings).

Registered endpoint path uses `google_ml.embedding(model_id => ..., content => ...)`; logical model_id is registered endpoint metadata, not automatic substitute for current public.embedding call. `ai.predict_embeddings` is **not assumed native Cloud SQL signature**. Exact pg_proc overload/result/schema and endpoint registration must be inventoried first. [Registered endpoint embeddings](https://docs.cloud.google.com/sql/docs/postgres/model-endpoint-embeddings).

As checked 13/10/2026, official lifecycle table lists text-embedding-004 and text-multilingual-embedding-002 retirement **01/04/2027**; gemini-embedding-001 no sooner than **20/05/2028**. Đây là planning risk cho current target declaration, **không đổi model trong cleanup**; region/access/endpoint của project chưa verified. [Model lifecycle](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions).

Region must be checked against approved instance/endpoint/model and organization data residency. `EMBEDDING_LOCATION` env is not proof SQL extension routes through that same endpoint: SQL wrapper doesn't pass location; platform integration controls route. [Model locations](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations). Không assume Singapore/global đều authorized hay model availability chỉ vì create template đặt region.

## Prerequisite chain và identities

Actual instance/project/PG major/maintenance/tier/flags/APIs/network/extensions/IAM đều NOT VERIFIED. Current source create template dedicated db-custom-2-8192/PG18/ML setting+flag; handbook micro tier/DB/model/order stale. Dedicated cores, PG12+ và maintenance readiness được Cloud SQL docs yêu cầu; both enableGoogleMlIntegration và cloudsql.enable_google_ml_integration phải checked separately. **Cloud SQL instance SA** needs Vertex predict rights, not Cloud Run SA token by implication. Canonical checklist ở [IAM](GCP_IAM_SETUP_CHECKLIST.md); không patch flags hoặc IAM here.

## Version-aware compatibility tests — chưa execute

Read-only catalog probe (không gọi Vertex):

```sql
SELECT extname,extversion,extnamespace::regnamespace AS schema
FROM pg_extension
WHERE extname IN ('vector','google_ml_integration','pgtap','plpgsql_check');
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS result,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE (n.nspname='public' AND p.proname IN ('embedding','intrepid_embed_text','intrepid_search_sop'))
   OR (n.nspname='google_ml' AND p.proname='embedding');
SELECT a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attgenerated
FROM pg_attribute a
WHERE a.attrelid='public.product_sop_chunks'::regclass
  AND a.attnum>0 AND NOT a.attisdropped;
```

Paid staging capability probe chỉ sau owner approves model/access/cost và SQL role:

```sql
-- PROPOSAL ONLY: model call costs/quota are external, ROLLBACK won't undo them.
BEGIN;
SET LOCAL ROLE service_role;
SET LOCAL statement_timeout='10s';
SELECT cardinality(public.intrepid_embed_text('Staging embedding contract probe.')) AS dimensions;
ROLLBACK;
```

service_role ở đây là current custom compatibility PG role với reviewed privileges, không managed Supabase authority. Check output exactly 768 finite/nonzero, record actual signature/version/model/latency/provider error. Also denial case missing SQL instance predict right or flag off in separately approved isolated configuration; **không tắt production IAM/flag để test**.

## Model/provenance integrity

1. Document/query embedding provenance = approved model ID/version + output dimensions + task settings + source content hash/chunking contract. Label can't come solely from mutable column default when input chunks were produced by another model.
2. Publisher current `product_publish_contribution` inserts embedding without explicit per-input model; target default changed in 004. Minimal future fix validates producer provenance against approved config and writes recorded model explicitly while keeping RPC args/public result backward compatible through reviewed JSON fields. Old callers/default behavior remain tested; no data relabel.
3. Generated vector column is derived projection, JSON embedding remains evidence. Validate numeric element types, finite/nonzero vectors and actual casting/cosine semantics before applying 004 to imported rows. CHECK array length alone not enough.
4. Private learner uploads stay owner/class/lesson scoped, not shared enterprise vector index. SP01 optimization only after exact task/model/provenance and readiness/error behavior parity. Keep embeddings capability and historical values.
5. Same approved model-space in all existing modes; common admissibility/citation assembly can reduce duplication but no engine architecture swap. Caught RAG failures still preserve authorized fallback/status/recorded inputs.

## Performance audit gates

Current SQL model call holds pool connection/transaction during external latency; code allows up to 40s embedding step, SQL default statement budget 55s, API request timeout 60s. Generate/Judge/provider work follows: total path can exhaust request budget; actual measurements missing. Measure pool acquisition, embedding time by chunks, remaining request deadline, statement cancellation/rollback, provider error/429 and cost per successful index/retrieval. Không async-202 contract change in cleanup without approval.

pgvector plan: compare baseline `EXPLAIN (ANALYZE,BUFFERS)` only on approved safe staging SELECT with already computed vector (no repeated paid call in plan). Test filtered top-k/recall across bound versions/models, hnsw parameters supported by installed version, zero/no matches and exact tie policy. HNSW declared does not prove planner use. Keep same cosine operator/result fields/citation behavior. No blanket new index from FK lint.

BQ parity includes model/dimension filters, delayed/reordered tombstones, revocation before provider call, actual SDK dry-run/query, bytes limits/region/job permissions. Preserve both requested Firestore/BQ capability contracts; disabled flag not successful consumer proof.

## Future model migration — riêng, không executed here

If approved model lifecycle requires action, first approve target model/region/signature/provider compatibility and benchmark recall/citations/quality/latency/cost. Preserve old JSON vectors/model/source hashes/index as rollback snapshot. New model vectors/index alongside old (separate versioned representation only if future design explicitly approved), readiness per version and verified query-space switch; **không overwrite a generated same-column index then claim dual-index rollback**. Compare results, staged canary, reversible selector, keep old evidence/old model availability window. Public APIs/IDs remain. Data/model migration and platform/schema cleanup not one inseparable release.

Current audit proposes no new model or dual-index DDL. Need actual approved model contract first. All invocation/benchmark/model-migration results NOT VERIFIED, changes REQUIRES APPROVAL.
