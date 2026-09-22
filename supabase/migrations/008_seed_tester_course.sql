-- Reproducible production-loop fixture. This migration never enrolls users.
BEGIN;

INSERT INTO public.clients (id, name, industry)
VALUES ('91000000-0000-4000-8000-000000000001', 'Promptify Internal', 'Education / Testing')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, industry = EXCLUDED.industry;

INSERT INTO public.courses (id, title, description, status, created_by, slug, publication_status, version, published_at)
VALUES (
  '92000000-0000-4000-8000-000000000001',
  'Prompt Engineering Fundamentals — Tester',
  'Khóa kiểm thử end-to-end cho prompting nền tảng, Gemini, AI Judge và prompt attempts.',
  'active', NULL, 'prompt-engineering-fundamentals-tester', 'published', 1, now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, status = 'active',
  slug = EXCLUDED.slug, publication_status = 'published', published_at = COALESCE(public.courses.published_at, now());

INSERT INTO public.classes (id, class_code, course_id, client_id, department, start_date, end_date, status)
VALUES (
  '93000000-0000-4000-8000-000000000001', 'TESTER-PE-001',
  '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001',
  'Product Testing', now() - interval '1 day', now() + interval '365 days', 'active'
)
ON CONFLICT (id) DO UPDATE SET
  class_code = EXCLUDED.class_code, course_id = EXCLUDED.course_id, client_id = EXCLUDED.client_id,
  department = EXCLUDED.department, end_date = EXCLUDED.end_date, status = 'active';

INSERT INTO public.course_modules (id, course_id, title, description, position, status) VALUES
  ('94000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'Prompting Foundations', 'Zero-shot, one-shot và few-shot.', 1, 'published'),
  ('94000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', 'Reasoning & Reliable Outputs', 'Reasoning có thể kiểm tra, constraints và grounding.', 2, 'published')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position, status = 'published';

INSERT INTO public.lessons (
  id, module_id, lesson_key, title, badge, focus_skill, scenario, task_goal,
  concept_title, concept_content, system_instruction, starter_prompt, baseline_prompt,
  improved_prompt, sample_input_context, prompt_placeholder, expected_output_format,
  hints, focus_components, position, status
) VALUES
(
  '95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'TESTER-ZERO-SHOT',
  'Zero-shot Prompting', 'Lab 1 · Zero-shot', 'Task · Context · Output Format',
  'Bạn cần nhờ AI soạn email xác nhận lịch họp dự án dựa trên thông tin được cung cấp.',
  'Tự viết prompt nêu rõ nhiệm vụ, bối cảnh và định dạng email ngắn.',
  'Zero-shot rõ mục tiêu', 'Không cần ví dụ mẫu nếu task, context và output format đủ rõ.',
  'Chỉ sử dụng thông tin người học cung cấp; không tự thêm tên, ngày hoặc cam kết.', NULL,
  'Viết email giúp tôi.', 'Hãy xác định người nhận, mục đích, dữ kiện và cấu trúc email trước khi yêu cầu AI soạn.',
  'Cuộc họp dự án Orion: 09:00 thứ Sáu, phòng A3; người nhận là nhóm triển khai; cần xác nhận tham dự trước 17:00 thứ Năm.',
  'Hãy tự viết prompt để tạo email...', 'Tiêu đề và phần thân tối đa 120 từ.',
  '["Nêu đủ dữ kiện nguồn", "Yêu cầu rõ độ dài và cấu trúc"]'::jsonb, '["task","context","output_format"]'::jsonb, 1, 'published'
),
(
  '95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000001', 'TESTER-ONE-SHOT',
  'One-shot Prompting', 'Lab 2 · One-shot', 'Example · Task · Output Format',
  'Bạn có một mẫu chuyển ghi chú thô thành bản cập nhật công việc và cần xử lý input mới cùng pattern.',
  'Viết prompt chứa đúng một input/output mẫu và yêu cầu xử lý dữ liệu mới.',
  'Một ví dụ để truyền pattern', 'One-shot giúp model bắt cấu trúc đầu ra khi mô tả bằng lời chưa đủ.',
  'Giữ nguyên dữ kiện; không suy diễn trạng thái công việc.', NULL, 'Hãy viết lại ghi chú này.',
  'Cung cấp một cặp Input → Output ngắn, sau đó phân tách rõ input mới.',
  'Mẫu — Input: "API xong, chờ QA thứ Ba". Output: "Hạng mục: API | Trạng thái: Hoàn tất phát triển | Bước tiếp theo: QA vào thứ Ba". Input mới: "UI dashboard 80%, review sáng mai".',
  'Viết prompt có một ví dụ...', 'Một dòng gồm Hạng mục | Trạng thái | Bước tiếp theo.',
  '["Đánh dấu rõ phần mẫu", "Không trả lời thay input mới trong prompt"]'::jsonb, '["example","task","output_format"]'::jsonb, 2, 'published'
),
(
  '95000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000001', 'TESTER-FEW-SHOT',
  'Few-shot Prompting', 'Lab 3 · Few-shot', 'Examples · Pattern · Constraint',
  'Bạn cần phân loại phản hồi khách hàng theo pattern thể hiện trong ba ví dụ ngắn.',
  'Viết prompt dùng 2–3 ví dụ để phân loại input mới nhất quán.',
  'Nhiều ví dụ củng cố pattern', 'Few-shot làm rõ ranh giới giữa các nhãn tốt hơn mô tả chung.',
  'Chỉ dùng ba nhãn Tích cực, Trung tính, Tiêu cực.', NULL, 'Phân loại phản hồi.',
  'Tách từng ví dụ, giữ output nhất quán, và cấm tạo nhãn mới.',
  'Ví dụ: "Rất dễ dùng" → Tích cực; "Tạm ổn" → Trung tính; "Liên tục báo lỗi" → Tiêu cực. Input mới: "Chức năng tốt nhưng tải hơi chậm".',
  'Viết prompt với 2–3 ví dụ...', 'Một nhãn và một câu giải thích tối đa 15 từ.',
  '["Dùng đủ ba nhãn", "Nêu constraint không tạo nhãn mới"]'::jsonb, '["example","task","constraint"]'::jsonb, 3, 'published'
),
(
  '95000000-0000-4000-8000-000000000004', '94000000-0000-4000-8000-000000000002', 'TESTER-STRUCTURED-REASONING',
  'Structured Reasoning', 'Lab 4 · Reasoning', 'Task · Evidence · Output Format',
  'Bạn cần so sánh hai phương án triển khai từ các dữ kiện ngắn và đưa ra kết luận có thể kiểm tra.',
  'Yêu cầu AI trình bày dữ kiện, phân tích, kiểm tra và kết luận; không yêu cầu chain-of-thought bí mật.',
  'Reasoning có thể kiểm tra', 'Yêu cầu các bước và assumptions hiển thị được, không yêu cầu suy nghĩ nội bộ của model.',
  'Chỉ trình bày lập luận tóm tắt có thể kiểm chứng; không tiết lộ chain-of-thought nội bộ.', NULL, 'Hãy nghĩ kỹ và chọn.',
  'Yêu cầu bốn mục: Dữ kiện, Assumptions, Kiểm tra, Kết luận.',
  'Phương án A: 2 tuần, 4 người, chi phí 80 triệu. Phương án B: 3 tuần, 2 người, chi phí 55 triệu. Ưu tiên ngân sách nhưng hạn chót là 4 tuần.',
  'Viết prompt yêu cầu phân tích có cấu trúc...', 'Bốn mục đánh số; kết luận tối đa 3 câu.',
  '["Không yêu cầu hidden chain-of-thought", "Yêu cầu assumptions rõ ràng"]'::jsonb, '["task","grounding","output_format"]'::jsonb, 1, 'published'
),
(
  '95000000-0000-4000-8000-000000000005', '94000000-0000-4000-8000-000000000002', 'TESTER-CONSTRAINTS-OUTPUT',
  'Constraints & Structured Output', 'Lab 5 · Constraints', 'Constraints · Output Format · Task',
  'Bạn cần tạo bản tóm tắt phát hành tuân thủ giới hạn độ dài và schema chặt chẽ.',
  'Viết prompt ép đúng ba bullet, tối đa 60 từ và không thêm thông tin ngoài nguồn.',
  'Constraints quyết định chất lượng', 'Ràng buộc đo được và schema cụ thể giúp output nhất quán.',
  'Không bổ sung dữ kiện không có trong nguồn.', NULL, 'Tóm tắt nội dung.',
  'Nêu giới hạn từ, số bullet và negative constraint một cách kiểm tra được.',
  'Release 2.4: thêm xuất CSV, sửa lỗi timeout khi tải báo cáo, triển khai ngày 30/09; chưa có thông tin về mobile.',
  'Viết prompt với constraint rõ ràng...', 'Đúng 3 bullet Markdown, tổng tối đa 60 từ.',
  '["Mọi constraint phải đo được", "Cấm suy diễn về mobile"]'::jsonb, '["constraint","output_format","task"]'::jsonb, 2, 'published'
),
(
  '95000000-0000-4000-8000-000000000006', '94000000-0000-4000-8000-000000000002', 'TESTER-GROUNDED-PROMPTING',
  'Grounded Prompting', 'Lab 6 · Grounding', 'Context · Evidence · Task',
  'Bạn trả lời câu hỏi chính sách chỉ dựa trên đoạn nguồn ngắn được cung cấp.',
  'Viết prompt yêu cầu trích evidence và nói thiếu thông tin khi source không đủ.',
  'Grounding giảm hallucination', 'Giới hạn nguồn và quy tắc insufficient giúp tránh bịa fact.',
  'Chỉ trả lời từ SOURCE; nếu không đủ bằng chứng phải nói "Không đủ thông tin trong nguồn".', NULL, 'Hãy trả lời câu hỏi.',
  'Phân định SOURCE/QUESTION và yêu cầu dẫn lại evidence ngắn.',
  'SOURCE: Nhân viên được làm việc từ xa tối đa 2 ngày mỗi tuần sau khi quản lý trực tiếp phê duyệt. Chính sách không đề cập làm việc từ nước ngoài. QUESTION: Tôi có thể làm từ nước ngoài 10 ngày không?',
  'Viết prompt grounding theo source...', 'Kết luận; Bằng chứng; Thông tin còn thiếu.',
  '["Cấm dùng kiến thức ngoài source", "Có nhánh insufficient rõ ràng"]'::jsonb, '["context","grounding","task"]'::jsonb, 3, 'published'
)
ON CONFLICT (id) DO UPDATE SET
  lesson_key=EXCLUDED.lesson_key, title=EXCLUDED.title, badge=EXCLUDED.badge, focus_skill=EXCLUDED.focus_skill,
  scenario=EXCLUDED.scenario, task_goal=EXCLUDED.task_goal, concept_title=EXCLUDED.concept_title,
  concept_content=EXCLUDED.concept_content, system_instruction=EXCLUDED.system_instruction,
  starter_prompt=EXCLUDED.starter_prompt, baseline_prompt=EXCLUDED.baseline_prompt,
  improved_prompt=EXCLUDED.improved_prompt, sample_input_context=EXCLUDED.sample_input_context,
  prompt_placeholder=EXCLUDED.prompt_placeholder, expected_output_format=EXCLUDED.expected_output_format,
  hints=EXCLUDED.hints, focus_components=EXCLUDED.focus_components, position=EXCLUDED.position, status='published';

WITH lesson_special(lesson_id, criterion_key, label, description) AS (VALUES
  ('95000000-0000-4000-8000-000000000001'::uuid, 'zero_shot_clarity', 'Zero-shot Clarity', 'Task, context và format đủ rõ mà không cần ví dụ.'),
  ('95000000-0000-4000-8000-000000000002'::uuid, 'example_usage', 'Example Usage', 'Ví dụ duy nhất truyền đúng pattern cho input mới.'),
  ('95000000-0000-4000-8000-000000000003'::uuid, 'pattern_consistency', 'Pattern Consistency', 'Các examples và output mới tuân theo cùng nhãn/pattern.'),
  ('95000000-0000-4000-8000-000000000004'::uuid, 'verifiable_reasoning', 'Verifiable Reasoning', 'Có dữ kiện, assumptions, kiểm tra và kết luận; không yêu cầu hidden CoT.'),
  ('95000000-0000-4000-8000-000000000005'::uuid, 'constraint_precision', 'Constraint Precision', 'Tuân thủ số bullet, giới hạn từ và negative constraint.'),
  ('95000000-0000-4000-8000-000000000006'::uuid, 'groundedness', 'Groundedness', 'Không thêm fact ngoài source và báo thiếu evidence đúng lúc.')
), criteria AS (
  SELECT lesson_id, criterion_key, label, description, 20::numeric max_score, 1 position FROM lesson_special
  UNION ALL SELECT lesson_id, 'task_completion', 'Task Completion', 'Hoàn thành đúng nhiệm vụ của lesson.', 20, 2 FROM lesson_special
  UNION ALL SELECT lesson_id, 'context_usage', 'Context Usage', 'Sử dụng chính xác dữ liệu đầu vào được cung cấp.', 20, 3 FROM lesson_special
  UNION ALL SELECT lesson_id, 'format_adherence', 'Format Adherence', 'Đầu ra tuân thủ định dạng yêu cầu.', 20, 4 FROM lesson_special
  UNION ALL SELECT lesson_id, 'business_usability', 'Business Usability', 'Kết quả rõ ràng và dùng được trong thực tế.', 20, 5 FROM lesson_special
)
INSERT INTO public.lesson_rubric_criteria (lesson_id, criterion_key, label, description, max_score, position)
SELECT lesson_id, criterion_key, label, description, max_score, position FROM criteria
ON CONFLICT (lesson_id, criterion_key) DO UPDATE SET
  label=EXCLUDED.label, description=EXCLUDED.description, max_score=EXCLUDED.max_score, position=EXCLUDED.position;

INSERT INTO public.lesson_resources (lesson_id, resource_type, title, content, position)
SELECT id, 'data', 'Dữ liệu bài tập', sample_input_context, 1
FROM public.lessons WHERE id BETWEEN '95000000-0000-4000-8000-000000000001' AND '95000000-0000-4000-8000-000000000006'
ON CONFLICT (lesson_id, position) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, resource_type=EXCLUDED.resource_type;

COMMIT;
NOTIFY pgrst, 'reload schema';
