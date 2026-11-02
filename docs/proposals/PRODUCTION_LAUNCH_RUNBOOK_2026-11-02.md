# Runbook launch production — Promptify Intrepid (02/11/2026)

Trạng thái: **chuẩn bị, chưa chạy bước nào trên cloud.** Quyết định của owner ngày 02/11: production đặt **trong project staging** `ai-transformation-510302`, nhưng dùng tài nguyên riêng. Mọi bước có ⚠ cần owner duyệt và tự chạy (hoặc duyệt cho người vận hành chạy).

Không đổi model `gemini-3.8-flash`, Judge `parallel-v1`, scoring `weighted-v1`, ngưỡng hay quota.

## Production tách khỏi staging ở đâu

| Tài nguyên | Staging | Production |
| --- | --- | --- |
| Cloud SQL | `promptify-staging` (ZONAL) | `promptify-prod` (REGIONAL HA, PITR, giữ 14 bản backup, deletion protection) |
| Cloud Run API | `promptify-intrepid-api` | `promptify-intrepid-api-prod` |
| Service account | `promptify-api`, `promptify-worker` | `promptify-prod-api`, `promptify-prod-worker`, `promptify-prod-scheduler` |
| Bucket SOP | `…-intrepid-sop-staging` | `…-intrepid-sop-prod` |
| Secret DB | `intrepid-db-password` | `intrepid-prod-db-password` |
| Queue Judge | `promptify-judge-staging` | `promptify-judge-prod` |
| Hosting | `…-intrepid-staging` | `…-intrepid-prod` |
| Cấu hình | env hiện tại | [gcp/production.env](../../apps/promptify-intrepid/gcp/production.env) |

**Dùng chung (rủi ro đã chấp nhận khi chọn chung project):**
- Firebase Auth: một tài khoản Google đăng nhập được cả hai. Quyền vào lớp vẫn do roster trong từng DB quyết định.
- Firestore `(default)`: document được khoá theo uid và classId, mà classId khác nhau giữa hai DB, nên không lẫn dữ liệu.
- Quota Vertex: tải test trên staging làm chậm production. **Không chạy load test trên staging khi production đang có người học.**
- IAM cấp project: người có quyền staging cũng có quyền production.
- Budget alert: tính cho cả project.

## Khác biệt cấu hình production (đã có trong code, mặc định tắt ở staging)

| Cờ | Tác dụng |
| --- | --- |
| `DOMAIN_POLICY=require` | Ẩn lớp của client chưa cấu hình domain (TM-002). **Trước launch phải thêm domain cho mọi client**, gồm cả `gmail.com` nếu owner cho phép Gmail cá nhân |
| `DISABLE_PUBLIC_BASIC=true` | Chặn đăng ký gói Basic công khai (ngoài phạm vi Phase 1, TM-005) |
| `ACCESS_EXPIRY_MODE=enforce` | Hết hạn → chỉ đọc. Từ 02/11, nếu thiếu migration 016 thì từ chối (503) thay vì cho qua (I03) |
| `INJECTION_GUARD=block` | Giống staging hiện tại |
| `SESSION_TOKEN_CAP` | **Chưa đặt**, chờ owner quyết (I04) |

## Các bước

1. **Code freeze + tag.** Chọn commit; chạy `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test`. Tag `prod-YYYYMMDD`. Image production phải build từ tag này, **không dùng overlay**.
2. **Staging chạy đúng bản tag** (⚠ deploy staging), sau đó chạy [E2E guide](../E2E_TEST_GUIDE_2026-10-28.md) đủ 4 vai, ghi PASS/FAIL. Không qua bước 3 nếu còn FAIL ở luồng chính.
3. ⚠ **Tạo tài nguyên:** `bash gcp/10-create-production.sh.template --execute` (tốn phí).
4. ⚠ **Schema:** áp `gcp/sql/001…021` theo thứ tự vào `promptify-prod` (owner credential), rồi tạo role `promptify_runtime` và mật khẩu vào secret. **Không** copy dữ liệu staging.
5. ⚠ **IAM:** chạy lại các lệnh của `03-service-iam.sh.template`, thay tên SA, bucket và secret bằng tên `prod`. Cấp `cloudtasks.enqueuer` **ở mức queue** `promptify-judge-prod`, không ở mức project.
6. ⚠ **Deploy API:** service `promptify-intrepid-api-prod`, image từ tag ở bước 1, env lấy từ `gcp/production.env`, `PGPASSWORD` lấy từ secret.
7. ⚠ **Deploy Hosting:** tạo `.env.production` với `VITE_STREAM_API_URL=<URL Cloud Run prod>`; trong `firebase.json` thêm target `prod` có rewrite `/api/**` → `promptify-intrepid-api-prod`; deploy site `…-intrepid-prod`. Kiểm `/api/product` khi chưa đăng nhập → 401.
8. ⚠ **Monitoring:** `ALERT_EMAIL=… BILLING_ACCOUNT=… bash gcp/11-production-alerts.sh.template --execute`. Gửi thông báo test và xác nhận người nhận đã thấy.
9. ⚠ **Diễn tập restore (bắt buộc trước khi có học viên):** clone PITR `promptify-prod` sang `promptify-prod-restore-test`, đọc số dòng 5 bảng chính, ghi thời gian khôi phục (RTO thực tế), rồi xoá instance clone.
10. **Seed dữ liệu:** Admin thêm domain cho từng client (vì `DOMAIN_POLICY=require`), tạo khoá/lớp, sync roster thật. Share Sheet roster cho SA workspace.
11. **Smoke production** với 1 admin + 1 learner test: đăng nhập, Run, AI Judge, mở SOP, Analytics.
12. **Mở pilot** cho số người owner đã chốt; theo dõi alert 48 giờ đầu.

## Rollback

- Hosting: release trước đó của site prod (`firebase hosting:clone` hoặc release trên console).
- API: chuyển 100% traffic về revision trước.
- DB: chỉ dùng PITR khi dữ liệu hỏng; migration mới phải có file trong `gcp/sql/rollback/`.

## Go / No-go

| Điều kiện | Trạng thái 02/11 |
| --- | --- |
| Check offline pass trên commit được tag | ✅ ở local (89/89, smoke pass), chưa tag |
| E2E 4 vai PASS trên staging | ⬜ |
| I01, I02, I03, I05, I10 đã sửa | ✅ CODE + OFFLINE, chưa deploy |
| I04 hạn mức phiên | ⬜ chờ owner |
| Capacity cho số người đã chốt | ⬜ chờ owner trả lời; pilot ≤ 2–3 lần chấm cùng lúc là mức đã đo |
| Alert có người nhận + test notification | ⬜ |
| Diễn tập restore | ⬜ |
| Owner ký duyệt | ⬜ |
