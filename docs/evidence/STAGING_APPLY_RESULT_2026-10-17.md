# Kết quả áp dụng staging — 17/10/2026

Phê duyệt trực tiếp của người dùng: migration 006 feedback, 010 badge, CORS và Firestore rules cho staging; kiểm tra sau từng bước; không deploy app, đổi IAM hoặc tác động production. Phạm vi: project `ai-transformation-510302`, Cloud SQL `promptify-staging` / `promptify_db`, bucket SOP staging, Firestore `(default)`.

## Kết quả

| Bước | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Kiểm tra bộ duyệt | Đạt | `review:staging:check` khớp SHA-256; active account demo.biz; backup gần nhất SUCCESSFUL ID 1792206000000 lúc 2026-10-17T03:48:42.221Z |
| 006 feedback | **Đã áp dụng và kiểm tra đạt** | Sau khi người dùng cung cấp owner credential: sáu bảng, RLS, service_only và grants đạt |
| 010 badge | **Đã áp dụng và kiểm tra đạt** | Engine tồn tại; service_role execute được cấp; anon/authenticated bị từ chối; refresh_awards tham chiếu engine mới |
| CORS | **Đã áp dụng, kiểm tra đạt** | Khớp file review; bucket uniform access true, public access prevention enforced; OPTIONS đạt cho staging + localhost/127.0.0.1:5195; origin ngoài danh sách không có Access-Control-Allow-Origin |
| Firestore rules | **Đã áp dụng, kiểm tra đạt** | Emulator kiểm own/cross-user/anonymous/unverified/write; source ruleset live khớp bytes SHA-256 đã duyệt; release đã chuyển đúng ruleset |

Người dùng trả lời không nhớ credential postgres. Không thử mật khẩu runtime cho owner, không đổi mật khẩu, không cấp IAM/role hoặc dùng runtime làm migration owner. Không gọi hàm sync/award để phát sinh dữ liệu khi kiểm tra.

## Firestore

- Ruleset trước: `projects/ai-transformation-510302/rulesets/bb21554c-c042-4948-b61d-572952f7f286`.
- Ruleset sau: `projects/ai-transformation-510302/rulesets/f247aa98-af90-4369-995a-c7ae8095a533`.
- Release: `projects/ai-transformation-510302/releases/cloud.firestore`.
- UpdateTime: `2026-10-17T06:43:01.680393Z`.
- SHA-256 source: `8c3e08772d4cd799b8cc1827004d6a6894362232051970ce2c97b6a872a199db`.
- Verified user chỉ được đọc path invalidation của UID mình; client writes vẫn bị chặn. Firestore indexes không thay đổi. Worker chưa có nên chưa xác nhận realtime end-to-end.

Kiểm thử emulator ban đầu bị Java 17 chặn; dùng Java 21 đã có trong workspace cho riêng process và chạy lại đạt. Test chỉ ghi dữ liệu hư cấu trong emulator demo-intrepid, không ghi document cloud. Tạo ruleset được server validate, sau đó PATCH release và GET lại source/release; không chạy Firebase Hosting/Cloud Run deploy. Cách quản lý rules qua [Firebase Rules API](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/patch).

## CORS

Giữ hai origin Firebase mặc định; thêm `https://ai-transformation-510302-intrepid-staging.web.app`, `http://localhost:5195`, `http://127.0.0.1:5195`. Methods PUT/GET/HEAD, response headers Content-Type và x-goog-if-generation-match, maxAge 3600. Không mở public access và không đổi IAM. OPTIONS thực hiện trên đường dẫn kiểm tra không tồn tại, không upload object. Origin `https://unapproved.example` nhận HTTP 200 nhưng không có allow-origin/methods, đúng hành vi không cấp phép CORS.

## Ranh giới đã kiểm tra

- Cloud Run API vẫn `promptify-intrepid-api-00004-chg`, image digest `eef18a9a7d15cb2ab52c27a1c477ed1c5e8576bf0944e3333b6771d2b98983a1`.
- API `/health` và `/readyz`: JSON 200 sau thay đổi.
- Không deploy app, không đổi runtime env/model/secret/IAM, không áp dụng SQL, không ghi document cloud/object upload, không bật worker/Scheduler hoặc warehouse.
- Cloud SQL proxy dùng preflight read-only đã đóng. Không giữ mật khẩu vào file hoặc report.

## Bằng chứng và phục hồi

Artifact ignored: `apps/promptify-intrepid/outputs/staging-apply-2026-10-17/` gồm sql-preflight.json, prior-functions.sql, cors-before.json, cors-after.json, cors-options-tests.json, firestore-release-before.json, firestore-ruleset-before.json, firestore-ruleset-created.json và firestore-release-after.json. Không chứa secret/token.

Nếu cần rollback cấu hình, dùng CORS snapshot trước hoặc trỏ release về ruleset cũ sau khi đối chiếu không có thay đổi mới và nhận yêu cầu rollback; chưa thực hiện rollback. Không xóa object/document/bảng làm rollback.

## Phần còn cần để hoàn tất SQL

Cần thông tin đăng nhập `postgres` migration owner staging qua secret/file local an toàn hoặc DBA chạy đúng hai migration đã duyệt. Không gửi mật khẩu vào chat. Phê duyệt migration còn hiệu lực, nhưng không đồng nghĩa cho phép reset mật khẩu hoặc thay quyền. Khi có credential, kiểm lại schema/backup/source hashes, áp dụng 006 rồi kiểm sáu bảng/RLS/grants, tiếp tục 010 rồi kiểm engine/grants; không tự thêm các migration 006 Studio/007–009 chưa được duyệt.


## Cập nhật hoàn tất SQL sau khi người dùng cung cấp credential

Phần mô tả chặn credential phía trên là nhật ký trước đó; điểm chặn đã được giải quyết trong lượt tiếp theo. **Cả bốn mục được duyệt hiện đã áp dụng lên staging.** Không ghi mật khẩu người dùng cung cấp vào script/env/report; nhập qua prompt ẩn và truyền cho tiến trình psql trong bộ nhớ.

- Kiểm tra active account demo.biz, target proxy chính xác staging, database/current_user là promptify_db:postgres; đối chiếu SHA-256 cả hai file với manifest đã duyệt.
- Xác nhận không có schema feedback partial và chưa có engine trước khi chạy. Giới hạn lock_timeout 5 giây và statement_timeout 60 giây, psql ON_ERROR_STOP; từng migration có transaction riêng.
- Áp dụng 006 feedback trước. Kiểm tra đủ sáu bảng bật RLS, sáu policy service_only; service_role có quyền CRUD, anon/authenticated không có SELECT.
- Chỉ sau khi 006 kiểm tra đạt mới áp dụng 010 badge. Kiểm tra function đúng signature; service_role có EXECUTE, anon/authenticated không có; product_refresh_awards tham chiếu product_badge_matches.
- Runtime login promptify_runtime kiểm tra catalog trong read-only mode: feedback_tables=6, badge_engine=true.
- Sau SQL, API health/readiness vẫn JSON 200. Revision vẫn promptify-intrepid-api-00004-chg và image digest cũ; không deploy app.
- Không gọi claim_roster_sync, refresh_awards, Generate/Judge hoặc handler ghi dữ liệu ứng dụng; không tạo tài khoản/award/attempt thử. Không đổi IAM, mật khẩu hoặc tài nguyên production. Proxy đã đóng.

Bằng chứng bổ sung trong outputs/staging-apply-2026-10-17: 006_mentor_feedback.sql.execution.log, 006_mentor_feedback.sql.verified.json, 010_structured_badge_rules.sql.execution.log, 010_structured_badge_rules.sql.verified.json, sql-runtime-after.json và api-after-sql.json. Không có secret trong các artifact này.

Đây là xác nhận migration và khả năng kết nối, chưa phải end-to-end app mới: các quyết định AI/model/location/budget, roster test scope và quyền ghi dữ liệu hư cấu vẫn chờ chốt; worker vẫn chưa deploy. Các migration khác 006 Studio/007–009 không được áp dụng trong lượt này.
