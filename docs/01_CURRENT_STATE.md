# 01 — Hiện trạng Promptify Intrepid

## Staging 13/11/2026 chiều (thay dòng API và Hosting bên dưới)

| Thành phần | Trạng thái (LIVE 13/11) |
| --- | --- |
| API | `promptify-intrepid-api-rel2-1113` nhận 100% traffic. Image `rel-20261113-dd94f33` (`sha256:15df45de…`), build từ commit, không overlay. Env giữ nguyên 33 biến. Rollback: `rel1-1113` (giữ tag), rồi `rel2-1112` |
| Hosting staging | `7f197f04d64fb0cc` (commit `5d6368b`: Tab 3 slide có xem trước bên phải, Mở file, Tải về, Tải slide lên PDF → tạo bộ slide mới của lớp, xuất bản và chọn cho Lab; giảng viên bấm Lưu slide), rollback `e205ee1057fe82b6`. Trước đó `e205ee1057fe82b6` (commit `7d51b58`: bỏ chip tự sinh của bản 12–13/11 với id `core-*`/`default-*`, nút thu gọn rõ ràng; phát hành lại lần hai để xóa cache CDN), rollback `3d307edbae93368e` (`dd94f33`), rồi `540b5625abb4613f` |
| IAM | Thêm `roles/datastore.user` cho `promptify-api` (để API ghi thông báo Firestore). Không bớt quyền nào |
| Thay đổi | Real-time (D48): sau thao tác giảng viên, API ghi `userUpdates/{uid}/classes/{classId}` cho học viên của lớp; màn học viên tải lại sau 0–2 s. Chip scaffold không còn tạo sẵn (Studio và học viên chỉ dùng chip giảng viên tạo), mỗi chip một dòng, phần chip thu gọn được |
| Kiểm tra | OFFLINE: `npm test` 99/99 (có test thông báo lớp), typecheck, lint, boundaries, build, smoke PASS. LIVE: `/health`, `/readyz` 200; `/api/product`, `/internal/roster` không token 401 (cả qua Hosting); bundle live có Studio mới. **Chưa kiểm: học viên nhận cập nhật khi giảng viên lưu (cần đăng nhập hai tài khoản)** |

## Staging 13/11/2026 (thay dòng API và Hosting bên dưới)

| Thành phần | Trạng thái (LIVE 13/11) |
| --- | --- |
| API | `promptify-intrepid-api-rel1-1113` nhận 100% traffic. Image `rel-20261113-04b6730` (`sha256:3f31092b…`), build từ commit, không overlay. Env giữ nguyên 33 biến. Rollback: `rel2-1112` (giữ tag), rồi `rel1-1112` |
| Hosting staging | `540b5625abb4613f` (commit `04b6730`), rollback `6a2995087e4e2630` |
| Thay đổi | Scaffold chip do giảng viên đặt tên/xóa/nối tiêu chí (7 chip mặc định chỉ cho Lab chưa lưu chip; Sửa nhanh mở chip đã nối); ô biến có nhãn, học viên thấy "Nhãn học viên thấy" (`mappedTo`); bỏ dấu "+" thừa ở nút Thêm; action mới `extractSampleData` (chỉ người quản lý lớp): đọc PDF/DOCX/XLSX/CSV/TXT/MD ≤ 2 MB bằng parser SOP, chặn injection và dữ liệu cá nhân, tối đa 60.000 ký tự, chỉ trả về chữ, không lưu |
| Kiểm tra | OFFLINE: `npm test` 99/99, typecheck, lint, boundaries, build, smoke PASS. LIVE: `/health`, `/readyz` 200 trên tag mới; `/api/product` và `/internal/roster` không token 401 (cả qua Hosting); bundle live có Studio mới. **Chưa kiểm khi đăng nhập** |

## Staging 12/11/2026 tối (thay dòng API và Hosting bên dưới)

| Thành phần | Trạng thái (LIVE 12/11) |
| --- | --- |
| API | `promptify-intrepid-api-rel2-1112` nhận 100% traffic. Image `rel-20261112-6f69105` (`sha256:638269b6…`), build từ commit, không overlay. Env giữ nguyên 33 biến. Rollback: `rel1-1112` (giữ tag), rồi `rel3-1111` |
| Hosting staging | `6a2995087e4e2630` (commit `6f69105`), rollback `59100aff396a915f` |
| Thay đổi | Studio theo góp ý người test 12/11: tạo Lab hỏi doanh nghiệp + lớp rồi mở thẳng màn sửa; đổi doanh nghiệp của Lab có sẵn = chép sang lớp của doanh nghiệp đó ở trạng thái Nháp (bản cũ giữ nguyên, slide không chép); tên biến tự chuyển `ten_khach_hang`, báo lỗi tại ô và server nêu tên biến sai; Scaffold Chips liệt kê 5 chip chuẩn, thêm/xóa chip riêng, gắn tiêu chí; thêm/xóa mục tiêu; sửa được Yêu cầu bài tập, Prompt mẫu, Dữ liệu mẫu ở Tab 2; ô SLA cùng kiểu; nhãn "Học viên thấy" |
| Kiểm tra | OFFLINE: `npm test` 99/99, typecheck, lint, boundaries, build, smoke PASS; bấm thử trên trang thử local với dữ liệu giả. LIVE: `/health`, `/readyz` 200 trên tag mới; `/api/product` và `/internal/roster` không token 401 (cả qua Hosting); bundle live có Studio mới. **Chưa kiểm khi đăng nhập** |

## Staging 12/11/2026 (thay dòng API của bảng 11/11 bên dưới)

| Thành phần | Trạng thái (LIVE 12/11) |
| --- | --- |
| API | `promptify-intrepid-api-rel1-1112` nhận 100% traffic. Image `rel-20261112-6e2389a` (`sha256:9ae75146…`), build từ commit, không overlay. Env giữ nguyên 33 biến. Rollback: `rel3-1111` (giữ tag), rồi `rel2-1111` |
| Thay đổi | Sync roster tự động trên staging chạy cho **mọi lớp** bật auto sync, theo cùng luật với production (lịch ở tab Sync, tối thiểu 15 phút giữa hai lần). Trước đó chỉ 2 lớp `STAGING-SYNTHETIC-20261020-*` được sync tự động, nên NS-CC-2611 không tự sync lúc 08:00 dù màn Roster ghi "Mỗi 15 phút". Mỗi lần đọc vẫn phải qua kiểm tra nguồn đã duyệt cho lớp (025). Không có migration |
| Kiểm tra | `/readyz` 200 trên tag mới; `/api/product` và `/internal/roster` không token trả 401. **LIVE:** Scheduler tự sync NS-CC-2611 lúc 10:10 12/11 (giờ VN), thành công, +0/−0; lần tới theo tab Sync là 08:00 19/11 |

## Staging 11/11/2026 (thay các dòng tương ứng của bảng 10/11 bên dưới)

| Thành phần | Trạng thái (LIVE 11/11) |
| --- | --- |
| API | `promptify-intrepid-api-rel3-1111` nhận 100% traffic. Image `rel-20261111-9713888` (`sha256:eb9be092…`), build từ commit, không overlay. Env giữ nguyên 33 biến. Rollback: `rel2-1111` (giữ tag, `2fc2dbe`), rồi `rel1-1111` |
| Hosting staging | `59100aff396a915f` (commit `9dd78a1`: quản lý slide của lớp dạng thẻ, nút Xuất bản ở đầu khung rà soát), rollback `cc5d24d82c6f0079` (`bb85d1b`), rồi `e9711f81f4689608` (`537abcc`) |
| Thay đổi | Roster: workbook 6 tab là mặc định; tab Sync được để trống (đồng bộ mỗi 15 phút) và nhận `12/11/2026 08:00` là giờ Việt Nam; lỗi sync và lỗi tải SOP nói rõ nguyên nhân; file mẫu có tab Hướng dẫn, tiêu đề, dòng hướng dẫn, màu, danh sách chọn Department. Parser tìm dòng tên cột trong 5 dòng đầu (Sheet cũ vẫn chạy). Màn Roster và Quản trị hiện email service account để chia sẻ (nút Copy); file mẫu có ô chọn ngôn ngữ và ghi email ở đầu tab Hướng dẫn. Sheet roster nằm trong thư mục Drive đã duyệt cho lớp thì lưu/đồng bộ được (Drive xác nhận; duyệt từng Sheet vẫn giữ). Không có migration |
| Kiểm tra | `/readyz` 200 trên tag mới; `/api/product` không token 401 (cả qua Hosting); bundle live có file mẫu mới. **Chưa kiểm khi đăng nhập, chưa sync thử Sheet theo mẫu mới** |

## Staging 10/11/2026 (thay các dòng tương ứng của bảng 09/11 bên dưới)

| Thành phần | Trạng thái (LIVE 10/11) |
| --- | --- |
| API | `promptify-intrepid-api-rel2-1110` nhận 100% traffic. Image `rel-20261110-a631cea` (`sha256:33810f95…`), build từ commit, không overlay. Env giữ nguyên 33 biến. Rollback: `rel1-1110` (giữ tag), rồi `rel3-1109` |
| Hosting staging | `3ee504929e3a2723` (sửa giao diện Governance, commit `ea6456d`), rollback `252262f6a20b2031`, rồi `ddeff54b04f928a1` |
| Cloud SQL | Migration tới 027 (025 nguồn Workspace, 026 duyệt danh tính, 027 Admin tạo khoá học + lớp đầu tiên). Áp bằng Cloud SQL import (user postgres). Backup: `before-025-026-20261110`, `before-027-20261110` |
| Kiểm tra | `/health`, `/readyz` 200; `/api/product` không token 401 (cả qua Hosting); bundle live có màn duyệt nguồn và duyệt đăng nhập. **Chưa kiểm khi đăng nhập** |

Tài khoản staging lúc áp 026: 1/1 admin, 5/6 instructor, 2/3 head đã gắn danh tính. Tài khoản staff chưa gắn sẽ cần Admin duyệt ở lần đăng nhập đầu tiên.

## Staging đọc live 09/11/2026

| Thành phần | Trạng thái |
| --- | --- |
| API | `promptify-intrepid-api-rel3-1109` nhận 100% traffic. Image `rel-20261109-4336bbf`, build từ commit, không overlay. Max 10 instance, min 1, concurrency 80, pool 15. Rollback: `rel2-1109` → `rel1-1109` → `rag1-1109` → `slides-1104` |
| Hosting staging | `7ddf53ed74d8d0cd`, rollback `b1cc6c4052c86e36` |
| Cờ | `JUDGE_MODE=async`, `JUDGE_STREAM`, `GENERATION_STREAM`, `GCP_VECTOR_MODE=pgvector`, `EMBEDDING_MODEL=text-multilingual-embedding-002`, `CITATION_GATE=on`, `DISABLE_PUBLIC_BASIC=true`, `ACCESS_EXPIRY_MODE=enforce`, `INJECTION_GUARD=block`. Admission 013, Generation async 014 và fencing 015 vẫn tắt |
| Queue Judge | `promptify-judge-staging`: 100 lượt song song, 50 lượt/giây, 3 lần thử |
| Cloud SQL | `promptify-staging` PG18 ZONAL, migration tới 024. Backup `before-rag-reindex-20261109`. Đã diễn tập restore PITR: RTO 8,6 phút |
| Scheduler / Monitoring | Roster `*/5` ENABLED. 2 uptime check, 2 alert policy |
| Production | Đã có SQL `promptify-prod`, queue `promptify-judge-prod`, bucket, secret, SA, site Hosting. **Chưa có API và chưa có release Hosting**; chưa được động tới |
| Git | Nhánh `test/tm-001-tenant-isolation` đã push lên GitHub, có mọi commit tới `4336bbf` |

Vấn đề mở: [05_OPEN_ISSUES.md](05_OPEN_ISSUES.md). Chi tiết: [handoffs/UPDATES_2026-11-09_RAG.md](handoffs/UPDATES_2026-11-09_RAG.md).

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
