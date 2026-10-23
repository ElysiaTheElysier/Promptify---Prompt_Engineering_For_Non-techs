# Cập nhật UI revised và feedback giảng viên

Phạm vi: `apps/promptify-intrepid`, ngày 17/10/2026. Thực hiện theo [đối chiếu ba bản Word](REVISED_UI_COMPARISON_2026-10-17.md) và [feedback video](../meetings/MEETING_REVIEW_2026-10-12.md). Không deploy, không push, không thay đổi production hoặc áp dụng migration remote. Không sửa app MVP hay di chuyển/xóa các artifact có sẵn.

## Kết quả

Giữ brand assets/logo, theme emerald, font Inter và editor JetBrains Mono hiện tại. Không lấy editor tối, điểm nhấn tím, model/version, doanh nghiệp hoặc số liệu giả từ HTML của thầy làm dữ liệu ứng dụng. UI hiện tại dùng bố cục/chức năng revised với hệ thống card, button và typography đang có.

| Khu vực | Thay đổi |
| --- | --- |
| UI-04 Hub | Catalog có tìm kiếm, lọc pillar/tiến độ, mã lab/tier/phòng ban phù hợp, scenario, SOP và thời gian mở. Modal Details có scenario/objectives/competency và mở workspace. |
| Resume và tiến độ | Hiển thị lab đang học, điểm đã lưu, phút học đã ghi nhận. Tiến độ xét cả lab khóa có metadata, tránh lab hết giờ làm sai mẫu số. |
| Gamification/accreditation | Quiz/poll links từ Studio ra Hub; chứng chỉ/issuer/điều kiện/điểm mục tiêu và tiến độ; khu vực badge/certificate có dữ liệu đã cấp, preview/tải PDF. Không hiển thị thành tích chưa đạt như thành tích thật. |
| Học liệu | Giữ bộ lọc category/pillar/lesson ID; thêm ngày cập nhật và changelog. |
| UI-05 Workspace | Hai cột desktop: task bên trái, prompt và output/Judge xếp dọc bên phải; giữ editor sáng/theme hiện tại. CSS xếp dọc ở breakpoint hẹp. |
| Scaffold/micro-learning | Khung 5 thành phần, detector x/5 theo tag đầu dòng, nội dung impact/sample theo chủ đề, Copy/Insert/Wiki. Khung chuẩn chỉ thêm phần thiếu, không xóa nội dung đã nhập. Snippet giảng viên soạn được giữ nguyên khi chèn. |
| Quick Fix | Gợi ý phần core còn thiếu và tiêu chí Judge chưa đạt; mở snippet để người học quyết định chèn. Không tự nâng điểm hoặc sửa output cũ. |
| Params/Wiki | Giữ model allowlist, tooltip/Wiki; bổ sung slider Temp/Top P cùng numeric input. Wiki theo topic, System Instruction có đường vào Wiki. Không thêm model image/video không được backend hỗ trợ. |
| Run/Judge/history | Giữ request lifecycle/retry và lưu attempt thật. Thêm chỉ báo attempt và SLA target cấu hình tại Studio, nút gửi chấm điểm trên toolbar. Bản nháp sửa khác attempt có nhãn rõ output/grade thuộc version đã lưu. |
| Compare | So sánh inline ngay UI-05 bằng component dùng stored attempts: prompt/output diff, chọn version, diagnostics và restore đủ prompt/settings/variables/context IDs. UI-06 độc lập vẫn hoạt động. |
| Output/log/scorecard | Vùng output/log có giới hạn cuộn; diagnostics mở theo yêu cầu, có Quick Fix; điểm và lý do vẫn từ attempt đã lưu. Không dựng chain-of-thought giả. |
| Solution/library | Giữ reflection gate server, Save/Share qua Head, library replay. Thêm microcopy benchmark không phải đáp án duy nhất và nút copy; signature lưu template tính cả giá trị biến. |
| SOP | Chọn trang đã được index khi copy citation; hiện timestamp index thật thay vì lấy ngày tạo version làm ngày đồng bộ. Có Inspect source. Giữ form request/review hiện có, đưa inbox duyệt vào tab 3A Studio. |
| UI-11 | Giữ directory → năm tab, dirty/save/sandbox guards và rubric auto-balance. Department options dùng cả dữ liệu onboarding. Thêm SLA target tùy chọn và editor rule badge có cấu trúc. |
| Quyền tier | Learner Basic không nhận nội dung lab ADVANCE và không thể gọi Generate trực tiếp để vượt tier. Catalog chỉ nhận metadata khóa; có gửi yêu cầu kiểm tra quyền, không tự cấp seat hoặc thu phí. Draft/archive không đưa vào catalog learner như lab đang chờ lịch. |

Các thay đổi backend trước đây về roster sáu tab, hồ sơ, contact theo lớp, activity, báo cáo hiệu quả tự khai báo, RAG context, Save Studio, retry/idempotency tiếp tục được giữ. Việc xác minh Cloud SQL/Firebase/Sheet/Storage thật vẫn theo [báo cáo backend](BACKEND_VALIDATION_2026-10-16.md).

## Rule huy hiệu được thực thi

Thêm migration cộng thêm `gcp/sql/010_structured_badge_rules.sql`, không sửa migration đã áp dụng:

- `passed_lesson`, `overall_score` hoặc `criterion_score`.
- `any` passing attempt hoặc `first` (attempt_number = 1).
- Điểm criterion quy đổi về /10, ví dụ 2,7/3 = 9/10. UI ghi rõ đơn vị để tránh hiểu Groundedness cần đạt 9 điểm trên thang 3.
- Server vẫn yêu cầu enrollment, đúng class/lesson/learner và passing threshold đóng băng trong run.
- Award evidence lưu loại rule, criterion, ngưỡng, attempt scope và Studio revision; không tự thu hồi hoặc viết lại award lịch sử.

Đã thử bằng PostgreSQL offline: lượt đầu Groundedness 2/3, lượt hai 3/3. Rule “>=9/10 bất kỳ lượt” cấp badge; rule “>=9/10 chỉ lượt đầu” không cấp. Chạy refresh lại không cấp trùng, learner khác không thỏa điều kiện.

Snapshot có `awardRulesAvailable`. Nếu chưa có migration, UI khóa rule nâng cao và API không nhận cấu hình yêu cầu engine này, tránh giao diện nhận lưu nhưng DB vẫn áp dụng điều kiện cũ. Field mô tả huy hiệu là nội dung tham khảo; không tự diễn giải văn bản thành rule.

**Chưa áp dụng migration 010 lên staging/production.** Các form cần migration feedback 006 vẫn phụ thuộc schema đó như lượt trước. Migration local chỉ chạy trong PostgreSQL embedded dùng dữ liệu giả của test.

## Kiểm tra

- Typecheck và build PASS.
- 35/35 test offline PASS sau thay đổi; bổ sung test chèn framework không ghi đè nội dung, Quick Fix, snippet giảng viên, core detector, tier guard và PostgreSQL award rules. Test award được chạy lại sau khi bổ sung evidence và PASS.
- Lint/Dependency Cruiser và negative boundary tests PASS. Còn cảnh báo vòng type Workspace đã có; build cảnh báo bundle lớn, không đổi ngưỡng để giấu cảnh báo.
- Dev/API smoke PASS trên localhost, không gọi provider/DB thật.
- Browser mount component thật với adapter fixture có nhãn rõ: chèn khung lên 5/5, hai Run tạo V1/V2, Compare inline, Hub Details/search, SOP chọn Page 4→5 và copy đúng Page 5; xem editor rule badge. Không có console error trong lần kiểm cuối.
- Đã kiểm desktop ở client width 1274px. Công cụ viewport không áp dụng kích thước 390px được yêu cầu trong lần thử; không coi đây là chứng cứ UAT điện thoại. CSS breakpoint được kiểm trong source; cần xác minh thêm trên trình duyệt/thiết bị có viewport thực ở kích thước đó.

Ảnh dữ liệu giả:

![Hub](../../apps/promptify-intrepid/outputs/revised-ui-proof/hub.png)

![Workspace](../../apps/promptify-intrepid/outputs/revised-ui-proof/workspace.png)

## File chính

- UI: `ProductionHub.tsx`, `ProductionWorkspaceV7.tsx`, `ProductionStudioSource.tsx`, `DepartmentSopLibrary.tsx`, `SopSourceCard.tsx`, `LearnerResourceHub.tsx`, `ProductionApp.tsx`, `learner-workspace.css`.
- Logic/contracts: `scaffoldRecognitionService.ts`, `promptLearningService.ts`, `codelabLifecycleService.ts`, `studioValidationService.ts`, `mentorFeedbackService.ts`, `productionServerService.ts`, `rebuildRunService.ts`, `types/production.ts`.
- Validation: `verify_cloud_migration.ts`, `verify_mentor_contracts.ts`, `verify_learner_ui_state.mjs`; local runner nạp migration 010 vào DB thử.
- Bản trước chỉnh được giữ trong ignored `outputs/revised-ui-baseline`; ảnh/harness tiếp tục nằm trong ignored outputs.

Không đổi brand assets, global theme/font configuration, live IAM/env/domain/alias hoặc dữ liệu business. Bản cập nhật source/local đã có bằng chứng kiểm tra; luồng cloud chưa có quyền/config staging không được coi là đã UAT live.
