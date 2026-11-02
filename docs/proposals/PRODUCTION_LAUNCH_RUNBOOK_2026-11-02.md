# Runbook launch production — Promptify Intrepid (02/11/2026)

Trạng thái: **chuẩn bị, chưa chạy bước nào trên cloud.** Quyết định của owner ngày 02/11: production đặt **trong project staging** `ai-transformation-510302`, nhưng dùng tài nguyên riêng. Mọi bước có ⚠ cần owner duyệt và tự chạy (hoặc duyệt cho người vận hành chạy).

Không đổi model `gemini-3.8-flash`, Judge `parallel-v1`, scoring `weighted-v1`, ngưỡng hay quota.

## Câu trả lời của owner (02/11)

| Câu hỏi | Trả lời | Áp vào |
| --- | --- | --- |
| Quy mô | ~100 học viên, dùng rải rác (không phải 100 lần bấm cùng một giây) | Bảng capacity bên dưới |
| Ngân sách / load test | Không trả lời | Không chạy load test trả phí; budget alert mặc định 200 USD/tháng |
| Người nhận alert | `ducvo@intrepid.asia` (chưa rõ trong giờ hay 24/7) | `ALERT_EMAIL` ở bước 8 |
| RPO / RTO | Tính sau | PITR + 14 bản backup vẫn bật; diễn tập restore vẫn làm để biết RTO thực tế |
| Lưu dữ liệu | Giữ hết trong DB, kể cả khi nhân viên nghỉ | Không có job xoá; roster bỏ người thì chỉ thu hồi quyền (hành vi hiện tại) |
| Gói Basic | Chưa có, bản riêng Intrepid | `DISABLE_PUBLIC_BASIC=true` |
| Gmail cá nhân | Được, nếu có trong roster | Domain của client Intrepid: `intrepid.asia` **và** `gmail.com` |
| Hạn mức phiên | Để team đề xuất | **Chặn mềm** `SESSION_TOKEN_CAP=50000`/bài/phiên: kiểm trước Run, trừ sau Run; nhiều tab cùng lúc có thể vượt thêm 1 lần Run. Chặn cứng chỉ cần nếu token bị tính tiền theo đầu người |
| Drive/Sheets ngày đầu | **Bắt buộc** | Go/no-go thêm: import SOP từ Drive (PDF, DOCX, XLSX, Google Doc) và roster từ Sheet phải PASS trên production |
| Chứng chỉ cho HR | Để sau | Chứng chỉ chỉ mang tính ghi nhận |
| Go-live | Tối 02/11 | Xem "Lộ trình tối nay" |

## Capacity cho ~100 học viên dùng rải rác

Ước tính: một buổi 60 phút, mỗi học viên 6 Run + 6 AI Judge → ~600 lần chấm/giờ, trung bình chưa tới 2 lần chấm chạy cùng lúc. Lúc nguy hiểm là khi giảng viên bảo cả lớp "bấm chấm đi": 30–50 lần chấm trong 1 phút.

| Thiết lập | Staging hiện tại | Production | Lý do |
| --- | --- | --- | --- |
| Queue Judge `maxConcurrentDispatches` | 3 | **10** | 50 job dồn một lúc: ~2 phút chờ với 3, ~35 s với 10 (mỗi lần chấm 5–7 s) |
| Cloud Run `maxScale` / `containerConcurrency` | 100 / 80 | **10 / 40** | 10 × pool 5 = 50 kết nối DB, nằm trong giới hạn Cloud SQL 2 vCPU |
| `PGPOOL_MAX` | 5 | 5 | I01 đã sửa nên pool 5 không còn bị giữ chéo |
| Hàng đợi provider toàn hệ thống (013) | tắt | **tắt** | Chưa deploy/kiểm ở đâu; bật tối nay là rủi ro lớn hơn lợi ích |

**Chưa chứng minh:** chưa có load test cho cấu hình này. Đã đo chắc chắn: 33 lần chấm liên tiếp, 0 lỗi (26/10). Quota Vertex là dùng chung (Dynamic Shared Quota); khi bị 429, Judge tự thử lại từng tiêu chí. Khuyến nghị cho buổi đầu: giảng viên **cho từng nhóm 20–30 người bấm chấm**, không cho cả 100 người bấm cùng lúc.

## Lộ trình tối nay (thứ tự tối thiểu)

| # | Việc | Ai | Ước tính |
| --- | --- | --- | --- |
| T1 | ⚠ Build image từ HEAD, deploy lên **staging** (revision mới, chưa nhận traffic), kiểm `/readyz`, rồi chuyển traffic | Claude, sau khi owner duyệt | 30–45 phút |
| T2 | E2E đăng nhập trên staging: owner tự đăng nhập trong browser pane, Claude chạy các bước; thêm Drive/Sheets | Owner + Claude | 60–90 phút |
| T3 | ⚠ Tạo tài nguyên production (bước 3–5), áp schema 001–021 (cần owner credential) | Owner duyệt từng bước | 45–60 phút (Cloud SQL REGIONAL mất ~15 phút để tạo) |
| T4 | ⚠ Deploy API + Hosting production (bước 6–7), alert (bước 8) | Claude, owner duyệt | 30 phút |
| T5 | Seed client/domain/lớp, sync roster thật, smoke (bước 10–11) | Admin | 30 phút |
| T6 | Diễn tập restore (bước 9) | Owner duyệt | 30 phút; có thể làm sáng mai **trước** buổi học đầu tiên |

Nếu T2 còn FAIL ở luồng chính (đăng nhập, Run, Judge, SOP, roster), **dời go-live**, không làm tiếp T3.

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
| `SESSION_TOKEN_CAP=50000` | Chặn mềm theo bài/phiên (owner giao team đề xuất, 02/11) |

## Các bước

1. **Code freeze + tag.** Chọn commit; chạy `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test`. Tag `prod-YYYYMMDD`. Image production phải build từ tag này, **không dùng overlay**.
2. **Staging chạy đúng bản tag** (⚠ deploy staging), sau đó chạy [E2E guide](../E2E_TEST_GUIDE_2026-10-28.md) đủ 4 vai, ghi PASS/FAIL. Không qua bước 3 nếu còn FAIL ở luồng chính.
3. ⚠ **Tạo tài nguyên:** `bash gcp/10-create-production.sh.template --execute` (tốn phí).
4. ⚠ **Schema:** áp `gcp/sql/001…021` theo thứ tự vào `promptify-prod` (owner credential), rồi tạo role `promptify_runtime` và mật khẩu vào secret. **Không** copy dữ liệu staging.
5. ⚠ **IAM:** chạy lại các lệnh của `03-service-iam.sh.template`, thay tên SA, bucket và secret bằng tên `prod`. Cấp `cloudtasks.enqueuer` **ở mức queue** `promptify-judge-prod`, không ở mức project.
6. ⚠ **Deploy API:** service `promptify-intrepid-api-prod`, image từ tag ở bước 1, env lấy từ `gcp/production.env`, `PGPASSWORD` lấy từ secret.
7. ⚠ **Deploy Hosting:** tạo `.env.production` với `VITE_STREAM_API_URL=<URL Cloud Run prod>` và `VITE_REBUILD_PRODUCTION=true` (tắt route thiết kế `/rebuild` còn chứa landing cũ có Agribank/Basic). Header phải có `Cache-Control: no-store` cho cả `/` lẫn `/index.html` (đã kiểm trên staging 02/11; thiếu `/` thì sau mỗi lần deploy trình duyệt giữ index cũ tới 1 giờ và không tải được app); trong `firebase.json` thêm target `prod` có rewrite `/api/**` → `promptify-intrepid-api-prod`; deploy site `…-intrepid-prod`. Kiểm `/api/product` khi chưa đăng nhập → 401.
8. ⚠ **Monitoring:** `ALERT_EMAIL=… BILLING_ACCOUNT=… bash gcp/11-production-alerts.sh.template --execute`. Gửi thông báo test và xác nhận người nhận đã thấy.
9. ⚠ **Diễn tập restore (bắt buộc trước khi có học viên):** clone PITR `promptify-prod` sang `promptify-prod-restore-test`, đọc số dòng 5 bảng chính, ghi thời gian khôi phục (RTO thực tế), rồi xoá instance clone.
10. **Seed dữ liệu:** Admin thêm domain `intrepid.asia` và `gmail.com` cho client Intrepid (vì `DOMAIN_POLICY=require`), tạo khoá/lớp, sync roster thật. Share Sheet roster cho SA workspace.
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
| I04 hạn mức phiên | ✅ chọn chặn mềm 50k (cấu hình, không cần sửa code) |
| Capacity cho ~100 học viên rải rác | 🟡 cấu hình đã chọn; chưa load test; giảng viên chia nhóm khi cho bấm chấm |
| Drive/Sheets: import SOP PDF/DOCX/XLSX/Google Doc + roster Sheet trên production | ⬜ |
| Alert gửi `ducvo@intrepid.asia` + test notification | ⬜ |
| Diễn tập restore | ⬜ |
| Owner ký duyệt | ⬜ |
