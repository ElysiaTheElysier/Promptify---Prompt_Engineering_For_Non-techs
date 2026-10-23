# Intrepid — fast GCP migration first

## Current checkpoint — 2026-10-14

**Local boot-staging engineering ready; not cloud validated or production ready.** User executes cloud/IAM/deployment and real-data operations. Latest instruction stops Gemini CLI; supervisor completed remaining fixes/review/tests directly. Three GPT coding workers remain stopped. No cloud mutation, push, deploy or real-data transfer occurred.

| Priority | Completed | Remaining gate |
|---|---|---|
| 0: Local correctness | Typecheck, build, lint, boundaries, dev smoke and33/33 offline suites PASS | Existing Workspace cycle/chunk-size warnings are nonblocking |
| 1: Independent Cloud Run staging | Actual non-root image build, custom PORT, HTTP/CORS and Linux SIGTERM PASS | User project/build/IAM/deploy; boot revision has no SQL/source credentials |
| 2: Safe Cloud SQL baseline | All001–009 on real PG18.6/pgvector0.8.7;37 pgTAP + six concurrency checks; PL/pgSQL error checks PASS | Cloud SQL privileges, google_ml_integration, network/model/identity tests |
| 3: Preservation/migration | Synthetic scoped export → empty target import → content reconciliation PASS | Approved shared-source scope, files/Firebase/vector provenance, freeze and recovery rehearsal |
| 4: GCP capabilities | Firebase/API/worker/SQL/vector/Vertex/GCS/Firestore/BQ/Workspace/Scheduler retained | Functional staging integration; no feature removed to accelerate boot |
| 5: Cleanup/doc perfection | Deferred | Final explorer/diagram refresh and broad performance/unused-code work |

Changes now reviewed: target006–009 class-local Studio, assigned Trainer progress, SOP integrity; exact Generate/Judge context/hash; uncertainty-safe indexing/provenance; canonical/legacy projection keys and private Studio projection. Two TS2550 calls fixed without changing target lib. Pool close avoids creating a pool; server drains then closes pool with an eight-second bound over both phases. Exact optional CORS and compatibility/private worker routes retained. Compatibility handlers redact unknown exception details. Export fixture supplies reviewed scope/hash and retains original integrity checks. Class scope and redaction tests explicitly allowlisted.

Gemini candidates underwent independent gates, hash/diff review and backup before apply. Original HTTP candidate cleared the timeout too early; supervisor corrected it during review and proved normal/hung-pool behavior on Linux. Export retry failed OAuth and lifecycle retry timed out; no incomplete output applied. Auth-volume inspection was rejected by automatic review; user chose manual login then stopped CLI. No credential-volume inspection/recovery performed. Existing CLI logs/contracts remain under ignored `outputs/multi-agent/`; no further CLI calls planned.

Next sequence: user boots fresh private staging without DB → configures SQL staging and validates actual identities/ML → rehearses approved scoped data/files/mapping transfer and projections → approves freeze/cutover with one writer. Enable Scheduler last. Supabase history and MVP source preserved; no table deletion, model swap, TTL reclaim or blanket cleanup.

Details: [readiness and exact user steps](../proposals/GCP_DEPLOYMENT_READINESS.md), [actual evidence and limits](CORRECTNESS_AND_TEST_RESULTS.md).

## Historical checkpoint below — superseded by current results above

Ngày 2026-10-14. Theo yêu cầu mới: dừng 3 worker GPT đang chạy, giữ nguyên workspace, chuyển coding workers sang **Gemini 3.8 Flash qua CLI**. Không revert các thay đổi đang có, không cloud mutation, không deploy hoặc thao tác data thật.

## Checkpoint trước khi đổi cách làm

- User chốt Studio edits chỉ thuộc lớp đang chọn; Trainer chỉ đọc progress trong scope được phân công.
- Đã thêm forward migrations 006–009 cho class-local Studio, SOP tuple/course integrity, progress RLS, canonical chunk key, indexing timestamp và embedding provenance. Baseline/history cũ giữ nguyên.
- Runtime đang có changes cho Generate/Judge exact context/hash, indexing claim recovery, compatibility HTTP routes và guard-FK navigation; chưa hoàn tất full regression/review.
- Native PostgreSQL 18.6 synthetic: migrations 001/002/003/005/006/007/008/009 chạy thành công; **37 pgTAP assertions + 6 concurrency checks PASS**. 004 chưa kiểm chứng trong native suite do pgvector chưa cài vào portable Windows server. Không coi proprietary ML test double là Cloud SQL success.
- LikeC4 5 views, Mermaid renderer và source-derived docs/explorer đã được sinh; còn final-catalog refresh/link review/handoff consolidation. Có bản SETUP_GUIDE đang hoàn thiện.
- Docker daemon hiện hoạt động; image pgvector/pgvector:pg18 đã tải. Chưa chạy native vector/ML staging regression trong image này.

Các thay đổi trên là checkpoint chưa tích hợp xong, không claim LOCAL ENGINEERING READY hoặc CLOUD VALIDATED.

## Điều phối tiết kiệm quota

Supervisor chỉ lập scope, kiểm tra evidence, review và chạy gates. Worker gọi installed Antigravity CLI **1.3.2**, `--model gemini-3.8-flash --effort low`. Dùng auth volume đã có; không mount application secrets, không dùng GCP production identities. Không model fallback hoặc broad permission bypass.

Tối đa **3 workers đồng thời**, mỗi task một output riêng; prompt chỉ có source tối thiểu liên quan. Transitive source cần cho offline imports được copy trong sandbox nhưng không nhét toàn bộ vào prompt. Không gửi toàn bộ repo/Repomix dump, .env, secrets hoặc DB rows. Mỗi worker 1 attempt, timeout 150s trong batch đầu; failure được ghi lại trước khi quyết định retry.

Reuse [controller hiện có](../../scripts/multi-agent/run.mjs), không thêm framework orchestrator. Controller đã thêm app scope cho Intrepid, support files và app-owned dependency volume. Code-return mode tạo candidate; Gemini không tự chạy tests trong mode này. Controller chạy test độc lập ở container **network none**, source inputs read-only; candidate chỉ apply sau review và hash check. Existing files không bị overwrite bởi batch này.

## Plan và batch boundaries

| Batch | Worker Gemini | Deliverable / scope | Gate để tiếp tục |
|---|---|---|---|
| 1A | Run evidence | New offline behavioral suite cho N01: actual Generate context/hash, RAG mutation, Judge evidence, tamper, legacy fallback, replay | Injected services; không provider call; independent test + review |
| 1B | Indexing recovery | New suite cho N02: claim acquire/save, known failure release, uncertainty, cached chunks, concurrent approval | Stateful DB double; không lease expiry/semantic change; independent test + review |
| 1C | Projection keys | New suite cho F02: canonical/legacy quoted/null keys, version reconciliation, invalid keys, warehouse/Studio privacy | Không SQL/sink call; independent test + review |
| 2 | Native migration + runtime | Complete PostgreSQL18/pgvector local environment, 004 integration with ML-only double, actual pool/RLS/retry and migration reconciliation tests | Real local database; pgTAP/PL checks; keep Cloud SQL validation separate |
| 3 | GCP handoff + documentation | Finish manual checklist/runbook/verification/config consistency, update explorer to final local catalog, source links/navigation | Validate/dry-run không cloud writes; diagrams/link review; synthetic-only explorer |
| 4 | Independent review / final validation | Review changed SQL/service/API/config contracts, typecheck/build/offline/boundaries/smoke/CI; resolve genuine failures | Only verified results marked PASS; blockers/SKIPPED explicit |

Batch 2/3 sẽ chia task nhỏ, không cho hai workers ghi cùng file. Không chạy thêm worker GPT để coding. Không đổi embedding model, progress/award semantics hoặc auth scope ngoài hai quyết định user đã chốt.

**Batch 1 result:** cả 3 regression groups đã PASS independent gates, được review và apply vào app; local reruns PASS. N01 fixture được Gemini sửa sau FAIL; F02 được yêu cầu bổ sung canonical ai_output privacy case. Có một CLI readonly-command auto-denial và một harness JSON dependency omission, đều lưu evidence; không broad permission bypass, không sửa expected behavior. Chi tiết [test results](CORRECTNESS_AND_TEST_RESULTS.md).

**Next batch ưu tiên:** sửa 2 lỗi typecheck TS2550 ở Object.hasOwn trong cloudProjectionService bằng Gemini; không đổi target lib toàn app hoặc behavior chỉ để test pass. Full engineering work vẫn pending; [readiness](../proposals/GCP_DEPLOYMENT_READINESS.md) chưa đánh dấu ready production.

Batch đầu gặp lỗi Docker read-only mountpoint trước khi CLI khởi động; model stdout và egress logs trống. Đã tạo dependency mountpoint và ESM package metadata trong sandbox, giữ log lượt lỗi để trace, rồi khởi động lại batch. Không tăng số attempt inference của task hoặc fallback model.

## Báo cáo song song

Mỗi CLI run lưu `contract.json`, `baseline.json`, `state.json`, `events.jsonl`, model stdout/stderr đã redact và independent gate results dưới ignored `outputs/multi-agent/`. Status: STARTING → RUNNING → TESTING → AWAITING_GPT_SOL_REVIEW → APPROVE/REVISE/REJECT → APPLIED_NEW_TEST_ONLY. Worker crash/auth/model/quota timeout = BLOCKED, không fake success.

Chỉ giữ 3 tracking reports chính: tài liệu này, `CORRECTNESS_AND_TEST_RESULTS.md`, `GCP_DEPLOYMENT_READINESS.md`; detailed onboarding/architecture/runbooks có navigation, không thêm bộ audit mới. Staging/live/cloud steps giữ WAITING FOR USER GCP SETUP / WAITING FOR CLOUD SQL STAGING VALIDATION đến khi có evidence.

## Tiêu chí kết thúc

Giữ toàn bộ UI00–15/capabilities, stable IDs/history/API contracts, 50 bảng và app isolation. Các changes đạt mức local chỉ khi có tests/review thực tế; known issues còn chưa kiểm chứng được ghi rõ. User tự thực hiện cloud setup, IAM, paid staging probes và cutover. Không đánh dấu production-ready từ scripts, mocks hoặc lint.
