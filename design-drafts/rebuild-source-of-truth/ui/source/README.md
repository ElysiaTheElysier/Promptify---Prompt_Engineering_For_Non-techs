# Promptify — UI kết hợp trên component Production

## Baseline đã kiểm tra

- Website: https://promptify-wheat-seven.vercel.app/
- Ảnh Vercel do người dùng cung cấp: Production Deployment từ main, commit bf1d194.
- Sau git fetch: HEAD và origin/main đều là bf1d194d67524683776606095fe13fa338252c12.
- Public HTML đang tải index-B8u_Icsd.js và index--Y6Nj1oo.css. CSS này được nhúng nguyên văn vào từng HTML.
- Logo xanh lá từ website và public/brand/promptify-mark.png trong commit có SHA-256 giống hệt: 48d5f8a7601597f8522071200d1ae6b0dfd16c90dbbdeadc92bd03ea62c52dd8.
- 240/240 chuỗi class tĩnh dài trong 8 component được đối chiếu đều có trong bundle Production. Xem production-baseline-proof.json.
- Git SHA không được public HTML công bố trực tiếp: bằng chứng nhánh/commit gồm ảnh Vercel người dùng cung cấp và Git fetch; các asset/signature là bằng chứng đối chiếu bổ sung.

## Cách kết hợp đã sửa

Không dùng logo P xanh dương. Không dựng lại Landing/Home/workspace bằng markup nhìn giống sản phẩm.
Source src/public được xuất từ đúng commit vào production-baseline, không lấy các thay đổi chưa commit trong working tree. Snapshot source được giữ nguyên trên đĩa. Bản build bổ sung factory dịch UI, font Inter/JetBrains Mono, thay URL asset thành data URL và sửa logic ngưỡng/khóa chuyển bài trong HybridView theo guardrail; đây là prototype kết hợp, không phải component không thay đổi hành vi. Runtime dependencies được thay bằng adapter mock bên ngoài component.

- UI-00: LandingLoginScreen thật, bao gồm PromptCompareVisual, PromptDirectionVisual, watermark và logo xanh lá. Giữ wording/bố cục landing Production.
- UI-01: form enterprise sign-in đề xuất từ mockup, dùng logo/tokens Production. Production chưa có một standalone enterprise email form như mockup; không gọi nó là component có sẵn. CTA Google của Landing component thật chuyển vào form này bằng OAuth adapter local.
- UI-02/03: proposal profile / denied theo logic roster của mockup.
- UI-04: LearnerHome thật. Chọn lớp sẽ mở LearnerDashboard thật trong cùng HTML. Dữ liệu Intrepid và 5 codelabs từ mockup.
- UI-05: LessonHeaderBar + HybridView thật, bao gồm LessonBriefPanel, PromptComposer, structure chips và placeholder/output của chính component đó. Load template từ library được chuyển vào input của component, không dựng một composer khác.
- UI-06: ABCompareModal thật với phiên bản V2/V3 từ mockup, component insight/copy/save có sẵn.
- UI-07: cùng HybridView thật ở trạng thái đã chạy/evaluated; fixture 9.2/10 được tạo qua các dependency adapter local.
- UI-08: LessonBriefPanel thật kết hợp nội dung SOP page 4 từ mockup. Các trang chưa có body không được bịa thêm.
- UI-09: InstructorDashboard thật; bổ sung stuck learners, hint preview, technique progression và telemetry theo mockup bằng composition bên ngoài component gốc.
- UI-10: LearnerDetailModal thật. Dataset lịch sử Agribank hardcoded trong dependency được thay bằng fixture Intrepid; bổ sung attempt timeline, trainer note và clearance reason bên trong body bằng portal. Component vẫn PARTIAL theo audit vì không wired vào production flow.
- UI-11: PromptLibraryView thật với template/SOP của mockup; thêm scope, department, technique và pending-review controls ở ngoài component gốc. Search/copy/load/card hierarchy vẫn từ component thật.
- UI-12/13/14/15: màn hình đề xuất L&D/SOP/governance/roster theo mockup, dùng logo xanh và tokens Production. Không có component tương ứng trong production để tái sử dụng nguyên bản.

CSS prototype được scope trong .extension cho màn bổ sung, không áp style đó lên component Production. Guardrail dùng Inter cho UI và JetBrains Mono cho prompt/citation/telemetry; font nhúng offline. Chưa thay production App routing, dữ liệu, migration hay deploy.

## Giới hạn cần phân biệt

- Đây là proposal kết hợp, không phải bản sao dữ liệu tài khoản Dương Lâm. Tên người học, danh sách lớp, số bài và SOP là fixture Intrepid từ mockup. Production lấy các thông tin này từ Supabase runtime.
- Với viewport 1440px, HybridView trước khi chạy hiển thị hai cột; placeholder kết quả thứ ba hiện ở breakpoint 2xl (1536px). Ảnh chụp production trên màn hình rộng hơn có thể có ba cột. Không sửa breakpoint để ép nhìn giống ảnh ở viewport khác.
- Logo, CSS và source component được kiểm chứng; không kết luận pixel-identical ở mọi viewport, trạng thái hoặc dữ liệu.
- OAuth, AI, DB, RAG, Drive/Sheets, broadcast, email/Teams và key rotation đều local preview, không có network request. CSP connect-src none. API-secret-looking fields của mockup bị loại trước khi bundle.
- Form enterprise auth và sáu UI chưa có implementation là additions; original_audit_status trong manifest được giữ riêng, không được nâng trạng thái khi prototype render được.
- Prototype đã dùng ngưỡng >=8/10 và stuck >5 thất bại OR >20 phút. Backend Production, roster sync, RAG và quyền quản trị chưa được implement qua lần chỉnh UI này.

## Xuất và tái tạo

16 HTML độc lập trong html/, 16 PNG 1440x1024 trong screenshots/, index, manifest, production-baseline-proof, runtime-checks và interaction-checks.

node scripts/build_combined_ui.cjs
node scripts/capture_combined_ui.cjs
node scripts/verify_combined_ui.cjs
node scripts/prove_combined_baseline.cjs
node scripts/verify_ui_guardrails.cjs

Capture/verify dùng Playwright bundled và Edge đã cài. Snapshot Git và CSS evidence phải được giữ để rebuild đúng baseline, thay vì tự trôi theo main mới hơn.
PNG được chuẩn hóa 1440x1024, light, prefers-reduced-motion để chụp đủ nội dung animation. HTML giữ nguyên khả năng animation/responsive của component. Compare có phiên bản 1/2/3 theo mockup và mặc định so sánh V2/V3; nút Restore là composition thêm ở footer của ABCompareModal. Rubric hint được thống nhất với output đã có SLA 15 phút: phần còn thiếu là assignment tag của duty manager.

## Bổ sung guardrail (2026-10-07)

Xem guardrail-compliance.md cho 16 màn và ngoại lệ người dùng xác nhận: React, Lucide, logo/branding xanh Production. Guardrail CSS bổ sung có điều chỉnh typography, focus và vùng cuộn trên component tái sử dụng. VI/EN giữ dữ liệu input, mã và prompt nguyên văn. Bộ này không còn được mô tả là bản sao nguyên trạng Production.
