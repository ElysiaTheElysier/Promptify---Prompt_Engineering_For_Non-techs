# Rebuild: một bài, hai tài khoản, hỗ trợ 1:1

Nhánh `rebuild`, từ main bf1d194. Code bước đầu đã commit tại c3cb2e2; chưa push/deploy. Thay đổi có sẵn khác trong workspace được giữ.

## Project thử nghiệm vừa tạo

Dashboard đã xác nhận `Promptify-Rebuild`, ref `aixhryqzgpptuhstiflx`, Healthy, chưa có migrations. Đây là project thử nghiệm, không dùng project của bản deploy.

Chạy `node scripts/prepare_rebuild_staging.mjs` để chuẩn bị `outputs/rebuild-setup/01_install_empty_staging.sql` và template cấu hình. Script chỉ tạo file; không kết nối DB, không lấy credential. Bộ SQL ghép schema và migrations002–018 theo thứ tự, giữ nguyên nguồn migration, gộp transaction để lỗi sẽ rollback toàn bộ. Guard chặn nếu đã có bảng public hoặc auth user. Đây là guard chống chạy nhầm trên DB đã dùng, không tự xác minh project ref: phải kiểm URL dashboard trước khi chạy.

Bộ cài gồm seed giáo trình lịch sử trong repo, không phải dữ liệu xuất từ production. Template lưu thành `.env.rebuild.local` (được ignore); chạy `npm run dev -- --mode rebuild`. Không sao chép service role key vào biến VITE hoặc chat.

### Kết quả thao tác staging ngày 08/10/2026

- Người dùng xác nhận chạy SQL trên project mới. Schema và migrations002–018 đã chạy thành công qua SQL Editor: `REBUILD_SCHEMA_INSTALLED`, `rebuild_runs`, `trainer_hints`. Bằng chứng: `outputs/rebuild-setup/schema-installed.png`.
- Đã lưu URL, anon key và service role key đúng project staging vào `.env.rebuild.local`; các AI credential để trống, không kế thừa credential AI của `.env`. Chưa khởi động local server.
- Truy vấn pg_policies phát hiện migration018 dùng `e.class_id = e.class_id` trong hint_send. Migration019 mới sửa thành `e.class_id = trainer_hints.class_id`, đã chạy và dashboard trả `Success. No rows returned`. Không sửa migration018 đã áp dụng.
- Generator bộ cài mới bao gồm schema và migrations002–019. Không chạy lại bộ cài trên DB đã có bảng.
- Quyền browser bị từ chối ở bước kiểm tra cuối; chưa có kết quả đủ6checks sau sửa, chưa OAuth/test accounts, chưa E2E, chưa gọi AI. Không tiếp tục qua phương thức khác để vượt quyền browser.
- SQL Editor không tự ghi lịch sử vào bảng migration của CLI; không xem badge `No migrations` như chứng cứ schema chưa cài. Trước khi dùng CLI cần reconcile lịch sử, không chạy lại từ002.

## Đã nối trong code

- Generate lấy lesson/system instruction/resource content từ DB, bỏ context client làm nguồn thật; snapshot được lưu trước gọi AI.
- Server ghi attempt/output qua RPC service-only. Judge nhận attempt ID, kiểm ownership và dùng snapshot/output đã lưu; client không ghi điểm/output qua RPC cũ.
- Request ID chống replay cùng request tạo thêm provider call sau khi đã lưu. Request pending/uncertain bị chặn: không hứa provider exactly-once.
- Trainer mở chi tiết lớp → “Bài làm & hỗ trợ 1:1”, bấm Làm mới để xem tối đa100 attempt mới nhất và gửi hint cho người được chọn. Assigned course instructor mới được đọc/gửi.
- Learner workspace tải tối đa5 hint gần nhất, polling10s khi tab đang hiện. Chưa broadcast, draft live, seen-ack hoặc push realtime.

## Cần làm ở staging trước khi sử dụng live

1. Kiểm tra applied migrations004/006/016/017 và mapping users.auth_provider_id→Supabase auth user ID. Backup schema/data.
2. Review/apply `supabase/migrations/018_rebuild_server_runs_and_hints.sql` ở staging. Migration thu hồi quyền ghi/RPC cũ của browser nên code mới và migration phải rollout cùng nhau; không apply lên production cũ.
3. Server có SUPABASE_URL, SUPABASE_ANON_KEY, **SUPABASE_SERVICE_ROLE_KEY** và provider credential hiện có. Không đặt service role key trong VITE_* hoặc browser. Chưa đọc/đổi credential trong task này.
4. Một class active, course/module/lesson published (UUID), lesson resources/rubric được duyệt, learner active enrollment; trainer có course_instructors assignment.
5. Kiểm bằng learner+trainer+outsider: run→output saved→Judge→refresh/history/compare; trainer refresh thấy bài; private hint learner đúng nhận sau tối đa10s; outsider/other-class RPC/hints bị chặn; forged output/score không được ghi; retry Judge không thêm attempt.

Chưa chạy DB migration/provider live. Build và test offline không chứng nhận RLS/SQL đã chạy ở production.

## Giới hạn và bước tiếp

Synchronous API còn timeout exposure: sau provider fail hoặc mất response trước save, `rebuild_runs` pending cần operator kiểm request ID, provider logs và xử lý thủ công; không tự retry ID mới khi chưa biết đã tiêu tiền. Chưa worker queue/resume/cancel/budget.

Judge retry khi hai request đồng thời có thể gọi provider hai lần; điểm/attempt không được client giả nhưng cần lease đánh giá để chống duplicate billing. Evaluate dùng rubric snapshot với contract5tiêu chí0–2 hiện có, chưa weighted rubric tổng100.

Chưa có Head/tenant isolation mới; panel mới giới hạn assigned course nhưng policies lịch sử cho instructor toàn cục cần audit riêng. Progress completed hiện còn nghĩa generated run của migrations016, không gọi mastery.

Rollback rollout: không tự mở lại quyền client ghi score. Tắt live pilot hoặc forward-fix. Chưa drop bảng/hint hoặc migration history. Chỉ promote sau staging negative tests và live E2E có bằng chứng.

Checks: `npm run build`, `npm run test:progress`, `npx tsx test/verify_rebuild_runs.ts`. Test cuối dùng fake provider/DB để kiểm canonical input, replay, save failures và denied scope.
