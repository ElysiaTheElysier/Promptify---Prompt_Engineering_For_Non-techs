# Production readiness — 2026-10-20 follow-up

Latest evidence and current revision: [access, Workspace and load audit](STAGING_ACCESS_ROSTER_LOAD_2026-10-20.md). The earlier baseline and open-item counts below are historical.

**Decision: not ready for unrestricted production.** Functional course acceptance and mobile layout checks are substantially complete, but operating ownership, restore rehearsal, sustained authenticated/AI capacity and the full adversarial role matrix remain open. User target: **100 concurrent users**, now explicitly includes 100 simultaneous AI Run + Judge pipelines; this target is not yet validated.

## Fixed and deployed in this audit

Found a real source-authorization freshness bug: the fallback SOP search path read chunks before an awaited operation and could return them after their lesson binding had been removed. Added a second class/lesson binding read after retrieval/embedding, intersected it with the original versions and filtered the returned chunks. The pgvector path also receives the current intersection; the BigQuery path retains its existing fresh canonical-source validation.

The existing actual-handler/PGlite authorization test now inserts a canonical source, proves it is searchable, then deterministically removes the binding immediately after the chunk read. The pre-fix test failed by returning the removed canary; the post-fix test returns an empty result. All manipulation is offline; no staging source was unpublished or replaced to manufacture this test. This closes that reproduced race, not every possible revocation/concurrency scenario. Previously issued signed download URLs still have their intended five-minute lifetime.

Staging rollout:

- Build `4763cb01-a7ab-440c-86b8-ba5dc29b5e48`.
- Candidate checked at zero main traffic before promotion.
- Active revision **`promptify-intrepid-api-sopcheck-1020`**, 100% staging traffic.
- Image `sha256:da9761144deae2a541cf1adb22dadddcb0cd5b0bfd1ab77ceb36001e706ae77b`.
- Rollback revision `promptify-intrepid-api-sopdl-1019` remains available; no schema/data rollback is required for this code patch.
- Thin image copies only `productionServerService.ts` over the pinned, previously accepted API image. No dependency or runtime configuration changes.
- Hosting unchanged at **`bbac58c8ff52b829`**. Gemini generation/Judge remain **`gemini-3.8-flash`**, parallel strategy unchanged; separate embeddings remain unchanged.

## Evidence refreshed

| Area | Result and limits |
|---|---|
| Automated validation | 47/47 offline tests; typecheck, lint, boundaries, staging build and smoke pass. Existing cycle/bundle warnings remain. |
| Candidate and active API | Five checks each: health, SQL readiness, missing/invalid bearer denial, untrusted preflight denial. These do not impersonate a signed-in learner. |
| Capacity micro-probe | Candidate readiness endpoint, 5→25→50→100 concurrent requests, 180 total, zero failures. At 100: p50 201 ms, p95 280 ms, p99 290 ms. SELECT 1 only; **not 100-user authenticated course or AI-load acceptance**. |
| Signed app smoke | Existing admin session refreshed the fictional Workshop after promotion; class data and Gemini label loaded. No new paid learner Run/Judge or grade writes in this audit. |
| Post-promotion logs | 17 staging HTTP request metadata rows in the captured window, zero 5xx, no extra page. Finite window, not an uptime/SLO guarantee. Query strings/identities/headers/content excluded. |
| Governance | 21/21 comparisons pass: IAM, SQL settings/attachment, secrets metadata, auth domains/provider, rules, storage and default Hosting unchanged; expected staging revision verified. Hosting asset/route/API checks 23/23 pass. |
| Operations | Fresh paginated inventory: 0 alert policies, 0 uptime checks, 0 notification channels. |
| Backup | Successful recent automated backups/PITR configuration; zonal instance. **Restore has not been rehearsed**. |
| Effective permissions | Current operator has all six tested create/restore/backup-read Monitoring/SQL permissions. No IAM changes needed or performed for this audit. |
| Dependencies | npm production audit still reports 3 moderate entries in the Mammoth CLI→argparse→sprintf-js chain, 0 high/critical. No safe patched version proposed by current audit; no forced downgrade/major override. Existing DOCX runtime acceptance remains separate. |

## Remaining launch gates

| Priority | Missing evidence/decision | Next action |
|---|---|---|
| P1 | Alert recipient/operator and proved notification delivery | Agree named primary/backup and hours, configure staging checks/policies, demonstrate delivery. No channel/notification created or sent yet. |
| P1 | Tested restore and recovery objectives | Agree acceptable data loss, recovery time and temporary-instance cost cap; restore a staging backup to a separate target and validate data/access/SOP references. Do not restore over staging or production. |
| P1 | 100-user course/AI load, latency, variance and global cost limits | Define simultaneous AI demand, approved identities and provider-call/token/cost budget; measure staged sustained load and repeated fixed-rubric consistency. Current max instances 1, request concurrency 80, SQL pool 5; settings were not raised without evidence. Actor hourly budgets alone are not a global capacity/cost guarantee. |
| P1 | Full deployed direct-object/concurrent authorization matrix | Prior signed learner/peer/Head/admin UI isolation and offline handler/SQL tests pass within documented scopes. Foreign object writes, revocation/replacement races and duplicate operations still require broader deployed signed-session verification. Do not equate hidden UI controls with server enforcement. |
| Launch decision | Production ownership, permitted data/retention, configuration and promotion approval | Collect instructor decisions and review a separate production runbook. No production project/configuration was mutated by this audit. |
| Conditional feature gate | Drive/Sheets/roster integration | Runtime identity remains unconfigured. Supply an approved existing Workspace identity plus staging folder/sheet with existing permissions, or exclude integration from launch. |
| P2 | Physical device/accessibility/network coverage | Browser matrices pass; real iOS/Android keyboard, safe areas, screen reader, reconnect/session expiry and long-content acceptance remain. |
| P2 | Moderate dependency advisory | Track the upstream fix and runtime reachability; retain the residual rather than claiming a clean inventory. |

No alert threshold, recovery objective, AI load budget, user role, score, rubric, IAM policy or production state was invented or changed.

## Handoff and evidence

User-ready questions: [PRODUCTION_QUESTIONS_FOR_INSTRUCTOR_2026-10-20.md](../proposals/PRODUCTION_QUESTIONS_FOR_INSTRUCTOR_2026-10-20.md).

Prepared operational steps: [STAGING_OPERATIONS_PLAN_2026-10-20.md](../proposals/STAGING_OPERATIONS_PLAN_2026-10-20.md). Monitoring configuration follows the linked Google documentation there; it remains unapplied pending recipient/operating decisions.

Evidence directory: `apps/promptify-intrepid/outputs/staging-release-2026-10-20-readiness-audit/`. Contains before/after inventory, old failing/new passing race test logs, build/image/candidate/promotion records, capacity and HTTP checks, metadata-only request logs, current backup/monitoring/permission inventory and validation logs. Secret/token values excluded/redacted; ZIP plus manifest/SHA256 accompany it.
