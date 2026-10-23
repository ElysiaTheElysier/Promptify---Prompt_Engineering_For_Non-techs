# As-Is Feature Inventory

> Audit ngày 2026-10-05 · local `main` · commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.

## Phương pháp phân loại

**Real**: có đường thực thi chức năng thật trong code hiện tại (không khẳng định production đã chạy). **Partial**: có một phần thực thi hoặc kết nối thiếu/giới hạn lớn. **Mock**: output/demo/toast dựng sẵn; hàng legacy ghi rõ không reachable. Đây là các đơn vị capability audit, không số tickets/product features được ký nghiệm thu. Một feature local heuristic vẫn Real nếu đúng chức năng rule-based; tên “AI” không biến nó thành LLM.

Tổng 33 capability: **21 Real / 9 Partial / 3 Mock**. Các hàng tách chế độ/legacy để tránh trộn demo với live.

| Feature | Current status | Where implemented (src/components hoặc src/services nếu viết ngắn) | Real / Mock / Partial | Persistence | Known limitation |
| --- | --- | --- | --- | --- | --- |
| Google Login | Implemented code path | auth/LandingLoginScreen.tsx; App.tsx | Real | Supabase Auth/users | Cần OAuth config/redirect thực tế |
| Role routing learner/instructor/admin | Implemented code path | App.tsx; schema.sql | Real | users.role | Admin dùng cùng shell instructor |
| Class selection và đổi lớp | Implemented code path | App.tsx; classes/ClassSelectionScreen.tsx | Real | enrollments/classes | UI filter không thay thế quyền DB |
| Self enrollment public | Implemented code path | dbService; migration 012 | Real | learners/enrollments RPC | Có thời gian class; removed có thể được active lại |
| Course/module/lesson published | Implemented code path | dbService; curriculumAdapter | Real | DB + static fallback | Fallback có thể khác lớp được chọn |
| Learner home/path/progress | Implemented code path | dashboard; App | Real | lesson_progress | Completion là persisted run, không là mastery |
| Prompt Playground trong Hybrid | Implemented code path | hybrid/HybridView; PromptComposer | Real | Draft state; saved attempts | Không mount PlaygroundView độc lập |
| Live AI generation | Implemented code path | llmService; api/generate; apiServerService | Real | Output qua RPC frontend | Provider/config production chưa xác minh |
| AI Evaluation + retry | Implemented code path | HybridView; api/evaluate; contract | Real | evaluation_json; progress best_score | Client gửi rubric/context và ghi score; không có ký server |
| Prompt Structure / highlight | Implemented code path | promptStructureAnalyzer; PromptStructurePanel | Real | Browser derived state | Regex/heuristic 7 components, không LLM |
| AI Coach | Implemented with limits | common/AiCoach; llmService.evaluatePromptRubric | Partial | Browser messages/local dismissal | Rule-based chat và gợi ý; không conversational LLM |
| Inline autocomplete / diff suggestions | Implemented code path | PromptComposer; labComplianceService | Real | Draft state | Keyword/template và judge scores, không code completion model |
| Hints | Implemented code path | LessonBriefPanel; HybridView | Real | DB hints + browser unlock | Không có analytics trợ giúp server |
| Solution / reference prompt | Implemented code path | LessonBriefPanel; HybridView | Real | DB improved_prompt + local unlock | DB adapter không giữ toàn bộ rich solution metadata từ seed |
| PII detect/redact | Implemented with limits | labComplianceService; HybridView; PromptComposer | Partial | Browser heuristic | Tên mẫu cố định/regex; không hard block API/provider |
| Attempts/version restore | Implemented code path | HybridView; dbService RPC | Real | prompt_attempts | Canonical UUID cần DB curriculum khớp; system text không lưu |
| Compare hai lượt chạy | Implemented code path | HybridView; ABCompareModal | Real | Attempts + memory | Nhận xét business là heuristic; có demo fallback |
| Before/After reference compare | Sample behavior | DiffCompareModal; ABCompareModal | Mock | Static seed/sample | App wrapper không truyền versions thật |
| History/export/clear | Implemented with limits | history/PromptHistoryView; App | Partial | localStorage + Markdown file | Không account/class scoped; clear không delete DB attempts |
| Library save/search/star/copy | Implemented with limits | businessEvaluationService; library; SavePromptModal | Partial | localStorage | Không server/team sharing; browser chung dùng chung |
| Open library prompt in workspace | Implemented with limits | App.handleOpenInPlayground/PromptLibraryModal | Partial | App.activePrompt | Không truyền prompt vào Hybrid editor props; điều hướng/copy dùng được |
| Tutorial learner/instructor | Implemented code path | GuidedWalkthrough; InstructorWalkthrough; migration007 | Real | user_tutorial_progress | Close cũng được ghi completed; demo action không là attempt |
| Instructor dashboard/KPI | Implemented code path | InstructorViewShell; InstructorDashboard | Real | DB progress/enrollment snapshot | Global role scope; phần trăm và enrollment completion khác nghĩa |
| Instructor classes list/detail | Implemented code path | InstructorViewShell; ClassDetailView | Real | classes/courses/clients | Không thấy UI create/update class |
| Learner enrollment add/edit/remove | Implemented code path | LearnerTableView; AddLearnerModal; dbService | Real | users/learners/enrollments | Remove đổi status; CRUD nhiều request không atomic |
| Activity stream | Implemented with limits | InstructorViewShell; ActivityStreamView | Partial | prompt_attempts snapshot | Không realtime subscription; tải toàn bộ rồi xử lý client |
| Course/curriculum management | Implemented code path | CourseManagementModal; CourseCurriculumEditor | Real | DB content tables | Rubric/resources replace delete rồi insert; permission assignments không enforce riêng |
| Expiration/access by end date | Implemented with limits | App expiry values; migration006/012 | Partial | class dates/enrollment status | Self-enroll kiểm ngày; active-access helper không kiểm ngày |
| Live/simulated mode switch | Implemented code path | ApiKeyModal; llmService; HybridView | Real | local config | Simulation không judge, attempt hoặc completion |
| Simulated AI output | Sample behavior | llmService.executeSimulatedPromptStream | Mock | Static output | Không gọi provider; không là kết quả học thật |
| Notebook workspace | Legacy/unmounted | notebook/*; App | Partial | Legacy state code | Có code nhưng không reachable từ App hiện tại |
| Instructor learner detail/reminder | Legacy/unmounted | instructor/LearnerDetailModal.tsx | Mock | State toast + LABS_DATA | Legacy/unmounted: gửi reminder chỉ set state, không email |
| Instructor assignments permission | Implemented with limits | migration004 course_instructors | Partial | DB table | Không thấy UI assignment, RLS chỉ global is_instructor |

## Những thứ không có bằng chứng implementation

Không thấy table library/history riêng, dịch vụ email reminder thực, tenant isolation theo client/course assignment, UI quản lý admin riêng, server API curriculum CRUD, upload/storage pipeline cho resource_type=file, CI gate tích hợp, hoặc realtime subscription dashboard. Đây là kết luận tìm kiếm repo local, không khẳng định cấu hình ngoài repo.
