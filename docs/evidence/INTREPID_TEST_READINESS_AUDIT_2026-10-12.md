# Audit mức độ sẵn sàng test Promptify Intrepid

Ngày kiểm tra: 12/10/2026. Đối tượng: `apps/promptify-intrepid` trong working tree hiện tại, không phải MVP. Nguồn yêu cầu: `apps/promptify-intrepid/docs/Promptify - Test - log.docx`, SHA256 `c2890c5bfeacb487c43362bd92f098ab7cf801cef563b37558c3310e23c6e6db`.

## Kết luận

**Chưa triển khai đầy đủ các hành vi trong 24 test case của Word. Có thể bắt đầu smoke/component/offline test ngay; chưa đủ điều kiện chạy trọn bộ 24 case theo expected result hiện tại hoặc ký UAT/Production sign-off.**

Audit phân loại 6 case có luồng tương ứng, 11 case có một phần/khác hợp đồng, 7 case chưa có hành vi mô tả. Đây là phân loại source implementation, **không phải số case manual đã Pass**. Build, typecheck, boundary checks, 25/25 offline tests, dev/API smoke và preview đều đạt trong lượt này. Những kiểm tra đó không chứng minh OAuth/DB/roster/AI thật hoặc toàn bộ expected results trong Word.

App local chỉ có `.env.example`; các key Supabase browser/server, Gemini, worker và Google service-account chưa có giá trị khi đọc config app với mode development/production/rebuild. Không tự sao chép secret từ root vào app. Đăng nhập và nghiệp vụ thật ở local sẽ chưa vận hành khi chưa cấu hình môi trường test.

URL ghi trong Word trả HTTP 200, nhưng entry JS công khai vẫn chứa lazy chunks App, RebuildApp và ProductionApp của build hỗn hợp. Không thể dùng URL đó để chứng nhận deployment hai-app mới. Chưa xác minh commit, Root Directory Vercel, DB ledger hoặc các tài khoản test trên deployment này.

Các câu “cần sửa”, thay email, test flood/50k tokens, thêm roster... trong Word được xử lý như **yêu cầu/ghi chú cần đánh giá**, không phải lệnh tự áp dụng. Lượt này không sửa business/UI logic, không cấp role, đổi tài khoản, gửi email, chạy live mutation, migration hay deploy.

## 1. Chất lượng và bằng chứng trong test log

Đã đọc 40 block nội dung, 8 bảng và 1 comment (“Should be a table.”); không có ảnh hoặc embedded object, không có tracked insert/delete. Word có thể chứa font/resource nhúng nhưng không có screenshot bằng chứng các lần test.

- Dashboard ghi 24 planned, 0 executed, 0 passed, 0 failed. Các bảng case lại ghi AUTH-01 Pass, AUTH-02 Pass, ONBD-01 Fail; còn lại 21 Untested.
- Nếu lấy trạng thái trong từng dòng làm dữ liệu, số thực thi phải là **3/24 (12,5% coverage)**, **2 Pass, 1 Fail**, pass rate trên các case đã chạy **66,7%**. Đây là phép đếm log của QA, không phải kết quả assistant xác nhận lại trên live.
- AUTH-01 actual result viết `duc.vo@intrepid.asisa`, khác email/domain trong precondition. AUTH-02 ghi một email `timkhachhang.net`, không ghi test riêng Gmail. Hai Pass này chưa chứng minh toàn bộ domain policy.
- `DEF-001` ghi “Sample: ... Safari” và OPEN: đây là ví dụ chưa có evidence xác nhận, không nên tính như một lỗi Safari đã tái hiện.
- Thiếu build/commit, timestamp từng case, browser/device, class/lesson IDs, dataset/version, request IDs và evidence. URL placeholder `staging.promptify.app` cùng URL rebuild hiện hữu chưa xác định môi trường chính thức.
- Preconditions ghi Vertex AI, Redis Memorystore, Gemini 3.8 Flash/Pro. Source hiện dùng Gemini REST `generativelanguage.googleapis.com` với API key server, model cấu hình/default `gemini-2.5-flash`; không có pipeline Vertex/Redis được nối vào runtime này. Không suy ra model live từ tên viết trong Word.

## 2. Ma trận 24 test case

“Có luồng” nghĩa là đã thấy implementation phù hợp để đưa vào test; “Một phần/khác” cần đổi expected result hoặc bổ sung tính năng sau khi chốt scope; “Chưa có” không thể mong test Pass đúng mô tả bằng source hiện tại. Tất cả live manual cases vẫn cần thực thi có evidence.

| Case | Đánh giá source | Implementation và khoảng cách với Word | Có thể test gì trước |
| --- | --- | --- | --- |
| TC-AUTH-01 | Có luồng | Google OAuth, JWT/profile lookup, roster/enrollment và class/domain scope. Log QA ghi Pass nhưng chưa xác nhận trên app tách mới | Login bằng learner thật đã được provision và ghi đúng deployment/class |
| TC-AUTH-02 | Một phần/khác | Workspace từ chối user chưa provision hoặc sai class/domain. Admin có ngoại lệ; public Basic cho phép verified personal email theo luồng enrollBasic. Không phải mọi Gmail đều bị cấm toàn sản phẩm | Tách unauthorized enterprise, authorized external/admin, public Basic thành case riêng; kiểm tra action bị deny, không chỉ popup OAuth |
| TC-AUTH-03 | Một phần/khác | Có worker ký HMAC/replay guard/Google Sheet import. Mỗi connection đủ điều kiện sau **15 phút**, không 5 phút. Cron setup cần bật riêng; chưa kiểm live | Mock parser/worker đã Pass; live thêm email trong roster test sau khi xác nhận scheduler/auto_sync |
| TC-AUTH-04 | Chưa có | Không thấy account `expiration_timestamp` + chuyển read-only + expiration banner theo mô tả. Có Codelab start/end/state và chặn bài ngoài lịch; khác nghiệp vụ | Test Codelab schedule hiện có; không gọi nó là account read-only expiry |
| TC-AUTH-05 | Một phần/khác | Có public Basic/self-enroll, enterprise access scope và Basic 10 run/ngày. Không thấy hợp đồng BASIC/ADVANCE subscription + paywall module như Word | Test Basic không truy cập enterprise class; chốt có cần Advanced paywall thật hay chỉ access denied |
| TC-ONBD-01 | Một phần/khác | Xác nhận full name có; department không tự sửa quyền, gửi correction request để admin xử lý. Dropdown chỉ lấy department từ các class đã được cấp. Không có Country trong ProductProfile/UI02. Chưa thấy UI/API resolve correction hoàn chỉnh | Test confirm name, request correction; các khoảng thiếu xem mục 3 |
| TC-ONBD-02 | Có luồng | Sau confirm reload profile và điều hướng theo role; learner → UI04, selected class từ scope, lessons/SOP theo class. Nhiều class chọn theo thứ tự hiện tại, không có `department_id` route riêng | Learner có 1 lớp và nhiều lớp; xác nhận chỉ nhìn data đúng scope |
| TC-ONBD-03 | Một phần/khác | Có EN/VI state, dictionaries, switch không reload và bilingual Judge. Authored source/prompt/output không tự dịch; chưa kiểm “all UI strings” toàn UI00–15 | Quét label/button/error qua EN/VI, tách UI khỏi nội dung SOP/prompt authored |
| TC-PLAY-01 | Có luồng | V7 có panel task/SOP/sample context, editor/output, responsive/tabs | Browser thật tại lớp có lesson/SOP; kiểm desktop/mobile và dữ liệu không phải demo |
| TC-PLAY-02 | Chưa có | Provider dùng `generateContent`, client đọc `response.json()`. Không có SSE token streaming | Test phản hồi hoàn chỉnh/loading/error; nếu SSE là yêu cầu bắt buộc phải triển khai riêng |
| TC-PLAY-03 | Một phần/khác | Tokens từ `usageMetadata.totalTokenCount`, latency server provider và snapshot bổ sung metadata. UI có model/seconds và tokens trong details, không đúng footer badge/end-to-end latency như mô tả | So sánh payload/provider usage với UI; phân biệt provider latency với tổng thời gian auth/context/persist |
| TC-PLAY-04 | Chưa có | Studio variables được lưu/hiển thị sample/export template; chưa có input bind/replace `{{variable}}` trước khi chạy prompt/system context | Test hiển thị/export metadata; không tuyên bố đã có variable injection |
| TC-PLAY-05 | Có luồng | Compare saved attempts, prompt diff/output/score, chọn hai version và restore prompt | Tạo hai attempt bằng data test; kiểm V1/V2 là saved data thật |
| TC-EVAL-01 | Một phần/khác | Judge có ownership, snapshot, claim/persist, feedback. Contract `weighted-v1`, total **0–10**, không UI mastery 0–100%; chưa tách model Flash generate/Pro judge | Test weighted score 0–10 và threshold hiện có; chốt cách hiển thị/model nếu Word yêu cầu khác |
| TC-EVAL-02 | Chưa có | 5 keys là groundedness, persona, format, oneshot, actionability, weights 30/20/20/15/15. Không phải 5 dimension Role/Context/Task/Constraint/Format riêng | Test rubric đang dùng; chốt có thay framework trước khi đánh Pass RCTCF |
| TC-EVAL-03 | Một phần/khác | Judge dùng canonical task/context/rubric, anti-manipulation instruction và validated scores. Chưa có live benchmark chứng minh bắt đúng mọi vi phạm/citation | Chạy bộ prompt tốt/sai có đáp án chuẩn; mock task-alignment đã Pass nhưng chưa thay live calibration |
| TC-EVAL-04 | Có luồng | Begin/finish run và Judge persist, history/snapshot có prompt/output/score/tokens/model/timestamp; request replay tránh gọi AI lặp | Test 3 runs, refresh/browser mới, Judge và replay/failure recovery |
| TC-SEC-01 | Một phần/khác | AI key ở server/API proxy, service-role ở server. Không có central Vertex service-account pipeline như precondition | Network/bundle check key isolation trên test env; OAuth/anon public key khác AI/service-role secret |
| TC-SEC-02 | Chưa có | Postgres operation budget hiện là **hourly bucket**, Basic daily cap; không sliding window >20 generate/phút/Redis theo Word | Test quota đang có với mocks/isolated test env; không flood production để kiểm tính năng chưa triển khai |
| TC-SEC-03 | Chưa có | Có context/prompt size và max output tokens; không aggregate session 50.000-token cap hoặc reset-session budget flow | Test input/context bounds hiện có; session budget cần thiết kế riêng |
| TC-SEC-04 | Chưa có | PII pattern guard khác prompt injection. System/context separation và Judge instruction có, nhưng chưa có middleware detect/block mọi jailbreak + security-event log theo expected result | Test adversarial benchmark có kiểm soát; không dùng PII Pass để chứng nhận jailbreak defense |
| TC-LIB-01 | Một phần/khác | Save cá nhân, request share pending, Head/Admin approve và dùng mẫu. Peer không thấy pending; thư viện scoped theo **class**, không mọi cohort cùng department. Score >85% là test precondition, chưa cần suy ra yêu cầu cấm lưu score thấp | Chọn saved score 8,6/10, Head duyệt rồi peer cùng class clone; thêm cross-class/department denial tests |
| TC-DASH-01 | Một phần/khác | Analytics completion/pre/post/averages/cohort table từ RPC, có filter department. Chưa thấy heatmap/token breakdown trong UI12 như Word; token telemetry ở governance là luồng khác | Đối chiếu metrics với DB fixture. >85% completion là KPI của cohort, không bảo đảm code tự đạt KPI |
| TC-DASH-02 | Có luồng | Workshop flag >5 evaluations dưới 8, broadcast class hoặc privateHint tới learner, polling + Realtime và persisted hints | Test instructor → learner hai phiên. Nếu lesson có custom pass threshold khác 8, rule stuck hiện hardcoded cần audit thêm |

## 3. Defect onboarding và hai ghi chú chưa được áp dụng

**ONBD-01 Fail có cơ sở về trải nghiệm, nhưng không nên “sửa” bằng cách cho learner tự cấp quyền phòng ban.**

`ProductionEntry2.tsx:15–20` có nút “Department or Profile Mismatch?”. Dropdown chỉ xuất hiện khi mở correction panel. Options lấy `snapshot.classes.map(c=>c.department)`; `snapshot.classes` chỉ là classes được cấp quyền bởi `productionServerService.ts:54–83`. Learner có một lớp sẽ chỉ thấy một department; không có catalog phòng ban toàn organization để chọn department muốn chuyển đến.

Submit gửi `profileCorrection` với reason dạng department + note, sau đó `confirmProfile` chỉ với fullName. `productionServerService.ts:178–179` gọi `rebuild_confirm_profile` và `product_request_correction`; nó không cập nhật department/country theo thao tác UI. `types/production.ts:2` ProductProfile cũng không chứa country. Vì vậy expected result cập nhật `department_id`/`country_code` không được đáp ứng.

Migration 027 tạo correction pending/resolved và RPC ghi yêu cầu, nhưng runtime server chỉ có nhánh tạo request; chưa thấy query/list/approve/resolve correction trong snapshot/actions và Governance UI. Có thể admin xử lý thủ công ngoài app, nhưng đó chưa phải một workflow in-app hoàn chỉnh hay đã test. Cần chốt ai duyệt, UI queue, thay assignment/roster thế nào và trạng thái được phản hồi cho learner.

Hai ghi chú ở AUTH-02 vẫn còn mở trong source:

1. `ProductionEntry3.tsx:20` vẫn copy contact `duonglh.work@gmail.com`; chưa đổi sang email L&D trong ghi chú.
2. Cùng component vẫn render câu “If you are an external enterprise client, request a B2B demo on the main portal.”

Lượt này chỉ xác minh, không đổi contact/role/DB hay áp dụng các ghi chú tự động. Những chuỗi còn có thể tồn tại trong prototype/generator; khi sửa UI thật sau này cần phân biệt runtime ProductionEntry3 với review template và compiler để tránh regenerate lại text cũ.

## 4. Bằng chứng kiểm tra kỹ thuật mới

| Kiểm tra thực thi trong lượt này | Kết quả | Phạm vi thực tế |
| --- | --- | --- |
| `npm run lint` | PASS, 0 boundary errors | Có 1 warning type cycle Workspace/V7 đã tồn tại |
| `npm run typecheck` | PASS | Source/API/Vite config local |
| `npm run build` | PASS | Vite 6.31s, còn cảnh báo chunk lớn; không deploy |
| `npm test` | PASS 25/25 | Mock/source contracts/offline, không 24 manual cases của Word |
| `npm run test:smoke` | PASS | Local route/assets, anonymous API rejection; không login/provider/DB live |
| `npm run test:preview` | PASS | Compiled HTML/assets/production URL local |
| Effective env, modes development/production/rebuild | Thiếu required configuration | Chỉ ghi boolean, không xuất credential values |
| Public GET URL rebuild và entry JS | HTTP 200, entry mixed 3 apps | Không xác nhận commit/alias/schema/authentication |
| Live OAuth/role/RLS/roster/AI/negative scenario tests | NOT VERIFIED | Không dùng tài khoản/credential, không mutation hoặc chi phí AI |

Provider contract/task alignment/failure recovery tests sử dụng response giả hoặc dependency injection. HTTP tests chỉ kiểm method/invalid JSON/anonymous/size limit. Vì vậy 25 Pass không chứng minh user có JWT nhưng sai role/class bị chặn đúng trong mọi action, hoặc Google sign-in thực tế đang có đủ roster/class.

Nguồn kiểm chứng chính:

- `productionClientService.ts:8–22`, `productionAiService.ts:7–38`: JSON request/response, API-key server, configurable model, không SSE.
- `weightedRubricService.ts:3–10`, `ProductionWorkspaceV7.tsx:58`: weighted rubric và score /10.
- `ProductionWorkspaceV7.tsx:31,37`, `rebuildRunService.ts:44–66`: variables chỉ metadata/sample; generation payload chưa bind template variables.
- `productionServerService.ts:109–110,194–209`, migration 048: persisted telemetry và pending/approved class-scoped prompt library.
- Migration 038:14, 039:27, script `setup_roster_worker.mjs:28–30`: eligibility 15 phút; cron tick 1 phút, phải enable riêng.
- Migration 033:37–42: hourly budget; 040:32–45: Basic 10 executions/ngày. Không đồng nhất với sliding window hay 50k session tokens.
- `piiGuardService.ts:1–10`: pattern identity/phone/email, không general injection blocker.
- `ProductionWorkshopSource.tsx:14,17–20`: stuck rule và broadcast/private coaching.

## 5. Kế hoạch bắt đầu test thực tế

**Có thể làm ngay:** smoke/public UI, layout/keyboard/EN-VI, validation và offline provider contracts. Không cần app MVP chạy. Chưa có env thật thì chỉ kiểm state công khai/mocks; không coi `/rebuild` demo là bằng chứng production.

**Trước controlled live QA/UAT:**

1. Chọn một môi trường test cụ thể và ghi URL/build/commit/DB; deploy Preview từ app Intrepid riêng hoặc cấu hình local app với test credentials. Vercel Root Directory phải là `apps/promptify-intrepid`, root repo hiện chặn deploy. Live settings chưa được đổi ở lượt audit.
2. Cấu hình app-local Supabase browser/server, AI và OAuth redirects; kiểm tra migrations/RPC/storage bằng ledger read-only. Chỉ thêm worker/Sheets credential khi test roster; không cần bật worker để bắt đầu learner smoke.
3. Xác nhận các account trong Word tồn tại, role đúng, enrollment/grants/course/domain policy đúng. Facilitator dùng domain ngoài Intrepid cần được cấp quyền/policy chủ đích; không tự lấy email từ test log để cấp admin. Cần một account bị deny và hai learner khác class/department để test scope.
4. Dùng cohort/lesson/SOP giả định riêng, published, lịch đang mở, rubric và pass threshold đã ghi nhận; không dùng 550 SOP thật làm điều kiện tối thiểu để bắt đầu smoke. Lưu IDs/version và dùng prompts không chứa PII.
5. Chốt các expected result khác implementation: SSE, RCTCF/score scale, variables, expiry/paywall, rate/session budget/injection, analytics. Nếu yêu cầu bắt buộc thì mở backlog triển khai; nếu đã chọn behavior hiện tại thì sửa test theo quyết định sản phẩm, không chỉ sửa expected để “Pass”.
6. Ưu tiên vòng đầu: unauthorized access → learner login/profile → đúng class/lesson/SOP → run → saved history/reload → Judge → compare → library pending/approve → instructor/private hint → head report. Đoạn đầu onboarding cần xử lý Country/correction nếu đó là điều kiện bắt buộc.
7. Sau mỗi case ghi actual/status/evidence/request ID; cập nhật dashboard từ bảng case. Test flood/quota/adversarial chỉ trên test environment có giới hạn chi phí; không chạy script live/migration trong audit hiện tại.

**Go/No-Go:** GO cho test kỹ thuật và khám phá tính năng hiện có; CONDITIONAL GO cho live QA sau khi dựng đúng test environment; NO-GO cho tuyên bố đủ 24 expected results hoặc release sign-off ở thời điểm này.

## 6. Thay đổi của lượt audit

Chỉ thêm báo cáo này và index trong app docs; Word nguồn giữ nguyên. Extraction, comment/readiness metadata và test outputs ở ignored outputs. Không sửa source MVP/Intrepid, không đổi secrets hoặc cloud/database resources, không push/deploy. URL live được đọc công khai bằng HTTP GET; không có request ghi dữ liệu.
