# Kiểm tra quyền và cấu hình staging — 17/10/2026

Chỉ đọc. Không deploy, đổi IAM, đổi active account/project, đọc giá trị secret hoặc ghi dữ liệu ứng dụng/production.

## Tài khoản và quyền thực tế

`gcloud auth list` chỉ có `duonglh.work@gmail.com`, ACTIVE. Không có tài khoản `demo.biz@intrepid.asia` trong kho đăng nhập gcloud hiện tại. Chưa có ADC mặc định tại máy.

Project mục tiêu: `ai-transformation-510302`. Lệnh describe project, Cloud SQL `promptify-staging` và Cloud Run `promptify-intrepid-api` đều bị từ chối; không kết luận tài nguyên không tồn tại từ các lỗi này.

Đã gọi API testIamPermissions, không thay IAM:

| Resource | Quyền thử | Quyền trả về |
| --- | --- | --- |
| Project staging | projects.get; cloudsql.instances.get/connect; run.services.get; aiplatform.endpoints.predict | Không có quyền nào trong nhóm đã thử |
| promptify-api service account | serviceAccounts.get/getAccessToken/signBlob | Không có quyền nào trong nhóm đã thử |
| intrepid-db-password secret | secrets.get; versions.access | Không có quyền nào trong nhóm đã thử |
| Bucket SOP staging | storage.buckets.get; storage.objects.get | Không có quyền nào trong nhóm đã thử |

Đây là kết quả cho người dùng đang đăng nhập; không phải kết quả cho các runtime service account. Chưa đủ quyền xem bindings/runtime env/revision/schema/cloud extensions/rules/quota.

## Cấu hình local

Intrepid chỉ có `.env.example`, chưa có env staging thực. ADC chưa thiết lập. Service account legacy tìm thấy trong root env thuộc project **promptify-rebuild**, email `promptify-sheets@promptify-rebuild.iam.gserviceaccount.com`; không dùng thay identity của staging. Không in/chép private key hoặc mật khẩu.

## Kiểm tra staging công khai

- Hosting staging trả HTTP 200.
- `/__/firebase/init.json` trả Firebase Web config, có API key, project ID, auth domain và App ID. Không cần người dùng gửi API key qua chat.
- Lazy bundle `ProductionApp-CdcXXUq9.js` có cấu hình Firebase project staging. Bundle hiện tại khác source local; không coi phiên bản deployed là bản sửa UI mới nhất.
- GET `/api/product` trả 405. Chỉ chứng minh endpoint từ chối phương thức đó; không xác nhận API auth hay DB đã hoạt động trong phiên này.
- GET `/health` và `/readyz` trên **Hosting** trả HTML 200 (SPA fallback), không được coi là API health/readiness thành công. Chưa đọc được URL Cloud Run thực do thiếu quyền.

## Đối chiếu tài liệu người dùng

Đã đọc GCP Setup → Config, Vận hành, Kế hoạch migrate. Config/Vận hành ghi API/DB/login đã đạt; migration plan còn một số trạng thái cũ hơn. Các quyền ghi cho demo.biz/runtime không đồng nghĩa tài khoản local có quyền tương tự. Schema mới gồm badge 010 và các migration feedback chưa xác minh được trên staging.

## Cần bổ sung đúng phạm vi

1. Dùng identity staging được duyệt: đăng nhập tài khoản đã có quyền hoặc cấp quyền tối thiểu cho tài khoản hiện tại. Không tự đổi account hay cấp IAM trong phiên này.
2. Để chạy backend local: ADC/impersonation staging, quyền kết nối SQL, quyền đọc đúng secret DB và các quyền provider/storage cần thiết. Các bước đăng nhập/cấp quyền được người dùng thực hiện riêng.
3. Để audit cloud: quyền đọc metadata Cloud Run/SQL và bindings tài nguyên liên quan; không cần Owner/Editor hoặc deploy quyền.
4. Model/location/quota thực tế, Sheet roster staging và ACL, test accounts/class scope và quyền ghi dữ liệu hư cấu vẫn cần xác minh/cung cấp sau khi vượt chặn tài khoản. Chưa kết luận các mục này không tồn tại.
5. Worker/Scheduler/warehouse chưa được xác minh live; không deploy để vượt chặn. Giữ warehouse tắt theo tài liệu cho đến khi kiểm tra riêng.

## Sai khác Firebase App ID cần đối chiếu

Hosting init trả `1:390575746801:web:af750eeab9c2bcf097c350`, trong khi bundle hiện tại và tài liệu dùng `1:390575746801:web:af750eab9c2bcf097c350` (khác một ký tự e). API key Hosting có xuất hiện trong bundle. Chưa đọc được danh sách Firebase Web Apps bằng quyền quản trị, nên chưa kết luận App ID nào sai hoặc đây là hai Web App hợp lệ khác nhau. Không sửa/deploy chỉ dựa trên sai khác này; đối chiếu Firebase Console trước khi tạo env local.


# Kiểm tra lại sau đăng nhập demo.biz — kết quả trực tiếp

`demo.biz@intrepid.asia` đã ACTIVE. Không đổi IAM, deploy, migration hoặc dữ liệu ứng dụng. gcloud login do người dùng hoàn tất. Các kết quả bên dưới thay thế điểm chặn tài khoản ở phần đầu.

## Đã xác minh đạt

- Đọc project, Cloud Run, SQL, IAM, Firebase, Storage, Firestore và danh sách BigQuery.
- API `promptify-intrepid-api-00004-chg` nhận 100% traffic, image digest `eef18a9a7d15cb2ab52c27a1c477ed1c5e8576bf0944e3333b6771d2b98983a1`.
- API URL thực: `https://promptify-intrepid-api-zmyu4rhkmq-as.a.run.app`. Health/readiness đều JSON 200. GET product trả 405, chưa coi là auth test.
- SQL RUNNABLE, POSTGRES_18, Singapore, backup bật, PITR bật; backup retention 7 bản, transaction logs 7 ngày.
- Google provider enabled; authorizedDomains có localhost và domain Intrepid staging.
- Firebase Console API xác nhận chỉ một Web App ACTIVE: `1:390575746801:web:af750eeab9c2bcf097c350`. Bundle hiện tại dùng ID khác một ký tự, xác nhận sai khác cấu hình cần sửa ở source/build trong đợt được phép; chưa deploy.
- Bucket SOP private: public access prevention enforced, uniform access bật. API SA có Object Admin. API SA có Token Creator ở cấp project; không cần cấp lại để ký chỉ vì policy riêng trên SA rỗng.
- Workspace SA policy cho API/worker impersonate. Chưa xác minh quyền trên file Sheet vì chưa có Sheet roster staging cụ thể.
- demo.biz có cloudsql.instances.connect, secretmanager.versions.access và aiplatform.endpoints.predict. Không có getAccessToken/signBlob trên API SA. Không cần cấp impersonation để đọc metadata/SQL bằng user hiện tại.

## Schema SQL thực tế — chỉ đọc

Tải Cloud SQL Proxy chính thức v2.26.2, chữ ký Google LLC Valid, mở localhost 127.0.0.1:55439 bằng gcloud user credentials. Đọc secret DB vào bộ nhớ, không ghi file/hiển thị mật khẩu. Dùng psql runtime với `default_transaction_read_only=on`, chỉ SELECT catalog, không đọc bản ghi người học. Đã đóng proxy sau kiểm tra.

- Database promptify_db, current_user promptify_runtime; transaction_read_only **on**.
- 50 bảng public; extensions plpgsql, vector, google_ml_integration.
- Có intrepid_embed_text, intrepid_search_sop, gcp_queue_projection, product_refresh_awards.
- **Chưa có** product_workspace_preferences, product_profile_details, product_roster_workbooks.
- **Chưa có** product_badge_matches(jsonb,uuid,uuid,uuid), tức engine structured badge 010 chưa sẵn sàng.
- Chưa so sánh toàn bộ định nghĩa/hashes mọi migration; không suy luận tất cả migration khác đã hoặc chưa áp dụng từ số bảng.

## Thiếu cấu hình/khả năng đã xác minh

1. **AI:** API env chỉ có project, runtime mode, DB, bucket, warehouse false và DB secret. Không có AI_PROVIDER, GEMINI_MODEL, VERTEX_LOCATION, EMBEDDING_PROVIDER/MODEL/LOCATION, GCP_VECTOR_MODE hoặc Workspace service-account env. Không chạy provider để thử quota/chi phí. Quyền Vertex của API/SQL SA đã có trên IAM, không đồng nghĩa model/region/quota đã hoạt động.
2. **SOP CORS:** chỉ cho domain Firebase mặc định `.web.app` và `.firebaseapp.com`; thiếu `https://ai-transformation-510302-intrepid-staging.web.app` và origin localhost dùng thử. Chưa sửa CORS.
3. **Realtime:** Firestore default database có sẵn, nhưng rules deployed là deny-all, chưa có rule read userUpdates như source hiện tại.
4. **Worker/Scheduler:** Cloud Run Singapore chỉ có API và boot API, chưa có worker. Scheduler jobs Singapore rỗng. Không suy luận trạng thái các region khác.
5. **Warehouse:** danh sách BigQuery dataset trong project rỗng; warehouse env false. Có thể giữ tắt để kiểm tra luồng chính.
6. **Local:** chưa có ADC/env Intrepid thực; có thể chuẩn bị cấu hình local riêng từ metadata công khai và secret đã có mà không đổi IAM. Nếu cần chạy local bằng API service identity để ký file, demo.biz chưa được impersonate identity đó; không tự cấp quyền.
7. **Nguồn thử:** chưa có Sheet roster staging đúng hợp đồng, nhóm test accounts/class scope và xác nhận quyền ghi dữ liệu hư cấu cho phiên test chức năng; không dùng roster production hoặc Sheet thiết kế cũ.

## Việc cần làm tiếp và ranh giới

- Chuẩn bị/duyệt migrations staging còn thiếu trước test các luồng mới; không chạy baseline đè database hiện hữu.
- Chốt model/location và ngân sách AI; cấu hình runtime AI/embedding/Workspace trong đợt thay đổi staging được phép.
- Sửa Firebase App ID trong local/source theo Web App thật; CORS và Firestore rules cần thay đổi staging riêng được người dùng cho phép. Chưa thực hiện thay đổi remote.
- Worker/Scheduler/realtime end-to-end cần triển khai/config tương ứng; vẫn chưa deploy nên chỉ ghi nhận thiếu.
- Không cần xin lại quyền Owner/Editor cho demo.biz. Chỉ thiếu impersonation API SA nếu lựa chọn chạy local bằng identity này; đó không phải điều kiện để tiếp tục audit read-only.
