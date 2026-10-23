# Promptify: UI bổ sung guardrail v1.0.0

Ngày: 2026-10-07. Nguồn: tài liệu người dùng đính kèm `948d1ff5-2ba9-408b-8d62-63be2f9c24a9/Pasted text.txt`. Phạm vi: bộ 16 HTML prototype trong outputs/ui-combined, không sửa App routing hoặc triển khai Production.

## Ngoại lệ được người dùng chọn

Người dùng xác nhận giữ React/component Production và logo xanh; áp dụng guardrail UX, SOP, song ngữ và bảo mật. Do đó giữ React, Lucide và màu chủ đạo xanh của Promptify thay vì Alpine, Material Symbols và primary xanh dương. HTML vẫn tự chứa JS/CSS/font, không cần CDN hoặc build để mở bản xuất. Generator dùng build khi tái tạo artifact. Không gọi đây là tuân thủ stack Alpine nguyên văn.

Snapshot source: main/bf1d194. CSS Production được nhúng, có thêm lớp guardrail: Inter cho UI, JetBrains Mono cho prompt/citation/telemetry, focus rõ, giảm chuyển động, modal và side sheet có cuộn. Factory dịch chỉ nội dung trình bày/nhãn; không sửa giá trị input, mã định danh, prompt đã nhập, token hay citation. Chuyển VI/EN không tải lại trang và không xóa prompt.

## Đối chiếu 16 vị trí

| UI | Bổ sung trong prototype | Giới hạn thực tế |
|---|---|---|
| 00 | LandingLoginScreen Production, logo xanh, đổi VI/EN | CTA OAuth dùng adapter local |
| 01 | Kiểm tra domain Intrepid/Agribank; domain ngoài chuyển UI-03 | Intrepid là fixture; Agribank chưa có roster mẫu nên bị chặn vì thiếu roster |
| 02 | Xác nhận hồ sơ, báo sai thông tin với modal | Không tự đổi role/quyền phòng ban |
| 03 | Domain/roster/account-blocked, chuyển tài khoản, liên hệ hỗ trợ | Không cấp quyền chỉ vì có prototype |
| 04 | LearnerHome/LearnerDashboard thật, mở SOP và đổi ngôn ngữ | Lớp và 5 labs là fixture mockup |
| 05 | HybridView/PromptComposer thật; SOP side sheet, citation chèn vào input; streaming 25%/200ms rồi judge; chọn pass/warning/fail để kiểm thử | Không gọi model, DB hoặc proxy thật |
| 06 | ABCompareModal thật, trước/sau, restore phiên bản; nút đổi ngôn ngữ không bị modal che | So sánh data mẫu, không phải lịch sử tài khoản Production |
| 07 | Judge side sheet; 9.2 mẫu; pass >=8, warning 5–<8, fail <5; khóa next/export dưới 8 | Điểm mô phỏng, không phải AI thật |
| 08 | SOPInspector nguồn PDF v4.2/phòng ban, tìm/chọn trang, citation chuẩn | Chỉ page 4 có body từ mockup; không bịa trang khác |
| 09 | InstructorDashboard, telemetry, luật stuck >5 thất bại OR >20 phút chưa đạt | Điều khiển kiểm thử và số liệu local |
| 10 | LearnerDetailModal, lịch sử, ghi chú, clearance có lý do, kiểm tra stuck trong modal | Vẫn PARTIAL trong audit Production; không gửi Email/Teams |
| 11 | PromptLibraryView thật, tìm/lọc/copy/load; export prompt đạt từ judge vào mẫu chờ duyệt | Không publish SOP vào doanh nghiệp thật |
| 12 | L&D impact, lọc/CSV, telemetry mono, song ngữ | ROI được ghi là ước tính mockup |
| 13 | Drag/drop PDF/DOCX/XLSX/MD <=25MB; metadata phiên bản; Drive URL và hướng dẫn quyền service account | Chưa extraction/RAG/Drive sync; không gửi tệp đi |
| 14 | Secret che mặc định, yêu cầu xem secret với dialog chính sách quyền; routing/domain/audit local | Không chứa hoặc tải giá trị secret; không xoay khóa thật |
| 15 | Sheets roster, ánh xạ, logs, kiểm tra sync mô phỏng, telemetry | Không đọc Sheets hoặc tạo/sửa nhân viên thật |

## Chi tiết logic và bảo mật

- Citation: `[Citation: SOP-Campaign-Ops-v4.pdf, Page 4, Section 4.2]`. Trang thiếu nội dung không có nút tạo citation.
- Build-only override cho HybridView: thay ngưỡng nhánh 7 thành 8, completion 75 thành 80, và chặn/disable hành động next-lab khi score <8. Snapshot component trên đĩa không sửa.
- Failed counter tăng khi score <5. Luật stuck kiểm tra biên 5/20, 6/20 và 5/21. Clearance cần lý do tối thiểu 10 ký tự.
- `/api/v1/execute` và `/api/v1/evaluate` chỉ là hợp đồng mong muốn trong UI; không tạo endpoint Production trong lần làm prototype này. Nhãn Gemini 3.8 lấy từ mockup, không chứng nhận model khả dụng.
- CSP `connect-src 'none'`, font/logo/CSS/JS nhúng. Không OAuth, AI, Supabase, Drive/Sheets hay Email/Teams network requests.
- Loại trường secret khỏi fixture trước khi bundle. Unmask Secrets không giả vờ tiết lộ một khóa thật; thông báo cần backend/quyền quản trị, không đưa secret vào client.
- Modal native dialog có focus trap, Escape và phục hồi focus; toast thay alert/confirm/prompt; preview dài cuộn nội bộ, reduced motion được hỗ trợ.

## Kiểm tra

`runtime-checks.json`: 16 màn, lỗi JS và overflow desktop/mobile.

`guardrail-checks.json`: chuyển VI/EN 16 màn, giữ prompt, redirect domain, SOP/citation, streaming và judge, ngưỡng điểm/stuck, file types, masked secrets, font mono và zero-network.

`interaction-checks.json`: hồi quy component/luồng hiện có. `production-baseline-proof.json` chỉ đối chiếu snapshot/CSS/logo; không chứng minh bản kết hợp giống Production từng pixel sau các bổ sung.
