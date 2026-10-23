import {releaseUiTranslations} from './releaseUiTranslations';
const pairs = `
Doanh nghiệp|Enterprise
Thực trạng|Current challenges
Nguyên tắc làm việc|Working principles
Cách hoạt động|How it works
Ứng dụng thực tế|Practical applications
Đăng nhập|Sign in
Kỹ năng làm việc thực chiến với AI|Practical skills for working with AI
Học cách làm việc hiệu quả với AI.|Learn to work effectively with AI.
Thực hành trên tình huống công việc thật, nhận phản hồi ngay và hiểu cách cải thiện prompt - không cần nền tảng kỹ thuật.|Practice real workplace scenarios, get immediate feedback and learn to improve prompts — no technical background required.
Bắt đầu học với Google|Start learning with Google
Xem cách hoạt động|See how it works
Dành cho nhân sự văn phòng, không yêu cầu kiến thức lập trình|For office professionals. No programming knowledge required.
Cùng một việc. Hai kết quả.|Same task. Two outcomes.
Prompt mơ hồ|Vague prompt
Viết email|Write an email
về buổi họp.|about the meeting.
Kết quả AI|AI result
Chào mọi người, sắp tới sẽ có một buổi họp. Mong mọi người tham gia nếu có thể.|Hello everyone, there will be a meeting soon. Please join if you can.
Thiếu thời gian, người nhận và việc cần làm|Missing the time, recipients and required action
Prompt có cấu trúc|Structured prompt
Gửi email cho nhóm dự án|Email the project team
Họp 9:00 thứ Sáu, phòng A3|Meeting: Friday 9:00, room A3
Xác nhận trước 17:00 thứ Năm|Confirm by Thursday 17:00
Tối đa 80 từ|Maximum 80 words
Chủ đề: Xác nhận họp thứ Sáu|Subject: Confirm Friday's meeting
Chào nhóm, vui lòng xác nhận tham dự buổi họp lúc 9:00 thứ Sáu tại phòng A3 trước 17:00 thứ Năm.|Hello team, please confirm attendance at Friday's 9:00 meeting in room A3 by Thursday 17:00.
Rõ việc. Rõ hạn. Dùng được ngay.|Clear task. Clear deadline. Ready to use.
Prompt quyết định hướng đi.|The prompt determines the direction.
Mục tiêu không đổi. Cách giao việc quyết định AI đi lòng vòng hay đưa ra kết quả có thể hành động.|The goal stays the same. How you assign the task determines whether AI wanders or produces actionable results.
Cùng mục tiêu|Same goal
Ưu tiên công việc dự án|Prioritize project tasks
Hướng đi mơ hồ|Unclear direction
“Giờ nên làm gì?”|“What should I do now?”
Thiếu vai trò, bối cảnh và ràng buộc|Missing role, context and constraints
Gợi ý chung chung|Generic suggestions
Phải sửa thêm mới giao việc được|Needs further editing before assignment
Tốn thời gian|Wasted time
Rác bộ nhớ|Memory waste
Rác dữ liệu số|Digital clutter
Hướng đi rõ ràng|Clear direction
Vai trò + nhiệm vụ + ràng buộc|Role + task + constraints
Đóng vai quản lý dự án. Dựa vào tiến độ và hạn chót, chọn 3 việc ưu tiên.|Act as a project manager. Use progress and deadlines to select three priorities.
Việc ưu tiên có thể giao ngay|Priorities ready to assign
Mỗi việc có người phụ trách, hạn chót và lý do|Each task has an owner, deadline and reason
Dùng AI nhiều không có nghĩa là dùng AI hiệu quả.|Frequent AI use does not mean effective AI use.
Nhiều nhân sự đã quen đặt câu hỏi cho AI, nhưng phần lớn thời gian làm việc vẫn bị lãng phí vì kết quả đầu ra chưa thể dùng ngay.|Many employees already ask AI questions, yet still waste time because the results are not ready to use.
Kết quả không ổn định|Inconsistent results
Cùng một công việc nhưng mỗi lần hỏi AI lại trả về một kiểu khác nhau, lúc trúng ý lúc lan man thiếu trọng tâm.|The same task produces different answers: sometimes relevant, sometimes unfocused.
Phải sửa lại nhiều lần|Repeated revisions
Mất nhiều thời gian giải thích thêm vì chưa biết cách giao việc đủ ngữ cảnh, ràng buộc và định dạng mong muốn ngay từ đầu.|Extra explanations take time when the original request lacks context, constraints and output format.
Khó biết prompt sai ở đâu|Hard to identify prompt issues
Khi kết quả chưa đạt, người dùng thường chỉ gõ lại ngẫu nhiên mà không rõ mình đang thiếu thành phần nào trong câu lệnh.|When results fall short, users often rewrite at random without identifying missing prompt components.
Ba nguyên tắc làm việc với AI|Three principles for working with AI
Nắm vững cách kiểm soát đầu ra để ứng dụng an toàn và chuẩn xác trong công việc hằng ngày.|Control the output to use AI safely and accurately in everyday work.
Giao việc rõ ràng|Assign tasks clearly
Biết cách nói cho AI chính xác mình cần gì và kết quả nên trông thế nào.|Tell AI exactly what you need and what the result should look like.
Kiểm soát kết quả|Control the result
Dùng ví dụ, giới hạn và cấu trúc để giảm việc phải sửa đi sửa lại.|Use examples, limits and structure to reduce revisions.
Làm việc với dữ liệu đáng tin cậy|Work with trusted data
Biết khi nào AI cần bám tài liệu, nguồn dữ liệu hoặc quy định có sẵn.|Know when AI must follow existing documents, data or policies.
Cách Promptify giúp bạn tiến bộ|How Promptify helps you improve
Học qua thực hành có đối chiếu: viết, thử nghiệm và nhận phản hồi tức thì để hình thành phản xạ giao việc chuẩn xác.|Learn through comparative practice: write, test and receive immediate feedback to build clear task-setting habits.
Bước đầu tiên|First step
Viết prompt theo tình huống thật|Write prompts for real scenarios
Đối diện trực tiếp với tài liệu, tờ trình hoặc email thực tế. Tự tay viết câu lệnh giao việc theo tư duy nghiệp vụ của bạn.|Work with real documents, proposals and emails. Write your own prompt using your business knowledge.
Thực thi trực tiếp|Direct execution
Chạy với mô hình AI|Run with an AI model
Gửi câu lệnh tới AI và quan sát ngay kết quả tạo ra. Kiểm tra xem văn bản có đúng ý định và đúng yêu cầu công việc hay chưa.|Run your prompt and inspect the result. Check that it meets your intention and task requirements.
Cải thiện liên tục|Continuous improvement
Nhận feedback và cải thiện|Get feedback and improve
Hệ thống phân tích cấu trúc prompt, chỉ ra điểm làm tốt, phần còn thiếu và gợi ý cách điều chỉnh để lần chạy sau đạt kết quả cao hơn.|The system analyzes your prompt, identifies strengths and gaps, and suggests improvements for the next run.
Áp dụng ngay vào công việc hằng ngày|Apply it to everyday work
Biến kỹ năng giao việc cho AI thành năng suất cụ thể cho các tác vụ văn phòng quen thuộc.|Turn clear AI instructions into productivity for familiar office tasks.
Soạn thảo Email|Draft emails
Soạn thư từ chối, giải thích quy định hoặc trao đổi đối tác đúng chuẩn mực.|Write appropriate rejection letters, policy explanations and partner correspondence.
Lập báo cáo|Prepare reports
Tổng hợp thông tin đa nguồn thành báo cáo định kỳ rõ ràng, mạch lạc.|Combine multiple sources into clear, coherent periodic reports.
Tóm tắt văn bản dài|Summarize long documents
Rút ngắn tờ trình, hợp đồng, biên bản họp thành các điểm mấu chốt.|Extract key points from proposals, contracts and meeting minutes.
Phân loại hồ sơ|Classify records
Phân luồng phản ánh khách hàng, mức độ ưu tiên hoặc tiêu chí phân loại.|Route customer feedback by priority and classification criteria.
Trích xuất bảng biểu|Extract tables
Bóc tách chỉ tiêu từ văn bản thô dán thẳng vào bảng tính Excel hoặc Sheets.|Extract indicators from raw text directly into Excel or Sheets.
Tra cứu tài liệu nội bộ|Search internal documents
Tìm kiếm điều khoản và căn cứ trong cẩm nang quy trình nghiệp vụ.|Find relevant clauses and evidence in business procedure manuals.
Bắt đầu làm việc với AI rõ ràng hơn.|Start working more clearly with AI.
Thực hành ngay hôm nay để biến AI thành cộng sự đắc lực trong công việc của bạn.|Practice today to make AI a useful partner in your work.
Đăng nhập với Google|Sign in with Google
Môi trường đào tạo nội bộ an toàn và bảo mật|A safe and secure internal training environment
Promptify © 2026 • Nền tảng thực hành kỹ năng Prompt Engineering cho nhân sự doanh nghiệp|Promptify © 2026 • Prompt Engineering practice for enterprise professionals
Trang chủ|Home
Lộ trình học|Learning path
Thư viện Prompt|Prompt library
Lịch sử|History
Lớp đang học:|Current cohort:
Không gian học tập của bạn|Your learning space
Xin chào,|Welcome,
Chọn một lớp bên dưới để mở đúng lộ trình và nội dung bài học được giao cho bạn.|Choose a cohort below to open your assigned learning path and lessons.
Lớp học của bạn|Your cohorts
Lớp doanh nghiệp chỉ xuất hiện khi giảng viên đã ghi danh; lớp testing công khai luôn có thể tham gia.|Enterprise cohorts appear after trainer enrollment; public testing cohorts are open to join.
Đang chọn|Selected
Tiến độ|Progress
bài ·|lessons ·
Xem lộ trình lớp này|View this learning path
Công khai|Public
Quay lại Lớp học|Back to cohort
Bài|Lesson
Thư viện|Library
Hướng dẫn|Guide
Bước 1 / 3: Thử nghiệm ban đầu|Step 1 / 3: Initial experiment
Bước 2 / 3: Cải tiến cấu trúc|Step 2 / 3: Improve structure
Bước 3 / 3: Đối chiếu & Hoàn thiện|Step 3 / 3: Compare and refine
Xem lại hướng dẫn|Review guide
Nhiệm vụ Bài|Lesson task
Trọng tâm:|Focus:
Lý thuyết|Theory
Bài tập|Exercise
Gợi ý|Hints
Lời giải|Solution
Lý thuyết Cốt lõi & Bản chất Kỹ thuật|Core theory and technique
Đọc trước khi làm|Read before practicing
Bắt đầu làm bài tập|Start the exercise
Ô Soạn thảo Prompt|Prompt composer
(Tự viết để rèn tư duy)|(Practice your own reasoning)
Xem mẫu chuẩn|View model prompt
Cấu trúc & Gợi ý chèn thẻ|Structure and component suggestions
• Bấm thẻ đã có để định vị / Bấm (+) thẻ thiếu để chèn nhanh|Select an existing component to locate it; select (+) to insert a missing component
Khung 5 tiêu chuẩn|Five-criterion framework
Đã nhận diện:|Detected:
Vai trò|Role
Bối cảnh|Context
Trọng tâm|Focus
Nhiệm vụ|Task
Ràng buộc|Constraints
Định dạng|Format
Ví dụ|Example
Bằng chứng|Grounding
Gợi ý bài này: Bạn có thể bấm|Lesson hint: select
để bổ sung cấu trúc giúp AI xuất dữ liệu sát yêu cầu hơn.|to add structure that makes the output match your requirements.
Thiết lập nâng cao (Vai trò hệ thống)|Advanced settings (System role)
Chạy Prompt|Run Prompt
So Sánh Tiến Bộ (Compare Mode)|Compare progress
· Cùng dữ liệu kiểm soát cố định qua các lần thử|· The same control data across attempts
Bản trước:|Before:
Bản sau:|After:
So sánh câu lệnh Prompt (Trước vs Sau)|Compare prompts (before vs after)
Nhận diện 6 thành phần: Role, Context, Task, Constraint, Format, Example|Identify six components: Role, Context, Task, Constraint, Format, Example
✓ Đã có|✓ Present
Chỉ định vị trí nghiệp vụ cho AI|Assign a business role to AI
Chưa có|Missing
Bối cảnh vụ việc, dữ liệu khách hàng|Case context and customer data
Yêu cầu hành động rõ ràng|Specify a clear action
Quy tắc rủi ro, không tự bịa số liệu|Risk rules; do not invent data
+ Mới thêm|+ Newly added
Yêu cầu bảng biểu Markdown hoặc danh sách|Request a Markdown table or list
Trích dẫn mẫu hoặc tài liệu đối chiếu|Cite an example or reference document
Cột Trái: Lần thử|Left column: Attempt
(Prompt ban đầu)|(Original prompt)
ký tự|characters
Câu lệnh ban đầu còn sơ sài, ít ràng buộc:|The original prompt lacks detail and constraints:
Cột Phải: Lần thử|Right column: Attempt
(Prompt đã tối ưu)|(Improved prompt)
Đã thêm Format|Format added
Bảng dữ liệu chuẩn|Structured data table
So sánh Kết quả Output từ AI (Cuộn độc lập & Chuẩn Markdown)|Compare AI outputs (independent scrolling and Markdown)
Mỗi cột có thanh cuộn riêng để bạn thoải mái đối chiếu số liệu|Each column scrolls independently for easier comparison
Output Lần thử|Output: Attempt
Chưa cấu trúc|Unstructured
Cuộn riêng biệt ↕|Independent scrolling ↕
(Đã cải tiến)|(Improved)
Bảng biểu & Cấu trúc|Tables and structure
Nhận xét & Góc nhìn học tập (Learning Insight)|Learning insights
Xem 5 Tiêu chuẩn Nghiệp vụ & Self-check|View five business criteria and self-check
Prompt đã thay đổi gì?|What changed in the prompt?
Yêu cầu định dạng bảng hoặc các gạch đầu dòng rõ ràng (Output Format).|Request a table or clear bullet points (Output Format).
Output đã cải thiện gì?|How did the output improve?
Câu trả lời ngắn, nhận xét chung chung, thiếu căn cứ số liệu.|A brief answer with generic comments and insufficient evidence.
Được trình bày thành bảng biểu mạch lạc, tách bạch rõ ràng số liệu và kiến nghị xử lý.|A clear table separates evidence from recommended actions.
Vì sao tốt hơn?|Why is it better?
Khi bạn cung cấp rõ vai trò chuyên gia và yêu cầu cụ thể định dạng (bảng/danh sách), mô hình AI không phải tự đoán mà sẽ tập trung phân tích đúng trọng tâm nghiệp vụ.|A clear expert role and output format help AI focus on the business task instead of guessing.
Bài học rút ra|Key lesson
Luôn ghi nhớ công thức 4 phần: [Vai trò] + [Ngữ cảnh dữ liệu] + [Nhiệm vụ cụ thể] + [Khuôn mẫu đầu ra mong muốn] trước khi nhấn gửi.|Before running, include [Role] + [Data context] + [Specific task] + [Expected output format].
So sánh hoàn tất: Lần thử|Comparison complete: Attempt
cải tiến vượt bậc so với Lần thử|improves significantly over Attempt
Lưu Lần thử|Save Attempt
vào Thư viện Prompt|to the prompt library
Đóng đối chiếu|Close comparison
Đã hoàn thành|Completed
Sang bài tiếp theo|Next lesson
Lịch sử thử:|Attempt history:
lần thử)|attempts)
Lưu vào thư viện|Save to library
Đề xuất tối ưu sau khi Giám khảo LLM chấm điểm|Improvement suggestions after AI Judge evaluation
Điểm LLM:|LLM score:
/10đ|/10 points
điểm cần sửa|issues to improve
Chấp nhận tất cả|Accept all
Bỏ qua hết|Dismiss all
Cấu trúc: Bổ sung ràng buộc kiểm soát|Structure: Add safety constraints
Bấm để bôi sáng trong ô lệnh|Select to highlight in the composer
Chấp nhận|Accept
(Chưa có ràng buộc an toàn)|(Safety constraints missing)
Cấu trúc: Bổ sung vai trò chuyên gia|Structure: Add an expert role
(Chưa có vai trò chuyên gia)|(Expert role missing)
Kết quả từ AI|AI output
(Lần thử|(Attempt
Lưu vào Thư viện|Save to Library
Sao chép kết quả|Copy output
Chi tiết kỹ thuật|Technical details
AI Feedback & Đánh giá Rubric:|AI feedback and rubric evaluation:
/ 10 điểm|/ 10 points
Xem chi tiết|View details
Hoàn thành nhiệm vụ|Task completion
Đạt chuẩn|Pass
Độ chuẩn xác / Căn cứ|Accuracy / Grounding
Tuân thủ cấu trúc|Format adherence
Tuân thủ ràng buộc|Constraint compliance
Cần sửa|Needs improvement
Tính ứng dụng thực tế|Business usability
Gợi ý cho lần thử tiếp theo:|Hint for your next attempt:
Tổng quan|Overview
Lớp học|Cohorts
Học viên|Learners
Nhật ký hoạt động|Execution logs
Cổng Điều phối Workshop & Quản lý Lớp học|Workshop coordination and cohort management
Tổng quan Điều phối Lớp học|Cohort coordination overview
Giám sát tiến độ học tập và can thiệp kịp thời các lớp đào tạo Prompt Engineering|Monitor learning progress and provide timely support for Prompt Engineering cohorts
Xem toàn bộ|View all
học viên →|learners →
Lớp đang hoạt động|Active cohorts
Tổng học viên|Total learners
Lớp học cần ưu tiên chú ý|Cohorts requiring attention
Tiến độ hoàn thành thấp nhất (|Lowest completion progress (
Cần hỗ trợ|Needs support
Thời hạn:|Deadline:
tiến độ hoàn thành trung bình|average completion progress
học viên hoàn tất|learners completed
Chưa bắt đầu:|Not started:
học viên|learners
Đang học:|In progress:
Đã xong:|Completed:
Xem chi tiết lớp này|View cohort details
Hoạt động gần nhất|Recent activity
Xem toàn bộ nhật ký →|View all logs →
Chưa có lần chạy prompt nào được lưu trong cơ sở dữ liệu.|No prompt runs have been saved in the database.
Trạng thái|Status
Đang thực hành|Practicing
Tiến độ khóa học|Course progress
/ 5 bài lab|/ 5 labs
Tổng lần chạy prompt|Total prompt runs
lần thử|attempts
Tiến độ chi tiết từng bài học (5 Kỹ thuật Prompt)|Detailed progress (five prompting techniques)
Lớp:|Cohort:
Hoàn thành|Completed
Đang thực hiện|In progress
Chưa thử|Not attempted
Chưa mở|Locked
Mẫu Prompt gần nhất học viên vừa thử nghiệm|Learner's most recent prompt
Sao chép prompt|Copy prompt
Gửi nhắc nhở học tập (Email / Teams)|Preview learning reminder (Email / Teams)
Đóng cửa sổ|Close window
Quay lại Dashboard|Back to dashboard
Thư viện Prompt Chuẩn Nghiệp vụ|Business prompt library
Kho câu lệnh mẫu để tham khảo, lưu lại và tái sử dụng khi thực hành|Sample prompts to inspect, save and reuse during practice
Tất cả (|All (
Khuyên dùng (SOP)|Recommended (SOP)
Cấu trúc 5 thành tố|Five-component structure
Có ví dụ mẫu|Includes an example
Đối chiếu tài liệu|Document grounding
Xem toàn bộ prompt...|View full prompt...
Sao chép|Copy
Đưa vào bài thực hành|Load into exercise
Tìm theo tên prompt, kỹ thuật, tình huống...|Search prompt name, technique or scenario...
Đăng xuất|Sign out
Nhật ký|Logs
Tìm kiếm|Search
AI: Mô phỏng tại máy|AI: Local simulation
Tất cả 16 UI|All 16 UIs
Trước|Previous
Tiếp|Next
Intrepid Asia · bản mẫu doanh nghiệp|Intrepid Asia · enterprise prototype
· Component main / bf1d194 · dữ liệu mẫu Intrepid · bản prototype|· Component baseline: main / bf1d194 · Intrepid fixture · Prototype only
TRUY CẬP DOANH NGHIỆP AN TOÀN|SECURE ENTERPRISE ACCESS
Đăng nhập cổng đào tạo|Sign in to your training portal
Dùng tài khoản công việc để truy cập lộ trình theo phòng ban.|Use your Intrepid Asia work account to access your department learning path.
Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.|Your session has expired. Sign in again to continue your codelab.
Email công việc|Work email
Tiếp tục với Google|Continue with Google
Tên miền và danh sách đào tạo quyết định quyền truy cập. Bản mẫu mô phỏng đăng nhập.|Access is checked against your corporate domain and training roster. This preview simulates the sign-in flow.
Cần trợ giúp đăng nhập?|Need help signing in?
ĐÃ TÌM THẤY HỒ SƠ|ROSTER MATCH FOUND
Xác nhận hồ sơ nhân viên|Confirm your employee profile
Kiểm tra thông tin từ danh sách nhân viên doanh nghiệp.|Check the information imported from your enterprise roster.
Trường|Field
Giá trị từ danh sách|Roster value
Nhân viên|Employee
Mã nhân viên|Employee ID
Phòng ban|Department
Văn phòng|Office
Quản lý trực tiếp|Reporting manager
Xác nhận và tiếp tục|Confirm & continue
Báo thông tin sai|Report a mismatch
Báo thông tin sai sẽ gửi hồ sơ để xem xét, không cấp thêm quyền hay đổi phòng ban.|Reporting a mismatch flags your profile for review. It does not grant a different role or department access.
KIỂM TRA TRUY CẬP|ACCESS CHECK
Không thể truy cập|Access is not available
Tài khoản không được phép vào không gian doanh nghiệp này.|Your account could not be admitted to this enterprise workspace.
Tên miền ngoài hệ thống|External domain
Chưa có trong danh sách|Not in roster
Tài khoản bị khóa|Account blocked
external.user@gmail.com không thuộc tên miền @intrepid.asia được phê duyệt.|external.user@gmail.com is outside the approved @intrepid.asia domain.
Đổi tài khoản|Switch account
Sao chép liên hệ hỗ trợ|Copy support contact
Về trang giới thiệu|Return to public landing
Phạm vi thư viện|Library scope
Kỹ thuật|Technique
Gửi prompt để duyệt|Submit prompt for review
Thư viện doanh nghiệp|Enterprise library
Phòng ban của tôi|My department
Điểm cao · > 9|Top rated · > 9
Tên mẫu|Template title
Cú pháp prompt|Prompt syntax
Tên SOP, phiên bản và trang|SOP filename, version and page
Lưu đề xuất chờ duyệt tại máy|Save local pending proposal
Khôi phục phiên bản đã chọn|Restore selected version
Học viên cần hỗ trợ|Learners needing support
Xem trước gợi ý cho lớp|Preview cohort hint
Tiến trình kỹ thuật · Lớp #04|Technique progression · Cohort #04
Dữ liệu thực thi · mẫu mockup|Execution telemetry · mockup fixture
Lần chạy|Run
Thời gian|Time
Học viên|Learner
Thực hành|Lab
Lần thử|Attempt
Điểm|Score
Không trích dẫn SOP|Failed SOP Citation
Thiếu bảng Markdown|Missing Markdown Table
Lỗi cú pháp JSON Schema|JSON Schema Syntax Error
Lịch sử thử và hỗ trợ từ giảng viên|Attempt timeline & trainer intervention
Bổ sung logic mockup trong modal hiện tại · xem trước tại máy|Teacher logic extension inside the existing learner modal · local preview
Ghi chú riêng của giảng viên|Private trainer note
Lưu ghi chú|Save note
Xem trước gợi ý cá nhân|Preview targeted hint
Lý do cho phép hoàn thành thủ công|Manual clearance reason
Ghi nhận cho phép tại máy|Record clearance preview
Bịa thời hạn SLA (30 phút thay vì 15 phút)|Hallucinated SLA response window (30 mins instead of 15 mins)
Prompt mơ hồ, thiếu vai trò và bối cảnh|Vague prompt, missing role & context
Trang mockup không có nội dung. Cần tài liệu gốc để đọc trang này.|The mockup lists this page but does not include its body. The real document is required to inspect this page.
Tìm trang SOP|Search SOP pages
Trang|Page
Sao chép citation|Copy citation
Đã sao chép citation|Citation copied
· bổ sung bối cảnh theo mockup|· teacher context extension
Tác động đào tạo L&D|L&D executive impact
Xuất báo cáo CSV|Export report CSV
Xem theo phòng ban|Department view
Hoàn thành|Completion
1.017 / 1.150 học viên · doanh nghiệp|1,017 / 1,150 learners · enterprise
Tăng kỹ năng|Skill uplift
Trước 4,2 → Sau 8,6 · doanh nghiệp|Pre 4.2 → Post 8.6 · enterprise
SOP prompt đã tạo|Prompt SOPs created
Tổng doanh nghiệp|Enterprise total
Giá trị năm ước tính|Estimated annual value
Ước tính kịch bản · chưa phải ROI thực tế|Scenario estimate · not realized ROI
Mức cải thiện theo kỹ thuật|Skill gain by technique
Dữ liệu mẫu doanh nghiệp · thanh nhạt: trước học · thanh đậm: sau học|Enterprise fixture · light bar: pre-training · dark bar: post-training
Từ học tập đến giá trị vận hành|From learning to operational value
Hoàn thành đào tạo|Training completion
1.017 học viên đã hoàn thành.|1,017 learners completed the path.
giờ / tuần|h / week
Thời gian tiết kiệm ước tính mỗi học viên.|Estimated time saved per learner.
Thời gian và giá trị năm là ước tính từ mockup. Cần kiểm chứng phương pháp tính, mức áp dụng và baseline trước khi dùng làm bằng chứng kinh doanh.|Time savings and annual value are mockup estimates. Validate the calculation method, adoption and baseline before using them as business evidence.
Bảng xếp hạng phòng ban|Department leaderboard
Đã ghi danh|Enrolled
Đã xong|Completed
Điểm trung bình|Avg score
SOP prompt|Prompt SOPs
Thời gian ước tính|Time estimate
Kho SOP phòng ban|Department SOP knowledge
Chuẩn bị tài liệu được duyệt cho các tình huống thực hành có căn cứ.|Prepare approved documents for grounded training scenarios.
Phạm vi của bạn:|Your scope:
. Phòng ban khác cần quyền phê duyệt riêng từ quản trị.|. Other departments require separate administrator approval.
Thêm SOP phòng ban|Add a department SOP
Tải tệp lên|Upload file
Liên kết Google Drive|Link Google Drive
Thả SOP vào đây hoặc chọn tệp|Drop your SOP here, or browse
PDF, DOCX, XLSX hoặc MD · tối đa 25 MB|PDF, DOCX, XLSX or MD · max 25 MB
Tên SOP|SOP title
Phiên bản|Version
Xem trước xử lý|Preview ingestion
Kiểm tra xử lý|Ingestion checks
Kiểm tra loại tệp, phòng ban sở hữu và phiên bản trước khi xuất bản vào kho tri thức.|Validate file type, department ownership and version before publishing to the knowledge base.
Thông tin tài liệu|Document metadata
Cần backend|Needs backend
Phiên bản và phạm vi phòng ban|Version & department scope
Chia đoạn và lập chỉ mục|Chunking and indexing
Khả năng trích dẫn|Citation availability
Bản mẫu chỉ lưu metadata. Trích xuất thật, kiểm tra quyền và lập chỉ mục RAG cần backend.|This prototype stores metadata only. Real extraction, access checks and RAG indexing remain backend work.
Tài liệu phòng ban|Department documents
Tài liệu|Document
Loại|Type
Các trang|Pages
Dung lượng|Size
Trạng thái|Status
Nguồn|Source
Đồng bộ theo mockup|Mockup synced
Dữ liệu Drive mẫu|Drive fixture
Quản trị hệ thống|System governance
Quản lý cấu hình nhà cung cấp, tên miền được duyệt và lịch sử thay đổi.|Manage provider configuration, approved domains and accountable changes.
BẢN MẪU QUẢN TRỊ · KHÔNG CÓ SECRET THẬT|ADMIN PREVIEW · NO LIVE SECRETS
Kho khóa API|API key vault
Điều phối mô hình|Model routing
Tên miền được duyệt|Domain whitelist
Kiểm tra bảo mật|Security audit
Secret luôn được che. Thao tác xoay khóa chỉ ghi đề xuất tại máy, không thay đổi thông tin nhà cung cấp.|Secrets remain masked. Rotation below records a local proposal; it does not change provider credentials.
Yêu cầu xoay khóa|Request rotation
Xoay lần cuối:|Last rotated:
· dữ liệu mockup|· mockup fixture
Đồng bộ danh sách nhân viên|Enterprise roster sync
Ánh xạ nhân viên được duyệt vào quyền đào tạo và phạm vi phòng ban.|Map approved employee records to training access and department scope.
Kết nối danh sách|Connect a roster
Roster là danh sách nhân viên/học viên để cấp quyền, phòng ban và lớp học. Bản mẫu không đọc Google Sheets hay sửa tài khoản thật.|Roster = the employee / learner list used to assign access, department and cohort. This preview never reads Google Sheets or changes live accounts.
Kết nối Sheets|Sheet connections
Ánh xạ cột|Column mapping
Nhật ký đồng bộ|Sync logs
Thuộc tính|Property
Giá trị|Value
Tổng số dòng danh sách|Total roster rows
Các cột đã ánh xạ|Mapped columns
Chu kỳ đồng bộ|Sync interval
Mỗi 15 phút · đề xuất|Every 15 minutes · proposed
Đồng bộ lần cuối|Last sync
Mô phỏng kiểm tra đồng bộ|Simulate sync check
Mỗi giờ · mockup|Every hour · mockup
Tiêu đề Sheet → trường nhân viên|Sheet headers → employee fields
Phải có đủ cột bắt buộc trước khi đồng bộ.|Required columns must be present before synchronization.
Cột Sheet|Sheet column
Trường cơ sở dữ liệu|Database field
Bắt buộc|Required
Mẫu|Sample
Tình trạng|State
Tùy chọn|Optional
Đã ánh xạ|Mapped
Thiếu|Missing
Email phải duy nhất và thuộc tên miền được duyệt. Backend cần kiểm tra phòng ban và vai trò.|Email must be unique and within an approved domain. Department and role assignments require server-side validation.
Chi tiết nhật ký đồng bộ|Sync log details
Kiểm tra quyền dịch vụ đang chờ|Service account access pending
Chưa từng|Never
Kiểm tra xem trước…|Checking preview…
Đang chuẩn bị xem trước…|Preparing local preview…
Đã xem trước|Previewed
Xem trước tại máy|Local preview
Đã lưu ghi chú tại máy.|Trainer note saved locally.
Đã chuẩn bị gợi ý tại máy. Chưa gửi tin nhắn hay email.|Hint prepared locally. No message or email sent.
Đã ghi lý do cho phép hoàn thành tại máy. Không sửa trạng thái Production.|Local clearance recorded with audit reason. No production status changed.
Chỉ xem trước nhắc nhở. Chưa gửi email hay Teams.|Reminder preview only. No email or Teams message sent.
Đã xem trước gợi ý cho lớp tại máy. Chưa gửi tin nhắn.|Cohort hint previewed locally. No message sent.
Đã chấm dữ liệu mẫu tại máy; không gọi AI hay cơ sở dữ liệu.|Local fixture evaluated; no AI or database request.
Đã sao chép|Copied to clipboard
Không dùng được clipboard. Chọn văn bản để sao chép.|Clipboard unavailable. Select and copy the text.
Chỉ dùng PDF, DOCX, XLSX hoặc MD tối đa 25 MB.|Use PDF, DOCX, XLSX or MD up to 25 MB.
Chọn tài liệu trước.|Choose a document first.
Nhập URL Google Drive hoặc Docs hợp lệ.|Enter a valid Google Drive or Docs URL.
URL tài liệu Google Drive|Google Drive document URL
Chọn tài liệu SOP|Choose SOP document
Tên SOP phòng ban|Department SOP name
Báo thông tin danh sách không đúng|Report incorrect roster details
Phòng ban dự kiến|Expected department
Thông tin nào cần sửa?|What needs to be corrected?
Giải thích thông tin sai cho phụ trách đào tạo|Explain the mismatch for your training lead
Gửi yêu cầu chỉnh sửa|Submit correction request
Đề xuất xoay thông tin truy cập|Propose credential rotation
Lý do thay đổi|Change reason
Ghi nhận yêu cầu|Record request
Kết nối danh sách doanh nghiệp|Connect an enterprise roster
Tên danh sách|Roster title
URL Google Sheet|Google Sheet URL
Lưu bản nháp kết nối|Save connection draft
Mở tài liệu|Open document
Đóng|Close
Kiểm tra SOP|Inspect SOP
VI / EN|VI / EN
Mô phỏng tại máy · không gọi AI|Local simulation · no AI request
Trích dẫn chuẩn|Exact citation
Gắn vào prompt hiện tại|Insert into current prompt
Đạt ≥ 8 · mở bài tiếp theo|Pass ≥ 8 · unlock next lab
Cần cải thiện 5–7,9|Warning 5–7.9
Chưa đạt < 5|Fail < 5
Đang tạo câu trả lời|Generating response
Đang chấm độc lập|Evaluating asynchronously
Xuất prompt đã đạt sang thư viện|Export passing prompt to library
Số lần thất bại|Failed attempts
Số phút chưa đạt|Minutes without passing
Quy tắc cần hỗ trợ: > 5 lần thất bại HOẶC > 20 phút chưa đạt.|Stuck rule: > 5 failed attempts OR > 20 minutes without passing.
Chưa cần can thiệp|No intervention needed
Cần giảng viên hỗ trợ|Trainer support needed
Tiến trình mô phỏng|Simulation progress
Kết quả mô phỏng|Simulation outcome
Tài liệu SOP đang gắn|Attached SOP
Tên miền được duyệt: Intrepid và Agribank. Quyền thật do backend kiểm tra.|Approved domains: Intrepid and Agribank. Real access is checked by the backend.
Giá trị khóa không có trong HTML. Xem secret cần backend và quyền quản trị.|Secret values are absent from HTML. Inspection requires a backend and administrator authorization.
Yêu cầu xem secret|Unmask Secrets
Không tải secret. Bản mẫu chỉ trình bày chính sách quyền truy cập.|No secret loaded. This prototype only demonstrates the access policy.
Mô hình là nhãn từ mockup, chưa xác nhận khả dụng.|Model names are mockup labels; availability is not verified.
Quyền dịch vụ Google Drive|Google Drive service account access
Chia sẻ tài liệu chỉ đọc với tài khoản dịch vụ do backend quản lý.|Share documents read-only with a service account managed by the backend.
Không có nội dung trang này trong mockup; cần tài liệu gốc.|This page has no body in the mockup; the original document is required.
Chỉ nội dung SOP trang 4 có sẵn trong mockup; chưa phải kết nối tài liệu Production.|Only SOP page 4 is supplied by the mockup; this is not a Production document connection.
Điểm từ dữ liệu mô phỏng, không phải đánh giá AI thật.|Scores come from simulation data, not live AI evaluation.
SOP chỉ đọc|Read-only SOP
Thông tin phiên bản|Version metadata
Ngôn ngữ|Language
Chuyển sang tiếng Anh|Switch to English
Chuyển sang tiếng Việt|Switch to Vietnamese
Đi tới nội dung|Skip to content
Mọi phòng ban|All Departments
Mọi kỹ thuật|All Techniques
Hoạt động|active
Đang chờ|pending
Ổn định|healthy
Không giới hạn|Unlimited
Gói miễn phí|Free Tier
Doanh nghiệp|Enterprise
Thời gian phản hồi|Latency
Tổng token|Token count
Phiên chạy|Run version
Lưu cục bộ|Save locally
Liên hệ L&D|Contact L&D
Giải pháp thương hiệu và vận hành chiến dịch|Brand Solutions & Campaign Ops
Hỗ trợ khách hàng và SLA|Customer Support & SLA Desk
Vận hành thương mại điện tử|E-commerce Store Operations
Tài chính, thuế và thanh toán|Finance, Tax & Billing
Chuỗi cung ứng và giao hàng|Supply Chain & Fulfillment
Đào tạo SOP phòng ban: phân loại, cấu trúc đầu ra, giọng thương hiệu và quyết định SLA có căn cứ.|Department SOP training: classification, structured output, brand voice and grounded SLA decisions.
Thực hành kỹ thuật prompt cốt lõi qua tình huống kinh doanh.|Practice the core prompting techniques with business scenarios.
Phân loại phiếu hỗ trợ và phản hồi chiến dịch bằng một ví dụ mẫu|Classify support tickets & campaign feedback using single-example prompts
Dùng một ví dụ tiêu biểu để phân loại phiếu mới. Nêu vai trò, nhiệm vụ, bối cảnh, định dạng và ràng buộc. Trích SOP trang 4 cho thời hạn phản hồi P1.|Use a representative example to classify a new ticket. Specify role, task, context, format and policy constraints. Cite SOP page 4 for the P1 Critical response deadline.
Thêm thẻ chỉ định quản lý trực vào cột hành động.|Include the on-duty manager assignment tag in the Required Action column.
8 phút trước|8 minutes ago
Workshop đang diễn ra|Workshop in progress
Trang 1 - Tóm tắt và phạm vi|Page 1 - Executive Summary & Scope
Trang 4 - Ma trận chuyển cấp SLA|Page 4 - SLA Priority Escalation Matrix
Trang 5 - Quy tắc chậm giao và voucher|Page 5 - Shipping & Voucher Delay Rules
Trang 8 - Giọng và sắc thái thương hiệu|Page 8 - Brand Voice & Tone Guidelines
Trang 12 - Liên hệ khẩn và cán bộ trực|Page 12 - Emergency Contact & Duty Officers
Mục 4.1 - Tổng quan các nhóm SLA khách hàng|Section 4.1 - Overview of Customer SLA Categories
Mọi phiếu phản hồi trong các chiến dịch Flash Sale khu vực (11.11, 12.12 và Payday) phải được phân vào một trong ba nhóm SLA trước khi chuyển cho trưởng phòng ban.|All customer feedback tickets generated during regional Flash Sale campaigns (including 11.11, 12.12, and Payday Sales) must be categorized into one of three strict SLA tiers before routing to department leads.
Mục 4.2 - Chuyển cấp SLA P1 nghiêm trọng (quy tắc chuẩn)|Section 4.2 - P1 Critical SLA Escalation (Ground Truth Rule)
Sai lệch tài chính do trừ tiền hai lần hoặc thanh toán lỗi PHẢI được phân P1 Critical. Thời hạn xử lý tối đa 15 phút. Chuyển ngay cho Duty Billing Lead và xác minh hoàn tiền.|Financial discrepancies resulting from duplicate payment deductions or failed checkout charges MUST be classified as P1 Critical SLA. Resolution time limit: Maximum 15 minutes. Required Action: Escalate immediately to Duty Billing Lead & initiate verification refund.
Mục 4.3 - Giới hạn thẩm quyền hoàn tiền|Section 4.3 - Authorization Limits for Refunds
Chuyên viên Campaign Ops được phê duyệt hoàn tối đa 500 USD mỗi sự cố mà không cần VP duyệt. Khoản vượt 500 USD cần hai xác nhận từ Finance.|Campaign Ops Specialists hold instant refund pre-authorization limits up to $500 per incident without requiring VP approval. All refunds exceeding $500 require dual sign-off from Finance.
Zero-shot và kiểm tra SOP|Zero-shot Prompting & SOP Audit
Đầu ra có cấu trúc và bảng Markdown|Structured Output & Markdown Tables
One-shot, giọng thương hiệu và phân loại|One-shot Brand Voice & Classification
Few-shot, chỉ dẫn hệ thống và {{variables}}|Few-shot System Instructions & {{variables}}
Căn cứ tài liệu và kiểm soát bịa thông tin|Grounding & Anti-Hallucination Guardrails
Phân loại One-shot|One-shot Classification
Đầu ra có cấu trúc (Markdown/JSON)|Structured Output (Markdown/JSON)
Chỉ dẫn hệ thống Few-shot|Few-shot System Instructions
Căn cứ và ràng buộc|Grounding & Guardrails
Phân loại SLA phiếu Flash Sale 11.11 và bảng citation|11.11 Flash Sale SLA Ticket Classifier & Citation Table
Kiểm tra sai lệch voucher thương mại điện tử|E-commerce Flash Deal Voucher Discrepancy Auditor
Tạo phản hồi khách hàng đồng cảm theo giọng thương hiệu|Customer Ticket Empathy & Brand Voice Response Generator
Chuyển cấp chậm giao và SLA kho vận|Supply Chain Shipping Delay & Warehouse SLA Escalator
Mở đầu thực hành Zero-shot có kiểm tra SOP|1. Zero-shot Prompting & SOP Audit
2. Đầu ra có cấu trúc (Markdown/JSON)|2. Structured Output (Markdown/JSON)
3. One-shot, giọng thương hiệu và phân loại|3. One-shot Brand Voice & Classification
4. Few-shot, chỉ dẫn hệ thống và biến|4. Few-shot System Instructions & Variables
5. Căn cứ và kiểm soát bịa thông tin|5. Grounding & Anti-Hallucination Guardrails
Portal học kỹ thuật Prompt|Prompt Engineering Portal
Giao diện giảng viên|Instructor View
Xem song song|Side-by-Side View
`;
const extra=`
• Bấm thẻ đã có để định vị | Bấm (+) thẻ thiếu để chèn nhanh~• Select an existing component to locate it; select (+) to insert a missing component
Đã xử lý mô phỏng~Simulation complete
So sánh~Compare
Giám khảo AI~AI Judge
Bảng điểm giám khảo AI~AI Judge scorecard
Hỗ trợ từ giảng viên~Trainer support
Điểm mạnh~Strengths
Xác định đúng sai lệch thanh toán là SLA P1 Critical.~Correctly identified payment discrepancy as P1 Critical SLA.
Bám đúng SOP v4 trang 4 và trích chính xác mục.~Properly grounded in SOP v4 Page 4 with exact section reference.
Bảng Markdown rõ ràng với tên cột chính xác.~Clean Markdown table structure with correct column headers.
Đã gắn citation vào prompt.~Citation inserted into the prompt.
Đạt · 9,2~Pass · 9.2
Cần cải thiện · 7,9~Warning · 7.9
Chưa đạt · 4,0~Fail · 4.0
Đã hoàn thành~Completed
Nhắc nhở học tập (Email / Teams)~Preview learning reminder (Email / Teams)
Đã duyệt~Approved
Chờ duyệt~Pending review
Chi tiết~Detail
Hành động~Action
Kiểm tra~Inspect
Đang duyệt tại máy~preview
Đề xuất tên miền doanh nghiệp~Propose enterprise domain
Đề xuất tên miền~Propose domain
Tên miền doanh nghiệp~Corporate domain
Lưu đề xuất chờ duyệt~Save pending proposal
Tên miền~Domain
Khách hàng~Client
Người dùng~Users
Tên miền nhiều khách hàng lấy từ mockup. Cần kiểm chứng cách cô lập tenant và quy định tiếp nhận thực tế.~Multi-client rows come from the teacher mockup. Actual tenant isolation and onboarding policy remain to be validated.
Định tuyến thực thi và đánh giá~Execution and evaluation routing
Tác vụ~Workload
Chính~Primary
Dự phòng~Fallback
Chế độ~Mode
Thực thi Playground~Playground execution
Đánh giá AI Judge~AI Judge evaluation
Nhà cung cấp Flash cấu hình~Configured Flash provider
Nhà cung cấp Pro cấu hình~Configured Pro provider
Nhà cung cấp phụ~Secondary provider
Thử lại / hàng đợi~Retry / queue
Đề xuất từ mockup~Mockup proposal
Tên nhà cung cấp trong mockup là cấu hình minh họa, chưa xác nhận mô hình khả dụng.~Provider labels in the source mockup are illustrative configuration, not verified available models.
Mô phỏng thử dự phòng~Simulate fallback test
Nhật ký thay đổi tại máy~Local audit trail
Chưa có thay đổi trong phiên xem trước.~No changes in this preview session.
Đã ghi yêu cầu xoay khóa tại máy.~Rotation request logged locally.
Đã kiểm tra định tuyến tại máy. Không liên hệ nhà cung cấp.~Local routing simulation passed. No provider was contacted.
Đã lưu metadata tại máy. Chưa tải tệp hay lập chỉ mục RAG.~Local document metadata saved. No upload or RAG ingestion occurred.
Đã lưu yêu cầu chỉnh sửa tại máy để giảng viên xem xét.~Correction request recorded locally for trainer review.
Liên hệ phụ trách đào tạo doanh nghiệp để được ghi danh.~Contact your enterprise training lead for roster access.
Đã mô phỏng kiểm tra ánh xạ tại máy. Chưa đồng bộ danh sách thật.~Mapping check simulated locally. No roster synchronization occurred.
Đã lưu bản nháp kết nối tại máy. Cần kiểm tra quyền và ánh xạ.~Connection draft saved locally. Access and mapping still need validation.
Không có nhật ký đồng bộ trong dữ liệu mẫu.~No sync logs in this fixture.
Phân loại phiếu hỗ trợ thành cấp SLA P1, P2, P3, có citation trang chính xác từ SOP v4.~Classifies customer support tickets into P1, P2, P3 SLA escalation tiers with exact page citations from SOP v4.
Áp dụng JSON schema nghiêm ngặt cho nhật ký kiểm tra voucher Shopee và Lazada.~Enforces strict JSON schema output for marketplace voucher audit logs across Shopee and Lazada stores.
Tạo email chuyên nghiệp, đồng cảm theo giọng thương hiệu Intrepid Asia 2026.~Generates professional, empathetic customer response emails adhering to Intrepid Asia 2026 Brand Tone.
Đối chiếu chậm giao 3PL với điều khoản phạt hợp đồng và tạo bản ghi chuyển cấp.~Cross-references 3PL delivery delays against contractual penalty rules and outputs an escalation memo.
Thành phố Hồ Chí Minh~Ho Chi Minh City
Mới nhất~Latest
Nguồn:~Source:
Chưa đạt chuẩn định dạng~Missing explicit format constraints
Không trích dẫn căn cứ~Missing exact SOP citation
Thiếu ví dụ One-shot và quy tắc SOP~Missing One-shot example & SOP rules
Thiếu citation trang SOP~Missing SOP page citation
Thiếu định dạng bảng Markdown~Missing Markdown table format
Đã bám SLA nhưng thiếu định dạng~Improved grounding, missing output format
Yêu cầu bảng Markdown với mã phiếu, cấp ưu tiên và hành động.~Markdown table with Ticket ID, Priority Level and Required Action.
Viết prompt có căn cứ tại đây. Nêu vai trò, bối cảnh, nhiệm vụ, định dạng và citation SOP.~Write your grounded prompt here. Specify role, context, task, format and SOP citation.
Khu vực Kết quả & Đánh giá~Results & evaluation
Trang SOP~SOP pages
Đoạn tài liệu~Document excerpt
SLA, giọng thương hiệu, tóm tắt…~SLA, voice, summary…
Gemini 3.8 Flash - Mô hình thực thi chính~Gemini 3.8 Flash - Primary Playground Exec
Gemini 3.8 Pro - Mô hình đánh giá AI Judge~Gemini 3.8 Pro - AI Judge Evaluator Engine
Dịch vụ đồng bộ Drive và Sheets~Drive & Sheets Sync Worker API
Tài khoản dịch vụ Google Cloud~Google Cloud Service Account
Supabase Service Role (bỏ qua RLS)~Supabase Service Role (RLS Bypass)
`;
const extraPairs="\nĐào tạo AI doanh nghiệp|Enterprise AI Learning\nVí dụ minh họa|Illustrative Preview\nPrompt mơ hồ (V1)|Vague Prompt (V1)\nPrompt có căn cứ (V2)|Grounded Prompt (V2)\nPROMPT ĐẦU VÀO:|USER PROMPT INPUT:\nĐiểm chẩn đoán AI Judge:|AI Judge Diagnostic Score:\n4 / 10 điểm|4 / 10 Points\n10 / 10 điểm (Đạt)|10 / 10 Points (Passed)\nCó căn cứ|Grounded\nRàng buộc|Constraint\nKhả năng ứng dụng|Usability\nTRỤ CỘT 1 • NỀN TẢNG|PILLAR 1 • FOUNDATION\nTRỤ CỘT 2 • LÀM CHỦ|PILLAR 2 • MASTERY\nTRỤ CỘT 3 • THỰC THI|PILLAR 3 • EXECUTION\nNền tảng LLM cho người dùng nghiệp vụ|LLM Foundations for Business Users\nPrompting từ cơ bản đến nâng cao|Prompting from Basic to Advance\nQuy trình AI trong công việc hàng ngày|AI Workflows in Daily Operations\nHiểu|Understand\nvì sao AI tạo văn bản|why AI generates text\n, hiểu hiện tượng ảo giác và tránh lệch ngữ cảnh trong giao tiếp công việc hàng ngày.|, demystify hallucinations, and eliminate context drift in daily workplace communications.\nLàm chủ kết quả AI từ phân loại Zero-shot, One-shot, Few-shot đến Grounding theo SOP nghiêm ngặt của doanh nghiệp.|Master complete control over AI outputs from Zero-shot, One-shot, Few-shot classification to Grounding against strict company SOPs.\nTích hợp AI vào nhiệm vụ hiện tại. Biến các phiên bản prompt lặp lại thành|Embed AI directly into current workplace tasks. Turn repeated prompt versions into approved enterprise\nThư viện Prompt SOP|SOP Prompt Libraries\nBắt đầu học miễn phí hoặc mở khóa năng lực quy trình doanh nghiệp nâng cao.|Start learning for free today or unlock advance enterprise workflow capabilities.\nGÓI CƠ BẢN|BASIC TIER\nKhởi đầu cá nhân|Individual Starter\n/ trọn đời|/ forever\nDành cho nhân sự nghiệp vụ bắt đầu hành trình AI.|Perfect for individual professionals starting their AI journey.\nTruy cập học phần nền tảng LLM|Access to LLM Foundations module\n5 Codelab tương tác cốt lõi (Zero-shot đến Grounding)|5 Interactive Core Codelabs (Zero-shot to Grounding)\nChẩn đoán AI Judge tự động theo 5 tiêu chí|Automated 5-Criteria AI Judge diagnostics\n10 lượt chạy / ngày|10 Execution attempts / day\nBắt đầu miễn phí|Start Free Now\nPHỔ BIẾN NHẤT CHO DOANH NGHIỆP|MOST POPULAR FOR B2B\nGÓI NÂNG CAO|ADVANCE TIER\nLớp doanh nghiệp|Enterprise Cohort\nTheo nhu cầu|Custom\n/ Theo người học hoặc gói|/ Per Seat or Package\nThiết kế cho workshop doanh nghiệp (ví dụ 100 đến hơn 1.150 nhân sự thuộc 27 phòng ban).|Designed for corporate workshops (e.g., 100 to 1,150+ staff across 27 departments).\nToàn bộ tính năng gói cơ bản, cùng với:|Everything in Basic, plus:\nĐồng bộ danh sách Google Sheets và SOP Google Drive|Google Sheets Roster & Drive SOP Auto-Sync Worker\nThư viện Prompt SOP doanh nghiệp (Quản trị 4 phạm vi)|Enterprise Prompt SOP Library (4-Scope Governance)\nTrung tâm giảng viên realtime và phân tích ROI đào tạo|Real-time Trainer Command Center & L&D ROI Analytics\nYêu cầu báo giá doanh nghiệp|Request Enterprise B2B Quote\nChính sách riêng tư|Privacy Policy\nĐiều khoản dịch vụ doanh nghiệp|Enterprise Terms of Service\nKiến trúc bảo mật|Security Architecture\nĐăng nhập Promptify|Sign in to Promptify\nSử dụng Google Workspace hoặc email doanh nghiệp|Use your Google Workspace or Enterprise Email\nĐịa chỉ email:|Email Address:\nQuyền truy cập được xác minh sau khi đăng nhập Google.|Access is verified after Google sign-in.\nPhát hiện email Intrepid Asia. Quyền truy cập được xác minh sau khi đăng nhập Google.|Intrepid Asia email detected. Access is verified after Google sign-in.\nTiếp tục với Google Workspace|Continue with Google Workspace\nKhi đăng nhập, bạn đồng ý với chính sách tách biệt dữ liệu doanh nghiệp và quyền riêng tư RLS.|By signing in, you agree to enterprise data isolation & RLS privacy policies.\nTiếp nhận doanh nghiệp|B2B Enterprise Onboarding\nĐăng ký thử nghiệm doanh nghiệp|Book an Enterprise Pilot\nYêu cầu thiết lập đào tạo với đồng bộ danh sách Google Sheets và tích hợp SOP phòng ban.|Request a custom training setup with Google Sheets Roster Sync and custom department SOP integration.\nTên công ty:|Company Name:\nMã số thuế (MST):|Tax ID (MST):\nQuy mô nhân sự:|Est. Employees:\nEmail người phụ trách:|Main PIC Email:\nGửi yêu cầu doanh nghiệp|Submit Enterprise Request\n";
const entryPairs="\nTRỤ CỘT 1 • NỀN TẢNG|Pillar 1 • Foundation\nTRỤ CỘT 2 • LÀM CHỦ|Pillar 2 • Mastery\nTRỤ CỘT 3 • THỰC THI|Pillar 3 • Execution\nGÓI CƠ BẢN|Basic Tier\nGÓI NÂNG CAO|Advance Tier\nPHỔ BIẾN NHẤT CHO DOANH NGHIỆP|Most Popular for B2B\nPrompt đầu vào:|User Prompt Input:\nLượt chạy theo gói & chấm điểm Gemini|Plan-based executions & Gemini evaluation\nHọ tên|Full name\nHọ tên là bắt buộc.|Full name is required.\nVui lòng mô tả yêu cầu chỉnh sửa.|Please describe the requested correction.\nChưa xuất bản Codelab.|No published Codelabs yet.\nChưa có kết quả.|No output yet.\nChưa xuất bản lý thuyết.|No theory published yet.\nGợi ý đang khóa.|Hints are locked.\nLời giải đang khóa.|Solution is locked.\nYêu cầu nhiệm vụ|Task requirement\nĐánh giá bằng AI Judge|Evaluate with AI Judge\nĐã lưu bản nháp|Draft saved\nĐang lưu bản nháp…|Saving draft…\nXung đột bản nháp: vẫn giữ nội dung local.|Draft conflict: local text retained.\nLoại bỏ định danh cá nhân trước khi gửi đến AI.|Remove personal identifiers before sending to AI.\nChe định danh|Redact identifiers\nTìm SOP|Search SOP\nTrình soạn prompt|Prompt editor\n";
const productionPairs=`
Không gian Codelab Intrepid|Intrepid Codelab Workspace
Thu gọn đề bài|Collapse Brief
Thư viện SOP|SOP Library
So sánh phiên bản (UI-06)|Compare Diff (UI-06)
Lời giải|Sol.
Tiêu chí đang áp dụng|Active criteria
KHUNG CẤU TRÚC PROMPT: Bấm để kiểm tra và chèn|PROMPT STRUCTURAL SCAFFOLDING: Click chip to inspect & insert
Trình soạn prompt:|Prompt Draft Canvas:
Chạy prompt (Ctrl+Enter)|Run Prompt (Ctrl+Enter)
Kết quả phản hồi AI|AI Response Output
Ký tự|chars
Đang hoạt động|active
Tạm dừng|frozen
Đã kết thúc|ended
Phiên học|Session
Gợi ý giảng viên|Trainer hint
Chào mừng trở lại|Welcome back
Thực hành prompt AI với|Practice AI prompting with
Codelab sử dụng SOP được cấp quyền|Codelabs using authorized SOPs
Bài đã hoàn thành|Labs completed
Chưa đánh giá|Not evaluated
Tên SOP|SOP title
Codelab đích|Target Codelab
Tên kết nối|Connection title
Đồng bộ danh sách đã hoàn thành. Xem nhật ký đã lưu.|Roster synchronization completed. Review the saved sync logs.
Tab Table được cung cấp là mẫu và không tự động nhập.|The supplied Table tab is a sample and is not imported automatically.
Chọn tệp tối đa 25 MB.|Choose a file up to 25 MB.
Đã gửi để duyệt|Submitted for review
Nguồn đã duyệt sẽ khả dụng sau khi lập chỉ mục và xuất bản.|Approved sources become available after indexing and publication.
Sandbox sử dụng cấu hình đã lưu trên máy chủ.|Sandbox uses the saved server configuration.
Tiêu đề Codelab mới|New Codelab title
Quy tắc cấp thành tích tự động|Automatic award rules
Huy hiệu đang bật dùng điểm đạt của Codelab. Chứng chỉ yêu cầu hoàn thành mọi Codelab đã xuất bản, điểm trung bình và điểm danh đã cấu hình.|Active badges use the Codelab passing score. Certificates require completing every published Codelab and the configured average score and attendance.
Cấp huy hiệu đang bật sau khi đạt|Issue active badges after passing
Cấp chứng chỉ sau khi hoàn thành khóa|Issue certificate after course completion
Điểm trung bình tối thiểu|Minimum average score
Yêu cầu điểm danh mọi Codelab|Require recorded attendance for every Codelab
Điểm danh đã ghi nhận|Recorded attendance
Lý do điểm danh|Attendance reason
Có mặt tại Codelab này|Present for this Codelab
Thành tích của tôi|My achievements
Tải PDF|Download PDF
Ngữ cảnh nhiệm vụ được cấp quyền|Authorized task context
Đang tìm SOP…|Searching SOP…
Không có nguồn SOP đã xuất bản phù hợp.|No matching published SOP sources.
Tải bản nháp trên máy chủ|Load server draft
Giữ bản nháp của tôi và thử lại|Keep my draft and retry
Đăng nhập bằng Google. Quyền truy cập phụ thuộc vai trò được cấp và lớp được phân công.|Sign in with Google. Access depends on your provisioned role and assigned classes.
Danh tính Google đã được xác thực. Xác nhận tên trước khi vào khu vực được phân công.|Your Google identity is verified. Confirm your name before entering your assigned workspace.
Quyền truy cập yêu cầu vai trò được cấp, lớp được phân công và tuân thủ chính sách tên miền của tổ chức.|Access requires an authorized role, an assigned class and compliance with its organization domain policy.
Email đã xác thực chưa được cấp quyền vào khu vực này. Hãy liên hệ quản trị đào tạo.|Your verified email has not been provisioned for this workspace. Contact the training administrator.
Quyền truy cập lớp|Class access
Quyền|Permission
Giảng viên|Instructor
Trưởng bộ phận|Department head
Chỉ xem|Viewer
Chỉnh sửa|Editor
Chủ sở hữu|Owner
Lưu quyền|Save access
Đã lưu quyền truy cập.|Access saved.
Kết nối|Connection
Chọn kết nối|Select a connection
Lưu ánh xạ|Save mapping
Đồng bộ danh sách tự động|Automatic roster synchronization
Đọc thư mục được chia sẻ|Read shared folder
Gửi thư mục để duyệt|Submit folder for review
Đã bỏ qua tệp không hỗ trợ hoặc quá lớn: |Unsupported or oversized files skipped: 
Việc gửi thư mục đã dừng. Hãy thử lại các tệp còn lại.|Folder submission stopped. Retry the remaining files.
Kết nối được bật sẽ được kiểm tra mỗi 15 phút. Sheet mẫu không được tự động nhập.|Enabled connections are checked every 15 minutes. The sample Sheet is not imported automatically.
Bật|Enable
Tắt|Disable
`;
const studioPairs="\n← Lưu & Quay về Danh mục Codelabs|← Save & return to Codelab directory\n+ Tạo bài Lab mới|+ Create Codelab\nTổng số bài Codelab|Total Codelabs\nThuộc 3 Trụ cột Chương trình Đào tạo|Across the training pillars\nĐã Xuất bản (Active Live)|Published (Active)\nHiển thị trên Learner UI-04|Visible on the learner dashboard\nBản nháp (Drafts QA)|Drafts\nĐang biên soạn trong Studio|Being authored in Studio\nLên lịch / Lưu trữ (Archived)|Scheduled / Archived\nChờ kích hoạt & Lịch sử bài lab|Awaiting activation and historical labs\nTất cả|All\nDoanh nghiệp (Enterprise Client):|Enterprise client:\nTrụ cột Chương trình (Master Pillar):|Training pillar:\nTất cả 3 Trụ cột Đào tạo|All training pillars\nDanh mục Bài Codelabs & Trạng thái Vòng đời Vận hành|Codelab directory and lifecycle\nMã Code|Code\nTiêu đề Bài lab & Trụ cột|Codelab title and pillar\nDoanh nghiệp & Lớp học|Client and cohort\nTrạng thái Vòng đời|Lifecycle state\nLượt làm|Attempts\nĐiểm TB|Average score\nThao tác|Actions\nChỉnh sửa / Cấu hình|Edit / Configure\n1. Scope, Schedule & Trạng thái Vòng đời|1. Scope, Schedule & Lifecycle\nCấu hình phạm vi, thời gian vận hành, phòng ban thụ hưởng từ Onboarding và trạng thái vòng đời.|Configure scope, operating times, eligible departments and lifecycle state.\nTrạng thái Vòng đời:|Lifecycle state:\n📝 DRAFT (Ẩn đối với Học viên)|📝 DRAFT (Hidden from learners)\n🟢 ACTIVE (Đã xuất bản lên UI-04)|🟢 ACTIVE (Published to learner dashboard UI-04)\n⏰ SCHEDULED (Tự mở theo Giờ bắt đầu)|⏰ SCHEDULED (Opens at the start time)\n📦 ARCHIVED (Lưu trữ lịch sử)|📦 ARCHIVED (Historical record)\nTarget Eligible Departments (Chọn từ danh sách Onboarding Doanh nghiệp):|Eligible departments (from enterprise onboarding):\nBusiness Scenario Brief (Hiển thị ở Learner Task Panel UI-05):|Business scenario brief (learner task panel UI-05):\nSystem prompt truyền tới Gemini để chấm điểm AI Judge.|System instruction sent to Gemini for AI Judge scoring.\n+ Thêm Biến|+ Add variable\nToggle tự động cập nhật Rubric|Update rubric automatically\nTên SOP|SOP name\nSố trang|Pages\nTrạng thái|Status\nThời gian Vectorize|Indexing time\n+ Thêm Học liệu|+ Add material\nPhân loại|Category\nTên Học liệu|Material name\nVersion & Ngày cập nhật|Version & update date\nNhật ký thay đổi|Change log\nXóa|Remove\nLưu trữ và chỉnh sửa trực tiếp các liên kết game tương tác Kahoot, Mentimeter poll, Quizizz cho buổi workshop.|Save and edit Kahoot, Mentimeter and Quizizz links for the workshop.\n+ Thêm Quiz / Poll Link|+ Add quiz / poll link\nTên Hoạt động Game/Quiz:|Game / quiz activity name:\nNền tảng Tương tác:|Interactive platform:\nĐường dẫn Live Session URL:|Live session URL:\nCấu hình biểu tượng Huy hiệu số và thiết lập điều kiện tự động cấp huy hiệu cho Học viên.|Configure badge icons and automatic award rules for learners.\n+ Thêm Huy hiệu mới|+ Add badge\nĐiều kiện Tự động Cấp (Automated Threshold):|Automatic award criteria:\nXóa Huy hiệu|Remove badge\nCấu hình tiêu đề phôi chứng chỉ B2B, đơn vị cấp phép, điều kiện tốt nghiệp và đường dẫn mẫu PDF.|Configure the certificate title, issuer, graduation rules and PDF template URL.\nTiêu đề Chứng chỉ Doanh nghiệp:|Enterprise certificate title:\nĐơn vị Cấp Bằng / Ủy ban Đào tạo:|Issuer / training committee:\nQuy tắc & Điều kiện Tốt nghiệp (Eligibility Rules):|Graduation eligibility rules:\nMẫu Phôi Certificate PDF Template URL:|Certificate PDF template URL:\nLần cuối cập nhật Phôi:|Template last updated:\n";
const en=new Map<string,string>(),vi=new Map<string,string>();
for(const [block,separator] of [[pairs,'|'],[extra,'~'],[extraPairs,'|'],[entryPairs,'|'],[productionPairs,'|'],[studioPairs,'|'],[releaseUiTranslations,'|']])for(const line of block.trim().split('\n')){const p=line.indexOf(separator);if(p<0)continue;const a=line.slice(0,p),b=line.slice(p+1);en.set(a,b);vi.set(b,a)}
export function sourceUiText(s:string,language: 'en'|'vi'){const trimmed=s.trim();if(/^© 2026 Promptify x Intrepid Asia\./.test(trimmed))return s.replace(trimmed,'© 2026 Promptify · Intrepid');const dict=language==='en'?en:vi;const cleanUiCodes=(value:string)=>value.replace(/\s*\(UI-\d{2}\)|\s+UI-\d{2}\b|UI-\d{2}:\s*/g,'').replace(/^(Edit|Chỉnh sửa) in$/,'$1').replace(/^Chỉnh sửa trong$/,'Chỉnh sửa').replace(/^\+ Create New Lab in$/,'+ Create New Lab');const cleanLabel=cleanUiCodes(trimmed);const mapped=dict.get(trimmed)||dict.get(cleanLabel);const knownDisplayLabel=(language==='en'?en:vi).values();const exact=mapped?cleanUiCodes(mapped):Array.from(knownDisplayLabel).some(value=>cleanUiCodes(value)===cleanLabel)?cleanLabel:undefined;if(exact)return s.replace(trimmed,exact);let v=s;
 // Dynamic labels retain numbers, citations, model identifiers and user input.
 if(language==='en'){v=v.replace(/(\d+) lần thử nghiệm/g,'$1 attempts').replace(/(\d+) phút trước/g,'$1 minutes ago').replace(/(\d+) ngày trước/g,'$1 days ago');}
 else {v=v.replace(/(\d+) days ago/g,'$1 ngày trước').replace(/(\d+) minutes ago/g,'$1 phút trước').replace(/(\d+)h\/wk/g,'$1 giờ/tuần');}
 if(!/[\n\r]|\[Role\]|\[Task\]|\[Context\]|\{\{/.test(v)){
  for(const [from,to] of dict){if(from.length>45&&v.includes(from))v=v.replace(from,to)}
  v=v.split(' · ').map(part=>dict.get(part)||part).join(' · ');
 }
 if(language==='en')v=v.replace(/Hiển thị (\d+) \/ (\d+) bài lab/g,'Showing $1 / $2 Codelabs').replace(/(\d+) học viên/g,'$1 learners').replace(/Lần thử /g,'Attempt ').replace(/\(Mới nhất\)/g,'(Latest)').replace(/đ \(/g,' points (').replace(/lần thử\)/g,'attempts)');
 else v=v.replace(/(\d+) attempts\b/g,'$1 lần thử').replace(/(\d+) Codelabs\b/g,'$1 bài học').replace(/Score: /g,'Điểm: ').replace(/(\d+) chars\b/g,'$1 ký tự').replace(/ is outside the approved corporate domains\./g,' không thuộc tên miền doanh nghiệp được duyệt.').replace(/Attempt /g,'Lần thử ').replace(/\(Latest\)/g,'(Mới nhất)').replace(/Source: /g,'Nguồn: ');
 return v;
}
