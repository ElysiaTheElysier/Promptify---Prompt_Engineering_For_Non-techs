# Promptify — Mentor Handoff

_Last updated: 2026-09-22_

## 1. Mục tiêu sản phẩm

**Promptify** là nền tảng học Prompt Engineering cho người dùng non-tech/business.

Nguyên tắc sản phẩm chính:

> **Output là đích, kỹ thuật prompt là phương tiện.**

Learner cần:
1. hiểu một bài toán công việc thực tế,
2. tự viết prompt,
3. nhận hỗ trợ về cấu trúc prompt,
4. chạy prompt với LLM thật,
5. nhận AI feedback theo rubric,
6. cải thiện prompt qua nhiều lần thử,
7. so sánh các version.

Instructor cần:
- quản lý Course/Class/Learner,
- quản lý curriculum,
- phân learner vào class,
- theo dõi hoạt động/progress về sau.

---

## 2. Tech stack hiện tại

Frontend:
- React 19
- TypeScript
- Vite 6
- Tailwind CSS

Backend / Data:
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security (RLS)

AI:
- Gemini API
- `/api/generate`
- `/api/evaluate`
- server-side only cho API key

Deployment target:
- Vercel

Version control:
- Git / GitHub

---

## 3. Git baseline hiện tại

Checkpoint ổn định đã được tạo:

```text
Commit:
585b9d68347bb1363c56a1fe27d51601f90b436e

Tag:
pre-vercel-deploy
```

Trạng thái tại checkpoint:
- `npm run build`: PASS
- 8/8 `verify_*.ts`: PASS
- Git working tree: clean
- `main` ahead `origin/main` 1 commit tại thời điểm checkpoint
- `.env` bị ignore
- scanner không phát hiện secret

### Việc cần làm để bàn giao GitHub

Push baseline:

```bash
git push origin main
git push origin pre-vercel-deploy
```

Sau đó thêm mentor vào GitHub repository:

```text
Repository
→ Settings
→ Collaborators
→ Add people
```

Mentor nên làm việc qua branch riêng + Pull Request thay vì sửa trực tiếp `main`.

Ví dụ:

```bash
git checkout -b mentor/<task-name>
```

---

## 4. Environment variables

**Không lưu value thật vào Git.**

Frontend/browser-safe:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-only:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
```

Quy tắc:

- Không commit `.env`.
- Không dùng `VITE_GEMINI_API_KEY`.
- Không đưa Supabase secret/service-role key vào frontend.
- Gemini key từng bị lộ trong quá trình phát triển nên cần dùng key đã rotate.
- Mentor có thể dùng Gemini key riêng để phát triển local.

---

## 5. Authentication

Flow production:

```text
Google OAuth
→ Supabase Auth Session
→ public.users
→ public.users.role
→ Learner / Instructor View
```

Role app:

```text
learner
instructor
admin
```

Nguồn role duy nhất:

```text
public.users.role
```

Không dùng:
- query param,
- demo role,
- localStorage role

Instructor/admin được route vào Instructor flow.

Learner được resolve tiếp qua:

```text
User
→ Learner
→ Active Enrollment
→ Active Class
→ Course
```

---

## 6. Database model chính

Core tables:

```text
users
clients
courses
classes
learners
enrollments
prompt_attempts
```

Curriculum:

```text
course_modules
lessons
lesson_rubric_criteria
lesson_resources
course_instructors
```

Quan hệ chính:

```text
Client 1:N Class
Course 1:N Class
Course 1:N CourseModule
CourseModule 1:N Lesson

User 0..1 Learner
Learner N:M Class through Enrollment

Lesson 1:N RubricCriterion
Lesson 1:N Resource

Learner/Class/Lesson → PromptAttempt
```

### Enrollment semantics

Login **không** đồng nghĩa với enrollment.

```text
Google login
→ User

role=learner
→ Learner profile

Instructor add learner to Class
→ Enrollment(active)
```

Xóa learner khỏi lớp:

```text
enrollment.status = removed
```

Không xóa user/learner record.

Instructor/admin không được tự động tạo learner record.

---

## 7. Curriculum hiện tại

Curriculum đã được chuyển từ static-only sang DB-backed.

Migration curriculum tạo:

```text
2 modules
8 lessons
32 rubric criteria
8 resources
```

Bao gồm:

```text
LAB-01 → LAB-08
```

Các migration liên quan:

```text
004_course_content_management.sql
005_seed_curriculum_specs.sql
```

Các file chính:

```text
src/components/instructor/CourseCurriculumEditor.tsx
src/services/curriculumAdapter.ts
scripts/generate-curriculum-seed.mjs
test/verify_course_curriculum.ts
```

Learner flow ưu tiên curriculum từ Supabase.

Static labs cũ có thể vẫn tồn tại như fallback/legacy; không nên mở rộng thêm logic dựa trên fallback này nếu mục tiêu là production.

---

## 8. Enrollment-based authorization

Migration:

```text
006_enforce_course_enrollment_access.sql
```

Luồng bảo vệ mới:

```text
Instructor thêm learner vào lớp
→ enrollment = active
→ learner mới đọc được Course/Module/Lesson
→ learner mới gọi được AI API cho lesson đó
→ learner mới lưu được prompt_attempts
```

Nếu:
- không enrollment,
- enrollment = removed,
- class không active,

thì learner mất quyền.

Ba lớp bảo vệ:

```text
UI access guard
+
API authorization
+
Supabase RLS
```

API authorization nằm tại:

```text
src/services/apiAuthorizationService.ts
```

Access test:

```text
test/verify_enrollment_access.ts
```

RLS migration 006 đã được apply trực tiếp trên Supabase production và các check bảo mật đã PASS tại thời điểm bàn giao.

---

## 9. AI flow hiện tại

Mục tiêu production:

```text
Learner Prompt
→ /api/generate
→ Gemini
→ AI Output
→ /api/evaluate
→ AI Judge
→ prompt_attempts
→ Version/Compare
```

AI Generate và Evaluate chạy server-side.

### Prompt structure analyzer

Phát hiện 7 thành phần:

```text
Role
Context
Task
Constraint
Output Format
Example
Grounding / Evidence
```

Analyzer:
- chạy local,
- heuristic/regex,
- không gọi LLM mỗi keystroke,
- debounce 500ms,
- trả character offsets để highlight.

Các file chính:

```text
src/services/promptStructureAnalyzer.ts
src/components/prompt/PromptStructurePanel.tsx
```

Editor hiện tại là native `<textarea>`.

---

## 10. Vấn đề AI còn cần xử lý

### Quan trọng: AI Judge fallback giả vẫn còn trong code hiện tại

Trong `HybridView.tsx`, nếu `/api/evaluate` lỗi, code hiện fallback sang:

```text
evaluatePromptRubric(...)
```

rồi tự tạo `AiEvaluationResult`.

Điều này làm UI có thể hiển thị score dù AI Judge thật thất bại.

**Không nên giữ ở production.**

Behavior mong muốn:

```text
Generate thành công
→ output vẫn hiển thị

Evaluate thất bại
→ hiển thị "Không thể đánh giá lúc này"
→ KHÔNG sinh score giả
→ có nút "Thử đánh giá lại"
→ retry thành công thì update cùng attempt
```

### Model persistence

Trong `HybridView.tsx` hiện có chỗ lưu:

```text
model: 'gemini-3.5-flash-lite'
```

bị hard-code.

Cần lưu **actual model used** do server trả về, đặc biệt khi có fallback model.

---

## 11. Prompt learning UX — issue hiện tại

`HybridView.tsx` hiện đã khởi tạo:

```text
promptText = ''
```

nên file này không tự prefill full prompt.

Tuy nhiên `HybridView` truyền:

```text
samplePrompt={currentLab.improvedPrompt}
```

xuống `PromptComposer`.

UI hiện có thể cho learner:
- “Nạp câu lệnh thô”
- “Nạp câu lệnh chuẩn”

Điều này có nguy cơ làm hộ learner quá nhiều.

### UX direction mong muốn

Default:

```text
Learner tự viết prompt
```

Hỗ trợ theo 3 mức:

```text
1. Tự làm
2. Gợi ý cấu trúc
3. Xem prompt mẫu
```

Không tự nạp full sample prompt vào editor.

Các structure chips chỉ nên insert scaffold ngắn:

```text
Vai trò:
Bối cảnh:
Nhiệm vụ:
Ràng buộc:
Đầu ra mong muốn:
```

Sample chuẩn nên:
- nằm trong modal/collapse,
- chỉ hiện khi learner chủ động yêu cầu,
- không tự ghi đè prompt hiện tại.

### Readability

Màn lesson hiện khá dày thông tin.

Hướng giảm cognitive load:

```text
LEFT
- Mục tiêu
- Tình huống ngắn
- Yêu cầu
- Xem dữ liệu (collapse)

RIGHT
- Prompt composer
- Structure hints
- Run Prompt

AFTER RUN
- AI Output
- AI Feedback
- Compare
```

Các component cần xem:

```text
src/components/hybrid/HybridView.tsx
src/components/prompt/PromptComposer.tsx
src/components/prompt/PromptStructurePanel.tsx
src/components/lesson/LessonBriefPanel.tsx
```

---

## 12. Prompt attempts / versioning

Mỗi lần learner chạy prompt:

```text
Prompt
AI Output
Evaluation
Attempt number
Model
Latency
```

được lưu vào:

```text
public.prompt_attempts
```

Curriculum mới có:

```text
lesson_ref_id
```

để liên kết attempt với lesson DB thật.

Versioning/Compare nên ưu tiên data thật từ `prompt_attempts`, không dùng simulated outputs.

---

## 13. Instructor flow

Đã có:

- Course CRUD
- Class management
- Learner CRUD
- Enrollment management
- Curriculum editor
- Module/Lesson/Rubric/Resource management

Nguyên tắc:

```text
Course = nội dung tái sử dụng
Class = một lần triển khai course cho client cụ thể
```

Client/Class cần giữ:
- company/client
- industry
- class code
- department
- start/end
- status

---

## 14. Known technical debt / cần mentor audit lại

Ưu tiên cao:

1. Xóa fake AI evaluation fallback.
2. Persist actual model used.
3. Xác nhận `prompt_attempts` luôn ghi Supabase thật khi production; không âm thầm giả success bằng local fallback.
4. Manual E2E test với authenticated Supabase session.
5. Manual test authorization:
   - enrolled learner,
   - unenrolled learner,
   - removed learner,
   - inactive class.
6. Review PromptComposer UX để tránh viết hộ learner.
7. Review lesson readability.
8. Deploy Vercel.
9. Production OAuth redirect config.
10. Test public deployment.

Ưu tiên sau:

- Instructor progress/KPI thật từ attempts.
- Activity stream thật.
- Prompt library persistence.
- Bundle optimization.
- Better routing (current app historically used manual state routing rather than React Router).

---

## 15. Migrations

Repository cần giữ thứ tự migration:

```text
002_add_grants_and_rls.sql
003_create_prompt_attempts.sql
004_course_content_management.sql
005_seed_curriculum_specs.sql
006_enforce_course_enrollment_access.sql
```

Không rerun migration cũ một cách mù quáng.

Mọi schema change mới phải tạo migration mới.

---

## 16. Test / validation

Baseline đã PASS 8 `verify_*.ts`.

Các test quan trọng gồm:

```text
verify_slice.ts
verify_logout.ts
verify_tab_switch.ts
verify_oauth_enrollment.ts
verify_prompt_analyzer.ts
verify_real_ai_flow.ts
verify_course_curriculum.ts
verify_enrollment_access.ts
```

Sau mọi thay đổi quan trọng:

```bash
npm run build
```

và chạy test liên quan.

Không coi TypeScript compile thành công là đủ cho:
- OAuth,
- RLS,
- DB persistence,
- AI API,
- authorization.

Cần manual E2E khi có thể.

---

## 17. Supabase handoff

Supabase project hiện thuộc account của project owner.

**Mentor không cần mật khẩu/email account của owner.**

Cách bàn giao đúng:
- mời mentor vào Supabase organization/team,
- cấp role phù hợp,
- không share password,
- không share personal access token.

Nếu chỉ cần code:
- GitHub collaborator là đủ.

Nếu cần:
- SQL Editor,
- Table Editor,
- Auth config,
- RLS,
- migration verification,

thì mentor cần Supabase Dashboard access.

Khuyến nghị role:

```text
Developer
```

trừ khi mentor thực sự cần quyền admin/owner.

Nếu Supabase plan không hỗ trợ project-scoped role, organization-level Developer có thể thấy các project trong organization. Cần kiểm tra trước khi invite nếu organization chứa project khác.

---

## 18. GitHub handoff

Mentor nên được add làm GitHub collaborator.

Workflow đề xuất:

```text
main = protected/stable

mentor/<task>
→ commit
→ push
→ Pull Request
→ review
→ merge
```

Không làm trực tiếp trên `main` nếu không cần.

---

## 19. Deployment handoff

Target: Vercel.

Production environment variables cần cấu hình trên Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
GEMINI_API_KEY
GEMINI_MODEL
```

Sau deploy:
- cập nhật Supabase Auth Site URL / Redirect URLs,
- giữ localhost redirect cho local dev,
- kiểm tra Google OAuth production origin/callback,
- test API authorization trên domain thật.

---

## 20. Production acceptance checklist

### Instructor

```text
Login
→ đúng identity
→ Course CRUD
→ Class CRUD
→ Add learner
→ Enrollment active
→ Curriculum editor
```

### Enrolled learner

```text
Login
→ đúng class/course
→ thấy modules/lessons
→ tự viết prompt
→ structure highlight
→ Run Prompt
→ AI output thật
→ AI evaluation thật
→ prompt_attempts row thật
→ V2
→ Compare
```

### Unenrolled learner

```text
Login
→ không thấy curriculum
→ không mở lesson bằng URL/session cũ
→ /api/generate bị từ chối
→ /api/evaluate bị từ chối
→ prompt_attempts insert bị từ chối
```

### Removed learner

```text
Instructor remove learner
→ enrollment = removed
→ learner refresh
→ mất access ngay
```

---

## 21. Security rules

Không:
- commit `.env`,
- share owner password,
- expose Gemini key,
- expose Supabase service-role key,
- dùng localStorage làm auth source,
- tin UI guard như security boundary,
- tạo fake score nếu AI Judge lỗi.

Source of truth bảo mật:

```text
Supabase Auth
+
public.users.role
+
Enrollment
+
RLS
+
API authorization
```

---

## 22. First task đề xuất cho mentor

Audit + sửa riêng task:

```text
Remove fake AI Judge fallback
```

Expected behavior:

```text
Generate success
→ output visible

Evaluate fail
→ explicit failure state
→ no fake score
→ Retry Evaluation button
→ same attempt updated when successful
```

Không redesign hoặc refactor subsystem khác trong cùng task.

---

## 23. Quy tắc khi tiếp quản

Trước mỗi task:

1. `git status`
2. đọc file liên quan
3. xác định root cause
4. thay đổi nhỏ nhất có thể
5. `npm run build`
6. chạy test liên quan
7. báo file đã sửa
8. báo remaining risk

Nếu documentation mâu thuẫn với code:

> **Code hiện tại thắng, nhưng phải ghi lại sự khác biệt.**
