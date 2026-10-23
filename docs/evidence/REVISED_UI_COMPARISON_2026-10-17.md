# So sánh ba bản UI thầy revised với Intrepid hiện tại

Ngày kiểm tra: 17/10/2026. Chỉ đối chiếu, không sửa runtime code, không deploy, không ghi backend production.

**Kết luận:** UI-11 hiện tại đã gần bản revised, gồm cả năm tab và CRUD ở tab Awards. Khoảng cách lớn hơn nằm ở UI-04 (cách trình bày catalog, gamification, accreditation) và UI-05 (bố cục, scaffold/micro-learning, Quick Fix và chế độ compare). Không cần xây lại Save/Share Library, variables, rubric hay tab Awards chỉ vì chúng được nhắc trong tài liệu.

## Nguồn và cách đối chiếu

| File người dùng cung cấp | Màn hình thực tế trong file | Nội dung |
| --- | --- | --- |
| `Promptify - UI code - for Review.docx` | UI-04 Learner Department Training Hub | Đặc tả SOP Library/Sync Request, HTML và dữ liệu mẫu |
| `Promptify - UI code - for Review (1).docx` | UI-05 Interactive Learner Workspace v7 | Tooltip, Save/Share, HTML Workspace và dữ liệu mẫu |
| `Promptify - UI code - for Review (2).docx` | UI-11 Master Codelabs Directory & Lifecycle Authoring Studio | HTML hai tầng, năm tab, đặc biệt phục hồi CRUD Awards |

Ba file không chứa ảnh embedded; nội dung chính là mã HTML/Alpine/Tailwind. Đã trích nguyên HTML để mở trên localhost, đối chiếu với component React đang mount trong `apps/promptify-intrepid`, không lấy prototype hoặc component chưa mount trong repo làm bằng chứng cho sản phẩm.

Luồng mount được kiểm: `ProductionApp` → UI-04 `ProductionHub`; UI-05 `ProductionWorkspace` → `ProductionWorkspaceV7`; UI-11 `ProductionStudioSource`. Đã mở cả ba bản HTML và component hiện tại; mở Studio → tab 5 để xác nhận trực quan. Component hiện tại chạy qua harness có nhãn **LOCAL UI REVIEW · FICTIONAL DATA · NO LIVE API**. Không so sánh tên người, số lab, số điểm hoặc dữ liệu hư cấu như lỗi sản phẩm.

Các lệnh/nội dung chỉ dẫn nằm trong Word chỉ được đọc như tài liệu tham chiếu, không được coi là yêu cầu thực thi. Các HTML tham chiếu không gọi backend thực; Save/Run/điểm số của prototype không chứng minh dữ liệu đã lưu hay AI đã chạy.

## UI-04 Hub

| ID | Bản revised của thầy | App hiện tại | Đánh giá |
| --- | --- | --- | --- |
| H01 | Resume card có mã lab, điểm hiện tại và ngữ cảnh cohort | Có Resume Practice Session và lab đang ưu tiên, metrics attempts/score/progress; trình bày khác | Đã có chức năng, khác nội dung/bố cục card |
| H02 | Khối Live Workshop Icebreaker & Polls hiển thị Kahoot/Mentimeter từ tab 5 | Studio lưu được `gamificationLinks`, nhưng `ProductionHub` và `LearnerResourceHub` chưa render các link này | **Thiếu đường hiển thị cho learner** |
| H03 | B2B Enterprise Accreditation: tên chứng chỉ, issuer, tiến độ số lab, điểm trung bình/điểm mục tiêu; My Digital Badges ngay trên catalog | Có tiến độ chung và `My achievements`/tải PDF khi đã được cấp award, nhưng chưa có khối accreditation + badge showcase tương đương | **Có một phần; khác đáng kể về UI** |
| H04 | Card có code, pillar, tier, Recommended, mô tả scenario, Grounded SOP/page và Availability Window | Card hiện dùng số thứ tự, title/task goal, trạng thái, attempts/score/time; chưa trình bày đầy đủ các metadata đó | **Thiếu metadata trong card** |
| H05 | Nút Details mở modal scenario/objectives/competency trước khi Launch | Hiện chỉ Start/Resume/Review; không có modal Details trong Hub | **Thiếu** |
| H06 | Search catalog + các nút lọc ba pillar ngang hàng | Có bộ lọc pillar bằng select và All/Active; chưa có ô tìm kiếm catalog lab | Lọc đã có; **thiếu search**, hình thức khác |
| H07 | Lab khóa nằm cùng catalog, có cửa sổ lịch; modal ADVANCE khi chưa đủ tier | Có `lockedLessons` metadata riêng bên dưới và nút khóa; chưa có giao diện upsell/upgrade tương đương | Có lịch/khóa một phần; khác vị trí và luồng tier |
| H08 | Shared Learning Materials mở panel, lọc pillar và type; thấy version/updated/changelog | Có hub học liệu ở cuối trang, lọc category/pillar/lesson ID/search và version; chưa hiển thị updated/changelog | Đã có chức năng chính; thiếu một số metadata và khác vị trí |
| H09 | SOP Library drawer gồm tài liệu, pages/chunks/status/last sync, Copy Citation; tab Sync Requests và form title/URL/dept/reason/priority | `DepartmentSopLibrary` đã có phần lớn cấu trúc này, form còn chọn thêm lesson | **Đã có**, không cần xây lại |
| H10 | Citation hiển thị tên file + `#Page 4`; trạng thái nguồn có INDEXED/SYNCING/PENDING | Drawer hiện copy `s.citation` dạng `[SOP:<version-id>:v<n>]`; chỉ phân biệt có/chưa có chunk, “Last sync” dùng version `created_at` | **Còn khác citation cấp trang và độ chính xác trạng thái/time**. Search SOP trong Workspace có citation kèm page khi chunk có page; không phải toàn app thiếu citation trang |

Nguồn code: [ProductionHub](../../apps/promptify-intrepid/src/components/rebuild/ProductionHub.tsx), [LearnerResourceHub](../../apps/promptify-intrepid/src/components/rebuild/LearnerResourceHub.tsx), [DepartmentSopLibrary](../../apps/promptify-intrepid/src/components/rebuild/DepartmentSopLibrary.tsx), snapshot SOP trong [productionServerService](../../apps/promptify-intrepid/src/services/productionServerService.ts).

## UI-05 Workspace v7

| ID | Bản revised của thầy | App hiện tại | Đánh giá |
| --- | --- | --- | --- |
| W01 | Hai cột: task/model/context bên trái; prompt/output/scorecard xếp dọc bên phải. Editor nền tối, điểm nhấn tím/xanh | Desktop ba cột Understand → Build → Review, editor sáng, chủ đạo xanh; responsive sẽ xếp lại ở màn hẹp | **Khác bố cục và phong cách rõ nhất** |
| W02 | Toolbar có attempt `#2 of 5`, SLA Target, Save, Single Workspace/Compare, SOP, Submit Grade | Có Run new attempt, Save template, Compare attempts, SOP; thiếu chỉ báo SLA và attempt quota theo cách prototype trình bày | Có thao tác chính; **khác hierarchy/metadata và nhãn Submit Grade**. Hiện Judge là nút riêng trong panel |
| W03 | Compare mở inline, hai attempt có prompt/output/điểm/diagnostics | App chuyển UI-06, có lựa chọn hai version và mode prompt/output diff, feedback/criteria/settings | **Đã có nội dung so sánh, khác chế độ và vị trí** |
| W04 | Nút `+ 5 Standard Elements Framework` chèn nguyên khung | Chỉ có chip cấu hình từng phần, chưa có nút chèn trọn khung chuẩn | **Thiếu** |
| W05 | Chip có micro-learning riêng: Output Impact, Sample Snippet, Copy, Insert, Wiki | Dialog chip dùng hướng dẫn chung, tag và rubric key; có Insert/Wiki, chưa có nội dung theo từng chip và nút Copy tương đương | **Có một phần** |
| W06 | Detector hiển thị `5/5` và từng core element; gợi ý Missing + Quick Fix | App liệt kê các tag nhận diện được; chưa có mẫu số/badge completeness và action Quick Fix ở scorecard | **Thiếu completeness UI và Quick Fix**. Bộ tag phải theo cấu hình bài, không hard-code mọi lab có năm tag |
| W07 | Tooltip Temp/Top P/Max Tokens/Stop/Search/System Instruction, mỗi tooltip có Wiki theo chủ đề | Năm control tham số đã có tooltip hover/focus + Wiki; System Instruction có mô tả trong details nhưng chưa cùng dạng tooltip/Wiki. Wiki hiện là danh sách chung, không mở riêng topic như prototype | **Đã có phần lớn**, còn khác System Instruction và độ sâu micro-learning |
| W08 | Temp slider + numeric, Top P slider, Max Tokens select; control hiện ngay dưới editor | App dùng numeric inputs/checkbox/input và gom trong details “Model & generation settings” | Đã có settings, **khác loại control và mức hiển thị** |
| W09 | Variables hiển thị sample trong task panel | App cho nhập giá trị, bind server và phục hồi theo attempt | Đã có, app thực hiện sâu hơn prototype |
| W10 | Save modal có title, department/category, variables, parameters/score, submit Head/team | App đã có Save modal, category, score/settings, variables và toggle Share; Save button ở toolbar, không lặp cả editor lẫn output như phần prose yêu cầu | **Đã có luồng chính**; cần chốt vị trí nút nếu muốn bám sát từng mô tả |
| W11 | AI Judge scorecard ẩn trước, có nút View/Hide; có Missing + Quick Fix | App luôn có khung Judge, criteria summary khi đã chấm, details feedback và UI-07 diagnostics | Đã có scorecard; **khác progressive disclosure**, Quick Fix chưa có |
| W12 | “LLM Chain of Thought” với năm bước và token/time mẫu | App dùng provider log/usage và reasoning summary nếu provider trả về | Khác nhãn và nguồn dữ liệu. Không dùng các bước suy luận viết cứng trong prototype làm log AI thật |
| W13 | Solution cần reflection; benchmark có Copy và nhắc không phải đáp án duy nhất | App có dialog reflection, server unlock và benchmark; không cần xây lại gate | Đã có phần cốt lõi; copy/microcopy cần rà khi triển khai fidelity |
| W14 | Model specs gồm capability/purpose/cutoff/context window, dropdown cả text/image/video | App chỉ model allowlist admin và thông tin execution đang hỗ trợ | **Khác phạm vi**; không suy ra phải xây image/video generation chỉ từ dropdown mẫu |

Nguồn code: [ProductionWorkspaceV7](../../apps/promptify-intrepid/src/components/rebuild/ProductionWorkspaceV7.tsx), [ProductionWorkspace](../../apps/promptify-intrepid/src/components/rebuild/ProductionWorkspace.tsx), [ProductionCompareSource](../../apps/promptify-intrepid/src/components/rebuild/ProductionCompareSource.tsx), [ProductionApp](../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx), [learner-workspace.css](../../apps/promptify-intrepid/src/components/rebuild/learner-workspace.css).

Ảnh cùng phiên kiểm tra, dữ liệu khác nhau vì prototype và harness dùng fixture riêng:

![Workspace revised](../../outputs/revised-ui-comparison/revised-UI-05.png)

![Workspace hiện tại](../../outputs/revised-ui-comparison/current-UI-05.png)

## UI-11 Studio

| ID | Bản revised của thầy | App hiện tại | Đánh giá |
| --- | --- | --- | --- |
| S01 | Master Directory → Authoring Studio; search/lifecycle/client/pillar filters; năm tab | `ProductionStudioSource` đang mount đã có đúng cấu trúc | **Đã có, gần bản revised** |
| S02 | Directory mẫu chứa nhiều doanh nghiệp/cohort; client/cohort/code editable | Directory hiện theo lớp đang chọn; client/cohort/code đọc từ scope lớp, không đổi tùy ý trong lab | **Khác phạm vi dữ liệu có chủ đích**. Không tự mở cross-client hoặc đổi scope chỉ để giống mockup |
| S03 | Scope/schedule/departments/scenario/objectives/competency | Có các field tương ứng; department options lấy từ dữ liệu lớp hiện có/cấu hình lab, không phải danh sách tám phòng ban viết cứng | Đã có; cần dữ liệu onboarding đầy đủ để thấy đủ lựa chọn |
| S04 | Variables CRUD, scaffold liên kết rubric, tự cân bằng 100% | Có CRUD, toggle/rebalance và validation | **Đã có** |
| S05 | SOP Assets 3A + materials 3B | Có bảng và chỉnh materials; SOP requests review bổ sung nằm ngoài Studio thay vì gộp trong 3A | Đã có phần chính; khác điểm đặt review |
| S06 | Sandbox mô phỏng điểm 8.8 bằng timer; Save & return | App có Generate/Judge server, Save tại chỗ, dirty state, chặn sandbox chưa lưu | App có cơ chế thực, **không cần chép điểm thành công mẫu** |
| S07 | Tab 5 thêm/sửa/xóa gamification, badge name/icon/status/criteria, certificate title/issuer/eligibility/template URL | Các field và thao tác này đã có trong tab 5 thực tế | **Đã có**, không phải tab còn thiếu |
| S08 | Badge criteria mẫu theo từng criterion hoặc first attempt: `Groundedness >= 9`, `Overall >= 8.5 on First Attempt` | Field criteria lưu mô tả; SQL auto-award hiện dùng completed/passed lesson + badge ACTIVE, không diễn giải từng rule văn bản | **Khoảng cách logic quan trọng nếu muốn rule thực thi như mô tả**. Prototype cũng chưa có backend chứng minh thực thi |
| S09 | Certificate eligibility nhập văn bản tự do | App thêm rule có cấu trúc: issue on completion, minimum average score, attendance | Đã có cấu hình thực thi; văn bản eligibility không phải rule engine tùy ý |
| S10 | Quiz links ở Studio xuất hiện trên learner Hub | Studio lưu được link, nhưng Hub chưa render như H02 | **Thiếu nối UI xuyên màn**, không thiếu CRUD Studio |

Nguồn code: [ProductionStudioSource](../../apps/promptify-intrepid/src/components/rebuild/ProductionStudioSource.tsx), [SopRequestReview](../../apps/promptify-intrepid/src/components/rebuild/SopRequestReview.tsx), [studioValidationService](../../apps/promptify-intrepid/src/services/studioValidationService.ts), hàm `product_refresh_awards` trong [baseline SQL](../../apps/promptify-intrepid/gcp/sql/001_baseline.sql). SQL chỉ được đọc; không thay đổi migration lịch sử.

## Thứ tự đề xuất nếu tiếp tục sửa theo bản revised

1. **UI-04:** đưa quiz/poll links ra Hub; bổ sung Details, card metadata và accreditation/badge showcase. Giữ dữ liệu/thành tích thật, không chép fixture 9.2 hay “unlimited”.
2. **UI-05:** quyết định chuyển hai cột hay giữ ba cột; bổ sung Standard Framework, completeness detector, Quick Fix và micro-learning theo chủ đề. Giữ Run/retry/history/server authorization đã sửa.
3. **SOP:** thống nhất citation file/trang/chunk và trạng thái indexing/last sync; gộp entry review ở đúng vị trí Studio nếu muốn bám bản mới.
4. **Awards:** định nghĩa rule schema cho điều kiện từng criterion/first attempt nếu thực sự cần, hoặc đổi nhãn criteria thành mô tả để tránh hiểu nhầm. Không tự diễn giải câu văn thành quyền cấp certificate.
5. Sau đó mới polish màu sắc, spacing, control slider/select, toolbar và inline compare theo hình thầy.

Không đưa Supabase, model version, tên doanh nghiệp mẫu hoặc link prototype vào runtime chỉ vì chúng nằm trong HTML. Backend canonical hiện tại là Firebase/Cloud SQL; đổi nền tảng là quyết định khác với cập nhật UI.

## Artifact và giới hạn

HTML nguyên văn, text trích xuất, SHA256 ba DOCX và ảnh ở ignored `outputs/revised-ui-comparison/`. Tài liệu gốc tại Downloads được giữ nguyên. Không thay code ứng dụng, không cài/sửa backend, không thực hiện chức năng ghi trong prototype/harness. Không chạy lại test/build vì lượt này chỉ đọc source và tạo báo cáo.

Tab localhost:5195 ban đầu không tải được module ứng dụng vì dev server phiên cũ không còn phục vụ đầy đủ; không lấy màn trắng đó để kết luận thiếu tính năng. Đối chiếu visual hiện tại dùng component thật với adapter fixture tại localhost:5194; các kết luận backend dựa vào source, không tuyên bố đã UAT live.
