# Kế hoạch triển khai từ cuộc họp Promptify 12/10/2026

Nguồn: [báo cáo có timestamp và đối chiếu code](MEETING_REVIEW_2026-10-12.md) · [transcript](MEETING_TRANSCRIPT_2026-10-12.md). Kế hoạch áp dụng trước hết cho `apps/promptify-intrepid`; MVP là app riêng và không nhận sửa đổi theo quán tính. Đây là kế hoạch, chưa phải lệnh thay mã, migration hay triển khai.

## Thứ tự ưu tiên

| Giai đoạn | Công việc cụ thể | Điều kiện hoàn thành / bằng chứng |
| --- | --- | --- |
| P0. Chốt baseline | Ghi commit/branch, môi trường test, Vercel Root Directory, schema ledger, data fixture và các tài khoản test Intrepid. Lưu danh sách 7 lab được nhắc trong video, ID/class/department/SOP version. | Có bảng môi trường và test data được xác nhận; không dùng URL prototype hoặc trạng thái Vercel commit để suy ra Production alias. |
| P1. Login/roster | Kiểm tra chọn tài khoản Google, server roster gate, denial/help theo client/class. Đo latency từng chặng OAuth → profile/snapshot → UI-02; tái hiện dropdown. Thiết kế template Sheet versioned và kết nối theo client/class; sync roster có diff, revoke, idempotency, checkpoint và log. | Test allowlisted/unlisted, nhiều Google account, nhiều class, roster thêm/xóa/chuyển phòng ban; độ trễ p50/p95 và lỗi có request ID. Help link hoạt động và không lộ dữ liệu ngoài class. |
| P2. Hồ sơ/quyền | Xác nhận field UI-02, chỉnh bố cục nút trong card, kiểm correction cập nhật DB và log. Tách login/session khỏi quyền mở từng lab; test lịch hai course chồng lấn. | Người học có quyền vào đúng class trong thời gian hợp lệ; sau khi một course hết hạn vẫn vào được course còn hiệu lực. Không hồi quy session security. |
| P3. Luồng học viên | Nối Hub card/filter/progress/resource vào dữ liệu Studio đã publish; kiểm 7 lab, trạng thái khóa/lịch, resume và metrics thật. Kiểm Save personal → Head approval → team, Compare, SOP drawer và trích dẫn trang. Chỉnh ưu tiên Run/Compare và các lỗi UI tái hiện được. | E2E offline + browser test với ít nhất hai attempt, hai SOP versions, hai roles, lab locked/available; dữ liệu vẫn đúng sau reload. |
| P4. Studio và đo lường | Kiểm authoring → Save revision → preview/sandbox → publish, SOP chính thức vs facilitator material, rubric 100%, badge/certificate. Thêm event analytics cho nút quan trọng; chốt schema/retention. | Thay đổi chỉ xuất hiện ở learner sau publish; test conflict/revision, material category, attribution event theo user/class nhưng không chứa prompt/PII. |
| P5. Báo cáo và cloud | Định nghĩa KPI/ROI cùng nguồn dữ liệu, baseline, công thức và export. So sánh Cloud SQL/PostgreSQL cho quan hệ, BigQuery cho warehouse/vector, Cloud Storage cho file, Cloud Run cho API; đo chi phí/latency và thiết kế IAM. | Có ADR, sơ đồ luồng dữ liệu, kế hoạch migration/rollback và dry run trên môi trường test. Chỉ chạy live sau khi chốt lựa chọn và cửa sổ triển khai riêng. |

## Quyết định sản phẩm cần đóng trước khi code

1. **Roster v1:** đối tác có một Sheet nhiều tab hay nhiều Sheet? Tab nào system đọc/ghi? Mốc Sync ở cột A là timestamp, version hay lệnh? Ai có quyền share service account và sửa schema? Xử lý learner rời công ty thế nào?
2. **Denied login:** contact nào hiển thị theo client/class, form gửi tới đâu và lưu trạng thái nào; có thể cho người học mở liên kết Sheet hay chỉ gửi cho PIC/L&D?
3. **UI-02:** employee ID/office location là trường bắt buộc hay tùy chọn; learner sửa tên/department trực tiếp hay qua correction audit; các trường được đồng bộ ngược Sheet hay chỉ DB?
4. **Attempt:** tối đa bao nhiêu lần theo gói/lab, mỗi run tạo context mới ra sao, có cần preallocate ID không? Giữ prompt/output/score/Judge version và nguồn SOP nào để replay đáng tin?
5. **Giải thích AI:** video dùng cụm “chain of thought”. Sản phẩm nên hiển thị giải thích ngắn có nguồn, các bước kiểm tra/diagnostic do hệ thống tạo, không cam kết hiển thị suy luận nội bộ của provider.
6. **ROI:** công thức tiết kiệm thời gian và cải thiện kỹ năng cần số đo nào; ai phê duyệt số công bố cho 27 department?
7. **Cloud:** tránh dùng BigQuery cho mọi giao dịch đăng nhập/roster chỉ vì đã có project. Chốt vai trò Cloud SQL, BigQuery, Storage, vector index, Supabase/Firebase đang tồn tại và tiêu chí cắt chuyển theo từng luồng.

## Các lớp kiểm thử cần bổ sung khi bắt đầu sửa

- Contract/offline: roster template và mapping, sync/revoke/idempotency; profile correction; lifecycle nhiều class; authoring/publish/material; attempt mới và replay; citation đúng page/version; event analytics không chứa PII.
- Browser trên app Intrepid đã cấu hình test: Google account picker, denied support, UI-02, Hub filter/locked state, Run → Judge → Save → Compare → reload, facilitator broadcast. Ghi URL/build/commit, class/lesson IDs và timestamp mỗi case.
- Thử hiệu năng bằng dữ liệu test: OAuth callback, snapshot, Sheet sync và RAG retrieval. Không quy lỗi login chậm cho Supabase/Sheet trước khi có trace.
- Chạy từ `apps/promptify-intrepid`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:boundaries`, `npm run test:smoke`. Các test live, worker, migration và provider chỉ chạy khi đã rà script, môi trường và ngân sách; không chạy cả test bằng glob.

Các thay đổi UI/behavior nên làm thành các PR nhỏ theo P1–P4. Migration/cloud/data riêng với rollback và chứng cứ trên môi trường test; không gộp vào cleanup repo hai app đang diễn ra.
