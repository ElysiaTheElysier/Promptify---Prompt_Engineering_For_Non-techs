-- Populate complete reference prompts for the six Tester lessons.
-- This migration intentionally does not modify Agribank curriculum content.
BEGIN;

UPDATE public.lessons AS lesson
SET improved_prompt = CASE lesson.lesson_key
  WHEN 'TESTER-ZERO-SHOT' THEN $prompt$Bạn là trợ lý truyền thông nội bộ.

Hãy viết một email ngắn thông báo cho nhân viên rằng buổi đào tạo AI ngày mai được chuyển từ 9:00 sang 14:00.

Yêu cầu:
- Giọng lịch sự, rõ ràng.
- Tối đa 120 từ.
- Có tiêu đề email.
- Kết thúc bằng lời nhắc kiểm tra lại lịch làm việc.

Đầu ra:
Tiêu đề:
Nội dung email:$prompt$
  WHEN 'TESTER-ONE-SHOT' THEN $prompt$Bạn là trợ lý phân loại phản hồi khách hàng.

Hãy học cách phân loại từ ví dụ sau:

Input:
"Giao hàng rất nhanh nhưng hộp sản phẩm bị móp."

Output:
{
  "sentiment": "mixed",
  "main_issue": "packaging"
}

Bây giờ hãy phân loại input mới:

Input:
"Sản phẩm tốt nhưng tôi phải chờ gần một tuần mới nhận được hàng."

Trả về đúng JSON với cấu trúc:

{
  "sentiment": "...",
  "main_issue": "..."
}

Không giải thích thêm.$prompt$
  WHEN 'TESTER-FEW-SHOT' THEN $prompt$Bạn là trợ lý phân loại yêu cầu hỗ trợ khách hàng.

Học từ các ví dụ:

Ví dụ 1:
Input: "Tôi quên mật khẩu và không đăng nhập được."
Output: account_access

Ví dụ 2:
Input: "Tôi muốn biết đơn hàng của mình đang ở đâu."
Output: delivery_status

Ví dụ 3:
Input: "Tôi muốn đổi sản phẩm vì chọn sai kích thước."
Output: return_exchange

Bây giờ phân loại:

Input:
"Tôi chưa nhận được hàng dù ứng dụng báo đã giao."

Chỉ trả về một nhãn phù hợp.$prompt$
  WHEN 'TESTER-STRUCTURED-REASONING' THEN $prompt$Bạn là trợ lý phân tích quyết định.

Một nhóm có ngân sách 15 triệu đồng để tổ chức workshop cho 30 người.

Có hai lựa chọn:

A. Phòng họp cao cấp:
- 12 triệu tiền phòng
- 5 triệu catering

B. Phòng họp tiêu chuẩn:
- 7 triệu tiền phòng
- 5 triệu catering

Hãy phân tích theo cấu trúc:

1. Dữ kiện
2. Kiểm tra ngân sách
3. So sánh hai lựa chọn
4. Kết luận

Không thêm giả định nếu đề bài không cung cấp.$prompt$
  WHEN 'TESTER-CONSTRAINTS-OUTPUT' THEN $prompt$Bạn là trợ lý tổng hợp cuộc họp.

Từ nội dung được cung cấp, hãy tạo đúng 3 bullet.

Yêu cầu:
- Mỗi bullet tối đa 20 từ.
- Chỉ sử dụng thông tin có trong nguồn.
- Không thêm nhận xét cá nhân.
- Bullet 1: Quyết định
- Bullet 2: Người phụ trách
- Bullet 3: Deadline

Đầu ra chỉ gồm 3 bullet, không thêm phần mở đầu hoặc kết luận.$prompt$
  WHEN 'TESTER-GROUNDED-PROMPTING' THEN $prompt$Bạn là trợ lý trả lời câu hỏi dựa trên tài liệu.

Chỉ sử dụng SOURCE bên dưới để trả lời.

SOURCE:
Promptify Tester Workshop diễn ra ngày 15/10.
Thời lượng workshop là 3 giờ.
Workshop dành cho nhân viên mới sử dụng Generative AI.

CÂU HỎI:
Workshop có tổ chức online không?

Quy tắc:
- Không sử dụng kiến thức ngoài SOURCE.
- Nếu SOURCE không chứa thông tin để trả lời, hãy trả lời:
  "Không đủ thông tin trong tài liệu được cung cấp."

Trả lời ngắn gọn.$prompt$
END,
updated_at = now()
WHERE lesson.lesson_key IN (
  'TESTER-ZERO-SHOT',
  'TESTER-ONE-SHOT',
  'TESTER-FEW-SHOT',
  'TESTER-STRUCTURED-REASONING',
  'TESTER-CONSTRAINTS-OUTPUT',
  'TESTER-GROUNDED-PROMPTING'
)
AND lesson.module_id IN (
  SELECT module.id
  FROM public.course_modules AS module
  WHERE module.course_id = '92000000-0000-4000-8000-000000000001'
);

COMMIT;
NOTIFY pgrst, 'reload schema';
