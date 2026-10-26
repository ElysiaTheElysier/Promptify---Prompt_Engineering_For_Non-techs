# AI Judge capacity — bottlenecks, simulation results, 100-user recommendation (2026-10-26)

Evidence: CODE, OFFLINE (tests + `scripts/judgeLatencyHarness.ts` on a throwaway loopback PostgreSQL 18 with a real `pg` pool,
modelled Firebase 180 ms, Cloud Tasks create 200 ms + dispatch 100 ms, SQL RTT 0.5 ms/statement, Gemini lognormal from staging
26/10: supervisor p50/p95 2151/3250 ms, criterion 2279/3592 ms), LIVE (staging 26/10, 33 grades). **No Gemini, Cloud Tasks,
Cloud SQL or staging change.** Raw results: `apps/promptify-intrepid/outputs/judge-latency-harness/native-matrix-2026-10-26.jsonl`.
Local PostgreSQL on Windows is slower per transaction than Cloud SQL; compare rows with each other, not with production.

## 1. Changes made (OFFLINE, not deployed)
| Area | Before | After |
|---|---|---|
| Identity per stream | 4 Firebase verify(checkRevoked) + 4 binding tx | 1 per request (`withRequestIdentity`); every new request re-checks revocation |
| Enqueue resolver | generation `context()` (lesson+resources+rubric+studio+class+**all SOP text**) | `judgeContext()`: same gates (UUID, class/lesson access, identity, Codelab schedule), 3 parallel reads |
| Enqueue reads | sequential | expiry/ownership/run in parallel, errors in the old order |
| First status | after first watch read | right after the job exists; watcher skips a second ownership read after enqueue |
| SSE watch | every stream: 6 sequential tx / 500 ms | **shared per-instance hub**: 2 `IN(...)` reads per 250 ms for all streams; per-stream ownership on first read; lost-worker recovery every 8th read |
| Progress before verdict | nothing | `progress {graded}` (count only); UI always shows "n/5 tiêu chí" (fixes lost k/5) |
| CORS preflight | each click | cached 600 s |
| Worker pre-grade reads | sequential | parallel |
Scores still appear only after a positive task-alignment verdict; quota, idempotency, fencing, model, parallel-v1, weighted-v1 unchanged.

## 2. Single user (OFFLINE harness, PGlite)
click→status p50 2333 → 1162 ms; click→first criterion 4843 → 4076 ms; done 6259 → 5428 ms.

## 3. Load matrix (native PostgreSQL, one API instance, everybody clicks at once unless noted)
Columns: enqueue = click→first status; queue = job created→worker lease; exec = worker grading time; pool = connection acquire;
busy = average pool use; tx/grade = SQL transactions per grade.
| Run | users | queue conc/rate | provider | pool | enqueue p50 | queue p50/p95 | exec p50/p95 | pool p95 / busy | done p50/p95 | grades/min | 429 | tx/grade |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| before hub, current queue | 100 | 3 / 1 s | ∞ | 5 | 12.6 s | – | – | – | 115 / 173 s | 33 | 0 | 135 |
| hub, current queue | 10 | 3 / 1 | ∞ | 5 | 1.8 s | 5.7 / 11.9 s | 3.6 / 4.2 s | 0.2 s / 28 % | 11.1 / 17.8 s | 34 | 0 | 43 |
| hub, current queue | 30 | 3 / 1 | ∞ | 5 | 5.0 s | 20 / 38 s | 3.5 / 4.3 s | 0.8 s / 33 % | 27.6 / 47.0 s | 37 | 0 | 43 |
| hub, current queue | 100 | 3 / 1 | ∞ | 5 | 15.8 s | 72 / 130 s | 3.4 / 4.6 s | 3.1 s / 34 % | 91.5 / 150 s | 38 | 0 | 44 |
| hub, 50/20 | 10 | 50 / 20 | ∞ | 5 | 1.7 s | 0.6 / 0.9 s | 3.8 / 4.2 s | 0.3 s / 54 % | 6.7 / 7.5 s | 80 | 0 | 37 |
| hub, 50/20 | 30 | 50 / 20 | ∞ | 5 | 5.1 s | 1.3 / 2.1 s | 4.3 / 5.3 s | 1.1 s / 85 % | 12.7 / 13.4 s | 130 | 0 | 35 |
| hub, 50/20 | 100 | 50 / 20 | ∞ | 5 | 15.4 s | 3.9 / 15.7 s | 5.9 / 8.0 s | 3.0 s / 96 % | 32.3 / 36.9 s | 161 | 0 | 33 |
| 50/20, Gemini 429 above 60 | 30 | 50 / 20 | cap 60 | 5 | 5.0 s | 1.3 / 2.1 s (max 38.8) | 5.3 / 8.0 s | 1.0 s / 28 % | 13.2 / 17.7 s | 39 | 123 | 38 |
| 50/20, Gemini 429 above 60 | 100 | 50 / 20 | cap 60 | 5 | 15.8 s | 16 / 54 s | 6.0 / 9.7 s | 3.1 s / 59 % | 38.5 / 71.9 s | 81 | 638 (52 %) | 38 |
| 50/20 + admission 48 | 100 | 50 / 20 | cap 60 | 5 | 16.2 s | 35 / 54 s | 25 / 42 s | 7.2 s / 92 % | **91 failed** | 50 | 0 | 86 |
| 20/10 + admission 48 | 100 | 20 / 10 | cap 60 | 5 | 15.7 s | 41 / 64 s | 8.9 / 21 s | 2.9 s / 95 % | 67.5 / 87.0 s | 67 | 0 | 68 |
| 50/20, pool 15 | 100 | 50 / 20 | ∞ | 15 | 3.8 s | 3.5 / 7.9 s | 3.4 / 4.4 s | 0.7 s / 63 % | 10.9 / 16.4 s | 366 | 0 | 35 |
| **aligned: 8/10 + admission 48, pool 15** | 10 | 8 / 10 | cap 60 | 15 | 0.6 s | 0.8 / 4.6 s | 3.8 / 5.4 s | 0.06 s / 27 % | 5.4 / 9.3 s | 64 | 0 | 54 |
| aligned | 30 | 8 / 10 | cap 60 | 15 | 1.3 s | 6.1 / 13.4 s | 4.0 / 4.8 s | 0.19 s / 38 % | 10.8 / 19.4 s | 93 | 0 | 53 |
| aligned | 100 | 8 / 10 | cap 60 | 15 | 3.7 s | 25 / 49 s | 4.0 / 5.1 s | 0.59 s / 44 % | 33.0 / 57.3 s | 99 | 0 | 55 |
| **aligned, 100 users over 60 s** | 100 | 8 / 10 | cap 60 | 15 | 1.0 s | 0.4 / 1.4 s | 3.8 / 4.6 s | 0 / 36 % | **5.4 / 6.7 s** (first criterion 4.1 / 5.2 s) | 93 | 0 | 53 |
| 20/10 over 60 s | 100 | 20 / 10 | cap 60 | 15 | 1.0 s | 0.4 / 0.4 s | 3.7 / 4.9 s | 0.02 s / 38 % | 5.2 / 6.4 s | 93 | 0 | 53 |
"cap 60" is an ASSUMED Gemini capacity (429 probability rises above 60 concurrent calls); real DSQ capacity is unknown.

## 4. What limits what
1. **Cloud Tasks 3 / 1 s (staging today)**: ~38 grades/min whatever else happens; 10 simultaneous clicks already miss p95 < 15 s.
2. **Gemini capacity**: raising the queue without a provider limit turns into 429 storms (52 % of calls at 100 users, 2× calls, 30 s queue backoffs). 6 calls × ~4 s per grade ⇒ ~4 concurrent provider calls·s per grade; 48 concurrent calls ≈ 3.5 grades/s at best.
3. **Admission polling vs pool**: admission is the right provider backpressure, but if the queue dispatches more jobs than admission admits, every waiting call polls SQL every 100–250 ms → pool collapse (91/100 failed). Keep queue concurrency ≈ admission concurrency / 6 so admission rarely waits.
4. **Pool 5 per instance**: enqueue bursts (≈13 tx each) queue on 5 connections (100 at once → 15 s); pool 15 → 3.8 s. With the hub, steady-state SSE watching is no longer the pool consumer (135 → 44 tx/grade).
5. Supervisor gate: scored rows cannot precede the verdict; the count does.

## 5. Recommended configuration (staging first; needs approval; nothing applied)
| Users (concurrent learners) | Cloud Tasks judge queue | Admission (013) | API instances / pool | Expected (model) |
|---|---|---|---|---|
| 10 | maxConcurrentDispatches 8, maxDispatchesPerSecond 10, maxAttempts 3, backoff 30–120 s | `PROVIDER_ADMISSION_MODE=sql`, concurrency 48, tokens_per_minute ≥ 2.5 M, max_backlog 500, tenant_backlog 20 | ≥1 instance, PGPOOL_MAX 10 | p95 done ≈ 9 s (all at once) |
| 30 | same | same | Cloud Run concurrency 40, min 1, PGPOOL_MAX 10 | p95 ≈ 7 s spread over a minute; ≈ 19 s if all click in the same second |
| 100 | same, or 12 / 15 with admission 72 **only if** Gemini capacity is confirmed (PT/quota) | concurrency 48 (72 with PT) | separate AI worker service (`AI_WORKER_ISOLATED`) so grading DB work never starves the API pool; API concurrency 40 → ≈3 instances × PGPOOL_MAX 10; Cloud SQL max_connections sized for maxScale × pool | p95 ≈ 7 s when 100 learners grade within a minute; ≈ 57 s if 100 click in the same second (provider-bound) |
Why not 50/20: without a provider limit it creates 429 storms; with admission but no queue alignment it collapses the pool.
tokens_per_minute must cover the conservative reservation (payload bytes + maxOutputTokens ≈ 22 k per grade): 100 grades/min ≈ 2.2 M; the 120 k default allows ≈ 5 grades/min.

## 6. Architecture for 100 concurrent users
- Async Judge stays: API (enqueue + SSE) → Cloud Tasks (rate/concurrency = first backpressure) → AI worker service (isolated pool) → admission (013, provider permits = second backpressure, one per attempt) → Gemini.
- SSE through the shared per-instance hub (done); next step Postgres LISTEN/NOTIFY on 020 + job settle to drop the 250 ms tick.
- Keep per-attempt stage persistence (020) so retries cost one call, not six.
- Alerts: queue age, provider 429 rate, admission backpressure/expired, Cloud SQL connections and CPU, parallel_judge_failure.
- For "100 clicks in the same second" with p95 < 15 s: ≈ 60 concurrent jobs ≈ 360 concurrent Gemini calls — only with Provisioned Throughput; otherwise show queue position honestly (the UI already shows "đang xếp hàng" and the count).

## 7. Staging validation plan (needs approval; no Gemini)
Add a staging-only provider stub (`AI_PROVIDER=stub`, latency + 429/hang injection) and run k6/SSE clients with synthetic learners at 10 → 30 → 100, burst and 60 s spread, with the §5 configuration; gates: p95 done < 15 s (spread), 0 duplicate jobs, 0 5xx, Cloud SQL CPU < 60 %, no pool waits > 1 s.

## 8. Production-path matrix with the provider stub (OFFLINE, 26/10 evening)
Same harness, now running `productionEvaluate → gemini() → admission → modelRequest` with `AI_PROVIDER=stub` (only the network replaced), several API/worker instances (own pool + own watch hub each, round-robin streams and dispatches), integrity read from SQL after every run. Throughput = completed grades / (last grade saved − first click). Results: `apps/promptify-intrepid/outputs/judge-latency-harness/load-results.jsonl`.
| Run (100 users unless noted) | Topology | Queue | Admission | Provider cap | Clicks | done p50 / p95 | queue p95 | exec p95 | 429 | calls/grade | Integrity |
|---|---|---|---|---|---|---|---|---|---|---|---|
| staging today | 1 × pool 5 | 3/1 | off | 60 | same second | 77.9 / 137.9 s | 122.9 s | 4.2 s | 0 | 6.0 | clean |
| staging today | 1 × pool 5 | 3/1 | off | 60 | over 60 s | 37.2 / 69.5 s | 64.3 s | 4.2 s | 0 | 6.0 | clean |
| aggressive | 3 × pool 10 | 50/20 | off | 60 | same second | 42.7 / 48.1 s | 44.0 s | 6.7 s | 1018 | **16.2** (66 queue retries) | clean |
| **aligned** | 3 × pool 10 | 8/10 | 48 | 60 | same second | 28.5 / 51.0 s | 45.1 s | 4.6 s | 0 | 6.0 | clean |
| **aligned** | 3 × pool 10 | 8/10 | 48 | 60 | over 60 s | **5.0 / 6.4 s** | 1.2 s | 4.6 s | 0 | 6.0 | clean |
| aligned, provider only 30 | 3 × pool 10 | 8/10 | 48 | 30 | over 60 s | 5.0 / 6.7 s | 1.4 s | 5.0 s | 12 (absorbed) | 6.1 | clean |
| under-sized | 3 × pool 10 | 4/10 | 24 | 30 | over 60 s | 21.4 / 39.8 s | 34.9 s | 4.7 s | 0 | 6.0 | clean |
| aligned, provider 120 | 3 × pool 10 | 8/10 | 48 | 120 | same second | 29.8 / 52.6 s | 47.0 s | 5.1 s | 0 | 6.0 | clean |
| high | 3 × pool 10 | 16/20 | 96 | 120 | same second | 22.3 / 38.6 s | 31.5 s | 6.9 s | 0 | 6.0 | clean (3 admission expiries retried) |
| high | 3 × pool 10 | 16/20 | 96 | 120 | over 60 s | 5.3 / 6.2 s | 0.4 s | 4.7 s | 0 | 6.0 | clean |
| aligned, unlimited provider | 3 × pool 10 | 8/10 | 48 | ∞ | over 60 s | 5.2 / 6.8 s | 1.6 s | 4.7 s | 0 | 6.0 | clean |
| aligned, 2 % hangs | 3 × pool 10 | 8/10 | 48 | 60 | over 60 s | 6.8 / 15.0 s | 6.8 s | 12.8 s | 0 | 6.1 (10 hedges) | clean; 9 permits held until lease expiry |
| aligned, 10 users | 3 × pool 10 | 8/10 | 48 | 60 | same second | 5.7 / 8.9 s | 4.2 s | 4.7 s | 0 | 6.0 | clean |
| aligned, 30 users | 3 × pool 10 | 8/10 | 48 | 60 | same second | 10.7 / 18.5 s | 13.9 s | 5.2 s | 0 | 6.0 | clean |
| aligned, 30 users | 3 × pool 10 | 8/10 | 48 | 60 | over 60 s | 5.2 / 6.0 s | 0.4 s | 4.5 s | 0 | 6.0 | clean |
"clean" = every stream ended `done`, one job per attempt (generation 1 except queue retries), graded = users, 0 lost grades, 0 open claims, stream total = DB total, workers: succeeded = users.

Fixes from this round: resume ownership denial now returns JSON 403 before the stream opens (was 200 + SSE error, no data leaked); stub/vertex import cycle removed; harness throughput formula fixed.

## 9. Safest staging configuration (needs approval before applying)
- Cloud Tasks `promptify-judge-staging`: maxConcurrentDispatches **8**, maxDispatchesPerSecond **10**, maxAttempts 3, backoff 30–120 s (unchanged).
- Admission: `PROVIDER_ADMISSION_MODE=sql`, concurrency **48**, tokens_per_minute **≥ 2,500,000**, max_backlog 500, tenant_backlog 20. Raise to 16/20 + 96 only after a provider capacity ≥ 120 concurrent calls is confirmed.
- API: Cloud Run concurrency 40, min instances 1, PGPOOL_MAX 10; Cloud SQL max_connections ≥ maxScale × 10 + headroom (cap maxScale accordingly). Prefer a separate AI worker service.
- JUDGE_STREAM=true (shared watch hub), stub only via `AI_PROVIDER=stub` + `PROVIDER_STUB_ACK=staging-load-test-only` on a dedicated staging revision with synthetic learners.
- Expected: 100 learners grading within a minute → p95 ≈ 6–7 s, 0 duplicates/lost grades, no retry storm; 100 clicks in the same second → p95 ≈ 50 s (provider-bound at 48 calls).
