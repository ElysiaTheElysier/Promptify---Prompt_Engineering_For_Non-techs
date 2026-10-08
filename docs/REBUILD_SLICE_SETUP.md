# Rebuild: một bài, hai tài khoản, hỗ trợ 1:1

Nhánh `rebuild`, từ main bf1d194. Thay đổi hiện có trong workspace được giữ; chưa commit/push/deploy.

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
