# Kiểm tra UI-04, UI-05, UI-11 — desktop và mobile

Ngày: 17/10/2026. Phạm vi sửa: **Intrepid**. Giữ logo, Inter/JetBrains Mono, bảng màu và các token thương hiệu hiện tại. Không thay đổi MVP, deploy, push, cấu hình cloud, migration hoặc dữ liệu production.

## Nguồn đối chiếu

- Ba Word revised được trích xuất và đối chiếu trong [báo cáo so sánh](REVISED_UI_COMPARISON_2026-10-17.md); kết quả triển khai trước phiên này ở [báo cáo implementation](REVISED_UI_IMPLEMENTATION_2026-10-17.md).
- [Transcript cuộc họp](../meetings/MEETING_TRANSCRIPT_2026-10-12.md): Hub/progress/lab/schedule **00:33:08–00:41:38**; Run/Compare **00:43:34–00:44:03**; Studio Save/variables/rubric/sandbox **00:49:09–00:53:34**; scaffold và vị trí Run **00:59:01–01:00:38**; output/log/scorecard **01:00:45–01:01:42**; history/compare/restore **01:03:20–01:06:04**; SOP/page citation **01:06:14–01:09:16**.
- Các lỗi responsive dưới đây được tái hiện trong phiên QA này; không khẳng định thầy đã chỉ đích danh từng lỗi đó trong video.

## Lỗi đã sửa trong phiên này

| Lỗi tái hiện | Trước sửa | Sau sửa |
| --- | --- | --- |
| UI-05 Compare: thanh chọn A/B không xuống dòng | Viewport 390px nhưng trang rộng 745px; phần chọn B nằm ngoài màn hình | Nhóm chọn phiên bản co/xuống dòng; trang không rộng hơn viewport; giữ hai phiên bản, prompt/output diff và Restore |
| UI-11 Scope: select pillar dài | Viewport 390px nhưng trang rộng 564px | Select co trong ô cấu hình; không còn tràn ngang toàn trang |
| UI-11: năm tab nằm trên một hàng và header cố định cao trên mobile | Tab sau cần kéo ngang; header chiếm nhiều vùng đọc khi cuộn | Năm tab xuống dòng trên mobile, header cuộn cùng trang; desktop vẫn giữ cách trình bày hiện tại |
| UI-05 Quick Fix: scaffold dính cuối dòng trước | Chèn Context sau Task tạo `{ticket}[Context]`, bộ đếm vẫn 2/5 | Scaffold bắt đầu ở dòng riêng; kiểm tra trình duyệt xác nhận 3/5, giữ nguyên prompt gốc |
| UI-11: nút xóa quiz chỉ có icon | Thiếu tên thao tác cho công nghệ hỗ trợ | Bổ sung tên nút xóa quiz/bình chọn; không đổi hành vi xóa |

Các thay đổi nằm tại `ProductionCompareSource.tsx`, `ProductionStudioSource.tsx`, `ProductionWorkspaceV7.tsx`, `learner-workspace.css`; bổ sung kiểm thử trong `verify_learner_ui_state.mjs`.

## Cách kiểm tra và kết quả

Mở component sản phẩm thật qua harness localhost **LOCAL UI REVIEW · FICTIONAL DATA · NO LIVE API**. Adapter chỉ lưu trạng thái trong bộ nhớ, không có dữ liệu production và không gọi AI thật. Dùng CDP device metrics sau khi viewport override cấp browser không phản ánh đúng kích thước; đo `innerWidth` và chiều rộng tài liệu, không suy luận mobile từ ảnh thu nhỏ. Đã trả viewport về mặc định khi kết thúc.

| Màn hình | Desktop 1280×900 | Mobile | Thao tác đã kiểm |
| --- | --- | --- | --- |
| UI-04 | Không tràn ngang | 390px và 375×812; không tràn ngang | Search trả đúng một lab; reset về catalog; Details mở đúng scenario/objectives/competency; SOP drawer; đổi citation Page 4 sang Page 5; xem progress, poll, materials và badge empty state |
| UI-05 | Hai cột hoạt động, không tràn ngang | 390×844 và 375×812; không tràn ngang sau sửa | Hai lượt Run giả lập; Compare chọn phiên bản/Restore; settings mở được; Quick Fix Context nhận diện 3/5; framework lên 5/5; Save modal rộng 335px trong viewport 375px |
| UI-11 | Directory/Studio/tab Awards không tràn ngang | Directory và cả năm tab ở 390px; Scope kiểm lại 375px | Directory → Edit; Scope, variables/scaffolds, SOP/materials, rubric/sandbox controls, Awards; bảng rộng cuộn bên trong; header mobile có position static |

Không coi các bảng được thiết kế cuộn riêng là tràn ngang toàn trang. Chưa thử trên thiết bị iOS/Android vật lý. Không có lỗi console trong lần đọc log cuối phiên Studio.

## Kiểm thử mã nguồn

- Typecheck: đạt.
- Lint/Dependency Cruiser: đạt, không lỗi; còn cảnh báo type cycle Workspace đã tồn tại.
- Architecture boundaries: đạt.
- Offline allowlist: **35/35 đạt**, gồm kiểm thử mới xác nhận Quick Fix được nhận diện là core element riêng.
- Build: đạt; còn cảnh báo bundle lớn hơn 500kB.
- Smoke: đạt, assets/entry/routes và từ chối request chưa xác thực; không gọi provider/DB thật. Lần đầu trong sandbox không kết nối được localhost, chạy lại với quyền localhost đã đạt.

## Giới hạn còn lại

Đây là xác nhận UI và tương tác local; không thay thế kiểm thử end-to-end Firebase/Cloud SQL staging. Các luồng đăng nhập thật, lưu bền qua backend staging, cấp award thực, đồng bộ roster/SOP và provider AI cần cấu hình staging được nêu trong [báo cáo backend](BACKEND_VALIDATION_2026-10-16.md). Migration badge 010 vẫn chưa áp dụng lên hệ thống từ xa. Không đánh dấu các luồng này hoàn tất chỉ dựa trên adapter UI.

## Ảnh kiểm tra

Ảnh nằm trong thư mục ignored `apps/promptify-intrepid/outputs/responsive-qa/`: `ui04-desktop.png`, `ui04-mobile.png`, `ui05-desktop.png`, `ui05-mobile.png`, `ui05-compare-mobile.png`, `ui11-desktop.png`, `ui11-mobile.png`.
