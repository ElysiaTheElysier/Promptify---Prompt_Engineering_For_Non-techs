# Developer walkthrough

## Đọc source trong 30 phút

Repo có hai app độc lập. [Repository guide](../archive/repository/REPOSITORY_GUIDE-two-apps-2026-10-12.md) và [AGENTS](../../AGENTS.md) quy định app-local runtime, services, types, tests; không import chéo MVP/Intrepid. Database history ở root `supabase/`; target và runtime GCP thuộc Intrepid. Đừng chạy script live chỉ vì tên có chữ test.

Intrepid bắt đầu tại [main.tsx](../../apps/promptify-intrepid/src/main.tsx), vào [ProductionApp](../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx). UI00–15 thuộc production components; client dùng [productionClientService](../../apps/promptify-intrepid/src/services/productionClientService.ts), API [product.ts](../../apps/promptify-intrepid/api/product.ts), dispatch tại [productionServerService](../../apps/promptify-intrepid/src/services/productionServerService.ts). [Cloud Run server](../../apps/promptify-intrepid/src/services/cloudRunServer.ts) là HTTP entry target. Không đưa server keys hay PostgreSQL pool vào frontend.

## Người dùng bấm Chấm điểm thì chuyện gì xảy ra?

1. UI gửi attempt ID, class ID và lesson ID; client không được tự gửi điểm đáng tin hoặc snapshot để server chấm.
2. [apiAuthorizationService](../../apps/promptify-intrepid/src/services/apiAuthorizationService.ts) kiểm tra access. [Firebase server identity](../../apps/promptify-intrepid/src/services/firebaseServerIdentityService.ts) xác thực token rồi ánh xạ Firebase UID về business UUID/legacy subject; email trùng mơ hồ phải dừng.
3. `evaluateSavedRun` trong [rebuildRunService](../../apps/promptify-intrepid/src/services/rebuildRunService.ts) kiểm tra attempt thuộc learner hiện tại và đọc snapshot server. Nếu đã có evaluation thì replay.
4. RPC `rebuild_claim_judge` lấy claim; claim đang chạy trả conflict. [productionAiService](../../apps/promptify-intrepid/src/services/productionAiService.ts) gọi model đã cấu hình. Context gửi Judge phải tương ứng context Generate đã lưu; không thay bằng rubric/context mới rồi giả vờ đang chấm cùng bài cũ.
5. `rebuild_finish_judge` lưu evaluation; progress được cập nhật theo SQL contract. Điều kiện award đọc lịch sử/attendance và config có scope. [Dependency register](../gcp-database-clean-audit/TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md) chỉ rõ RPC/trigger đọc ghi bảng nào.

Lần theo tests [verify_rebuild_runs](../../apps/promptify-intrepid/tests/verify_rebuild_runs.ts), [verify_judge_task_alignment](../../apps/promptify-intrepid/tests/verify_judge_task_alignment.ts), [verify_rubric_rounding](../../apps/promptify-intrepid/tests/verify_rubric_rounding.ts) và [regression plan](../gcp-database-clean-audit/DATABASE_REGRESSION_TEST_PLAN.md). Test mock provider chứng minh contract local; staging vẫn phải kiểm tra provider/IAM/SQL extension thực.

## Muốn đổi công thức progress

Đọc SQL `sync_lesson_progress_from_prompt_attempt`, `record_prompt_attempt_and_progress`, `update_prompt_attempt_evaluation_and_progress`, `product_refresh_awards` trong [target baseline](../../apps/promptify-intrepid/gcp/sql/001_baseline.sql), [weighted rubric](../../apps/promptify-intrepid/src/services/weightedRubricService.ts), [analytics](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts), và [award schema tests](../../apps/promptify-intrepid/tests/verify_awards_schema.sql). Phân biệt attempt legacy không có threshold với run mới có frozen threshold; đừng đổi expected results để hợp thức hóa thay đổi lịch sử. SQL, JS và BigQuery phải có cùng ý nghĩa metric, không bắt buộc cùng implementation.

## Vì sao rubric từng ảnh hưởng nhiều lớp?

Baseline `product_save_studio` có thể ghi vào lesson/rubric canonical của course, dù Studio có khóa `(class_id,lesson_id)`. User đã chọn class-local edits. Kiểm thử hai lớp cùng course với một lớp sửa, một lớp không đổi; kiểm tra Generate snapshot, lesson create, lesson reads, award refresh và projection invalidation, không chỉ kiểm tra hàng Studio. Xem [integrity rules](../database/integrity-rules/README.md).

## Thêm một cột vào database

Chuẩn bị migration forward-only mới; không sửa migration applied. Xem [cloudSchema metadata](../../apps/promptify-intrepid/src/services/cloudSchema.json) và embedded-relation resolver trong [cloudPostgresService](../../apps/promptify-intrepid/src/services/cloudPostgresService.ts). Thêm FK có thể làm adapter thấy hai quan hệ và báo ambiguity, nên cần regression JSON shape. Kiểm tra export allowlist, projection privacy allowlist, types/API validation, fixtures và SQL constraints. Chạy local isolated migration và dry-run export/import trước handoff.

## Chạy local trong 1–2 giờ

Node/runtime phiên bản theo [package](../../apps/promptify-intrepid/package.json), npm lock của app; PostgreSQL isolated và GCP credentials chỉ khi test yêu cầu. Từ `apps/promptify-intrepid`: `npm ci`, `npm run typecheck`, `npm run test:boundaries`, `npm test`, `npm run build`, `npm run dev`. Đọc allowlist [offline-tests.json](../../apps/promptify-intrepid/tests/offline-tests.json). Live API/provider tests và maintenance SQL là opt-in; không chạy wildcard mọi test.

Health `/healthz` chỉ nói process còn sống; `/readyz` thử kết nối DB. 401 là identity không hợp lệ, 403 là scope bị từ chối, 409 là claim/revision/ownership conflict, 429 là budget/quota, 503 là provider/persistence/recovery chưa an toàn. Đừng retry paid Generate khi đã tạo output nhưng lưu thất bại mà không reconcile request ID.

Xem [10 runtime flows](../architecture/runtime-flows/README.md), [database explorer](../database/schema-explorer/README.md) và [GCP handoff](../gcp/SETUP_GUIDE.md) để tiếp tục.
