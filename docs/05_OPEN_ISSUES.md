# 05 — Vấn đề mở, blocker và việc còn lại

Cập nhật 22/10/2026. Mỗi mục ghi rõ nguồn bằng chứng. Thứ tự gần đúng theo mức ưu tiên.

## Blocker

| # | Vấn đề | Bằng chứng | Bước tiếp theo |
| --- | --- | --- | --- |
| 1 | **Code chưa được bảo toàn trong git**: commit cuối `d7ac9d1` (08/10, chưa push); toàn bộ Intrepid/GCP, `gcp/sql`, phần lớn `docs/` đều là untracked; evidence `outputs/` bị ignore | `git status`; backup local `C:\Ki_OJT\_backups\promptify-2026-10-22` | Người dùng tự duyệt và commit theo nhóm; chép backup ra ổ khác (ổ C: đã đầy 99%) |
| 2 | **Capacity**: 100 pipeline đồng thời chỉ hoàn thành 6/100; mỗi Run tốn 7–13 lời gọi; không có hàng đợi toàn hệ thống | [429/404](evidence/STAGING_GEMINI_429_404_ROOT_CAUSE_2026-10-22.md) | Chốt SLO, sau đó làm hàng đợi theo [proposal](proposals/STAGING_GEMINI_CAPACITY_LATENCY_PROPOSAL_2026-10-22.md). Không chạy thêm đợt load test trả phí |
| 3 | ~~Judge 504 giữ claim → 409 vĩnh viễn~~ **Đã sửa ở local 22/10, chưa deploy**: nhả claim khi provider đã xử lý xong; tự tiếp quản claim quá 6 phút; giữ thận trọng khi chưa rõ budget hoặc kết quả lưu | `rebuildRunService.ts`, `tests/verify_judge_claim_lifecycle.ts` | Review và deploy lên staging, rồi chạy 1 lần Run có ký thật |
| 4 | ~~Lỗi provider bị gộp~~ **Đã sửa ở local 22/10, chưa deploy**: giữ mã upstream (404/400 → 502 kèm `upstream 404 NOT_FOUND`, 429/503 retry 1 lần theo `Retry-After`); lỗi cấu hình/ADC thành 503 chắc chắn thay vì 504 "uncertain" | `productionAiService.ts`, `vertexAiService.ts`, `tests/verify_provider_errors.ts` | Deploy, rồi đối chiếu log `provider_rejection` |
| 5 | Roster theo lịch chưa vận hành: candidate `rs-1022` 0% traffic, Scheduler PAUSED, chưa quan sát được OIDC tự nhiên; có thể vướng IAM | [handoff 22/10](handoffs/HANDOFF_STAGING_CAPACITY_ROSTER_2026-10-22.md) | Làm theo 8 bước trong handoff; không tự cấp IAM |
| 6 | Không có alert/uptime check; chưa diễn tập restore | [operations plan](proposals/STAGING_OPERATIONS_PLAN_2026-10-20.md) | Cần chủ sản phẩm chỉ định người nhận alert và RPO/RTO |
| 7 | Chưa có môi trường production trên GCP | [readiness 20/10](evidence/STAGING_PRODUCTION_READINESS_2026-10-20.md) | Sau khi xử lý xong blocker 2–6 |

## Đã sửa ở local ngày 22/10/2026 (chưa deploy, chưa kiểm chứng trên staging)

- [x] Learner Run: lỗi provider đã xử lý xong không còn bị 409 vĩnh viễn khi chạy lại cùng prompt (frontend xoay `requestId`; chỉ giữ ID khi kết quả không rõ). `ProductionApp.tsx`
- [x] Run báo đúng quota: 40/giờ, 200/ngày, khác với Basic 10/ngày; enrollment bị chặn trả 403 thay vì 409. `rebuildRunService.ts`, `tests/verify_run_begin_errors.ts`
- [x] Sandbox của Trainer: Judge lỗi sẽ nhả claim; mỗi lần Run dùng ID mới. `productionServerService.ts`, `ProductionStudioSource.tsx`
- [x] Roster Sync now: sau một lần sync lỗi không còn bị 409 cho tới khi tải lại trang. `ProductionRosterSource.tsx`, `ProductionRoster.tsx`
- [x] Thông điệp lỗi Run/Judge hiển thị lý do cụ thể từ server. `productionClientService.ts`
- [x] Nhãn "Downloading…" có bản dịch tiếng Việt. `releaseUiTranslations.ts`
- Test: `verify_judge_claim_lifecycle.ts` (PGlite, SQL thật), `verify_provider_errors.ts`, `verify_run_begin_errors.ts`, `verify_retry_state_contracts.mjs`; offline 60/60.

## Chưa xử lý (ngoài phạm vi đợt sửa)
- Không có hàng đợi provider toàn hệ thống (blocker 2). Bản sửa chỉ thêm 1 lần retry có giới hạn, chưa giải quyết capacity.
- Sandbox Judge vẫn không trừ budget `ai.judge` (thêm quota mới cần được duyệt).
- Claim indexing SOP khi timeout vẫn được giữ lại, cần operator đối chiếu (`sopIndexingService.ts`).

## Kết quả kiểm chứng live ngày 22/10/2026 (staging, revision `jr5-1022` đang chạy)

- **LIVE PASS:** khi Judge lỗi, claim được giải phóng và người học có thể chấm lại ngay; không còn 409 vĩnh viễn (3 lần chấm thật).
- **LIVE FAIL:** cả 3 lần Judge đều 504. Nguyên nhân gốc nằm ở **độ trễ của Vertex AI**: `gemini-3.8-flash`, endpoint `global`, pool dùng chung có p95 79–341 giây (metric publisher). Mã 499 là do app tự hủy ở mốc 50s. Không có 429 hay 404. Firebase Hosting giới hạn mỗi request tới Cloud Run ở 60 giây, nên Judge chạy đồng bộ không thể hoàn thành khi provider chậm như vậy.
- Đã sửa thêm ở app (đã deploy): bỏ việc cắt lời gọi đầu ở 12s; supervisor chạy song song với 5 tiêu chí; chỉ gọi lại khi còn ít nhất 15s. Điểm và model không đổi.
- **Judge async:** kế hoạch đã duyệt ([proposal](proposals/JUDGE_ASYNC_PLAN_2026-10-22.md)). Giai đoạn 1 (code + test offline, mặc định `JUDGE_MODE=sync`) xong ở local ngày 23/10, chưa deploy. Giai đoạn 2 (23/10, staging): đã bật Cloud Tasks API, đã tạo queue `promptify-judge-staging`, đã áp migration 012 (verify PASS). Đã cấp `roles/cloudtasks.enqueuer` **ở mức project** cho `promptify-api` theo duyệt của người dùng; phạm vi rộng hơn queue, và hiện project chỉ có đúng một queue này. Giai đoạn 2 xong. **Giai đoạn 3 xong (23/10):** API `ja1-1023` chạy `JUDGE_MODE=async` (100% traffic), Hosting `0d48ba25…`. **Đã kiểm chứng live:** 2 lần chấm đều `succeeded` qua queue (131s và 43s), có điểm và điểm đã được lưu; hai thời gian này đều vượt giới hạn 60s của Hosting, nên Judge đồng bộ trước đây không thể hoàn thành. Evidence: `outputs/staging-release-2026-10-23-judge-async-p3/PHASE3_RESULT.md`. Việc còn lại: Giai đoạn 5 (sandbox Judge async, theo dõi tuổi job và tỉ lệ retry, chốt SLO); Run (generate) vẫn đồng bộ.
- **Cần quyết định (ngoài phạm vi đã duyệt):** (a) chuyển Judge sang chạy bất đồng bộ (hàng đợi + polling, xem proposal ngày 22/10); (b) thử endpoint theo vùng thay cho `global`; (c) dùng capacity riêng (Provisioned Throughput); (d) đổi model hoặc mức thinking. Mỗi phương án cần được duyệt riêng.
- Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-22-judge-repair/live-judge-findings.md`.

## Câu hỏi cho chủ sản phẩm (chưa gửi)

Nguồn: [PRODUCTION_QUESTIONS_FOR_INSTRUCTOR_2026-10-20](proposals/PRODUCTION_QUESTIONS_FOR_INSTRUCTOR_2026-10-20.md).

- "100 người dùng đồng thời" nghĩa là 100 phiên mở hay 100 lần chạy AI cùng lúc? Ngân sách bao nhiêu?
- Ai nhận alert?
- RPO/RTO là bao nhiêu?
- Drive/Sheets có bắt buộc ngay lúc launch không?
- Dữ liệu lưu trong bao lâu?

Thêm câu hỏi: phạm vi Public/Basic có trong code (migration 040/041) nhưng quyết định D11 xếp nó ngoài phạm vi.

## Lỗi 404 trên AI Studio

Staging dùng Vertex + ADC, nên **không** phải nguồn của traffic dùng API key mà AI Studio hiển thị. Ứng viên cần kiểm tra:
- các client cũ dùng `GEMINI_API_KEY` (bản Vercel/Supabase cũ);
- `scripts/historical/legacy-supabase-vercel/check_fallback_model.ts` (gọi `generativelanguage` với `gemini-2.5-flash`).

Chưa xác minh. Cần log/ảnh có hiển thị project/key, đọc ở chế độ read-only.

## Khác biệt so với test log tham chiếu

Xem đủ 24 case tại [parity 22/10](evidence/STAGING_FEATURE_DOC_PARITY_2026-10-22.md). Các mục còn thiếu:
- SSE streaming;
- hạn mức 50k token theo phiên;
- rate limit 20/phút;
- chế độ chỉ đọc khi hết hạn;
- middleware chặn prompt injection;
- ma trận test đối kháng.

## Dọn legacy bên trong `apps/promptify-intrepid` (ứng viên, chưa làm)

Đợt hợp nhất 22/10 không sửa code app. Các mục sau cần một thay đổi riêng, có review và chạy test:

- `src/services/supabaseClient.ts`: không được runtime import; vẫn được các script `compile_production_*` và `verify_*_live.ts` tham chiếu.
- Dependency `@supabase/supabase-js`: vẫn được các script maintenance live trong app dùng.
- `apiServerService.ts` `handleGenerateRequest`/`handleEvaluateRequest`: import nhưng không gọi; chỉ `AiServerError` và các type còn được dùng.
- Phần tương thích Vercel: `vercel.json`, `scripts/bundle_vercel_api.mjs`, `scripts/prepare_vercel_compat_deploy.mjs`, `scripts/prepare_production_deploy.mjs`, `scripts/setup_roster_worker.mjs` (Vercel + Supabase `pg_cron`), `tests/verify_vercel_compat.ts`.
- `scripts/apply_department_correction_migration.mjs`: đọc các file `.env` thời Supabase ở root; migration 050 trên Supabase.
- `jszip` được `tests/verify_sop_ingestion.ts` import nhưng không khai báo là dependency trực tiếp (hiện có nhờ lockfile, qua dependency gián tiếp).
- Hai file cùng số `gcp/sql/006_*`; `outputs/gcp/schema-chain.psql` đã cũ.
- Một số biến môi trường dùng trong code chưa có trong `.env.example`: `JUDGE_STRATEGY`, `WORKSPACE_SOURCE_BINDINGS_JSON`, `ROSTER_STAGING_ENABLED`, `CORS_ORIGINS`.

## Dọn ở cấp repository còn lại

- Các file `.env*` thời Supabase/Vercel ở root vẫn còn (chứa secret, không được backup). Người dùng quyết định rotate hoặc xóa. `apply_department_correction_migration.mjs` còn đọc chúng.
- Root `node_modules` (khoảng 380 MB) đã thừa vì root không còn dependency. Root `dist/`, `outputs/`, `tmp/` là scratch. Chưa xóa vì có thể đang được tool khác dùng.
- `scripts/provision_*_admin.sql`: chưa xác định được nhắm vào Supabase hay Cloud SQL, nên vẫn giữ ở `scripts/`.
- 42 link nội bộ bị gãy, chủ yếu trong `docs/archive/` (đã gãy từ trước khi hợp nhất).
