-- Correct the six Tester reference solutions so each one matches the scenario,
-- control data, task and output format seeded by migration 008. Migration 009
-- used unrelated examples and must not be edited after it has reached production.
BEGIN;

WITH corrected_prompts(lesson_key, improved_prompt) AS (
  VALUES
  (
    'TESTER-ZERO-SHOT',
    $prompt$Bạn là trợ lý điều phối dự án. Chỉ sử dụng các dữ kiện được cung cấp, không tự thêm tên, ngày hoặc cam kết.

Nhiệm vụ: Soạn email ngắn gửi nhóm triển khai để xác nhận lịch họp dự án Orion và yêu cầu người nhận xác nhận tham dự.

Dữ kiện:
- Thời gian họp: 09:00 thứ Sáu.
- Địa điểm: phòng A3.
- Người nhận: nhóm triển khai.
- Hạn xác nhận tham dự: trước 17:00 thứ Năm.

Yêu cầu:
- Có tiêu đề và phần thân email.
- Giọng văn lịch sự, rõ ràng.
- Tổng độ dài tối đa 120 từ.
- Không bổ sung thông tin ngoài các dữ kiện trên.

Đầu ra:
Tiêu đề: ...
Nội dung email: ...$prompt$
  ),
  (
    'TESTER-ONE-SHOT',
    $prompt$Bạn là trợ lý chuẩn hóa cập nhật công việc. Hãy học đúng cấu trúc từ một ví dụ và không suy diễn thêm trạng thái.

VÍ DỤ DUY NHẤT
Input: "API xong, chờ QA thứ Ba"
Output: Hạng mục: API | Trạng thái: Hoàn tất phát triển | Bước tiếp theo: QA vào thứ Ba

INPUT MỚI
"UI dashboard 80%, review sáng mai"

Nhiệm vụ: Chuyển input mới thành đúng một dòng theo cùng pattern của ví dụ.

Định dạng bắt buộc:
Hạng mục: ... | Trạng thái: ... | Bước tiếp theo: ...

Không giải thích thêm và không tự coi hạng mục là hoàn tất khi input chưa nói như vậy.$prompt$
  ),
  (
    'TESTER-FEW-SHOT',
    $prompt$Bạn là trợ lý phân loại phản hồi khách hàng.

Hãy học pattern từ các ví dụ:
- Input: "Rất dễ dùng" → Nhãn: Tích cực
- Input: "Tạm ổn" → Nhãn: Trung tính
- Input: "Liên tục báo lỗi" → Nhãn: Tiêu cực

Input mới: "Chức năng tốt nhưng tải hơi chậm"

Nhiệm vụ: Chọn đúng một trong ba nhãn Tích cực, Trung tính hoặc Tiêu cực cho input mới và giải thích ngắn gọn.

Ràng buộc:
- Không tạo nhãn mới.
- Phần giải thích tối đa 15 từ.

Đầu ra:
Nhãn: ...
Giải thích: ...$prompt$
  ),
  (
    'TESTER-STRUCTURED-REASONING',
    $prompt$Bạn là trợ lý phân tích phương án triển khai. Chỉ dùng dữ kiện đã cho và trình bày lập luận tóm tắt có thể kiểm chứng; không đưa ra suy nghĩ nội bộ.

Dữ kiện:
- Phương án A: 2 tuần, 4 người, chi phí 80 triệu.
- Phương án B: 3 tuần, 2 người, chi phí 55 triệu.
- Ưu tiên: ngân sách.
- Hạn chót: 4 tuần.

Nhiệm vụ: So sánh hai phương án và đề xuất lựa chọn phù hợp nhất.

Đầu ra bắt buộc gồm bốn mục đánh số:
1. Dữ kiện
2. Assumptions
3. Kiểm tra
4. Kết luận

Mọi assumption phải được ghi rõ. Phần kết luận tối đa 3 câu và không bổ sung dữ kiện ngoài nguồn.$prompt$
  ),
  (
    'TESTER-CONSTRAINTS-OUTPUT',
    $prompt$Bạn là trợ lý biên tập thông tin phát hành.

Nguồn duy nhất:
Release 2.4 thêm chức năng xuất CSV, sửa lỗi timeout khi tải báo cáo và triển khai ngày 30/09. Nguồn không cung cấp thông tin về mobile.

Nhiệm vụ: Tóm tắt thông tin phát hành từ nguồn trên.

Ràng buộc bắt buộc:
- Xuất đúng 3 bullet Markdown.
- Tổng toàn bộ đầu ra tối đa 60 từ.
- Chỉ sử dụng thông tin trong nguồn.
- Không suy diễn hoặc bổ sung thông tin về mobile.
- Không viết lời mở đầu hay kết luận ngoài 3 bullet.$prompt$
  ),
  (
    'TESTER-GROUNDED-PROMPTING',
    $prompt$Bạn là trợ lý trả lời câu hỏi chính sách dựa trên bằng chứng.

SOURCE:
"Nhân viên được làm việc từ xa tối đa 2 ngày mỗi tuần sau khi quản lý trực tiếp phê duyệt. Chính sách không đề cập làm việc từ nước ngoài."

QUESTION:
"Tôi có thể làm từ nước ngoài 10 ngày không?"

Quy tắc:
- Chỉ sử dụng thông tin trong SOURCE.
- Không dùng kiến thức hoặc giả định bên ngoài.
- Trích lại bằng chứng ngắn từ SOURCE.
- Nếu SOURCE không đủ để kết luận, phải ghi đúng: "Không đủ thông tin trong nguồn".

Đầu ra gồm đúng ba mục:
Kết luận: ...
Bằng chứng: ...
Thông tin còn thiếu: ...$prompt$
  )
)
UPDATE public.lessons AS lesson
SET improved_prompt = corrected.improved_prompt,
    updated_at = now()
FROM corrected_prompts AS corrected
WHERE lesson.lesson_key = corrected.lesson_key
  AND lesson.module_id IN (
    SELECT module.id
    FROM public.course_modules AS module
    WHERE module.course_id = '92000000-0000-4000-8000-000000000001'
  );

COMMIT;
NOTIFY pgrst, 'reload schema';
