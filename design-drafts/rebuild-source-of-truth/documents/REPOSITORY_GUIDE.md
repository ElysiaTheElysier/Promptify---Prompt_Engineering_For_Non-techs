# Bản đồ repository Promptify

## Bắt đầu từ đâu

- [Nguồn sự thật sản phẩm](00_PRODUCT_SOURCE_OF_TRUTH.md): hướng Intrepid tương lai, không mô tả toàn bộ sản phẩm đang deploy.
- [Hiện trạng](01_CURRENT_STATE.md): audit lịch sử tại `06a4505`, chưa chạy lại toàn bộ sau cập nhật `bf1d194`.
- [Kế hoạch](02_IMPLEMENTATION_PLAN.md), [quyết định](03_DECISION_LOG.md) và [sơ đồ luồng](PROMPTIFY_SEQUENCE_FLOWS.md).
- Quy tắc thay đổi code: [AGENTS.md](../AGENTS.md).

## Cấu trúc và luồng chạy

| Đường dẫn | Trách nhiệm |
| --- | --- |
| `index.html` → `src/main.tsx` → `src/App.tsx` | Entry point; App quản lý session, role, lớp và navigation qua state/URL |
| `src/components/auth/`, `classes/` | Đăng nhập và chọn lớp |
| `src/components/dashboard/`, `hybrid/`, `lesson/`, `prompt/` | Luồng người học và workspace chính |
| `src/components/instructor/` | Luồng giảng viên; entry là InstructorViewShell |
| `src/components/common/`, `navigation/` | UI dùng chung và navigation |
| `src/services/` | Logic nghiệp vụ, AI, authorization, data access và adapter |
| `api/generate.ts`, `api/evaluate.ts` | Entry point serverless Vercel |
| `src/types/` | Hợp đồng và kiểu dữ liệu chung |
| `curriculum-specs/`, `curriculum-levels/` | Nguồn lab và giáo trình |
| `src/data/` | Seed/fallback; curriculumSeed.ts và labsData.ts do generator sinh |
| `supabase/` | Schema, migrations, rollback và staging verification |
| `test/` | Script kiểm tra; một số cần dịch vụ live |
| `scripts/` | Generator tài liệu, curriculum và kiểm tra offline |
| `scripts/progress-tracker/` | Các generator/biến thể tracker được giữ cùng input; cần @oai/artifact-tool ngoài dependency ứng dụng |
| `scripts/historical/` | Template audit cũ có nội dung ngày 05/10/2026; không dùng như chứng nhận hiện trạng |
| `docs/archive/` | Audit, bản nháp và tài liệu bàn giao lịch sử |
| `design-drafts/` | Source prototype và screenshot tham chiếu, tách khỏi app production |
| `outputs/`, `tmp/` | Output và scratch bị ignore; không đặt source tái sử dụng tại đây |

Luồng người học: `App → đăng nhập → lớp được cấp quyền → LearnerHome/LearnerDashboard → HybridView`.

Luồng giảng viên: `App → InstructorViewShell → dashboard/lớp/learner/curriculum`.

AI: `HybridView → llmService → /api/generate hoặc /api/evaluate → apiAuthorizationService + apiServerService → provider`. Khi dev, middleware trong `vite.config.ts` gọi cùng các service. API không tự lưu attempt.

Lưu dữ liệu: `HybridView → dbService → Supabase RPC → prompt_attempts + trigger lesson_progress`. App tải curriculum qua adapter; history/library vẫn có dữ liệu browser-local.

Sinh curriculum: `curriculum-specs → scripts/generate-curriculum-seed.mjs → src/data và migration 005`. Không chạy generator hoặc áp dụng SQL như một bước dọn repo.

## Lệnh kiểm tra

```sh
npm ci
npm run dev
npm run build
npm run test:curriculum
npm run test:access
npm run test:progress
```

Hai test curriculum/access dùng memory fallback khi không có cấu hình Supabase; phải bỏ credential live trước khi chạy. Test progress kiểm hợp đồng source/SQL. Các kiểm tra này không chứng minh DB hoặc deployment production.

`scripts/run_offline_checks.py` là runner audit rộng hơn: đọc danh sách test được chọn/bỏ qua trước khi dùng. Output nằm trong `outputs/offline_test_results.json`.

Generator Python cần python-docx; generator tracker cần runtime có @oai/artifact-tool. Không thêm các dependency tạo tài liệu vào bundle ứng dụng. Output tài liệu mới nằm trong `outputs/document-drafts/`, tracker trong `outputs/progress-tracker/`; không ghi đè tài liệu đã duyệt.

## Phân loại sau cleanup 06/10/2026

| Phân loại | Quyết định |
| --- | --- |
| KEEP | Runtime đang được import, API/config, tests, SQL history, curriculum, tài liệu hiện hành và prototype source |
| MOVE | Bốn tài liệu lịch sử ở root → docs/archive/handoffs; generator từ tmp → scripts |
| MERGE | Bản đồ repo duy nhất ở tài liệu này; tài liệu lịch sử giữ riêng vì khác thời điểm/mục đích |
| GENERATED | Seed, migration sinh tự động, output tài liệu/tracker; không sửa dữ liệu production trong cleanup |
| TEMPORARY | Đã xóa 37 render PNG/PDF trong tmp và một pyc; outputs/tmp/cache tiếp tục bị ignore |
| DELETE_CANDIDATE | Đã xóa Header, OnboardingTutorial, InlineCompareCard: không có import/config/test/script thực thi; navigation/tutorial/compare hiện dùng component khác |
| UNKNOWN | Notebook, PlaygroundView độc lập, ExpirationBanner, HistoryDrawer, LearnerDetailModal và các biến thể prototype/tracker chưa có quyết định loại bỏ; giữ nguyên |

Notebook/PlaygroundView không được App mount, nhưng còn code riêng và hợp đồng kiểu; chưa gộp hoặc xóa chúng chỉ vì không có import từ App. Tham chiếu trong audit lịch sử đến file đã xóa vẫn là bằng chứng cho commit cũ.

Local đã cập nhật `main` lên `bf1d194d67524683776606095fe13fa338252c12`. Ba tài liệu chuyển vào archive và tài liệu/prototype chưa tracked là công việc có trước cleanup, được giữ. Không push, deploy hoặc áp dụng migration trong đợt này.

Nợ kỹ thuật còn lại: App/HybridView lớn; bundle JS khoảng 1,30 MB trước gzip; runtime generator tài liệu cần môi trường riêng. Giữ nguyên cấu trúc runtime, không tách state/component hoặc thay đổi hành vi trong đợt dọn repo.
