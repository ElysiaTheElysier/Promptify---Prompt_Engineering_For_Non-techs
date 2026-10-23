# Staging deployment governance — 2026-10-18

## CLI release authorized after computer-use failure

The user subsequently explicitly authorized gcloud/Firebase CLI staging deployment, before/after configuration logging with secrets/tokens redacted, no IAM change and no production impact. The computer-use failure below is historical; CLI work is now authorized.

### Verified staging baseline

- Active gcloud identity: `demo.biz@intrepid.asia`.
- Project: `ai-transformation-510302`; region: `asia-southeast1`.
- API: `promptify-intrepid-api`; prior ready revision: `promptify-intrepid-api-00004-chg`.
- Runtime identity remains `promptify-api@ai-transformation-510302.iam.gserviceaccount.com`; attached SQL remains `ai-transformation-510302:asia-southeast1:promptify-staging`, database `promptify_db`, role `promptify_runtime`.
- Runtime password remains a reference to `intrepid-db-password:1`; payload is not accessed by release scripts.
- Hosting target: `ai-transformation-510302-intrepid-staging`; prior latest version `19dac46d8dfe8ba1`. Default Hosting site has no releases. Neither the default site nor external production aliases are release targets.
- Existing build identity: `promptify-build@ai-transformation-510302.iam.gserviceaccount.com`; existing registry and build staging bucket reused.
- Cloud Build `1ddfbef3-1794-475d-ad3b-58d754467182` succeeded. Image digest: `sha256:6d192c6314515dbe8237fb241479e2844bc8708ac5e32160f87b770a5321910c`.
- Build source object: `gs://ai-transformation-510302-intrepid-build-staging/source/1792327846.250393-8ddcdf5828d540588e0c397466e08827.tgz`. Only app-local upload contents; environment files, outputs, dependencies and logs excluded.

### Configuration evidence and limits

App-local ignored evidence is in `apps/promptify-intrepid/outputs/staging-release-2026-10-18/`. `before/manifest.json` records capture outcomes. Inventory includes project/API metadata, Cloud Asset resource and IAM indexes, API services/config/IAM, SQL settings/backups, registry, service accounts, secret metadata/version references/IAM, bucket settings/CORS/IAM, Firestore database/indexes/rules/release, Firebase domains/Google provider/app metadata, Hosting release configurations, Scheduler, BigQuery dataset inventory, logging buckets and sinks. Cloud Asset is a discoverability index, not a claim that every unrelated resource's full configuration was exported. Missing/denied calls must remain explicit in manifests.

Environment plaintext values are restricted to an explicit safe-name allowlist. Secret payloads and tokens are excluded. Firebase Auth hash configuration and OAuth client secret are redacted; the initial Auth response was corrected locally to remove its hash configuration before packaging. Public Firebase web API key is also redacted in the local build submission metadata. No IAM or credential rotation is performed by these scripts.

### Pre-release validation

Local production build passed using the verified staging public Firebase config. All 37 allowlisted offline tests passed; architecture negative tests and lint passed, with the existing Workspace type-cycle warning and bundle-size warning. No live provider test or database migration executed. Authentication/visual browser verification after release remains distinct from HTTP smoke checks because computer-use initialization is still unavailable.

## Authorization and scope

User requested deployment to cloud using computer use, with GCP configuration logging for governance. Based on the preceding staging work, the working scope is Intrepid staging in project `ai-transformation-510302`, region `asia-southeast1`. Production cutover, IAM changes, data migration, new AI model/budget, and worker scheduling are not included.

## Historical computer-use attempt

No deployment performed. Both available computer-use entry points failed before a browser or native window could be observed:

- Browser `cua.getState()` failed: `failed to write kernel assets: The system cannot find the path specified. (os error 3)`.
- Native computer-use initialization through node_repl failed with the same error before returning any app inventory.

This is a local tool initialization failure, not evidence of a GCP permission failure. No cloud settings were changed. No fresh live inventory was obtained in this attempt.

## Local configuration inspected

### Retry after Codex restart

The user explicitly authorized staging deployment using computer use, with configuration governance logging, no IAM changes and no production impact. After the reported restart, both browser `cua.getState()` and native `node_repl` / `@oai/sky` initialization again failed with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`. Neither returned a window or browser inventory. No cloud read or deployment was possible through computer use; no cloud mutation was attempted. Restart did not resolve the tool failure. A CLI/API deployment would require agreeing to that different execution method; it has not been substituted silently.

| Source | Observed configuration | Evidence limit |
| --- | --- | --- |
| `apps/promptify-intrepid/firebase.json` | Hosting serves `dist`; `/api/**` rewrites to `promptify-intrepid-api` in `asia-southeast1`; SPA fallback; index no-store | Local file only; Hosting site/target must be verified live before release |
| `apps/promptify-intrepid/gcp/cloudbuild.yaml` | Docker build; image `asia-southeast1-docker.pkg.dev/$PROJECT_ID/promptify-intrepid/app:${_TAG}`; public Firebase build arguments; Cloud Logging only | Template defaults are not proof of deployed settings |
| Previous staging application report | SQL instance `promptify-staging`, DB `promptify_db`; migrations 006 feedback and 010 badge completed; CORS and Firestore rules applied | Historical evidence in `STAGING_APPLY_RESULT_2026-10-17.md`; recheck live before release |

Repository contains substantial pre-existing uncommitted changes. Preserve them; never deploy the repository root or the MVP app incidentally.

## Required release evidence

Collect a timestamped, redacted before/after inventory of the target project and account, Hosting site/channel, Cloud Run service/revision/image digest/traffic/runtime service account, environment variable names and non-secret values, numeric Secret Manager references (not payloads), SQL attachment and backup/PITR settings, Firebase authorized domains/provider settings, Firestore rules and indexes, storage CORS/access settings, existing IAM bindings, enabled APIs, build configuration/result and available logging/retention settings. Record resources that are absent, unreadable, or outside scope rather than claiming a complete project audit.

Record artifact/source hashes, release actions, validation results, URLs, and prior revisions/channels needed for rollback. Exclude credentials, tokens, secret payloads, personal application records and sensitive log bodies. Inspect environment values before persisting them; an innocuous variable name does not guarantee a safe value.

Before changing live traffic, verify exact staging targets, compatibility of the frontend/API pair, current secret and SQL attachment references, and deployment identity. Preserve existing IAM. Validate health/readiness, login and synthetic QA flows after each deployment step. Record actual outcomes, not planned actions as completed work.

## Completed staging release

Release completed on 2026-10-18 after the explicit CLI authorization.

| Item | Before | After |
| --- | --- | --- |
| Cloud Run revision receiving staging traffic | `promptify-intrepid-api-00004-chg` | `promptify-intrepid-api-00005-tez`, 100% |
| Container digest | `sha256:eef18a9a7d15cb2ab52c27a1c477ed1c5e8576bf0944e3333b6771d2b98983a1` | `sha256:6d192c6314515dbe8237fb241479e2844bc8708ac5e32160f87b770a5321910c` |
| Staging Hosting version | `19dac46d8dfe8ba1` | `3fe0c8430a40f330` |
| API runtime identity / env / secret references / resource specification | Baseline captured | Identical except container image |
| Project, API, bucket and runtime-secret IAM | Baseline captured | All compared policies unchanged |
| SQL attachment / settings, Firestore rules, CORS, Firebase domains/provider | Baseline captured | Compared configurations unchanged |
| Default Hosting site | No releases | Still no releases |

New revision was deployed at zero default traffic with tag `revised-ui-review`, tested, then promoted to 100% staging traffic. The tag remains available for inspection. Firebase CLI deployed `--only hosting --config firebase.staging.json --project ai-transformation-510302`; its explicit site prevents accidental default-site release. No rules/indexes deployment, IAM change, migration, provider activation, scheduler activation, production data write or Vercel operation was performed.

### Runtime configuration retained

- API: 1 vCPU, 1 GiB RAM, concurrency 80, timeout 300 seconds; service maximum instances 1. Existing revision scaling annotations remain unchanged. Runtime mode `api`.
- SQL: PostgreSQL 18, tier `db-custom-2-8192`; deletion protection enabled, daily backups at 03:00, seven retained backups, PITR and seven-day transaction log retention. Existing public-IP/connector/SSL settings retained.
- SQL runtime env: Unix socket `/cloudsql/ai-transformation-510302:asia-southeast1:promptify-staging`, DB `promptify_db`, user `promptify_runtime`, pool maximum 5; password only `intrepid-db-password:1` reference.
- SOP bucket `ai-transformation-510302-intrepid-sop-staging`; warehouse flag false. Model/budget settings were not added.
- Logging bucket retention: `_Default` 30 days; `_Required` 400 days, unchanged. No logging export or audit policy was enabled/modified.

### Validation and evidence

- Candidate revision: `/health` and `/readyz` 200; unauthenticated product/generate/evaluate 401; index/routes/entry assets match local build.
- Promoted API: same HTTP checks passed. `/readyz` performs connectivity `SELECT 1`, not application data writes.
- Staging Hosting: 22 checks passed, including anonymous API guards, SPA responses for UI-04/05/11, and byte-for-byte equality for all 15 deployed JS/CSS assets. SPA HTTP responses do not prove rendered layout or authenticated interactions.
- The initial candidate smoke used `/healthz`, which returned an HTML 404 through the public Cloud Run endpoint; `/health` returned the application's JSON 200. The smoke script was corrected to use the established `/health` endpoint; application code was not changed to hide this observation.
- `comparison.json`: all 20 compared invariants passed, including IAM, runtime spec except image, SQL settings/attachment, domains/provider/rules/bucket configuration and default-site release history.
- Before and after manifests report successful capture for all 29 inventory categories. Cloud Asset indexes provide the broader resource and IAM discovery scope; detailed exports focus on the application dependencies listed above. This is not an independent compliance certification or proof that every unrelated GCP resource was configured securely.
- Browser computer-use remains unavailable. The user has agreed to check Chrome; authenticated login, Hub/Save/Compare/badge and Studio after cloud deployment are **pending user confirmation**. Prior local/staging UI tests do not replace that final deployed-browser check.

Evidence files: `image.json`, `hosting-deploy.json`, `api-candidate-http-checks.json`, `api-live-http-checks.json`, `hosting-live-http-checks.json`, `comparison.json`, `before/`, `after/`, and an integrity manifest in the app-local release evidence folder. Source helper scripts remain app-local under `scripts/`; `firebase.staging.json` is the explicit staging Hosting config. Pre-existing repository changes have been preserved; nothing committed or pushed.

### Recovery references — not executed

If rollback is requested, API staging traffic can be returned to `promptify-intrepid-api-00004-chg` using `gcloud run services update-traffic promptify-intrepid-api --project ai-transformation-510302 --region asia-southeast1 --to-revisions promptify-intrepid-api-00004-chg=100`. Restore the staging Hosting site to its retained version `19dac46d8dfe8ba1` through its release history. Review current state before rollback; do not delete revisions, reset secrets, alter IAM, restore SQL or discard any subsequent staging data as part of a UI rollback.

