# Từ điển nghiệp vụ

| Từ | Ý nghĩa trong sản phẩm | Ví dụ |
|---|---|---|
| Client | Doanh nghiệp/đơn vị sở hữu lớp | Công ty synthetic Example |
| Course | Chương trình có modules và lessons dùng chung | Viết prompt chăm sóc khách hàng |
| Class | Lần tổ chức course cho nhóm người cụ thể | Lớp Example-CS-01 |
| Enrollment | Quan hệ học viên ↔ lớp và trạng thái quyền học | Active, removed; sync không được tự xóa lịch sử |
| Studio | Cấu hình bài/rubric theo lớp | Lớp A có threshold riêng; lớp B không đổi |
| Rubric | Tiêu chí và trọng số dùng để chấm | Độ đúng, mức tuân thủ, độ rõ |
| Attempt | Bài làm đã lưu và kết quả AI | Attempt số 2 của một bài |
| Run / request ID | Theo dõi lần Generate và replay an toàn | Retry cùng ID trả kết quả đã lưu |
| Judge claim | Quyền xử lý một lượt chấm có concurrency guard | Hai tab không cùng gọi provider cho một attempt |
| SOP / version / binding | Tài liệu, bản nội dung, và bản được lớp/bài sử dụng | Citation trỏ bản 3, không trỏ nội dung vừa sửa |
| Embedding | Vector biểu diễn ý nghĩa trong một model space | Vector 768 chiều có model provenance |
| Progress | Trạng thái học server-backed | Điểm tốt nhất và completion theo semantics đã lưu |
| Award | Certificate/bằng chứng phát hành | Giữ snapshot điều kiện lúc cấp |
| Outbox | Sự kiện trong DB để worker gửi projection có retry | Điểm đổi → Firestore báo UI tải lại |
| Projection | Bản phục vụ một nhu cầu đọc, không phải writable authority mới | BigQuery analytics |
| RLS | PostgreSQL lọc hàng theo quyền actor | Trainer A không đọc progress lớp B |
| Migration | Thay đổi schema có thứ tự và kiểm thử | Thêm composite FK sau khi kiểm tra dữ liệu cũ |

Tất cả ví dụ trên là synthetic. Không dùng email, prompt, file hoặc danh tính người thật để tạo docs.
