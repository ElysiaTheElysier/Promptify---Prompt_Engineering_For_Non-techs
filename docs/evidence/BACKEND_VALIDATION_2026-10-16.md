# Kiểm tra backend và các luồng feedback — 16/10/2026

Phạm vi Intrepid. Không deploy, không push, không thay đổi dữ liệu/schema/env/IAM production. Các env và khóa hiện có chỉ được đọc tại máy; không chép khóa vào source hoặc báo cáo. Giữ nguyên thay đổi tách app có sẵn và không sửa MVP.

## Cấu hình tìm thấy

| Nguồn | Kết quả kiểm tra | Cách sử dụng trong lượt này |
| --- | --- | --- |
| `.env.rebuild.local` ở root | Có Supabase URL, anon/service key, Gemini key/model và Sheets service identity cũ | Supabase chỉ HEAD đếm bảng/GET auth settings. Chỉ nạp riêng Gemini key/model vào backend local cho nội dung hư cấu. Không nạp toàn bộ env vào app mới. |
| `.env.production-setup.local` ở root | Có đường dẫn service account và Sheet mẫu | Sheets API scope `spreadsheets.readonly`; chỉ đọc tên tab và hàng header, không lấy bản ghi người học. |
| `.env`, `.env.rotation.local`, `.env.roster-worker.local` | Cấu hình legacy/provider/worker | Không dùng để khởi chạy worker hoặc ghi dữ liệu. |
| App `.env.example` | Mẫu Firebase/Cloud SQL cho `ai-transformation-510302` | Không có Firebase Web config/Cloud SQL connection thật tương ứng trong env tìm thấy. |
| gcloud account sẵn có | Project `promptify-rebuild` chưa bật SQL Admin/Cloud Run Admin API; account hiện tại không được quyền đọc SQL ở `ai-transformation-510302` | Chỉ inventory read, không bật API, cấp quyền, tạo tài nguyên hoặc đổi active configuration. |
| Generated deployment/preflight | Ghi rõ OFFLINE VALIDATION ONLY; project demo | Không coi đây là chứng cứ staging cloud đã được dựng. |

Supabase cũ trả được 1.251 users, 39 classes, 25 lessons; Google provider bật. Ba bảng `product_workspace_preferences`, `product_profile_details`, `product_roster_workbooks` trả 404 trong REST schema hiện dùng. Đây là backend có dữ liệu hiện hữu, không coi là môi trường test trống. Không chạy migration 006 vào đó và không đổi canonical Firebase/Cloud SQL về Supabase để né cấu hình thiếu.

Sheet mẫu đọc được, nhưng tên tab gồm Implement Plan/UI/Canvas_View/FLOWS/Table/STORY/Backlog/USER FLOWS; header tab đang cấu hình là `# / Code / Name / Note`. File này không đạt hợp đồng Sync/Users/Department/SOPs/Main PIC/Report. Không sửa Sheet, không chạy import hoặc scheduler lên file này.

## Kiểm thử tích hợp local thực hiện được

Dựng Firebase Auth Emulator tại 127.0.0.1:9099 và app tại 127.0.0.1:5195. App mount nguyên `ProductionApp`, gọi HTTP `/api/product` thật, dùng `firebase-admin` xác minh token emulator và các SQL/RLS/RPC hiện tại trên PostgreSQL embedded PGlite. Chỉ SQL pool được thay bằng engine local; không thay frontend transport, không giả handler/API response, không inject identity verifier. Tài khoản `*@example.test` và dữ liệu đều tự tạo riêng.

Đây là backend local có trạng thái, không phải staging Cloud SQL hay Google OAuth thật. PGlite không kiểm chứng Cloud SQL networking/IAM/ML extension/concurrency vận hành. Không bật Firestore emulator trong lượt này nên không xác nhận realtime; client trỏ realtime về localhost, không trỏ Firebase production. DB là in-memory, dừng runner sẽ mất dữ liệu thử.

| Luồng | Kết quả |
| --- | --- |
| Đăng nhập → onboarding → hồ sơ | Firebase emulator token được server xác minh; nhập employee ID/office, confirm profile; reload và mở My profile vẫn đúng giá trị DB. |
| Quyền learner/head/instructor/admin | Learner bị từ chối lớp khác và analytics; head bị từ chối lớp ngoài grant; instructor đọc lớp thuộc course được giao; chỉ manager sửa preferences/inbox. |
| Người ngoài roster | Token emulator hợp lệ vẫn bị chặn snapshot; đọc được contact công khai theo lớp và gửi request hỗ trợ; admin xem/resolve đúng scope. |
| Event và outcome | Ghi qua HTTP, retry không tạo bản sao; 30→10 phút × 3 lần/tuần = 1 giờ; cost 10 USD/giờ → 520 USD/năm; learner không được đọc báo cáo. |
| Generate thật | Dùng Gemini key/model legacy hiện có, chỉ gửi prompt và ticket hư cấu. Provider trả lời thật; model thực tế lưu trong attempt là `gemini-3-flash-preview`. Hai lượt lần lượt khoảng 2,84 và 3,42 giây trong lần thử này. Không đổi model production. |
| Run mới/history/Compare | Cùng prompt chạy hai lần thành V1/V2, Compare bật; reload vẫn có dữ liệu đúng. |
| Judge thật | Chấm V2 7/10 với tiêu chí/feedback; reload Compare giữ đúng điểm và V1 chưa chấm vẫn là dấu gạch. Đây là kết quả của bài hư cấu, không phải chứng nhận chất lượng rubric doanh nghiệp. |
| Save library | Restore V2 → Save template → lưu personal library thành công, kèm score và settings của attempt. |

Trong in-app browser, popup Google emulator không xuất hiện thành tab có thể điều khiển. Dùng trang trợ giúp local duy nhất để SDK `signInWithCredential` đăng nhập Google emulator; server vẫn xác minh token bình thường. Helper chỉ có trong outputs do runner tạo, không có trong build/deploy. Không thay luồng Google production để phục vụ test.

## Lỗi phát hiện và sửa

`mentorFeedbackService.ts` trước đây dùng `ON CONFLICT DO NOTHING` nhưng luôn báo success. Tái dùng cùng request ID với nội dung hỗ trợ hoặc số liệu hiệu quả khác có thể làm UI hiểu nhầm dữ liệu mới đã được lưu.

- Request cùng ID/cùng nội dung vẫn retry an toàn; ID cũ/nội dung hoặc scope khác trả 409.
- Support retry trả status thực tế (kể cả resolved), không tự báo pending lại.
- Rate limit hỗ trợ nằm cùng transaction và advisory lock theo subject, tránh hai yêu cầu đồng thời vượt giới hạn.
- Bổ sung regression vào test PostgreSQL offline và test HTTP local. Đã thấy test HTTP fail `200 !== 409` trước sửa và PASS sau sửa.

Không cần migration cho bản sửa hành vi retry này. Migration feedback của lượt trước vẫn chưa áp dụng môi trường remote.

## Kiểm tra và bằng chứng

- 21 kiểm tra HTTP tích hợp local PASS, có kiểm status và dữ liệu trả về, dùng token Firebase emulator thật.
- 35/35 test offline PASS sau sửa; typecheck, lint, boundaries và dev/API smoke PASS.
- Build PASS; còn cảnh báo bundle >500 kB và vòng type Workspace đã có, không coi là đã tối ưu hiệu năng live.
- [Ảnh Compare sau reload](../../apps/promptify-intrepid/outputs/backend-review/compare-real-ai.png).
- Kết quả đọc remote và HTTP local được lưu không có khóa trong ignored `outputs/backend-review/legacy-readonly.json`, `sheets-readonly.json`, `local-integration.json`.

## Chạy lại local

Từ `apps/promptify-intrepid`, dùng các terminal riêng:

```powershell
node node_modules/firebase-tools/lib/bin/firebase.js emulators:start --only auth --project demo-intrepid --config firebase.emulators.json
node node_modules/tsx/dist/cli.mjs scripts/start_local_feedback_review.ts --local-only
```

Mở `http://127.0.0.1:5195/outputs/backend-review/login.html`, chọn tài khoản test rồi vào app. Runner mặc định không nạp khóa AI. Chỉ khi muốn gọi provider thật với dữ liệu hư cấu mới thêm `--existing-ai-key` vào lệnh runner; chế độ này dùng ngân sách của khóa hiện có.

```powershell
node tests/verify_local_feedback_http.mjs --local-only
```

Test này chỉ gọi hai địa chỉ localhost cố định; không nằm trong allowlist offline. Không chạy test live bằng glob. Runner/test/helper nằm trong app riêng, không đi vào runtime build.

## Các luồng vẫn cần staging thực

1. Cần Firebase Web config và quyền truy cập Cloud SQL staging đã dựng, cùng connection/runtime role đúng phạm vi. Chưa có bằng chứng quyền này trong cấu hình tìm được.
2. Cần một Sheet roster staging riêng đúng sáu tab và chia sẻ cho service identity. Không dùng file thiết kế hiện tại hoặc roster production để thử sync.
3. Sau khi staging sẵn sàng: migration được duyệt, OAuth Google nhiều account/ngoài roster, realtime, Cloud SQL RLS/network, scheduler theo lịch, private storage/SOP PDF đúng trang, retrieval/embedding Cloud SQL/Vertex và analytics warehouse.

Không xác nhận các mục này đã chạy chỉ vì API local và Gemini trực tiếp đã PASS; không thể hoàn tất chúng bằng cách dùng nhầm production credentials hoặc tự tạo/deploy tài nguyên cloud trái phạm vi yêu cầu.
