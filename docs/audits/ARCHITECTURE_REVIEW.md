# Promptify — production architecture review

2026-10-23. Verdict: **production readiness is not established; do not release to production on the present evidence**. The modular monolith on Firebase Hosting/Auth + Cloud Run + Cloud SQL is a reasonable base. A rewrite, Redis or another agent framework is not justified by this audit. See [issues](ISSUES_REGISTER.md), [performance](PERFORMANCE_AUDIT.md), [roadmap](REMEDIATION_ROADMAP.md).

## Boundaries and security

Local AST/config/import checks and Dependency Cruiser pass: app resolves its own packages; no root runtime/shared source dependency. Firebase client configuration is public app configuration, not a Vertex credential. Vite exposes an explicit browser environment allowlist. `.dockerignore` excludes env files, outputs and local metadata; Docker runtime uses the node user. Current server authentication verifies revoked Firebase tokens, verified email and Google provider, then binds identity to roster records. Worker test injection hooks require NODE_ENV=test. These are positive controls, not an external security assessment.

Authorization combines application checks with actor-scoped RLS transactions. `cloudPostgresService.ts:34–40` uses SET LOCAL ROLE and transactional claims. Service-role transactions intentionally bypass ordinary actor filtering; every such query therefore needs correct class/user predicates. Dispatcher `classScope` protects manager actions; learner Runs independently resolve enrollment/lesson/SOP authority. Head scope follows administrator grants rather than department text. Current offline SQL/source tests exercise important denials, but no exhaustive cross-tenant endpoint/browser suite was run. No P0 exploit was demonstrated.

Late-added safeguards and hint services use service-role SQL with caller-supplied, previously scoped IDs. Current routes check lesson/class/role before invoking them. This remains defensible provided those gates cannot be bypassed by new callers. Tests cover helper SQL and SSR more strongly than the complete HTTP role matrix. Missing safeguard schema currently returns permissive answers even with enforcement flags enabled (I03); this contradicts an operator's expectation that enabling enforcement is a hard gate.

Generation's regex injection filter and untrusted-input policies are defense in depth, not a proof that adversarial instructions cannot succeed. Prompt engineering lessons intentionally allow adversarial practice. Keep server-side scoring validation and source isolation independent of that detector; never rely on regex matches to enforce tenant authority.

## SQL, Firestore and storage

Cloud SQL holds authoritative profiles, classes, content, runs, grades and jobs. Firestore holds invalidation notices, not application records. Own-UID direct subscriptions and deny-client-write rules avoid broad cross-tenant Firestore queries; no missing composite index is established. A fresh rules-emulator run was not performed because it is outside the existing offline allowlist. Empty composite-index configuration is not itself a defect for this direct-document design.

The five-connection pool and transaction coalescing reduce repeated transaction overhead, but create a concrete nested-acquisition risk: service scopes retain a connection while actor RPCs request another. Both class discovery (`productionServerService.ts:84–109`) and learner snapshots (`:131–196`) do this. Five concurrent scopes can occupy all five connections and then wait on themselves. An in-memory bounded-pool probe reproduces a timeout; the existing test adapter is unbounded and misses saturation (I01). Increasing pool size only moves the boundary.

`getSqlPool` lacks an idle-client error listener. The actual pg Pool exposes zero error listeners and throws on an emitted error without a connection being opened; historical logs contain two idle connection termination errors (I02). This is a distinct process-reliability risk. Neither health endpoint proves schema readiness: /health is process liveness; /readyz executes SELECT 1 only. No schema/flag compatibility check is present there.

Snapshots read lesson resources, SOP content and up to 200 attempts plus saved run snapshots/results, repeat on polling, and refresh awards while reading. Many Promise.all branches serialize on the same service connection by design. Browser poll frequency is 15s, 5s for Workshop/pending hints; Judge polls more often. Truncated snapshot analytics are marked, but must not be sold as complete reporting. Full SQL analytics is a separate path. Query plans, byte sizes, pool-wait percentiles, maximum connections and real Cloud SQL saturation remain unmeasured (I11).

Originals are created with generation-match-zero preconditions and digest checks; published source/lesson permissions are rechecked before signed download. A signed URL remains usable for its ≤300s lifetime after later revocation. That is an explicit residual capability, not proof of a tenant leak. Drive IDs require approved class bindings and host checks. Source-owned roster removal preserves manually maintained enrollment and other active sources. Do not simplify these rules during cleanup.

## Jobs, concurrency and recovery

| Mechanism | Positive design | Remaining release risk |
| --- | --- | --- |
| Async Judge 012 | Durable state, hashed per-job token, claim/TTL, owner polling, saved authoritative grade | Historical completion established; no fresh runtime/config read. Judge retries uncertain calls and may spend again; legacy dispatch lacks 015 protection. |
| Candidate dispatch fencing 015 | Generation + dispatch number + live lease checked under row locks for finish/settle; three-dispatch budget | OFFLINE only for activation. Do not assume later safeguards deployments applied this earlier-numbered migration. |
| Candidate async Generation 014 | Durable request key, enqueue confirmation recovery, leased RAG, frozen evidence, no automatic uncertain replay | No real deployment acceptance; expiry/session cap is not rechecked at execution time. |
| Candidate provider admission 013 | Single SQL budget row serializes all instances/queues; leases/tokens/backlog/tenant FIFO/circuit breaker | Default disabled; real service activation and multi-connection load unknown. Admission can itself become SQL contention. |
| Projection outbox | Claim/lease, retry delay, bounded batch and dead-letter state | Worker schedule/liveness and operator dead-letter recovery not accepted. Invalidation fans out across identities with per-actor authorization and per-document transaction. |
| Roster worker | OIDC gate, approved sources, claimed jobs, failure recording, ownership-aware snapshots | Scheduled staging path is fixture-restricted; Scheduler historically paused. Manual sync pass is not scheduler acceptance. |

No saved bearer token is needed for durable AI jobs; per-job capabilities must still remain private. Worker URL/candidate routing must be verified before any future rollout so candidate submissions cannot run on a different strategy revision. API and AI-worker isolation exist, but turning isolation on disables synchronous Studio AI and SSE Generation; these are explicit compatibility gates.

Job execution needs current business access checks in addition to a valid capability and live lease. Generation lease validates active enrollment/source scope using 014, but not 016 expiry/token state. Judge dispatch loads frozen evidence directly without the equivalent fresh access check. A request authorized before revocation can still consume provider work after access changes (I05); the audit does not claim a cross-tenant grade read or fabricated grade.

## Resilience, deployment and operational controls

Generation request keys and Judge claims prevent many duplicate saves; SQL fencing improves stale-worker rejection. They do not imply exactly-once provider billing. Successful provider work with failed persistence can remain uncertain; the code deliberately asks users to inspect saved state rather than replay Generation. Shutdown has an eight-second hard timer; long AI operations may outlive this and require tested job recovery. Client/Hosting/worker/provider deadlines differ and must be measured together, especially when queue wait uses the provider deadline.

CI runs isolation/lint/boundaries/type/build/smoke/allowlisted tests, but most current code and the workflow remain untracked in the local tree. Existing deployed images are built through dated overlays on pinned base images. An overlay import/hash check verifies listed files, not equivalence to the entire present source tree. The standard full Docker build and latest served image may contain different candidate flags/services. Restoring provenance through a reviewed, immutable source checkpoint and reproducible full-image build is a production gate, requiring separate authorization; no commit/push is proposed as an audit action.

Migration generation sorts all numbered files and builds a bootstrap chain; it is not a live applied-migration ledger. There are two historical 006 files, and candidate 013–015 can be absent even if 016–018 were applied individually. Use explicit applied migration identity/hash, feature/schema compatibility and additive rollout/draining gates. Never replay the full bootstrap chain or rewrite applied files to normalize numbering.

Historical documentation reports backup/PITR enabled, no restore rehearsal and no monitoring alert policies/uptime checks. These settings were not reread, so current absence is unverified. Regardless, the audit found no acceptance evidence for restore/RPO/RTO, queue-age/error alerts, retention/deletion policy, on-call ownership or real scale limits. Runtime-source provenance, I01–I05, capacity/latency acceptance and these operations gates prevent a production sign-off. New infrastructure is not the immediate remedy.
