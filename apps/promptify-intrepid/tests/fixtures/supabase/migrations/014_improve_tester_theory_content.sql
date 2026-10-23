-- Make the six public Tester lessons easier for first-time learners to scan.
-- Keep the explanation for every lesson in the same short teaching pattern:
-- "Là gì?" -> "Ví dụ" -> "Khi nào dùng?".
BEGIN;

WITH theory_content(lesson_key, concept_title, concept_content) AS (
  VALUES
  (
    'TESTER-ZERO-SHOT',
    'Zero-shot: không cần ví dụ mẫu',
    $theory$### Là gì?
Zero-shot là cách yêu cầu AI làm một việc mà **không đưa ví dụ mẫu**. Prompt vẫn cần nói rõ nhiệm vụ, bối cảnh và dạng kết quả.

### Ví dụ
> Viết email nhắc nhóm nộp báo cáo trước 17h. Giọng lịch sự, tối đa 100 từ.

### Khi nào dùng?
Dùng cho việc quen thuộc, đơn giản như viết email, tóm tắt hoặc tạo checklist. Nếu đầu ra chưa đúng ý, hãy chuyển sang One-shot.$theory$
  ),
  (
    'TESTER-ONE-SHOT',
    'One-shot: học từ một ví dụ',
    $theory$### Là gì?
One-shot là đưa cho AI **một ví dụ Input → Output**, rồi yêu cầu xử lý dữ liệu mới theo cùng cách.

### Ví dụ
> “Máy in tầng 3 bị hỏng” → `[IT] Máy in tầng 3 không hoạt động`
>
> “Không đăng nhập được VPN” → ?

### Khi nào dùng?
Dùng khi bạn muốn AI bắt chước đúng cách viết, nhãn phân loại hoặc cấu trúc đầu ra mà mô tả bằng lời vẫn chưa đủ rõ.$theory$
  ),
  (
    'TESTER-FEW-SHOT',
    'Few-shot: học từ vài ví dụ',
    $theory$### Là gì?
Few-shot giống One-shot nhưng dùng **vài ví dụ** để AI nhận ra mẫu và ranh giới giữa các trường hợp.

### Ví dụ
> “Quên mật khẩu” → Tài khoản
>
> “Đơn hàng chưa tới” → Giao hàng
>
> “Muốn đổi size” → Đổi trả
>
> “Tôi chưa nhận được hàng” → ?

### Khi nào dùng?
Dùng khi một ví dụ chưa đủ, nhất là lúc phân loại nhiều nhóm hoặc xử lý các trường hợp dễ nhầm.$theory$
  ),
  (
    'TESTER-STRUCTURED-REASONING',
    'Reasoning: phân tích theo bước kiểm tra được',
    $theory$### Là gì?
Reasoning có cấu trúc là yêu cầu AI trình bày **các bước kiểm tra có thể quan sát**, không yêu cầu tiết lộ suy nghĩ nội bộ.

### Ví dụ
> Trả lời theo 4 mục: Dữ kiện → So sánh → Kiểm tra điều kiện → Kết luận.

### Khi nào dùng?
Dùng cho bài toán có nhiều điều kiện, cần so sánh hoặc cần người đọc kiểm tra căn cứ dẫn đến kết luận.$theory$
  ),
  (
    'TESTER-CONSTRAINTS-OUTPUT',
    'Constraints: đặt giới hạn rõ ràng',
    $theory$### Là gì?
Constraints là các **giới hạn cụ thể** buộc câu trả lời đúng độ dài, định dạng và phạm vi.

### Ví dụ
> Viết đúng 3 bullet. Mỗi bullet tối đa 20 từ. Không thêm thông tin ngoài dữ liệu đã cho.

### Khi nào dùng?
Dùng khi kết quả phải đưa thẳng vào email, biểu mẫu, báo cáo hoặc một quy trình có quy tắc rõ ràng.$theory$
  ),
  (
    'TESTER-GROUNDED-PROMPTING',
    'Grounding: chỉ bám nguồn được cung cấp',
    $theory$### Là gì?
Grounding là yêu cầu AI **chỉ trả lời từ nguồn được cung cấp** và thừa nhận khi nguồn thiếu dữ kiện.

### Ví dụ
> Chỉ dùng tài liệu bên dưới. Nếu không tìm thấy câu trả lời, hãy nói: “Không đủ thông tin.”

### Khi nào dùng?
Dùng với quy định, tài liệu công ty, báo cáo hoặc nội dung cần độ chính xác cao và không được phép bịa thêm.$theory$
  )
)
UPDATE public.lessons AS lesson
SET concept_title = theory.concept_title,
    concept_content = theory.concept_content,
    updated_at = now()
FROM theory_content AS theory
WHERE lesson.lesson_key = theory.lesson_key
  AND lesson.module_id IN (
    SELECT module.id
    FROM public.course_modules AS module
    WHERE module.course_id = '92000000-0000-4000-8000-000000000001'
  );

COMMIT;
NOTIFY pgrst, 'reload schema';
