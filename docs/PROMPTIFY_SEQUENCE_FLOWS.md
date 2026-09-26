# Promptify — Sơ đồ tuần tự

Các sơ đồ mô tả flow hiện tại của người học và instructor. Phần nghiệp vụ dành cho người đọc sản phẩm; phần kỹ thuật dành cho đội phát triển.

## Người học

### 1. Learner Access Flow

**Trả lời câu hỏi:** Người học vào đúng lớp và lộ trình của mình như thế nào?

~~~mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#ffffff","primaryColor":"#f0fdfa","primaryBorderColor":"#a7d8ca","primaryTextColor":"#153a32","actorBkg":"#f0fdfa","actorBorder":"#a7d8ca","actorTextColor":"#153a32","signalColor":"#528577","signalTextColor":"#25473e","noteBkgColor":"#f8fafc","noteBorderColor":"#dbe5e1"},"sequence":{"actorMargin":90,"messageMargin":36,"diagramMarginX":28,"diagramMarginY":28}}}%%
sequenceDiagram
    actor Learner as Người học
    participant App as Promptify
    participant Access as Quyền học
    participant Path as Lộ trình

    Learner->>App: Đăng nhập
    App->>Access: Kiểm tra quyền học
    Access-->>App: Các lớp được vào
    App-->>Learner: Hiện danh sách lớp
    Learner->>App: Chọn lớp
    App->>Path: Mở lộ trình của lớp
    Path-->>Learner: Hiện các bài học
~~~

### 2. Learner Learning Flow

**Trả lời câu hỏi:** Người học đi từ bài tập đến kết quả tốt hơn ra sao?

~~~mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#ffffff","primaryColor":"#f0fdfa","primaryBorderColor":"#a7d8ca","primaryTextColor":"#153a32","actorBkg":"#f0fdfa","actorBorder":"#a7d8ca","actorTextColor":"#153a32","signalColor":"#528577","signalTextColor":"#25473e","noteBkgColor":"#f8fafc","noteBorderColor":"#dbe5e1"},"sequence":{"actorMargin":90,"messageMargin":36,"diagramMarginX":28,"diagramMarginY":28}}}%%
sequenceDiagram
    actor Learner as Người học
    participant Lesson as Bài học
    participant AI as AI
    participant Feedback as Đánh giá
    participant Compare as So sánh

    Learner->>Lesson: Chọn bài
    Lesson-->>Learner: Xem nhiệm vụ và dữ liệu
    Learner->>Lesson: Viết prompt, bấm Chạy AI
    Lesson->>AI: Gửi prompt
    AI-->>Lesson: Trả output
    Lesson-->>Learner: Hiện output
    Lesson->>Feedback: Chấm kết quả
    Feedback-->>Learner: Điểm và gợi ý
    Learner->>Lesson: Cải thiện prompt, chạy lại
    Lesson->>AI: Gửi prompt mới
    AI-->>Lesson: Trả output mới
    Lesson-->>Learner: Hiện output mới
    Learner->>Compare: Chọn so sánh hai lần thử
    Compare-->>Learner: Hiện khác biệt và tiến bộ
~~~

### 3. Technical Run Flow

**Trả lời câu hỏi:** Một lần chạy AI được xác thực, đánh giá và lưu ở đâu?

~~~mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#ffffff","primaryColor":"#f0fdfa","primaryBorderColor":"#a7d8ca","primaryTextColor":"#153a32","actorBkg":"#f0fdfa","actorBorder":"#a7d8ca","actorTextColor":"#153a32","signalColor":"#528577","signalTextColor":"#25473e","noteBkgColor":"#f8fafc","noteBorderColor":"#dbe5e1"},"sequence":{"actorMargin":90,"messageMargin":36,"diagramMarginX":28,"diagramMarginY":28}}}%%
sequenceDiagram
    participant Web as Frontend
    participant Auth as Auth
    participant DB as Supabase
    participant Gen as /api/generate
    participant LLM as LLM
    participant Eval as /api/evaluate

    Web->>Gen: Prompt + class + lesson
    Gen->>Auth: Xác thực user
    Gen->>DB: Kiểm tra quyền vào lesson
    Gen->>LLM: Tạo output
    LLM-->>Gen: Output
    Gen-->>Web: Output + model
    Web->>Eval: Prompt + output + tiêu chí
    Eval->>Auth: Xác thực user
    Eval->>DB: Kiểm tra quyền vào lesson
    Eval->>LLM: Chấm theo rubric
    LLM-->>Eval: Điểm + feedback
    Eval-->>Web: Kết quả đánh giá
    Web->>DB: RPC lưu attempt + progress
    DB-->>Web: Xác nhận đã lưu
~~~

Progress chỉ được xác nhận khi RPC lưu thành công. Nếu evaluation lỗi, flow hiện tại vẫn có thể lưu attempt với evaluation rỗng; không tạo điểm giả.

## Instructor

### 4. Instructor Business Flow

**Trả lời câu hỏi:** Instructor theo dõi lớp và xem chi tiết một học viên như thế nào?

~~~mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#ffffff","primaryColor":"#f0fdfa","primaryBorderColor":"#a7d8ca","primaryTextColor":"#153a32","actorBkg":"#f0fdfa","actorBorder":"#a7d8ca","actorTextColor":"#153a32","signalColor":"#528577","signalTextColor":"#25473e","noteBkgColor":"#f8fafc","noteBorderColor":"#dbe5e1"},"sequence":{"actorMargin":90,"messageMargin":36,"diagramMarginX":28,"diagramMarginY":28}}}%%
sequenceDiagram
    actor Instructor as Instructor
    participant Home as Dashboard
    participant Class as Lớp học
    participant Learner as Học viên

    Instructor->>Home: Đăng nhập, mở dashboard
    Home-->>Instructor: Hiện các lớp quản lý
    Instructor->>Class: Chọn một lớp
    Class-->>Instructor: Học viên, tiến độ, hoạt động mới
    Instructor->>Learner: Chọn một học viên
    Learner-->>Instructor: Lần làm, điểm, feedback
~~~

### 5. Instructor Admin Flow

**Trả lời câu hỏi:** Instructor cập nhật lớp, học viên và nội dung học ra sao?

~~~mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#ffffff","primaryColor":"#f0fdfa","primaryBorderColor":"#a7d8ca","primaryTextColor":"#153a32","actorBkg":"#f0fdfa","actorBorder":"#a7d8ca","actorTextColor":"#153a32","signalColor":"#528577","signalTextColor":"#25473e","noteBkgColor":"#f8fafc","noteBorderColor":"#dbe5e1"},"sequence":{"actorMargin":90,"messageMargin":36,"diagramMarginX":28,"diagramMarginY":28}}}%%
sequenceDiagram
    actor Instructor as Instructor
    participant Classes as Quản lý lớp
    participant Content as Nội dung học
    participant App as Promptify

    Instructor->>Classes: Mở lớp cần quản lý
    Instructor->>Classes: Sửa lớp hoặc ghi danh học viên
    Instructor->>Content: Sửa khóa, bài hoặc phân bổ nội dung
    Instructor->>App: Lưu thay đổi
    App-->>Instructor: Hiện dữ liệu đã cập nhật
~~~

Các thao tác quản lý phụ thuộc quyền instructor hoặc admin được cấp cho dữ liệu tương ứng.

### 6. Instructor Technical Flow

**Trả lời câu hỏi:** Dashboard lấy và ghép chỉ số thật từ nguồn nào?

~~~mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#ffffff","primaryColor":"#f0fdfa","primaryBorderColor":"#a7d8ca","primaryTextColor":"#153a32","actorBkg":"#f0fdfa","actorBorder":"#a7d8ca","actorTextColor":"#153a32","signalColor":"#528577","signalTextColor":"#25473e","noteBkgColor":"#f8fafc","noteBorderColor":"#dbe5e1"},"sequence":{"actorMargin":90,"messageMargin":36,"diagramMarginX":28,"diagramMarginY":28}}}%%
sequenceDiagram
    participant Web as Instructor View
    participant Auth as Auth
    participant DB as Supabase
    participant UI as Dashboard

    Web->>Auth: Xác thực phiên đăng nhập
    Auth-->>Web: Người dùng hợp lệ
    Web->>DB: Kiểm tra role instructor/admin
    DB-->>Web: Role hợp lệ
    Web->>DB: Đọc lớp được quản lý
    DB-->>Web: Classes + courses
    Web->>DB: Đọc học viên và curriculum
    DB-->>Web: Enrollments + lessons
    Web->>DB: Đọc prompt_attempts
    DB-->>Web: Lịch sử chạy
    Web->>DB: Đọc lesson_progress
    DB-->>Web: Tiến độ hiện tại
    Web->>UI: Map dữ liệu cho dashboard
    UI-->>Web: Chỉ số lớp và học viên
~~~

## Nguồn dữ liệu chính

| Nội dung | Nguồn dữ liệu |
| --- | --- |
| Quyền truy cập lớp | `users` -> `learners` -> `enrollments` -> `classes` |
| Nội dung học | `courses` -> `course_modules` -> `lessons` -> `lesson_resources` / `lesson_rubric_criteria` |
| Lịch sử từng lần chạy | `prompt_attempts` |
| Trạng thái tiến độ hiện tại | `lesson_progress` |
| AI output và evaluation | `/api/generate` và `/api/evaluate`, với quyền được xác minh trước khi gọi model |
| Dashboard instructor | `classes`, `enrollments`, curriculum, `prompt_attempts`, `lesson_progress` qua RLS |
