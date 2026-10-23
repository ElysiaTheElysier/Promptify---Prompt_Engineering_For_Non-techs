# Staging access, Workspace and load audit — 2026-10-20

Production remains blocked. The requested capacity is **100 concurrent users and 100 simultaneous Run + Judge pipelines**. This audit does not certify that target. No production deployment, IAM grants, role changes, score edits or lowered completion conditions were performed.

## Deployed changes

- API revision `promptify-intrepid-api-ar2-1020`, image `sha256:291f2183a0e4dbe78ff0768f34afd85580b1a85685701b69ff6d55305558dfd9`, build `044df439-99de-48fb-ad06-05f0c63ddae7`. Previous staging revision `promptify-intrepid-api-sopcheck-1020` remains the rollback target. The first `ar-1020` candidate was superseded before promotion.
- Enabled keyless Workspace reads using the existing runtime service identity and its existing delegation. No service-account JSON key or IAM changes. A real app-authenticated admin request successfully read the supplied Sheet's 32 header columns and its Drive MIME metadata.
- Added explicit class/source-kind bindings before Sheet registration, manual sync, Drive folder browsing, direct Drive ingestion and approval-time ingestion. Missing bindings fail closed with 403. Worker code has the same source check; the worker service was **not deployed or newly enabled**. `WORKSPACE_SOURCE_BINDINGS_JSON` has no live source approvals yet. Admin-only header inspection is diagnostic and does not import/publish data.
- Added the Table layout adapter for the supplied roster schema, keeping the six-tab layout. Rows are scoped to a selected department. No inferred employee names, employee IDs or Head roles. Unknown SOP department mappings are excluded and counted rather than guessed. Local schema validation found 393 unmapped asset-department rows; these require an explicit business mapping.
- Corrected hourly AI admission quota errors from generic 409 to actionable 429 without changing the existing limits: 40/hour, 200/day per identity. Frontend distinguishes this from provider capacity errors and explains unapproved Workspace sources in English/Vietnamese.
- Staging-only QA entry uses the ordinary app authentication/API. No token export, custom Firebase identity or bypass. It is excluded from the production build and has no ordinary app menu entry.

## Validation and Hosting release

49/49 explicitly allowlisted offline checks passed, including actual-handler/PGlite source-binding and quota-status regressions. Typecheck, lint, app boundary guards, staging build and local smoke passed. Existing Workspace type-cycle and bundle-size warnings remain. A separate local production build excluded the QA entry; no production build was deployed.

Final Hosting version `6bc8c6d9bb6c4aa9` (25 public files), previous `bf274db45915e5f0`. The Firebase CLI refresh flow failed; the final release used the official Hosting REST operations with the existing short-lived gcloud operator credential held only in memory. Existing API rewrite, headers and SPA routing were preserved. No new credential was issued and no default Hosting release was created.

## Actual signed-session evidence

Primary fictional class: `4a5a763a-b1b5-4676-88ca-81f4805fb321`; shadow class: `b26b1ee6-3932-4c13-bc3d-bfe0515408dc`.

- Admin: foreign published source, guessed source and unknown lesson IDs all returned 403.
- Head `kangseobi123@gmail.com`: those checks plus unassigned shadow class, Studio write and company Workspace inspection all returned 403.
- Learner `manhmanh100127@gmail.com`: the Head negative matrix plus another learner's award ID all returned 403. Actual identities were observed in API snapshots. No private response contents were exported.
- Concurrent own-admin draft saves at the same revision produced one success and one 409; the original empty QA draft was restored. Concurrent personal Save requests produced one row, one conflict and a stable replay ID. The synthetic personal library fixture is retained for evidence.
- A synthetic foreign SOP document/version was seeded only into the shadow class for object-ID probes. This setup is maintenance SQL, not evidence of signed-user authorization. Its canary was never returned through the primary class.

## Load results and limits

100 simultaneous authenticated snapshots using **one** real admin identity: 100 completed, zero errors, p50 3185 ms, p95 4260 ms, p99 4331 ms. This is not 100 distinct sign-ins.

One bounded 100-pipeline AI probe used the actual sandbox generation/supervisor/parallel-criterion Judge engine with `gemini-3.8-flash`, no harness retries, no learner score/award writes. It took 40.78 seconds overall:

- Database reconciliation: 100 submitted; 40 admitted and generated; 38 evaluations saved; 60 unadmitted because of the correct 40/hour identity limit.
- Of the 40 admitted, one Judge returned 429 capacity rejection and one returned 504 timeout. These remain unresolved capacity/recovery evidence; do not rerun uncertain request IDs blindly or clear claims to force a pass.
- Completed pipeline p95 31.166 seconds; scores 9.63–10, standard deviation 0.1785. Generated outputs can differ, so this is not a same-input deterministic-grading certification.
- This probe proves admission protection and exposes AI limits; **it does not prove 100-user capacity**. Do not remove identity limits or fabricate 100 Firebase identities to obtain a passing report. A further bounded test needs independently authenticated QA participants or an explicitly designed isolated service load harness, plus provider-capacity/queue work. No paid provisioned throughput was purchased.

## Monitoring and governance

Configured two staging HTTPS uptime checks and two alert policies targeting `duonglh.work@gmail.com`, using existing operator permissions. A paginated 10-minute metrics read observed successful samples for both checks from five checker locations, zero failed samples in that window. Email delivery has not been verified; no artificial outage or manual test email was sent.

Before/after captures include project/API/bucket/secret IAM, service accounts, Cloud Run specs, SQL settings/backups, Firebase auth/domains, Hosting releases, Firestore rules, APIs, logging and asset inventory where readable. Existing compared IAM, SQL settings and default Hosting releases were unchanged. The API image and keyless Workspace environment value are expected changes.

**One inventory delta must remain visible:** a default private `ai-transformation-510302_cloudbuild` source bucket was automatically created by build submission. Existing bucket records were unchanged, no buckets were removed, and its recorded default IAM has no `allUsers`/`allAuthenticatedUsers` member. No manual bucket IAM edit or cleanup deletion was made. Consequently `comparison.json` correctly reports `storage-buckets: unchanged=false`; do not describe the whole comparison as all unchanged. Future builds should explicitly use the existing `ai-transformation-510302-intrepid-build-staging` source bucket.

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-20-access-roster/`. No raw source workbook, employee rows, passwords, bearer tokens, service keys or SOP source contents are included in the evidence archive. The original company Sheet was inspected read-only and was not edited or imported into the fictional class.

## Remaining production blockers

1. Resolve provider capacity/timeout behavior and validate the real 100-user/100-run workload, including sustained load and recovery. Do not claim success from `/readyz`, one identity or only completed requests.
2. Obtain a **staging folder and synthetic roster copy**, configure explicit class/source bindings, then prove Drive folder discovery → ingestion → approval/indexing → learner retrieval and roster add/update/removal/idempotent sync. The supplied real Sheet header check is not this acceptance test.
3. Confirm business mappings for SOP categories that differ from roster department names; never silently grant access based on category guesses.
4. Verify actual alert email delivery and rehearse restore with agreed RPO/RTO/budget. Earlier instructor questions remain available.
5. Select and acquire an available `.ai` domain before DNS/production onboarding. No domain was purchased or DNS changed. `promptify.ai` is not established as available.

Theme, logo, colors and fonts were preserved. No unrestricted-production readiness claim is warranted.
