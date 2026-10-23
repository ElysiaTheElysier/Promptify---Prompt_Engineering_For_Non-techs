# Bộ thay đổi staging chờ duyệt — Intrepid

Ngày 17/10/2026. **Chỉ chuẩn bị local, chưa được duyệt áp dụng.** Không deploy, đổi IAM, áp dụng SQL, khởi chạy worker/scheduler hoặc ghi dữ liệu ứng dụng từ xa trong phiên chuẩn bị này.

## Đã sửa local

- Tạo `apps/promptify-intrepid/.env.staging.local`, đã xác nhận bị Git ignore. Firebase config công khai lấy từ Hosting staging, đối chiếu project và Web App ID trước khi ghi.
- App ID local đúng: `1:390575746801:web:af750eeab9c2bcf097c350`. Không sửa bundle đang chạy trên Hosting; bundle cloud cũ vẫn cần được thay trong đợt phát hành được duyệt sau này.
- Local SQL trỏ `127.0.0.1:55439`, database `promptify_db`, user `promptify_runtime`; không sử dụng đường mount `/cloudsql/...` của Cloud Run trên Windows.
- Không sao chép root env legacy. Không tải/persist mật khẩu DB, khóa service account hoặc ADC. `PGPASSWORD`, model/location chưa duyệt vẫn để trống. Không tự khởi chạy app kết nối staging.
- Thêm lệnh `dev:staging` chỉ bind loopback ở port 5195, dùng Vite mode staging. Lệnh được chuẩn bị để dùng sau khi kiểm thử có ghi staging được cho phép; chưa chạy trong phiên này.
- Template không chứa key tại `apps/promptify-intrepid/gcp/local-staging.env.example` để review các giá trị; không đưa file env thật vào commit/report.

## Đầu vào và đầu ra có thể duyệt

Đầu vào được lưu trong `apps/promptify-intrepid/gcp/staging-review.json`. Generator `scripts/prepare_staging_review.mjs` chỉ đọc/ghi file local, không import cloud SDK, không gọi shell/network, không có chế độ apply/execute. Không thay generator deploy hiện hữu thành công cụ áp dụng bundle này.

Chạy từ app Intrepid:

```powershell
npm run review:staging
npm run review:staging:check
```

Đầu ra: `apps/promptify-intrepid/outputs/staging-change-review/` (ignored). `manifest.json` ghi target, SHA-256 của migration/cấu hình và trạng thái chưa duyệt. `--check` kiểm tra bản copy còn khớp source; không kiểm tra trạng thái cloud và không tự coi file mới là đã áp dụng.

## Các mục chờ duyệt riêng

| Mục | File review | Thay đổi đề xuất | Điều kiện trước khi áp dụng |
| --- | --- | --- | --- |
| SQL feedback | `migrations/006_mentor_feedback.sql` | Sáu bảng feedback/profile/preferences/events/support/outcome/roster và hàm liên quan theo migration gốc | Live audit đã xác nhận ba bảng chính thiếu; kiểm tra cả sáu để tránh schema partial; migration owner, backup và code tương thích |
| Structured badges | `migrations/010_structured_badge_rules.sql` | Thêm engine rule và cập nhật hàm cấp awards, không viết lại awards lịch sử | Kiểm tra prerequisites và định nghĩa hàm live; duyệt rule/test; không gọi refresh để phát thưởng trong bước schema |
| Các migration khác | Bản copy `006_studio_class_scope`, `007`, `008`, `009` | **Chỉ để đối chiếu**, chưa chọn vào chain áp dụng | So sánh function/policy/trigger/constraint bằng `schema-preflight.readonly.sql`; không chạy lại dựa vào tên file |
| AI / embedding / Workspace env | `api-env-additions.review.json` | Bổ sung Vertex, SQL embedding, pgvector, Workspace identity; analytics giữ Postgres, warehouse false | Model/location, quota và budget phải được chốt; Sheet/ACL cần xác minh; merge env, không thay toàn bộ map |
| SOP CORS | `storage-cors.review.json` | Giữ hai origin cũ; thêm domain Intrepid staging và localhost/127.0.0.1 port 5195 | Duyệt đúng danh sách origin; đọc lại CORS ngay trước áp dụng để không đè thay đổi mới; không mở public bucket |
| Realtime rules | `firestore.rules`, `firestore.indexes.json`, `firebase.review.json` | Verified user đọc đúng path invalidation của UID mình; client vẫn không được ghi | Rules kiểm thử riêng trước phát hành; worker chưa triển khai nên chưa đủ realtime end-to-end |
| Worker/Scheduler/BigQuery/IAM | Ghi rõ deferred trong manifest | Không tạo/triển khai/bật/cấp quyền | Phê duyệt đợt riêng nếu cần; không cần để duyệt hai migration đã xác nhận thiếu |

Mọi mục ở bảng đều là **đề xuất**, không phải thao tác đã thực hiện trên cloud. `firebase.review.json` chỉ mô tả Firestore, không cấu hình Hosting release. API env proposal không phải Cloud Run Service spec, không thay image, traffic, account, secret reference, CPU/RAM hoặc autoscaling.

## Migration trên database đang có dữ liệu

Không đưa baseline 001 vào bundle. Không tự sửa migration lịch sử hoặc gom hai file 006 làm một. Không dùng script tạo schema database trống để nâng cấp staging hiện hữu.

Trình tự dự kiến sau một lần phê duyệt riêng:

1. Chốt target/backup/lock budget; lấy catalog mới bằng truy vấn **BEGIN READ ONLY** trong bundle. Không đọc dữ liệu người học để lấy bằng chứng schema.
2. So sánh định nghĩa migration 006 Studio, 007–009 với catalog; chọn chỉ delta thiếu. 009 yêu cầu consumer/producer tương thích nên chưa được áp dụng trước code tương ứng. 007 dùng `CREATE INDEX CONCURRENTLY`, không bọc toàn bộ chain trong transaction.
3. Duyệt danh sách migration chính xác bằng SHA-256. Hai migration đã xác nhận thiếu là ứng viên, không phải lệnh tự động apply. Giữ worker/Scheduler off trong kiểm thử phối hợp.
4. Áp dụng từng migration được duyệt bằng migration owner, với timeout/lock budget; dừng ngay khi lỗi hoặc phát hiện schema partial. Runtime `promptify_runtime` không phải migration owner.
5. Kiểm tra schema/grants/RLS rồi mới thử chức năng bằng tài khoản/lớp dữ liệu hư cấu được duyệt. Không dùng roster/user production, không tự backfill/import/cấp awards.

Rollback: không cung cấp lệnh DROP bảng/awards hoặc sửa lịch sử. Với lỗi function/policy, giữ bảng và dữ liệu mới, dừng writes/workers, dùng bản định nghĩa trước thay đổi đã lưu để tạo forward repair được duyệt. PITR/full restore là phương án riêng cần đối soát dữ liệu phát sinh. Chưa có catalog đầy đủ trước thay đổi nên không bịa file rollback dùng được ngay.

## Các quyết định còn cần

- Model Gemini Flash, location và ngân sách/quota cho Generate/Judge/embedding. Không lấy model ví dụ trong env làm quyết định đã duyệt.
- Sheet roster staging đúng sáu tab, class scope, email test và quyền ghi dữ liệu hư cấu.
- Có cho phép áp dụng SQL, sửa CORS và phát hành Firestore rules hay không; đây là ba nhóm thay đổi độc lập. Việc chuẩn bị bundle không cấp phép các hành động này.
- Cách xác thực server local: ADC của user được duyệt hoặc service identity đã có quyền. demo.biz hiện chưa impersonate API SA; không tự đổi IAM. Quyền đọc metadata/secret/SQL hiện có vẫn dùng được cho audit.

## Kiểm chứng

Kết quả typecheck/build/lint/boundaries/offline tests và kiểm tra bundle được ghi cập nhật ở cuối báo cáo khi hoàn tất. Nguồn audit cloud: [STAGING_ACCESS_AUDIT_2026-10-17.md](evidence/STAGING_ACCESS_AUDIT_2026-10-17.md).


### Kết quả kiểm chứng hoàn tất

- `review:staging` tạo 14 file; `review:staging:check` đạt, SHA-256 khớp source.
- Kiểm tra thực tế: `--execute` bị từ chối; sửa giả một artifact khiến `--check` phát hiện stale, đã khôi phục và kiểm tra lại đạt.
- Typecheck, lint/Dependency Cruiser và boundary tests đạt. Còn cảnh báo type cycle Workspace đã có từ trước.
- Build **mode staging** đạt; đã kiểm tra bundle có đúng Firebase App ID và không chứa ID sai một ký tự. Còn cảnh báo bundle >500kB.
- Offline allowlist **35/35 đạt**, gồm migration/award contracts trên PostgreSQL embedded. Không chứng minh schema cloud đã được thay đổi.
- Local API smoke đạt, không gọi provider hoặc database thật.
- File env local đã được `git check-ignore` xác nhận bị ignore. Không đưa env thật/secret/ADC vào ZIP hoặc manifest.
- Không đổi/move/delete runtime file, không sửa migration lịch sử và không thay MVP. Thay đổi package.json chỉ thêm ba lệnh local/review.

Bản ZIP để chuyển cho người duyệt: `apps/promptify-intrepid/outputs/staging-change-review.zip`. ZIP chứa 14 artifact review và bản báo cáo này; không chứa local env, private key, mật khẩu hoặc công cụ cloud.


## Cập nhật sau phê duyệt

Người dùng đã duyệt bốn mục staging. CORS và Firestore rules đã áp dụng; migration 006/010 chưa chạy do thiếu migration-owner credential. Xem [kết quả áp dụng](evidence/STAGING_APPLY_RESULT_2026-10-17.md). Trạng thái review-only trong manifest gốc được giữ như snapshot bộ đã duyệt, không sửa hashes lịch sử.


Cập nhật tiếp: người dùng đã cung cấp owner credential; 006 feedback và 010 badge đã áp dụng và kiểm tra đạt. Cả bốn mục được duyệt hoàn tất trên staging; xem báo cáo kết quả ở trên.
