from pathlib import Path
from build_promptify_pm_docs import make_doc, h, p, bullets, nums, table, SHA, ROOT
from docx.shared import Inches, Pt

OUT = ROOT / 'outputs' / 'document-drafts' / 'BRD_Promptify_theo_mau_2026-10-03.docx'

d = make_doc('Tài liệu yêu cầu nghiệp vụ Promptify', 'BRD theo cấu trúc mẫu do giảng viên cung cấp')
d.sections[0].top_margin = Inches(.52)
d.sections[0].bottom_margin = Inches(.5)
d.styles['Normal'].font.size = Pt(9.6)
d.styles['Normal'].paragraph_format.space_after = Pt(3)
p(d, 'Bản này mô tả nghiệp vụ của Promptify theo mã nguồn main tại commit ' + SHA[:12] + '. Mục đích là để chủ dự án và giảng viên chỉnh sửa, chốt phạm vi và chỉ số. Những mục trong bản mẫu chưa được triển khai hoặc chưa có dữ liệu đo sẽ được ghi rõ, không chuyển thành lời khẳng định về sản phẩm.')

h(d, '1 Tóm tắt điều hành')
p(d, 'Vấn đề cốt lõi. Người học khối nghiệp vụ cần thực hành viết prompt gắn với công việc và nhận phản hồi sau từng lần thử. Đây là nhu cầu thể hiện trong sản phẩm; chưa có khảo sát định lượng về quy mô vấn đề.')
p(d, 'Giải pháp hiện tại. Promptify có đăng nhập Google qua Supabase, lớp học và lộ trình, bài học HybridView, chạy/đánh giá prompt, lưu lần thử/tiến độ và khu vực giảng viên quản lý nội dung, học viên, hoạt động lớp.')
p(d, 'Mục tiêu chiến lược cần xác nhận. Người học cải thiện prompt qua vòng lặp viết → chạy → xem output/đánh giá → sửa; giảng viên quan sát tiến độ theo lớp. Repo không cung cấp baseline hay chỉ tiêu được duyệt.')

h(d, '2 Mục tiêu kinh doanh và giá trị cốt lõi')
p(d, 'Mục tiêu nghiệp vụ mà luồng hiện tại hỗ trợ:')
nums(d, [
    'Tổ chức việc học theo course, class, module và lesson để có thể dùng một khóa học cho nhiều lớp.',
    'Cho học viên thực hành prompt trên tình huống, nhận output và đánh giá để sửa qua nhiều lần thử.',
    'Cho giảng viên quản lý nội dung, ghi danh học viên và xem tiến độ/hoạt động của lớp.'
])
p(d, 'Giá trị cốt lõi. Học viên thực hành và nhận phản hồi trong cùng bài; giảng viên quan sát lớp và chỉnh sửa curriculum. Hiệu quả đào tạo cần được đo riêng.')

h(d, '3 Chỉ số đo lường hiệu quả')
p(d, 'Mã nguồn có dữ liệu attempt và lesson_progress để tính một số chỉ số vận hành, nhưng không có baseline và target được phê duyệt. Các ô dưới đây để PM/giảng viên điền sau khi chốt cohort và cách đo.')
table(d, ['Chỉ số đề nghị', 'Baseline', 'Mục tiêu', 'Nguồn đo và định nghĩa cần chốt'], [
    ['Tỷ lệ hoàn thành bài/lớp', 'Chưa đo', '[Điền]', 'lesson_progress.status theo learner, class, lesson; cần chốt mẫu số và điều kiện hoàn thành'],
    ['Số lần thực hành mỗi bài', 'Chưa đo', '[Điền]', 'prompt_attempts hoặc lesson_progress.attempts_count; cần chốt kỳ đo'],
    ['Điểm đánh giá bài', 'Chưa đo', '[Điền]', 'lesson_progress.best_score; thang 0–10, cần chốt cách tổng hợp theo lớp'],
    ['Thời gian giảng viên tạo/điều chỉnh nội dung', 'Chưa đo', '[Điền]', 'Chưa thấy telemetry thời gian thao tác; cần đo thủ công hoặc bổ sung đo lường']
], [1.55, .8, .7, 3.8])

h(d, '4 Bên liên quan và người dùng mục tiêu')
table(d, ['Vai trò', 'Trách nhiệm trong hệ thống hiện tại', 'Điều họ cần từ sản phẩm'], [
    ['Học viên', 'Đăng nhập, chọn lớp có quyền, học bài, chạy/sửa prompt', 'Bài học dễ theo dõi, thấy output và phản hồi cho từng lần thử'],
    ['Giảng viên', 'Quản lý course/curriculum, học viên và theo dõi lớp', 'Biết học viên nào đã tham gia, tiến độ và hoạt động theo lớp'],
    ['Admin trong dữ liệu', 'Role admin đang vào cùng giao diện instructor', 'Cần chủ dự án quyết định có tách quyền và quy trình riêng không'],
    ['Chủ dự án/kỹ thuật', 'Xác nhận scope, môi trường triển khai, dữ liệu và API', 'Baseline deploy rõ ràng, chi phí AI và quyền truy cập được kiểm soát']
], [1.25, 2.7, 2.9])

h(d, '5 Phạm vi dự án')
d.paragraphs[-1].paragraph_format.page_break_before = True
p(d, 'Bảng này phân biệt năng lực có trong mã main với nội dung của mẫu cũ chưa chứng minh được. Đây không phải thứ tự ưu tiên phát triển phiên bản mới.')
table(d, ['Năng lực', 'Trạng thái theo mã main', 'Lý do / ranh giới'], [
    ['Google OAuth và phân vai', 'Có', 'Supabase Auth; App phân luồng learner và instructor/admin theo public.users.role'],
    ['Course, class và ghi danh', 'Có', 'Class gắn course/client; learner tham gia qua enrollment; self_enroll cho lớp công khai'],
    ['Học bài và thực hành prompt', 'Có', 'Bài học hiện render HybridView; có lý thuyết, đề bài, gợi ý, lời giải, prompt và output'],
    ['AI đánh giá và tiến độ', 'Có', 'Hai endpoint generate/evaluate; attempt và lesson_progress lưu server khi Supabase hoạt động'],
    ['Giảng viên quản lý nội dung/lớp', 'Có', 'Dashboard, học viên, activity, quản lý course/module/lesson'],
    ['Google Sheets roster sync / Redis', 'Chưa thấy trong mã main', 'Có trong BRD mẫu nhưng không được coi là hiện trạng'],
    ['Admin riêng / KPI cố định', 'Chưa xác lập', 'Role admin có trong DB; giao diện dùng chung instructor; chưa có baseline KPI']
], [1.75, 1.3, 3.8])

h(d, '6 Quy tắc nghiệp vụ và luồng công việc tổng quát')
p(d, 'Quy tắc nghiệp vụ hiện có:')
bullets(d, [
    'Quyền học: learner cần enrollment hợp lệ để vào dashboard/bài; class self_enroll có lối tự ghi danh.',
    'Quyền nội dung: course/module/lesson có trạng thái xuất bản; RLS kiểm soát truy cập theo role và enrollment.',
    'Quyền AI: API yêu cầu Bearer token, classId và kiểm tra lesson thuộc course của class.',
    'Đưa khỏi lớp: enrollment được đổi sang removed; user và learner không bị xóa.',
    'Tiến độ: prompt_attempts ghi từng lần thử; lesson_progress là trạng thái hiện tại theo learner/class/lesson.'
])
p(d, 'Luồng học viên:')
nums(d, [
    'Đăng nhập Google; hệ thống lấy hồ sơ và role từ Supabase.',
    'Hệ thống lấy lớp được ghi danh; nếu chưa có, người học chọn lớp công khai để tự ghi danh hoặc chờ giảng viên thêm vào lớp.',
    'Mở lộ trình và bài published; đọc nội dung, viết prompt trong HybridView.',
    'Chạy prompt, xem output và điểm đánh giá; sửa prompt, chạy lại và xem tiến độ.'
])
p(d, 'Luồng giảng viên: đăng nhập → dashboard → chọn lớp → xem học viên/hoạt động/tiến độ → thêm hoặc cập nhật ghi danh; vào quản lý course để sửa và xuất bản nội dung.')

h(d, '7 Rủi ro, giả định và phụ thuộc')
table(d, ['Loại', 'Nội dung cần quản lý'], [
    ['Rủi ro', 'Chi phí và độ sẵn sàng của OpenAI/Gemini API khi nhiều học viên chạy prompt; chưa có ngân sách/token cap được xác nhận.'],
    ['Rủi ro', 'Màn lịch sử riêng dùng localStorage còn attempt/progress lưu server; kỳ vọng đồng bộ đa thiết bị cần làm rõ.'],
    ['Rủi ro', 'Commit đang deploy trên Vercel chưa đối chiếu với main; có thể lệch hành vi nếu chưa xác nhận.'],
    ['Giả định cần kiểm tra', 'Người học có tài khoản Google và được ghi danh hoặc chọn lớp self_enroll.'],
    ['Phụ thuộc kỹ thuật', 'Supabase Auth/PostgreSQL/RLS; OpenAI hoặc Gemini API key ở server; Vercel URL do nhóm cung cấp.']
], [1.45, 5.4])

h(d, '8 Đầu vào cho PRD và quyết định cần chốt')
table(d, ['Hạng mục bàn giao', 'Thông tin đã xác minh / chỗ cần quyết định'], [
    ['Luồng và màn hình', 'Landing → OAuth → lớp → lộ trình → HybridView; instructor dashboard → lớp → học viên/hoạt động.'],
    ['Dữ liệu và công nghệ', 'users/courses/classes/enrollments/lessons/attempts/progress; React, TypeScript, Vite, Supabase, OpenAI hoặc Gemini.'],
    ['Quyền và quyết định', 'RLS, kiểm tra token/class/lesson; chốt admin riêng, KPI, course nghiệm thu, lịch sử đa thiết bị và commit deploy.']
], [1.55, 5.3])
d.core_properties.comments = 'Nguồn: GitHub ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs, main ' + SHA + '; App.tsx, dbService.ts, schema.sql, migrations 004/006/016.'

OUT.parent.mkdir(parents=True, exist_ok=True)
d.save(OUT)
print(OUT)
