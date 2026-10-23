> Superseded: user now requires duplicated internal source and two isolated apps, with no shared package. See [current architecture](../archive/repository/ARCHITECTURE-two-apps-2026-10-12.md) and [separation report](../archive/repository/SEPARATION_REPORT-2026-10-12.md). The analysis below is historical.

# Quyền sở hữu source: MVP và rebuild Intrepid

Ngày: 12/10/2026. Baseline: working tree branch rebuild, HEAD d7ac9d1 và các thay đổi có sẵn; không chuyển source hay deploy trong lượt này.

## Kết luận cho việc tách hai folder

Hai ứng dụng nên sở hữu UI, entry, config, API entry và tài liệu sản phẩm riêng. Phần thực sự dùng chung hiện nay gồm vài UI nhỏ, tiện ích auth/i18n/diff, và **backend chạy/chấm AI có persistence**. Shared database và migration history là một lớp thứ ba, không thuộc riêng ứng dụng nào chỉ vì tên file có `rebuild` hay `product`.

Không nên chuyển toàn bộ `common/` sang thư viện chung. Không nên chuyển toàn bộ `services/` vào Intrepid. Không cần đặt màn hình MVP dưới Intrepid hoặc ngược lại.

“MVP cũ” trong bản đồ này nghĩa là **nhánh UI `App.tsx` hiện đang có**, đã nhận một số nâng cấp rebuild. Nếu cần phiên bản nguyên bản trước rebuild, đó là công việc phục hồi một snapshot lịch sử khác; bản đồ này không tự rollback các nâng cấp hiện có.

## 1. MVP sở hữu

| Phần | Source hiện tại | Quyết định khi tách |
| --- | --- | --- |
| App và navigation | `src/App.tsx`, `components/navigation`, `classes` | Đưa vào `apps/promptify-mvp/src` |
| UI người học cũ | `dashboard`, `hybrid`, `lesson`, `prompt`, `history`, `library` | MVP sở hữu; không dùng chúng như shared UI của Intrepid |
| UI giảng viên cũ | `components/instructor` | MVP sở hữu, kể cả các panel nâng cấp rebuild giai đoạn đầu |
| Auth/landing cũ | `LandingLoginScreen`, `EnterpriseSignIn`, `ProfileConfirmation`, `AccessDenied`; `components/landing` | MVP sở hữu; tách riêng `StagingLogin` dùng chung bên dưới |
| Common nhưng thực tế riêng MVP | `ABCompareModal`, `AiCoach`, `ApiKeyModal`, `AttemptCompareDialog`, `DiffCompareModal`, `GuidedWalkthrough`, `PromptLibraryModal`, `PromptVersionBar`, `SavePromptModal`, `WorkspaceReferenceDialog` | Giữ trong common của MVP; tên common không có nghĩa cả hai app cần |
| Data access/curriculum cũ | `dbService`, `curriculumAdapter`, `lessonUrlState`, `src/data/labsData.ts`, `curriculumSeed.ts` | MVP runtime sở hữu; seed vẫn generated, không sửa tay |
| Prompt/AI client cũ | `llmService`, `businessEvaluationService`, `labComplianceService`, `promptStructureAnalyzer` | MVP sở hữu; client/API payload cũ cần được giữ khi tách |
| Hỗ trợ giảng viên cũ | `rosterImportService`, `sopService`, `workshopMessagingService`, `workshopRealtimeService`, `tutorialConfig`, `instructorTutorialConfig` | MVP sở hữu; Intrepid có đường backend riêng cho các tính năng tương ứng |
| Adapter render cũ | `combinedUiElement.ts` | Thuộc MVP theo dependency hiện tại; tên combined không chứng minh là shared |
| Types riêng UI | `src/types/index.ts`, `src/types/instructor.ts` | MVP sở hữu |
| API entry | `api/generate.ts`, `api/evaluate.ts` | MVP sở hữu endpoint; implementation phía sau hiện dùng chung |

Notebook/playground và các component không nằm trong closure của hai entry phải giữ ở vùng MVP lịch sử/chưa phân loại sau khi kiểm tra script và purpose. Không dùng kết quả graph để xóa chúng.

## 2. Rebuild Intrepid sở hữu

| Phần | Source hiện tại | Quyết định khi tách |
| --- | --- | --- |
| App shell | `components/rebuild/ProductionApp.tsx` | Entry riêng của `apps/promptify-intrepid` |
| Auth/landing mới | `ProductionLanding`, `ProductionEntry1/2/3` | Intrepid sở hữu; không nhập landing MVP làm route fallback |
| Learner | `ProductionHub`, `DepartmentSopLibrary`, `LearnerResourceHub`, `ProductionWorkspace`, `ProductionWorkspaceV7`, `learner-workspace.css`, `ProductionCompareSource`, `ProductionJudgeSource`, `ProductionSopInspectorSource`, `PromptLibrary` | Intrepid sở hữu |
| Facilitator/head/admin | `ProductionWorkshopSource`, `ProductionLearnerInspectorSource`, `ProductionStudioSource`, `SopRequestReview`, `ProductionAnalyticsSource`, `ProductionSopSource`, `ProductionGovernanceSource`, `ProductionRosterSource` | Intrepid sở hữu |
| Fallback/phiên bản native còn được import dùng trong JSX | `ProductionStudioV2`, `ProductionSop`, `ProductionAnalytics`, `ProductionGovernance`, `ProductionRoster`, `ProductionWorkshop`, `ProductionCohorts`, `ProductionCompare` | Giữ trong app Intrepid giai đoạn tách; chưa xóa theo audit cũ |
| Common riêng sản phẩm | `ProductDialog`, `ProductUseNotice` | Hiện chỉ Intrepid dùng; giữ trong common của Intrepid |
| Client/i18n nội dung học | `productionClientService`, `learnerContentLanguageService` | Intrepid sở hữu |
| Backend điều phối | `productionServerService`, `api/product.ts`, `api/roster-worker.ts` | Intrepid sở hữu |
| Backend integration/domain riêng | `googleRosterService`, `rosterWorkerService`, `driveFolderService`, `sopIngestionService`, `studioValidationService`, `awardDocumentService`, `governanceTelemetryService` | Intrepid sở hữu; không nhầm với roster CSV/SOP client của MVP |
| CSS/runtime resources | `production.css`, `source-ui.css`, `SourceIcon`; `public/fonts/NotoSans.ttf`, `OFL.txt` | Intrepid sở hữu. PDF đọc font theo `process.cwd()/public/fonts`, cần giữ includeFiles khi đổi root |
| Product types | `src/types/production.ts` | Intrepid sở hữu snapshot/profile/studio; các type AI dùng chung cần extraction riêng, xem mục 3 |

`ProductionStudio.tsx`, `ProductionWorkspaceSource.tsx`, `CombinedProductionHub`, `CombinedProductionWorkspace`, `combinedUiAdapter` là các phiên bản/adapter trung gian: giữ dưới design history/rebuild trước khi quyết định vị trí cuối. Compiler vẫn ghi một số file này. Chỉ chuyển sau khi sửa references, không xóa.

## 3. Phần dùng chung thực sự

### UI và client utilities

| Source | Consumer đã xác nhận | Quyết định |
| --- | --- | --- |
| `MarkdownView.tsx` | History/lesson/hybrid MVP và workspace/facilitator Intrepid | Shared UI nhỏ |
| `PromptifyMark.tsx`, `public/brand/promptify-mark.png` | Hai hệ UI; prototype cũng dùng logo | Shared brand assets |
| `StagingLogin.tsx` | Auth MVP và ProductionEntry/ProductionApp | Shared dev/test helper; mỗi app giữ điều kiện bật và redirect riêng |
| `authErrorService.ts` | StagingLogin và entry Intrepid | Shared auth utility |
| `textDiffService.ts` | Attempt compare MVP và compare Intrepid | Shared domain utility |
| `supabaseClient.ts` | Cả hai frontend | Shared factory/config contract; instance/session/config thuộc mỗi app. Không dùng việc share file để ép hai app dùng cùng database |
| `productI18nService`, `releaseUiTranslations`, `sourceUiTextService` | Auth MVP hiện dùng `useProductLanguage`; nhiều UI Intrepid dùng | Đang dùng chung cả cơ chế và dictionary; giữ nguyên trước, sau đó tách engine khỏi dictionary theo app |

Đây là giao cắt dependency frontend sau khi TypeScript bỏ type-only/unused imports. i18n và Supabase có state/env nên không phải utility thuần: khi hai app cùng origin, phải xét key localStorage/session trước khi đổi để tránh làm mất preference/session.

### Backend chạy/chấm AI

Các API MVP và Intrepid đều kéo theo:

- `rebuildRunService`: authorization, lesson snapshot, begin/finish run, Judge ownership/claim/persistence.
- `productionAiService`: provider generation/evaluation, model settings/fallback và weighted Judge.
- `apiAuthorizationService`: JWT/enrollment/lesson scope.
- `apiServerService`: lỗi/contracts AI; module còn chứa legacy provider handlers.
- `aiEvaluationContract`: validation/parsing evaluation contract, MVP client cũng dùng.
- `piiGuardService`, `learnerSettingsService`, `codelabLifecycleService`, `weightedRubricService`.

Tên `production`/`rebuild` không làm các service này thuộc riêng Intrepid: `api/generate.ts` và `api/evaluate.ts` đang gọi chúng trực tiếp. Mỗi app có API entry riêng nhưng có thể import cùng package server. Không bắt MVP gọi qua domain Vercel của Intrepid khi tách; sẽ tạo thêm dependency network/CORS/auth không cần thiết.

Shared domain phải browser-safe. Provider/key/service-role logic chỉ nằm trong shared server. Không re-export server module qua một barrel mà frontend import.

### Types cần chia nhỏ thay vì chuyển nguyên file

- `types/database.ts`: MVP sử dụng nhiều schema contracts. Shared AI contract sử dụng `AiEvaluationResult` qua `apiServerService`/`aiEvaluationContract`. Đặt hợp đồng DB dùng chung trong package contracts, hoặc extract đúng type AI; không yêu cầu Intrepid import mọi type UI MVP.
- `types/production.ts`: đa số thuộc Intrepid, nhưng `RubricCriterion`, `WeightedEvaluation` là dependency type của shared AI/weighted rubric. Extract các type này vào shared contracts rồi app re-export để giữ compatibility trong giai đoạn chuyển.
- `types/index.ts`: giữ riêng MVP. Không hợp nhất role UI chữ hoa với `ProductRole` để “dọn type”.

## 4. Database và migration history

Hai ứng dụng hiện tham chiếu các đối tượng liên quan như users/learners/classes/enrollments/lessons/prompt_attempts/lesson_progress; shared run service còn cần rebuild_runs và RPC begin/finish/claim/judge. MVP hiện cũng dùng messaging/SOP/profile upgrades.

**Giữ toàn bộ `supabase/migrations` và `supabase/rollback` cùng một vùng lịch sử database ở repo root trong lần tách source.** Không cắt 001–017 cho MVP, 018–049 cho Intrepid: chức năng mới có thể sửa bảng/RPC cũ và cả MVP đang gọi backend nâng cấp. File tồn tại không chứng minh đã được áp dụng live.

Nếu tiếp tục dùng cùng Supabase project: hai app chia sẻ dữ liệu và RLS, sửa schema có thể ảnh hưởng cả hai. Nếu muốn database riêng: đó là bước provisioning/migration/data transfer/OAuth/roster riêng, không nằm trong chuyển folder. Chưa thực hiện hoặc tự quyết định đổi database.

## 5. Prototype, generators, tests, config

Prototype review có chủ sở hữu riêng: `RebuildApp`, `ReviewScreen`, `review-i18n`, `review-manifest.json`, `review-templates.json`, `review.css`. Giữ ở `design-drafts` hoặc app review riêng nếu vẫn cần URL hoạt động. Không tự đưa nó vào MVP; cũng không dùng demo làm chứng nhận Intrepid.

`review-templates.json` vừa là prototype data vừa là input compiler Intrepid. Các `compile_production_*`, production source compiler, UI extraction/review/verification/package scripts cần đổi target paths cùng runtime. Curriculum generator và nguồn curriculum-specs/curriculum-levels phục vụ data history/seed, cần phân loại public Basic và các course; không regenerate trong lần tách. Docs lịch sử, source Word và design references giữ theo mục đích, không phân loại từ tên.

Tests thuộc app theo module được import **và** đường dẫn source/SQL được đọc: test session và learner UI hiện nhắm rebuild, enrollment/curriculum nhắm MVP; provider/PII/rubric/run contracts nhắm shared core; SQL tests nhắm database. Giữ live scripts riêng trong test plan, không chạy tất cả vì có thể mutate/consume credits. Đổi đường dẫn test source assertions cùng lúc đổi file runtime.

Mỗi app phải có `src/main.tsx`, `index.html`, Vite/TypeScript/Tailwind config, API entry và Vercel config riêng. Root hiện có title Agribank/corporate và tri-modal entry, không thể copy nguyên vào hai app rồi xem là hoàn tất. Global CSS/token hiện là build dependency của cả hai, cần tạo cấu hình app riêng và giữ visual baseline; không đổi thiết kế trong lần tách.

## 6. Cấu trúc đích đề nghị

```text
apps/
  promptify-mvp/         # src, api/generate+evaluate, public, config riêng
  promptify-intrepid/    # src, api/product+roster-worker, public, config riêng
packages/
  ui/                   # MarkdownView, PromptifyMark
  domain/               # diff, PII, settings, rubric, lifecycle
  auth-client/          # client factory/errors; staging helper nếu cần
  i18n/                 # cơ chế và dictionary hiện shared, tách dần sau
  contracts/            # AI/DB contracts thực sự được hai phía dùng
  ai-server/            # run/persist/auth/provider; server-only
supabase/               # giữ migrations và rollback lịch sử nguyên vẹn
design-drafts/          # review authority, prototype, phiên bản trung gian
scripts/                # generators/checks; cập nhật input/output theo owner
docs/                   # nguồn, audit và quyết định; chưa cần move toàn bộ
```

Các package này là ranh giới trách nhiệm đề nghị, chưa cần tạo cả sáu package ngay. Có thể bắt đầu một package shared với subpaths rõ `ui`, `domain`, `server`, `contracts`; app không import trực tiếp source của app còn lại. Workspace package cần được Vercel đưa vào build ngoài app Root Directory.

## 7. Bằng chứng và giới hạn

Generator: `node scripts/audit_ownership_imports.mjs`; kết quả `outputs/ownership-import-graph.json`. Đã chạy thành công: closure MVP frontend 77 file, Intrepid frontend 52, review 7, MVP API 11, Intrepid API 19. Số file gồm CSS/JSON; không phải kích thước bundle hay số file nên xóa.

Graph dùng TypeScript transpilation loại type-only/unused bindings rồi truy relative imports từ entry. Bao gồm nhánh conditional/fallback còn được giữ, không chứng minh mọi nhánh có thể chạy. Không tự bao phủ dynamic path tính toán, asset URL, SQL, generator/test đọc source. Những loại đó được đối chiếu thủ công ở các mục trên. Đặc biệt, raw import `CombinedProductionWorkspace` kéo `HybridView` nhưng binding không dùng nên không thuộc closure Intrepid sau transpilation; không có lý do biến HybridView thành shared UI chỉ từ raw import.

Chỉ thêm báo cáo này và generator audit; output JSON bị ignore. Chưa chuyển source, đổi dependencies, cấu hình Vercel hoặc database. Build/runtime chưa thay đổi nên không chạy lại các test runtime đã chạy ở lượt kiểm chứng trước.
