# Intrepid GCP migration — implementation report

Updated 13 October 2026. Requested scope: finish repository preparation, leave all platform actions to the user. No cloud resource creation, source data extraction, import, deployment, DNS change or source shutdown was performed.

## Implemented behavior

- Browser Google login/session now uses Firebase; server verifies Firebase Admin tokens and maps verified roster identity to existing SQL UUID. Business roles remain SQL-controlled. Duplicate case-insensitive roster identities are rejected.
- Native Cloud Run HTTP API and private OIDC worker replace Vercel transport for this app. PostgreSQL query/RPC adapter uses identifier allowlists, parameterized values, single-connection transactions and verified transaction-local claims. Existing class access, curriculum, quotas, generation/judge runs and award conditions are retained.
- Private SOP bytes use GCS signed URLs, exact upload size, 25 MB policy, short expiration and generation preconditions. Firebase client SDK contains no server credentials.
- SQL outbox queues 22 watched table changes atomically. Worker uses leases/retry/dead-letter, revision ordering, privacy-filtered warehouse rows and own-user/class invalidation documents. Firestore client writes are forbidden. SQL authorization remains authoritative on every reload.
- BigQuery analytics preserves authorized class scope and existing aggregate semantics. Vector retrieval ranks approved SOP chunks, then rechecks current SQL class/version permissions and uses canonical SQL content/citation. Revoked/old versions are removed by projection. Individual private uploads are not a shared corpus.
- Vertex ADC generation/embedding and Workspace service-account impersonation are prepared. Embeddings remain 768 dimensions, one input per request, bounded concurrency/time. Gemini 3.8 normalization removes unsupported sampling/penalty fields, preserves structured rubric schema and uses LOW reasoning; sampling controls do not affect this model. Stage evaluate outputs before migration acceptance.
- Deployment renderer requires explicit generation model/endpoint. Sample Singapore infrastructure + global AI is not a residency approval. API starts with PostgreSQL analytics/vector fallback; activate BigQuery only after sync/query/access checks.
- Scoped export/import/reconcile and SOP file transfer tools preserve source IDs and history. No seed or original Supabase migration was rewritten. Outbox/identity mappings are target-generated. Original Supabase service copies remain for legacy offline contracts, but browser/server production dependency graphs do not reach Supabase.

## Changed file groups

All runtime changes are under `apps/promptify-intrepid`; MVP was not changed by this work. Repository already had extensive separation edits/untracked files before migration. A Git diff alone therefore cannot identify the entire migration scope; the delivery manifest lists exact included paths and hashes.

| Paths relative to Intrepid | Work |
|---|---|
| `src/services/cloudDatabaseService.ts`, `cloudPostgresService.ts`, `cloudSchema.json` | Typed contract metadata and PostgreSQL adapter/transactions |
| `src/services/firebaseIdentityService.ts`, `firebaseServerIdentityService.ts` | Browser login, token verification and UUID mapping |
| `src/services/cloudStorageService.ts`, `vertexAiService.ts` | Private storage and keyless AI |
| `src/services/cloudBigQueryService.ts`, `cloudAnalyticsService.ts`, `cloudSopRetrievalService.ts` | Warehouse, aggregates and authorized RAG |
| `src/services/cloudProjectionService.ts`, `cloudProjectionKeys.json` | Outbox consumer and realtime notices |
| `src/services/cloudRunServer.ts`, `api/cloud-run.ts` | Native runtime/worker entry |
| `src/services/productionServerService.ts`, `productionAiService.ts`, `rebuildRunService.ts`, `apiAuthorizationService.ts`, `rosterWorkerService.ts`, `googleRosterService.ts`, `sopIngestionService.ts`, `governanceTelemetryService.ts` | Existing business flow integration |
| `src/ProductionApp.tsx`, production entry/landing/hub/SOP/governance/analytics components and `components/auth/StagingLogin.tsx` | Firebase session, realtime and IAM-facing UI |
| `gcp/sql/001_baseline.sql`–`003_runtime_role.sql`, `gcp/data-manifest.json` | Seed-free baseline, private outbox, runtime grants and data load contracts |
| `gcp/*.template`, Firestore rules/indexes, `Dockerfile`, Firebase configs | User-executed infrastructure/build/hosting preparation |
| `scripts/render_gcp_config.mjs`, `verify_gcp_bundle.mjs`, export/import/check/reconcile/file/backfill/reembed tools | Reusable configuration and migration tools |
| `tests/verify_cloud_migration.ts`, `verify_cloud_http.ts`, `verify_cloud_export.mjs`, `verify_firestore_rules.ts`, `verify_firebase_identity.ts` | Integration/negative tests and local emulator checks |
| `package.json`, lockfile, `.env.example`, ignore files, `.dependency-cruiser.cjs` | App-owned dependencies/runtime, secret exclusion and exports resolution |

Root `docs/intrepid-google-cloud` and schema/package scripts provide the current handbook and artifact. Original root database history remains intact. Baseline is 49 tables; outbox adds one: 50 target tables. Live source catalog remains unverified.

## Verification

- Clean `npm ci` from app lockfile: PASS.
- Offline suite: 28 explicitly allowlisted tests. Includes actual synthetic PGlite PostgreSQL baseline/outbox and RLS business integration, real SQL authorization with mocked warehouse/model boundary, certificate tests, private worker/native HTTP negative routes, export checksum/FK/identity preflight.
- `npm run typecheck`, `npm run build`, `npm run lint`, `npm run test:boundaries`, `npm run gcp:verify`: PASS. Existing Workspace component cycle is one warning, no boundary errors. Vite reports existing large bundles; no unrelated bundle redesign performed.
- Local dev/API smoke: PASS, no real DB or provider calls.
- Rendered YAML parse and all five shell scripts `bash -n`: PASS; no platform commands executed.
- Complete source preparation ZIP: integrity and per-file SHA-256 verified; excludes secrets, dependencies and live exports.
- Firebase Auth emulator + real Firebase Admin token verification + synthetic SQL: PASS for mapping new Firebase UID to existing UUID, repeat login, bad token and unverified identity.
- Firestore emulator rules: PASS for own verified UID, other UID/anonymous/unverified denial and all client-write denial.
- Production dependency audit: 0 high/critical, 3 moderate transitive findings (`mammoth`, `argparse`, `sprintf-js`). Full development audit from clean install reports 18 findings (8 moderate, 10 high); dev emulator/build dependencies are excluded from runtime install. New grpc advisory patched using 1.14.6 override. No forced downgrades/major audit fix applied. Review document ingestion dependency advisories before production acceptance.

Test result JSON is under app `outputs/`; delivery includes an explicit public verification subset. Emulator tests require Java 21 and are separate from offline tests. Synthetic tests are not a live database migration rehearsal.

## External checks still required

1. Authorized project account, billing, organization region/model policy and IAM review. Local gcloud account previously could not access this project.
2. Compare actual source catalog with repo-derived schema, approve complete Intrepid class allowlist and any shared/unscoped data, freeze relevant writes and perform final export/import/reconciliation/file checksum checks.
3. Actual Cloud SQL role/grant/RLS/connection behavior and backup/restore drill, sizing/HA and limits. PGlite is PostgreSQL-compatible test coverage, not Cloud SQL certification.
4. Cloud Build image build/start, Firebase provider/domains, real signed uploads, IAM/keyless model access, Sheets/Drive sharing, worker OIDC/Scheduler and health/readiness endpoints. Docker daemon was unavailable locally; container build has not run.
5. BigQuery DDL/views/vector query dry run and real query, dataset permissions, projection retries/dead letters and revocation tests, retrieval/scoring quality and cost evaluation. These SDK queries were exercised with mocked warehouse responses, not a live warehouse.
6. UI staging review with all business roles, source/target record and certificate ID reconciliation; then explicit Hosting/domain traffic cutover. No zero-downtime/rollback-without-delta promise.

The preparation is complete within repository scope. Actual platform migration remains the manual execution and acceptance process in START_HERE.md.
