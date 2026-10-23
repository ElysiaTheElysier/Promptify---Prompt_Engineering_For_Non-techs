# Promptify — prioritized remediation roadmap and executive assessment

2026-10-23. This is a recommendation, not authorization to implement, deploy, migrate or run paid/live tests. Dependencies matter more than a calendar promise. See [issues](ISSUES_REGISTER.md) for root cause, locations, regression risks, acceptance and effort; [handoff](AUDIT_HANDOFF.md) for resumable evidence.

## Executive answers

| Question | Assessment |
| --- | --- |
| 1. What actually works? | Current OFFLINE checks cover identity/role/source SQL contracts, saved Run/Judge idempotency/schema/rounding, roster lifecycle, immutable originals, candidate admission/fencing/Generation, safeguards and messaging. All 73 allowlisted tests passed across main execution plus one corrected artifact-redirect rerun; compilation/boundaries pass. Historical LIVE evidence proves bounded learner generation/grades, async Judge completion, manual synthetic roster changes/revocation, originals downloads, streaming and selected expiry/injection/session ledger cases. These are bounded proofs, not universal feature acceptance. |
| 2. What is broken/incomplete/unverified? | Newly reproduced pool/error and safeguard defects (I01–I04); hint-count race (I10); worker enforcement gap (I05, code); no fresh cloud/config/schema read, complete role browser matrix, scheduler delivery, real document-format matrix or B/C quality/latency acceptance. Local HTTP smoke remains blocked. |
| 3. Production-ready? | **Not established; withhold production sign-off.** Core architecture is viable. Reliability/enforcement corrections, reproducible release, operational recovery and real capacity/quality gates remain. |
| 4. What prevents reliable scaling? | Provider call/token amplification, unverified active global admission, pool starvation, coarse polling snapshots, unmeasured Cloud SQL/queue/Vertex constraints. More Cloud Run instances alone do not solve these. |
| 5. Highest latency cause? | A's multiple provider calls and tail/retry/queue variability dominate the known AI path; historical async Judge took 43.0/131.4s in two samples. DB/poll/render overhead adds time but is not currently quantified. Supervisor and workers already run concurrently. |
| 6. Simplify Judge? | Existing B/C reduce normal logical Judge calls from six to two/one, with deterministic weighted-v1 validation retained. Real scoring-quality equivalence and sub-10s user latency have not been shown. Keep current authorized live strategy until those gates and approval. |
| 7. Redundant/inconsistent rules? | Multiple retry layers; strict-cap wording vs Generation-only post-charge/reset behavior; later safeguards not integrated with delayed workers; default model/strategy path wider than invariants; class denial shown as email failure; reference QA rules differ from accepted role/quota/model/library contracts. Do not “fix parity” by silently changing invariants. |
| 8. Ten most important improvements? | Ordered table below. |
| 9. Largest benefit/smallest risk? | Pool idle-error handling, explicit schema/config gates, precise error/metric labels, constrained-pool tests and canonical state reconciliation are comparatively small. B/C has high potential performance benefit but meaningful quality risk; it is not a low-risk configuration flip. |
| 10. What before production? | Close I01–I09 or document explicit owner-accepted limitations, complete cross-role/source/scheduler acceptance, prove immutable source/runtime/schema identity, and exercise monitoring/restore/rollback. Only then can a production launch decision be evidence-based. |

## Ordered top ten

| Order | Work / issue | Dependencies | Acceptance | Engineering effort |
| --- | --- | --- | --- | --- |
| 1 | Establish source, serving revision/image, schema/flag and Hosting identity (I08/I17) | Read-only runtime access; owner-reviewed provenance | Single reviewed manifest, current rollback proof, candidate/live distinction | 1–2d |
| 2 | Eliminate nested SQL-pool acquisition (I01) | Source baseline; no cloud mutation needed for code/tests | Constrained-five pool + real multi-connection scope tests; no timeout/RLS regression | 1–2d |
| 3 | Handle idle pg errors and recover connection health (I02) | Source baseline | Actual error-event/recovery tests and sanitized logs | 0.5–1d |
| 4 | Enforce schema/config compatibility when protections are on (I03/I12) | Explicit feature/schema contract | Flag-off compatibility; on+missing denies before paid/mutating work | 0.5–1d |
| 5 | Make session policy/ledger/reset correct (I04) | Decide soft Generation allowance vs hard budget; preserve identity quotas | Concurrent admission, in-flight reset, unknown usage and failed-charge reconciliation | 1–3d |
| 6 | Recheck authorization/protections before delayed work (I05) | 4–5 plus job state policy | Queue→expiry/revocation/cap tests: zero new provider call, terminal state | 1–2d |
| 7 | Validate and accept existing admission/fencing capacity path (I06) | 1–6; migration/rollout and bounded test approval | Actual instances/DB/queue/load and grade-completion evidence, no duplicate saves | 2–4d |
| 8 | Benchmark A/B/C quality and real user latency (I07) | 1,7, labeled cases, separate spend/strategy approval | Unchanged rubric/model; adjudicated quality; declared latency percentile and usage/cost coverage | 2–5d plus review |
| 9 | Accept monitoring, recovery, usage/SLO/restore (I09/I13) | Runtime identity; owner/RPO/RTO/retention decisions | Alert delivery, queue age, error/unknown usage, bounded restore/rollback rehearsal | 2–4d |
| 10 | Complete role/integration acceptance and small UX/data-race fixes (I10/I14–I16) | Stable candidate + approved accounts/fixtures | Hint concurrency; trainer/learner/Head/peer denials; scheduler and document matrix | 1–3d plus operations |

These estimates overlap and must not be summed into a release guarantee. Work 9's decision/instrumentation preparation and work 8's labeling can begin while reliability corrections are reviewed; paid tests/deployment remain gated.

## Dependency gates

| Gate | Work to make concrete | Exit condition | What it does not authorize |
| --- | --- | --- | --- |
| G0: trustworthy baseline | Recover reviewed source, read actual service/queue/schema, preserve dirty tree | Full source/runtime/config/Hosting/schema manifest and current rollback target | Commit, push, config change or deploy |
| G1: local correctness | I01–I05/I10/I12 corrections in separately authorized implementation | Required lint/AST/Dependency Cruiser/type/build/allowlist checks; targeted failures now pass; real DB concurrency supplement | Live data/provider calls |
| G2: staging acceptance | Schema/flag compatibility, task routing, worker isolation/SSE/Studio behavior, source hash comparison | Authorized candidate acceptance, bounded cross-role/workflow tests and governance compare | Production release or widening scope |
| G3: capacity/quality/performance | Existing admission path and A/B/C corpus, real measurements, full transport usage | Declared success/concurrency/quality/latency objectives pass with failures counted; costs/unknowns reported | Silent model/strategy/quota/score change |
| G4: operations | Ownership, alerts, restore, retention, release/rollback/runbooks | Recovery exercises and owner sign-off satisfy stated RPO/RTO/SLO | IAM/billing/infrastructure mutations without explicit approval |

Do not enable isolated AI-worker mode as an incidental optimization: it changes availability of synchronous Studio AI and Generation streaming. Do not replay the bootstrap SQL chain. Do not roll back 018 to a one-pending index while multiple requests remain; decide outstanding requests or retain additive schema. Drain/fence durable jobs before any approved rollback.

## Scope deliberately deferred

I11 should start with payload/query/connection measurements, then the smallest summary/status/pagination split; no speculative cache or database replacement. I18 cleanup remains a separate change after production blockers: remove the known type cycle, inspect dynamic entrypoints/maintenance scripts and actual load waterfall before deleting legacy/prototype files. Existing invariants, source ownership, immutable originals, role/RLS and rubric thresholds remain fixed unless separately decided.

For a near-term demo, the defensible fallback is the historically rehearsed saved synthetic Inspector scorecard. Clearly label it saved data. A 9.18s Generation field must never be presented as Judge latency, and an isolated fast run must never be presented as a p95 guarantee.
