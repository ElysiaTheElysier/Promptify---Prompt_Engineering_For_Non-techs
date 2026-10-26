# AI Judge latency — quota, root cause, production plan (2026-10-26)

Evidence labels: LIVE = staging logs/quota read 26/10 (read-only, 0 AI calls); BENCH = scripts/benchmarkJudgeArchitectures.ts (real Vertex calls); OFFLINE = local tests; unknown = not verified.

## 1. Quota (LIVE)
- Project `ai-transformation-510302`, `VERTEX_LOCATION=global`, model `gemini-3.8-flash`.
- `GlobalGenerateContentRequestsPerMinutePerProjectPerBaseModel` has no entry for gemini-3.8-flash (41 entries; default `{}`=5 does not bind: BENCH ran ~18 RPM with 0×429). Token-per-minute quotas are `-1` (unlimited) by default.
- Conclusion: gemini-3.8-flash runs on Google's **Dynamic Shared Quota** (shared pool, no reserved capacity). No quota preferences/increase requests exist. Provisioned Throughput: not checked (unknown whether the project has an order or whether it is purchasable for this model/region).
- 429 RESOURCE_EXHAUSTED in 7 days: 3 (all 23/10 10–11h UTC). Usage is tiny (9 Judge jobs, 15 dispatches in 7 days), so 429/hangs are shared-pool contention, not our own load.

## 2. Why grading took minutes (LIVE, 23/10)
| Signal | Value |
|---|---|
| Queue wait (Cloud Tasks → worker) | 0.11–0.22 s |
| Successful jobs, evaluate time | 3.6 / 7.0 / 14 / 51 / 99 / 142 s |
| Failed jobs | 3 jobs × 3 dispatches × 270 s ≈ 11 min each, then fail |
| Single calls in failed jobs | normal 2–11 s; others 76–257 s or no answer by 270 s; some 429 |

Root cause: each grade needs all 6 calls; each call could wait the whole 270 s deadline; a failure retried the whole job (all 6 calls) up to 3 times. BENCH on 26/10: all calls 2–6 s, A shows first criterion at 2.5 s, all five at 3.5 s.

## 3. Fixed in code (OFFLINE, not deployed)
1. **Per-attempt cap 25 s + hedge at 10 s** (`parallelJudgeService.ts`): a stage still unanswered after 10 s starts its one extra attempt; first success wins. 429/503/504 retry only that stage, once. Worst stage ≈ 35 s instead of 270 s; healthy grades are unchanged (no duplicate calls). Every attempt still takes its own admission permit. Cost: a hedged loser keeps its permit/billing until it settles (≤25 s).
2. **Run no longer auto-grades**; learner clicks *Chấm điểm AI*.
3. **Per-criterion streaming** via `/api/judge-stream` (`JUDGE_STREAM=true`, sync Judge only); client falls back to queue + polling.
Model, `parallel-v1`, `weighted-v1`, anchors, thresholds and quotas unchanged.

## 4. Production standard (recommended order)
| # | Action | Owner | Effect |
|---|---|---|---|
| 1 | Deploy §3 to staging; measure p50/p95 click→first criterion and →all five over ≥30 real grades | Claude + owner | Proves tail fix (target: p95 all-five < 15 s) |
| 2 | Alerting: log-based metric on `parallel_judge_failure`, `provider_rejection` 429, `judge_job_metrics.evaluateMs` p95 | Ops | No silent multi-minute failures (no alerts today) |
| 3 | Capacity: ask Google account team for **Provisioned Throughput** (or a quota/priority option) for gemini-3.8-flash; price unknown | Owner (billing) | Removes shared-pool contention — the real production fix |
| 4 | Persist finished criteria per job so a redispatch grades only missing ones (needs migration) | Codex (SQL) | Retries cost 1 call instead of 6 |
| 5 | Gold set (≥50 graded attempts) → compare A vs B quality; B = 2 calls (3× fewer, most stable tail in BENCH) | Trainer + Claude | Lower load if quality holds; needs approval |
| 6 | Optional regional fallback endpoint for 429/503 when PT is absent (needs model availability check) | Codex | Availability under pool exhaustion |

## 5. Rollout / rollback
- Hosting first (client is safe: `/api/judge-stream` 404 → old queue path). Then API with `JUDGE_STREAM=true`, `JUDGE_MODE=sync` (stream needs the sync Judge; deadline 50 s). Keep `VITE_STREAM_API_URL` as for generation stream.
- Rollback: previous API revision + `JUDGE_MODE=async`; Hosting previous release. No migration involved.

## 6. Update 26/10 — async streaming implemented (OFFLINE, not deployed)
- `JUDGE_MODE=async` kept. `/api/judge-stream` (flag `JUDGE_STREAM=true`) enqueues once (same budget/claim/fencing as `judge`), then follows the durable job and sends `status`/`criterion`/`done`|`resume`|`error`. `resume:true` (reload) only watches, never enqueues or charges. Watch window 240 s, then `resume` → client polls `judgeStatus`, which now also returns verdict-gated `criteria`.
- 020 `product_judge_stage_results` (+rollback): worker stores each validated stage keyed by payload SHA-256; redispatch/new job grades only missing stages. Missing table ⇒ old behaviour.
- Anti-storm: ≤2 attempts per stage, 429/503 retry jittered 0.5–1.5 s, hedging paused 30 s process-wide after any 429/503, job-level redispatch reuses finished stages.
- Rollout: apply 020 → API with `JUDGE_STREAM=true` (keep async) → Hosting with `VITE_STREAM_API_URL`. Rollback: Hosting → API (flag off) → 020 rollback.
