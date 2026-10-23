# Kiểm thử app local với backend staging — 17/10/2026

## Kết luận

App local đã chạy component/HTTP handlers thật, dùng Firebase project và Cloud SQL staging thật. Đã kiểm tra storage/service hồ sơ, history fixture và badge engine thật. **Chưa hoàn tất đăng nhập UI nên chưa xác nhận end-to-end Save/history/Compare/profile UI.** Không dùng adapter UI, emulator identity hoặc verifier injection để báo đạt.

URL: http://localhost:5195/?ui=04&classId=229f6de3-140c-452a-a5a7-5d4d17e71c12

## Phạm vi ghi staging được người dùng cho phép

Người dùng chọn demo.biz@intrepid.asia. Giữ nguyên role learner, tên và các lớp sẵn có của tài khoản. Tạo client/course/module/lesson/class mới hư cấu, thêm enrollment chỉ vào lớp QA mới. Tên lớp `STAGING-QA-20261017-229f6de3`; class ID `229f6de3-140c-452a-a5a7-5d4d17e71c12`.

Hai attempt fixture có model `STAGING-FIXTURE-NOT-AI`, output/prompt ghi rõ hư cấu. Điểm và frozen threshold là fixture để kiểm persistence/badge, **không phải kết quả Generate/Judge thật**. Không gắn vào khóa học hoặc lớp doanh nghiệp hiện có. Fixture dùng profile tài khoản demo đã được chọn; không tạo tài khoản Google giả.

## Cập nhật sau kiểm thử Chrome — thay thế các trạng thái UI bị chặn bên dưới

Người dùng đã đăng nhập demo.biz trong Chrome, xác nhận vào Hub lớp QA và báo Save, Compare, badge preview đều hoạt động. Chrome chưa có kết nối điều khiển tự động; đây là thao tác và xác nhận của người dùng, không phải agent tự bấm. Ảnh người dùng cung cấp cho thấy onboarding đúng tài khoản và Hub có badge.

Đối chiếu SQL chỉ đọc qua `scripts/verify_staging_chrome_readonly.ts --staging-readonly` đạt: hồ sơ có employee ID và office location; có một template trạng thái personal của đúng tài khoản/lớp QA; history có V1/V2; một award. Thông tin hồ sơ và tên template người dùng nhập khác gợi ý QA; giữ nguyên, không ghi đè. Bằng chứng metadata ở ignored `outputs/staging-feedback-review/chrome-ui-verification.json`. PDF/Compare hiển thị đạt theo xác nhận người dùng; chưa có kiểm tra pixel tự động hoặc xác nhận Restore.

37/37 offline tests, build (bao gồm TypeScript), lint, boundaries và local smoke đạt sau tối ưu. Smoke lần đầu bị sandbox chặn localhost; chạy lại ngoài sandbox đạt. Xem [báo cáo độ trễ](STAGING_LATENCY_FIXES_2026-10-17.md). Generate/Judge thật vẫn bị chặn vì chưa chốt model/location/budget. Các mục UI “chưa kiểm chứng” trong bảng lịch sử dưới đây đã được cập nhật bởi kết quả Chrome này.

## Ma trận kết quả trước kiểm thử Chrome (lịch sử)

| Luồng | Đã kiểm | Kết luận / giới hạn |
| --- | --- | --- |
| ADC backend local | Google Auth Library hoàn tất, ADC được lưu tại kho gcloud máy theo thao tác người dùng | Đạt; không đồng nghĩa phiên Google của app đã đăng nhập |
| App local → SQL | Runtime promptify_runtime qua Auth Proxy localhost, secret chỉ trong bộ nhớ | Đạt; không dùng postgres cho runtime |
| Google popup trong browser nhúng | Click sign-in nhưng không có popup trong inventory; người dùng cũng xác nhận không thấy | **Bị chặn**, không có phiên Firebase app |
| Google redirect thử nghiệm | Chọn demo.biz, Continue và trở về localhost; SDK không có phiên đăng nhập | **Chưa đạt**; chưa chứng minh nguyên nhân storage/iframe. Không kết luận cloud Google provider hỏng. Đã bỏ thay đổi redirect chưa xác minh khỏi code cuối |
| OAuth token ADC → Firebase IdP | Firebase từ chối vì audience không thuộc OAuth client của app | Đã dừng, không nới verifier/provider hoặc thay OAuth cloud để vượt chặn |
| Hồ sơ service | Gọi service saveProfileDetails thật, đọc lại SQL; thử employee ID quá dài | Đạt storage/validation; profile demo đã khôi phục trạng thái trước, kể cả không có row trước. Chưa xác nhận HTTP/UI Save profile |
| Save personal library | Cần phiên Firebase để gọi đúng API/UI | **Chưa kiểm chứng trên staging**, không seed row library rồi gọi là Save đạt |
| History | Hai attempt V1/V2 tồn tại trong SQL staging với nhãn fixture | Đạt persistence; **chưa kiểm chứng UI/reload/Compare/Restore** |
| Badge rules | Groundedness V1 thấp hơn chuẩn, V2 đạt; any-attempt được cấp, first-attempt không được cấp; refresh lại không tăng số award | Đạt engine/trigger/idempotency trên lớp hư cấu. Chưa xác nhận badge preview/PDF qua UI |
| Generate/Judge | Chưa chốt model/location/budget AI | **Bị chặn**; không dùng model fallback mặc định hoặc khóa legacy để né cấu hình |

## Sửa code và công cụ local

- Entry UI-01/02/03 hiện giải thích lỗi Firebase domain/popup/network thay vì luôn báo thử lại chung chung; không render raw provider payload/token. Có regression test cho các nhánh và chống lộ nội dung lỗi tùy ý.
- Không giữ redirect fallback chưa xác minh hoạt động trong browser này; không thay cách verifyFirebaseIdentity.
- `scripts/start_staging_review.mjs --staging`: chỉ cho phép target cố định localhost proxy/staging, nạp runtime secret vào bộ nhớ, chạy Vite cấu hình thật; có banner phân biệt local/staging. Không có deploy hoặc mock response.
- `scripts/seed_staging_feedback_review.ts --staging-synthetic`: transaction tạo fixture riêng; refuse chạy lại nếu manifest fixture đã có. Hai lần chuẩn bị fixture ban đầu lỗi contract/assertion đều rollback trước khi commit; chỉ một lớp QA được giữ.
- `scripts/verify_staging_feedback_storage.ts --staging-synthetic`: kiểm actual profile service/persistence và badge idempotency; khôi phục profile bằng lock/so sánh để không đè sửa đồng thời. Test không nằm trong offline allowlist vì có ghi staging.
- Không đổi env/model cloud, IAM, schema hoặc deploy trong lượt này; không tác động production. Không lưu runtime password/token vào source/artifact. ADC là credential local theo workflow Google, không nằm trong workspace.

## Kiểm tra mã nguồn

Typecheck, lint và boundaries đạt; **36/36 offline tests đạt**; staging build và local smoke đạt. Còn warning type cycle Workspace và bundle >500kB đã tồn tại. Không coi các test offline là bằng chứng end-to-end cloud.

## Bằng chứng và tiếp tục

Ignored artifacts: `apps/promptify-intrepid/outputs/staging-feedback-review/fixture.json`, `storage-results.json`, `local-signin.png`. Giữ lớp/attempt/badge hư cấu để review, không tự xóa. Profile cá nhân đã khôi phục.

App local và proxy hiện được giữ chạy để tiếp tục. Khi process dừng, từ app directory chạy proxy riêng và `node scripts/start_staging_review.mjs --staging`; không chạy seed lại. Cần hoàn tất Google login app trong một browser hỗ trợ popup/callback để tiếp tục UI Save/profile/history/Compare/badge preview. Nếu browser thường cũng lỗi, cần thu mã lỗi của chính lần đó trước khi sửa thêm; không tự đổi Google OAuth/domain/IAM trên cloud. AI thật vẫn cần model/location và ngân sách được chốt.
