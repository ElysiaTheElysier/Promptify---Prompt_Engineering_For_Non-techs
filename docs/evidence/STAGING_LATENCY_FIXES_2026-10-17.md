# Kiểm thử Chrome và tối ưu độ trễ local → staging

Ngày 17/10/2026. Chỉ thay đổi app Intrepid local; không deploy, đổi IAM, schema hoặc dữ liệu production.

## Kết quả luồng thực tế

Người dùng tự thao tác Chrome với demo.biz, xác nhận đăng nhập, vào Hub QA, Save personal, Compare V1/V2 và preview badge thành công. Agent không có quyền điều khiển phiên Chrome này. Đối chiếu SQL chỉ đọc xác nhận hồ sơ có đủ hai trường, một template personal của đúng tài khoản/lớp, hai attempt V1/V2 và một award. Tên template/thông tin hồ sơ khác gợi ý QA; giữ nguyên dữ liệu người dùng nhập. Không tự Share. Dữ liệu attempt/điểm là fixture hư cấu, không phải kết quả AI thật.

## Nguyên nhân và thay đổi

- Snapshot thực hiện nhiều transaction SQL nối tiếp, tạo nhiều lượt đi/về từ local đến Cloud SQL. Gom các truy vấn độc lập và tái sử dụng transaction service trong phạm vi một request. Hàng đợi trên mỗi connection giữ truy vấn nối tiếp; các nhóm dùng connection khác vẫn chạy đồng thời.
- Danh sách lớp được tái sử dụng trong cùng Context request để tránh đọc lặp. Không cache quyền giữa các request. Truy vấn actor vẫn dùng connection/role/claims riêng; giữ nguyên bộ lọc và kiểm tra quyền.
- Năm truy vấn feedback độc lập chạy đồng thời. Vẫn giữ fallback cho bảng tùy chọn bên ngoài transaction snapshot.
- Tách sáu màn hình quản trị thành các phần tải khi cần, giữ navigation khi đang tải màn hình. Không poll khi tab bị ẩn. Không xóa snapshot hoặc khởi động lại auth chỉ vì chuyển màn hình.
- Thêm log local về tổng thời gian, SQL và verify token; không log token, email, câu SQL hoặc dữ liệu truy vấn. Firebase vẫn kiểm tra token có bị thu hồi, không thêm cache xác thực xuyên request.

## Số đo

| Phép đo | Trước | Sau |
| --- | --- | --- |
| Full snapshot, trace local thực tế | khoảng 6.5–6.9 giây, 35 transaction | khoảng 2.9–3.4 giây, 14 transaction; mẫu gần nhất 2,986 ms |
| Riêng feedbackSnapshot, trung vị ba lượt warm | 1,024 ms | 253 ms |
| ProductionApp chunk raw / gzip | 1,305.32 / 322.62 kB | 1,086.17 / 288.05 kB |

Full snapshot giảm khoảng một nửa thời gian trong các mẫu quan sát; đây không phải benchmark có kiểm soát toàn bộ đăng nhập hoặc mọi lần đổi trang. Verify token vẫn khoảng 0.3–0.5 giây. Tổng sqlMs là cộng thời gian các transaction có thể chạy đồng thời nên có thể lớn hơn thời gian request. feedbackSnapshot không bao gồm auth và phần snapshot khác. Save được ghi nhận 3,876 ms trong một mẫu, còn có dư địa tối ưu; không tuyên bố mọi thao tác tức thì.

## Kiểm chứng và giới hạn

37/37 offline tests đạt; build/TypeScript, lint, boundaries và local smoke đạt. Test mới kiểm transaction scope, hàng đợi truy vấn, actor isolation, request isolation, rollback và release. Pool PGlite offline không bật scope tối ưu; mock test mới kiểm nhánh scope, trace staging thật xác nhận 14 transaction. Lint còn cảnh báo vòng type Workspace; build còn cảnh báo chunk trên 500 kB.

Metadata chỉ đọc: `apps/promptify-intrepid/outputs/staging-feedback-review/chrome-ui-verification.json`. Benchmark riêng feedback có before/after JSON cùng thư mục (ignored). Công cụ kiểm chứng staging không nằm trong offline allowlist.

Chưa kiểm Generate/Judge AI thật: cần chốt model, location, ngân sách. Chưa xác nhận Restore qua Chrome. Không thay cấu hình cloud để vượt chặn. App local và SQL proxy được giữ chạy phục vụ review.
