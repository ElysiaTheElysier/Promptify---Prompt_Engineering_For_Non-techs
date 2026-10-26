# Judge load test on staging infrastructure — runbook v2 (2026-10-26, nothing applied)

Everything is NEW and dedicated; nothing existing is modified: no change to `promptify-intrepid-api`, its traffic, Hosting,
the `promptify-staging` SQL instance, `promptify_db`, the `promptify-judge-staging` queue, the `promptify-api` service
account, or any existing IAM binding. No `allUsers`. No Gemini (stub + runtime SA without any Vertex role).

## Isolation design
| Layer | Load test | Why it cannot touch staging |
|---|---|---|
| Cloud Run | `promptify-judge-loadtest`, **private** (Cloud Run IAM), maxScale 5, concurrency 40 | Hosting never routes to it; only 2 principals may invoke it |
| Runtime identity | SA `promptify-loadtest-run` | no role on `promptify-staging`, its secrets, Storage, BigQuery, Firebase or Vertex |
| Database | dedicated instance `promptify-loadtest` / db `promptify_loadtest` | runtime SA's `cloudsql.client` is conditioned to this instance; staging DB password is not readable |
| Queue | `promptify-judge-loadtest`, tasks OIDC-signed by SA `promptify-loadtest-tasks` | the staging queue/worker are never addressed |
| Identity | `lt1.` HMAC tokens (secret in Secret Manager) | accepted only with stub + staging ack + `PGDATABASE=promptify_loadtest` **and** `current_database()='promptify_loadtest'`; refused before Firebase everywhere else; staging main does not even run this code |
| Provider | `AI_PROVIDER=stub` | no Gemini key, no `aiplatform.*` permission (a misconfigured stub fails closed) |
| Client | `scripts/loadtestJudgeClient.mjs` | refuses any URL except `promptify-judge-loadtest-*.a.run.app`; requires an operator ID token (`X-Serverless-Authorization`) |

## Exact IAM (all resource-scoped; G3)
| Principal | Role | Resource |
|---|---|---|
| `promptify-loadtest-run@ai-transformation-510302.iam.gserviceaccount.com` | `roles/cloudsql.client` | project, **IAM condition** `resource.name == "projects/ai-transformation-510302/instances/promptify-loadtest"` |
| same | `roles/secretmanager.secretAccessor` | secrets `promptify-loadtest-db-password`, `promptify-loadtest-identity` |
| same | `roles/cloudtasks.enqueuer` | queue `promptify-judge-loadtest` |
| same | `roles/iam.serviceAccountUser` | SA `promptify-loadtest-tasks` (lets it set the task OIDC identity) |
| `promptify-loadtest-tasks@…` | `roles/run.invoker` | service `promptify-judge-loadtest` |
| operator `demo.biz@intrepid.asia` | `roles/run.invoker` | service `promptify-judge-loadtest` |
| operator (deployer) | `roles/iam.serviceAccountUser` | SA `promptify-loadtest-run` (only if not already implied by the operator's project role) |
Not granted: any Vertex/AI Platform, Storage, BigQuery, Firebase/Identity Toolkit, Drive, project-wide unconditional role, `allUsers`. If container logs do not appear, add `roles/logging.logWriter` (project) to the run SA — verify first.

## Approval gates
| Gate | Action | Rollback |
|---|---|---|
| G1 | Cloud Build overlay `app:judge-loadtest-20261026` = promo1 image + 11 server files (parallelJudgeService, productionAiService, rebuildRunService, judgeStreamService, cloudRunServer, cloudSchema.json, firebaseServerIdentityService, vertexAiService, providerStubService, loadtestIdentityService, judgeQueueService); diff vs base printed in the build log | unused tag |
| G2 | Create Cloud SQL instance `promptify-loadtest`: Enterprise, `db-custom-2-8192` (same as staging), ZONAL asia-southeast1, 10 GB SSD, no backups/PITR, no authorized networks (connector only); you set the `postgres` password | delete instance |
| G3 | Create SAs `promptify-loadtest-run`, `promptify-loadtest-tasks`; secrets `promptify-loadtest-identity` (generated locally, never printed) and `promptify-loadtest-db-password` (you choose); bindings in the IAM table | delete SAs + secrets |
| G4 | `gcp/loadtest/setup_loadtest_db.sql` via proxy on `promptify-loadtest` (refuses any instance holding `promptify_db`; prints `SHOW max_connections`; you type the `promptify_runtime` password = secret value) | drop instance |
| G5 | Queue `promptify-judge-loadtest`: maxConcurrentDispatches 8, maxDispatchesPerSecond 10, maxAttempts 3, minBackoff 10 s, maxBackoff 120 s, maxRetryDuration 900 s | delete queue |
| G6 | Deploy `promptify-judge-loadtest` from `outputs/loadtest-staging/service-spec.json` (`scripts/loadtestServiceSpec.mjs <captured service> <G1 digest>`), then set `JUDGE_WORKER_URL` to its own URL. Smoke: no token → 403 (Cloud Run), operator token + forged lt1 → 401, operator token + valid lt1 → stream | delete service |
| G7 | Run the matrix, then teardown: delete service, queue, instance, SAs, secrets | — |
Abort rule in G7: any `aiplatform` request from the run SA, any integrity counter ≠ 0, staging main error/latency change, or SQL CPU > 80 % on the load-test instance → stop client, set maxScale 0.

## Matrix (G7)
1. 10 burst, 30 burst, 100 burst, 100 spread 60 s (rounds 1–4; `reset_and_verify.sql mode=reset` between).
2. 100 spread 60 s with STUB_CAPACITY 30 / 120.
3. Faults: STUB_429_RATE 0.02; STUB_HANG_RATE 0.02 and 0.05 while polling `mode=verify` every 10 s (`held_now`).
4. Today's staging queue for comparison: queue 3/1, 100 spread 60 s.
5. Read Cloud Run instance_count/latency and Cloud SQL CPU/connections for each window (Monitoring, read-only).
Pass criteria: integrity all 0 with graded = users; 100 spread 60 s p95 < 15 s; 0 aiplatform calls; staging main unchanged.

## Connections (item 4)
- Load test max: 5 instances × PGPOOL_MAX 10 = 50 (+ setup/verify sessions) on its own instance; `max_connections` is printed in G4 (local check: script works and prints it). Staging main is not on this instance, so no impact.
- Pre-existing staging main risk (unchanged, not part of this test): maxScale 100 × PGPOOL_MAX 5 = 500 possible connections vs the staging instance's `max_connections` (to read with `SHOW max_connections` in a staging session).

## Held admission permits (item 5)
- Mechanism (CODE): a call that times out has an unknown outcome, so its admission permit stays `running` until its lease ends (≈ attempt cap 25 s + 30 s grace ≈ 55 s), then expires on the next enqueue/acquire. The circuit breaker only counts settled failures, so hangs do not open it.
- OFFLINE (3 instances, admission 48, queue 8/10, 100 users over 60 s): 2 % hangs → p95 15.0 s; 5 % → p95 38.0 s (max 85.8 s: 4 jobs waited a 30 s queue backoff); 15 % with admission 12 → p95 198 s. Every run: all graded, 0 lost, permits back to 0 after their leases.
- Plan: size headroom ≈ base + hang-rate × provider calls/s × 55 s (100 grades/min ≈ 10 calls/s; 2 % hangs ≈ +11 permits); minBackoff 10 s on the judge queue (tail driver); alert on permits `running` > 30 s and on uncertain provider calls > 2 %. Shortening the 30 s grace or the 25 s attempt cap needs owner approval (admission is Codex-owned; staging Flash calls have reached 20 s).

## Cost (estimates; list prices not verified)
Cloud SQL `db-custom-2-8192` ≈ US$0.15–0.20/h → a 4–6 h test window ≈ US$1; **≈ US$120/month if left running — teardown is part of G7**. Cloud Run ≤ 5 × 1 vCPU while testing: < US$1. Cloud Tasks, Cloud Build, Secret Manager: within free tiers. Gemini: US$0.

## Verified offline
82/82 tests (incl. OIDC task body, private least-privilege spec, client refusals, lt1 env + runtime-database guards, stub, multi-instance, fault injection); setup script on a fresh local cluster (creates role, migrations, seed, prints max_connections; refuses a cluster holding `promptify_db`); real-HTTP rehearsal with the load-test env (10/10 graded, forged token 401).
