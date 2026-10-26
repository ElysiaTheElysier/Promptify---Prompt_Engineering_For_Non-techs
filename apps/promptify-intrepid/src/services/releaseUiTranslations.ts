export const releaseUiTranslations=`
Thông tin cấu hình máy chủ|Server configuration
Bí mật luôn nằm trên máy chủ.|Secrets remain on the server.
Bí mật trong biến môi trường máy chủ|Server environment secrets
Kiểm tra cấu hình provider, chính sách tên miền doanh nghiệp và sự kiện audit đã ghi.|Inspect provider configuration, tenant domain policies and recorded audit events.
Độ trễ gateway trung bình:|Gateway Latency (Avg):
Chưa có dữ liệu đo|No telemetry yet
Cần dữ liệu thanh toán từ provider|Provider billing required
Số khóa đã cấu hình|Active Vault Keys
Trạng thái cấu hình|Configuration status
Lưu trong biến môi trường|Stored in Environment Variables
Token xử lý hôm nay|Tokens Processed Today
Chưa có dữ liệu sử dụng|No usage telemetry yet
Danh sách tên miền được phép|Domain Whitelists
Học viên đã ghi danh|Enrolled learners
Kiểm soát tên miền đang bật|Domain Guard Enabled
Cảnh báo bảo mật trong 24 giờ|Security Flags (24h)
Tên miền đã tắt|Disabled domains
Xem các sự kiện audit đã ghi|Review recorded audit events
1. Lưu trữ khóa API và bí mật|1. API Key Vault & Secret Storage
2. Định tuyến AI và dự phòng|2. AI Gateway Routing & Fallback
3. Kiểm soát tên miền và doanh nghiệp|3. Domain Guard & Tenant Whitelist
4. Nhật ký bảo mật|4. Real-time Security Audit Logs
Khóa API của hệ thống|Centralized System API Keys
Khóa API chỉ nằm trên máy chủ. Người dùng không tiếp xúc với khóa provider gốc.|API keys are securely isolated on the server. End users never touch raw provider credentials.
Quản lý khóa provider|Provider credential management
Mã / tên khóa|Key ID / Name
Nhà cung cấp|Provider
Biến môi trường|Environment Variable
Khóa bí mật|Secret Token
Giới hạn tần suất|Rate Limit
Sử dụng hôm nay|Usage Today
Xoay khóa|Rotate
Chính:|Primary:
Dự phòng:|Fallback:
Độ trễ trung bình|Avg Latency
Tỷ lệ lỗi|Error Rate
Kiểm tra gateway|Test Gateway
Thêm tên miền được phép|Whitelist New Domain
Quyền doanh nghiệp và roster được kiểm tra trên máy chủ.|Client scope and roster authorization are checked on the server.
Kiểm tra RLS|RLS Check
Mã nhật ký|Log ID
Thời gian|Timestamp
Loại sự kiện|Event Type
Người thực hiện|Actor
Tài nguyên|Target Resource
Địa chỉ IP|IP Address
Thêm tên miền được phép|Add Domain to Guard Whitelist
Tên miền doanh nghiệp:|Enterprise Domain Suffix:
Cho phép tên miền|Whitelist Domain
Điểm chẩn đoán tổng|Overall Diagnostic Score
/ 10 điểm|/ 10 Points
Chi tiết rubric 5 tiêu chí:|5-Criteria Rubric Breakdown:
Điểm mạnh chính:|Key Strengths Identified:
Điểm cần cải thiện:|Areas for Improvement:
Gợi ý sửa prompt tiếp theo:|Suggested Prompt Revision (nextHint):
Quá thời gian chấm điểm|Evaluation Latency Timeout
Bộ chấm điểm AI có trọng số · EN / VI|Weighted AI evaluator · EN / VI
Ước tính token của prompt|Estimated prompt tokens
Lưu nháp thất bại. Nội dung vẫn được giữ tại đây. Thử lại khi có kết nối.|Draft save failed. Your local text is retained. Retry when connected.
Tổng lượt chạy|Total Attempts Run
Điểm AI Judge trung bình|Avg AI Judge Score
Trọng tâm học tập hiện tại:|Active Learning Focus:
Tiếp tục thực hành|Resume Practice Session
Thư viện SOP phòng ban|Department SOP Library
Yêu cầu cập nhật nguồn SOP|Request New SOP Context Sync
Phiên bản cơ sở (A):|Baseline Version (A):
CŨ HƠN|OLDER
Phiên bản so sánh (B):|Comparison Version (B):
MỚI HƠN|NEWER
CÙNG PHIÊN BẢN|SAME
Áp dụng phiên bản đã chọn vào workspace|Apply selected version to workspace
So sánh prompt|Prompt Syntax Diff
So sánh đầu ra|Output Result Diff
Đang xác minh token OAuth…|Verifying OAuth Token...
Cần hỗ trợ truy cập?|Need Access Help?
Liên hệ người quản lý đào tạo|Contact Training Lead
Đã xác minh Google SSO|SSO VERIFIED
Không gian được phân công|Assigned workspace
Tài khoản đang dùng:|Attempted Account:
BỊ TỪ CHỐI|REJECTED
Cách giải quyết:|How to resolve:
Đã lưu bản nháp|Draft saved
Đang lưu bản nháp…|Saving draft…
Nạp bản nháp từ máy chủ|Load server draft
Giữ bản nháp của tôi và thử lại|Keep my draft and retry
Đang tìm SOP…|Searching SOP…
Không có nguồn SOP đã xuất bản phù hợp.|No matching published SOP sources.
Chưa có lần chạy|No run yet
1. Nhiệm vụ|1. Brief
2. Soạn prompt|2. Compose
3. Đầu ra|3. Output
Đóng chẩn đoán|Close Diagnostics
Đóng|Close
Mở rộng yêu cầu|Expand Brief
Thu gọn yêu cầu|Collapse Brief
KHUNG CẤU TRÚC PROMPT:|PROMPT STRUCTURAL SCAFFOLDING:
Bấm chip để xem và chèn|Click chip to inspect & insert
Chèn trích dẫn|+ Insert Citation Tag
Lộ trình học|Learning path
Tiêu chí đang bật|Active criteria
Tất cả lớp|All Hubs
Chọn lớp|Select class
1. Theo dõi|1. Pulse
2. Điều hành trực tiếp|2. Live War Room
3. Studio|3. Studio
Lớp đang hoạt động|Active Cohorts
Điểm trung bình lớp|Cohort Avg Score
Cảnh báo học tập / bảo mật|Stuck / Security Alerts
Đã gắn cờ|Flagged
Tín hiệu từ bài làm đã lưu|Signals from saved attempts
Tạm dừng phiên|Freeze Session
Gửi gợi ý cho cả lớp|Broadcast Hint
Đã lưu thông báo cho lớp này.|Broadcast saved for this class.
Tên học viên|Learner Name
Kỹ thuật hiện tại|Current Technique
Thao tác nhanh|Quick Action
Xem prompt (UI-10)|Inspect Prompts (UI-10)
Chỉnh sửa trong UI-11|Edit in UI-11
Gửi gợi ý riêng vào workspace:|Send Private Hint to Student Workspace:
Hướng dẫn riêng|Private coaching
Gửi hướng dẫn riêng|Send Private Coaching Tip
Đóng Inspector|Close Inspector
Prompt nguyên văn từ bài làm đã lưu gần nhất:|Verbatim prompt from latest saved attempt:
Toàn bộ bản ghi hiện có|All available records
Tỷ lệ hoàn thành chương trình|Program Completion Rate
Tính từ tiến độ đã lưu|Completion from saved progress
Chênh lệch điểm kỹ năng|Competency Score Delta
SOP doanh nghiệp đã tạo|Enterprise SOPs Created
SOP đã đóng góp|SOP contributions
Cần số liệu thời gian làm việc thực tế|Requires measured work-time inputs
Tên phòng ban|Department Function
Tỷ lệ hoàn thành|Completion Rate
Điểm AI trung bình|Avg AI Score
Thời gian tiết kiệm|Time Saved
Trước chương trình|Pre-Masterclass Baseline
Điểm sau chương trình|Post-Masterclass Score
Xuất báo cáo L&D|Export Executive ROI Report
Đang tạo báo cáo…|Generating Report...
Quản trị gateway và khóa API tập trung|Centralized API Vault & AI Gateway Governance
Đã cấu hình|configured
Chưa cấu hình|not configured
Đã ghi nhận|recorded
Đã đồng bộ|synced
Thành công|success
Thất bại|failed
Đang chạy|running
Chờ xử lý|pending
Đã xuất bản|published
Lưu bản nháp|Create draft
Bài Codelab mới|New Codelab
Kết nối mới|New connection
Lưu kết nối|Save connection
Đồng bộ ngay|Sync now
Chỉnh sửa kết nối|Edit connection
Không có kết nối roster.|No roster connections.
Không có nhật ký đồng bộ.|No sync logs.
Ánh xạ cột|Column mapping
Số dòng đã xử lý|Processed rows
Lần đồng bộ gần nhất|Last synchronization
Tab Sheet|Sheet tab
Phạm vi ô|Cell range
Tên cột email|Email column
Tên cột họ tên (không bắt buộc)|Full name column (optional)
Tên cột phòng ban|Department column
Tên cột quốc gia|Country column
Chọn học viên|Select learner
Chọn bài học|Select lesson
Đã lưu điểm danh.|Attendance saved.
Điểm danh|Attendance
Có mặt|Present
Vắng mặt|Absent
Tải chứng chỉ|Download certificate
Tải huy hiệu|Download badge
Điểm tối thiểu để đạt|Passing score
Tự cấp huy hiệu khi đạt|Award badges on passing
Tự cấp chứng chỉ khi hoàn thành|Issue certificate on completion
Yêu cầu điểm danh|Require attendance
Điểm trung bình tối thiểu|Minimum average score
Mã lớp|Class code
Đang tải lớp được chọn…|Loading selected cohort…
Yêu cầu nhiệm vụ|Task requirement
Ngữ cảnh nhiệm vụ được cấp quyền|Authorized task context
Chưa xuất bản lý thuyết.|No theory published yet.
Gợi ý chưa được mở.|Hints are locked.
Lời giải chưa được mở.|Solution is locked.
Sao chép đầu ra|Copy output
Thư viện SOP|SOP Library
Yêu cầu đổi hồ sơ đã ghi nhận; quyền truy cập không tự thay đổi.|Correction recorded; access does not change automatically.
Đang lưu…|Saving…
Thử lại|Retry
Đã lưu|Saved
Hủy|Cancel
Không có dữ liệu|No data
Đóng bảng điểm|Close Scorecard
Áp dụng gợi ý và chỉnh sửa|Apply Hint & Revise
Bảng chẩn đoán AI Judge|AI Judge Diagnostic Scorecard
Đang chấm lại theo rubric…|Re-evaluating Rubric...
Thử chấm lại bằng AI Judge|Retry AI Judge Evaluation
Không dùng điểm thay thế|No Fallback Scores Applied:
Đang hoạt động|Active
Xem lại bài làm|Review Submission
Đã lưu trên máy chủ.|Saved on the server.
Chưa có bài làm đã lưu.|No saved attempts yet.
Danh sách học viên trong phiên:|Session Learner Roster:
Lịch sử bản nháp:|Draft History:
Lần tham gia đầu tiên:|First Joined:
Lần hoạt động cuối:|Last Active:
Tổng thời gian hoạt động:|Total Active Time:
Tải PDF|Download PDF
Thành tích của tôi|My achievements
Chưa có bài Codelab được xuất bản.|No published Codelabs yet.
Chính sách cô lập dữ liệu đang hoạt động|Row-Level Security Active
Kênh truy cập dữ liệu được bảo vệ|Encrypted RLS Channel
Đóng ngăn tài liệu|Close Drawer
Tìm trong nội dung nguồn|Search source text
Đóng chi tiết|Close Details
Lỗi đồng bộ|Sync errors
Các hàng có lỗi:|Detected Row Errors:
Không gian học viên|Learner Dashboard
Mở hộp nhập tài liệu|Open Ingestion Modal
Tài liệu qua tài khoản dịch vụ Google|Google Drive Service Account Worker
Thông tin nền tảng|Platform Infrastructure
Giám sát hạ tầng và bảo mật hệ thống|System Infrastructure & Security Monitor
Quản trị gateway AI và chuyển model dự phòng|AI Gateway & Fallback Configuration
Chính sách tên miền doanh nghiệp|Domain Guard Whitelist (B2B Tenant Isolation)
Nhật ký bảo mật và truy cập|Real-Time Security & Access Audit Trail
Tải lên tài liệu SOP theo phòng ban|UI-13: Department SOP Upload & Context Modal
Chạy thử hư cấu|Fictional trial
Ước lượng token của prompt|Estimated prompt tokens
So sánh phiên bản|Compare versions
Độ bám nguồn và trích dẫn SOP|Groundedness & SOP Citation
Nhiệm vụ và vai trò|Task & Role Persona
Tuân thủ định dạng|Format Adherence
Tuân thủ mẫu One-Shot|One-Shot Pattern Compliance
Khả năng thực thi và thời hạn SLA|Business Actionability & SLA Window
Điểm AI Judge:|AI Judge Score:
Chẩn đoán AI Judge|AI Judge diagnostics
Chênh lệch điểm|Score change
Chưa chấm điểm|Not evaluated
Phiên bản|Version
Lộ trình thực hành|Practice learning path
Sao chép trích dẫn đang xem|Copy current citation
Mở tệp gốc|Open original file
Đang tải xuống…|Downloading…
Sao chép mã trích dẫn|Copy Citation Tag
Kiểm tra SOP|SOP inspector
Đã lập chỉ mục|Indexed
Chưa lập chỉ mục|Not indexed
Nội dung nguồn|Source text
Kiểm tra tài liệu nguồn|Inspect source
Đóng ngăn tài liệu|Close source drawer
Tiến độ học tập và điểm rubric đã lưu của các lớp được cấp quyền.|Recorded learning progress and rubric scores for authorized cohorts.
Phòng ban và lớp được cấp quyền|Authorized departments and cohorts
SOP đã xuất bản|Published SOPs
Đã lưu vào thư viện SOP|Saved to Supabase Enterprise Library

Bảng tổng quan tác động đào tạo|L&D EXECUTIVE IMPACT DASHBOARD
Tác động ROI và tiến bộ kỹ năng|L&D Masterclass ROI & Skill Progression Impact
ROI năng suất năm ước tính:|Est. Annual Productivity ROI:
Hiệu quả tăng mỗi tuần|Weekly Efficiency Gain
Giờ tiết kiệm / người / tuần|Saved / Emp / Wk
Quy trình ticket và SLA tự động|Automated ticket & SLA workflows
Tiến bộ kỹ năng trước và sau chương trình|5-Technique Skill Competency Gain (Pre vs. Post Masterclass)
Đánh giá bất đồng bộ bằng rubric AI Judge (thang điểm 0–10)|Evaluated asynchronously via AI Judge rubric benchmarking (0–10 score range)
Xếp hạng tham gia và tạo SOP theo phòng ban|Department Adoption & SOP Creation Leaderboard
SOP đã xuất bản|Prompt SOPs Built
Cổng đăng nhập doanh nghiệp|INTREPID ENTERPRISE PORTAL
Bảo vệ bằng phân quyền hàng dữ liệu (RLS) và Google OAuth.|Protected by Enterprise Row-Level Security (RLS) & GCP OAuth Boundary.
Liên hệ quản trị đào tạo để thêm email của bạn vào danh sách học viên.|Contact Enterprise Training Lead to add your email to the Roster Sheet.
Nếu bạn là khách hàng doanh nghiệp bên ngoài, hãy yêu cầu bản demo B2B trên trang chủ.|If you are an external enterprise client, request a B2B demo on the main portal.
Bảo vệ truy cập doanh nghiệp|ENTERPRISE SECURITY GUARD
Xoay khóa nhà cung cấp cần cập nhật cấu hình máy chủ.|Provider rotation requires updating the deployment environment.
Định tuyến prompt để cân bằng tốc độ, chi phí và độ chính xác đánh giá.|Routes prompt requests dynamically to balance speed, cost, and evaluation precision.
Giới hạn đăng nhập Google SSO theo tên miền doanh nghiệp được phép.|Restricts Gmail SSO authentication to authorized enterprise email domains.
Nhật ký kiểm toán về truy cập khóa API, kiểm tra tên miền và truy vấn dữ liệu.|Immutable audit logs tracking API key access, domain checks, and database queries.
Quản lý khóa nhà cung cấp cho|Manage the provider credential for
Cập nhật cấu hình triển khai máy chủ sau khi xoay khóa.|Update the server deployment environment after provider rotation.
Xoay khóa tại nhà cung cấp, sau đó cập nhật cấu hình triển khai.|Rotate the credential at its provider, then update the deployment environment.
Dịch vụ đánh giá AI Judge đã hết thời gian chờ. Đầu ra đã tạo vẫn được giữ nguyên.|The asynchronous AI Judge evaluation service (\`/api/evaluate\`) timed out. Your generated output is safe and intact.
Promptify không dùng điểm giả thay thế để bảo đảm tính toàn vẹn của đánh giá.|Per architecture policy, Promptify eliminates fake score fallbacks to preserve grading integrity.
Không cần lập trình|100% No-Code
Sử dụng Gemini|Gemini Powered
Phân quyền dữ liệu doanh nghiệp|Enterprise RLS Security
Bạn sẽ học được gì?|What Will Business Staff Learn?
Gói dành cho cá nhân và doanh nghiệp|Flexible Plans for Individuals & Enterprises
UI-10: Kiểm tra prompt và hỗ trợ cá nhân|UI-10: Prompt Inspector & 1-on-1 Coaching Workspace
Quay về điều hành lớp (UI-09)|Back to Live War Room (UI-09)
Sửa bài mẫu (UI-11)|Edit Master Template (UI-11)
Phát hiện dữ liệu cá nhân|PII BREACH DETECTED
• Bài đang thực hành:|• Active Exercise:
Lượt đăng nhập phiên:|Session Logins:
Gửi gợi ý riêng tới không gian học viên (UI-05):|Send Private 1-on-1 Coaching Tip to Learner Workspace (UI-05):
Gửi trực tiếp tới trình soạn đang mở|Direct delivery to active editor
Gửi gợi ý riêng|Send Private Tip
Đã lưu gợi ý cho học viên này.|Coaching saved for this learner.
Ghi chú riêng của giảng viên:|Facilitator Private Notes for Learner:
Nội bộ / học viên không thấy|Internal / Not visible to learner
Đã lưu ghi chú vào dữ liệu!|Note saved to database!
Lưu ghi chú nội bộ|Save Internal Note
Bảng điểm AI Judge|AI Judge Evaluation Scorecard
Phản hồi định tính:|Qualitative Feedback:
Bộ đồng bộ danh sách Google Sheets|GOOGLE SHEETS ROSTER WORKER
Tài khoản dịch vụ máy chủ · đồng bộ theo yêu cầu|Server service account · On-demand sync
Đồng bộ danh sách học viên Google Sheets|Google Sheets Learner Roster Auto-Sync
Tổng học viên đã đồng bộ:|Total Synced Learners:
Kết nối Sheet hoạt động|Active Sheet Syncs
Kết nối bằng tài khoản dịch vụ|Connected via Service Account
Chu kỳ đồng bộ|Sync Interval
Đồng bộ thủ công|Manual sync
Theo yêu cầu|On demand
Bấm Đồng bộ ngay để cập nhật danh sách|Use Sync now to refresh the roster
Tình trạng ánh xạ cột|Column Mapping Health
Ánh xạ đã lưu|Saved mapping
Hợp lệ|Valid
Đã ánh xạ các trường dữ liệu bắt buộc|All required DB schema fields mapped
Cảnh báo xác thực (24 giờ)|Validation Alerts (24h)
Cảnh báo|Warnings
Kiểm tra trùng lặp và định dạng tên miền|Duplicate & Domain Format checks
Đang đọc Google Sheets và kiểm tra cấu trúc dữ liệu…|Google Sheets Service Account Reading Rows & Validating Schema...
1. Kết nối Google Sheets hoạt động|1. Active Google Sheet Connections
2. Cấu hình ánh xạ cột|2. Column Mapping Configuration
3. Nhật ký đồng bộ|3. Real-Time Sync Execution Logs
Nguồn danh sách Google Sheets đã kết nối|Connected Google Sheets Roster Sources
Tài khoản dịch vụ dùng Google Sheets API để đọc danh sách học viên.|The Service Account worker connects via Google Sheets API to read learner rows automatically.
Kết nối Sheet mới|Connect New Sheet
Tổng dòng học viên|Total Learner Rows
Đồng bộ gần nhất|Last Sync
Đồng bộ ngay|Sync Now
Ánh xạ tiêu đề cột Sheet sang dữ liệu Supabase|Google Sheet Header → Supabase Database Mapping
Ánh xạ tiêu đề cột Google Sheet sang các trường dữ liệu Promptify.|Maps custom column titles in your Google Sheet to Promptify's target PostgreSQL user schema.
Tiêu đề cột Google Sheet|Google Sheet Column Header
Trường dữ liệu đích (Supabase)|Target DB Field (Supabase)
Ràng buộc trường|Field Constraint
Mẫu xem trước dữ liệu|Data Preview Sample
Trạng thái ánh xạ|Mapping Status
Nhật ký vận hành và xác thực|Execution Telemetry & Validation Logs
Bản ghi của mỗi lượt đồng bộ nền.|Real-time records of every automated background sync run.
Nguồn Sheet|Sheet Source
Đã xử lý|Processed
Đã thêm|Added
Đã cập nhật|Updated
Lỗi|Errors
Thêm kết nối Sheet|Add Sheet connection
Kết nối danh sách Google Sheet mới|Connect New Google Sheet Roster
Phạm vi doanh nghiệp:|Enterprise Client Scope:
URL Google Sheet (công khai hoặc chia sẻ cho tài khoản dịch vụ):|Google Sheet URL (Public or Shared with Service Account):
Email tài khoản dịch vụ cần chia sẻ quyền:|Service Account Email to Share Access:
Kết nối và kiểm tra đồng bộ|Connect & Test Sync
Phân quyền RLS đang bật|RLS Isolation Active
Chia sẻ tệp Drive cho tài khoản dịch vụ máy chủ. Gửi duyệt trước khi xuất bản.|Share the Drive file with the server service account. Submit it for review before publication.
Sẵn sàng truy xuất nguồn|RAG Ready
Lịch sử nguồn đã xuất bản được giữ lại. Gửi phiên bản thay thế để duyệt.|Published source history is retained. Submit a replacement version for review.
Cổng giảng viên / điều hành|Facilitator / Trainer Portal
Bảng điều hành Promptify|Promptify Control Center
Chuẩn đạt: ≥ 8,0/10|Benchmark: ≥ 8.0/10
Thông số cổng AI|AI Gateway Telemetry
Phiên workshop trực tiếp|LIVE MASTERCLASS SESSION
Mở phòng điều hành (Giai đoạn 3)|Enter Live War Room (Phase 3)
Giai đoạn 3: Điều hành workshop và ma trận tiến độ|Phase 3: Live Masterclass Command Center & Heatmap
Điều khiển phiên:|Live Controls:
Gửi gợi ý SLA tới tất cả không gian học viên (UI-05):|Quick Broadcast SLA Hint to All Student Workspaces (UI-05):
Thông báo xuất hiện trong không gian học viên|Instantly blasts pop-up notification
Ma trận tiến độ kỹ năng của lớp:|5-TECHNIQUE COHORT PROGRESS HEATMAP MATRIX:
Hoàn thành (≥8,0)|Completed (≥8.0)
Đang thực hiện|In Progress
Phát hiện dữ liệu cá nhân|PII Breach
Phát hiện dữ liệu cá nhân|PII BREACH
Giai đoạn 2: Quản lý Codelab và mở Studio|Phase 2: Pre-Game Codelabs Governance & Studio Access
+ Tạo bài mới trong UI-11|+ Create New Lab in UI-11
Lần thử:|Attempt:
Điểm:|Score:
Thư viện SOP Intrepid (UI-08)|Intrepid SOP Library (UI-08)
Nhấn|Press
để đóng|to close
Chẩn đoán AI Judge (UI-07)|AI Judge Diagnostics (UI-07)

Studio quản lý vòng đời Codelab (UI-11)|UI-11: Codelab Lifecycle Operations Studio
← Lưu & Quay về Danh mục Codelabs|← Save & return to Codelab directory
Trung tâm điều hành (UI-09)|Control Center (UI-09)
Kiểm tra bài chạy mẫu (UI-10)|Inspect Sample Runs (UI-10)
+ Tạo bài Lab mới|+ Create new Codelab
Tổng số bài Codelab|Total Codelabs
Thuộc 3 Trụ cột Chương trình Đào tạo|Across the three curriculum pillars
Đã Xuất bản (Active Live)|Published (active)
Hiển thị trên Learner UI-04|Shown on learner UI-04
Bản nháp (Drafts QA)|Drafts
Đang biên soạn trong Studio|Being authored in Studio
Lên lịch / Lưu trữ (Archived)|Scheduled / archived
Chờ kích hoạt & Lịch sử bài lab|Pending activation and Codelab history
🟢 Hoạt động|🟢 Active
📝 Bản nháp|📝 Draft
⏰ Lên lịch|⏰ Scheduled
📦 Lưu trữ|📦 Archived
Doanh nghiệp (Enterprise Client):|Enterprise client:
Trụ cột Chương trình (Master Pillar):|Curriculum pillar:
Trụ cột 1: Nền tảng LLM|Pillar 1: LLM Foundations
Trụ cột 2: Tạo văn bản và quy trình AI|Pillar 2: Text Generation & Workflow AI
Trụ cột 3: Tích hợp quy trình AI|Pillar 3: AI Workflow Integration
Danh mục Bài Codelabs & Trạng thái Vòng đời Vận hành|Codelab directory and lifecycle status
Mã Code|Code
Tiêu đề Bài lab & Trụ cột|Codelab title and pillar
Doanh nghiệp & Lớp học|Enterprise and cohort
Thao tác|Actions
1. Scope, Schedule & Trạng thái Vòng đời|1. Scope, schedule and lifecycle
2. Instructions, Vars CRUD & Scaffold Sync|2. Instructions, variables and scaffolds
3. SOP Assets (3A) & Material Hub (3B)|3. SOP sources (3A) and materials (3B)
4. Tự cân bằng trọng số rubric|4. Auto-Balancing Rubric Weights
5. Thành tích, huy hiệu và chứng nhận|5. Awards, Badges & Certifications
Phạm vi, lịch học, phòng ban và vòng đời Codelab|Tab 1: Codelab Scope, Schedule, Onboarding Departments & Lifecycle State
Cấu hình phạm vi, thời gian vận hành, phòng ban thụ hưởng từ Onboarding và trạng thái vòng đời.|Configure scope, schedule, eligible departments and lifecycle status.
📝 DRAFT (Ẩn đối với Học viên)|📝 DRAFT (hidden from learners)
🟢 ACTIVE (Đã xuất bản lên UI-04)|🟢 ACTIVE (published on UI-04)
⏰ SCHEDULED (Tự mở theo Giờ bắt đầu)|⏰ SCHEDULED (opens at the scheduled start)
📦 ARCHIVED (Lưu trữ lịch sử)|📦 ARCHIVED (history retained)
Doanh nghiệp:|Enterprise Client:
Lớp doanh nghiệp:|Enterprise Cohort:
Chi nhánh / địa điểm:|Branch / Location:
Trụ cột chương trình:|Curriculum Master Pillar:
Trụ cột 1: Nền tảng LLM cho nhân sự nghiệp vụ|Pillar 1: LLM Foundations for Business Users
Trụ cột 3: Tích hợp quy trình AI và tự động hóa|Pillar 3: AI Workflow Integration & Automation
Gói truy cập:|Monetization Access Tier:
Nâng cao · trả phí|ADVANCE Paid
Cơ bản · miễn phí|BASIC Free
ID và mã bài lab:|Lab ID & Code:
Thời gian bắt đầu:|Start Schedule DateTime:
Thời gian kết thúc:|Automated Expiration DateTime:
Tiêu đề Codelab:|Codelab Title:
Target Eligible Departments (Chọn từ danh sách Onboarding Doanh nghiệp):|Eligible departments (from enterprise onboarding):
Business Scenario Brief (Hiển thị ở Learner Task Panel UI-05):|Business scenario (shown on learner task panel UI-05):
Mục tiêu thực hành chính:|Key Practice Objectives:
Năng lực mục tiêu sau bài học:|Post-Lab Target Competency:
Chỉ dẫn hệ thống cho Gemini|System Instructions (Gemini Execution Engine)
System prompt truyền tới Gemini để chấm điểm AI Judge.|System instructions sent to Gemini for AI Judge evaluation.
Cú pháp đơn cách|Monospaced Syntax
Biến prompt động ({variables}):|Dynamic Prompt Variables ({variables}) CRUD:
Liên kết scaffold và rubric:|Scaffold Chips ↔ Rubric Reactive Link:
Toggle tự động cập nhật Rubric|Automatically update rubric
Mục 3A: Nguồn SOP và chỉ mục truy xuất (UI-08)|Section 3A: Ground-Truth SOP Assets & RAG Vector Indexing (UI-08)
+ Đính kèm SOP PDF|+ Attach Official SOP PDF
Tên SOP|SOP title
Số trang|Pages
Số đoạn chỉ mục|Vector Chunks
Thời gian lập chỉ mục|Thời gian Vectorize
📋 Sao chép mã trích dẫn|📋 Copy Citation Path
Mục 3B: Học liệu và danh sách kiến thức|Section 3B: Facilitator Codelab Material & Knowledge Checklist
URL / đường dẫn|URL / Path
Version & Ngày cập nhật|Version and updated date
Nhật ký thay đổi|Change log
Tự cân bằng trọng số rubric|Smart Auto-Balancing Rubric Weights
Chạy thử prompt trong sandbox|Prompt Sandbox Test Runner
Nhà cung cấp Gemini|Gemini Engine
Liên kết trò chơi và khởi động workshop|Live Workshop Gamification & Icebreaker Links
Lưu trữ và chỉnh sửa trực tiếp các liên kết game tương tác Kahoot, Mentimeter poll, Quizizz cho buổi workshop.|Manage Kahoot, Mentimeter, Quizizz and other interactive workshop links.
+ Thêm Quiz / Poll Link|+ Add quiz / poll link
Tên Hoạt động Game/Quiz:|Game / quiz activity name:
Đường dẫn Live Session URL:|Live session URL:
Cấu hình huy hiệu số|Digital Achievement Badges Configuration
Cấu hình biểu tượng Huy hiệu số và thiết lập điều kiện tự động cấp huy hiệu cho Học viên.|Configure badge icons and automatic learner eligibility rules.
+ Thêm Huy hiệu mới|+ Add badge
Tên biểu tượng:|Material Icon Name:
Điều kiện Tự động Cấp (Automated Threshold):|Automatic award threshold:
Xóa Huy hiệu|Delete badge
Quản lý chứng nhận hoàn thành doanh nghiệp|Enterprise Certificate & Completion Governance
Cấu hình tiêu đề phôi chứng chỉ B2B, đơn vị cấp phép, điều kiện tốt nghiệp và đường dẫn mẫu PDF.|Configure certificate title, issuer, completion rules and PDF template URL.
Tiêu đề Chứng chỉ Doanh nghiệp:|Enterprise certificate title:
Đơn vị Cấp Bằng / Ủy ban Đào tạo:|Issuer / training committee:
Quy tắc & Điều kiện Tốt nghiệp (Eligibility Rules):|Completion eligibility rules:
Mẫu Phôi Certificate PDF Template URL:|Certificate PDF template URL:
Mở trang bài làm đầy đủ|Open full learner inspector
Đang gặp khó khăn (>5 lượt chưa đạt)|Stuck (>5 fails)
Khi xác nhận, bài thực hành của bạn sẽ được lưu trong|By confirming, your practice prompts will be logged under
Đang cập nhật hồ sơ…|Updating Roster State...
ROI và thời gian tiết kiệm cần dữ liệu thời gian làm việc và chi phí thực tế.|Hours saved and annual ROI require measured work-time and cost inputs.

Đọc danh sách học viên từ Google Sheets, kiểm tra phòng ban, cấp quyền lớp và đồng bộ hồ sơ vào Supabase.|Seamlessly read B2B employee rosters directly from Google Sheets, parse department hierarchies, provision cohort access, and sync user profile updates to Supabase PostgreSQL.
1. Bám nguồn và trích dẫn SOP (30%):|1. Groundedness & SOP Citation (30%):
2. Nhiệm vụ và vai trò (20%):|2. Task & Role Persona Completion (20%):
3. Tuân thủ định dạng Markdown (20%):|3. Format Adherence - Markdown (20%):
4. Tuân thủ mẫu One-Shot (15%):|4. One-Shot Pattern Compliance (15%):
5. Khả năng thực thi và thời hạn SLA (15%):|5. Business Actionability & SLA (15%):
Chạy thử trong sandbox|Run Test in Sandbox
Danh mục giáo trình|Master Curriculum Directory
Studio biên soạn:|Authoring Studio:
Đích:|Target:
Trước:|Pre:
Sau:|Post:
⚠ Cần chỉnh sửa|⚠ Needs Revision
Cần chỉnh sửa|Needs Revision
Đạt chuẩn|Passed
Đóng bảng điểm|Close scorecard
Quay về không gian làm việc|Return to Workspace
So sánh song song các lượt làm •|Side-by-Side Attempt Comparison •
So sánh song song các lượt làm|Side-by-Side Attempt Comparison
Trang|Page
Đồng bộ gần nhất|Last sync
Bước 1/2: xác nhận hồ sơ|INTREPID ONBOARDING STEP 1 OF 2
Chọn phòng ban đề nghị bên dưới. Yêu cầu sẽ được ghi vào|Select your correct department below. Your request will be flagged in the
nhật ký yêu cầu sửa hồ sơ|Roster Sync Log
để quản trị viên xem xét. Phòng ban được cấp chỉ thay đổi sau khi được duyệt.|for trainer review, but you can proceed immediately.
Phòng ban đề nghị sửa:|Select Correct Department Zone:
Lý do đề nghị sửa hồ sơ (bắt buộc):|Reason / Note for Training Lead (Optional):
Chuyển sang tài khoản công ty|Switch to your official
được cấp quyền.|Google account.
Các tài liệu được nhập thông qua|These documents are ingested via the
và dùng làm nguồn dữ liệu được cấp quyền trong các Codelab.|and served as ground-truth context in your Codelabs.
Quy định bảo vệ khóa|Unmask API Secrets
Các khóa luôn được giữ trên máy chủ.|Secrets remain on the server.
Mở trang provider để thay khóa|Open provider to rotate
50–200 nhân sự|50 - 200 staff
200–1.000 nhân sự|200 - 1,000 staff
Trên 1.000 nhân sự|1,000+ staff
3. Studio|3. Studio
Studio giáo trình (UI-11)|Curriculum Studio (UI-11)
2. Hướng dẫn, biến và khung prompt|2. Instructions, Vars CRUD & Scaffold Sync
3. Nguồn SOP và kho học liệu|3. SOP Assets (3A) & Material Hub (3B)
Bản nháp|DRAFT
Đã lên lịch|SCHEDULED
Đang hoạt động|ACTIVE
Đã lưu trữ|ARCHIVED
Định nghĩa quy tắc bảo vệ dữ liệu và rubric|Governance rules and rubric
Chọn phòng ban đề nghị bên dưới. Yêu cầu được ghi vào|Select the requested department below. Your correction is recorded in the
nhật ký sửa hồ sơ|profile correction log
để quản trị viên xem xét. Quyền được cấp chỉ thay đổi sau khi được duyệt.|for administrator review. Assigned access changes only after approval.
Lý do sửa hồ sơ (bắt buộc):|Reason for correction (required):
Quy định bảo vệ khóa|Credential handling policy
Áp dụng trên máy chủ|server-enforced
Token Generate đã ghi hôm nay|Recorded generation tokens today
Độ trễ Generate đã ghi (trung bình)|Recorded generation latency (average)
Lớp đang chọn · ngày Việt Nam · chỉ Generate|Selected cohort · Vietnam day · Generate only
Lượt thực thi đã ghi|Recorded executions
Lượt có số đo token|Token measurements
Số liệu một phần: 10.000 lượt thực thi đầu tiên|Partial telemetry: first 10,000 executions
`;
