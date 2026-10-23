# Đối chiếu test log QA với dự án — 23/10/2026

Nguồn: Google Doc "Promptify - Test - log" (QA: Vo Tu Duc, 24 test case). Đọc chỉ để đối chiếu, không chạy test nào. Bản đối chiếu chi tiết từng case: [STAGING_FEATURE_DOC_PARITY_2026-10-22.md](STAGING_FEATURE_DOC_PARITY_2026-10-22.md).

Mức bằng chứng: **CODE** = có source; **LIVE** = đã chạy trên staging; **unknown** = chưa kiểm tra.

Tình trạng test log: bảng tổng hợp ghi 0/24 đã chạy. Chỉ có 3 dòng có kết quả: AUTH-01 Pass, AUTH-02 Pass kèm 2 ghi chú, ONBD-01 Fail.

**Trạng thái: chưa sửa gì.** Báo cáo này để trao đổi với chủ sản phẩm.

## 1. Lỗi tester đã ghi (việc nhỏ)

| Lỗi | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| AUTH-02: đổi email liên hệ L&D từ `duonglh.work@gmail.com` sang `duc.vo@intrepid.asia` | Email lấy từ cấu hình hỗ trợ của lớp; Admin chỉnh trong "Class support" (CODE: `WorkspacePreferences.tsx`, `mentorFeedbackService.ts`) | Đổi dữ liệu cấu hình, không cần sửa code |
| AUTH-02: bỏ câu "If you are an external enterprise client, request a B2B demo…" | Văn bản cố định trong code (CODE: `releaseUiTranslations.ts:271`, màn UI03 `ProductionEntry3.tsx`) | Sửa code nhỏ |
| ONBD-01: onboarding không hiện danh sách phòng ban | Danh sách phòng ban chỉ lấy từ client của các lớp mà người dùng đã được ghi danh (CODE: `productionServerService.ts` `departmentOptions`). Nếu `duc.vo` chưa ghi danh lớp nào thì danh sách rỗng (suy luận từ code; DB unknown) | Ghi danh vào lớp, hoặc đổi nguồn danh sách phòng ban |

## 2. Thiếu (tài liệu yêu cầu, dự án chưa có)

> **Cập nhật 23/10:** đã code đủ 4 tính năng PLAY-02, SEC-03, SEC-04 và AUTH-04, đều có test offline (CODE + OFFLINE, 72/72). Migration mới là `016_learner_safeguards.sql`. Mọi cờ mặc định tắt. **Chưa có LIVE:** chưa áp 016, chưa deploy. AUTH-03 không cần code, chỉ còn bước vận hành. Quy trình bật xem `docs/04_OPERATIONS.md`, mục "Các phần còn thiếu so với test log".

- **PLAY-02, SSE streaming:** chưa có. Hiện app chờ nhận đủ JSON rồi mới hiển thị (CODE).
- **SEC-03, giới hạn 50.000 token mỗi phiên:** chưa có (CODE).
- **SEC-04, chặn prompt injection:** chưa có middleware chặn injection và ghi log sự kiện bảo mật. Hiện chỉ có kiểm tra PII và chính sách coi input là không tin cậy (CODE).
- **AUTH-04, hết hạn theo từng người dùng:** chưa có cơ chế chuyển sang chỉ đọc kèm banner. Hiện chỉ có trạng thái ghi danh `expired/removed` và trả 403 (CODE).
- **AUTH-03, sync roster mỗi 5 phút:** đã có code, nhưng Scheduler đang PAUSED (LIVE: chưa chạy).
- **Tài khoản test:** chưa kiểm tra role của `duc.vo@intrepid.asia` và `demo.tech@intrepid.asia` (unknown).

## 3. Khác yêu cầu (cần chủ sản phẩm chốt)

| Tài liệu | Dự án hiện tại |
| --- | --- |
| Judge Gemini 3.8 **Pro** | Gemini 3.8 **Flash** cho Generation và Judge. Đổi model cần được duyệt |
| Mastery Score 0–100% | Lưu 0–10, có hiển thị thêm dạng % |
| 5 chiều cố định RCTCF | Rubric 5 tiêu chí theo bài, trọng số 30/20/20/15/15, ngưỡng đạt 8 |
| Layout 2 cột | 3 cột (V7) |
| Redis Memorystore, 20 lượt/phút | Không dùng Redis; quota SQL 40 lượt/giờ, 200 lượt/ngày |
| Chỉ domain whitelist, chặn Gmail cá nhân | Roster + quyền theo lớp; Gmail có trong roster vẫn vào được |
| URL Vercel / `staging.promptify.app` | Firebase Hosting `ai-transformation-510302-intrepid-staging.web.app` |
| Lưu vào thư viện khi điểm > 85% | Không có ngưỡng điểm; Head/Admin duyệt |
| Admin `demo.tech@intrepid.asia` | Admin `duonglh.work@gmail.com` |
| ~550 SOP | Staging có 4 file TXT giả lập đã duyệt |

## 4. Thừa (dự án có, tài liệu không đề cập)

- Judge async qua Cloud Tasks (LIVE).
- Vai Head (Analytics, duyệt thư viện) và Trainer Studio (rubric, trọng số, sandbox).
- Quản trị SOP: phiên bản, bản gốc immutable trên GCS, tải file gốc, binding Drive/Sheets.
- Chứng chỉ và thành tích; audit việc sửa phòng ban; thông báo qua Firestore; projection BigQuery.
- Phạm vi Public/Basic (migration 040/041), trong khi quyết định D11 đặt nó ngoài phạm vi.
- Code legacy Supabase/Vercel (xem `05_OPEN_ISSUES.md`).

## 5. Câu hỏi cho chủ sản phẩm

1. Sửa test log theo hợp đồng hiện tại (Flash, rubric theo bài, 3 cột, quota SQL) hay sửa app theo tài liệu?
2. Có bắt buộc rubric RCTCF cố định không?
3. Thứ tự ưu tiên cho 4 mục thiếu: SSE, giới hạn token theo phiên, chặn injection, chỉ đọc khi hết hạn.
4. Gmail cá nhân có trong roster có được vào không?
5. Tài khoản Admin chính thức là ai?
6. Giữ hay bỏ phạm vi Public/Basic?
