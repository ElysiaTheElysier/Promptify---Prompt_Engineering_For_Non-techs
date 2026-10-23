# Intrepid → Cloud SQL PostgreSQL + Cloud Run

Updated 13 October 2026. Scope: Intrepid only. Runtime conversion and migration preparation are implemented in apps/promptify-intrepid. Cloud resources, real data movement and cutover are deliberately left to the user. Start with [START_HERE.md](START_HERE.md); implementation evidence and limitations are in [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md). The catalog below describes the baseline; app migration 002 adds one private outbox table (50 target tables in total).

## What is complete

- Source baseline plus all 48 migrations 002–049 were parsed with PostgreSQL's parser through pglast 8.5. Existing migration files were not edited.
- Seed-free Cloud SQL candidate instantiated successfully in PGlite 0.5.9 / PostgreSQL 18.6.
- 48 existing public tables + 1 proposed GCP identity table; 363 columns; 100 foreign keys; 96 indexes; 73 public functions; 18 triggers; 75 policies; 1 sequence. The 531 catalog constraints include PostgreSQL 18 NOT NULL constraint objects.
- Static Intrepid table/RPC references matched the candidate: zero missing tables/RPCs. Storage bucket references are classified separately.
- Basic behavior checks passed: UUID identity mapping; enrolled class access; denial of unassigned class; transaction identity cleanup; trusted backend access to base/private tables; certificate withheld without required attendance; eligible completion produces evidence; repeated refresh preserves the certificate ID.

This is repository-derived schema, not a verified dump of the live database. PGlite success does not prove Cloud SQL role privileges, performance, concurrency or deployment compatibility. Cloud SQL staging validation and live drift comparison remain required.

## Files to hand to the Google Cloud engineer

| File | Purpose |
|---|---|
| cloud-sql-schema.candidate.sql | Full ordered, seed-free PostgreSQL DDL + explicit GCP compatibility adapters; fresh empty staging only |
| DATA_DICTIONARY.md | Every table/column/type/default/nullability, constraints and indexes |
| FUNCTIONS_AND_ACCESS.md | Final public function signatures, triggers and RLS |
| catalog.validated.json | Machine-readable final catalog with complete function definitions and grants |
| RELATIONSHIPS.md | All 100 FK relationships |
| foreign-keys-and-load-order.json | Parent-first data import order; no FK cycles detected |
| runtime-contracts.json | Static tables, RPCs, API action cases, storage buckets and calling files |
| migration-manifest.json | Source order, hashes and omission classifications |
| excluded-statements.review.json | Original DML/seed/backfill/platform statements excluded from candidate, for explicit review |
| export-live-catalog.readonly.sql | Read-only source catalog export; no application rows |
| validation-results.json | Actual embedded-PostgreSQL validation results |
| MIGRATION_RUNBOOK.md | Data scope, import, identity/storage migration and cutover procedure |
| JSON_CONTRACTS.md | Interpretation of JSONB fields; do not replace with invented columns |
| target-import-trigger-controls.sql | Commented target-only trigger suspension checklist |
| source-schema.ddl.sql | Source DDL extraction; reference only, requires Supabase context |

## Proposed Google Cloud architecture

| Current dependency | Target | Work still needed |
|---|---|---|
| Supabase Postgres/public business schema | Cloud SQL PostgreSQL | Apply/test candidate in empty staging, reconcile live drift, migrate approved data scope |
| Supabase Auth Google OAuth | Identity Platform with Google sign-in | Implemented Firebase browser session, Admin token verification and UUID binding; configure provider and validate real login in staging |
| Supabase PostgREST .from/.rpc | Cloud Run API + parameterized PostgreSQL queries/RPC calls | Implemented Cloud Run router and parameterized PostgreSQL adapter; validate actual Cloud SQL IAM/RLS in staging |
| Supabase private storage | Cloud Storage private bucket | Copy original bytes, verify checksums, map metadata paths, implement authorization before signed URL issuance |
| Supabase Realtime | Firestore private invalidation notices with API polling fallback | Implemented own-UID Firestore reads and fresh SQL authorization on API reload |
| Supabase pg_cron/pg_net/Vault dispatcher | Cloud Scheduler → private Cloud Run worker with OIDC; Secret Manager | Replace signed Vercel worker invocation, audience/service-account checks, scheduling and retries |
| Vercel functions | Cloud Run container | HTTP server/router, production container, font assets, timeouts, IAM and health checks |
| Provider/API secrets | Secret Manager + dedicated service identities | No secret columns or bundled credentials |
| Gemini embeddings/generation | Keep current APIs initially | Keep model/vector contract; Vertex AI migration is a separate provider change |

Official references:
- Cloud Run ↔ Cloud SQL: https://docs.cloud.google.com/sql/docs/postgres/connect-run
- Cloud SQL import/export: https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-dmp
- End-user auth: https://docs.cloud.google.com/run/docs/tutorials/identity-platform
- Scheduler HTTP/OIDC: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Cloud Storage signed URLs: https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- Cloud SQL extensions: https://docs.cloud.google.com/sql/docs/postgres/extensions

## Important schema decisions

1. Preserve original table/column names, UUID primary keys, FKs, JSONB evidence, revisions and historical records. Do not renumber certificate IDs.
2. Do not split/remove inherited tables based only on the name MVP in schema.sql. Intrepid uses this base schema. Actual data import is Intrepid-scoped, not an export of all tenants/apps.
3. auth.jwt()/auth.uid() are compatibility functions consuming transaction-local claims set ONLY by the trusted, token-validating backend. They are not authentication implementations.
4. New gcp_identity_bindings maps issuer + opaque external subject to user_id and legacy_subject UUID. Existing business/RPC tables continue using legacy UUID subjects. Firebase/Google IDs must not be cast to UUID or replace historical rebuild_runs.subject values.
5. authenticated, service_role and anon are NOLOGIN compatibility roles. Do not give them browser/database credentials. A reviewed Cloud Run login role must be separate from the schema owner, not own tables, and use transaction-scoped role/claims. No automatic runtime login account is created in this package.
6. service_role is deliberately trusted and broad, matching the source backend trust boundary. Target policies grant it table access without requiring BYPASSRLS. Cloud Run must preserve server-side class/domain/actor checks before using it. Never grant this role to learner, instructor, reporting users or other apps.
7. Public function execution is revoked; original explicit authenticated grants remain. Security-definer functions must stay owned by a controlled migration owner. Maintain separate auth-scoped and trusted-service query paths.
8. Source scheduler dispatcher, Supabase publications/storage bucket insertion, data seeds and data backfills are omitted and classified. Never replay seed migrations to migrate live data. Review omitted data transformations against an actual live schema snapshot.
9. Candidate keeps source bootstrap defaults but no demo records. Blank staging must be provisioned deliberately with real admin/client/course/class configuration. No fabricated certificate, learner or authority is seeded.
10. Embeddings currently use JSONB, not pgvector. Do not require a vector extension or change dimensions/provider while moving databases. Candidate requires no Supabase extensions; gen_random_uuid is a built-in function in the tested PostgreSQL version.

## Reproduce offline

From repository root, install tool dependencies in isolated tmp directories (not root/application package.json):

```powershell
python -m pip install --target tmp/intrepid-schema-tools pglast==8.5
npm install --prefix tmp/intrepid-schema-postgres @electric-sql/pglite@0.5.9
python scripts/build_intrepid_cloud_schema.py --module-dir tmp/intrepid-schema-tools
node scripts/validate_intrepid_cloud_schema.mjs tmp/intrepid-schema-postgres/node_modules/@electric-sql/pglite/dist/index.js
python scripts/render_intrepid_schema_docs.py
```

The validator creates an in-memory database and synthetic test records only. It does not read .env or connect to Supabase/GCP. Do not treat it as a production migration runner.

## Remaining release inputs

GCP project ID, approved region/data residency, database major version and instance sizing, network/IAM policy, auth issuer/audience, intended Intrepid client/class IDs, live schema export, data volumes, approved retention policy and downtime/cutover window. These are not needed to review this schema package but are required before real migration.

## Handoff archive
Run python scripts/package_intrepid_schema.py to produce outputs/intrepid-google-cloud/promptify-intrepid-cloud-sql-schema.zip. SHA-256 manifest and ZIP integrity are checked. The archive contains review docs/SQL/catalog/tools only, no secrets, live rows or dependencies. Regeneration scripts require the original repository migrations; applying the candidate in reviewed staging does not require those sources.

## Full-platform scope clarification
The target now includes Firebase Hosting/Auth, Firestore realtime projections and BigQuery for analytics AND SOP vector search. See FULL_GCP_ARCHITECTURE.md for service ownership, consistency, authorization and implementation phases. The current PostgreSQL candidate is unchanged; outbox/Firestore/BigQuery contracts are not yet implemented.
