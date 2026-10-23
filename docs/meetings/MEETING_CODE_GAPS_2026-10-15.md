# Những điểm code Intrepid còn khác buổi review của thầy

Kiểm tra working tree ngày 15/10/2026. Đối tượng `apps/promptify-intrepid`, chưa sửa source ứng dụng. Nguồn yêu cầu: [báo cáo video](MEETING_REVIEW_2026-10-12.md), [transcript](MEETING_TRANSCRIPT_2026-10-12.md). Kết luận là source/offline; chưa xác minh deployment, dữ liệu hoặc tốc độ đăng nhập live.

## Kết luận và hiệu chỉnh báo cáo trước

Ứng dụng đã có phần lớn khung chức năng thầy mô tả. Công việc tiếp theo là sửa đường nối dữ liệu và những hành vi chưa đúng, rồi kiểm thử theo vai trò.

Đã lần theo entry: `src/main.tsx` → `ProductionApp`. UI-11 thực sự mount `ProductionStudioSource` tại `ProductionApp.tsx:112`; `ProductionStudioV2` được import và xuất hiện trong fallback JSX phía dưới nhưng không phải nhánh UI-11 được chạy trước. Do đó, báo cáo trước viện dẫn dirty state/save của V2 chưa đủ chứng minh Studio đang chạy có cùng hành vi. Workspace thực sự dùng wrapper `ProductionWorkspace` → `ProductionWorkspaceV7`.

Hai điểm cần ghi nhận rõ hơn: learner upload **đã có** UI và server extraction/embedding (`ProductionWorkspaceV7.tsx:25,49`, `productionServerService.ts:223–232`); mô hình **đã bị server giới hạn** trong danh sách admin cấu hình (`rebuildRunService.ts:53`). Không cần xây lại hai phần này.

## Các khoảng cách đã xác định

| Ưu tiên | Ý thầy và timestamp | Code hiện tại / khoảng cách | Việc cần làm |
| --- | --- | --- | --- |
| P1 | Chèn đúng đoạn SOP, giảm context/token; 01:06:14–01:09:16 | `rebuildRunService.ts:59–64` tạo `inputContext` trước retrieval; nhánh retrieval cập nhật `lesson.sample_input_context` nhưng provider tại `:88` vẫn nhận biến `inputContext` cũ. Probe offline xác nhận `retrievedContextUsed:false`. | Chốt context cuối cùng sau retrieval/fallback, rồi tạo hash/snapshot và truyền đúng context đó cho Generate/Judge. Test cả pgvector, BigQuery, no match và provider failure. |
| P1 | Mỗi attempt là một lượt mới, ngữ cảnh riêng; 01:03:20–01:06:04 | `ProductionApp.tsx:99` giữ request ID khi prompt/settings/contextIds không đổi. Server replay kết quả cũ cho cùng ID. Vì vậy Run lần nữa với cùng đầu vào không tạo attempt mới như người dùng có thể mong đợi. | Phân biệt thao tác “chạy lượt mới” với retry một request đang lỗi/đang xử lý. Lượt mới có ID mới; retry giữ ID để không gọi provider trùng. |
| P1 | Giảng viên cấu hình và kiểm tra Codelab ở sandbox; 00:49:09–00:53:34 | Studio đang chạy: `ProductionStudioSource.tsx:33` gọi sandbox bằng lesson ID/prompt và báo dùng saved server configuration. Form vừa chỉnh chưa được gửi; save tại `:24` chỉ lưu rồi quay về directory. | Thêm trạng thái chưa lưu và lựa chọn lưu trước khi test hoặc sandbox với revision nháp được server kiểm tra. Kết quả phải ghi rõ revision đã chạy, tránh đánh giá cấu hình cũ. |
| P1 | Login Google → roster → hỗ trợ đúng đối tác/lớp; 00:00:47–00:07:52 | OAuth đã chọn account. UI-01 vẫn có link Help `#` (`ProductionEntry1.tsx:20`); UI-03 dùng contact email cố định (`ProductionEntry3.tsx:20`), chưa phải contact theo client/class. | Nối help thật, cấu hình contact theo đối tác/lớp, lưu support request và hiện kết quả gửi. Test email chưa provision, account khác, scope lớp. |
| P1 | Roster Sheet là cánh tay onboarding, dữ liệu login vào DB; 00:13:15–00:25:33 | `googleRosterService.ts:4–26,57–69` chỉ đọc một tab/range, bốn field email/fullName/department/country; chỉ lấy department đang chọn và tối đa 500 hàng hợp lệ. Có worker 15 phút nhưng chưa thấy hợp đồng đa tab Sync/Department/SOP/Main PIC hoặc lịch theo mốc cột A. | Hoàn thiện template và mapping theo client/class, lịch sync, schema version, lỗi và audit. Chốt thu hồi quyền khi user biến mất khỏi Sheet trước khi triển khai đồng bộ xóa. |
| P2 | Variables từ Studio nối vào workspace; 00:49:29–00:50:26 | Studio lưu metadata variables; V7 `:37` hiển thị tên/sample. Đường Generate tại `ProductionApp.tsx:99` không gửi giá trị biến riêng; run service không có bước bind template với variables. | Định nghĩa biến bắt buộc/kiểu/mapping, UI nhập và server bind có validation; lưu template lẫn giá trị thực trong attempt. Nếu chỉ là ví dụ học tập thì đổi tên để tránh hàm ý đã bind. |
| P2 | Học liệu chung lọc theo pillar/category; 00:37:43–00:38:29 | `LearnerResourceHub.tsx:8–13` lọc type và lesson title; chưa có pillar filter. Dùng title thay ID cũng không phân biệt hai lab trùng tên. | Mang lesson ID/pillar vào resource model và thêm filter đúng dữ liệu Studio. |
| P2 | Metric thật ở Hub và báo cáo ROI; 00:35:48–00:37:43, 01:15:26–01:16:20 | `ProductionHub.tsx:22` để timeSpent `—`. `ProductionAnalyticsSource.tsx:16–18` để ROI/hours saved `—`; export chỉ `window.print()`. | Chốt cách đo thời gian/baseline/ROI, bổ sung nguồn dữ liệu và xuất báo cáo có kỳ/tham số. Giữ `—` đến khi có dữ liệu được xác nhận. |
| P2 | Biết ai click nút nào và số lần; 00:44:44–00:45:23 | Có generation/security telemetry, chưa thấy event tracking thống nhất cho các nút workspace. | Thêm event schema cho Run/Compare/Hint/Solution/Resource/Save, kèm user/class/lesson và thời gian. Không đưa prompt/file content vào click events. |
| P2 | UI-02 cho sửa thông tin đúng chỗ, ghi DB; 00:28:51–00:31:24 | `ProductionEntry2.tsx:21–32` đã confirm/correct department vào RPC. Employee ID/office location chưa có luồng cập nhật tương đương; department correction hiện tự duyệt. | Chốt field cần v1; rà vị trí nút và test correction/đổi lớp, giữ audit. Không xây lại confirm đã có. |
| P2 | UI gọn, Run/Compare nổi bật, navigation không lặp; 00:43:34–00:44:03, 01:12:49–00:13:18 | `ProductionApp.tsx:103` bọc một thanh brand/cohort/language/navigation; nhiều màn Source có header riêng. V7 có Save ở toolbar và phần output. | Rà các màn được mount bằng browser và đối chiếu ảnh thầy; gom thao tác trùng sau khi xác định điểm vào cần giữ. |

## Những phần nên kiểm thử trước khi sửa

- Rubric tổng 100%, Save Studio, scaffold, awards và sandbox đều có luồng. Kiểm trên `ProductionStudioSource`, không lấy V2 làm bằng chứng thay thế.
- Save personal → pending → Head approve → team library; attempt history/compare và replay từ DB đã có đường nối. Cần test reload, đổi attempt và quyền class.
- Upload learner có extraction/embedding; tuy nhiên Generate hiện lấy toàn bộ `content` của file đã chọn (`rebuildRunService.ts:55–58`), chưa dùng retrieval trên chunks của learner file. Chốt có cần RAG cho file cá nhân hay v1 chỉ đưa toàn văn có giới hạn.
- Model allowlist đã kiểm ở server; Wiki, giải thích tham số, provider log và reasoning summary có trong V7. Không cần tự tạo giả “chain of thought”.
- Lịch lab và quyền theo class có code; test hai course chồng lịch thay vì giả định phải viết lại session handling.
- Cloud SQL/Firebase/BigQuery/Storage đã có source tích hợp. Cần kiểm readiness và môi trường trước khi kết luận đã chuyển dữ liệu. Video không đủ để yêu cầu migration ngay.

## Thứ tự thực hiện đề xuất

1. Sửa context RAG, lifecycle Run/retry và sandbox revision; thêm regression test có dữ liệu khác nhau rõ ràng.
2. Hoàn thiện login/help và roster contract; đo latency từng chặng trên môi trường test.
3. Nối variables, resource pillar/IDs và các field hồ sơ đã chốt.
4. Rà UI thực tế, event analytics, metric/report và kiểm thử toàn luồng learner/trainer/head/admin.
5. Kiểm cloud readiness, migration và rollout ở một công việc riêng sau khi chức năng có bằng chứng test.

## Kiểm tra đã chạy

- `npm run typecheck`: PASS.
- `tests/verify_rebuild_runs.ts`: PASS (offline), xác nhận canonical context, replay, save failure và Judge ownership; test này không đi vào nhánh retrieval.
- Probe offline dùng dependency injection tại `apps/promptify-intrepid/outputs/meeting-rag-probe.ts`: provider nhận `FULL_CANONICAL` dù retrieval trả `RETRIEVED`. Không gọi AI/DB thật.
- Không sửa source ứng dụng, không chạy migration, không deploy hoặc thay đổi dữ liệu live. Các thay đổi repo có sẵn được giữ nguyên.
