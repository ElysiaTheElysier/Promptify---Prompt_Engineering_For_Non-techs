# Bản sửa theo comment CSV — 08/10/2026

Nguồn comment: C:/Users/Admin/Downloads/Promptify_UI_Mockup_vs_Combined_GAP.csv. Chỉ 5 dòng có comment: UI-00, UI-01, UI-05, UI-06, UI-09.

Đầu ra mới: `outputs/ui-comment-revision/`. Đủ 16 HTML theo thứ tự. 11 màn không được comment giữ nguyên nội dung HTML của bộ combined. Không ghi đè thiết kế combined cũ hoặc mockup.

| UI | Đã thực hiện |
|---|---|
| UI-00 | Thay key visual demo bằng chính React PromptCompareVisual từ baseline production bf1d194: animation typing/output chạy loop, font/CSS và logo xanh. Giữ các phần khác của landing. |
| UI-01 | Nền xanh rất nhạt, surface trắng, accent emerald, bỏ thanh gradient tím; giảm shadow và điều chỉnh contrast. Giữ layout, wording và binding đăng nhập của nguồn. |
| UI-05 | Bản Playground: editor lớn nhất; task ngắn, goal chips, selector test case và nút SOP/Data; context đính kèm gọn; Theory/Hint/Solution/Advanced mở theo yêu cầu. Output ưu tiên nội dung, overall score và 5 chỉ báo nhỏ; feedback collapsible, rubric drawer. Autocomplete vẫn dùng nguyên lệnh insertChip của nguồn và có accept; giữ SOP/Judge drawers cùng dữ liệu mẫu. |
| UI-06 | Bản Compare Attempts: summary trước, prompt/output modes riêng, selector A/B độc lập, diff LCS từ nội dung, align block thêm/bỏ, ẩn phần không đổi, synchronized scrolling, một action Use version. Dùng nguyên prompt/output V2/V3 trong nguồn; nếu mở từ UI-05 thì đọc lịch sử prompt đã capture ở session. Không tạo V1 hoặc điểm tiêu chí khi nguồn thiếu. |
| UI-09 | Bản sáng: header gọn, KPI phẳng, lab steps và một contextual Edit action, learner table là chính, telemetry light feed với diagnostics mở rộng. Reuse cohort/lab/learner/telemetry state và source actions broadcast/inspect/navigateToStudio. Không tạo metric hoặc trạng thái mới. |

## Xem và so sánh

- `index.html`: bộ 16 UI, links độc lập.
- `compare.html`: tương tác side-by-side; bên trái chọn combined gốc hoặc mockup, bên phải bản sửa. Có chọn UI, trước/sau và mở bản mới riêng.
- Screenshots desktop 1440×1024 và mobile 390×844 cho 5 UI sửa.

## Kiểm tra

23 kiểm tra qua trên Edge headless, không pageerror: desktop/mobile không tràn ngang; production key visual; drawer/Escape; accept; chạy V3; history; selector/diff đúng version; restore; Studio nhận lab ID; learner inspector; broadcast local state.

Scripts tái tạo: `scripts/build_ui_comment_revision.cjs`, `scripts/verify_ui_comment_revision.cjs`. Source UI riêng: `design-drafts/combined-ui/comment-variants.tsx` và `comment-variants.css`. Entry được tạo từ harness hiện có để dùng lại source bindings/guardrails.

## Giới hạn

Đây là bản UI mới theo comment, không phải bổ sung backend hoặc hoàn thành các GAP nghiệp vụ trong audit trước. AI output và evaluation vẫn là fixture của mockup; run chỉ capture prompt và mô phỏng trạng thái. Không gọi AI/DB/SSO/Sheets. Không suy diễn nguyên nhân cải thiện điểm từ diff. Bộ source vẫn có hai kịch bản Intrepid/Agribank; comparison standalone dùng source Intrepid, comparison mở từ workspace dùng lịch sử workspace hiện tại.

Theme theo nhận diện xanh đã duyệt. Search UI/UX Pro Max tìm được neutral SaaS palette; lựa chọn xanh thay primary đề xuất để giữ brand hiện tại. Không dùng kết quả healthcare/meditation không phù hợp.
