# 04 — Vận hành: chạy, kiểm tra, deploy staging

Cập nhật 22/10/2026. Mọi lệnh chạy trong `apps/promptify-intrepid` trừ khi ghi khác. Root `npm run <task>` chỉ chuyển tiếp vào app.

## Chạy và kiểm tra (offline)

```powershell
cd apps/promptify-intrepid
npm ci
npm run dev            # port 5174
npm run lint           # AST/config + Dependency Cruiser
npm run typecheck
npm run test:boundaries
npm run build
npm run test:smoke     # server local, request không xác thực
npm test               # chỉ chạy allowlist tests/offline-tests.json
```

- Baseline 22/10: **56/56** test offline PASS; lint có 1 warning cycle Workspace; build có warning chunk lớn.
- `npm test` ghi đè `outputs/offline-test-results.json`.
- Runner offline (`scripts/run_offline_tests.mjs`) xóa các biến `SUPABASE|GEMINI|OPENAI|GOOGLE|STAGING_|ROSTER_WORKER` trước khi chạy test.
- Test DB local: `scripts/run_local_database_tests.mjs` (PGlite/Postgres local). Emulator Firestore: `npm run test:firestore`.
- CI: `.github/workflows/app-isolation.yml` chạy cùng bộ lệnh với `npm ci`, không deploy. Workflow này hiện chưa được track trong git nên chưa từng chạy.

## Những gì cần ủy quyền rõ ràng trước khi chạy

- Test live: `tests/test_live_*`, `verify_live_*`, `verify_firebase_identity.ts`, `verify_product_private_upload.ts`…
- Script `scripts/verify_*_live.ts`, `probe_staging_*`, `staging_capacity_engine.ts`: có thể tốn tiền Gemini, ghi dữ liệu hoặc gọi cloud.
- Mọi script `deploy_*`, `promote_*`, `build_staging_*`, `configure_staging_monitoring.ps1`.
- Áp migration, tạo roster/fixture, đổi IAM, billing, model AI.

## Deploy staging (đã dùng 18–22/10)

| Mục | Giá trị |
| --- | --- |
| Project | `ai-transformation-510302` |
| Region | `asia-southeast1` |
| API service | `promptify-intrepid-api` |
| Hosting site | `ai-transformation-510302-intrepid-staging` (`firebase.staging.json`). Site mặc định chưa từng có release và **không phải** target |
| Build | `gcp/cloudbuild*.yaml`, context là thư mục app (`.gcloudignore` loại bỏ `.env*`, `outputs`, `tests`). Image nằm ở `asia-southeast1-docker.pkg.dev/<project>/promptify-intrepid/app:<tag>` |

Các file `Dockerfile.*` theo ngày là image overlay: chép đè vài file đã review lên một digest cơ sở cố định.

Quy trình đã áp dụng (xem [governance 18/10](evidence/GCP_DEPLOYMENT_GOVERNANCE_2026-10-18.md)):

1. `scripts/capture_staging_governance.ps1`: chụp inventory "before" (IAM, Cloud Run, SQL, Hosting, Auth…), đã ẩn secret.
2. Build bằng `scripts/build_staging_*.ps1` / Cloud Build.
3. Deploy revision mới với `--no-traffic --tag=<name>` (`scripts/deploy_staging_*.ps1`), rồi kiểm `/health`, `/readyz`, các request không xác thực phải trả 401.
4. Chỉ chuyển traffic sau khi review (`promote_*`). Hosting dùng `scripts/deploy_staging_hosting_rest.ps1`, chỉ deploy lên site staging. Build bằng `npm run build -- --mode staging`: `apps/promptify-intrepid/.env.staging` (được commit, chỉ giá trị công khai) cấp `VITE_STREAM_API_URL`; thiếu biến này thì Run/Judge âm thầm quay về JSON + polling (các bản Hosting 27/10 đã bị như vậy).
5. Chụp inventory "after", chạy `scripts/compare_staging_governance.ps1` để so sánh. Ghi kết quả vào `outputs/staging-release-<date>-*/` (bị ignore, nhạy cảm, chỉ để local).

## Rollback (tham khảo, chưa chạy)

- **API:** `gcloud run services update-traffic promptify-intrepid-api --project ai-transformation-510302 --region asia-southeast1 --to-revisions <revision-trước>=100`. Revision trước của staging hiện tại là `promptify-intrepid-api-life-1021`, bản trước nữa nằm trong evidence.
- **Hosting:** release lại version cũ trong lịch sử release của site staging.
- Không xóa revision, không reset secret, không đổi IAM, không restore SQL khi chỉ rollback UI.

## Migration Cloud SQL

- Nguồn: `apps/promptify-intrepid/gcp/sql/001…011` (+ `rollback/`). **Không viết lại migration đã apply.** Migration mới phải là file additive, đánh số tiếp theo.
- Root `supabase/` là lịch sử nguồn gốc (baseline được gộp từ đó; `tests/verify_roster_worker_schedule.mjs` đọc `supabase/migrations/038`). Đây **không phải** nơi apply cho Cloud SQL.
- Login runtime `promptify_runtime` không phải owner, nên apply migration cần credential owner do người dùng hoặc DBA cung cấp ngay lúc chạy, không lưu lại.
- `outputs/gcp/schema-chain.psql` đã cũ (chỉ có 001–008). Phải render lại bằng `npm run gcp:render` trước khi dùng.

## Bằng chứng nhạy cảm

`apps/promptify-intrepid/outputs/` chứa metadata IAM/secret, log, snapshot roster giả lập. Không commit, không chia sẻ. Không ghi token, mật khẩu, signed URL hay nội dung prompt của learner vào tài liệu.


## Candidate architecture release gates — 2026-10-23

No cloud mutation in this session. New feature flags defaultOFF; async Judge012 is preserved. Apply additive013/014/015 with a runtime-supplied owner credential only after governance capture, source review and rollback target capture. No IAM, billing, production, model or scoring change is authorized by this candidate.

| Flag | Enable only after |
| --- | --- |
| `PROVIDER_ADMISSION_MODE=sql` | Migration013; existing provider quota verified; conservative budget agreed from measured service time; every provider attempt uses admittedModelService |
| `GENERATION_MODE=async` | Migration014; existing queue URL/worker reachable using existing permissions; recovery and negative auth/method/body tests pass |
| `JUDGE_FENCING_MODE=sql` | Migration015 applied; fenced worker persistence test passes |
| `AI_WORKER_ISOLATED=true` | Existing worker serves `RUNTIME_MODE=ai-worker`; both generation/Judge tasks reach it; API ordinary routes still work; sandbox is intentionally503 |

Reuse an existing queue where feasible; queue dispatch limits are not the global provider limiter. Do not create a recurring-cost service to unblock isolation. Existing Cloud Run worker authentication/routing must be read live before enabling isolation. API/worker deployment and PostgreSQL concurrency have not been load-tested here.

Set SQL pool and Cloud Run limits together: `maxAPIinstances*APIpool + maxWorkerInstances*workerPool + operatorReserve <= verifiedDatabaseConnectionBudget`. Current default pool5 is code evidence, not proof of the live connection ceiling. Before release read current service timeout/concurrency/maxScale, Cloud SQL max_connections and background demand; do not blindly raise maxScale to100. Candidate worker lease290s requires transport deadline<=270s, Task deadline300s and Cloud Run timeout>=300s. Generation transport deadline is at most240s, reduced after retrieval to leave15s before the live lease expires. Admission includes queue wait in that deadline;100 real pipelines can expire if provider capacity is insufficient.

Required remaining acceptance: real PostgreSQL concurrent connections/multi-instance global cap, k6 against authenticated local fake-provider app path (the supplied isolated fixture alone is insufficient), browser refresh/class switch, both worker routes, current governance comparison, then at most2 authorized fictional-QA real AI smokes if existing credential/budget permit. No paid load wave. No staging promotion while required smoke or rollback gates are blocked.

Rollback prefers traffic/Hosting restoration and retaining additive tables. Drain all tasks before disabling worker flags or applying SQL rollback015→014→013. Never drop active queue tables or learner attempts. Shared tracker: `C:/Users/Admin/AppData/Local/Temp/promptify-coordination/TRACKER.md`. Secret scan/source snapshots stay local under ignored `tmp/architecture-coordination`; they are not Git commits and are not complete binary backups.


## Các phần còn thiếu so với test log — triển khai staging (23/10, chưa chạy)

Code và test offline đã xong (OFFLINE 72/72). **Chưa áp migration 016, chưa deploy, chưa bật cờ nào.** Mỗi bước dưới đây cần người dùng duyệt riêng.

| Cờ / cấu hình | Test log | Điều kiện bật |
| --- | --- | --- |
| `ACCESS_EXPIRY_MODE=enforce` | TC-AUTH-04 | Đã áp migration 016. Trainer/Admin đặt hạn trong Workshop → Inspector |
| `SESSION_TOKEN_CAP=50000` | TC-SEC-03 | Đã áp migration 016. Đếm token của Generation theo learner × lớp × bài; learner tự bấm "Bắt đầu phiên mới" |
| `INJECTION_GUARD=block` (hoặc `log`) | TC-SEC-04 | Đã áp migration 016. Studio có công tắc "Allow adversarial practice" cho từng bài |
| `GENERATION_STREAM=true` + `CORS_ORIGINS=<origin Hosting>` + build web với `VITE_STREAM_API_URL=<URL run.app>` | TC-PLAY-02 | Không áp dụng khi `GENERATION_MODE=async`. Hosting buffer response, nên trình duyệt gọi thẳng URL Cloud Run |

Thứ tự đề xuất:
1. Chụp governance, ghi rollback target (revision API và version Hosting hiện tại).
2. Áp `gcp/sql/016_learner_safeguards.sql` bằng credential owner do người dùng nhập. Kiểm tra: cột `enrollments.access_expires_at` và 3 bảng mới tồn tại.
3. Build image và deploy revision **no-traffic**, bật 4 cờ. Kiểm tra: `/api/stream` có CORS đúng origin, OPTIONS trả 204, request không có token trả 401.
4. Build Hosting với `VITE_STREAM_API_URL`, deploy channel preview trước, rồi promote API và Hosting.
5. Kiểm chứng tối đa 2 lần Run thật bằng learner QA: token hiện dần ra; Run bị chặn khi dùng prompt injection; hết token thì báo 429 và có nút tạo phiên mới; hết hạn truy cập thì có banner chỉ đọc và không chạy được Run/Judge.

Rollback: tắt cờ (không cần rollback SQL), hoặc chuyển traffic về revision trước. `rollback/016_learner_safeguards.sql` chỉ chạy khi chắc chắn bỏ tính năng, vì nó xóa log sự kiện bảo mật và hạn truy cập.

### TC-AUTH-03 — bật roster sync theo lịch (không cần sửa code)

Code worker (`/internal/roster`, chỉ cho staging) đã có từ 22/10. Scheduler `promptify-roster-staging-qa` đang **PAUSED** và trỏ vào candidate cũ `rs-1022`. Các bước, mỗi bước cần duyệt:
1. Đọc cấu hình revision đang chạy: có `ROSTER_STAGING_ENABLED=true`, `WORKER_AUDIENCE` (URL run.app của service), `WORKER_INVOKER_EMAIL=promptify-scheduler@ai-transformation-510302.iam.gserviceaccount.com` hay chưa. Nếu chưa có, thêm vào revision mới ở bước 3 phía trên.
2. Sửa URI của Scheduler sang URL của service đang chạy (`…/internal/roster`) và giữ nguyên audience OIDC.
3. Bật auto-sync cho **đúng 2** kết nối QA giả lập (Northstar, Juniper) trong Admin UI; 30 kết nối khác giữ nguyên tắt.
4. Resume Scheduler, quan sát log tự nhiên: 200 kèm kết quả reconcile, không có 401. Nếu Scheduler không lấy được token OIDC thì dừng lại; **không tự cấp IAM**.
5. Kiểm chứng: thêm `learner04` trong tab `ScheduledQA20261022` và chờ chu kỳ, learner được thêm; xóa dòng đó và chờ chu kỳ, learner bị gỡ. Không bấm "Sync now".
6. Quyết định giữ hay tắt auto-sync sau khi QA xong và ghi lại quyết định đó.
