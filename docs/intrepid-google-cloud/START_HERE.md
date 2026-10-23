# Đưa Intrepid lên Google Cloud — bắt đầu tại đây

Chuẩn bị ngày 13/10/2026 cho project `ai-transformation-510302`. Mã nguồn, schema, công cụ và cấu hình nằm trong `apps/promptify-intrepid`. Chưa có tài nguyên được tạo, dữ liệu thật được chuyển hay website được deploy. Bạn thực hiện các bước nền tảng dưới đây bằng tài khoản có quyền trong project.

## Hệ thống mới làm gì?

| Dịch vụ | Vai trò trong Intrepid |
|---|---|
| Firebase Hosting | Phục vụ giao diện React; `/api/**` chuyển sang Cloud Run cùng origin |
| Firebase Auth | Google login, phát token; không tự quyết định vai trò nghiệp vụ |
| Cloud Run API | Kiểm tra token, quyền lớp và quota; đọc/ghi SQL, gọi AI, xuất certificate |
| Cloud SQL PostgreSQL | Nguồn dữ liệu chính: user, lớp, bài học, bài làm, điểm, tiến độ, SOP, certificate, audit |
| Cloud Storage | Lưu file SOP gốc riêng tư; API cấp URL có hạn sau khi kiểm tra quyền |
| Firestore | Báo cho đúng user rằng dữ liệu lớp thay đổi; frontend tải nội dung lại qua API |
| BigQuery | Báo cáo tổng hợp và vector search SOP được duyệt; không quyết định quyền/cấp certificate |
| Vertex AI | Sinh/chấm câu trả lời và tạo embedding; sử dụng service account, không cần API key |
| Cloud Run worker + Scheduler | Đồng bộ roster và xử lý SQL outbox sang Firestore/BigQuery |
| Secret Manager | Giữ mật khẩu database; không nằm trong frontend hoặc ZIP |

Cloud SQL giữ business logic hợp lệ. Firebase UID được liên kết với UUID cũ trong `gcp_identity_bindings`, nên quyền và record certificate không phải tạo lại. Người dùng đăng nhập Google lại; session Supabase cũ không dùng được. Certificate vẫn tiếng Anh, lấy ID thật và điều kiện hoàn thành từ SQL.

## 0. Kiểm tra quyền, region và chi phí

Trong ảnh Google Cloud, `ai-transformation` là tên hiển thị; ID đã xác nhận là `ai-transformation-510302`. Mở project selector để kiểm tra ID. Mở Cloud Shell bằng biểu tượng terminal ở thanh trên; upload và giải nén gói chuẩn bị.

```bash
cd apps/promptify-intrepid
gcloud config set project ai-transformation-510302
gcloud projects describe ai-transformation-510302
node --version
npm ci
npm run gcp:render -- ai-transformation-510302 asia-southeast1 gemini-3.8-flash global
```

Node 24 được dùng trong container. Singapore (`asia-southeast1`) là cấu hình staging mẫu, chưa phải quyết định region được tổ chức duyệt. Duyệt billing/budget alert, region và quyền xử lý dữ liệu trước bước 1. Các script tạo Cloud SQL có chi phí liên tục dù không có request. `db-f1-micro` là staging nhỏ, không phải sizing production/HA. Nếu project đã có tài nguyên cùng tên, đọc trạng thái và bỏ lệnh CREATE tương ứng; không xóa tài nguyên để chạy lại.

Model sinh được cấu hình riêng vì không phải model nào cũng có tại Singapore. Ví dụ hiện dùng `gemini-3.8-flash` ở `global`; dữ liệu AI không bị giới hạn Singapore. Nếu tổ chức yêu cầu residency, chọn model/endpoint hỗ trợ chính sách rồi render lại. Embedding dùng `gemini-embedding-001`, 768 chiều. Không thay model lịch sử hay điểm cũ. [Model locations](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash) và [lifecycle](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions).

## 1. Bật dịch vụ và tạo staging

```bash
bash outputs/gcp/01-enable-apis.sh
bash outputs/gcp/02-create-staging.sh
```

Bước này bật API, tạo PostgreSQL, container registry, hai bucket riêng tư, Firestore, secret rỗng và service accounts. Chưa chuyển dữ liệu. Script là lệnh tuần tự, không phải Terraform idempotent. Kiểm tra từng tài nguyên trong Console. Bật backup/PITR theo chính sách của tổ chức trước khi nhận dữ liệu thật; staging mẫu chưa cấu hình HA. Production cần sizing, backup/restore drill, budget và monitoring được duyệt.

## 2. Khởi tạo database và mật khẩu

Dùng Cloud SQL Auth Proxy hoặc Cloud SQL Studio/psql với database owner. Không dùng user runtime để apply schema. Trước tiên đối chiếu catalog nguồn bằng `export-live-catalog.readonly.sql` và `scripts/compare_intrepid_live_catalog.py` ở thư mục gốc. Có drift thì cập nhật candidate và test lại, không import mù.

Sau khi kết nối psql vào database **trống** `promptify_intrepid`:

```bash
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f gcp/sql/001_baseline.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f gcp/sql/002_projection_outbox.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f gcp/sql/003_runtime_role.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f gcp/sql/005_department_correction_auto_approval.sql
```

`TARGET_DATABASE_URL` ở bước này là credential migration owner, nạp từ môi trường bảo mật. Trong psql chạy `\password promptify_runtime`, nhập mật khẩu ở prompt. Tạo version của secret `intrepid-db-password` bằng Secret Manager Console và cùng mật khẩu đó. Không đặt mật khẩu trong command, chat, Git hoặc file được đóng gói.

001 tạo 49 bảng baseline (48 nguồn + mapping identity), functions/RLS. 002 thêm bảng outbox riêng tư và trigger: tổng 50 bảng. 003 tạo login runtime không có BYPASSRLS. Runtime dùng role nội bộ và claim transaction-local đã được backend xác minh; connection luôn cleanup khi commit/rollback. Kiểm tra owner/runtime role thật trên Cloud SQL; PGlite không thay thế bước này.

## 3. Firebase, IAM, BigQuery và Workspace

Thêm Firebase vào **project hiện tại**, không tạo project khác. Trong Firebase Console: tạo Web App, bật Authentication → Google; khai báo support email và Authorized domains (`PROJECT.web.app`, domain thật, localhost chỉ khi dev). Lấy `apiKey`, `authDomain`, `appId` trong Web App config. Đây là public config; server credentials là loại khác.

```bash
bash outputs/gcp/03-service-iam.sh
bq query --project_id=ai-transformation-510302 --use_legacy_sql=false --location=asia-southeast1 < outputs/gcp/bigquery.sql
npx firebase deploy --only firestore:rules,firestore:indexes --project ai-transformation-510302
```

Trong BigQuery → mỗi dataset `intrepid_raw`, `intrepid_analytics`, `intrepid_knowledge` → Sharing/Permissions: API service account nhận Data Viewer; worker nhận Data Editor. `jobUser` đã có ở project. Không grant public. Chạy dry run/query kiểm tra views và vector query sau khi có dữ liệu; cú pháp SDK/vector và IAM chưa được kiểm chứng trên warehouse thật.

Firestore rules chỉ cho user có verified token đọc notice của UID mình và cấm mọi client write. SQL mới giữ dữ liệu nghiệp vụ. BigQuery không nhận email/tên/prompt cá nhân trong analytics projection; knowledge chỉ nhận SOP được duyệt. SQL outbox đồng bộ theo revision, chống ghi đè bằng sự kiện cũ và có retry/dead letter.

Bật Sheets/Drive API theo script; chia sẻ đúng Sheet/folder với `promptify-workspace@ai-transformation-510302.iam.gserviceaccount.com`. IAM của Google Cloud không tự cấp quyền file Google Drive. Roster dùng impersonation, không cần tải JSON private key. Các URL/ID Sheet trong dữ liệu nguồn phải được kiểm tra lại.

## 4. Chuyển dữ liệu và file được duyệt

Supabase có thể đang dùng chung với MVP. Liệt kê rõ **toàn bộ UUID lớp Intrepid** cần chuyển, course/client liên quan; không dump cả project. Công cụ tự lấy dữ liệu liên quan và kiểm tra FK. Những bảng không gắn lớp chỉ chuyển khi chọn rõ bằng `--include-unscoped=...`; xem MIGRATION_RUNBOOK.md. Trước export cuối cùng, phối hợp dừng ghi của các luồng liên quan; freeze workshop đơn lẻ không chặn mọi ghi. Trước đó có thể rehearsal bằng snapshot để kiểm tra thao tác.

```bash
node scripts/export_intrepid_data.mjs --execute --classes=UUID_LOP_1,UUID_LOP_2 --output=outputs/gcp/data-export
node scripts/check_export_bundle.mjs --input=outputs/gcp/data-export
node scripts/import_intrepid_data.mjs --execute --empty-target --input=outputs/gcp/data-export
node scripts/reconcile_intrepid_data.mjs --execute --input=outputs/gcp/data-export
node scripts/migrate_sop_files.mjs --execute --input=outputs/gcp/data-export --mode=download
node scripts/migrate_sop_files.mjs --execute --input=outputs/gcp/data-export --mode=upload
```

Nạp `SOURCE_DATABASE_URL` (nguồn chỉ đọc), `TARGET_DATABASE_URL` (target owner), `SOURCE_SUPABASE_URL`, `SOURCE_SUPABASE_SERVICE_ROLE_KEY` (chỉ lấy file nguồn) và `GCP_SOP_BUCKET` từ môi trường bảo mật, không commit. Dùng ADC cho upload GCS. Export giữ nguyên IDs/JSON/Unicode/timestamp, snapshot read-only, kiểm tra hash/count/FK; vượt 200.000 record/bảng thì dừng có lỗi. Import chỉ vào target trống, transaction, tắt USER trigger trong lúc nạp nhưng giữ FK, bật lại khi kết thúc. Reconcile phải `matches:true` trước khi cho đăng nhập/ghi vào target. Email nguồn phải canonical và không có trùng không phân biệt hoa/thường; UUID identity cũ phải hợp lệ. Không âm thầm sửa dữ liệu nguồn.

File gốc giữ logical path trong metadata nhưng sang bucket GCS riêng tư. Mỗi file kiểm tra SHA-256/bytes/CRC; vượt 25 MB hoặc thiếu file thì dừng. Upload generation=0 không ghi đè; nếu chạy lại một phần, kiểm tra object đã có và checksum thay vì xóa/overwrite tùy tiện. Đừng upload thư mục export vào Hosting hoặc gửi ZIP dữ liệu nhạy cảm.

## 5. Build và deploy staging

```bash
export FIREBASE_API_KEY='PUBLIC_WEB_APP_API_KEY'
export FIREBASE_AUTH_DOMAIN='ai-transformation-510302.firebaseapp.com'
export FIREBASE_APP_ID='PUBLIC_WEB_APP_APP_ID'
bash outputs/gcp/04-build-deploy.sh
```

Cloud Build đóng gói riêng app Intrepid. API nhận public HTTP transport để Firebase user token tới được; code vẫn kiểm tra token và quyền SQL. Worker private, yêu cầu Cloud Run IAM và token OIDC đúng audience/scheduler account. Script cập nhật audience từ URL thật. Secret DB phải có version trước deploy. Human deployer cần quyền Cloud Build submit/Cloud Run admin và actAs service accounts; nhờ admin nếu bị deny, không cấp Owner rộng chỉ để bỏ qua lỗi.

Giao diện Hosting cần build với cùng public Firebase config:

```bash
VITE_FIREBASE_API_KEY="$FIREBASE_API_KEY" VITE_FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN" VITE_FIREBASE_APP_ID="$FIREBASE_APP_ID" VITE_FIREBASE_PROJECT_ID=ai-transformation-510302 VITE_REBUILD_PRODUCTION=true npm run build
npx firebase hosting:channel:deploy migration-staging --project ai-transformation-510302
```

Preview channel giúp kiểm tra trước public release; thêm hostname preview thật vào Auth authorized domains và CORS bucket nếu dùng upload ở channel đó. `/healthz` chứng minh process sống; `/readyz` kiểm tra kết nối DB. Mã `/api/product` thiếu token phải 401. Test đăng nhập learner/instructor/viewer/editor/head/admin; từng user chỉ thấy lớp đúng quyền. Test bài làm, quota, rubric, SOP upload/approval, roster, certificate và PDF tiếng Việt/tên dài.

## 6. Projection và embeddings

```bash
node scripts/backfill_gcp_projections.mjs --execute
bash outputs/gcp/05-start-schedulers.sh
```

Backfill dùng `TARGET_DATABASE_URL`, queue snapshot hiện tại. Scheduler gọi worker private bằng OIDC; SQL vẫn kiểm tra thời điểm roster đến hạn. Theo dõi outbox `processed_at`, `dead_lettered_at`, `last_error`, backlog và Cloud Logging. Không bỏ lỗi để coi như đã sync. Nếu embedding nguồn khác model/dimension, nạp runtime PG/Vertex env và chạy có dự toán chi phí:

```bash
node --import tsx scripts/reembed_target_sops.ts --execute --classes=UUID_LOP_1,UUID_LOP_2
```

Với Gemini 3.8, các slider sampling cũ không tác động lên model; adapter bỏ tham số không được hỗ trợ và giữ schema chấm điểm. Tham khảo [hướng dẫn migration model](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-flash).

Run lần đầu giữ `GCP_ANALYTICS_MODE=postgres`, `GCP_VECTOR_MODE=postgres`. Sau khi outbox drain, BigQuery IAM/query test và retrieval evaluation đúng SOP/citation/quyền/revocation, cập nhật API sang `bigquery` từng mode bằng Cloud Run env settings. Worker luôn dùng projection; frontend không truy vấn BQ trực tiếp. Không cần BigQuery remote-model connection: Cloud Run gọi Vertex tạo vector rồi lưu/index BQ. Do vậy hướng dẫn remote embedding trong tài liệu thầy là một cách triển khai khác, không cần làm cả hai.

## 7. Chuyển người dùng và rollback

Chỉ chuyển khi drift được giải quyết, reconcile/file checks PASS, phân quyền/AI/rubric/certificate/roster đạt staging acceptance, outbox không dead letter và có backup phục hồi đã kiểm tra. Export rehearsal không thay thế export cuối sau freeze. Không seed lại curriculum hay xóa Supabase/Vercel.

Publish Hosting hoặc đổi DNS/domain sau khi duyệt staging. Bắt người dùng Google login lại. Ghi thời điểm cutover và source/target counts; ngừng ghi nguồn theo phạm vi đã thống nhất. MVP vẫn giữ cấu hình cũ. Theo dõi errors/quota/DB connections/sync lag/model cost. Sau khi target đã nhận bài làm mới, rollback bằng trỏ URL về nguồn sẽ mất các ghi mới: cần freeze target, xuất/reconcile delta và kế hoạch merge hoặc recovery được duyệt. Không tự chạy reverse import vào nguồn.

## Chứng cứ và phần bạn còn phải kiểm tra

Xem IMPLEMENTATION_REPORT.md. Test local không chứng minh Cloud SQL IAM, BigQuery dry run, model access, Google provider, Docker image, file thật hoặc DNS đã hoạt động. Các bước này cần tài khoản project và chính sách của tổ chức; chưa được chạy theo yêu cầu của bạn. Mã, config, scripts đã chuẩn bị để thực hiện và kiểm chứng từng bước, không có deploy thành công giả.
