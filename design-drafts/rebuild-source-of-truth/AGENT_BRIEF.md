# Brief cho agent tiếp quản

Xây dựng Promptify Rebuild đầy đủ frontend và backend theo 16 UI mới trong UI_INDEX.md, giữ nguyên wording và chức năng mockup cập nhật, áp dụng flow mới nhất. Người dùng đã nhiều lần yêu cầu giao diện mới; không chỉ gắn backend vào giao diện production cũ.

Giữ React/component production, logo xanh Promptify và theme hiện tại. Dùng guardrail design-taste-frontend, ui-ux-pro-max, UX/SOP/song ngữ/bảo mật. Override đã chốt: không đổi sang Alpine, không dùng màu/logo mockup thay brand current.

UI-00 landing; 01 authentication; 02 profile; 03 access denied; 04 training hub; 05 consolidated workspace; 06 prompt/output diff; 07 judge scorecard; 08 SOP inspector; 09 workshop command center v1.1; 10 learner inspector; 11 curriculum/SOP mapping studio v1.2; 12 L&D dashboard; 13 SOP upload; 14 governance; 15 roster sync.

Facilitator: Observe/Pulse → Prepare/Studio → Execute/War Room. UI09↔10↔11 phải giữ learner/lab/cohort context, có quick inline action và deep editing. Learner: auth/access → profile → training hub → workspace/run → judge → retry/pass; diff, SOP, prompt-assist accept/dismiss và trainer hints phải kết nối dữ liệu thật.

Trước khi code, lập ma trận 16 UI → tương tác → API/RPC → bảng → quyền → state loading/error/empty → acceptance test. Đánh dấu yêu cầu chưa thống nhất thay vì tự coi fixture là nghiệp vụ đã duyệt. Fixture AI/score/telemetry trong prototype không được dùng làm dữ liệu production. Không mang interpreter động của prototype vào runtime.

Code trong implementation-reference chỉ là phần triển khai hiện có trên nhánh rebuild. Đọc delivery status và Git snapshot: có thay đổi chưa commit. Tạo repo/workspace mới theo yêu cầu người dùng; bảo toàn migration/rollback history. Không sửa generated curriculum seed trực tiếp.

Server kiểm tra identity, role, enrollment, cohort/department scope và resource ownership. AI secrets ở server; run/evaluate có idempotency và xử lý lỗi; SOP/rubric gắn phiên bản vào attempt; trainer override có audit riêng, không giả mạo điểm AI. Realtime phải giữ scope, reconnect và fallback; publish/schedule/archive phải theo lifecycle thật.

Chạy build và offline tests phù hợp; kiểm UI bằng browser đối chiếu từng màn. Chỉ báo production-ready sau khi có bằng chứng E2E learner/trainer/admin, permission isolation, live AI/DB/realtime, failure/retry, deployment và rollback. Nhận gói này không tự cấp phép deploy hoặc chạy SQL lên production.
