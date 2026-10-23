# Handoff cho Claude — Fast Judge, demo 24/10

Người dùng yêu cầu Codex **dừng lại và lưu một bản handoff để Claude tiếp tục**. Không có build, deploy, migration, traffic promotion hoặc paid AI test đang chạy do Codex khởi tạo. Không tiếp tục tự triển khai sau handoff này.

## Kết quả tại thời điểm dừng

| Hạng mục | Trạng thái và bằng chứng |
| --- | --- |
| Integrated | **YES, local**. Patch Claude đã áp dụng và được sửa để bảo toàn fencing. |
| Regression | **69/69 OFFLINE PASS**, lint/Dependency Cruiser, AST boundaries, typecheck, build PASS. HTTP smoke **FAIL/BLOCKED** vì sandbox không kết nối được localhost; không gọi đây là full regression PASS. |
| Staging candidate | **NO**. Chưa build/upload/deploy candidate B/C, chưa chuyển traffic hoặc Hosting. |
| Latency thực tế B/C → UI đủ 5 tiêu chí | **CHƯA ĐO**. Chưa chứng minh <10 giây, chưa nghiệm thu chất lượng Gemini thật. |
| Demo | Fallback bằng attempt QA đã lưu **đã kiểm tra live read-only**; Fast Judge live chưa sẵn sàng. |
| Ngân sách AI phiên này | **0/2 lượt real AI E2E đã dùng**, không paid load test. |

## Source phải tiếp tục từ đâu

- Repo mới nhất: `C:\Ki_OJT\PromptforNontech`; app duy nhất: `apps/promptify-intrepid`.
- Patch gốc: `C:\Ki_OJT\_claude-work\patches\apply_judge_patch.py`.
- **Không chạy lại patch này**: đã áp dụng. Không chép nguyên bản app cũ từ `_claude-work` đè lên repo hiện tại; sẽ mất admission/async Generation/fencing và các chỉnh sửa tích hợp.
- Git rất nhiều dirty/untracked; cả app và nhiều docs vẫn untracked. Không reset/clean/destructive checkout. Chưa commit/checkpoint Git/worktrees vì sandbox chặn ghi metadata `.git`. Không push.
- Tracker dùng chung: `C:\Users\Admin\AppData\Local\Temp\promptify-coordination\TRACKER.md`. Đây là tracker tiếp tục; không tạo thêm tracker/architecture plan.
- Đọc `docs/README.md`, `docs/01_CURRENT_STATE.md`, handoff này và `docs/04_OPERATIONS.md`. Một số ghi chú BLOCKED cũ trong docs đã được cập nhật bởi bằng chứng browser dưới đây.

## Thay đổi đã tích hợp và kiểm thử

Đường dẫn trong phần này tính từ app.

| File | Nội dung cần giữ |
| --- | --- |
| `src/services/parallelJudgeService.ts` | A=`parallel-v1`:6 calls; B=`consolidated-v1`:2 calls; C=`integrated-v1`:1 call bình thường. C gồm alignment + 5 tiêu chí trong một response. Giữ anchor, rejection khi thiếu/sai tiêu chí, weighted-v1, model và deterministic aggregation. Retry có thể tăng số calls; không quảng cáo mọi outcome đều đúng 1 call. |
| `src/services/productionAiService.ts` | Dispatch theo `JUDGE_STRATEGY` cho A/B/C. Mọi call/retry vẫn qua `gemini` → `admittedModelRequest` → global admission. Giữ phân loại admission 503 và uncertain provider 504, model guard, deadline Generation/Judge đã có. |
| `src/services/providerAdmissionService.ts` | Reservation mới = bytes UTF-8 của payload + `maxOutputTokens`, không cộng mặc định 32768 thinking nữa. Dựa trên combined thinking/output cap trong tài liệu generateContent; chưa kiểm chứng usage thực tế Vertex trong phiên này. Giữ input estimate bảo thủ, max(estimate,actual) khi settle, giữ reservation khi outcome uncertain; không sửa global concurrency/quota. Không đoán LOW=1024. |
| `src/services/judgeFencingService.ts` | Thêm `recoverLostJudgeDispatch`: owner + running + lease hết grace được kiểm tra dưới **cùng row lock** với dispatch acquisition; settle legacy thực hiện trước COMMIT. Không cần migration mới cho helper này. |
| `src/services/rebuildRunService.ts` | Patch metrics `judge_job_metrics`, hashed job ID, queue/evaluate/stage/token spans; sync và async Judge đều có tenant/correlation scope. Recovery worker sau lease+30s gọi helper có khóa; không dùng bản patch gốc read-then-generation-only-settle vì có thể giết dispatch vừa reclaim. Giữ nguyên nhánh finish/settle của015 và retry budget. |
| `src/services/productionClientService.ts` | Judge polling mỗi1s trong10s đầu, mỗi3s đến30s, sau đó10s; pause hidden tab. Sửa cleanup listener và already-aborted signal của sleep. |
| `src/components/rebuild/ProductionApp.tsx` | `gradeAttempt()` đưa grade authoritative trả từ server vào snapshot ngay bằng flushSync, trước bulk snapshot refresh; dùng cho Run, retry và Generation-resume. Không giữ grade client tự tính. |
| `src/components/rebuild/ProductionWorkspaceV7.tsx` | Diagnostic details mặc định mở để thấy5 dòng tiêu chí ngay khi grade có; full feedback details vẫn có thể đóng. |

Test bổ sung/sửa: `verify_judge_strategies.ts`, `verify_judge_worker_recovery.ts`, `verify_provider_admission.ts`, `verify_judge_async_contracts.mjs`; explicit allowlist `tests/offline-tests.json` hiện69 tests. Script Claude `scripts/judge_strategy_benchmark.ts` cũng đã copy và chạy.

- B/C được kiểm thử qua production switch → mocked ADC/Vertex → admission SQL adapter:2/1 permits và settlements, LOW normalization, đủ5 criteria, fail-closed khi SQL unavailable. Không gọi mạng thật.
- PGlite recovery test bao gồm wrong owner, fresh reclaimed dispatch không bị recovery giết, live lease/grace, worker_lost, zombie save, duplicate deliveries; legacy và015 paths đều được kiểm tra.
- `npm test` cuối:69/69, report local `outputs/offline-test-results.json`. Không chạy test bằng glob.
- Các lệnh từ app đã chạy: `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test`.
- Known warnings: Workspace circular dependency và chunk-size. `test:smoke`: Vite ready trên127.0.0.1:5192 nhưng sandbox không fetch được → exit1. Không sửa test để che failure.
- Monte Carlo Claude: B p50/p95=27.7/92.5s, C=21.8/86.1s. **Đây là mô phỏng theo giả định, không phải Gemini/UI latency hoặc quality acceptance.**

## Staging vừa xác minh live qua browser

Project `ai-transformation-510302`, region `asia-southeast1`, service `promptify-intrepid-api`.

- Người dùng đã trực tiếp hoàn tất Google Verify it's you cho **demo.biz@intrepid.asia**. Đây cũng là account do `gcloud config get-value account` trả về. Account mặc định khác trong browser không có quyền Cloud Run; không đổi IAM để xử lý việc này.
- Cloud Console hiện truy cập được. Revision History xác minh **`promptify-intrepid-api-ja1-1023` nhận100% traffic**; service healthy. Revision cũ `jr5-1022`, `jr4-1022`, v.v. nhận0%.
- Service URL quan sát: `https://promptify-intrepid-api-390575746801.asia-southeast1.run.app/`.
- Tag của revision đang chạy: `judge-async-review`, URL `https://judge-async-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app/`.
- `ja1-1023` là mốc traffic rollback **vừa quan sát**, nhưng chưa capture image digest/YAML/env/Hosting version/IAM/governance đầy đủ. Không coi bằng chứng traffic này là hoàn tất governance gate.
- Tài liệu trước phiên ghi JUDGE_MODE=async, JUDGE_STRATEGY=parallel-v1, gemini-3.8-flash qua Vertex; **chưa đọc lại live env trong lần browser này**. Không khẳng định B/C hoặc architecture flags đang bật.
- Migrations013/014/015 chưa được Codex apply.012 phải giữ nguyên. Không bật admission/fencing/generation SQL flags nếu chưa xác minh schema/owner/migration tương ứng. Patch Judge không cần tự áp thêm migration.

## Trạng thái truy cập lúc dừng

1. **Terminal local vẫn bị sandbox chặn**, dù người dùng đã ủy quyền công việc. `gcloud` không tạo/ghi được `C:\Users\Admin\AppData\Roaming\gcloud\credentials.db` và logs (WinError5). HTTPS probes từ Node đến staging Hosting và run.googleapis.com đều ENOTFOUND. Không phải bằng chứng thiếu IAM; browser là kênh khác và đã vào được đúng project.
2. Không sửa config quyền máy, không tắt sandbox, không copy credential database, không in/extract token/cookie. Hướng dẫn config.toml trước đó không được người dùng áp dụng và không được coi là đã mở quyền runtime.
3. Đã mở **Cloud Shell ephemeral** bằng browser, account đúng, project đúng, qua URL sạch `https://shell.cloud.google.com/?project=ai-transformation-510302&authuser=2&ephemeral=true`. Đã bấm Authorize để công cụ Google dùng phiên đăng nhập hiện có; không thay IAM/billing/Cloud Run SSH. Cloud Shell được Google công bố miễn phí; không bật dịch vụ trả phí mới.
4. Cloud Shell có2 terminal tabs và báo session transferred giữa browser clients. Có thể phải reconnect và chỉ dùng một terminal client. Browser tab Cloud Console là1, tab Shell là3 tại lúc quan sát; ID có thể đổi.
5. Lệnh read-only `gcloud run services describe ... --format=value(status.latestReadyRevisionName)` nhập qua browser **bị chia/mất ký tự**, chỉ thấy lỗi `unrecognized arguments: -`. Không có output gcloud describe thành công trong Cloud Shell. Sau đó thử `pwd` qua paste/Enter; **chưa xác minh output** trước khi người dùng yêu cầu dừng. Có thể còn đoạn lệnh chưa gửi trong input; trước khi tiếp tục hãy Ctrl+C/clear input rồi kiểm tra đúng terminal. Không có lệnh cloud mutation được nhập.
6. Menu Cloud Shell trong Cloud Console mobile liên tục hiện tooltip SSH disabled; **không bấm Enable SSH**. Standalone shell URL ở trên mới mở được terminal.
7. Không lưu URL chứa `rapt`, auth challenge hoặc cookie vào file/handoff. Dùng URL sạch; tái sử dụng phiên browser còn hiệu lực, không lấy credential qua DevTools.

## Demo fallback đã kiểm tra thực tế

Staging `https://ai-transformation-510302-intrepid-staging.web.app/`, phiên Admin hiện có:

Workshop control → cohort `STAGING-SYNTHETIC-20261020-NORTHSTAR` → learner hư cấu **Demo** → Inspect Prompts → Open full learner inspector → V1, bài `PRACTICE-DELIVERY-01`.

Output đã lưu và5 tiêu chí hiện được:3/3,2/2,2/2,1.5/1.5,1.5/1.5 (10/10). Không gửi coaching/notes, không Run hoặc retry AI. **9.18s trên attempt là Generation cũ, không phải thời gian Judge → UI.** Runbook đã cập nhật trong `docs/DEMO_SCRIPT.md`.

## Phạm vi Claude cần tiếp tục

Ưu tiên duy nhất vẫn là Fast Judge demo24/10: lấy governance/rollback target đầy đủ, đưa đúng source local mới nhất thành ứng viên staging không traffic, regression/HTTP smoke thực, tối đa2 lượt QA AI E2E còn nguyên ngân sách, đo từ yêu cầu chấm đến lúc UI hiện đủ5 tiêu chí. Chỉ rollout khi chất lượng và latency đạt; nếu không đạt báo số thật và dùng fallback. Không mở thêm scope kiến trúc.

- Giữ gemini-3.8-flash, rubric5 tiêu chí, weighted-v1, quota, auth/roles/RLS. Không production/IAM/billing, không đổi model, không xóa dữ liệu hoặc rewrite migration.
- Đọc trước mọi deploy/live script. Các script `build_staging_judge_bounded.ps1`, `deploy_staging_judge_bounded.ps1`, `verify_staging_judge_candidate.mjs` chứa target/revision **19/10 cũ**; không chạy nguyên xi. Dockerfile `gcp/Dockerfile.judge-async-20261023` là overlay cũ và thiếu nhiều service mới nếu chỉ copy nguyên file list; rà dependency trước build.
- `verify_staging_judge_bounded_live.ts` là provider probe cũ trực tiếp, cap24 calls, **không phải** QA E2E qua admission/UI; không chạy nó để tiêu hết ngân sách hoặc dùng làm bằng chứng mục tiêu.
- Candidate async Judge phải dispatch Cloud Tasks về đúng candidate worker: kiểm tra `JUDGE_WORKER_URL`, tránh enqueue từ candidate nhưng worker lại chạy revision A. Không đổi queue/IAM để né việc này.
- Rollback bằng traffic/Hosting về baseline đã capture, giữ dữ liệu và schema additive. Không có rollback cloud nào đã được thực thi.
- Báo cuối đúng yêu cầu người dùng: integrated YES/NO; regression PASS/FAIL; staging YES/NO; latency thực tế; demo ready YES/NO, ghi rõ fallback nếu dùng.

## Kiểm tra source trước khi Claude sửa tiếp

SHA256 tính từ bytes local, đường dẫn từ app. Dùng để phát hiện ghi đè hoặc drift, không phải Git commit.

```text
e0049e07e5bd47fc5462c49f921a6a5e20c12b1b81b2d2fe24da50ada304f337  src/services/productionAiService.ts
d94ac2bd8ad1a78fcc39736fedf49cd59f6828745e4c96219f93a8cf9017d989  src/services/parallelJudgeService.ts
7856dc85a46d90d628eee410ff4b03903f698df887f392182984d902757882d9  src/services/providerAdmissionService.ts
965c51e10ef195efdff96ddd640e20037cb7afe4c4baf3fe96aa9260e435ea3c  src/services/judgeFencingService.ts
7aeb50e93fb30e7d0de2419906a70e2af62cdde65eb8868b1e4b748853cb41cf  src/services/rebuildRunService.ts
16a57b3e0ffcb8c3aebe310f6a46fa2624eb50fb006e956674d4537452074755  src/services/productionClientService.ts
6c975534eb3271e06d416f490c5fbce407c211d0e6c2528bfaffea261001037c  src/components/rebuild/ProductionApp.tsx
ffc62b0c4cc064bd4f1a2ff3ab507ed383848d7b89ab14c94a8f74b4f39b3892  src/components/rebuild/ProductionWorkspaceV7.tsx
5e6710172df0a560704146db977c3a687ada2682951201885bf09e0159f534fa  tests/verify_judge_strategies.ts
ce247bd9abfd611ec14c9e59bbaa9e530ee7012f83edf5be7219bb38e66f1345  tests/verify_judge_worker_recovery.ts
7e0933e21280ba94423131931dac1a298a7a165b8c0f79b81d9ca02d3311fd8a  tests/verify_provider_admission.ts
65ceca63e462fbb8e9567b25d09db4d431a9dd5521993f436eef568268024029  tests/verify_judge_async_contracts.mjs
092f4310891ed0cd97c33cf3d3fa9ca1f4bc31c52208e4e64e9db243cd1e105e  tests/offline-tests.json
72f1a8405e684247fe2ac48d1751da05a187f4cdc43dd1ff81f6ae0aa51ea2f2  scripts/judge_strategy_benchmark.ts
```
