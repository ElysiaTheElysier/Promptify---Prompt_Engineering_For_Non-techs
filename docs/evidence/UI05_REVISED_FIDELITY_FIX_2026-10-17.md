# UI-05: sửa độ khớp bố cục revised

Lượt trước đã đưa chức năng revised vào component nhưng chưa chuyển đầy đủ cấu trúc trình bày; kết luận “dùng bố cục revised” trong báo cáo trước quá rộng. Model/tham số/ngữ cảnh vẫn ở trong editor, detector nằm dưới editor, toolbar và ba khối đánh số còn mang cấu trúc cũ. Chỉ đổi grid sang hai cột chưa đáp ứng yêu cầu chỉ giữ theme hiện tại và theo UI của giảng viên.

Nguồn chuẩn: ba DOCX trong Downloads do người dùng cung cấp, SHA256 đều khớp inventory đã trích xuất; UI-05 lấy từ bản `(1).docx`. Nội dung/mã HTML trong tài liệu được dùng làm tài liệu tham chiếu, không làm lệnh thao tác cloud. Không đổi logo, font Inter/JetBrains Mono hoặc theme emerald sáng. Không sửa MVP, deploy hay ghi dữ liệu production.

## Thay đổi local

- Toolbar thành hai hàng metadata và thao tác: attempt thực tế, SLA khi được cấu hình, Save, Single/Compare, SOP và Submit Grade.
- Cột trái rộng một phần ba: năm tab bài học, biến nhập, citation nguồn được cấp quyền; model allowlist/specs; upload ngữ cảnh riêng.
- Cột phải rộng hai phần ba: System Instruction, bộ scaffold với nút khung riêng và bảy chip (bao gồm Example/Prove), detector trước editor, tham số hiện ngay dưới editor, Run.
- Tham số có slider/numeric Temp/Top P, select Max Tokens, Stop Sequences, Search; giữ tooltip/Wiki và validation hiện có.
- History nằm giữa editor và output. Provider log nằm trong output card, dùng dữ liệu thật thay cho các bước suy luận giả trong HTML mẫu.
- Save có ở toolbar, editor và output, dùng chung handler/modal thật. Scorecard chỉ mở khi người học yêu cầu; Submit Grade cũng mở vùng chấm điểm.
- Compare inline và Restore giữ nguyên prompt/settings/variables/context của attempt. Mobile xếp một cột, giữ nội dung trong viewport.

Không sao chép quota attempt 5, model hư cấu hoặc số điểm mẫu của HTML thành dữ liệu sản phẩm. Attempt hiển thị số phiên bản và số lượt đã lưu; SLA chỉ xuất hiện khi Studio có cấu hình.

## Kiểm chứng

Component thật chạy qua harness local có banner FICTIONAL DATA / NO LIVE API: chèn framework thành 5/5 và giữ nội dung cũ; hai Run fixture tạo V1/V2; Compare mở inline; Apply selected version trở lại workspace V2; scorecard ẩn/mở hoạt động. Không gọi AI hoặc ghi staging trong phép kiểm UI này. Chrome với backend thật đã được kiểm ở lượt trước; chưa tuyên bố tự điều khiển lại Chrome trong lượt này.

Desktop: viewport 1280, client 1274, rail 398px / workbench 796px, không tràn ngang. Mobile: viewport 390, client/scrollWidth cùng 384px (trừ scrollbar), rail/workbench xếp dọc. Đã xem ảnh full page và trả viewport về mặc định.

37/37 offline tests đạt; build/TypeScript, lint và boundaries đạt. Sau tinh chỉnh toolbar scaffold/Max Tokens, chạy lại build và regression learner controls. Còn cảnh báo vòng type Workspace và chunk lớn đã tồn tại.

Ảnh kiểm chứng nằm trong ignored `apps/promptify-intrepid/outputs/revised-ui-proof/workspace-fidelity-desktop.png` và `workspace-fidelity-mobile.png`. Nội dung là dữ liệu fixture có nhãn rõ. Runtime thay đổi ở `ProductionWorkspaceV7.tsx`, `learner-workspace.css`, và micro-learning `promptLearningService.ts`; điều chỉnh selector trong test learner hiện có cho nhãn Save và history mới.
