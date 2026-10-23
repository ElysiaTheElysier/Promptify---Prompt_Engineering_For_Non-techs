# Historical one-off audit template (2026-10-05), not a current-state verifier.
from pathlib import Path
import re,json,hashlib,subprocess
R=Path(__file__).resolve().parents[2]; O=R/'outputs/historical-audit'; O.mkdir(parents=True,exist_ok=True)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
common=f'> Audit ngày 2026-10-05 · local `main` · commit `{head}`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.\n\n'
def put(name,title,body): (O/name).write_text('# '+title+'\n\n'+common+body.strip()+'\n',encoding='utf-8')
def ref(path,needle):
 s=(R/path).read_text(encoding='utf-8-sig').splitlines()
 n=next((i for i,l in enumerate(s,1) if needle in l),1)
 return f'`{path}:{n}`'
def table(headers,rows):
 return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+''.join('| '+' | '.join(str(x).replace('\n',' ').replace('|','\\|') for x in row)+' |\n' for row in rows)
files=[]
for folder in ['src','api','supabase','test','curriculum-levels','curriculum-specs']:
 for p in sorted((R/folder).rglob('*')):
  if p.is_file() and p.suffix in ['.ts','.tsx','.sql','.md','.json','.css']:
   s=p.read_text(encoding='utf-8-sig'); files.append((p.relative_to(R).as_posix(),s))
overview='''## 1. Hệ thống hiện tại

Promptify là webapp đào tạo và thực hành viết prompt cho người dùng nghiệp vụ. Người học đăng nhập Google, vào lớp được ghi danh hoặc tự tham gia lớp public, đọc bài, viết prompt, chạy AI và xem chấm điểm. Giảng viên quản lý nội dung khóa học và enrollment; dashboard tổng hợp các lần chạy và lesson progress. UI hiện chủ yếu tiếng Việt; có biến cấu hình lớp review, không suy diễn thành nền tảng đa ngôn ngữ hoàn chỉnh.

## 2. Cấu trúc repo và trách nhiệm

| Đường dẫn | Trách nhiệm hiện tại |
| --- | --- |
| `src/main.tsx` | Mount React App, CSS |
| `src/App.tsx` | Auth/session, role routing, chọn lớp, tải curriculum/progress, navigation qua React state + URL lesson + sessionStorage |
| `src/components/hybrid` | Workspace bài học đang được mount |
| `src/components/lesson`, `prompt`, `common` | Brief/theory/hints/solution, editor, structure, compare, save library, coach, walkthrough |
| `src/components/dashboard`, `classes`, `history`, `library` | Màn hình learner |
| `src/components/instructor` | Dashboard/class/activity, learner enrollment CRUD, course/curriculum editor |
| `src/services` | Supabase repository, AI client/server/access guard, analysis/compliance, curriculum adapter, URL/tutorial config |
| `src/types` | UI/domain types, DB DTO, instructor DTO; có vocabulary khác nhau |
| `src/data` | Generated curriculum seed + alias helper; static fallback |
| `api` | Hai POST serverless handlers generate/evaluate |
| `supabase` | Baseline SQL, 16 migrations 002–017, rollback và staging probes |
| `curriculum-specs` | 8 LAB Markdown + đặc tả tương tác; generator dùng LAB files để seed |
| `curriculum-levels` | 22 bài giáo trình Markdown; không tương đương 22 lesson đang được publish trong DB |
| `scripts/generate-curriculum-seed.mjs` | Sinh `curriculumSeed.ts` và migration seed; không chạy khi audit |
| `test` | 27 script TS, đa số kiểm tra source text/heuristics hoặc repository fallback |
| `vercel.json`, `vite.config.ts` | Rewrite SPA/API; dev middleware cho hai AI endpoints |

## 3. Stack

`package.json`: React/ReactDOM ^19.0.0; TypeScript ^5.7.3; Vite ^6.2.0; Tailwind ^3.4.17; Supabase JS ^2.116.0; Floating UI ^0.27.20; Lucide ^1.16.0. Dev tools: tsx, PostCSS, Autoprefixer, Vite React plugin. Đây là dải khai báo; phiên bản resolved nằm trong package-lock.

Không có React Router, Redux, ORM hoặc backend framework riêng trong dependencies. `App.tsx` điều hướng bằng state, `lessonUrlState.ts` quản lý query lesson. Browser truy cập Supabase Data API trực tiếp với JWT; API server không làm repository CRUD và không lưu output vào DB. Sau AI response, frontend gọi RPC để lưu.

`tsconfig.json` bật strict nhưng include chỉ `src`: build TypeScript không chứng minh `api`, Vite config hoặc test TS được typecheck. noUnusedLocals/noUnusedParameters tắt. Vite build gồm client bundle, không là chứng nhận compile/deploy Vercel functions.

## 4. Runtime, config và deployment

| Biến | Nơi dùng | Tác dụng |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | supabaseClient | Public browser config; URL được bỏ suffix `/rest/v1` và trailing slash |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | API authorization | Server auth client; fallback sang VITE names |
| `VITE_REVIEW_CLASS_CODE` | App | Lọc lớp review trong UI |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | apiServerService | Server-only provider priority và model |
| `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL` | apiServerService | Server-only Gemini key và model generation |
| `NODE_ENV` | apiServerService | Giảm diagnostic judge ở production |
| `STAGING_*` | staging test | Disposable DB verification; không chạy audit |

`.env` được gitignore và không có trong git index ở mốc audit. Không đọc/in ra giá trị secret. Không kiểm chứng toàn bộ lịch sử Git chứa secret hay config Vercel/Supabase console.

`vite.config.ts` loadEnv với prefix rỗng rồi gán process.env để middleware server dùng keys; browser Vite chỉ expose VITE variables theo cơ chế mặc định. `vercel.json` rewrite `/api/*` và SPA catch-all. Dev server port 5173 host=true. Không thấy CI workflow trong file Git tracked tại mốc kiểm tra; SQL deploy không tự động gắn vào npm build. Repo không có `supabase/config.toml` trong inventory hiện tại.

## 5. Source of truth

| Dữ liệu | Nguồn chính | Ngoại lệ |
| --- | --- | --- |
| Auth/session | Supabase Auth | UI cache không cấp quyền |
| Role/profile, learner, enrollment, class, client, course | public Postgres tables qua RLS | LocalDbStore chỉ fallback khi Supabase chưa configured |
| Lesson content | Published curriculum DB | App dùng LABS_DATA khi load lỗi/rỗng; adapter thêm seed illustration |
| Attempt/output/evaluation | prompt_attempts | Local store trong repository test; simulated run không ghi DB |
| Lesson completion/count/best | lesson_progress, trigger + RPC | App chỉ mirror confirmed completion trong memory |
| Tutorial completion | user_tutorial_progress | Khi không config DB, read=false và complete no-op |
| History screen | promptify_history localStorage | Không tự hydrate từ server attempts |
| Saved library/recommended | promptify_saved_library localStorage | Seed SOP khi chưa có cache; không có table library |
| Hints/solution unlocked | promptify_lab_assistance localStorage | Không phân account/class |
| Navigation | URL lesson, sessionStorage, React state | Một số localStorage cache cũ vẫn ghi |

## 6. Đối chiếu tài liệu

| Nguồn | Claim/định hướng | Code/SQL hiện tại |
| --- | --- | --- |
| README Features v1 | Chọn nhanh tài khoản mẫu, dual Hybrid/Notebook, lộ trình 5 bài | Login Google thật; App chỉ mount Hybrid; lesson count theo DB và seed, không cố định 5 |
| README/HANDOFF | 22 modules giáo trình | 22 Markdown là tài liệu; runtime lấy modules/lessons published qua DB |
| TEST_PLAN_AND_EXECUTION_LOG | 24/24 auto pass; checklist manual còn UNTESTED | Hiện 27 scripts, audit chạy 22; số cũ không là runtime evidence |
| Test plan Instructor | Realtime activity và xem detail prompt | Shell fetch/sort snapshot; không subscription realtime. Learner detail modal tồn tại nhưng không được table mount |
| docs/server-backed-progress-rollout.md | RPC + trigger, rollout 016 rồi deploy rồi 017 | Khớp code hiện tại; không chứng minh production đã apply |
| Rollout doc | Có rollback_english_review.sql | File này không có trong inventory local hiện tại; không dùng như artifact khả dụng |
| Mentor handoff | Historical production checks và work còn làm | Historical statements; dùng code mới làm chuẩn, không coi future list đã implement |
| BRD/PRD/SAD, docs/PROMPTIFY_UX_DIRECTION_V2.md, design-drafts | Future/Proposal document hoặc sản phẩm pha trước | Loại khỏi nguồn As-Is; không đọc Refined BRD |

## 7. Phạm vi bằng chứng và giới hạn

Audit gồm code paths, declarations/call sites, full SQL chain và test execution local. Inventory bên dưới ghi path/line count/hash để tái hiện; không đồng nghĩa manual review mọi dòng CSS/copy. Nội dung curriculum seed được đối chiếu theo generator, lesson keys và migration content; không dùng copy như feature thực thi. Tài liệu technical/product có đoạn future được tách khỏi kết luận. Không chạy SQL, không đăng nhập production, không chứng nhận provider availability hoặc deployed revision.
'''
overview+='\n## 8. Inventory source/data/test/SQL đã kiểm kê\n\n'+table(['File','Lines','SHA256 (12 ký tự)'],[(p,len(s.splitlines()),hashlib.sha256(s.encode()).hexdigest()[:12]) for p,s in files])
put('01_SYSTEM_OVERVIEW.md','As-Is System Overview',overview)
features=[
('Google Login','Real','auth/LandingLoginScreen.tsx; App.tsx','Supabase Auth/users','Cần OAuth config/redirect thực tế'),
('Role routing learner/instructor/admin','Real','App.tsx; schema.sql','users.role','Admin dùng cùng shell instructor'),
('Class selection và đổi lớp','Real','App.tsx; classes/ClassSelectionScreen.tsx','enrollments/classes','UI filter không thay thế quyền DB'),
('Self enrollment public','Real','dbService; migration 012','learners/enrollments RPC','Có thời gian class; removed có thể được active lại'),
('Course/module/lesson published','Real','dbService; curriculumAdapter','DB + static fallback','Fallback có thể khác lớp được chọn'),
('Learner home/path/progress','Real','dashboard; App','lesson_progress','Completion là persisted run, không là mastery'),
('Prompt Playground trong Hybrid','Real','hybrid/HybridView; PromptComposer','Draft state; saved attempts','Không mount PlaygroundView độc lập'),
('Live AI generation','Real','llmService; api/generate; apiServerService','Output qua RPC frontend','Provider/config production chưa xác minh'),
('AI Evaluation + retry','Real','HybridView; api/evaluate; contract','evaluation_json; progress best_score','Client gửi rubric/context và ghi score; không có ký server'),
('Prompt Structure / highlight','Real','promptStructureAnalyzer; PromptStructurePanel','Browser derived state','Regex/heuristic 7 components, không LLM'),
('AI Coach','Partial','common/AiCoach; llmService.evaluatePromptRubric','Browser messages/local dismissal','Rule-based chat và gợi ý; không conversational LLM'),
('Inline autocomplete / diff suggestions','Real','PromptComposer; labComplianceService','Draft state','Keyword/template và judge scores, không code completion model'),
('Hints','Real','LessonBriefPanel; HybridView','DB hints + browser unlock','Không có analytics trợ giúp server'),
('Solution / reference prompt','Real','LessonBriefPanel; HybridView','DB improved_prompt + local unlock','DB adapter không giữ toàn bộ rich solution metadata từ seed'),
('PII detect/redact','Partial','labComplianceService; HybridView; PromptComposer','Browser heuristic','Tên mẫu cố định/regex; không hard block API/provider'),
('Attempts/version restore','Real','HybridView; dbService RPC','prompt_attempts','Canonical UUID cần DB curriculum khớp; system text không lưu'),
('Compare hai lượt chạy','Real','HybridView; ABCompareModal','Attempts + memory','Nhận xét business là heuristic; có demo fallback'),
('Before/After reference compare','Mock','DiffCompareModal; ABCompareModal','Static seed/sample','App wrapper không truyền versions thật'),
('History/export/clear','Partial','history/PromptHistoryView; App','localStorage + Markdown file','Không account/class scoped; clear không delete DB attempts'),
('Library save/search/star/copy','Partial','businessEvaluationService; library; SavePromptModal','localStorage','Không server/team sharing; browser chung dùng chung'),
('Open library prompt in workspace','Partial','App.handleOpenInPlayground/PromptLibraryModal','App.activePrompt','Không truyền prompt vào Hybrid editor props; điều hướng/copy dùng được'),
('Tutorial learner/instructor','Real','GuidedWalkthrough; InstructorWalkthrough; migration007','user_tutorial_progress','Close cũng được ghi completed; demo action không là attempt'),
('Instructor dashboard/KPI','Real','InstructorViewShell; InstructorDashboard','DB progress/enrollment snapshot','Global role scope; phần trăm và enrollment completion khác nghĩa'),
('Instructor classes list/detail','Real','InstructorViewShell; ClassDetailView','classes/courses/clients','Không thấy UI create/update class'),
('Learner enrollment add/edit/remove','Real','LearnerTableView; AddLearnerModal; dbService','users/learners/enrollments','Remove đổi status; CRUD nhiều request không atomic'),
('Activity stream','Partial','InstructorViewShell; ActivityStreamView','prompt_attempts snapshot','Không realtime subscription; tải toàn bộ rồi xử lý client'),
('Course/curriculum management','Real','CourseManagementModal; CourseCurriculumEditor','DB content tables','Rubric/resources replace delete rồi insert; permission assignments không enforce riêng'),
('Expiration/access by end date','Partial','App expiry values; migration006/012','class dates/enrollment status','Self-enroll kiểm ngày; active-access helper không kiểm ngày'),
('Live/simulated mode switch','Real','ApiKeyModal; llmService; HybridView','local config','Simulation không judge, attempt hoặc completion'),
('Simulated AI output','Mock','llmService.executeSimulatedPromptStream','Static output','Không gọi provider; không là kết quả học thật'),
('Notebook workspace','Partial','notebook/*; App','Legacy state code','Có code nhưng không reachable từ App hiện tại'),
('Instructor learner detail/reminder','Mock','instructor/LearnerDetailModal.tsx','State toast + LABS_DATA','Legacy/unmounted: gửi reminder chỉ set state, không email'),
('Instructor assignments permission','Partial','migration004 course_instructors','DB table','Không thấy UI assignment, RLS chỉ global is_instructor'),
]
counts={k:sum(r[1]==k for r in features) for k in ['Real','Partial','Mock']}
put('02_FEATURE_INVENTORY.md','As-Is Feature Inventory','''## Phương pháp phân loại

**Real**: có đường thực thi chức năng thật trong code hiện tại (không khẳng định production đã chạy). **Partial**: có một phần thực thi hoặc kết nối thiếu/giới hạn lớn. **Mock**: output/demo/toast dựng sẵn; hàng legacy ghi rõ không reachable. Đây là các đơn vị capability audit, không số tickets/product features được ký nghiệm thu. Một feature local heuristic vẫn Real nếu đúng chức năng rule-based; tên “AI” không biến nó thành LLM.

'''+f'Tổng {len(features)} capability: **{counts["Real"]} Real / {counts["Partial"]} Partial / {counts["Mock"]} Mock**. Các hàng tách chế độ/legacy để tránh trộn demo với live.\n\n'+table(['Feature','Current status','Where implemented (src/components hoặc src/services nếu viết ngắn)','Persistence','Known limitation'],features)+'\n## Những thứ không có bằng chứng implementation\n\nKhông thấy table library/history riêng, dịch vụ email reminder thực, tenant isolation theo client/course assignment, UI quản lý admin riêng, server API curriculum CRUD, upload/storage pipeline cho resource_type=file, CI gate tích hợp, hoặc realtime subscription dashboard. Đây là kết luận tìm kiếm repo local, không khẳng định cấu hình ngoài repo.\n')
# Split SQL statements without splitting dollar-quoted content or quoted strings.
def statements(s):
 out=[]; start=0; i=0; quote=None; dollar=None; line=False; block=False
 while i<len(s):
  if line:
   if s[i]=='\n': line=False
   i+=1; continue
  if block:
   if s[i:i+2]=='*/': block=False;i+=2
   else:i+=1
   continue
  if dollar:
   if s.startswith(dollar,i): i+=len(dollar);dollar=None
   else:i+=1
   continue
  if quote:
   if s[i]==quote:
    if i+1<len(s) and s[i+1]==quote:i+=2;continue
    quote=None
   i+=1;continue
  if s[i:i+2]=='--':line=True;i+=2;continue
  if s[i:i+2]=='/*':block=True;i+=2;continue
  if s[i] in "'\"":quote=s[i];i+=1;continue
  if s[i]=='$':
   m=re.match(r'\$[A-Za-z_0-9]*\$',s[i:])
   if m:dollar=m.group();i+=len(dollar);continue
  if s[i]==';':out.append((start,s[start:i+1]));start=i+1
  i+=1
 return out
sqlfiles=[R/'supabase/schema.sql']+sorted((R/'supabase/migrations').glob('*.sql'))
effective={}; tables={}; alterations=[]; indexes={}; triggers={}; functions={}; ddl=[]
for p in sqlfiles:
 s=p.read_text(encoding='utf-8-sig')
 for off,st in statements(s):
  # strip comments only from leading part, preserve function definitions unchanged
  clean=re.sub(r'\A(?:\s|--[^\n]*(?:\n|$)|/\*[\s\S]*?\*/)*','',st)
  line=s[:off].count('\n')+1
  actual=st.find(clean); line+=st[:actual].count('\n') if actual>=0 else 0
  location=f'{p.relative_to(R).as_posix()}:{line}'
  if re.match(r'CREATE TABLE',clean,re.I):
   m=re.search(r'CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?(\w+)',clean,re.I)
   if m: tables[m[1]]=(location,clean)
  if re.match(r'ALTER TABLE',clean,re.I) and not re.search(r'ENABLE ROW LEVEL SECURITY',clean,re.I):alterations.append((location,clean))
  m=re.match(r'CREATE POLICY\s+"([^"]+)"',clean,re.I)
  if m:effective[m[1]]=(location,clean)
  m=re.match(r'CREATE (?:UNIQUE )?INDEX(?: IF NOT EXISTS)?\s+(\w+)',clean,re.I)
  if m:indexes[m[1]]=(location,clean)
  m=re.match(r'CREATE TRIGGER\s+(\w+)',clean,re.I)
  if m:triggers[m[1]]=(location,clean)
  m=re.match(r'CREATE(?: OR REPLACE)? FUNCTION\s+(?:public\.)?(\w+)',clean,re.I)
  if m:functions[m[1]]=(location,clean)
migrations=[('schema.sql','Baseline 6 business tables, code sequence, timestamp/protection triggers, seeds, grants/RLS'),('002','Hardening grants/RLS và identity helpers; trùng baseline security'),('003','prompt_attempts + indexes + SELECT/INSERT/DELETE policies'),('004','Course publishing metadata, 5 content/assignment tables, nullable lesson_ref_id, RLS/index/timestamps'),('005','Generated seed 8 LAB specs + modules/rubrics/resources vào courses hiện có'),('006','Active enrollment helpers, course/class/content SELECT và attempt INSERT tightening'),('007','user_tutorial_progress + own-account RLS'),('008','Seed Internal client, tester course/class, 6 tester lessons/rubrics; không enroll user'),('009','Điền reference prompts tester; sau đó bị 013 sửa nội dung'),('010','UPDATE attempt evaluation policy cho owner active hoặc instructor'),('011','Reapply 8 LAB curriculum đã sửa; data migration lớn tương tự 005'),('012','enrollment_mode, self_enroll RPC; public class/course metadata discovery'),('013','Sửa 6 tester solution prompts cho đúng input/task'),('014','Sửa theory content 6 tester lessons'),('015','DELETE 4 seed identities cụ thể chỉ khi chưa auth-linked; cascade effects cần hiểu, không chạy'),('016','lesson_progress, evaluation validator, sync triggers, deterministic backfill, atomic create/retry RPCs, read RLS'),('017','REVOKE INSERT/UPDATE prompt_attempts authenticated; SELECT/DELETE giữ nguyên')]
purposes={'users':('Profile/role nghiệp vụ','id UUID','Email unique; auth_provider_id TEXT nullable, không FK auth.users/unique'), 'learners':('Định danh learner','id UUID','user_id unique NOT NULL → users CASCADE; learner_code unique'), 'clients':('Tổ chức/khách hàng','id UUID','Không FK về tenant membership'), 'courses':('Khóa học tái sử dụng','id UUID','created_by nullable → users SET NULL'), 'classes':('Triển khai course cho client/department','id UUID','course_id/client_id NOT NULL RESTRICT'), 'enrollments':('Learner ↔ Class và lifecycle','id UUID','learner_id/class_id NOT NULL CASCADE; unique pair'), 'course_modules':('Chương trong course','id UUID','course_id NOT NULL CASCADE; unique course/position'), 'lessons':('Bài học và prompt/context/reference','id UUID','module_id NOT NULL CASCADE; unique module/key & position'), 'lesson_rubric_criteria':('Rubric mô tả cho lesson','id UUID','lesson_id NOT NULL CASCADE; unique key/position per lesson'), 'lesson_resources':('Text/data/reference/URL metadata','id UUID','lesson_id NOT NULL CASCADE; unique position; content/url nullable'), 'course_instructors':('Assignment + permission metadata','course_id,user_id','Cả hai NOT NULL FK CASCADE; permission owner/editor/viewer'), 'prompt_attempts':('Lịch sử run và evaluation','id UUID','learner/class NOT NULL CASCADE; lesson_ref_id nullable SET NULL, lesson_id TEXT legacy'), 'lesson_progress':('Aggregate learner/class/lesson','id UUID','3 FK NOT NULL CASCADE; last_attempt nullable SET NULL; unique triplet'), 'user_tutorial_progress':('Hoàn thành hướng dẫn theo screen','user_id,tutorial_key','user_id NOT NULL CASCADE; tutorial key regex')}
db='''## 1. Schema trong repo và schema live

Có **14 bảng public được khai báo** sau baseline + migrations 002–017. Supabase `auth.users` là bảng dịch vụ Auth ngoài DDL repo; không tính thêm vào 14. Không có query catalog DB production trong audit này, nên “schema thật” ở đây nghĩa là schema code/SQL khai báo; những object có trong production ngoài repo chưa biết.

'''+table(['Table','Purpose','PK','Important FK/relationship'],[(k,*purposes[k]) for k in purposes])+'''
## 2. Relationship và source of truth

```mermaid
erDiagram
  users ||--o| learners : has
  learners ||--o{ enrollments : enrolls
  classes ||--o{ enrollments : contains
  clients ||--o{ classes : hosts
  courses ||--o{ classes : delivers
  courses ||--o{ course_modules : contains
  course_modules ||--o{ lessons : contains
  lessons ||--o{ lesson_rubric_criteria : defines
  lessons ||--o{ lesson_resources : attaches
  courses ||--o{ course_instructors : assigns
  users ||--o{ course_instructors : assigned
  learners ||--o{ prompt_attempts : runs
  classes ||--o{ prompt_attempts : scopes
  lessons o|--o{ prompt_attempts : canonical_ref
  learners ||--o{ lesson_progress : tracks
  classes ||--o{ lesson_progress : scopes
  lessons ||--o{ lesson_progress : aggregates
  users ||--o{ user_tutorial_progress : completes
```

`users` chứa profile/role nghiệp vụ; Supabase Auth chứng thực identity. `learners.user_id` unique tạo quan hệ 0 hoặc 1 learner trên user; instructor không cần learner để vào shell. `enrollments` là quan hệ nhiều-nhiều có lifecycle; biết class_code không cấp quyền. `classes.course_id` là một course cụ thể; course tái sử dụng cho nhiều class/client. `lessons.module_id` nối lên course. Attempt được scope learner/class và cần canonical lesson thuộc course; FK độc lập không tự đảm bảo toàn bộ triplet, RPC/trigger kiểm tra thêm.

DB published content là nguồn bài học chính. Generated TS seed có source Markdown và SQL copy; static fallback/adapter làm UI có thêm metadata không hoàn toàn từ DB. `prompt_attempts` là event history; `lesson_progress` là materialized current aggregate; tutorial theo account/screen. History/library toàn trang lại dùng browser storage (không bảng SQL).

## 3. Ordered migrations

Không có 001; baseline là schema.sql. Bảng dưới diễn giải thứ tự, không chỉ dẫn thực thi ở phase audit.

'''+table(['Step','Delta'],migrations)+'''
## 4. Attempt/progress semantics

Create RPC resolves user/learner từ auth hiện tại, không tin learner_id gửi từ browser; kiểm active enrollment/class/course, publication course/module/lesson, nonempty prompt/output. Advisory transaction lock theo learner/class/lesson serialize tính max(attempt_number)+1. INSERT attempt làm AFTER trigger sync aggregate; RPC SELECT lại attempt+progress và trả JSON. Lỗi trigger khiến cả transaction rollback.

Trigger map lesson_ref_id, legacy UUID text hoặc lesson_key trong course của class; yêu cầu đúng 1 candidate. INSERT đặt status=completed, attempts_count+1, last_attempt=new id, started/completed timestamp đầu tiên; best_score là max hợp lệ. **Chạy thành công và lưu được là completed, không cần đạt 7/10 hay Judge thành công.** not_started/in_progress có enum nhưng canonical runtime writer hiện đi thẳng completed; absence thường biểu thị chưa bắt đầu.

Retry RPC locks owned canonical attempt; yêu cầu active access, update evaluation_json; AFTER UPDATE trigger chỉ cập nhật best_score theo max và updated_at, không tăng attempts_count. Vì dùng max tăng dần, chấm lại thấp hơn không hạ best_score. DELETE attempt không có sync trigger giảm counts/recompute best. Lesson deletion cascade xóa progress và SET NULL attempt.lesson_ref_id; legacy text vẫn còn.

Backfill 016 chỉ map được lesson duy nhất trong class course, gom count/max(valid score)/latest attempt, không tự đoán ambiguous/unmapped. Có NOTICE unmapped samples. Số fixture 9 attempts/7 progress trong staging README là expected test data, không production counts.

`valid_evaluation_total` kiểm JSON object, total integer 0–10, đủ 5 integer criteria 0–2 và sum khớp. JSON lỗi vẫn được lưu ở attempt nhưng không góp best_score. Validator không chứng minh evaluation đến từ AI: authenticated owner có thể gọi RPC tự gửi evaluation hợp lệ 10/10. Lưu score là client-supplied, không server-attested.

## 5. Constraints, nullable và duplicated concepts

- Identity bridge `auth_provider_id TEXT` nullable, không unique/FK. Helpers dùng `auth_provider_id = auth.uid OR email = JWT email`, current_user_id LIMIT 1. Đây là weak link khi dữ liệu bị duplicate/misbound.
- Course có `status` active/archived và `publication_status` draft/published/archived; class có lifecycle riêng; enrollment completed khác lesson completed và UI currentStep=3.
- Legacy attempt `lesson_id TEXT` tồn tại song song `lesson_ref_id UUID nullable`; lesson_key chỉ unique trong module, có thể ambiguous giữa modules. Trigger chống map sai thay vì tự đoán.
- Attempt model/latency/output/evaluation client-supplied. Không unique triplet+attempt_number constraint được khai báo; serialization nằm trong RPC.
- last_attempt_id là FK đơn, không composite FK ép cùng learner/class/lesson; runtime trigger làm matching.
- resources `file` là enum metadata, không đủ chứng minh file upload/storage; content/url có thể cùng null. Hints/focus JSON chỉ kiểm array, không element schema.
- classes không CHECK end_date > start_date trong DDL đã kiểm. helpers active không enforce date. enrollment expired là state, không thấy scheduled transition job.
- Base timestamp DEFAULT nullable ở một số bảng, khác content tables NOT NULL. courses.slug nullable unique partial index.

## 6. Security boundaries

RLS enabled cho 14 public tables. Anon bị revoke business access; authenticated grants không đủ để bypass RLS. SECURITY DEFINER helpers/RPC có fixed search_path và limited EXECUTE; body phải tự enforce ownership, access và published state. Instructor/admin là global role: RLS content/classes/users/enrollment/attempt visibility dùng is_instructor, không filter course_instructors/client. Assignment viewer/editor metadata hiện không giới hạn quyền.

017 revoke INSERT/UPDATE attempts mặc dù policies cũ còn tồn tại; grant kiểm trước RLS. Delete vẫn granted nhưng policy chỉ instructor. lesson_progress authenticated SELECT only. Chính sách SELECT attempts vẫn owner/instructor và không yêu cầu active enrollment, khác progress SELECT có active class requirement.

Chi tiết effective RLS và grants ở 07; full SQL object inventory bên dưới giúp review đúng mã, không suy diễn từ docs.

## 7. Exact table declarations và ALTER sau baseline

'''
for k,(loc,st) in tables.items():db+=f'### {k}\n\nNguồn: `{loc}`\n\n```sql\n{st}\n```\n\n'
for loc,st in alterations:db+=f'Nguồn: `{loc}`\n\n```sql\n{st}\n```\n\n'
db+='## 8. Index inventory\n\n'
for loc,st in indexes.values():db+=f'`{loc}`\n\n```sql\n{st}\n```\n\n'
db+='Unique/PK constraints cũng tạo indexes PostgreSQL; danh sách trên là các CREATE INDEX explicit. Không đo query plans hoặc workload thực tế.\n\n## 9. Functions và triggers\n\n'
roles={'generate_learner_code':'LRN sequence code','trigger_set_timestamp':'updated_at on update','is_instructor':'global role from identity bridge','current_user_id':'resolve public profile from auth','check_user_privilege_escalation':'block learner role/email/id/bound provider changes on UPDATE','has_active_class_enrollment':'active enrollment and class status, no dates','has_active_course_enrollment':'active enrollment/class/course published, no dates','lesson_belongs_to_class':'lesson->module->course match class','self_enroll_public_class':'learner-only, public active in dates + published course; upsert active enrollment','valid_evaluation_total':'validate numeric 5-criteria score contract','sync_lesson_progress_from_prompt_attempt':'map canonical lesson and aggregate insert/eval update','record_prompt_attempt_and_progress':'owned atomic attempt + trigger progress','update_prompt_attempt_evaluation_and_progress':'owned canonical retry + trigger best score'}
db+=table(['Function','Current purpose','Latest definition'],[(k,roles.get(k,'See SQL'),v[0]) for k,v in functions.items()])
for loc,st in triggers.values():db+=f'`{loc}`\n\n```sql\n{st}\n```\n\n'
db+='## 10. Migration debt\n\nBaseline is not consolidated final schema; rerunning older baseline/002/004 after newer migrations can restore broad policies, even if DDL is idempotent. 005/011 duplicate long data seed; generator writes historical 005, so regeneration is not evidence applied DB changed. 016/017 coupling requires deployment/application version verification outside audit. Rollback files are manual DB mutations and were read as artifacts only, never executed.\n'
put('03_DATABASE_AND_SQL.md','As-Is Database and SQL Audit',db)
put('04_CURRENT_ARCHITECTURE.md','Current Architecture','''## 1. Architecture thực thi

```mermaid
flowchart LR
  B[Browser] --> F[React SPA / App + Hybrid + Instructor]
  F --> A[Supabase Auth / Google OAuth]
  F --> D[Supabase Data API / JWT + RLS]
  D --> P[(Postgres public tables)]
  F --> G[POST api/generate và api/evaluate]
  G --> V[Supabase getUser + RLS class/lesson check]
  V --> D
  G --> L[apiServerService]
  L --> O[OpenAI Responses]
  L --> M[Gemini generateContent]
  F --> S[(localStorage / sessionStorage)]
  D --> R[RPC + attempt triggers]
  R --> P
```

Edges thể hiện call/data flow, không phải mọi request phải đi qua tất cả nodes. API dùng Supabase để kiểm quyền và provider để generate/evaluate; API không lưu attempt. Frontend gửi RPC trực tiếp tới Supabase sau khi nhận kết quả AI. Browser storage phục vụ library/history/UI state; không là permission source.

Vercel production có static frontend + serverless API entrypoints theo cấu hình repo. Local Vite inject middleware cho cùng API services. Không có worker/queue/cache service/retrieval DB được nối trong graph current code. Google là OAuth provider và Gemini AI provider là hai luồng độc lập.

## 2. Frontend boundaries

App sở hữu session/role/class/current screen/labs/global telemetry và coach context. HybridView sở hữu editor/system prompt/output/evaluation/versions/runs/assistance. InstructorViewShell tải nhiều DB collections rồi map KPI/activities. dbService là dual repository Supabase/local. curriculumAdapter chuyển DTO DB sang LabStep, vừa map published content vừa thêm sample output từ generated seed.

Không có router/store layer chuyên dụng; có browser events `promptify:tutorial-step` cho demonstration. Notebook/Playground components vẫn tồn tại nhưng không mount bởi App. component existence không là reachable feature.

## 3. Data flow

```mermaid
flowchart TD
  C[Markdown LAB specs] --> T[Generator script]
  T --> TS[Generated TS seed]
  T --> SQL[Seed SQL files]
  SQL -. manual application outside audit .-> DB[(Supabase DB)]
  DB --> AD[Curriculum adapter]
  TS --> AD
  AD --> UI[Lesson UI]
  UI --> GEN[Generate endpoint]
  GEN --> OUT[AI output]
  OUT --> EVAL[Evaluate endpoint]
  EVAL --> SAVE[Frontend create RPC]
  OUT --> SAVE
  SAVE --> AT[(prompt_attempts)]
  AT --> TR[Sync trigger]
  TR --> LP[(lesson_progress)]
  LP --> DASH[Learner / Instructor dashboards]
  SAVE --> HIS[(Browser history cache)]
```

## 4. Observability hiện có

console warnings/errors, attempts model/latency/created_at và browser token estimate. Không thấy central trace/request correlation/metrics exporter, usage billing ledger hoặc provider result provenance. Không gọi graph trên là deployment inventory production đã xác minh.

Nguồn: `src/App.tsx`, `src/components/hybrid/HybridView.tsx`, `src/components/instructor/InstructorViewShell.tsx`, `src/services/*`, `api/*`, `vite.config.ts`, `vercel.json`, migrations 004/016/017.
''')
put('05_USER_FLOWS.md','As-Is User Flows','''## 1. Learner login và vào lớp

```mermaid
flowchart TD
  L[Landing] --> G[Google OAuth qua Supabase]
  G --> U[Sync public user và learner]
  U --> R{DB role}
  R -->|instructor hoặc admin| I[Instructor shell]
  R -->|learner| E{Active enrollment}
  E -->|có| H[Chọn lớp saved hoặc enrollment gần nhất]
  E -->|chưa có| C[Class selection]
  C --> P{Lớp public}
  P -->|có| S[self_enroll_public_class RPC]
  P -->|không| A[Phải có enrollment từ instructor]
  S --> H
  A --> H
  H --> D[Load curriculum + lesson_progress]
  D --> X[Home / learning path / lesson]
```

Google OAuth dùng PKCE, Supabase persistent session/auto refresh/detect callback URL. App resolve public profile theo email/provider id, role chỉ từ DB. Không có chọn demo account trong landing hiện tại. Không enrollment thì class_select; cached navigation không tự cấp quyền. URL lesson chỉ resolve sau đúng user/class curriculumReadyKey, giới hạn ID vào labs đã load.

Class/course/client join cung cấp tên course, organization/industry/department. Lớp thường được instructor thêm enrollment theo email; người đó có thể có profile trước OAuth, rồi được sync/bind khi login. Public class RPC tạo learner nếu cần và upsert enrollment active. Một user có nhiều active class, navbar đổi lớp. VITE_REVIEW_CLASS_CODE lọc class UI; RLS vẫn là auth boundary.

## 2. Làm bài và Run

```mermaid
flowchart TD
  H[Home / path] --> B[Hybrid lesson: theory + task + data]
  B --> W[Viết prompt / sửa system instruction]
  W --> S[Structure / autocomplete / optional hints / solution]
  S --> R[Run]
  R --> M{Mode}
  M -->|simulated| D[Sample output / không persist completion]
  M -->|live| G[Generate API]
  G --> J[Judge API]
  J --> K[Evaluation hoặc lỗi judge]
  K --> P[Atomic save RPC]
  P -->|thành công| C[Completed lesson + attempt version + browser history]
  P -->|lỗi| F[Output còn hiển thị; chưa ghi progress]
  C --> V[Compare / restore / save library / next lesson]
```

Editor mặc định không prefill hoàn chỉnh; baseline/improved có thể xem tham khảo. Theory/task/sample input thuộc lesson hiện tại. Prompt structure là regex browser; autocomplete chèn snippet khi Tab. Hints/solution có confirm mở và lưu assistance browser; đó không phải exam proctoring hay score penalty được lưu server.

Live generation hiển thị output trước judge; judge lỗi vẫn có thể persist run với evaluation=null. DB completion dựa vào event lưu, trong khi local UI currentStep có threshold >=7 cho một transition. Không nên đồng nhất step badge với lesson_progress hoặc enrollment completed.

Versions hydrate từ server attempts theo learner/class/lesson. Restore chọn prompt/output cũ; edit draft có thể làm feedback stale, PromptComposer chỉ gợi ý diff khi prompt bằng lastEvaluatedPrompt. Attempt không lưu system_instruction/input context snapshots; hydrate systemText dùng current lesson state.

## 3. Compare, history, library, tutorial

- Hybrid A/B chọn hai version, so prompt/output và heuristic business checks. App-level DiffCompareModal khi không truyền versions dùng baseline/improved sample: hình minh họa không là hai live runs.
- History toàn trang nhận App history browser; copy/export Markdown/clear chỉ thay cache. Không hydrate list từ DB, không filter user/class; logout không xóa history/library/assistance.
- Library save title/business use case/technique/prompt/output/score metadata vào localStorage; seed khi cache rỗng. Search/category/star/copy thực sự chạy. “Open in Playground” hiện set App.activePrompt và navigate lesson nhưng không truyền editor prop vào HybridView; không đảm bảo prompt được nạp vào editor.
- Coach đọc activeLab/currentPrompt, tạo câu hỏi/gợi ý qua rules và clipboard. Không gọi conversational API. Lesson context sync có thể ghi đè App.activePrompt ngay sau library action.
- Tutorial theo account/screen qua DB; close handler ghi completed (không chỉ sau finish cuối). Tour có demo actions set output/compare sample, không chạy AI/persist attempt thật.

## 4. Instructor/Admin

```mermaid
flowchart TD
  G[Google login] --> R[public.users.role instructor hoặc admin]
  R --> H[InstructorViewShell]
  H --> D[Load classes / curriculum / learners / attempts / progress]
  D --> K[Dashboard KPI + activity snapshot]
  H --> C[Class detail]
  C --> L[Add / edit learner name + enrollment status / remove]
  C --> M[Course management]
  M --> E[Module / lesson / rubric / resource CRUD]
  H --> A[All learners table và activity filters]
```

Instructor nhìn các class RLS cho global role, không chỉ assignments. Shell gom curriculum theo unique courseIds, learners theo class và all attempts/progress. Started learners=distinct learner có attempts_count>0; progress mỗi learner=published lessons có completed row / số published lessons, avg qua enrollment chưa removed. Completed learners dùng enrollment.status=completed; không tự set status này khi học hết bài.

Activity sort created_at, chỉ mô tả run_prompt; không realtime event bus. Enrollment CRUD tạo/tìm user→learner→enrollment, sửa full_name và status, remove status=removed giữ identity. Course in use được archive; course không reference class có thể delete. Publication riêng lifecycle status. Editor CRUD module/lesson và replace rubric/resources nhiều request.

Không có distinct admin screen, class creation UI, assignment editor hoặc email reminder workflow được mount. LearnerDetailModal code cũ không được LearnerTableView dùng và chứa toast giả “đã gửi email”; không là capability gửi email hiện tại.

Nguồn: `App.tsx` resolveUserSession/handleSelectClass/handleStartLesson; `HybridView.tsx` handleRun/handleRetryEvaluation; `InstructorViewShell.tsx` mapDbClassToInstructorClass/buildActivities/reloadClasses; `dbService.ts`; `LessonBriefPanel.tsx`; `PromptComposer.tsx`.
''')
put('06_AI_FLOW.md','As-Is AI Flow','''## 1. Generate technical flow

```mermaid
sequenceDiagram
  participant U as Learner
  participant F as HybridView / llmService
  participant A as Generate API
  participant S as Supabase Auth + RLS
  participant P as AI Provider
  U->>F: Run prompt
  F->>S: getSession
  F->>A: Bearer + classId/lessonId/prompt/system/inputContext
  A->>S: getUser(token), SELECT class and UUID lesson
  S-->>A: Accessible rows or denial
  A->>P: Composed input + system instruction
  P-->>A: Complete output
  A-->>F: output/model/latency/tokens
  F-->>U: Animate words from complete response
```

Frontend POST `/api/generate`: lessonId, classId, learner prompt, editable systemText, currentLab.sampleInputContext. No direct browser key. `getAuthenticatedApiHeaders` rejects absent session. API only POST (405 otherwise), parses req.body string if needed, assertAiLessonAccess then handleGenerateRequest. Guard getUser verifies JWT; checks class visible by token RLS. UUID lesson must be visible and course match class. Missing/non-UUID lesson returns after class SELECT, accepting static fallback path.

Server generation requires nonempty string prompt, composes `CONTEXT / INPUT DATA` and `USER PROMPT` when inputContext nonempty. System instruction is supplied client or default assistant rule. Server **does not fetch canonical lesson content/rubric** to assemble provider request. Context/system instruction can be changed by request caller. No retrieval/search/tool execution in generate path; curricular RAG/ReAct/tool-calling topics do not mean RAG/agent runtime exists.

## 2. Provider/model selection

OpenAI when OPENAI_API_KEY exists, even if Gemini also configured. Responses `/v1/responses`, OPENAI_MODEL default gpt-4.1-mini, max_output_tokens=2048, store=false, timeout30s. OpenAI failure does not switch to Gemini. Judge OpenAI timeout20s/max_output_tokens600/strict json_schema.

Else Gemini key from GEMINI_API_KEY then GOOGLE_API_KEY. Generate candidate order GEMINI_MODEL(default gemini-3-flash-preview), gemini-2.5-flash, gemini-1.5-flash, gemini-2.0-flash, gemini-flash-lite-latest (dedup). Each up to 2 attempts, 12s timeout; retry transient429/503 or network with 750ms delay; then next model. Other HTTP errors break per-model retry but still proceed next candidate. Generate temperature0.3/maxOutputTokens2048. Modal stored temperature does not control this payload.

Gemini judge candidates fixed gemini-2.5-flash, gemini-1.5-flash, gemini-3-flash-preview, gemma-4-26b-a4b-it; does not use GEMINI_MODEL ordering. Thinking config filtered by model supports prefix; JSON schema removed for gemma. Judge temperature0.1/max4096/thinkingBudget0; non-thought text parts concatenated and parsed. Provider/model strings are code configuration, not assurance those models currently available to project.

No key =>503. OpenAI auth/other upstream errors =>502, rate limit=>503. Gemini400=>400, auth=>502, transient/network=>503; empty Gemini output throws generic Error and API =>500. Exhaustive retry can consume long wall time with multiple models; no global time budget/circuit breaker in code.

## 3. Evaluation

Frontend POST `/api/evaluate` includes lessonId/classId/scenario/controlData/taskRequirement/lessonRubric/learnerPrompt/generatedOutput. Same auth guard. Service nonempty learnerPrompt check; weak type checking on other fields. Model judge sees all provided values interpolated into judging prompt, not canonical DB values. Output empty is represented as “Không có output”.

Five criteria taskCompletion, groundedness, formatAdherence, constraintCompliance, businessUsability, each integer0–2. Client/server contract derives total sum0–10; requires scores object, strengths/improvements string arrays, nonempty nextHint. Parser removes optional markdown and slices first `{` to last `}`. Wrong contract=>502, no silent default score. Validator normalizes known fields; application parser does not reject all unknown fields even when OpenAI request schema does.

UI maps total x10 and individual criteria x10 to old RubricAudit field names: groundedness→variableScore, businessUsability→personaScore. Separately `evaluatePromptRubric`/evaluateBusinessMetrics are heuristic local feedback, not judge fallback score for failed live evaluation. DB lesson rubric max_score can differ but judge always 5x2; adapter passes four description fields by positional criteria and drops explicit max_score weighting. This is a current mismatch, not future requirement.

## 4. Persistence and trust

After live generation and optional judge, frontend calls record RPC with output/prompt/model/latency/evaluation JSON. API does not sign evaluation or persist it itself. DB validates score shape, not provenance: owner could submit invented prompt/output/10 score to RPC. This affects integrity of KPI/learning evidence despite ownership/RLS boundaries. No authenticated quota/rate limit or request size validation implemented in AI entrypoints.

Judge failure: output remains, evaluation=null, error displayed, attempt still saved; retry only evaluate existing prompt/output, then update owned attempt RPC. Retry catch for DB error only logs warning while UI already updates score, so displayed and persisted evaluation may diverge.

UI sets isRunning=false when generation done before judge/save; run button only disabled for isRunning/empty prompt. Another Run can start while previous judge/save unfinished; async state may interleave. No abort controller on lesson navigation/provider request from frontend.

## 5. Simulated and illustration

executeSimulatedPromptStream chooses baseline/improved sample via local prompt heuristics and animates text. Hybrid sees mode=simulated and returns before judge/DB/onRecordRun. Default mode is live, simulation explicitly selected. Live response also arrives whole then word animation; neither is actual provider streaming/SSE. Token UI uses output length/3.8 and ignores returned server usage tokens.

Tutorial demo output and App reference compare are illustrative. Coach/autocomplete/PII rules use no AI provider call. LLM credentials never read from VITE_* in provider functions; legacy ApiConfig geminiApiKey field reset to empty.

Nguồn: `src/services/llmService.ts`, `apiServerService.ts`, `apiAuthorizationService.ts`, `aiEvaluationContract.ts`, `HybridView.tsx:532`, `HybridView.tsx:715`, `api/generate.ts`, `api/evaluate.ts`, `curriculumAdapter.ts`.
''')
access='''## 1. Layers

| Layer | Enforced now | Limit |
| --- | --- | --- |
| Supabase Auth | Google OAuth, verified JWT via getUser on AI APIs | Console OAuth settings chưa xác minh |
| App role | users.role learner/instructor/admin | Cached view/role không cấp DB rights |
| Learner navigation | active enrollment lookup, class check, authorized lesson URL | Static curriculum fallback; UI state không security boundary |
| Content RLS | active class enrollment + published course/module/lesson | Helpers không kiểm start/end dates |
| Instructor RLS | is_instructor global role | Không course/client assignment isolation |
| API guard | Bearer auth, class SELECT, UUID lesson/course match | Read permission public class rộng hơn enrollment; nonUUID/missing lesson skipped |
| Attempt create/retry RPC | resolves current learner, active access, ownership/canonical course, transaction | Input content/evaluation client supplied |
| Grant 017 | deny direct INSERT/UPDATE attempts | Requires production applied017; DELETE instructor vẫn được |

## 2. Important security findings

### HIGH AC-01 — Class SELECT không đồng nghĩa enrollment

Migration012 cho mọi authenticated user nhìn public class trong date window. assertAiLessonAccess query class qua RLS, rồi bỏ lesson check khi lessonId thiếu hoặc non-UUID. Vì vậy user có JWT hợp lệ nhưng chưa enroll public class có đường qua guard với nonUUID lessonId. UUID lesson vẫn cần lessons RLS và course match; create attempt RPC vẫn cần enrollment nên không suy diễn write bypass. Đây là kết luận code/SQL phối hợp, chưa exploit test trên live.

### HIGH AC-02 — Expiration partial

Self-enroll RPC kiểm start_date<=now<=end_date; has_active_class_enrollment chỉ enrollment.status=active và class.status=active. Active course helper và record RPC không enforce clock expiration. Không thấy job tự đổi expired/class status. Vì vậy enrollment active/class active có thể còn DB/API access sau end_date. ExpirationBanner file không được App import; App có text “18:00 hôm nay” và 4/8h fallback không là backend restriction.

### HIGH AC-03 — Score provenance

Owner có thể gọi record/retry RPC với evaluation hợp lệ do họ tự xây. JSON validator không chứng minh provider signed result; phần trăm completion cũng chỉ dựa persisted nonempty output. Đây là quyền write hiện tại có kiểm owner, nhưng học tập/điểm không đáng tin như assessment được server kiểm chứng.

### Broad scope AC-04

is_instructor() true cho instructor/admin ở bất kỳ class/course/client. course_instructors permission viewer/editor/owner được khai báo nhưng policy không tham chiếu assignment. Không khẳng định đây là bug nếu global instructor là chính sách chấp nhận; cần human xác nhận scope. Learner vẫn được SELECT tất cả clients do USING(true) authenticated; clients không là tenant membership boundary.

### Identity AC-05

public.users không FK trực tiếp auth.users, auth_provider_id nullable/nonunique. Helpers OR email/provider id + LIMIT1. UPDATE privilege trigger chống learner đổi role/email/id/bound id, nhưng INSERT policy own email role learner không kiểm auth_provider_id=auth.uid. Data integrity/misbinding cần xác nhận bằng controlled staging test, không khẳng định đã takeover.

## 3. Effective RLS after ordered chain

Các block sau là CREATE POLICY cuối cùng cùng tên trong schema→002→…→017. 017 còn giữ policies nhưng thay table grants; không được bỏ qua grants khi đọc hiệu lực. Không có DROP-only policy không recreate trong chain đã inventory.

'''
for loc,st in effective.values():access+=f'`{loc}`\n\n```sql\n{st}\n```\n\n'
access+='''## 4. Grants và function boundary

Authenticated có baseline business/content DML subject to RLS; tutorial SELECT/INSERT/UPDATE; attempt003 SELECT/INSERT/UPDATE/DELETE rồi017 revoke INSERT/UPDATE; lesson_progress SELECT only. Role service_role có explicit SELECT lesson_progress và Supabase elevated behavior nằm ngoài learner JWT path; không sử dụng service key để audit. Core security helpers và self-enroll/progress RPCs EXECUTE authenticated, revoked PUBLIC/anon; validator/sync trigger revoked authenticated callable access. Search_path public,pg_temp fixed trên SECURITY DEFINER routines.

Attempt SELECT owner/instructor không active access gate; progress SELECT owner+active class hoặc instructor. Learner có thể còn đọc attempts của mình sau enrollment removed theo SQL, trong khi App chặn lesson navigation. Removal không xóa user/learner/attempts. Không thấy scheduled expiry, rate limiter, input PII hard block, API canonical rubric fetch, score-signature check.

Không chạy RLS/security exploit hoặc sửa policies; effective policies này cần đối chiếu catalog deployed trước khi dùng làm production certification.
'''
put('07_ACCESS_CONTROL.md','As-Is Access Control',access)
risks=[
('HIGH','TD-01','AI guard public class bypass enrollment khi lesson nonUUID/absent','apiAuthorizationService.ts:55; migration012','Gọi provider ngoài learner enrollment gate; kết luận static, chưa test live'),
('HIGH','TD-02','Evaluation/progress trust client','migration016 record/retry RPC; Hybrid handleRun','Có thể self-submit hợp lệ 10/10/fictional output; validator chỉ shape'),
('HIGH','TD-03','Ngày hết hạn không enforce trong active helpers','migration006; migration016; App expiry defaults','End date không tự thu hồi access nếu status vẫn active'),
('HIGH','TD-04','History/library/assistance browser shared account/class','App history + clearSessionState; businessEvaluationService','Logout không xóa, storage key không scope; người dùng sau cùng browser có thể nhìn cached prompt/output'),
('HIGH','TD-05','Generation/Judge request unrestricted và client content','apiServerService; api handlers','Không quota/rate/body bounds/canonical input; chi phí và prompt manipulation'),
('HIGH','TD-06','Mất nhất quán nội dung/progress khi DB load lỗi','App loadCourseCurriculum; curriculumAdapter; DB RPC','Fallback seed cho course khác; guard/write có thể từ chối hoặc bài không phù hợp'),
('MEDIUM','TD-07','Instructor role global và assignments unenforced','migration004/schema RLS','Scope rộng; severity phụ thuộc chính sách human'),
('MEDIUM','TD-08','Run overlap khi judge/save đang chờ','HybridView:568; PromptComposer:658','isRunning false trước evaluate, state/attempt version không chắc đồng bộ'),
('MEDIUM','TD-09','Editor không nhận library prompt','App:756, Hybrid props:43','Action set App.activePrompt nhưng editor internal state không nhận'),
('MEDIUM','TD-10','Re-evaluation UI đã cập nhật nhưng DB lỗi chỉ warn','HybridView:740/764','Hiển thị score khác persisted score'),
('MEDIUM','TD-11','Curriculum mutation nhiều request','dbService replaceLessonRubrics/resources; CourseCurriculumEditor','Delete-before-insert và lesson+rubrics+resources không một transaction'),
('MEDIUM','TD-12','Progress delete/re-score không recompute toàn bộ','migration016 triggers;003 delete policy','Delete attempt không giảm count/max; lower re-score không giảm best_score'),
('MEDIUM','TD-13','Weak identity bridge','users.auth_provider_id; current_user_id; insert policy','Nullable/nonunique TEXT + OR resolution; potential misbinding'),
('MEDIUM','TD-14','Scaling phía client','InstructorViewShell reloadClasses; dbService instructor queries','N requests theo courses/classes, tải collections không pagination rồi sort/filter/aggregate'),
('MEDIUM','TD-15','Build gate không cover API/test config TS','tsconfig include src','tsx không typecheck tests; Vercel handler typing không gate local build'),
('MEDIUM','TD-16','Migration/schema drift','schema.sql + 002/004/006/012; 005/011;016/017','Reapply old SQL có thể rollback security policies; deployed chain chưa biết'),
('MEDIUM','TD-17','Local fallback ID collision','dbService user-/learner-Date.now','Test access nondeterministic khi tạo accounts cùng millisecond; không production UUID bug'),
('LOW','TD-18','Duplicated heuristic/business vocabulary','promptStructureAnalyzer; businessEvaluationService; llmService; labComplianceService','Cùng concept kiểm theo regex/keyword khác nhau; UI legacy persona/variable khác judge criteria'),
('LOW','TD-19','Hardcoded demo/domain values và legacy branches','App 4/8h/18:00; LearnerDetailModal 5 labs; labsData aliases','Dễ gây hiểu lầm về actual course/expiry; modal cũ không reachable'),
('LOW','TD-20','Token/stream labels và config dư','llmService; ApiConfig; ApiKeyModal','Word animation không streaming; ignores actual tokens; temp config không gửi server'),
('LOW','TD-21','Docs/test fixtures stale','README; test slice/public class; test plan','Claims demo/Notebook/pass24 không khớp hiện tại'),
('LOW','TD-22','Library/history storage không bound','businessEvaluationService; App','Quota/JSON errors và dữ liệu dài tăng browser storage; không retention policy'),
]
put('08_TECH_DEBT_AND_RISKS.md','As-Is Tech Debt and Risks','''## Severity và giới hạn

CRITICAL: bằng chứng compromise/data loss nghiêm trọng cần xử lý tức thì. HIGH: access/assessment/data exposure hoặc vận hành có tác động lớn. MEDIUM: correctness/maintainability/scale. LOW: naming/docs/UX clarity. Không tìm thấy bằng chứng đủ để gán CRITICAL trong audit local; không có nghĩa production an toàn. Findings chưa runtime verified ghi giới hạn. Không sửa và không đề xuất target architecture.

'''+table(['Severity','ID','Finding','Evidence (src paths nếu ngắn)','Impact/limit'],risks)+'''
## 5 nhóm nợ kỹ thuật lớn nhất

1. Access model không nhất quán: class public read/API gate, expiration theo status, scope instructor global.
2. Assessment integrity: client gửi rubric/output/score và completion dựa vào event persist, không chứng minh năng lực hay provenance.
3. State/persistence phân tán: DB attempts/progress, browser history/library/assistance, state editor/App và async retry/run.
4. Curriculum/migration drift: static seed/DB content/Markdown, fallback khác course, baseline không consolidated, rollout016/017 cần phiên bản đồng bộ.
5. Verification/scale boundaries: source regex tests và fixtures cũ, build thiếu API typecheck, instructor tải dữ liệu nhiều request/client aggregation.

## Legacy/unreachable source

NotebookView/NotebookCell/NotebookCoach và PlaygroundView không được App import/render. LearnerDetailModal chỉ toast reminder và hardcoded 5 labs, không được active learner table mount. Header/OnboardingTutorial/ExpirationBanner/HistoryDrawer và các helper cũ cần phân biệt existence với reachable runtime. Phần sau là static import reachability từ `src/main.tsx`; lazy imports/dynamic component registration cần human review nếu bổ sung ngoài graph này. Không xóa file.
''')
# Relative import graph; inventory only, do not alter files.
sources={p:s for p,s in files if p.startswith('src/') and p.endswith(('.ts','.tsx'))}
edges={}
for p,s in sources.items():
 dest=[]
 for m in re.finditer(r'(?:from\s*|import\s*)[\'\"]([^\'\"]+)[\'\"]',s):
  if not m[1].startswith('.'):continue
  base=(R/p).parent/m[1]; candidates=[base,Path(str(base)+'.ts'),Path(str(base)+'.tsx'),base/'index.ts',base/'index.tsx']
  for q in candidates:
   try:key=q.resolve().relative_to(R).as_posix()
   except ValueError:continue
   if key in sources:dest.append(key);break
 edges[p]=dest
seen=set(); todo=['src/main.tsx']
while todo:
 p=todo.pop()
 if p in seen:continue
 seen.add(p);todo+=edges.get(p,[])
with (O/'08_TECH_DEBT_AND_RISKS.md').open('a',encoding='utf-8') as f:
 f.write('\n'+table(['Source không reach qua static import từ main','Trạng thái'],[(p,'Unreachable candidate; có thể dùng ở test/API riêng') for p in sources if p not in seen]))
checks=json.loads((R/'outputs/audit/as_is_test_results.json').read_text(encoding='utf-8'))
rr=checks['results']; testrows=[x for x in rr if x['name'].endswith('.ts')]
passed=sum(x['exit']==0 for x in testrows);failed=len(testrows)-passed
rt='''## 1. Môi trường và cách chạy

Windows, bundled Node v24.19.0, dependencies local có sẵn; không npm install. TypeScript `node node_modules/typescript/bin/tsc` và Vite `node node_modules/vite/bin/vite.js build` là hai phần của npm run build. Test bằng `node node_modules/tsx/dist/cli.mjs test/<file>.ts` từng subprocess, cùng cwd repo.

Tiến trình test loại bỏ biến Supabase/provider/staging khỏi inherited env, không load .env; tests gọi dbService dùng memory fallback. Các test tự đọc .env/gọi live provider hoặc ghi staging bị bỏ qua. Test generation_prompt_isolation mock global fetch nên an toàn. Không sửa application/test code, không chạy migrations. Build tạo dist ignored; audit helpers/logs ở tmp.

'''+f'Build **PASS** (tsc và vite). Lần chạy hoàn tất: **{passed}/{len(testrows)} test scripts PASS, {failed} FAIL; 5 SKIPPED**. Exit0 là kết quả script, không là test case count hoặc E2E certificate.\n\n'+table(['Command/script','Status','Seconds'],[(x['name'],'PASS' if x['exit']==0 else 'FAIL',x['seconds']) for x in rr])+'''
## 2. Failure analysis

| Test | Failure | Classification |
| --- | --- | --- |
| verify_public_testing_class.ts | assert `/cohorts={cohorts}/` không khớp App truyền selectableCohorts | Source-text assertion stale; không chứng minh public enrollment functional fail |
| verify_slice.ts | 10/18 assertions pass; role instructor demo và preseed enrollment/branding expected không còn | Fixture/test assumption stale sau bỏ mock identities; code không tự cấp instructor theo email |
| verify_enrollment_access.ts | Lần đầu PASS, lần chạy hoàn tất FAIL line29 true!==false với user chưa assigned | Flaky local identity collision có bằng chứng ID user-Date.now; cần isolated reproduction để xác nhận toàn bộ nguyên nhân, không production RLS failure |

Helper lần đầu bị console cp1252 UnicodeEncodeError khi in lỗi emoji: lỗi môi trường helper, đã đổi UTF-8 và chạy hoàn tất; không tính thành lỗi app. Không sửa test để pass. Re-run dùng cùng source/dependency; khác kết quả access được giữ trong ghi nhận, không lấy lần PASS làm tổng cuối.

## 3. Skipped scripts và lý do

'''+table(['Script','Lý do'],[(n,'Gọi live endpoint/provider hoặc tự load .env' if 'staging' not in n else 'Tạo/cập nhật auth users và ghi disposable DB; cần staging config rõ ràng, không chạy production') for n in checks['skipped']])+'''
## 4. Coverage hiện có

Source assertions: enrollment guards/migrations/RPC usage, OAuth/logout/tab navigation, tutorial elements, curriculum content consistency, template safety. Pure-function tests: structure spans/highlight/status, PII/autocomplete, evaluation JSON contract, URL navigation. Repository tests: curriculum/enrollment CRUD bằng local adapter, không Postgres. Mock provider request isolation: payload OpenAI qua stub fetch, không actual model behavior.

Không có coverage instrumentation/report; không báo % statement/branch. 27 scripts không tương đương suite với 27 cases. `verify_real_ai_flow` tên live nhưng run này dùng no-key validation, source contracts/mock evaluation/local persistence; không gọi model real vì keys bị remove. Một số legacy live scripts chỉ log lỗi hoặc demo token, không assert process thất bại đầy đủ.

## 5. Các vùng chưa được runtime verify

- Real Google OAuth callback/refresh across accounts, browser UI and mobile layout.
- SQL execution/replay tất cả migrations, constraint/grant/catalog hiệu lực, RLS direct probes, RPC concurrency/atomic rollback trên Postgres.
- Public class/nonUUID API access, removed re-enroll/expiration, instructor scope.
- Real generation/evaluation accuracy, timeout/fallback availability, deployment function time limit.
- Save/retry failure state, overlap runs, lesson navigation mid request, library open editor behavior qua browser.
- Production DB migration016/017 applied, deployed commit, actual active/published row counts.

Không có kết luận production PASS dựa local tests. Build strict chỉ include src, API/tests không typecheck gate. Không ghi hoặc sửa logic để làm test pass.

## 6. Exact compact output evidence

'''
for x in rr:
 if x['name'] in ['build','vite-build'] or x['exit']:
  output=x['output']; rt+=f'### {x["name"]} — exit {x["exit"]}\n\n```text\n'
  if x['name']=='verify_public_testing_class.ts': output=output[:350]+'\n[omitted assertion dump of complete App source]\n'+output[-350:]
  rt+=output.strip()+'\n```\n\n'
put('09_TEST_AND_RUNTIME_STATUS.md','As-Is Test and Runtime Status',rt)
summary=f'''## Product hiện tại trong 8 dòng

1. Promptify là webapp học/thực hành prompt cho người dùng nghiệp vụ, chạy React SPA.
2. Learner dùng Google OAuth, vào class đã enroll hoặc public class có self-enroll RPC.
3. Class gắn một course và client; course chứa modules/lessons đã publish.
4. Bài học hiện mount Hybrid workspace với theory/task/data/editor/output/evaluation.
5. Live AI gọi server API OpenAI ưu tiên, Gemini fallback khi không có OpenAI key.
6. Run live lưu attempt và lesson_progress qua RPC/trigger; completed là persisted run, không mastery.
7. Instructor/admin cùng shell, quản lý learners/enrollments/course content và xem DB-derived KPI/activity snapshot.
8. History/library/assistance vẫn browser-local; coach/structure/PII là rules, simulation/compare demo được phân biệt.

## Stack / DB / feature count

React19 + TS5.7 + Vite6 + Tailwind3 + Supabase Auth/Data API/Postgres + Vercel API + OpenAI/Gemini; dải version khai báo trong package.json. **14 public tables**, baseline schema.sql + **16 migrations 002–017**. Identity→learner→enrollment→class→course→module→lesson; attempts event + lesson_progress aggregate; tutorial own-account state; instructor assignments metadata không enforce riêng.

Inventory audit **{len(features)} capability: {counts['Real']} Real / {counts['Partial']} Partial / {counts['Mock']} Mock**. Real nghĩa code path có implementation, chưa chứng nhận deploy. Mock gồm hai sample runtime modes/compare và reminder legacy unmounted; không gọi đó là email thật.

## Strongest parts

- Separate learner/instructor role routing theo DB, verified JWT và RLS thay vì role browser tự đặt.
- Canonical UUID curriculum chain và enrollment course authorization trong SQL.
- Atomic RPC + sync trigger bảo đảm attempt/progress transaction, advisory lock numbering và deterministic backfill.
- Judge contract validated client/server/SQL; malformed evaluation không tự tạo best_score.
- Simulation có guard không gửi fake output vào Judge và không ghi completion; tutorial scoped DB theo account/screen.

## Weakest parts / 5 major debt groups

1. Access inconsistencies: public read→API gate, clock expiration không enforce chung, global instructor scope.
2. Assessment provenance: score/output/context do client submit; completed chỉ là run persisted.
3. Browser data isolation và UI wiring/state: history/library shared storage, library không nạp editor, async score/save divergence.
4. Curriculum/schema/migration drift: seed fallback và DB có thể khác course, baseline không final,016/017 coupled rollout.
5. Test/build/scaling boundary: fixtures stale, source regex nhiều, API không typechecked build, instructor collection aggregation client.

CRITICAL: không có finding đủ bằng chứng để gán. HIGH findings là static code/SQL conclusions, chưa exploit production. Details/evidence ở08 và07.

## Test/build

tsc PASS, Vite build PASS; hoàn tất **{passed}/{len(testrows)} local scripts PASS / {failed} FAIL / 5 SKIP**. Access test lần đầu pass rồi fail (fallback ID collision nghi ngờ có cơ sở). Public class assertion stale; vertical slice đòi seeds/demo role cũ. Không có % test coverage đo được, không SQL/runtime production verification.

## Human confirmation còn thiếu

- Deployed commit nào và DB đã apply đến migration nào, đặc biệt016/017?
- Instructor global quyền tất cả client/course có phải chính sách được chấp nhận; course_instructors được dùng ngoài repo không?
- Completed nghĩa đã chạy bài hay đạt năng lực; threshold UI7/10 và enrollment.completed có ý nghĩa quản lý thế nào?
- Class end_date là thông tin hay phải thu hồi access; có job/manual process ngoài repo không?
- Score có dùng đánh giá chính thức hay feedback practice; client-supplied score có được chấp nhận?
- History/library browser dùng chung account có phù hợp và có dữ liệu nhạy cảm thực không?
- Supabase/Vercel settings, OAuth redirect, provider keys/models/quota, data row counts/content production hiện tại?

Đây là audit độc lập của code local. Không Gap Analysis, target architecture, BRD/PRD/SAD mới hoặc implementation trong pha này.
'''
put('10_AS_IS_EXECUTIVE_SUMMARY.md','As-Is Executive Summary',summary)
manifest='''## Scope manifest

- Audit local repository tại commit ghi trên đầu trang; tracking main behind4, không checkout remote/deploy.
- Không đọc Refined BRD, không dùng future/proposal direction làm current capability.
- Chỉ docs audit + temporary runner/log; không commit/push/deploy/DB mutation/application changes.
- Stack/product/DB/architecture/AI/access/strengths/weaknesses/debt ở bảng dưới; executive summary10 là điểm bắt đầu đọc.

'''+table(['Topic','Current state','Artifact'],[
('Stack','React19/TypeScript5.7/Vite6/Tailwind3; Supabase JS/Auth/Postgres; Vercel handlers; OpenAI/Gemini','01_SYSTEM_OVERVIEW.md'),
('Capabilities',f'{len(features)} audit units: {counts["Real"]} Real, {counts["Partial"]} Partial, {counts["Mock"]} Mock; scope/rules explained','02_FEATURE_INVENTORY.md'),
('DB model','14 repo-declared public tables; schema baseline +002–017; attempts event/progress aggregate; no live catalog verified','03_DATABASE_AND_SQL.md'),
('Architecture','SPA directly Auth/Data API/RPC; AI API authorizes and calls provider, browser saves DB','04_CURRENT_ARCHITECTURE.md'),
('User flows','Google→role→enrollment→Hybrid run/evaluate/save; Instructor CRUD and snapshot KPI','05_USER_FLOWS.md'),
('AI flow','Server OpenAI priority; Gemini per-model retries; client context/rubric; 5x2 Judge; simulation no persistence','06_AI_FLOW.md'),
('Access','JWT/RLS/RPC owner checks; public metadata/nonUUID gap; no common clock expiry; instructor global','07_ACCESS_CONTROL.md'),
('Strengths','Atomic progress, canonical curriculum relationships, contract validation, explicit simulated safety','10_AS_IS_EXECUTIVE_SUMMARY.md'),
('Weakness/debt','Trust client score, browser data isolation, access inconsistencies, content drift, test/API/scale limits','08_TECH_DEBT_AND_RISKS.md'),
('Runtime',f'tsc/Vite PASS; {passed}/{len(testrows)} scripts PASS; {failed} FAIL;5 SKIP; no live DB/browser/provider certification','09_TEST_AND_RUNTIME_STATUS.md'),
('Unresolved','Deployed revision/migration ledger, actual data/config, role scope, completion meaning, expiry process, assessment trust','10_AS_IS_EXECUTIVE_SUMMARY.md')])
manifest+='\n## Artifacts / reading order\n\n'
for n in ['10_AS_IS_EXECUTIVE_SUMMARY.md','01_SYSTEM_OVERVIEW.md','02_FEATURE_INVENTORY.md','03_DATABASE_AND_SQL.md','04_CURRENT_ARCHITECTURE.md','05_USER_FLOWS.md','06_AI_FLOW.md','07_ACCESS_CONTROL.md','08_TECH_DEBT_AND_RISKS.md','09_TEST_AND_RUNTIME_STATUS.md']:
 manifest+=f'- [{n}]({n})\n'
manifest+='\n## Evidence policy\n\nCode/SQL ưu tiên hơn historical docs. Static declarations không là bằng chứng production object đang tồn tại. File inventory hashes/line count ở01, exact DDL/index/trigger ở03, latest policy bodies ở07, command output ở09. No production secrets copied. Future/proposal files chỉ được ghi nhận tên và loại khỏi căn cứ. Không có Gap Analysis hay rebuild proposal.\n'
put('CURRENT_STATE_MANIFEST.md','Promptify Current State Manifest',manifest)
# Final corrections based on exact SQL three-valued logic, not doc intentions.
for p in O.glob('*.md'):
 s=p.read_text(encoding='utf-8')
 s=s.replace('validator, sync triggers, deterministic backfill','validator (có missing-key NULL gap), sync triggers, deterministic backfill')
 s=s.replace('JSON lỗi vẫn được lưu ở attempt nhưng không góp best_score.', 'JSON bị validator trả NULL vẫn được lưu ở attempt nhưng không góp best_score; không phải mọi malformed payload đều bị SQL validator bắt (xem SQL-01 dưới đây).')
 s=s.replace('Judge contract validated client/server/SQL; malformed evaluation không tự tạo best_score.', 'Judge contract được validate chặt hơn ở client/server; SQL validator có missing-key NULL gap, không bảo đảm mọi malformed evaluation đều bị loại khỏi best_score.')
 s=s.replace('DB validates score shape, not provenance:', 'DB cố validate score shape nhưng có missing-key NULL gap; không validate provenance:')
 s=s.replace('DB validates score shape, not provenance', 'DB cố validate score shape nhưng có missing-key NULL gap; không validate provenance')
 s=s.replace('Malformed or inconsistent evaluation JSON remains on the attempt but contributes no `best_score`.', 'Intended invalid-score filtering needs NULL-semantics verification.')
 s=s.replace('Judge contract validated client/server/SQL', 'Judge contract validated client/server; SQL has missing-key NULL gap')
 s=s.replace('contract validation, explicit simulated safety', 'client/server contract validation, explicit simulated safety')
 p.write_text(s,encoding='utf-8')
sqlgap='''
## SQL-01 — HIGH: Missing-key gap trong valid_evaluation_total

Nguồn: `supabase/migrations/016_add_server_backed_lesson_progress.sql:48` và `:62`. Đây là phân tích static theo SQL NULL/PLpgSQL IF, **chưa thực thi trên Postgres**.

Các checks `jsonb_typeof(payload -> 'scores') <> 'object'` và `jsonb_typeof(payload -> 'scores' -> score_key) <> 'number'` không dùng `IS DISTINCT FROM` hoặc presence check. Key không tồn tại cho SQL NULL; phép `NULL <> value` trả NULL. PL/pgSQL IF chỉ vào nhánh khi điều kiện TRUE, không khi NULL. score_value/score_total trở thành NULL; final `declared_total <> score_total` cũng NULL và không RAISE/RETURN NULL. Nếu total hợp lệ được khai báo (ví dụ `{ "total": 10 }`, hoặc scores thiếu một key), function có đường RETURN declared_total=10.

Client/server validator TypeScript từ chối payload này, nhưng authenticated caller có thể bỏ qua frontend và gọi record/retry RPC trực tiếp. SQL function vì vậy không là contract gate tương đương TypeScript; có thể góp best_score từ incomplete evaluation. Đây là rủi ro riêng với score provenance: ngay cả shape gate còn có lỗ missing-key. JSON explicit null bị jsonb_typeof trả string 'null' và khác missing SQL NULL; không trộn hai trường hợp.

Không sửa SQL, không gọi RPC để kiểm trên production. Cần human xác nhận migration deployed và disposable Postgres runtime verification ở pha được phép. Static regex test progress đang assert có câu check, không kiểm semantics NULL.
'''
for name in ['03_DATABASE_AND_SQL.md','06_AI_FLOW.md','07_ACCESS_CONTROL.md','08_TECH_DEBT_AND_RISKS.md']:
 with (O/name).open('a',encoding='utf-8') as f:f.write(sqlgap)
for name in ['10_AS_IS_EXECUTIVE_SUMMARY.md','CURRENT_STATE_MANIFEST.md']:
 with (O/name).open('a',encoding='utf-8') as f:f.write('\n## SQL validator caveat\n\nHIGH SQL-01: valid_evaluation_total dùng <> với jsonb_typeof trên key thiếu, SQL NULL có thể làm incomplete scores được trả declared total hợp lệ. Phân tích static; chưa execute DB. Details ở03/07/08.\n')
with (O/'08_TECH_DEBT_AND_RISKS.md').open('a',encoding='utf-8') as f:
 f.write('\n## Thêm debt đã xác minh ở call sites\n\n- MEDIUM: archiveOrDeleteCourse không kiểm error từ SELECT classes hoặc DELETE course; có thể trả success deleted dù FK/RLS/network từ chối. Nguồn dbService.ts:528/550.\n- MEDIUM: LearnerHome dùng totalLabCount của curriculum selected class làm mẫu số cho mọi class card. Courses có lesson count khác nhau thì phần trăm các card có thể sai. Nguồn LearnerHome.tsx:63.\n- LOW: LearnerDashboard subtitle map cố định order1–5 theo giáo trình cũ, có thể không khớp DB lesson title/concept; locked status là UI gợi ý, không SQL prerequisite gate.\n- LOW: Legacy Playground/Notebook run gọi executePromptStream không có classId và local heuristic score/onRecordRun trước persisted RPC; không là luồng active App.\n')
# Column distinction requested by audit brief.
p=O/'02_FEATURE_INVENTORY.md'; s=p.read_text(encoding='utf-8')
old=table(['Feature','Current status','Where implemented (src/components hoặc src/services nếu viết ngắn)','Persistence','Known limitation'],features)
new=table(['Feature','Current status','Where implemented (src/components hoặc src/services nếu viết ngắn)','Real / Mock / Partial','Persistence','Known limitation'],[(r[0], 'Legacy/unmounted' if r[0] in ['Notebook workspace','Instructor learner detail/reminder'] else 'Implemented with limits' if r[1]=='Partial' else 'Sample behavior' if r[1]=='Mock' else 'Implemented code path', r[2],r[1],r[3],r[4]) for r in features])
p.write_text(s.replace(old,new),encoding='utf-8')
print('Created',len(list(O.glob('*.md'))),'Markdown artifacts; counts',counts,'tests',passed,failed)
