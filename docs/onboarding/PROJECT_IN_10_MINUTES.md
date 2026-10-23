# Promptify trong 10 phút

Promptify Intrepid giúp nhân viên thực hành viết yêu cầu cho AI trong tình huống công việc. Ví dụ, học viên cần viết email trả lời khách hàng theo SOP của phòng chăm sóc. Họ đọc yêu cầu bài, nhập prompt, chọn tài liệu riêng được phép dùng, bấm Generate rồi bấm Judge để nhận điểm và phản hồi theo rubric.

Generate tạo câu trả lời. Judge đánh giá câu trả lời đó theo yêu cầu và bằng chứng đã dùng lúc Generate. Đây là hai bước có trạng thái riêng: một kết quả đã tạo không có nghĩa đã được chấm, và retry không được âm thầm tạo thêm attempt hay gọi AI tốn phí lần nữa. Database giữ request ID, kết quả, snapshot và claim để quản lý khác biệt đó.

Learner học trong lớp được ghi danh. Trainer chuẩn bị bài/rubric cho lớp mình phụ trách, xem tiến độ và hướng dẫn học viên. Head quản lý nhu cầu của đơn vị/phòng ban trong scope được cấp. Admin vận hành cấu hình, access, governance và các workflow phê duyệt. Đăng nhập Google chứng minh danh tính; quyền xem lớp vẫn do hồ sơ nghiệp vụ và phân công quyết định.

Một course là chương trình dùng chung; class là lần triển khai cho một doanh nghiệp/phòng ban. Hai lớp có thể cùng học course. Vì vậy sửa Studio của lớp A phải giữ lớp B nguyên vẹn theo quyết định sản phẩm mới. Nội dung nền của course và override của class có trách nhiệm khác nhau; không cần nhân đôi toàn bộ course để đạt isolation.

Cloud SQL giữ dữ liệu có quan hệ: học viên, ghi danh, bài, attempts, điểm, SOP versions và lịch sử. Cloud Run chạy API và worker. Firebase Hosting đưa UI đến trình duyệt; Firebase Authentication xác thực login. Vertex AI chạy Generate/Judge và embedding. pgvector là phần mở rộng của PostgreSQL giúp tìm đoạn SOP gần nghĩa, không phải một database khác. `google_ml_integration` cho Cloud SQL gọi endpoint AI theo cấu hình đã cấp quyền.

File upload đi vào Cloud Storage; database giữ metadata, owner, scope và version. Firestore gửi tín hiệu thay đổi để UI tải lại dữ liệu có quyền. BigQuery phục vụ projection/analytics và retrieval mode được cấu hình. Hai nơi đó không thay Cloud SQL làm nguồn sự thật nghiệp vụ. Sheets là đầu vào roster, không tự quyết định quyền truy cập nếu dữ liệu chưa qua validation/import.

50 bảng không đồng nghĩa 50 sản phẩm. Một tin nhắn có nhiều receipts; một SOP có nhiều versions/chunks; một run có bước Judge; một certificate cần giữ bằng chứng lịch sử dù rubric sau này đổi. Gộp các dữ liệu khác thời điểm sống hoặc quyền truy cập sẽ làm mất tính đúng đắn. Audit giữ tất cả capabilities và 50 bảng, tập trung làm quyền, ownership và retry rõ ràng.

Tiếp theo đọc [đường đi khi bấm Chấm điểm](DEVELOPER_WALKTHROUGH.md), hoặc xem từng bảng tại [data dictionary](../database/DATA_DICTIONARY.md).
