# 01 — Hiện trạng Promptify Intrepid

## Local architecture candidate — 2026-10-23

**CODE + OFFLINE; chưa deploy/áp migration trong phiên này.** Bản ứng viên có global SQL provider admission013, durable async Generation/RAG014, async Judge dispatch fencing015, worker isolation và metrics. Mặc định các flag mới tắt; migration012 và async Judge hiện có được giữ nguyên. Không thay model/scoring, identity quotas, IAM/billing hoặc cloud resources.

Regression cuối và benchmark được ghi trong task tracker và [demo/acceptance](DEMO_SCRIPT.md). Pipeline fake7calls đã hoàn tất100/100, p95=18.57s; đây không phải100 Firebase users, HTTP app load hay Gemini thật. Staging acceptance, k6 và Git worktrees BLOCKED bởi sandbox. Không đọc lại được live service vì SDK credentials bị chặn; các revision/evidence bên dưới là lịch sử trước phiên. Rollout/rollback xem [vận hành](04_OPERATIONS.md).


Cập nhật 22/10/2026, từ khảo sát read-only của repo và evidence staging đã lưu. Tôi không đọc lại cấu hình cloud live. Bản audit MVP ngày 06/10 trước đây nằm ở [archive/as-is-audit/01_CURRENT_STATE-2026-10-06.md](archive/as-is-audit/01_CURRENT_STATE-2026-10-06.md).

Mức bằng chứng: **CODE**, **OFFLINE**, **LIVE** (staging, có evidence), **[?]** (chưa rõ).

## Môi trường

| Mục | Trạng thái (theo evidence ngày 21–22/10) |
| --- | --- |
| Ứng dụng | Chỉ `apps/promptify-intrepid`. MVP đã gỡ khỏi repo ngày 22/10 |
| GCP | **Chỉ có staging**: project `ai-transformation-510302`, region `asia-southeast1`. Chưa có project/Hosting/Cloud Run production |
| API | Cloud Run `promptify-intrepid-api`. **Từ 26/10:** revision `promptify-intrepid-api-judge1-1026` nhận 100% (`JUDGE_STREAM=true`, `JUDGE_MODE=async`), rollback `promo1-1023`. Xem [handoffs/UPDATES_2026-10-26_27.md](handoffs/UPDATES_2026-10-26_27.md) |
| Hosting | Firebase Hosting `ai-transformation-510302-intrepid-staging`. **Từ 27/10:** version `d926a77bb3d842c8`, rollback `3d04d040c6f5b63d` |
| Cấu hình AI | `AI_PROVIDER=vertex`, `GEMINI_MODEL=gemini-3.8-flash`, `VERTEX_LOCATION=global`, `JUDGE_STRATEGY=parallel-v1`. Không có fallback model. **Từ 23/10:** `JUDGE_MODE=async` (Cloud Tasks queue `promptify-judge-staging`, revision `ja1-1023`, Hosting `0d48ba25…`); Judge async đã được kiểm chứng live |
| Database | Cloud SQL PostgreSQL 18 `promptify-staging`, DB `promptify_db`, pool 5. Có backup và PITR; **chưa diễn tập restore** |
| Scheduler | `promptify-roster-staging-qa`, **PAUSED** |
| Monitoring | 0 alert policy, 0 uptime check ([vận hành](proposals/STAGING_OPERATIONS_PLAN_2026-10-20.md)) |
| Scaling | Tài liệu ngày 18/10 và 20/10 ghi max instances 1, concurrency 80. Bản capture 22/10 ghi maxScale 100. **[?]** cần đọc live để biết giá trị thật |
| "Production" cũ | Bản Vercel + Supabase (`promptify-rebuild.vercel.app`, 09–10/10). **[?]** không rõ còn chạy hay không |

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-22-capacity-roster/after/run-api.json`, [handoff 22/10](handoffs/HANDOFF_STAGING_CAPACITY_ROSTER_2026-10-22.md), [parity 22/10](evidence/STAGING_FEATURE_DOC_PARITY_2026-10-22.md).

## Chức năng

| Chức năng (UI) | Bằng chứng | Giới hạn đã biết |
| --- | --- | --- |
| Google SSO + đối chiếu roster/enrollment (UI01) | LIVE ([lifecycle 21/10](STAGING_LIFECYCLE_LEARNER_ACCEPTANCE_2026-10-21.md)) | Gmail cá nhân có trong roster vẫn được vào |
| Xác nhận profile, tự sửa phòng ban (UI02) | Một phần LIVE | Country lấy từ roster; chưa có bằng chứng sửa live |
| Learner Hub, chứng chỉ (UI04) | LIVE ([19/10](evidence/STAGING_LEARNER_SOP_ACCEPTANCE_2026-10-19.md)) | — |
| Workspace V7 ba cột: Run → Judge tự động (UI05/07) | LIVE (1 learner, 10/10 điểm) | Không có streaming; 504 giữ claim lại → learner bị 409; không chịu được tải đồng thời |
| Biến prompt, so sánh/khôi phục attempt (UI06) | OFFLINE | Chưa có nghiệm thu trên browser |
| Xem SOP + tải bản gốc immutable (UI08) | LIVE (21/10, hash khớp) | Nhãn "Downloading…" thiếu bản dịch VI |
| Thư viện prompt (cá nhân → chia sẻ chờ Head duyệt) | LIVE phần cá nhân; OFFLINE phần chia sẻ | Chưa kiểm luồng duyệt giữa đồng nghiệp |
| Workshop: broadcast, gợi ý riêng, learner "stuck" (UI09); inspector (UI10) | OFFLINE/contract | Chưa chứng minh người nhận đúng mục tiêu nhận được |
| Studio bài học/rubric/sandbox (UI11) | LIVE QA UI (18/10) | Sandbox judge không tính ngân sách |
| Rubric động: giảng viên thêm/xóa/sửa 1–8 tiêu chí, sandbox chấm thử rubric nháp, badge mất tiêu chí bị chặn lưu (UI11) | **LIVE** 28/10: SQL 021, API `rubric1-1028`, Hosting `2adbcb98`; E2E trainer + học viên và benchmark 3/5/8 tiêu chí ([RESULT](../apps/promptify-intrepid/outputs/staging-release-2026-10-28-dynamic-rubric/RESULT.md), chỉ có ở local) | 8 tiêu chí = 9+ lời gọi, chạy 2 đợt worker, p95 37,6 s hôm benchmark; nhãn tham chiếu benchmark chưa được review |
| Analytics (UI12) | Một phần | Bộ lọc cohort/heatmap chưa nghiệm thu live |
| Đóng góp SOP: upload/Drive/duyệt/index (UI13) | LIVE với 4 file TXT giả lập | Chưa chứng nhận đủ PDF/DOCX/XLSX/Doc gốc trên live |
| Governance: domain, cấp quyền lớp, rotation (UI14) | CODE/OFFLINE | — |
| Roster Sheet "Sync now": thêm/cập nhật/xóa + thu hồi (UI15) | **LIVE** (21/10) | Chỉ dùng Sheet giả lập |
| Roster đồng bộ theo lịch | OFFLINE | **Chưa chạy live**; Scheduler PAUSED |
| 100 pipeline AI đồng thời | **FAIL**, 6/100 ([22/10](evidence/STAGING_GEMINI_429_404_ROOT_CAUSE_2026-10-22.md)) | Blocker capacity |
| Hạn mức token theo phiên, rate limit 20/phút, chế độ chỉ đọc khi hết hạn, SSE | **Không có** | Thiếu so với test log |

## Test hiện tại

Chạy trong `apps/promptify-intrepid` ngày 22/10/2026, sau khi gỡ MVP: offline **56/56 PASS**; typecheck, boundaries, build, smoke đều PASS; lint 0 lỗi. Các warning đã biết: cycle `ProductionWorkspace.tsx` ↔ `ProductionWorkspaceV7.tsx` và chunk lớn hơn 500 kB.

Ngày 26/10/2026 (bằng chứng OFFLINE): offline **83/83 PASS**; typecheck, lint, boundaries, build và smoke đều PASS.

## Rủi ro repository

Commit cuối là `d7ac9d1` (08/10, chưa push). Toàn bộ code GCP và Intrepid, migration `gcp/sql`, phần lớn `docs/` đều **chưa được commit**. Evidence staging (`apps/promptify-intrepid/outputs/`) bị gitignore, nên chỉ có trên máy local. Đã có backup local đã kiểm chứng tại `C:\Ki_OJT\_backups\promptify-2026-10-22`. Xem [05_OPEN_ISSUES.md](05_OPEN_ISSUES.md).
