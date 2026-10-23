# As-Is Tech Debt and Risks

> Audit ngày 2026-10-05 · local `main` · commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.

## Severity và giới hạn

CRITICAL: bằng chứng compromise/data loss nghiêm trọng cần xử lý tức thì. HIGH: access/assessment/data exposure hoặc vận hành có tác động lớn. MEDIUM: correctness/maintainability/scale. LOW: naming/docs/UX clarity. Không tìm thấy bằng chứng đủ để gán CRITICAL trong audit local; không có nghĩa production an toàn. Findings chưa runtime verified ghi giới hạn. Không sửa và không đề xuất target architecture.

| Severity | ID | Finding | Evidence (src paths nếu ngắn) | Impact/limit |
| --- | --- | --- | --- | --- |
| HIGH | TD-01 | AI guard public class bypass enrollment khi lesson nonUUID/absent | apiAuthorizationService.ts:55; migration012 | Gọi provider ngoài learner enrollment gate; kết luận static, chưa test live |
| HIGH | TD-02 | Evaluation/progress trust client | migration016 record/retry RPC; Hybrid handleRun | Có thể self-submit hợp lệ 10/10/fictional output; validator chỉ shape |
| HIGH | TD-03 | Ngày hết hạn không enforce trong active helpers | migration006; migration016; App expiry defaults | End date không tự thu hồi access nếu status vẫn active |
| HIGH | TD-04 | History/library/assistance browser shared account/class | App history + clearSessionState; businessEvaluationService | Logout không xóa, storage key không scope; người dùng sau cùng browser có thể nhìn cached prompt/output |
| HIGH | TD-05 | Generation/Judge request unrestricted và client content | apiServerService; api handlers | Không quota/rate/body bounds/canonical input; chi phí và prompt manipulation |
| HIGH | TD-06 | Mất nhất quán nội dung/progress khi DB load lỗi | App loadCourseCurriculum; curriculumAdapter; DB RPC | Fallback seed cho course khác; guard/write có thể từ chối hoặc bài không phù hợp |
| MEDIUM | TD-07 | Instructor role global và assignments unenforced | migration004/schema RLS | Scope rộng; severity phụ thuộc chính sách human |
| MEDIUM | TD-08 | Run overlap khi judge/save đang chờ | HybridView:568; PromptComposer:658 | isRunning false trước evaluate, state/attempt version không chắc đồng bộ |
| MEDIUM | TD-09 | Editor không nhận library prompt | App:756, Hybrid props:43 | Action set App.activePrompt nhưng editor internal state không nhận |
| MEDIUM | TD-10 | Re-evaluation UI đã cập nhật nhưng DB lỗi chỉ warn | HybridView:740/764 | Hiển thị score khác persisted score |
| MEDIUM | TD-11 | Curriculum mutation nhiều request | dbService replaceLessonRubrics/resources; CourseCurriculumEditor | Delete-before-insert và lesson+rubrics+resources không một transaction |
| MEDIUM | TD-12 | Progress delete/re-score không recompute toàn bộ | migration016 triggers;003 delete policy | Delete attempt không giảm count/max; lower re-score không giảm best_score |
| MEDIUM | TD-13 | Weak identity bridge | users.auth_provider_id; current_user_id; insert policy | Nullable/nonunique TEXT + OR resolution; potential misbinding |
| MEDIUM | TD-14 | Scaling phía client | InstructorViewShell reloadClasses; dbService instructor queries | N requests theo courses/classes, tải collections không pagination rồi sort/filter/aggregate |
| MEDIUM | TD-15 | Build gate không cover API/test config TS | tsconfig include src | tsx không typecheck tests; Vercel handler typing không gate local build |
| MEDIUM | TD-16 | Migration/schema drift | schema.sql + 002/004/006/012; 005/011;016/017 | Reapply old SQL có thể rollback security policies; deployed chain chưa biết |
| MEDIUM | TD-17 | Local fallback ID collision | dbService user-/learner-Date.now | Test access nondeterministic khi tạo accounts cùng millisecond; không production UUID bug |
| LOW | TD-18 | Duplicated heuristic/business vocabulary | promptStructureAnalyzer; businessEvaluationService; llmService; labComplianceService | Cùng concept kiểm theo regex/keyword khác nhau; UI legacy persona/variable khác judge criteria |
| LOW | TD-19 | Hardcoded demo/domain values và legacy branches | App 4/8h/18:00; LearnerDetailModal 5 labs; labsData aliases | Dễ gây hiểu lầm về actual course/expiry; modal cũ không reachable |
| LOW | TD-20 | Token/stream labels và config dư | llmService; ApiConfig; ApiKeyModal | Word animation không streaming; ignores actual tokens; temp config không gửi server |
| LOW | TD-21 | Docs/test fixtures stale | README; test slice/public class; test plan | Claims demo/Notebook/pass24 không khớp hiện tại |
| LOW | TD-22 | Library/history storage không bound | businessEvaluationService; App | Quota/JSON errors và dữ liệu dài tăng browser storage; không retention policy |

## 5 nhóm nợ kỹ thuật lớn nhất

1. Access model không nhất quán: class public read/API gate, expiration theo status, scope instructor global.
2. Assessment integrity: client gửi rubric/output/score và completion dựa vào event persist, không chứng minh năng lực hay provenance.
3. State/persistence phân tán: DB attempts/progress, browser history/library/assistance, state editor/App và async retry/run.
4. Curriculum/migration drift: static seed/DB content/Markdown, fallback khác course, baseline không consolidated, rollout016/017 cần phiên bản đồng bộ.
5. Verification/scale boundaries: source regex tests và fixtures cũ, build thiếu API typecheck, instructor tải dữ liệu nhiều request/client aggregation.

## Legacy/unreachable source

NotebookView/NotebookCell/NotebookCoach và PlaygroundView không được App import/render. LearnerDetailModal chỉ toast reminder và hardcoded 5 labs, không được active learner table mount. Header/OnboardingTutorial/ExpirationBanner/HistoryDrawer và các helper cũ cần phân biệt existence với reachable runtime. Phần sau là static import reachability từ `src/main.tsx`; lazy imports/dynamic component registration cần human review nếu bổ sung ngoài graph này. Không xóa file.

| Source không reach qua static import từ main | Trạng thái |
| --- | --- |
| src/components/common/ExpirationBanner.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/common/Header.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/common/InlineCompareCard.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/common/LearningBadges.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/common/MiniChallengeCard.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/common/OnboardingTutorial.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/common/RubricScorecard.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/instructor/LearnerDetailModal.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/notebook/NotebookCell.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/notebook/NotebookCoach.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/notebook/NotebookView.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/playground/PlaygroundView.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/components/telemetry/HistoryDrawer.tsx | Unreachable candidate; có thể dùng ở test/API riêng |
| src/services/apiAuthorizationService.ts | Unreachable candidate; có thể dùng ở test/API riêng |
| src/services/apiServerService.ts | Unreachable candidate; có thể dùng ở test/API riêng |
| src/vite-env.d.ts | Unreachable candidate; có thể dùng ở test/API riêng |

## SQL-01 — HIGH: Missing-key gap trong valid_evaluation_total

Nguồn: `supabase/migrations/016_add_server_backed_lesson_progress.sql:48` và `:62`. Đây là phân tích static theo SQL NULL/PLpgSQL IF, **chưa thực thi trên Postgres**.

Các checks `jsonb_typeof(payload -> 'scores') <> 'object'` và `jsonb_typeof(payload -> 'scores' -> score_key) <> 'number'` không dùng `IS DISTINCT FROM` hoặc presence check. Key không tồn tại cho SQL NULL; phép `NULL <> value` trả NULL. PL/pgSQL IF chỉ vào nhánh khi điều kiện TRUE, không khi NULL. score_value/score_total trở thành NULL; final `declared_total <> score_total` cũng NULL và không RAISE/RETURN NULL. Nếu total hợp lệ được khai báo (ví dụ `{ "total": 10 }`, hoặc scores thiếu một key), function có đường RETURN declared_total=10.

Client/server validator TypeScript từ chối payload này, nhưng authenticated caller có thể bỏ qua frontend và gọi record/retry RPC trực tiếp. SQL function vì vậy không là contract gate tương đương TypeScript; có thể góp best_score từ incomplete evaluation. Đây là rủi ro riêng với score provenance: ngay cả shape gate còn có lỗ missing-key. JSON explicit null bị jsonb_typeof trả string 'null' và khác missing SQL NULL; không trộn hai trường hợp.

Không sửa SQL, không gọi RPC để kiểm trên production. Cần human xác nhận migration deployed và disposable Postgres runtime verification ở pha được phép. Static regex test progress đang assert có câu check, không kiểm semantics NULL.

## Thêm debt đã xác minh ở call sites

- MEDIUM: archiveOrDeleteCourse không kiểm error từ SELECT classes hoặc DELETE course; có thể trả success deleted dù FK/RLS/network từ chối. Nguồn dbService.ts:528/550.
- MEDIUM: LearnerHome dùng totalLabCount của curriculum selected class làm mẫu số cho mọi class card. Courses có lesson count khác nhau thì phần trăm các card có thể sai. Nguồn LearnerHome.tsx:63.
- LOW: LearnerDashboard subtitle map cố định order1–5 theo giáo trình cũ, có thể không khớp DB lesson title/concept; locked status là UI gợi ý, không SQL prerequisite gate.
- LOW: Legacy Playground/Notebook run gọi executePromptStream không có classId và local heuristic score/onRecordRun trước persisted RPC; không là luồng active App.
