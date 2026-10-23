# Database làm gì trong một buổi học?

Một học viên đăng nhập và được ghi danh lớp A. `users` giữ hồ sơ nghiệp vụ; Firebase binding nối login với UUID cũ; `learners` giữ learner identity; `enrollments` quyết định lớp đang được truy cập. Không gộp login, hồ sơ và ghi danh: một người có nhiều lớp, còn lịch sử bài làm phải sống qua thay đổi đăng nhập.

Course có modules/lessons; class sử dụng course nhưng có Studio override riêng. Khi học viên Generate, server đọc bài đã publish, class config, SOP binding và private context đúng owner, rồi giữ snapshot trong run. Snapshot là chứng cứ thời điểm chạy; lesson/config hiện tại không được thay nó khi chấm lại bài cũ.

`prompt_attempts` giữ output và evaluation; `rebuild_runs` giữ request lifecycle/idempotency; `rebuild_judge_claims` giữ concurrency của lượt chấm. Tách riêng giúp xử lý provider timeout khác với DB save failure và tránh retry gọi AI hai lần. Progress không phải một bản sao đơn giản của score mới nhất: có count/best score/completion semantics. Award giữ issuance evidence để rubric sau này đổi không sửa certificate đã cấp.

SOP document là danh tính tài liệu; version là nội dung bất biến; binding chỉ bản mà lớp/bài được phép dùng; chunks là dữ liệu retrieval có model provenance. Composite FK bảo vệ class/document/version tuple. GCS chứa object; DB giữ ownership/reference; không thể xóa version chỉ vì file hiện tại mới hơn.

Roster connection giữ nguồn Sheets, invocation/logs giữ sync state, correction giữ quyết định chuyển department. Workshop message khác receipt: một message có nhiều người nhận và thời điểm đọc. Governance/audit/rotation approvals là lịch sử có quyền riêng, không gộp vào bảng message hay lesson.

Outbox không phải audit nghiệp vụ. Nó là hàng đợi transaction để Firestore/BQ biết có thay đổi; event/tombstone có thể còn cần sau khi entity đã xóa. Vì vậy không buộc outbox có FK cascade xóa theo entity. Consumers kiểm tra revision và scope trước cập nhật đích.

Retention chưa được owner phê duyệt không được biến thành job purge tự động. Explorer chỉ sử dụng giá trị synthetic; không dump prompt, email, token, file hoặc certificate thật vào docs. Đi tới [dictionary](DATA_DICTIONARY.md) để chọn domain.
