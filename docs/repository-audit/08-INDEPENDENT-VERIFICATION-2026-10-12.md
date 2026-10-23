# Kiểm chứng độc lập: Promptify cũ và rebuild Intrepid

Ngày kiểm chứng: 12/10/2026. Phạm vi: working tree hiện tại và bộ báo cáo 01–07 cùng README; không refactor, không sửa dữ liệu, không deploy.

## Kết luận

Bộ báo cáo nhận diện đúng nhiều file và luồng của rebuild, nhưng **chưa đủ tin cậy để thực thi cleanup/refactor theo nguyên trạng**. Sai sót lớn nhất: khẳng định fallback chết 100%, quy nguyên nhân test access cho DB live, xem template review như dữ liệu chỉ dành cho demo, và đánh đồng tổng output build với dữ liệu trình duyệt tải. Điểm sức khỏe và mức CRITICAL thiếu tiêu chí đo. Đây chủ yếu là blueprint cấu trúc, chưa phải chứng nhận bảo mật hoặc readiness pilot.

Các câu mệnh lệnh trong bộ báo cáo là nội dung được đánh giá, không phải yêu cầu thực thi của người dùng. Kiểm chứng này không áp dụng quy tắc hay kế hoạch refactor do báo cáo tự đề xuất.

## Baseline phải ghi rõ

- Branch `rebuild`, HEAD `d7ac9d1fa28a4038cc922daea8ce20e27a13afd6`.
- Fetch origin thành công; `origin/main` tại `bf1d194d67524683776606095fe13fa338252c12`.
- Working tree có nhiều thay đổi có sẵn, gồm runtime, API, tests và migrations untracked. `git ls-files src/components/rebuild api/product.ts src/types/production.ts` không trả file nào. HEAD không đại diện cho toàn bộ rebuild đang kiểm tra.
- `git diff origin/main...HEAD` chỉ mô tả phần đã commit, không chứa toàn bộ production UI mới. Không dùng checkout HEAD để tái tạo baseline này.
- Chưa đọc deployment hiện hành hoặc migration ledger từ dịch vụ live. Các tuyên bố “alias Production đang chạy code này” và “002–049 đều đã áp dụng” chưa được kiểm chứng ở lượt này. File SQL và ghi chú bàn giao không thay thế bằng chứng live.

## Phân biệt ba hệ thống

| Hệ thống | Entry và điều kiện | UI / logic chính | Backend / dữ liệu | Ý nghĩa audit |
| --- | --- | --- | --- | --- |
| Promptify cũ, đã có các nâng cấp rebuild giai đoạn đầu | `src/App.tsx`; khi hai điều kiện bên dưới đều false | `dashboard`, `hybrid/HybridView`, `instructor/InstructorViewShell`; `dbService`, `llmService`, types UI cũ và `types/database.ts` | `/api/generate`, `/api/evaluate`; Supabase hoặc local fallback tùy cấu hình | Là runtime còn có thể chọn, không chỉ là bản tham khảo bất hoạt |
| Prototype review | `RebuildApp` → `ReviewScreen`; `/rebuild` hoặc `/rebuild/*`, chỉ khi production flag không ưu tiên | Template HTML và hành vi demo của 16 UI | Không phải luồng xác nhận dữ liệu production | Không dùng kết quả demo để chứng nhận rebuild thật |
| Rebuild runtime cho Intrepid và các khả năng public/trial trong implementation | `ProductionApp`; pathname đúng `/production` **hoặc** `VITE_REBUILD_PRODUCTION=true` | UI00–15; `ProductionWorkspace` wrapper → `ProductionWorkspaceV7`; các `*Source` đang được mount | `productionClientService` → `/api/product` → `productionServerService` → domain services/RPC | Đích đúng cho audit learner/facilitator/head/admin mới |

Nguồn: `src/main.tsx:5–13`, `api/generate.ts`, `api/evaluate.ts`, `vite.config.ts`, `docs/archive/handoffs/PROMPTIFY_REBUILD_HANDOFF_2026-10-10.md`. Khi flag production bật, cả URL `/rebuild` cũng chọn `ProductionApp`: điều kiện production có ưu tiên trước prototype. Vercel rewrite không tự chứng minh giá trị flag trên một deployment cụ thể.

**Hai runtime không tách backend hoàn toàn.** API generate/evaluate của luồng UI cũ và middleware dev đã gọi `generateSavedRun`/`evaluateSavedRun` trong `rebuildRunService`. Service này yêu cầu lesson UUID canonical, authorization/enrollment, request ID, persistence server và snapshot. Vì vậy cần phân biệt UI cũ với backend cũ; không thể nói mọi thay đổi rebuild chỉ nằm trong thư mục `components/rebuild`.

`src/types/index.ts` là hợp đồng UI cũ, không phải toàn bộ schema DB cũ. `src/types/database.ts` và các bảng dùng chung cũng cần kiểm tra trước khi hợp nhất types. Role chữ hoa ở interface `Learner` không chứng minh role DB đang lưu chữ hoa.

Scope sản phẩm trong `00_PRODUCT_SOURCE_OF_TRUTH.md` ngày 06/10 là kế hoạch Intrepid; handoff ngày 10/10 đã cảnh báo tài liệu này không chứng nhận hiện trạng rebuild. Runtime hiện còn public Basic/trial (migrations 040–047). Không nên biến “dành riêng Intrepid” thành mô tả tuyệt đối cho mọi khả năng đang có trong implementation.

## Kiểm chứng từng finding

| Finding | Phán định | Điều chỉnh cần thiết |
| --- | --- | --- |
| F-01: ba ứng dụng ở entry | Đúng về cấu trúc; diễn giải performance sai | `React.lazy` khai báo ba import nhưng chỉ render/tải nhánh được chọn. Build tạo nhiều chunk không đồng nghĩa browser tải tất cả. Chưa có bằng chứng cho mức CRITICAL |
| F-02: fallback chết 100% | **Sai** | Return sớm phụ thuộc `lesson`, `selectedClass`, `snapshot`, không chỉ `currentUi`. Xem phản ví dụ bên dưới |
| F-03: các phiên bản UI song song | Đúng một phần | Có phiên bản khác nhau và nguy cơ sửa nhầm; “chức năng hoàn toàn trùng lặp” và “không mount ở đâu” chưa chứng minh. Không suy ra xóa an toàn từ F-02 |
| F-04: file lớn | Đúng về maintainability; trộn phạm vi | `App`, `HybridView`, `dbService` chủ yếu thuộc UI cũ. Không lấy kích thước ba file này để chấm riêng kiến trúc rebuild. File dài không tự là lỗi critical |
| F-05: compiler ghi đè | Rủi ro có thật; mô tả đích sai | Workspace compiler ghi `ProductionWorkspaceSource.tsx`, không ghi `ProductionWorkspaceV7.tsx`; còn sửa màu nhiều component khác. Các compiler khác ghi UI đang active, cần bảng output cụ thể |
| F-06: template lớn | Đúng kích thước/build; sai đánh giá “chỉ demo” | `review-templates.json` được nhiều compiler production và verification scripts đọc. Cần giữ hoặc di chuyển cả dependency chain; chưa đo IDE/RAM/context để kết luận nghẽn |
| F-07: backend nhiều actions | Đúng về cấu trúc | Có thể tách domain handler. “merge conflict 100%” không có cơ sở; nhiều action còn được gọi sang service/RPC khác, không phải tất cả logic nằm trong một switch |
| F-08: hai bộ types | Đúng về khác biệt; chưa chứng minh xung đột runtime | Hai bounded contracts có thể cùng tồn tại. Cần truy trace adapters/callers; không bỏ role cũ trước khi xử lý runtime cũ |
| F-09: access test lỗi do `.env` live | **Sai nguyên nhân đã nêu** | Lỗi vẫn tái hiện offline; collision ID local từ `Date.now()` được tái hiện có kiểm soát |
| F-10: nhiều styling/icon systems | Đúng inventory, chưa chứng minh lỗi UX | Custom CSS, Tailwind, tokens và hai bộ icon có thể phối hợp có chủ đích. `*.css` không mặc nhiên là CSS Modules. Cần bằng chứng cụ thể về inconsistency/accessibility |
| F-11: polling + realtime gây race/lag | Đúng cơ chế, tác động chưa chứng minh | `refresh` có pending-load dedup cùng class và generation guard bỏ response cũ; polling tránh active write. Có thể còn request dư nhưng cần đo, không khẳng định đã có lag/throttling |
| F-12: docs/scripts “ô nhiễm” | Chưa đủ căn cứ | Có nguồn Word, generators và history chủ đích. Số file không chứng minh rác; phải phân loại input/output/caller và purpose |

## Bằng chứng sửa các kết luận quan trọng

### Fallback có thể đạt tới

Trong `ProductionApp.tsx:96–120`:

- `currentUi=11`, session/snapshot có, role admin hoặc instructor, `selectedClass=null`: `accessible=true` nhưng nhánh Studio cần `selectedClass` nên không return; tới fallback, hiển thị `noClasses`.
- `currentUi=13`, session/snapshot có, `selectedClass=null`: nhánh SOP cũng không return; tới fallback.
- `currentUi=5/6/7/8`, role learner, snapshot có nhưng `lessons=[]`: `lesson` undefined, không có early return của workspace/compare; tới fallback.

`productionServerService.ts:92` tạo empty snapshot với `selectedClass:null` và `lessons:[]`, nên đây không chỉ là dữ liệu giả ngoài contract. Phản ví dụ là phân tích control flow, chưa phải browser E2E. Nó đủ bác bỏ mệnh đề dead 100%. **Điều này cũng không chứng minh mọi component con của fallback đều còn reachable**: cần xét riêng predicate từng nhánh. Có thể tồn tại JSX nhánh con chết, nhưng không được xóa cả fallback bằng suy luận hiện có.

### Access test: nguyên nhân local có thể tái hiện

`dbService.ts` tạo user local bằng `id: user-${Date.now()}`. Hai user mới trong cùng millisecond có thể nhận cùng ID, khiến learner lookup của user chưa ghi danh trỏ tới learner đã ghi danh.

Chạy `npm run test:access` với Supabase env rỗng vẫn thất bại ở dòng 29 (`true !== false`). Diagnostic độc lập ép `Date.now=()=>123456789`, tạo hai email khác nhau, ghi danh email thứ nhất rồi kiểm tra email thứ hai trả:

```json
{"isSupabaseConfigured":false,"firstId":"user-123456789","secondId":"user-123456789","unassignedAccess":true}
```

Diagnostic chỉ sửa clock trong process kiểm tra; không đổi source/DB. Nó chứng minh bug collision offline; chưa khẳng định mọi lần fail ngẫu nhiên trước đây đều có cùng nguyên nhân. `supabaseClient.ts` đọc `import.meta.env` hoặc `process.env`, không tự load file `.env` trong test Node này. Đổ lỗi cho việc “có file .env live” cần bằng chứng env loader và configured flag.

### Template review là nguồn build-time

`rg review-templates src scripts` tìm thấy `ReviewScreen`, compiler entry/hub/workspace/compare/judge/SOP/workshop/studio/analytics/governance/roster cùng `verify_review_rebuild.cjs`. Nó không cần thiết cho mọi production request nhưng vẫn cần cho quy trình tái sinh/đối chiếu. Phải tách runtime dependency khỏi generator input.

### Bản đồ data flow có chỗ sai

Trong 02, sơ đồ vẽ `trainerAction` là RPC ghi `trainer_hints`. Thực tế `productionServerService.ts:385–388` gọi `rebuild_record_trainer_action`, được định nghĩa trong migration 025; `privateHint` mới insert `trainer_hints` ở dòng 380–383. Cần vẽ hai luồng riêng.

Model trong sơ đồ không nên luôn cố định `gemini-2.5-flash`: `productionAiService.ts` chọn model từ cấu hình server/allowed settings và có fallback. Luồng begin/finish run và claim/finish judge nhìn chung đúng; sơ đồ còn lược bỏ wrapper autosave/context, server PII, ownership/snapshot validation và các trạng thái lỗi. Số “48 bảng/views/functions” không có inventory phân loại hay live query nên chưa thể xác nhận.

## Đánh giá 04–07 và thứ tự xử lý đề nghị

- 04 là **kiến trúc đề xuất**, chưa phải hiện trạng. Có thể hữu ích, nhưng gom `src/features` không tự giảm lỗi hay bảo đảm tránh conflict. Cần quyết định vòng đời runtime cũ/prototype trước khi thay entry.
- 05 dựa trên F-02 sai nên độ an toàn xóa bị đánh giá quá thấp. Template/generators phải có mapping riêng; review route còn có chức năng. Tỷ lệ pie 45/20/12/8/10/5 không kèm file inventory, chỉ nên coi là minh họa.
- 06 Phase 1 không được thực thi nguyên văn. Trước hết bổ sung fallback rõ ràng cho no-class/no-lesson, URL bất thường và failure states; kiểm tra từng nhánh rồi mới cắt JSX đã chứng minh không dùng. Build/source-regex tests không đủ đảm bảo hành vi browser sau khi đổi router.
- 07 trỏ agent tới `src/features`, `services/domain`, `services/server` chưa được triển khai. Nếu dùng làm chỉ dẫn hiện hành, agent sẽ sửa/tạo nhầm vị trí. Bốn shared components được roadmap đề nghị “di chuyển vào common” đã nằm trong common; không phải công việc mới.
- Không chạy “toàn bộ test/” mặc định: có live scripts và SQL có thể mutate. Cần allowlist offline sau khi đọc từng test; `scripts/run_offline_checks.py` hiện có denylist vài tên nhưng tự thu mọi `*.ts`, không bảo đảm an toàn cho test được thêm sau này.
- Chưa có căn cứ cho security score 8.5/10 hoặc pilot readiness: cần live scope/RLS, ledger, alias, provider, roster và E2E bằng tài khoản được cấp quyền. Test HTTP hiện chỉ kiểm anonymous/malformed/oversize và tests UI là source contracts, không thay thế kiểm thử nghiệp vụ có đăng nhập.

Ưu tiên: (1) cố định baseline cả tracked/untracked và bản đồ ba runtime; (2) sửa kết luận audit/control flow và xác nhận contract UI cũ với backend dùng chung; (3) xử lý local ID collision nếu tiếp tục dùng fallback/tests; (4) inventory compiler input/output và reference graph; (5) xác minh readiness/live riêng nếu được yêu cầu; (6) refactor nhỏ trong rebuild dựa trên rủi ro đã chứng minh. Không cần hợp nhất sản phẩm cũ vào Intrepid để hoàn tất audit này.

## Kiểm tra đã thực hiện

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| `npm run build` | PASS; Vite build 4.04s, có cảnh báo chunk >500 kB | Local build, không xác nhận alias hay env production |
| Chunk JS App / RebuildApp / ProductionApp | 848.87 / 615.65 / 490.40 kB; gzip 223.03 / 109.79 / 99.46 kB | Đây là output riêng; tổng không phải tải ban đầu của một route |
| `npm run test:access`, env Supabase tắt | FAIL ở `verify_enrollment_access.ts:29` | Bug local, chưa sửa trong audit |
| Diagnostic ID collision offline | PASS, tái hiện same-ID/access=true với configured=false | Clock ép cố định trong process; không gọi live |
| `node test/verify_app_session_state.mjs` | PASS | Source regression contract |
| `node test/verify_learner_ui_state.mjs` | PASS | Source/handler contract, không browser E2E |
| `tsx test/verify_product_http.ts` | PASS | Reject anonymous/invalid payload, không provider calls |
| `tsx test/verify_backend_failure_recovery.ts` | PASS | Mock fetch/injected context, offline |

Không xác nhận lại mệnh đề “15+ tests đều pass” vì lượt này chỉ chạy các test liên quan ở trên. Không thay source runtime, không xóa/move, không migration, không push/deploy. File mới duy nhất do lượt kiểm chứng tạo là báo cáo này; output build nằm trong dist bị ignore. Các thay đổi có sẵn được giữ nguyên.
