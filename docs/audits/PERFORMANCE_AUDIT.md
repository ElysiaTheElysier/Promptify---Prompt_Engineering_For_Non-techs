# Promptify — latency, throughput and cost audit

2026-10-23. **Judge-to-visible-five-criteria below 10 seconds is unproven.** No real provider benchmark was run in this audit. Model, strategy, scoring, quotas and infrastructure were not changed. Evidence separates actual historical runtime samples, mock measurements and simulations.

## Measurements that can and cannot be used

| Evidence | Observed result | Correct interpretation |
| --- | --- | --- |
| Historical signed learner, 19/10 | Judge 23,444ms with eight reported stage attempts | One actual learner outcome, not a percentile. See `docs/evidence/STAGING_JUDGE_RECOVERY_2026-10-19.md`. |
| Historical async Judge phase 3, 23/10 | Queue submission ~0.9s; worker 131.4s on retry; another generation 29.9s then Judge 43.0s | Completion was recovered by asynchronous execution; asynchronous transport does not make provider computation faster. Saved `PHASE3_RESULT.md` inspected. |
| Historical saved Inspector attempt | 9.18s displayed | Generation latency from an older attempt, not Judge-to-UI latency. |
| Corrected historical capacity experiment | 6/100 pipelines completed; 157 HTTP attempts; six actual 429 responses; seven network/timeout attempts; 88 stopped before Judge by harness circuit | Isolated engine job, not 100 signed users/HTTP/DB traffic. The 94 incomplete pipelines are not 94 provider 429s. |
| Initial historical capacity experiment | 61/100 completed, 475 attempts, incorrect 256 output-token cap | Invalid basis for current capacity conclusions; its 502s are not proven quota failures. |
| Existing fake-provider/PGlite pipeline benchmark | 10/25/50/100: p95 completion 2.27/5.09/9.60/18.57s; 100/100 completed at fake 20ms provider, max four active calls | Single-process SQL adapter, altered test token/backlog limits; not Gemini, actual PostgreSQL contention, Firebase users or HTTP load. No rerun needed. |
| Claude Monte Carlo B/C | B p50/p95 27.7/92.5s; C 21.8/86.1s | Simulation from assumptions; neither live latency nor scoring quality. Do not compare these as measured improvements over live A. |
| Actual current p50/p95/p99, cold/warm, token and cost distributions | **Unavailable** | No representative trace set or full usage/billing join. |

Saved historical source: `docs/evidence/STAGING_GEMINI_429_404_ROOT_CAUSE_2026-10-22.md`; tracker; relevant private output report names are indexed in the handoff. Raw governance/log captures must not be copied into these reports.

## Current request lifecycle and dominant costs

Generation: identity/role/lesson resolution → variable/settings/PII/safeguard checks → durable begin/request replay → source retrieval/embedding and fresh source scope → frozen evidence → provider admission if enabled → Gemini or SSE → authoritative save → session charge. UI then submits Judge, polls, renders authoritative grade and refreshes the larger snapshot. Async Generation moves retrieval/provider work into a leased task, while preserving this evidence sequence.

Judge A currently starts **Supervisor and rubric workers concurrently** (`parallelJudgeService.ts:79–101`). The old architecture description saying Supervisor finishes before five workers is stale. With five criteria A normally makes six logical calls; a complete Run normally makes seven including Generation. A waits for all stage outcomes, even if the Supervisor concludes the prompt is unrelated. B makes two logical Judge calls concurrently; C combines alignment and criteria in one logical call. No additional model synthesis pass is required; feedback/total aggregation is deterministic.

The A path duplicates task/context/prompt/output across five criterion payloads. This amplifies input tokens and increases the chance at least one slow/rejected call delays the aggregate. Queue wait and token headroom further affect every call when SQL admission is enabled. RAG/embedding, DB pool waits, HTTP handshakes, poll intervals and bulk snapshot loads add end-to-end latency. Streaming improves perceived Generation responsiveness; it does not directly shorten Judge or total completion.

Current synchronous Judge deadline is 50s. Async Judge passes 270s, lease 290s, task deadline 300s; Generation worker uses at most 240s and shrinks to its lease minus 15s. These are configured limits, not measured latency. The old 12s/24s stage timeout description no longer matches current source. A stage now gets the remaining shared deadline; one 504 retry is allowed only if at least 15s remains.

There are nested retry layers: providerResponse can resend a definite 429/503 once (numeric Retry-After capped at 5s, otherwise 0.8–1.6s jitter); Judge stage can retry uncertain 504 once with remaining budget; task dispatch can retry the job. Each actual send acquires a new permit when admission is on. `judge.providerAttempts` counts logical stage invocations, not all transport sends hidden inside providerResponse. Therefore neither “always one call for C” nor the historical “maximum 13 calls per Run” is a valid universal current bound. Successful-stage tokens omit lost/failed attempt usage. Idempotent grade saves do not eliminate duplicated provider cost.

## Admission and scaling assessment

013 implements one global SQL budget across Run/Judge and instances: defaults four concurrent calls, 120,000 conservatively reserved tokens/minute, 200 queued+running, 20 per identity. “Tenant” in this implementation is the identity subject; it is not company-level fairness. Each request reserves UTF-8 payload bytes plus maxOutputTokens, reconciles max(estimate,actual), retains settled reservation 60s, and holds uncertainty to lease expiry. Three consecutive capacity rejections open a 15s breaker. Poll jitter 100–250ms balances wakeups against SQL work; circuit polling is slower. This is conservative admission, not proof of the project's Vertex quota.

Current activation is unknown; unset/disabled mode bypasses admission. Embeddings intentionally use a separate path and are not constrained by this Gemini budget. Long Unicode contexts accepted by the 100,000-character context limit can exceed the default admission token reservation limit because bytes, not characters, are counted. Such requests are rejected as backpressure even without an active provider request. Measure representative payloads before calibrating; do not guess thinking budgets or change identity quotas.

Illustrative lower bound only: with four available permits, six equal-duration Judge calls for one identity require at least two permit waves; at 4s/call this is at least ~8s before auth/queue/save/poll/render overhead. This is arithmetic from assumed durations, not a benchmark or latency promise. Adding Cloud Run instances cannot exceed the global four permits or create Vertex capacity. At high load, admission queue/pool contention can dominate; default five SQL connections times maximum instances must fit a measured database connection budget. No numeric safe user capacity can presently be certified.

## Smallest path to a credible sub-10s decision

1. Resolve source/runtime/config/schema identity and pool/safeguard defects first. Add end-to-end trace timestamps without prompt/output text. Distinguish click-to-score from Judge-only provider time and from Generation+Judge.
2. Use current A traces to attribute queue/auth/retrieval/provider/persistence/poll/render time; separate cold/warm, payload size, success/retry/timeout and concurrency. Fast polling/early grade publication already exist; do not propose them as missing work.
3. Benchmark existing B/C, rather than inventing another architecture. Preserve the exact rubric, anchors, threshold, model, source snapshot and deterministic aggregation. Strategy change still needs separate approval.
4. Prepare a frozen human-labeled set, following the existing capacity proposal's 80–120-case plan: all five criteria, passing/failing boundaries, unrelated/greeting, injection, missing/wrong citations, Vietnamese/English, long/short context and malformed provider output. Paired A/B/C comparisons must report criterion agreement, total error, pass/fail disagreements and reviewer adjudication. Existing mocked schema tests prove format, not equal scoring judgment.
5. With explicit spend/test authorization, use the same corpus/config through the actual API/admission/worker/UI, predeclare request budget and stop conditions, report every accepted run including failures. Measure p50/p95, sample counts and empirical p99 with uncertainty; two demo runs cannot establish a tail SLO. Define whether <10s is median or p95 before acceptance. Record per-stage actual/unknown tokens, attempts and server save/UI visibility.
6. Promote only if quality and declared latency/availability gates pass. Otherwise keep A and present honest async progress or a saved scorecard for demo. Do not lower rubrics, reduce criteria, fabricate scores, switch models or silently bypass admission to meet a timer.

B/C can reduce request count and repeated input significantly. They may introduce correlated scoring errors; this has not been measured. C is the simplest transport candidate, not an accepted production strategy.

## Cost and observability gaps

No current currency-per-grade estimate is defensible. Required data: model/location/billing regime, actual input/output/thinking/cached usage for **all** attempts, grounding/embedding charges, retry/uncertain work, and infrastructure allocation over measured load. `providerOperationsService.ts` correctly reports cost null, but does not provide complete per-grade billing attribution; its SQL provider-time percentile includes settlement. Its pipeline aggregate is based on 014 jobs and does not represent ordinary synchronous/streaming Generation. Session ledger counts saved Generation usage only, not Supervisor/workers/embedding or failed-but-billed work.

The historical log capture has 4,848 entries from 17/10 through 23/10 08:15:43Z. It includes hint3 requests and two hint1 HTTP 503s, so blanket “no 5xx since async Judge” claims would overgeneralize earlier evidence. Capture completeness/filter semantics are unknown; no percentiles or failure rate is inferred from it. Structured provider/job logs are useful but only run on enabled paths; new live p50/p95/p99, queue-age alerts, cold-start spans and full cost attribution remain acceptance work (I09/I13).
