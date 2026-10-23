# BRD — Promptify (bản hiện trạng để giảng viên chỉnh sửa)

**Ngày lập:** 03/10/2026  
**Phạm vi đối chiếu:** mã nguồn nhánh `main` của `ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs`, cây Git `bf1d194d67524683776606095fe13fa338252c12`.  
**Trạng thái:** Bản nháp mô tả hệ thống hiện có; chưa phải đề xuất nâng cấp hay cam kết nghiệm thu.  
**Bản deploy:** https://promptify-wheat-seven.vercel.app/ — chưa kiểm chứng trực tiếp được phiên bản triển khai, nên các nhận định dưới đây chỉ xác nhận cho mã `main`.

## 1. Mục đích tài liệu

Tạo cơ sở để giảng viên rà soát sản phẩm Promptify hiện tại: ai đang dùng, họ làm được việc gì, luồng nghiệp vụ nào đã có trong mã, và những điểm cần thầy xác nhận trước khi định hướng nâng cấp. Đây là mô tả *as-is*, không tự đặt KPI, chính sách vận hành hay tính năng tương lai.

## 2. Bối cảnh và nhu cầu được thể hiện trong sản phẩm

Promptify hướng tới người học không chuyên kỹ thuật muốn thực hành viết prompt cho tình huống công việc. Trang công khai mô tả việc viết prompt theo tình huống, nhận phản hồi và cải thiện qua nhiều lần thử. Mã ứng dụng còn có khu vực giảng viên theo dõi lớp, học viên và nội dung khóa học. Đây là cách diễn giải mục đích từ giao diện và luồng hiện có, **chưa phải kết quả phỏng vấn stakeholder**. [Nguồn: LandingLoginScreen](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/auth/LandingLoginScreen.tsx), [App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx), [InstructorViewShell](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/InstructorViewShell.tsx).

## 3. Vai trò hiện có

| Vai trò trong dữ liệu | Khả năng thấy được trong mã | Giới hạn cách hiểu |
| --- | --- | --- |
| `learner` | Đăng nhập Google, chọn/tham gia lớp có quyền, xem lộ trình, thực hành bài học, chạy và đánh giá prompt, xem lịch sử và thư viện prompt. | Chỉ được vào không gian học khi có ghi danh hợp lệ; lớp công khai có thể tự ghi danh. |
| `instructor` | Vào khu vực giảng viên: dashboard, danh sách/chi tiết lớp, học viên, hoạt động; quản lý khóa học và nội dung; thêm/cập nhật/đưa học viên khỏi lớp. | Phạm vi dữ liệu thực tế còn phụ thuộc RLS và truy vấn Supabase. |
| `admin` | Giá trị vai trò tồn tại trong kiểu dữ liệu; `App.tsx` đưa `admin` vào cùng giao diện `INSTRUCTOR`. | Chưa thấy màn hình hay bộ quyền admin riêng trong luồng ứng dụng đã đọc. Không mô tả thành vai trò quản trị độc lập. |

[Nguồn: database types](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/types/database.ts), [App — phân vai](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx), [LearnerTableView](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/LearnerTableView.tsx).

## 4. Quy trình nghiệp vụ hiện có

### 4.1 Người học

1. Đăng nhập qua Google OAuth/Supabase; ứng dụng lấy vai trò từ `public.users.role`.
2. Nếu chưa có ghi danh, người học đến màn chọn lớp. Lớp `self_enroll` có thể tự ghi danh; lớp khác cần quyền truy cập hiện hữu.
3. Sau khi chọn lớp, người học xem trang chủ/lộ trình và mở bài được xuất bản. Nội dung ưu tiên tải từ cơ sở dữ liệu; mã có `LABS_DATA` làm fallback khi không tải được curriculum.
4. Trong bài học, người học xem lý thuyết, tình huống, mục tiêu, gợi ý và lời giải mẫu; soạn prompt, chạy AI hoặc chế độ mô phỏng được chọn rõ, nhận kết quả/đánh giá, so sánh phiên bản và tiếp tục sửa.
5. Lần thử và tiến độ bài học được ghi về Supabase bằng RPC khi cấu hình máy chủ hoạt động. Màn lịch sử riêng trong `App.tsx` nhận danh sách từ `localStorage` của trình duyệt; cần phân biệt hai nguồn dữ liệu này khi đánh giá tính liên tục giữa thiết bị.

[Nguồn: App](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/App.tsx), [LessonBriefPanel](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/lesson/LessonBriefPanel.tsx), [llmService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/llmService.ts), [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts).

### 4.2 Giảng viên / người có vai trò admin trong mã

1. Xem tổng quan lớp, số học viên, tiến độ và hoạt động dựa trên dữ liệu Supabase.
2. Mở lớp để xem tiến độ bài và danh sách học viên.
3. Thêm học viên bằng tên/email, thay đổi tên hoặc trạng thái ghi danh; thao tác “xóa khỏi lớp” đặt `enrollment.status = removed`, không xóa hồ sơ người dùng.
4. Tạo/sửa khóa học, chuyển trạng thái xuất bản/bản nháp, lưu trữ hoặc xóa theo logic hiện có; tạo/sửa/xóa chương và bài học, rubric và tài nguyên bài học.

[Nguồn: InstructorViewShell](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/InstructorViewShell.tsx), [CourseManagementModal](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/CourseManagementModal.tsx), [CourseCurriculumEditor](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/components/instructor/CourseCurriculumEditor.tsx), [dbService](https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs/blob/main/src/services/dbService.ts).

## 5. Phạm vi chức năng đã xác nhận từ mã

| Nhóm | Hiện trạng được xác nhận | Nguồn chính |
| --- | --- | --- |
| Đăng nhập và truy cập | Google OAuth qua Supabase; phân nhánh learner/instructor theo `public.users.role`; kiểm tra ghi danh trước khi mở khu vực học. | `LandingLoginScreen.tsx`, `App.tsx`, `dbService.ts` |
| Học theo lớp | Chọn lớp, lộ trình, tải bài xuất bản từ DB, hỗ trợ lớp tự ghi danh. | `App.tsx`, `ClassSelectionScreen.tsx`, `dbService.ts` |
| Thực hành prompt | Màn bài học hiện render `HybridView`; lý thuyết, đề bài, gợi ý, lời giải, soạn/chạy prompt. | `App.tsx`, `HybridView.tsx`, `LessonBriefPanel.tsx`, `PromptComposer.tsx` |
| AI và đánh giá | `/api/generate`, `/api/evaluate`; yêu cầu token, lớp hợp lệ; Gemini qua server; có chế độ mô phỏng do người dùng chọn. | `llmService.ts`, `api/*.ts`, `apiAuthorizationService.ts` |
| Kết quả và học tập | Ghi attempt cùng tiến độ qua RPC; giảng viên xem progress/attempts. | `dbService.ts`, `InstructorViewShell.tsx` |
| Thư viện/lịch sử | Tìm, lọc, copy, mở prompt từ thư viện; lịch sử trong trình duyệt có xuất Markdown. | `PromptLibraryView.tsx`, `PromptHistoryView.tsx`, `App.tsx` |
| Giảng viên | Dashboard, lớp, học viên, hoạt động, quản lý khóa học/curriculum. | `InstructorViewShell.tsx` và các component `instructor/` |

## 6. Ranh giới và điểm cần thầy xác nhận

- **Ưu tiên nghiệp vụ:** Mã chứng minh có chức năng; chưa chứng minh thứ tự ưu tiên, hiệu quả đào tạo hay KPI. Thầy xác nhận mục tiêu chính và tiêu chí thành công.
- **Phạm vi người dùng:** Sản phẩm dùng ngôn ngữ người học nghiệp vụ; chưa có bằng chứng để chốt tổ chức triển khai, số lượng lớp hay đối tượng bắt buộc.
- **Admin:** Có role `admin` trong DB nhưng dùng giao diện instructor. Thầy xác nhận liệu cần tách quyền quản trị ở phiên bản sau.
- **Deploy:** Link Vercel được cung cấp nhưng phiên bản đang phục vụ chưa đối chiếu được với commit `main`; cần xác nhận commit deploy trước khi gọi tài liệu này là mô tả production.
- **Lịch sử và tiến độ:** Cần thầy xác nhận kỳ vọng về việc xem lịch sử xuyên thiết bị, vì màn lịch sử hiện lấy dữ liệu trình duyệt còn attempt/progress đã có đường lưu server.
- **Curriculum:** Repo có kho 22 tài liệu Markdown và seed curriculum, nhưng không đồng nghĩa cả 22 module đều đang xuất bản cho mọi lớp. Số bài thực tế phụ thuộc dữ liệu khóa học/lớp.

## 7. Nhật ký sửa của giảng viên

| Mục cần sửa/xác nhận | Ý kiến của thầy | Quyết định/ngày |
| --- | --- | --- |
| Mục tiêu và đối tượng học |  |  |
| Vai trò và quyền admin |  |  |
| Phạm vi tính năng cần giữ/nâng cấp |  |  |
| Chỉ số đánh giá kết quả |  |  |
| Phiên bản deploy tương ứng |  |  |

## 8. Nguồn gốc và quy tắc đọc tài liệu

Nguồn chính là mã ở nhánh `main` tại thời điểm lập tài liệu. README và các handoff trong repo được dùng để hiểu ngữ cảnh, nhưng mọi nhận định chức năng ở trên ưu tiên đường chạy và component hiện tại. Ví dụ, README nhắc nhiều giao diện học, còn `App.tsx` hiện chỉ render `HybridView` trong bài học. Mọi điểm chưa quan sát hoặc chưa thể xác minh được để ở mục 6, không coi là yêu cầu đã duyệt.
