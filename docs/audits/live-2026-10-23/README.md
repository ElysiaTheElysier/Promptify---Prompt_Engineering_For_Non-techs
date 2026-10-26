# Audit bổ sung có bằng chứng LIVE — 23/10/2026

Bộ gốc (`docs/audits/*.md`, commit `99802c6`) được viết khi không truy cập được staging. Bộ này thêm số liệu LIVE (log Cloud Run 7 ngày, cấu hình Cloud Run/Cloud SQL/Cloud Tasks, test offline 73/73) và các phát hiện mới `L01–L15`. Không sửa code, dữ liệu hay hạ tầng.

1. [SYSTEM_INVENTORY.md](SYSTEM_INVENTORY.md) 2. [FUNCTIONAL_AUDIT.md](FUNCTIONAL_AUDIT.md) 3. [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) 4. [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) 5. [ISSUES_REGISTER.md](ISSUES_REGISTER.md) 6. [REMEDIATION_ROADMAP.md](REMEDIATION_ROADMAP.md)

## Tóm tắt điều hành

**Đã chạy và được kiểm chứng (LIVE):** đăng nhập + chặn email ngoài roster; phân quyền theo lớp (Head); Run streaming; Judge async (3/4 job hôm 23/10 thành công, chấm 3,6–14s); token phiên; chặn prompt injection; hết hạn → chỉ đọc; lưu broadcast/hint/yêu cầu gợi ý. 73/73 test offline đạt.

**Chưa xong hoặc hỏng:** Judge thất bại khi một bước bị treo (L01, LIVE); đổi trạng thái lab từ Workshop (L05, CODE); sandbox không budget (L04); không có cách cấp quyền ngoài Sheet (L07); roster theo lịch chưa chạy (Scheduler PAUSED); không có xoá/lưu trữ dữ liệu (L10); duyệt gợi ý và hộp thông báo chưa được quan sát trên trình duyệt.

**Sẵn sàng production? Chưa.** Không có lỗi P0 về bảo mật, nhưng: pool SQL tự khoá (L02) sẽ gây lỗi quyền giả ở ~5 request đồng thời/instance; không có hàng đợi provider toàn cục (6/100 pipeline thành công khi thử tải); Judge không có kiểm soát đuôi; 0 alert, DB không HA; mã nguồn mới vào git hôm nay, chưa có CI build/deploy; chưa diễn tập restore.

**Cản trở mở rộng:** SQL (pool tự khoá, 500 kết nối, snapshot ~39+N câu lệnh bị poll) → provider (không admission, 7 lời gọi/Run, đuôi 97–341s) → queue Judge 3 job đồng thời.

**10 cải thiện tác động cao nhất:** (1) sửa pool tự khoá L02 · (2) kiểm soát đuôi Judge L01 · (3) bật admission 013 · (4) alert + giới hạn scale L03 · (5) budget sandbox L04 · (6) CI build từ commit I08 · (7) bộ lọc chào hỏi cho parallel-v1 L09 · (8) xác thực một lần/request L06 · (9) giảm truy vấn snapshot I11 · (10) diễn tập restore + chính sách lưu trữ dữ liệu.

**Phải sửa trước khi phát hành:** L01, L02, L03, admission (I06), L04, CI/provenance (I08), restore/HA (I09), chính sách dữ liệu (L10), nghiệm thu toàn vai (I14/I15), đổi mật khẩu `postgres`.

**Không nên đổi:** phân quyền nhiều lớp + RLS; idempotency và claim/lease; snapshot đóng băng; Judge async; `weighted-v1` + rubric 5 tiêu chí; cờ mặc định tắt; quy trình no-traffic → kiểm tra → promote. Không thêm microservice/Redis.
