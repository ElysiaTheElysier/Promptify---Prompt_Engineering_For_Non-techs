# Trust boundaries và vận hành

GCP là production target. Browser nhận static frontend từ Firebase Hosting, token từ Firebase Auth rồi gọi Cloud Run API. Browser không có PostgreSQL credentials, service identity, provider key hay quyền đọc GCS object tùy ý. API phải kiểm tra business actor/class/lesson trước mỗi thao tác; việc login thành công không cho phép đọc toàn bộ client.

Runtime DB role không phải table owner và không có BYPASSRLS. Transaction đặt role/actor có scope, sau đó reset qua transaction boundary. SECURITY DEFINER helpers cần search_path và execute grants được kiểm tra trên DB thật. Gán claim từ body thay vì Firebase token đã verify là vượt trust boundary. Trainer progress phải theo course/class assignment đã phê duyệt.

Worker chỉ nhận OIDC Scheduler audience/invoker đã cấu hình, private `/internal/roster` và `/internal/projections`. SQL outbox ghi cùng transaction dữ liệu nguồn, worker claim bằng SKIP LOCKED, retry có backoff/DLQ. Firestore giữ invalidation scope và version monotonic, BigQuery projection giữ delete tombstones. Không log raw prompt, upload content, token, keys hoặc email thật.

Pool max 5 mỗi instance và scale template API 2 / worker 1 tương ứng khoảng 15 connection steady-state; rollout/jobs có thể tăng số này. SQL-native embedding giữ connection trong external call, cần budget/timeout test thay vì coi model latency là miễn phí. Firestore/BQ lag, claim age, dead-letter, provider errors, pool pressure và grant denial là signals phải theo dõi. Chưa có traffic/chi phí thật để khẳng định USD savings.

Cloud setup/deploy/cutover do người dùng thực hiện theo [GCP setup](../../gcp/SETUP_GUIDE.md). Local tests không xác minh Vertex model availability, instance flags, SQL service account IAM, Scheduler OIDC, Firestore rules thực hay BQ permissions. Model provenance/dimensions không được thay lẫn trong database correctness change set.

Rollback app giữ additive schema/history; rollback dữ liệu cần approved backup, export manifest, reconciliation và file/object checksums. PITR là restore sang instance mới; không hứa quay ngược toàn bộ hệ thống bên ngoài DB bằng một transaction. Xem [safe plan](../../gcp-database-clean-audit/SAFE_CLOUD_SQL_REFACTOR_PLAN.md) và [migration runbook](../../gcp/MIGRATION_RUNBOOK.md).
