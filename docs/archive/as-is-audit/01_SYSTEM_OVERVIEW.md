# As-Is System Overview

> Audit ngày 2026-10-05 · local `main` · commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.

## 1. Hệ thống hiện tại

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

## 8. Inventory source/data/test/SQL đã kiểm kê

| File | Lines | SHA256 normalized text (12 ký tự) |
| --- | --- | --- |
| src/App.tsx | 1054 | 4453089ea33d |
| src/components/auth/LandingLoginScreen.tsx | 567 | 9fcd1381c321 |
| src/components/classes/ClassSelectionScreen.tsx | 189 | 55d6a8041400 |
| src/components/common/ABCompareModal.tsx | 652 | 7bd021e351ba |
| src/components/common/AiCoach.tsx | 808 | 7ce7f2f9f456 |
| src/components/common/ApiKeyModal.tsx | 54 | c0c4d6ab9065 |
| src/components/common/DiffCompareModal.tsx | 51 | a3e0653bda75 |
| src/components/common/ExpirationBanner.tsx | 61 | 097f54668c57 |
| src/components/common/GuidedWalkthrough.tsx | 626 | 7e30d438b699 |
| src/components/common/Header.tsx | 209 | 19174597e841 |
| src/components/common/InlineCompareCard.tsx | 60 | 5d69d7524caa |
| src/components/common/LearningBadges.tsx | 131 | c375c4033c05 |
| src/components/common/MarkdownView.tsx | 366 | 6a63917d1bfd |
| src/components/common/MiniChallengeCard.tsx | 95 | ed8b3613c246 |
| src/components/common/OnboardingTutorial.tsx | 188 | 21f263e5aa58 |
| src/components/common/PromptifyMark.tsx | 14 | 3dccaaf3bf6b |
| src/components/common/PromptLibraryModal.tsx | 309 | 3c32e7764b85 |
| src/components/common/PromptVersionBar.tsx | 102 | a568682a7171 |
| src/components/common/RubricScorecard.tsx | 108 | 6d3c340681ed |
| src/components/common/SavePromptModal.tsx | 179 | 9293000ceede |
| src/components/dashboard/LearnerDashboard.tsx | 283 | de7cda484212 |
| src/components/dashboard/LearnerHome.tsx | 128 | 581622efda66 |
| src/components/history/PromptHistoryView.tsx | 271 | 21ac8572b2a7 |
| src/components/hybrid/HybridView.tsx | 1423 | 80e4215d2918 |
| src/components/instructor/ActivityStreamView.tsx | 142 | 18941d87892f |
| src/components/instructor/AddLearnerModal.tsx | 182 | 9526fd59f27b |
| src/components/instructor/ClassDetailView.tsx | 389 | cfd3a146e48d |
| src/components/instructor/CourseCurriculumEditor.tsx | 476 | b9a456fbef44 |
| src/components/instructor/CourseManagementModal.tsx | 418 | f061aab14610 |
| src/components/instructor/InstructorDashboard.tsx | 342 | c0e2612b1f36 |
| src/components/instructor/InstructorNavbar.tsx | 192 | 4579a28d4090 |
| src/components/instructor/InstructorViewShell.tsx | 480 | e353b45130f8 |
| src/components/instructor/InstructorWalkthrough.tsx | 539 | 034a9616bcca |
| src/components/instructor/LearnerDetailModal.tsx | 276 | bf325dc2a037 |
| src/components/instructor/LearnerTableView.tsx | 567 | 595cac99a7c4 |
| src/components/landing/AnimatedBrandWatermark.tsx | 99 | a69ba1ec7b3a |
| src/components/landing/RevealOnScroll.tsx | 106 | 8efe95b44795 |
| src/components/lesson/AssistanceConfirmModal.tsx | 142 | 292107427ac9 |
| src/components/lesson/LessonBriefPanel.tsx | 480 | be9eed202cee |
| src/components/lesson/LessonHeaderBar.tsx | 121 | 7a56fd88f9c4 |
| src/components/library/PromptLibraryView.tsx | 269 | 79a8968d4be9 |
| src/components/navigation/ProductNavbar.tsx | 229 | acb4c2040720 |
| src/components/notebook/NotebookCell.tsx | 606 | 60390331f8a2 |
| src/components/notebook/NotebookCoach.tsx | 386 | e75d16bacf94 |
| src/components/notebook/NotebookView.tsx | 220 | ea3f1148ac67 |
| src/components/playground/PlaygroundView.tsx | 457 | c286fbb07a5e |
| src/components/prompt/InlineDiffSuggestionCard.tsx | 218 | 3c06079e6760 |
| src/components/prompt/PromptComposer.tsx | 763 | d41905eac25d |
| src/components/prompt/PromptStructurePanel.tsx | 350 | 10a5b215493f |
| src/components/telemetry/HistoryDrawer.tsx | 159 | 9c1847f8aa64 |
| src/data/curriculumSeed.ts | 1413 | 6bd83935ed6b |
| src/data/labsData.ts | 30 | 51ba4e2b52db |
| src/index.css | 155 | 41caf682c451 |
| src/main.tsx | 11 | 6003a74b73c2 |
| src/services/aiEvaluationContract.ts | 73 | ecff88fd8e88 |
| src/services/apiAuthorizationService.ts | 74 | 9f42a9ec8d04 |
| src/services/apiServerService.ts | 427 | 2d37c0028ea1 |
| src/services/businessEvaluationService.ts | 394 | 09a666bcffc4 |
| src/services/curriculumAdapter.ts | 71 | 7e1a58d31494 |
| src/services/dbService.ts | 1463 | 40cd9e9bb0cb |
| src/services/instructorTutorialConfig.ts | 234 | 26198170388d |
| src/services/labComplianceService.ts | 341 | 2c51425cffea |
| src/services/lessonUrlState.ts | 26 | aa798f6aeffc |
| src/services/llmService.ts | 313 | 5dfef5dfe0c7 |
| src/services/promptStructureAnalyzer.ts | 285 | 3e7a6e375311 |
| src/services/supabaseClient.ts | 54 | 2d8a08259004 |
| src/services/tutorialConfig.ts | 221 | 5412f74957ae |
| src/types/database.ts | 245 | a6e47bed68d9 |
| src/types/index.ts | 228 | 596cf5f0aca4 |
| src/types/instructor.ts | 78 | 148b62fd9083 |
| src/vite-env.d.ts | 2 | bf144e3cdae6 |
| api/evaluate.ts | 32 | 4319e78edc3c |
| api/generate.ts | 32 | f07470bead74 |
| supabase/migrations/002_add_grants_and_rls.sql | 272 | ffb188253e2d |
| supabase/migrations/003_create_prompt_attempts.sql | 68 | b6448ced68aa |
| supabase/migrations/004_course_content_management.sql | 302 | bbc1585f7205 |
| supabase/migrations/005_seed_curriculum_specs.sql | 2663 | 948b909fe666 |
| supabase/migrations/006_enforce_course_enrollment_access.sql | 167 | 23c8200c9e6a |
| supabase/migrations/007_user_tutorial_progress.sql | 29 | fbe9ff0c555d |
| supabase/migrations/008_seed_tester_course.sql | 146 | 8a82d7d0928e |
| supabase/migrations/009_fill_tester_sample_prompts.sql | 138 | b4ac285355a9 |
| supabase/migrations/010_allow_update_prompt_attempts.sql | 24 | f9e680ceae19 |
| supabase/migrations/011_update_agribank_curriculum.sql | 2605 | 8778355b6b27 |
| supabase/migrations/012_public_testing_class_self_enrollment.sql | 122 | 0acf134e8677 |
| supabase/migrations/013_align_tester_solution_prompts.sql | 139 | 0c44ae8cbdba |
| supabase/migrations/014_improve_tester_theory_content.sql | 102 | 7c2f62d3e14c |
| supabase/migrations/015_remove_seed_mock_users.sql | 15 | bb5cfebe23de |
| supabase/migrations/016_add_server_backed_lesson_progress.sql | 505 | f4ee344d83f4 |
| supabase/migrations/017_enforce_atomic_progress_writes.sql | 15 | 95e54808ebee |
| supabase/rollback_016_add_server_backed_lesson_progress.sql | 16 | 0169b00a4aa0 |
| supabase/rollback_017_enforce_atomic_progress_writes.sql | 10 | 7928a2b544f4 |
| supabase/schema.sql | 399 | 386854700fc9 |
| supabase/staging/README.md | 80 | abbbc2db9ec6 |
| supabase/staging/server_backed_progress_expected.json | 15 | 29e3b08b705d |
| supabase/staging/server_backed_progress_fixture.sql | 87 | ff92f3d4be11 |
| supabase/staging/verify_016_database.sql | 123 | 94917dfa4db0 |
| supabase/staging/verify_017_grants.sql | 16 | e67177a1b691 |
| test/test_live_gemini.ts | 36 | a62c3b2dc4c3 |
| test/verify_ai_evaluation_contract.ts | 67 | e98a7037635c |
| test/verify_course_curriculum.ts | 114 | b9916822ec1e |
| test/verify_enrollment_access.ts | 72 | e0238adf089b |
| test/verify_generation_grounding_and_evaluation.ts | 99 | bb058cc14b5d |
| test/verify_generation_prompt_isolation.ts | 62 | 56168cc79671 |
| test/verify_highlight.ts | 43 | aa2e598b4a7f |
| test/verify_identity_cleanup.ts | 17 | d42b9e7e1405 |
| test/verify_interactive_tutorial.ts | 28 | 38e645b1f03d |
| test/verify_learner_home_class_menu.ts | 18 | 94fe521c0d3b |
| test/verify_lesson_url_navigation.ts | 39 | 1a0b8c6001c9 |
| test/verify_live_api_endpoint.ts | 32 | 55607605cc3e |
| test/verify_live_evaluate_endpoint.ts | 34 | 7dd8feecb15a |
| test/verify_logout.ts | 139 | 1e3d4771b1c9 |
| test/verify_oauth_enrollment.ts | 103 | 5f527b035909 |
| test/verify_pedagogical_flow.ts | 122 | 05e4abacfc59 |
| test/verify_pii_and_autocompletion.ts | 62 | 25576cbda2e9 |
| test/verify_progress_migration_staging.ts | 218 | 21cace6bfcdc |
| test/verify_prompt_analyzer.ts | 167 | 99f0c9d7d0d3 |
| test/verify_public_testing_class.ts | 31 | 51251826a978 |
| test/verify_real_ai_flow.ts | 184 | f300d5967e7a |
| test/verify_selective_integration_safety.ts | 35 | d061f05d4a32 |
| test/verify_server_backed_learning_progress.ts | 81 | 3fe8fc995da1 |
| test/verify_slice.ts | 127 | 98109a8c0d25 |
| test/verify_tab_switch.ts | 202 | e94e1aa0bec5 |
| test/verify_tester_sample_prompts.ts | 90 | a15987d11b7f |
| test/verify_tutorial_tester_course.ts | 49 | 569b72eef473 |
| curriculum-levels/01_ZERO_SHOT_PROMPTING.md | 135 | b41204431769 |
| curriculum-levels/02_STRUCTURED_5_ELEMENTS.md | 158 | 39db810971e1 |
| curriculum-levels/03_FEW_SHOT_AND_IN_CONTEXT_LEARNING.md | 155 | 5f15abfbfefe |
| curriculum-levels/04_CHAIN_OF_THOUGHT_COT.md | 172 | 1a94ac544462 |
| curriculum-levels/05_TREE_OF_THOUGHTS_TOT.md | 169 | 8744ee286e01 |
| curriculum-levels/06_SELF_CONSISTENCY_AND_ENSEMBLING.md | 161 | e095a0fc365e |
| curriculum-levels/07_REACT_AND_AGENTIC_LOOPS.md | 190 | 9a8dae591f7f |
| curriculum-levels/08_TOOL_AND_FUNCTION_CALLING.md | 163 | 0d8d23bfc52a |
| curriculum-levels/09_SAMPLING_PARAMETERS_T_AND_P.md | 160 | 7816acd7d568 |
| curriculum-levels/10_STRUCTURED_OUTPUTS_AND_JSON.md | 174 | fc7e8b388603 |
| curriculum-levels/11_GROUNDING_RAG_CONTEXT_ENGINEERING.md | 172 | b126b1f93938 |
| curriculum-levels/12_STEP_BACK_AND_META_PROMPTING.md | 141 | de223608baba |
| curriculum-levels/13_PII_SCRUBBING_AND_DATA_PRIVACY.md | 182 | 572ae6dfb496 |
| curriculum-levels/14_PROMPT_INJECTION_AND_DEFENSE.md | 173 | d77421622a63 |
| curriculum-levels/15_FLIPPED_INTERACTION_AND_SOCRATIC.md | 148 | bf12c8bb0cdf |
| curriculum-levels/16_DIPLOMATIC_AND_TONE_SHIFTING.md | 139 | 5d3b6f24c5f0 |
| curriculum-levels/17_BLUF_AND_EXECUTIVE_BRIEFING.md | 158 | c2d585790924 |
| curriculum-levels/18_DEVIL_ADVOCATE_AND_RISK_AUDIT.md | 146 | 817f451d68bc |
| curriculum-levels/19_ACTION_BREAKDOWN_AND_SYNTHESIS.md | 154 | 40bf0e7a2fba |
| curriculum-levels/20_SELF_REFINE_AND_REFLEXION.md | 160 | f1ffa47b72a5 |
| curriculum-levels/21_MULTIMODAL_VISION_PROMPTING.md | 164 | de7ff0233a20 |
| curriculum-levels/22_PROMPT_CACHING_AND_EFFICIENCY.md | 168 | 5eceee7dc71f |
| curriculum-levels/README.md | 91 | 4b7524a6afab |
| curriculum-specs/AUTO_COMPLETION_AND_EVALUATION_FIX_SPEC.md | 160 | 0da04fc11203 |
| curriculum-specs/INTERACTION_DESIGN_AND_BEFORE_AFTER_SPEC.md | 128 | 7b1029b8e8c0 |
| curriculum-specs/LAB_01_PII_SCRUBBING.md | 126 | 2ee09dd7a13a |
| curriculum-specs/LAB_02_CONTEXT_ENGINEERING.md | 132 | 72aa3388b0ad |
| curriculum-specs/LAB_03_MULTISTEP_COT_GUARDRAILS.md | 138 | 22533ccec3aa |
| curriculum-specs/LAB_04_REACT_AGENTIC_WORKFLOW.md | 151 | a45fe78f29e3 |
| curriculum-specs/LAB_05_TEMPERATURE_AND_SAMPLING.md | 100 | 851ab74269d6 |
| curriculum-specs/LAB_06_STRUCTURED_OUTPUTS_EXTRACTION.md | 131 | d65563768644 |
| curriculum-specs/LAB_07_PROMPT_INJECTION_AND_DEFENSE.md | 128 | d463e7bf7962 |
| curriculum-specs/LAB_08_STEPBACK_AND_META_PROMPTING.md | 122 | 11fdc33fb32f |
| curriculum-specs/README.md | 125 | 8f5a72de99fa |

## 9. Resolved versions trong package-lock

| Package | Version |
| --- | --- |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| typescript | 5.9.3 |
| vite | 6.4.3 |
| tailwindcss | 3.4.19 |
| @supabase/supabase-js | 2.116.0 |
| tsx | 4.23.15 |
| lucide-react | 1.47.0 |
| @floating-ui/react | 0.27.20 |

CSS: Tailwind scan index.html + src; PostCSS Tailwind/Autoprefixer; fonts Inter/Plus Jakarta Sans/JetBrains Mono trong config. main.tsx mount App trong React.StrictMode.
