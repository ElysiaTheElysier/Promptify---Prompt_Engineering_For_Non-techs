# PRD — Promptify (đặc tả sản phẩm hiện trạng để giảng viên chỉnh sửa)

**Ngày lập:** 03/10/2026  
**Nguồn:** nhánh `main`, Git tree `bf1d194d67524683776606095fe13fa338252c12` của [repo Promptify](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs).  
**Cách dùng:** Các mục “hiện có” mô tả hành vi thể hiện trong mã, không phải backlog hay cam kết nâng cấp. Deploy Vercel chưa kiểm chứng trực tiếp.

## 1. Sản phẩm và người dùng

Ứng dụng web cho học viên thực hành kỹ năng viết prompt trong bài học theo lớp, với phản hồi AI và khu vực giảng viên quản lý nội dung/giám sát học tập. Trong mã có ba giá trị vai trò dữ liệu: `learner`, `instructor`, `admin`; giao diện ứng dụng gộp `admin` với instructor, không có sản phẩm admin độc lập đã xác nhận. [Nguồn: App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx), [database types](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/types/database.ts).

## 2. Luồng và yêu cầu chức năng hiện có

| ID | Người dùng | Hành vi hiện có trong mã | Bằng chứng |
| --- | --- | --- | --- |
| F01 | Khách | Xem landing page và bắt đầu đăng nhập Google OAuth. | [LandingLoginScreen](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/auth/LandingLoginScreen.tsx) |
| F02 | Hệ thống | Phân vai từ `public.users.role`; learner thiếu ghi danh được đưa đến chọn lớp, instructor/admin vào shell giảng viên. | [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx) |
| F03 | Learner | Xem lớp có quyền và lớp công khai; tự ghi danh vào lớp `self_enroll` khi chọn. | [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx), [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts) |
| F04 | Learner | Xem trang chủ/lộ trình, mở bài học; curriculum tải từ DB và có `LABS_DATA` fallback. | [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx), [curriculumAdapter](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/curriculumAdapter.ts) |
| F05 | Learner | Trong bài xem lý thuyết, bài tập, gợi ý, lời giải; hướng dẫn lần đầu có trạng thái hoàn tất lưu DB. | [LessonBriefPanel](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/lesson/LessonBriefPanel.tsx), [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx) |
| F06 | Learner | Soạn prompt, xem phân tích cấu trúc/gợi ý sửa, chạy prompt qua `/api/generate` hoặc mô phỏng khi chọn chế độ đó. | [PromptComposer](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/prompt/PromptComposer.tsx), [llmService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/llmService.ts) |
| F07 | Learner | Chấm kết quả qua `/api/evaluate`, so sánh phiên bản, lưu attempt và tiến độ sau lần chạy được xác nhận. | [llmService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/llmService.ts), [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts), [HybridView](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/hybrid/HybridView.tsx) |
| F08 | Learner | Xem/tìm/lọc/copy prompt thư viện và mở vào bài; xem lịch sử trình duyệt, copy và xuất Markdown. | [PromptLibraryView](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/library/PromptLibraryView.tsx), [PromptHistoryView](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/history/PromptHistoryView.tsx) |
| F09 | Instructor/admin | Xem dashboard, danh sách và chi tiết lớp, tiến độ, học viên, hoạt động. | [InstructorViewShell](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/InstructorViewShell.tsx) |
| F10 | Instructor/admin | Thêm học viên theo email, sửa tên/trạng thái; đưa khỏi lớp bằng trạng thái `removed`. | [AddLearnerModal](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/AddLearnerModal.tsx), [LearnerTableView](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/LearnerTableView.tsx), [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts) |
| F11 | Instructor/admin | Tạo/sửa, xuất bản/đưa về nháp, lưu trữ/xóa khóa học; quản lý chương, bài, rubric, tài nguyên bài. | [CourseManagementModal](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/CourseManagementModal.tsx), [CourseCurriculumEditor](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/CourseCurriculumEditor.tsx) |

## 3. Quy tắc nghiệp vụ thể hiện trong mã

- `learner` không được vào dashboard/bài học khi chưa có ghi danh hoạt động. Lớp công khai `self_enroll` có lối tự ghi danh. [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx), [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts).
- Endpoint AI yêu cầu Bearer token, `classId` và quyền xem lớp theo RLS; với lesson UUID, kiểm tra lesson thuộc course của lớp. [apiAuthorizationService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/apiAuthorizationService.ts).
- Chế độ mô phỏng chỉ chạy khi `apiConfig.mode === 'simulated'`; chế độ còn lại gọi endpoint server. Phản hồi “stream” trên UI được chia từ kết quả đã nhận, không nên mô tả là streaming trực tiếp từ model. [llmService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/llmService.ts).
- Khi dùng Supabase, ghi attempt và progress bằng RPC `record_prompt_attempt_and_progress`; màn lịch sử riêng vẫn đọc state khởi tạo từ `localStorage`. [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts), [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx).
- “Xóa học viên khỏi lớp” chỉ chuyển enrollment sang `removed`, không xóa user/learner. [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts).
- Nội dung học viên nhận phụ thuộc bài `published` của course/lớp; số module Markdown trong repo không phải số bài đang khả dụng cho mọi lớp. [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts), [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx).

## 4. Giao diện và trạng thái dữ liệu

**Học viên:** landing → chọn lớp (nếu cần) → trang chủ/lộ trình → bài học. Bài học hiện render `HybridView`; thư viện và lịch sử là các màn riêng. Các component Notebook/Playground vẫn có trong repo nhưng `App.tsx` hiện không render chúng như màn bài học độc lập. [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx).

**Giảng viên:** dashboard → danh sách lớp → chi tiết lớp; các mục học viên và hoạt động có trên điều hướng. Tại chi tiết lớp có cửa vào quản lý khóa học và thêm học viên. [InstructorViewShell](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/InstructorViewShell.tsx), [ClassDetailView](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/ClassDetailView.tsx).

**Nguồn dữ liệu:** frontend React 19/TypeScript/Vite; Supabase Auth/PostgreSQL qua client service; API server `/api/generate` và `/api/evaluate`; Gemini key đọc ở server. Repo còn local fallback dùng cho test/thiếu cấu hình, nhưng đường đăng nhập ứng dụng yêu cầu phiên Supabase. Đây là sơ đồ các thành phần tìm thấy trong mã, **không khẳng định cấu hình hạ tầng deploy**. [package.json](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/package.json), [supabaseClient](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/supabaseClient.ts), [apiServerService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/apiServerService.ts).

## 5. Những điều chưa xác nhận hoặc không suy diễn

| Vấn đề | Trạng thái tài liệu |
| --- | --- |
| Commit thực sự đang deploy trên Vercel | Chưa xác minh; cần đối chiếu deployment metadata hoặc trực tiếp kiểm thử. |
| Quyền admin khác instructor | Chưa thấy luồng giao diện riêng; cần thầy quyết định nếu muốn thêm. |
| Tất cả 22 tài liệu giáo trình đều đang có trong ứng dụng | Không kết luận; bài khả dụng do dữ liệu published của khóa học quyết định. |
| KPI, số lượng người dùng, SLA, hiệu quả học tập | Không có bằng chứng trong mã; để thầy bổ sung. |
| Lịch sử chạy prompt đồng bộ xuyên thiết bị | Chưa kết luận; màn lịch sử riêng lấy dữ liệu trình duyệt, còn attempt/progress có lưu server. |
| Chính sách dữ liệu, thời hạn lưu trữ, phân quyền tổ chức | Cần xác nhận ngoài mã và cấu hình vận hành. |

## 6. Câu hỏi chỉnh sửa cho giảng viên

1. Mục tiêu ưu tiên của lần nâng cấp là chất lượng học, công cụ giám sát lớp, hay quản trị nội dung? Xin ghi thứ tự và tiêu chí đo.
2. `admin` có cần bộ quyền riêng so với `instructor` không? Nếu có, các thao tác nào chỉ admin được làm?
3. Lịch sử thực hành cần xem lại trên thiết bị khác hay chỉ trong trình duyệt hiện dùng?
4. Bài học nào phải công bố ở phiên bản được đánh giá, cho lớp nào? Có yêu cầu phê duyệt trước xuất bản không?
5. Bản deploy nào sẽ là baseline nghiệm thu (URL, commit, ngày triển khai)?

## 7. Ghi chú thay đổi

| Ngày | Người sửa | Nội dung/Quyết định |
| --- | --- | --- |
| 03/10/2026 | Bản nháp từ mã `main` | Ghi hiện trạng và điểm cần xác nhận; chưa định nghĩa scope nâng cấp. |
