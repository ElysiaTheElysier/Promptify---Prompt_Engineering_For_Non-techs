# GCP deployment readiness — fast migration first

## Current decision — 2026-10-14

**YES: code/image is ready for a fresh private boot-staging deployment before SQL cutover. NO: full functional staging and production are not yet cloud validated.** User executes all commands below. Agent has not changed resources/IAM/deployments or real data. [Results](../evidence/CORRECTNESS_AND_TEST_RESULTS.md), [plan](../evidence/ENGINEERING_PROGRESS.md).

Boot target: `promptify-intrepid-api-boot-staging`, dedicated unprivileged `promptify-staging-boot` runtime account, no PG/Supabase credentials, SQL attachment, source writer, Scheduler or Hosting cutover. Expected `/healthz`200; `/readyz`503 is deliberate until a separate SQL-configured staging revision is approved. Infrastructure boot does not prove Firebase-authorized feature workflows.

### What the user can do now

Use Cloud Shell/Bash from `apps/promptify-intrepid`; do not paste Bash continuation into CMD/PowerShell. Review project/billing/region/public Firebase app config first. Existing resources should be inspected and reused, never deleted to rerun CREATE. All create/build/deploy commands can incur charges; max-instances1 is not a spending cap. Budget alerts do not cap cost. SQL dedicated cores cost even while idle.

1. **Prepare only boot dependencies.** Console: project/Billing → APIs & Services → Artifact Registry → IAM service accounts. Enable Run, Cloud Build, Artifact Registry and Logging. Create/reuse `promptify-intrepid` Docker repository and `${project}-intrepid-build-staging` bucket. Create/reuse build SA `promptify-build` and a new runtime SA `promptify-staging-boot`; the latter needs no database/provider/data roles for health smoke. Administrator grants build SA repository writer, logs writer and source-bucket viewer; human needs build submission, Run deployment and actAs on relevant SAs. Do not run the whole02 resource script just to boot: it also creates SQL/GCS/Firestore.

For a fresh project/environment only, the human can use the following instead of Console creation. Inspect and skip individual CREATE commands when resources already exist; keep the reviewed repository/bucket/SA names consistent. Human setup permissions: Service Usage Admin, Artifact Registry Admin, Storage Admin and Service Account Admin for these resource creations; deployment needs Run administration, Cloud Build submission, source upload and scoped service-account actAs. These are human setup rights, not runtime grants.

```bash
export TASK_PROJECT_ID='REPLACE_PROJECT_ID'
export TASK_REGION='asia-southeast1'
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com logging.googleapis.com --project="$TASK_PROJECT_ID"
gcloud artifacts repositories create promptify-intrepid --repository-format=docker --location="$TASK_REGION" --project="$TASK_PROJECT_ID"
gcloud storage buckets create "gs://${TASK_PROJECT_ID}-intrepid-build-staging" --location="$TASK_REGION" --uniform-bucket-level-access --public-access-prevention --project="$TASK_PROJECT_ID"
gcloud iam service-accounts create promptify-build --project="$TASK_PROJECT_ID"
gcloud iam service-accounts create promptify-staging-boot --project="$TASK_PROJECT_ID"
gcloud projects add-iam-policy-binding "$TASK_PROJECT_ID" --member="serviceAccount:promptify-build@${TASK_PROJECT_ID}.iam.gserviceaccount.com" --role=roles/logging.logWriter
gcloud artifacts repositories add-iam-policy-binding promptify-intrepid --location="$TASK_REGION" --project="$TASK_PROJECT_ID" --member="serviceAccount:promptify-build@${TASK_PROJECT_ID}.iam.gserviceaccount.com" --role=roles/artifactregistry.writer
gcloud storage buckets add-iam-policy-binding "gs://${TASK_PROJECT_ID}-intrepid-build-staging" --member="serviceAccount:promptify-build@${TASK_PROJECT_ID}.iam.gserviceaccount.com" --role=roles/storage.objectViewer
```

Expected: APIs enabled, repository/bucket/SA inventory and three build-SA bindings visible; boot runtime SA has no data/provider role. A403 means the human lacks the specific setup permission; resolve with the project administrator, not Owner on runtime SA. Partial failure leaves only the resources already created; inspect them and resume individually. Verification: enabled APIs, Artifact Registry repository, bucket settings and IAM service-account detail pages; `gcloud iam service-accounts describe "promptify-staging-boot@${TASK_PROJECT_ID}.iam.gserviceaccount.com" --project="$TASK_PROJECT_ID"` succeeds.

2. **Render/review and build.** Actual Vertex Flash ID/region must be user-approved and available; CLI Gemini3.8 is not availability evidence for Vertex. Renderer only accepts Flash IDs and writes local outputs. Public Firebase Web App fields are build arguments; server keys/passwords are not. App `.gcloudignore`/`.dockerignore` exclude environment files, dependencies, test/output/log artifacts. Inspect the upload file list before submission.

```bash
# Set these explicitly to the approved staging environment.
export TASK_PROJECT_ID='REPLACE_PROJECT_ID'
export TASK_REGION='asia-southeast1'
export TASK_VERTEX_FLASH='REPLACE_APPROVED_VERTEX_FLASH_MODEL_ID'
export FIREBASE_API_KEY='REPLACE_PUBLIC_WEB_APP_API_KEY'
export FIREBASE_AUTH_DOMAIN='REPLACE_PUBLIC_AUTH_DOMAIN'
export FIREBASE_APP_ID='REPLACE_PUBLIC_APP_ID'
node scripts/render_gcp_config.mjs "$TASK_PROJECT_ID" "$TASK_REGION" "$TASK_VERTEX_FLASH" global --image-tag=boot-staging
node scripts/gcp_preflight.mjs
gcloud meta list-files-for-upload
# HUMAN EXECUTION: requires reviewed project, build SA/IAM/bucket/repository.
gcloud builds submit . --project="$TASK_PROJECT_ID" --config=gcp/cloudbuild.yaml --service-account="projects/${TASK_PROJECT_ID}/serviceAccounts/promptify-build@${TASK_PROJECT_ID}.iam.gserviceaccount.com" --gcs-source-staging-dir="gs://${TASK_PROJECT_ID}-intrepid-build-staging/source" --substitutions="_REGION=${TASK_REGION},_TAG=boot-staging,_FIREBASE_API_KEY=${FIREBASE_API_KEY},_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN},_FIREBASE_APP_ID=${FIREBASE_APP_ID}"
```

Expected: Cloud Build success and Artifact Registry image. Console image details supply digest; set `STAGING_IMAGE_DIGEST` to full reviewed `REGION-docker.pkg.dev/PROJECT/promptify-intrepid/app@sha256:64_HEX`. Local smoke image uses fake Firebase values and is not the user deployment artifact. Build failure: fix reported registry/IAM/network/config issue and rebuild; no SQL/source data has moved.

3. **Deploy the fresh private boot service and verify.** Review [boot-only template](../../apps/promptify-intrepid/gcp/04a-deploy-boot-staging.sh.template), then `bash outputs/gcp/04a-deploy-boot-staging.sh --validate` and, by the human, `--execute`. It checks the dedicated SA and refuses to overwrite an existing named service. Console: Cloud Run → revisions/config/logs → verify image digest, runtime SA, no DB env/attachment, port8080, max1/min0, private invocation. Platform startup can use health/TCP; do not set a startup probe to readyz while SQL is absent.

Human administrator grants only the reviewer `roles/run.invoker` on this service. Use platform token separately from app Firebase authorization:

```bash
export TASK_REVIEWER_EMAIL='REPLACE_REVIEWER_EMAIL'
gcloud run services add-iam-policy-binding promptify-intrepid-api-boot-staging --project="$TASK_PROJECT_ID" --region="$TASK_REGION" --member="user:${TASK_REVIEWER_EMAIL}" --role=roles/run.invoker
TASK_RUN_URL=$(gcloud run services describe promptify-intrepid-api-boot-staging --project="$TASK_PROJECT_ID" --region="$TASK_REGION" --format='value(status.url)')
curl -i -H "X-Serverless-Authorization: Bearer $(gcloud auth print-identity-token)" "$TASK_RUN_URL/healthz"
curl -i -H "X-Serverless-Authorization: Bearer $(gcloud auth print-identity-token)" "$TASK_RUN_URL/readyz"
curl -i -H "X-Serverless-Authorization: Bearer $(gcloud auth print-identity-token)" -H 'Content-Type: application/json' -d '{"action":"snapshot"}' "$TASK_RUN_URL/api/product"
```

Expected200/503/401 respectively; without platform token private transport denies invocation. `X-Serverless-Authorization` keeps platform identity separate from app Authorization per [Cloud Run documentation](https://docs.cloud.google.com/run/docs/authenticating/service-to-service). Save redacted status/revision/digest/log evidence, never token. If403 occurs before app, inspect reviewer IAM/org policy; do not make boot service public to bypass it. Infrastructure rollback: point traffic to a prior reviewed boot revision if present or leave failed fresh service without traffic; no source-data rollback involved.

4. **Move to SQL/functional staging, then scoped cutover.** Follow reviewed full-environment [setup guide](../gcp/SETUP_GUIDE.md). Provision SQL18 dedicated core with ML/vector support, deletion protection/backups/PITR; set real role/password in numeric-version Secret Manager. Apply reviewed schema001–009 to an empty target with migration-owner credentials,007 concurrent-index statements outside a surrounding transaction. `promptify_runtime` must not be owner/superuser/BYPASSRLS/INHERIT; actual Cloud SQL role creation/membership privileges remain a staging gate. Attach only target SQL staging to API/worker; keep source writer traffic unchanged. Worker is private and checks Scheduler OIDC audience/email; no schedules until integration/reconciliation passes.

### Cloud SQL and cutover blockers

| Gate | Local proof | Required real staging evidence |
|---|---|---|
| Engine/extensions/004 | Real native vector; ML call doubled | Actual supported PG18/vector/google_ml versions, extension/schema/search_path, 768-dimension embedding via unchanged model, SQL service identity Vertex predict rights |
| Privilege/RLS | pgTAP/concurrency and runtime pool PASS | Migration-role ability, normal runtime cannot own/bypass RLS, Firebase actors including assigned/unassigned Trainer, learner/admin boundaries |
| Runtime integrations | Build/negative HTTP/worker smoke PASS | Secret/SQL network, positive Firebase login/issuer-UID mapping, actual approved Flash Generate/Judge, quotas/timeouts |
| Shared source import | Synthetic scoped roundtrip PASS | Explicit Intrepid class/course/client/user/FK/history scope approved against MVP shared source; live counts/hash match; reject dirty SOP tuples rather than repair/delete silently |
| File/model provenance | Scoped scripts/guards available | SOP originals present/checksummed at GCS, no accidental public objects; legacy cached chunks/models reconciled without relabel/mixing or discarded history |
| Projection/data capabilities | Key/privacy/recovery regressions PASS | Firestore/BQ backfill/parity; GCS signed paths; Sheets/Drive approved-file access; Scheduler retries/replay; no missing feature hidden as optional |
| Freeze/recovery | Target transaction/reconciliation local PASS | Freeze all affected Intrepid writers including overlapping shared MVP workflows, final export/ID/hash/file checks, recovery/PITR rehearsal and one authoritative writer |

Before the first target writer: approve scope, transfer rehearsal, Firebase mapping, files, projections and feature acceptance. Preserve stable IDs, run/Judge/award snapshots, correction history and source migration/rollback history. Use export/import/reconciliation, `migrate_sop_files.mjs` and `backfill_gcp_projections.mjs` only by the human with reviewed credentials/scope. No agents ran them against real systems.

Cutover order: approved freeze → final repeatable-read scoped export/files → empty target import/reconciliation/mappings → projections → acceptance → user traffic switch → workers/Scheduler. No dual writers without a reviewed conflict protocol. Before target writes, routing may return to unchanged source; after target writes, freeze target and reconcile/preserve accepted writes before routing rollback. A blind source switch would lose post-cutover history. PITR does not automatically restore GCS/projections/identity mappings.

### Safe to defer

Broad table simplification/feature removal, normalization redesign, unused-code cleanup, perfect final ERD/explorer, advisory index tuning, chunk splitting and optional dashboard polish. These do not block boot staging. Actual model provenance, Firebase isolation, SQL privilege/integrity, approved scope, reconciliation, private file access and recovery must not be deferred past production cutover. Existing50 target tables/capabilities retained; live counts remain unverified.

## Historical checkpoint below — superseded by current decision above

Ngày 2026-10-14. **NOT READY FOR PRODUCTION / NOT CLOUD VALIDATED.** User executes all cloud resource, IAM, billing, deployment and real-data actions.

| Area | State | Next action |
|---|---|---|
| Local correctness migrations 006–009 | TESTED LOCALLY partially | Native core/pgTAP/concurrency passed; 004 vector/ML remains pending |
| Latest runtime build | BLOCKED | Fix two TypeScript Object.hasOwn compatibility errors through Gemini worker, rerun checks |
| Gemini CLI worker orchestration | TESTED LOCALLY | Three regression suites generated, independent gates PASS, reviewed/applied; further batches in plan |
| Docker native PG18/vector test infrastructure | READY LOCALLY partially | Image downloaded; actual full chain/extensions/pool tests not executed yet |
| Architecture / explorer | READY LOCALLY partially | Generated views/site; final catalog refresh, link review and provenance consolidation pending |
| GCP setup/config handoff | In progress locally | [SETUP_GUIDE](../gcp/SETUP_GUIDE.md) draft exists; remaining manual checklist/runbook/verification and config review pending |
| Project/APIs/IAM/SQL/Firebase/Run/GCS/Firestore/BQ/Workspace/Scheduler | WAITING FOR USER GCP SETUP | Use reviewed handoff after local gates; don't infer provision from templates |
| Cloud SQL native ML/model/region/roles/RLS/network/PITR | WAITING FOR CLOUD SQL STAGING VALIDATION | Actual evidence and integration/recovery tests required |

Existing feature/model capabilities and 50 table identities preserved as the engineering target. SQL is authoritative; Firestore/BQ capabilities remain. No implicit switch to Supabase production. No resources/IAM/production data/deployment changed in this work.

Future embedding-model migration/re-embedding needs a separate preservation/benchmark approval; never relabel historical vectors or mix spaces. Manual export scope/FK closure and old cached indexing provenance are explicit gates before real data transfer.

This file is a checkpoint, not a substitute for unfinished runbooks or staging evidence. [Engineering plan](../evidence/ENGINEERING_PROGRESS.md), [actual results](../evidence/CORRECTNESS_AND_TEST_RESULTS.md).
