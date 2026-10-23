# Intrepid — actual local test results

## Current execution results — 2026-10-14

**All results here are local/synthetic, not Cloud SQL/live acceptance.** Latest source:33 explicitly allowlisted offline suites. No live-test glob executed.

| Check | Result | Evidence/limit |
|---|---|---|
| Typecheck / production build | PASS | Host typecheck/build and actual Dockerfile build |
| Lint / boundaries / dev smoke | PASS | Zero errors, one existing Workspace cycle; localhost assets/API auth rejection |
| Full offline regression | PASS33/33 | `apps/promptify-intrepid/outputs/offline-test-results.json`; includes N01/N02/F02, export scope, class isolation and exception redaction |
| Complete target schema001–009 | PASS | Real PG18.6/pgvector0.8.7;004 included; only Google ML embedding call doubled |
| Studio/SOP/progress pgTAP | PASS37 assertions | pgTAP1.3.4; scopes/tuple/course constraints tested |
| Native Studio and parent-scope races | PASS six checks | Actual concurrent transactions/locks |
| Native pool | PASS | Twenty concurrent actors; rollback/service-role isolation, runtime role reset, close/no-create |
| Native indexing | PASS six cases | Actual service-role adapter/PG pool; fake embeddings. One claim winner, durable cache, unknown retained/retry denied, known failure release/retry |
| PL/pgSQL checks | PASS: zero error-level findings | plpgsql_check2.10.13; app functions plus triggers in actual relation contexts. Warnings not adjudicated; no claim of all-path coverage |
| Scoped migration roundtrip | PASS | Synthetic approved export/FK closure, empty schema-only target, transactional import and row content/hash reconciliation |
| GCP renderer/preflight/scope/templates | PASS offline | Complete chain hashes, unchanged source Firebase config, shell syntax and every validate/dry-run mode |
| Actual API image | PASS11 HTTP cases | PORT9191; health200/noDB, ready503, anonymous four API routes401, worker404, traversal404, oversize413, CORS204/403 |
| Actual worker image | PASS | PORT9192; API404, projections401/noOIDC, method405; user=node, stop exit0 |
| Linux SIGTERM | PASS | Normal pool close exit0 (~0.8s), hung pool timeout exit1 (~8.6s), budget spans drain+pool close |
| Final image/redacted errors | PASS | PORT9193, health/API401, route/status-only logs, graceful exit0 |
| Cloud SQL/real provider/IAM/PITR/functional acceptance | NOT VERIFIED | User cloud execution pending |

Native catalog:50 public tables/104 FKs. Source-derived inventory:48 business tables plus two target infrastructure tables; original baseline49. Live source/GCP counts unknown. F01/F02/F06/F10/F15 and N01/N02 have local evidence with different coverage; **none has been executed on Cloud SQL staging**.

Full-chain evidence: `outputs/multi-agent/promptify-ma-intrepid-native-port-4c658666bf/workspace/outputs/native-database/intrepid_synthetic_1791946896355_35936/result.json`. Harness/helper reviewed/applied after native proof; only approved support-helper hash explicitly rebased, original baseline retained.

App-local evidence under `apps/promptify-intrepid/outputs/`: `native-database/pool-probe/probe.mts`, `native-database/indexing-probe/result.json`, `native-database/http-probe/container-result.json`, `native-database/http-probe/result.json`, `gcp/synthetic-roundtrip-intrepid_synthetic_1791947124240_39972/result.json`, `gcp/reconciliation.json`, `gcp-offline-test/`.

Final local image `promptify-intrepid:fast-staging-local`, digest `sha256:dd9556bd3e6ac165dd4fd0a5603ab42ff7f5e46a094696b038e3b741879ddc54`. Built using cached Node24.14.0 and **synthetic public Firebase config**, no server secrets. Rebuild with actual public app config and pin Artifact Registry digest before deployment. Native base pinned in [local PG recipe](../../apps/promptify-intrepid/gcp/Dockerfile.local-postgres); trust loopback is synthetic-only, not cloud configuration.

Failures retained: old export fixture missing approved scope, then incorrect Missing-parent regex (validator unchanged; final33/33 passes);55433 helper guard and JavaScript fence normalization (assertions unchanged; native rerun passes); registry DNS/npmECONNRESET (cached-image/retry succeeds); empty-body CORS probe correctly400 (valid fixture401); indexing probe evidence-write lacked fs import (fixed and rerun); Git Bash sandbox IPC (permitted local rerun passes); Gemini OAuth/timeout and rejected credential inspection. No failed evidence relabeled success.

Nonblocking local warnings: frontend chunks >500kB, known Workspace cycle, npm reports three moderate runtime dependency advisories. No force upgrade. Provider/model-space, Firebase mapping, files, actual warehouse/Firestore parity, Workspace/Scheduler rights and PITR still require staging. Historic missing context/vector provenance stays unverified, never fabricated.

Next: [deployment gates](../proposals/GCP_DEPLOYMENT_READINESS.md).

## Historical checkpoint below — superseded by current results above

Ngày 2026-10-14. Báo cáo actual execution, chưa full-system acceptance.

| Check | Result | Evidence / giới hạn |
|---|---|---|
| Native PostgreSQL 18.6 migrations 001/002/003/005/006/007/008/009 | PASS | Synthetic loopback database; 004 explicitly SKIPPED without native vector |
| Studio / SOP integrity / progress RLS pgTAP | PASS — 37 assertions | `apps/promptify-intrepid/outputs/native-database/intrepid_synthetic_1791915045392_50908/result.json` |
| Native two-connection Studio / binding-parent race | PASS — 6 checks | Same native evidence; không thay actual runtime pool test |
| Gemini N01 run evidence regression | PASS, reviewed/applied | [test](../../apps/promptify-intrepid/tests/verify_gemini_run_evidence.ts); independent network-disabled container gate + local rerun |
| Gemini N02 indexing recovery regression | PASS — 10 tests, reviewed/applied | [test](../../apps/promptify-intrepid/tests/verify_gemini_indexing_recovery.ts); stateful DB double, unknown outcomes retained; native claim isolation còn pending |
| Gemini F02 key / projection privacy regression | PASS, reviewed/applied | [test](../../apps/promptify-intrepid/tests/verify_gemini_projection_keys.ts); canonical ai_output/private Studio fields redacted; no sink calls |
| Intrepid typecheck | **FAIL** | Two TS2550 errors: Object.hasOwn in cloudProjectionService incompatible with current target lib; next Gemini task must fix compile without changing semantics |
| Full offline/build/lint/boundaries/smoke after latest batch | NOT RUN | Batch kế tiếp; không claim full parity |
| Native 004 pgvector / google_ml_integration compatibility | NOT VERIFIED | Docker pg18 image available; ML must remain explicitly doubled locally and verified on Cloud SQL |
| Cloud SQL staging / live IAM / provider / PITR | NOT VERIFIED | User setup and approved cloud tests pending; no cloud mutation performed |

## CLI execution / failure history

Installed Antigravity CLI 1.3.2, explicit gemini-3.8-flash, low effort. Model init records verify selected model. Code-return workers generate candidates; independent controller runs tests with network disabled. No worker result auto-applied before review.

- Initial Docker mountpoint error happened before CLI started; fixed sandbox mountpoint and ESM metadata, kept empty model-output/egress logs.
- First N01 candidate failed because its query double supported too few chained eq calls. Gemini repaired fixture; expected behavior/product code unchanged.
- One repair attempt was blocked when CLI headless auto-denied a readonly `ls -la /workspace/tests` command. Added only that exact sandbox-read allow rule; no dangerously-skip-permissions.
- Initial F02 candidate passed, but review requested canonical ai_output coverage. Gemini regenerated that fixture. A gate initially lacked copied cloudProjectionKeys JSON; restoring the previously scoped dependency passed the gate with candidate bytes unchanged and **no extra model call**.

Structured CLI logs, hashes, per-task scope, original failures, reviews and gates under ignored `outputs/multi-agent/`. Final accepted run directories:

- `promptify-ma-intrepid-run-evidence-repair-805652ac09`
- `promptify-ma-intrepid-indexing-recovery-9ff6e1ffaf`
- `promptify-ma-intrepid-projection-privacy-fixture-0bd25535cf`

All three new tests registered in the explicit offline allowlist. No native-provider/Cloud SQL proof is inferred from these unit tests. Next step: fix actual typecheck failure via Gemini, then complete native vector/pool/migration validation and full regression under [plan](ENGINEERING_PROGRESS.md).
