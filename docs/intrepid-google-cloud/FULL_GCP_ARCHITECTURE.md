# Full Google Cloud migration — Intrepid

Decision clarification, 12 October 2026: target replaces Supabase + Vercel across hosting, identity, operational data, files, realtime, analytics and SOP vector retrieval. This document extends the PostgreSQL package; runtime conversion and preparation tools are implemented; actual cloud deployment and data migration remain manual. See START_HERE.md and IMPLEMENTATION_REPORT.md for current status.

## Service ownership

| Service | Responsibility | Authoritative data |
|---|---|---|
| Firebase Hosting | React/Vite static frontend and same-origin API rewrite to Cloud Run | Built assets only |
| Firebase Authentication / Identity Platform | Google sign-in and token/session lifecycle | Authentication identity; business permissions remain SQL |
| Cloud Run | Product API, authorization, SQL access, AI orchestration, ingestion and workers | Business writes go through API |
| Cloud SQL PostgreSQL | Transactional learning platform | Users/business roles, classes, enrollment, attempts, rubric/config, progress, awards, SOP versions/approval, quotas/audit |
| Cloud Storage | Private original documents and approved exported artifacts | File bytes and integrity metadata |
| Firestore | Private per-user/class invalidation notices; sensitive content is reloaded through authorized SQL API | Rebuildable projection only; SQL owns durable business records |
| BigQuery analytics | Reporting datasets, history and aggregates for UI-12 | Derived warehouse facts, not live enrollment/award authority |
| BigQuery vector search | Searchable approved SOP chunks and embedding index | Rebuildable search projection; SQL owns version/approval/access status |
| Vertex AI | Approved embedding/generation endpoints | Model/version/config must be recorded; provider migration validated separately |
| Cloud Scheduler + Pub/Sub or Cloud Tasks | Scheduled sync, retryable projection/index work | At-least-once jobs with explicit idempotency |
| Secret Manager + Cloud Logging/Monitoring | Secrets, logs and operational metrics | No provider secret in browser/Firestore/BigQuery |

Firebase is a product family, not another database alongside Firestore. One Google Cloud project can have Firebase enabled. Firebase Auth UID is opaque text; the existing gcp_identity_bindings proposal maps it to business UUID and historical UUID subject.

## Writes and projections

Browser → Firebase sign-in → ID token → Cloud Run verifies token → identity binding → SQL class/domain/owner checks → SQL transaction.

After commit, a durable outbox event drives Firestore and BigQuery projections. Do not write SQL + Firestore + BigQuery synchronously and assume atomicity. The outbox is a NEW schema migration to design/implement, not included in the current 49-table candidate. Consumers deduplicate by event ID/entity revision, tolerate retry/out-of-order delivery, track backlog/dead letters and support rebuild.

Firestore clients read only authorized projections; no direct writes to scores, enrollment, awards or grants. Rules must protect class membership/private recipient even when the browser subscribes directly. Role/membership revocation must update access promptly; cached claims/projections alone cannot be final authorization. If consistent realtime access cannot be demonstrated initially, retain authorized API polling during transition.

## BigQuery analytics

Proposed separate datasets: intrepid_raw, intrepid_analytics, intrepid_knowledge. Names/region must be confirmed against the actual project policy.

Warehouse contracts: dim_client, dim_class, dim_course, dim_lesson, dim_learner (pseudonymous by default); fact_attempt, fact_progress, fact_attendance, fact_award, fact_sop_publication. Define grain, stable IDs, source_revision, source_updated_at, loaded_at, timezone, deletion handling and freshness SLA before creating tables. UI-12 reads authorized aggregates through Cloud Run. Date ranges/department filtering must preserve SQL authorization scope. ROI/hours saved remain absent until measured business inputs and calculation are approved.

For selected analytics tables, evaluate Datastream CDC vs scheduled incremental extracts. Datastream is a deployment option, not already configured. Avoid using CDC and outbox as two competing authorities for the same warehouse entity. Select one ingestion contract per table and monitor lag.

## BigQuery SOP vector contract

Suggested fields: client_id, class_id or separately resolved bindings, document_id, version_id, chunk_id, chunk_position, page, content, parent_context, source_hash, publication_status, model_id, model_version, embedding_dimensions, embedding ARRAY<FLOAT64>, source_revision, indexed_at. Keep the embedding table separate from query/audit analytics.

Ingestion: approved SQL SOP version + Storage original → extract/chunk → model embeddings → BigQuery vector rows/index → mark readiness. Publish/update/revoke/delete events update the projection. Do not mix vectors from different model spaces. Existing embeddings come from gemini-embedding-001 with 768 dimensions; changing endpoint/provider/task settings requires a compatibility/evaluation check and possibly a backfill.

Retrieval: Cloud Run computes allowed scope from SQL, executes parameterized BigQuery filters, retrieves candidates, then rechecks current SQL publication/version/binding/permissions before returning context or sending it to Gemini. Stale vector rows must never bypass revoked access. Over-fetch within authorized scope when necessary; post-authorization filtering can otherwise yield fewer than top_k results. Browser-supplied client/class IDs and AI-generated unrestricted SQL are not permissions.

Private learner-uploaded context does not enter a shared enterprise vector index automatically. Define a separate owner-scoped retrieval policy or keep it in the authorized operational path.

## Migration order

1. GCP staging project/Billing/region/IAM, Firebase sign-in, Cloud SQL schema and Storage.
2. Port backend authentication and every product action/query/RPC to Cloud Run while preserving contracts. Adapt API routing and frontend hosting rewrites.
3. Validate operational parity: roles/class scope, runs/Judge locks, progress, authoring, SOP workflow, roster and certificate IDs/PDF.
4. Implement durable events and protected Firestore realtime projections.
5. Build BigQuery reporting datasets, ingestion and UI-12 parity.
6. Build BigQuery vector retrieval and evaluate against current SOP search: permission tests, recall/citations, latency, freshness and cost.
7. Import approved Intrepid data/files/identity bindings, reconcile IDs and counts, stage cutover/rollback. Do not alter MVP as a side effect.

No production cutover until operational parity and data reconciliation pass. Do not disable source Supabase/Vercel while the app still depends on them.

## Definition of complete

Runtime Intrepid authentication/data/storage/realtime calls no longer use Supabase, and production routing no longer uses Vercel. All approved business rows/files and history reconcile. Firebase identities map correctly. Firestore/BigQuery projections have freshness, retry, revocation and deletion behavior. Cloud Run works with real IAM/network settings. All UI flows and authorization matrices pass on staging; backup and rollback rehearsed.

Current deliverable is schema preparation plus this target architecture. Outstanding: runtime conversion, Firestore rules/collections, SQL outbox migration, BigQuery DDL/pipelines, GCP infrastructure, live data export/reconciliation and deployment.

## Official references

- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://firebase.google.com/docs/hosting/cloud-run
- https://firebase.google.com/docs/firestore/query-data/listen
- https://docs.cloud.google.com/datastream/docs/overview
- https://docs.cloud.google.com/bigquery/docs/vector-index
