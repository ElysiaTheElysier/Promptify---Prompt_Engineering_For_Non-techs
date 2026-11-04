# Bàn giao: Slide bài giảng theo lớp–lab (04/11/2026)

Theo [proposal](../proposals/CLASS_LAB_SLIDES_2026-11-04.md). Commit `e245253` (chưa push).

## 0. Release staging (04/11, theo yêu cầu của chủ dự án)

| Thành phần | Trạng thái | Rollback |
|---|---|---|
| Bucket `ai-transformation-510302-intrepid-slides-staging` | Mới: asia-southeast1, uniform access, chặn public; CORS GET/PUT/HEAD cho origin Hosting staging + localhost:5195; `promptify-api` chỉ có `objectCreator` + `objectViewer` trên bucket này | Không cần (bucket rỗng ngoài dữ liệu thử) |
| Cloud SQL `promptify-staging` | 024 đã áp bằng `gcloud sql import` (user postgres); verify SQL PASS; backup `before-024-lesson-slides-20261104`. Quyền tạm `objectViewer` của SA Cloud SQL trên bucket SOP đã thu hồi, file import đã xóa | `rollback/024_lesson_slides.sql` (sau khi đưa API về `rel5-1103`) |
| API | `promptify-intrepid-api-slides-1104` 100% (image `app:rel-20261104-e245253`, `sha256:8a6aba12…`, build từ commit, không overlay); env chỉ thêm `GCP_SLIDES_BUCKET` | `rel5-1103` |
| Hosting | Version `94e6c5040961f13e` (33 file, `/` no-store) | `ae77df02f9952ac2` |

LIVE (không đăng nhập): `/health`, `/readyz` 200; `/api/product` không token 401 (cả qua Hosting); chunk `pdf-*.js`, `pdf.worker.min-*.mjs`, `LessonSlidesViewer`, `ClassSlideDecks` phục vụ 200 `text/javascript` từ origin Hosting; bucket: GET ẩn danh 403, preflight CORS trả đúng origin. Nghiệm thu khi đăng nhập (admin LamHaiDuong, lớp giả lập `STAGING-SYNTHETIC-20261020-NORTHSTAR`, PDF giả, AI 0) — **LIVE PASS**: upload riêng tư qua signed URL + CORS; server đếm 30 trang; viewer xem trước render trên origin Hosting (pdf.js + worker); Publish; Make default (hộp xác nhận liệt kê 4 lab kế thừa); Studio `PRACTICE-DELIVERY-02` chặn 13–40 ("This deck has 30 pages"), lưu 13–24, xem trước mở trang 13 với "Part of this lab: 13–24"; Replace bằng PDF 20 trang → "Pages: 30 → 20", lab 02 "Beyond page 20", Publish bị chặn, Cancel giữ bản 30 trang (bản nháp 20 trang còn lại, chưa xuất bản). Lỗi nhỏ thấy được: nút chọn file gốc hiện trong "Replace PDF" (CSS `.prod-app input{display:block}`), đã sửa ở local, chưa deploy. Phía học viên (learner giả lập "Demo", Northstar) — **LIVE PASS**: lab `PRACTICE-DELIVERY-02` có tab Prompt | Slides, Prompt mở đầu, pdf.js/worker chỉ tải sau khi bấm Slides; mở ở trang 13/30 với "Part of this lab: 13–24"; ← → trong viewer đổi trang; Full screen → Esc giữ trang; quay lại Prompt: bản nháp giống hệt, con trỏ về đúng vị trí (359) và đang focus, attempt V35 + điểm 10/10 còn nguyên; ← → trong editor chỉ di chuyển con trỏ; quay lại Slides vẫn ở trang đã xem. Lab `PRACTICE-DELIVERY-01` mở trang 1/30, không có nhãn phần. Bản nháp thử của học viên đã trả về nguyên trạng (337 ký tự, "Draft: saved").

Lỗi tìm thấy khi nghiệm thu và đã sửa (commit `a2d686b`, Hosting `8507d632`, rollback `94e6c504`): lớp phủ toàn màn hình nằm dưới cột kết quả (panel giữa `position: sticky` tạo stacking context) — kiểm lại LIVE: phủ kín, Esc thoát; nút chọn file gốc hiện trong "Replace PDF" — đã sửa CSS, **chưa kiểm lại bằng tài khoản editor**.

**Đổi bố cục theo yêu cầu chủ dự án (commit `202b0f9`, Hosting `5a1a266a`, rollback `8507d632`):** tab Slides chuyển vào dải tab cột trái (Exercise · Theory · Hints · Resources · Slides), chỉ hiện khi lab có slide đã xuất bản; cột giữa trở lại nguyên bản (trình soạn prompt luôn hiện, không bị ẩn khi xem slide). LIVE PASS (learner Demo): mở trang 13 với "Part of this lab: 13–24", editor vẫn hiện song song; đổi trang → Exercise → Slides giữ trang 15; toàn màn hình phủ kín header + cột giữa + cột phải; Esc thoát, giữ trang; pdf.js chưa tải trước khi bấm Slides; không cuộn ngang ở 1366×800. Offline 93/93.

Chưa kiểm LIVE: học viên lớp khác bị từ chối (chỉ OFFLINE), Google Slides/Drive (lớp chưa có thư mục Drive được duyệt chứa file Slides), hai editor xuất bản đồng thời trên Cloud SQL thật. Dữ liệu thử còn lại trên staging: bộ `QA-fictional-deck-30p` (mặc định của Northstar, 4 lab dùng; lab 02 đặt 13–24) và một bản nháp 20 trang chưa xuất bản. Evidence local: `apps/promptify-intrepid/outputs/staging-release-2026-11-04-slides*/`.

Mức bằng chứng: **CODE** = chỉ có source · **OFFLINE** = test offline / PGlite / harness local · **LIVE** = chưa có.

## 1. Đã làm

| Phần | File |
|---|---|
| Migration 024 + rollback | `apps/promptify-intrepid/gcp/sql/024_lesson_slides.sql`, `gcp/sql/rollback/024_lesson_slides.sql` |
| Schema allowlist (3 bảng, 5 RPC) | `src/services/cloudSchema.json` |
| Dịch vụ slide (resolver, kiểm PDF bằng pdf-lib, Drive PDF/Google Slides export) | `src/services/lessonSlidesService.ts` (mới) |
| 11 action API | `src/services/productionServerService.ts` (`slideDecks`, `prepareSlideUpload`, `completeSlideUpload`, `listDriveSlides`, `importDriveSlides`, `previewSlideVersion`, `publishSlideVersion`, `setDefaultSlideDeck`, `saveLessonSlides`, `removeSlideDeck`, `openSlides`); snapshot thêm `lesson.slides` (metadata nhẹ, chỉ bản đã xuất bản) |
| Bucket riêng cho slide | `src/services/cloudStorageService.ts` (logical `product-lesson-slides` → env `GCP_SLIDES_BUCKET`), `src/services/firebaseIdentityService.ts` (cho phép PUT vào bucket này) |
| Drive | `driveFolderService.ts` (`listDriveFolder` nhận bộ lọc), `workspaceSourcePolicyService.ts` (`approvedFolders`), `sopIngestionService.ts` (export `boundedBody`). Luồng SOP không đổi hành vi |
| Thông báo lỗi EN/VI | `src/services/productI18nService.ts` |
| UI giảng viên: Quản lý lớp → Slide bài giảng | `src/components/rebuild/ClassSlideDecks.tsx` (mới), gắn vào dialog trong `ProductionApp.tsx` |
| UI Studio: Học liệu → Slide bài giảng | `src/components/rebuild/LessonSlidesSettings.tsx` (mới), gắn vào tab materials của `ProductionStudioSource.tsx` |
| Viewer + tab Prompt \| Slides | `src/components/rebuild/LessonSlidesViewer.tsx`, `lesson-slides.css` (mới), `ProductionWorkspaceV7.tsx` |
| Phụ thuộc | `pdfjs-dist` 5.4.296 khai báo trực tiếp (đã có sẵn trong lockfile qua `pdf-parse`, không tải gói mới) |
| Test | `tests/verify_lesson_slides.ts` (mới, thêm vào allowlist), mở rộng `tests/verify_learner_ui_state.mjs` |

Thiết kế chính:
- Bộ slide thuộc lớp; phiên bản PDF bất biến (key mới mỗi phiên bản); tối đa 1 bộ mặc định/lớp (unique index); gán theo khóa `(class_id, lesson_id)`.
- Khóa ngoại kép `(deck_id, class_id)` và `(published_version_id, deck_id)` + trigger lesson-thuộc-khóa-học: không gắn được ID của lớp khác kể cả khi ghi thẳng DB.
- Mọi thay đổi đi qua RPC `SECURITY DEFINER` kiểm editor (owner/editor của khóa học hoặc admin) và khóa advisory theo lớp. Bảng chỉ cho `service_role` (RLS), API tự kiểm quyền đọc.
- Xuất bản: kiểm `expectedVersionId` (hai editor cùng lúc → người sau nhận "Slide deck changed; reload"), cập nhật mốc trang + đổi version trong một transaction; xuất bản lại cùng version là no-op. Thêm version idempotent theo `request_id`.
- Học viên chỉ gửi `classId + lessonId`; server dùng snapshot (quyền lớp, trạng thái/lịch/tier của lab) rồi ký URL đọc 300 s. URL không lưu DB/log.
- Không chạy extraction/RAG/embedding/Gemini/Judge cho slide.

## 2. Kết quả check (04/11, OFFLINE)

| Check | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 lỗi; 1 warning cũ (cycle `ProductionWorkspace` ↔ `ProductionWorkspaceV7`) |
| `npm run test:boundaries` | PASS |
| `npm run build` | PASS; warning chunk > 500 kB cũ. pdf.js (`pdf-*.js` ~440 kB) và worker (`pdf.worker.min-*.mjs`) là chunk riêng, chỉ tải khi bấm Slides |
| `npm run test:smoke` | PASS |
| `npm test` | **93/93 PASS** (baseline hôm nay 92/92 + `verify_lesson_slides.ts`) |

## 3. Ma trận nghiệm thu

| Ca | Mức | Bằng chứng |
|---|---|---|
| Một lớp, một deck, hai lab (L1 trang 1, L2 trang 13–24; deck riêng cho L2 chỉ đổi L2) | OFFLINE | `verify_lesson_slides.ts` §3–4 |
| Hai lớp dùng chung lesson; ID đoán được bị chặn (preview/publish/gán/gỡ/thêm version chéo lớp; FK chặn ghi thẳng DB) | OFFLINE | §5 |
| Kế thừa và gỡ (đổi mặc định chỉ ảnh hưởng lab kế thừa; gỡ cần bộ thay thế hoặc xác nhận tắt; không còn liên kết hỏng) | OFFLINE | §4, §8 |
| Bản nháp và cập nhật (học viên vẫn xem v1; chặn mốc vượt tổng trang; version + mốc đổi cùng lúc) | OFFLINE | §6 |
| Quyền và thời hạn (viewer/learner không upload/publish; lab khóa; nguồn Drive ngoài lớp; học viên bị gỡ khỏi lớp bị từ chối khi xin URL mới) | OFFLINE | §2, §7, §9 |
| Lỗi và đồng thời (PDF giả/hỏng/có mật khẩu/quá lớn, Drive mất quyền, export > 10 MB, retry upload, hai editor publish cùng lúc) | OFFLINE | §2, §3, §6, §7. Ghi chú: pool PGlite tuần tự hóa kết nối, nên "đồng thời" kiểm cơ chế `expectedVersionId`, không kiểm race thật trên Cloud SQL |
| Trải nghiệm thực hành (gõ prompt → Slides → đổi trang → toàn màn hình → Esc → Prompt; nháp + vị trí con trỏ còn nguyên; mũi tên trong editor vẫn di chuyển con trỏ) | OFFLINE | Component thật trong harness local trên built-in browser: nháp và caret (25) giữ nguyên, trang 15 giữ nguyên khi quay lại, PDF tải 1 lần. Workspace thật: `verify_learner_ui_state.mjs` (editor ẩn chứ không unmount, viewer chưa tải trước khi bấm Slides). Attempt/output: cùng cơ chế (không unmount), **chưa** kiểm khi đăng nhập |
| Hiệu năng và tương thích (mở lab chưa tải PDF; worker render; 1280×720, 390 px, EN/VI, bàn phím) | OFFLINE (dev server) | Harness: pdf.js + worker render; 390 px không cuộn ngang; EN/VI. Bản build: chunk tách đúng, **chưa** mở bằng browser trên origin Hosting. "Học liệu link cũ" (materials) không bị đổi code |
| Staging: CORS, signed URL, worker trên origin Hosting, Google Slides thật | **Chưa chạy** | Cần bạn cho phép riêng |

## 4. Hạ tầng cần có trước staging (chưa làm)

1. Migration `024_lesson_slides.sql` (cần owner credential). Rollback: `rollback/024_lesson_slides.sql` (deploy API không có action slide trước).
2. Bucket riêng tư mới, ví dụ `ai-transformation-510302-intrepid-slides-staging`: uniform access, public access prevention, không cấp IAM công khai.
3. Service account của API: quyền tạo + đọc object **chỉ trên bucket này** (giống bucket SOP), và quyền ký URL như luồng SOP hiện có.
4. Env Cloud Run API: `GCP_SLIDES_BUCKET=<tên bucket>` (template `gcp/cloudrun-api.yaml.template` chưa sửa).
5. CORS của bucket slide: origin Hosting staging; method `PUT`, `GET`; response header `Content-Type`, `x-goog-if-generation-match`.
6. Drive: dùng `WORKSPACE_SOURCE_BINDINGS_JSON` hiện có (`{"<classId>":{"folders":["<folderId>"]}}`) và chia sẻ thư mục cho service account (Viewer). Nhập Folder URL trên UI không tự cấp quyền.

## 5. Tự chạy thử

Offline (không cần cloud), trong `apps/promptify-intrepid`:

```bash
node node_modules/tsx/dist/cli.mjs tests/verify_lesson_slides.ts
```

```bash
node tests/verify_learner_ui_state.mjs
```

```bash
npm test
```

Viewer trên browser, không API/cloud: chạy `npx vite --host 127.0.0.1 --port 5197` **từ thư mục gốc repo** rồi mở `http://127.0.0.1:5197/apps/promptify-intrepid/tmp/slides-harness/index.html` (harness nằm trong `tmp/` bị ignore; có cấu hình `intrepid-slides-harness` trong `.claude/launch.json`).

Kịch bản đầy đủ (sau khi có migration + bucket, ví dụ trên staging, dùng dữ liệu giả), hai lớp A, B cùng khóa học và ít nhất hai lab:
1. Editor lớp A: header → Quản lý lớp → Slide bài giảng → nhập tên, chọn PDF 30 trang → "Tải lên và xem trước" → Xuất bản → "Đặt mặc định".
2. Studio → lab 2 → Học liệu → Slide bài giảng: "Theo mặc định của lớp", trang 13–24 → "Xem trước tại trang bắt đầu" → Lưu slide.
3. Học viên lớp A: lab 1 mở trang 1; lab 2 mở trang 13 với "Phần của bài: 13–24". Gõ prompt → Slides → đổi trang → Toàn màn hình → Esc → Prompt: nháp còn nguyên.
4. Học viên lớp B: không có tab Slides (cho tới khi lớp B có cấu hình riêng).
5. Editor A: "Thay file PDF" bằng bản 20 trang → màn rà soát báo 30 → 20, lab 2 lỗi "Vượt quá trang 20" → sửa thành 13–20 → Xuất bản. Trong lúc rà soát, học viên vẫn xem bản 30 trang.
6. Gỡ một bộ đang dùng: phải chọn bộ thay thế hoặc tick "Tắt slide ở các lab này".
7. Drive: "Liệt kê file được phép" → "Nhập và xem trước" một Google Slides; sau đó bỏ chia sẻ file và bấm "Lấy bản mới từ Drive" → bị từ chối, bản cũ vẫn phục vụ.

## 6. Còn mở / giới hạn

- **Link trong PDF chưa bấm được**: không bật annotation layer của pdf.js (đề xuất ghi "nếu hỗ trợ"). Slide là trang tĩnh: mất animation, video, speaker notes.
- `openSlides` dựng lại snapshot để kiểm quyền (giống `recordOutcome`), nên tốn hơn một truy vấn chuyên biệt.
- Gỡ bộ slide xóa metadata; object PDF trong bucket giữ nguyên (bất biến), cần dọn riêng nếu muốn.
- Lab kế thừa khi lớp không còn mặc định sẽ ẩn tab Slides (tương đương tắt).
- Chưa có chỉnh sửa tên bộ slide sau khi tạo trên UI (RPC publish có nhận `title`, UI chưa dùng).
- Toàn màn hình: nếu trình duyệt/webview từ chối Fullscreen API, viewer dùng lớp phủ toàn cửa sổ; Esc thoát cả hai.
- Hosting không có CSP nên không cần đổi header cho worker/`storage.googleapis.com`; nếu sau này thêm CSP cần `worker-src 'self'` và `connect-src https://storage.googleapis.com`.
