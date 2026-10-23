# Intrepid migration runbook

Updated implementation and exact manual commands: [START_HERE.md](START_HERE.md). This document describes migration policy. App-local gcp/sql/001–003 and scripts are the executable preparation; nothing here has been applied to a live platform.

## 1. Confirm the source and scope

This repository has two apps and may point both at the same Supabase project. A full public-schema DATA dump may include MVP users/classes/other clients. The target schema keeps shared structural foundations; the migrated DATA must be an approved Intrepid subset.

Obtain an explicit allowlist of client_ids, class_ids and included courses. Read the live catalog with export-live-catalog.readonly.sql, save its JSON output, then run:

```powershell
python scripts/compare_intrepid_live_catalog.py path/to/live-catalog.json
```

Review each difference. Extra live objects might be manual changes; missing objects might be unapplied migrations. Do not automatically run migrations to resolve differences. Export the current source PostgreSQL major version and sequence values separately; never call nextval merely to inspect a sequence.

## 2. Establish Google Cloud staging

Create an empty Cloud SQL PostgreSQL instance/database and a separate migration-owner connection. Test the proposed candidate first; it is a fresh bootstrap, NOT idempotent and NOT an upgrade script for an existing DB. PostgreSQL 18 is the offline-tested major; confirm the approved Cloud SQL major and rerun staging checks.

Apply with an error-stopping client, for example after an approved secure Cloud SQL connection is established:

```text
psql --set ON_ERROR_STOP=on --single-transaction --file docs/intrepid-google-cloud/cloud-sql-schema.candidate.sql
```

Connection credentials are supplied by the environment/proxy, never written into this file. Cloud SQL role/ownership permissions must be validated on the actual service. Configure the Cloud Run database identity separately with least privilege; do not run the app as the migration owner. The candidate creates NOLOGIN compatibility roles, not a usable deployment account.

## 3. Define the approved DATA selection

| Tables/group | Selection principle |
|---|---|
| clients/classes | Approved Intrepid client/class IDs only |
| courses/course_modules/lessons/lesson_resources/lesson_rubric_criteria | Curriculum referenced by selected classes, including historical referenced lesson IDs |
| enrollments/learners/users | Selected enrollments plus referenced learner/users; include historical removed/expired rows when retention requires them |
| course_instructors/product_class_grants | Assignments for selected course/class scope; include referenced actors |
| prompt_attempts/lesson_progress/rebuild_runs/rebuild_judge_claims | Selected class/lesson/learner scope; preserve UUID subjects and request IDs |
| SOP documents/versions/bindings/chunks/contributions | All versions referenced by selected scope; retain published AND pending/history according to retention |
| product_prompt_library/product_learner_context/product_prompt_drafts | Selected scope and owner; do not broaden private context visibility |
| product_attendance/product_awards | All selected historical records; preserve evidence, IDs, dates and issuer values |
| studio/session controls/roster profiles/sheet connections/sync logs | Selected class/user/connection closure |
| workshop messages/receipts/trainer hints/actions/support/audit | Selected scope plus ALL referenced actors; do not omit instructor/admin records needed for FKs |
| product_domains | Selected client only |
| profile corrections/tutorial progress/request budgets | Selected user/actor closure and retention policy |
| rotation requests/approvals | Selected scope and referenced approving users; history does not authorize a new rotation |
| product_governance_config | Global singleton: review explicitly, never assume it is Intrepid-only |
| product_enterprise_requests | Public lead data: separate approved transfer decision, not automatic Intrepid export |
| product_worker_invocations | Temporary nonce data; select retention explicitly; never use imported records to replay jobs |
| gcp_identity_bindings | New target table populated by reviewed identity mapping; absent from source |

Compute a referential closure: every referenced parent UUID must be included. Follow FKs to required actors/parents, but do not include all sibling classes merely because they share a client/course/user. The supplied 100-FK graph helps check the closure; it does not automatically authorize a full data export.

## 4. Export and import approved rows

Use a consistent read-only snapshot or approved maintenance window. Keep source schema, row data, blob files and secrets as separate exports. CSV/typed COPY exports are appropriate for a reviewed subset; use pg_dump only when its table selection is verified and its ownership/platform sections are handled separately. Do not import a Supabase schema dump on top of the candidate.

- Preserve explicit UUIDs, timestamps, enum-like text, JSONB, revisions, empty versus NULL, Unicode and historical metadata.
- Import parent-before-child according to foreign-keys-and-load-order.json. No cycles were detected in the candidate.
- Historical row import must not accidentally regenerate progress, awards or audit records. The target-only trigger checklist identifies application triggers. Review and suspend USER triggers during controlled import, then re-enable them before tests. Do not disable internal FK triggers or set session_replication_role as a shortcut.
- Load all stored columns explicitly instead of firing actor-sensitive defaults. Let active FK/CHECK/UNIQUE constraints validate rows.
- Restore learner_code_seq to a value at least as high as both the source last value and the highest imported generated learner code. Record the decision; do not renumber existing learner codes.
- Copy pending processing/claim history as history. Decide how to mark or resolve uncertain work without automatically retrying AI calls or issuing duplicate awards.

The package includes no real learner data, no source credentials and no automatic data-export script. Do not replay excluded seed migrations as business data.

## 5. Identity adapter

Identity Platform subjects can be non-UUID strings. Maintain:

- users.id: existing business UUID.
- users.auth_provider_id: preserve existing legacy UUID mapping during migration.
- gcp_identity_bindings.issuer + external_subject: validated new identity.
- gcp_identity_bindings.legacy_subject: existing UUID used by run/Judge/RPC history.

For new users, provision a business user and a new legacy_subject UUID through the authorized enrollment/roster flow. Do not bind accounts solely from an unverified email. Existing users require verified email/issuer and conflict checks before mapping.

For an authenticated DB request, use ONE checked-out connection and ONE transaction. Validate the token before opening the user data path, resolve the binding, then set transaction-local claims with parameterized set_config calls. A typical user-scoped sequence is BEGIN → SET LOCAL ROLE authenticated → set_config('request.jwt.claim.sub', legacySubject, true) → set_config('request.jwt.claims', verifiedClaimsJSON, true) → queries/RPCs → COMMIT. Roll back on failure and release the connection only after transaction cleanup.

Role names are fixed backend code, never browser-supplied. For trusted internal service operations, use the separate service_role path only after class/domain/actor authorization. Do not allow learners to call arbitrary RPC names or supply p_subject for another identity. IAM database identity authenticates the service, not the end user.

## 6. Cloud Storage

Create a private bucket for original SOPs. Copy files using reviewed source object manifests, keep checksum/byte-count evidence, and maintain a source→target mapping. Then update only authorized metadata.storageBucket/storagePath values where appropriate. The backend must issue signed download/upload URLs after class/lesson/owner checks. Existing source signed URLs expire and must not be stored as permanent GCP locations.

SOP content/versions/chunks/embeddings remain database records. File bytes are separate objects. Existing Drive IDs/links and service-account sharing also need validation; a bucket copy does not fix Drive access.

## 7. Backend/frontend conversion checklist

The current Intrepid runtime still uses Supabase and Vercel-shaped API handlers. This schema package does not replace those implementations.

- Browser: replace Supabase auth/session calls and subscriptions; keep bearer-token API calls and UX states.
- Cloud Run: implement HTTP routing for product actions and worker; port .from/.rpc to parameterized PostgreSQL queries with equivalent class/domain/owner checks.
- Implement source upload/download for Cloud Storage and retain PII/file-size checks.
- Retain saved-run idempotency, Judge claim locks, request budgets, rubric validation, atomic progress, award eligibility and authoring revisions.
- Route Scheduler to a private worker using validated OIDC audience/service account. Do not retain the hardcoded Vercel dispatcher or assume the current HMAC handler already understands OIDC.
- Keep provider secrets in Secret Manager. Keep Sheets/Drive and Gemini identities separate from database users where useful.
- Bundle NotoSans.ttf and its license in the Cloud Run image; certificate renderer uses process.cwd()/public/fonts/NotoSans.ttf.
- Retest response sizes, request limits/timeouts, pool size × Cloud Run concurrency/max instances, health checks and retry behavior.

## 8. Acceptance tests before cutover

1. Catalog agrees with approved source/target differences: columns/defaults/FKs/indexes/functions/RLS/triggers.
2. Per-table approved row counts and stable-ID sets match; JSON evidence/metadata and Unicode samples match.
3. Cross-client/class/owner authorization fails as expected for learner/instructor/head/admin. Basic embedded tests do not cover the full matrix.
4. Login + profile + roster mapping; expired/unprovisioned/conflicting identity behavior.
5. UI-04→05→07→06→08; draft save; duplicate request; concurrent run/Judge; failed provider/retry; atomic progress.
6. Instructor authoring/publish/sandbox/coaching; Head review; admin governance; Sheet manual/automatic sync and audit.
7. Pending/rejected/published SOP access; private context; file download; checksums; no public originals.
8. Attendance and real-record certificate eligibility; English PDF/preview; no duplicate issuance and unchanged IDs.
9. Analytics parity; no fabricated ROI/estimated hours; source report semantics preserved.
10. All user triggers enabled, indexes valid, constraints validated, sequence correct, backup/restore rehearsal complete.

## 9. Cutover and rollback

Define a write-freeze window or reviewed delta replication strategy. Reconcile final changes before switching traffic. Reauthentication will be needed when replacing Supabase sessions. Switch only Intrepid endpoints/configuration after target tests pass. Do not modify MVP connectivity as a side effect.

Keep the source available for rollback under the approved retention policy. If target accepts writes, rollback requires a reverse-sync/reconciliation plan; merely changing a URL can lose target-created attempts/users/awards. Record the last consistent snapshot, target writes, file mappings and decision to roll back. Do not remove the source until the business owner accepts the migration.
