# Staging operations plan — pending owner decisions

Target project `ai-transformation-510302`; API `promptify-intrepid-api`; SQL `promptify-staging`; Hosting `ai-transformation-510302-intrepid-staging`. Production and IAM are outside this work.

## Current verified state

- Monitoring inventory, with pagination: zero alert policies, uptime checks and notification channels.
- SQL is zonal; automated backups/PITR are configured and recent backups are successful. Restore rehearsal has not been performed.
- Read-only effective permission check returned all six requested permissions: Monitoring uptime check/alert policy/notification channel create, and Cloud SQL instance create/restoreBackup/backupRuns.get. Missing operational decisions are not evidence that IAM must be expanded.
- User specified 100 concurrent users. Whether that means 100 open sessions or 100 simultaneous AI runs is still to be confirmed.
- Current API has service-level maximum 1 instance, request concurrency 80, SQL pool maximum 5. Template-level maximum differs (100); the effective service-level limit must be considered before any scaling change. No limits were changed.

## Monitoring configuration to complete

After an owner/recipient and cost are agreed, configure only staging resources:

1. HTTPS frontend check against the named staging Hosting root and a separate HTTPS `/readyz` check against the staging API. The latter checks SQL connectivity; `/health` alone does not.
2. Alert on sustained readiness failures across checker locations. Proposed initial evaluation: 3 minutes of failure, subject to owner approval.
3. Service-scoped 5xx and p95 latency alerting for `cloud_run_revision` / `promptify-intrepid-api`. Define thresholds and minimum traffic before enabling; mixed AI and non-AI latency must not be mistaken for a single endpoint SLO.
4. Attach the approved notification channel and demonstrate delivery to the named recipient. A configured policy without a proven recipient is not a closed launch gate.
5. Record resource IDs, exact JSON, creator, before/after diff, test incident and recovery. Do not rotate keys or grant IAM as part of monitoring setup.

Official references: [Google uptime checks](https://docs.cloud.google.com/monitoring/uptime-checks), [JSON policy examples](https://docs.cloud.google.com/monitoring/alerts/policies-in-json), [Cloud Run SLI metrics](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics). This is a plan, not an applied configuration or a tested notification.

## Isolated restore rehearsal

Before creating resources, obtain acceptable data-loss window, recovery time target, temporary-instance cost cap, operator and retention/cleanup approval. Suggested sequence:

1. Capture the staging source instance and chosen successful backup ID; prohibit a restore command whose target is `promptify-staging` or any production instance.
2. Prepare a unique separate rehearsal instance in the approved project/region. Review inherited network/encryption/identity settings without changing IAM or opening network access.
3. Restore the selected staging backup into that separate target. Do not point the deployed app at it or switch production/staging traffic.
4. Validate schema/migrations, synthetic class counts and fixtures, permission isolation and SOP references. Restrict retained evidence to fictional fixtures; do not export full user data.
5. Measure backup recovery point and elapsed recovery time against the agreed targets. Verify external SOP originals separately; database restore alone does not recover deleted storage objects.
6. Retain or remove the rehearsal resources only under the agreed recovery/cleanup policy. Document resource IDs and costs. Do not claim a successful backup is a successful restore.

## 100-user performance acceptance

The bounded readiness burst performed in this audit checks infrastructure/SQL connectivity only. It is not authenticated course or AI capacity acceptance.

Prepare a staged 5→25→50→100-user scenario, with a fixed fictional lesson/prompt/rubric set and permitted test identities. Include sign-in/session refresh, snapshot, draft save, Run+automatic Judge, history, library and badge/certificate reads. Agree a total provider-call/token/cost cap and stop conditions before a sustained AI test. Do not mint substitute tokens or reuse another user's private session to impersonate 100 people.

Measure p50/p95/p99 and error rate separately for non-AI requests, generation and grading; SQL pool wait, provider quota/429/504, duplicate request handling, criterion-score variance, and cost per completed attempt. Repeat the same rubric cases to quantify consistency. Preserve actual scores and thresholds. Use backpressure/error handling evidence rather than raising instance limits without measuring provider and SQL constraints.

Owner decisions to collect are in `PRODUCTION_QUESTIONS_FOR_INSTRUCTOR_2026-10-20.md`.
