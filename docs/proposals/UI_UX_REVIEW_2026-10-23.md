# Đề xuất sửa UI/UX toàn bộ vai trò — 23/10/2026 (CHƯA THỰC HIỆN)

Rà theo Vercel Web Interface Guidelines (skill `web-design-guidelines`) + 4 ảnh chụp staging của người dùng. Chỉ đề xuất; chưa sửa code. Phạm vi: các màn **đang render thật** (nhánh `scoped(...)` trong `ProductionApp.tsx`), không đụng màn legacy không bao giờ hiển thị.

## 1. Vấn đề chính (tóm tắt)

1. **Nút chỉ là một dòng chữ** — ~25 nút không có style, ví dụ:
   - `PromoteLearnerForm.tsx:21` "Promote to facilitator" (ảnh 4)
   - `ProductionSopSource.tsx:22` "Review source", "Reject" (duyệt SOP)
   - `ProductionGovernanceSource.tsx:20` bật/tắt domain
   - `ProductionCohorts.tsx:7` "Save class status", "Create cohort"
   - `AccessRequestInbox.tsx:8` "Resolve"; `DepartmentCorrectionLog.tsx:11` "Refresh"; `RosterWorkbookPanel.tsx:8` "Tải mẫu Excel", bật auto-sync
   - `LearnerProfile.tsx:7` "Đóng"; `ProductionApp.tsx:208-214` VI/EN, Đăng xuất, Retry (fallback)
2. **Nút dính nhau, không phân cấp** — hộp "Lưu mẫu prompt" (ảnh 2): "Lưu vào thư viện cá nhân" và "Tải mẫu" sát nhau, cùng màu primary; nút "Đóng" là nút lớn ở góc trên trái.
3. **Nút "Lưu vào thư viện" đặt sai chỗ** — nằm ở tiêu đề Trình soạn prompt cạnh badge V8 (ảnh 3), trong khi lưu thư viện là lưu **một lần thử đã chạy** (kèm điểm, thiết lập).
4. **Hành động quan trọng/huỷ không rõ** — Promote, Reject SOP, Decline hint, Freeze session, Remove expiry dùng chung kiểu nút hoặc không có kiểu; Promote dùng `window.confirm` của trình duyệt, Reject/Decline không xác nhận.
5. **3 hệ thống giao diện trộn lẫn**: learner V7 (`lv-*`), staff "Source" (Tailwind Material `m3-*`), component mới (`prod-card`/inline style) → cùng một màn Governance có khối đẹp và khối như HTML thô (ảnh 4).
6. **Bất nhất giữa vai trò** (mục 3).
7. **Theo guideline**: ~80 `transition-all` (anti-pattern), ~27 `outline-none` không có `focus-visible` thay thế (mất viền focus khi dùng bàn phím), thông báo lỗi giữ lại khi chuyển màn (đã thấy toast 403 cũ ở Governance), loading text thiếu "…".

## 2. Hệ thống chung đề xuất (dùng cho mọi vai trò)

| Thành phần | Quy ước |
|---|---|
| Nút | Một bộ class duy nhất `ui-btn` + biến thể: **primary** (nền xanh đậm, chữ trắng) cho hành động chính duy nhất của khối; **secondary** (viền xanh, nền trắng); **danger** (viền/nền đỏ) cho Reject, Decline, Remove, Freeze; **ghost** cho Đóng/Huỷ. Cao tối thiểu 40px, padding 10×16, bo 12px, có hover/active rõ hơn trạng thái thường, `:focus-visible` vòng 2px, disabled = mờ 50% + con trỏ not-allowed, khi đang xử lý đổi chữ "Đang lưu…" |
| Hàng nút | `ui-btn-row`: flex, **gap 12px**, wrap trên mobile; hành động chính **ở bên phải**, Huỷ bên trái hàng |
| Hộp thoại | Dùng `ProductDialog`: tiêu đề + nút **×** (aria-label) ở góc phải; nội dung; chân hộp thoại là `ui-btn-row`. Bỏ nút "Đóng" to ở đầu hộp |
| Xác nhận hành động nguy hiểm/không đảo ngược | Hộp thoại xác nhận chung (thay `window.confirm`), nêu rõ hậu quả + bắt buộc lý do khi cần (Reject SOP, Decline hint, Promote, Freeze, Remove expiry) |
| Thông báo | Một component toast duy nhất (thành công/lỗi), **tự xoá khi đổi màn**, lỗi kèm bước khắc phục |
| Thẻ/khối | Mọi khối staff mới dùng cùng kiểu thẻ của màn Source (`rounded-2xl border p-5`), tiêu đề `h2` + mô tả ngắn |
| Trạng thái | Badge màu thống nhất: Chờ duyệt (vàng), Đã duyệt/Đã index (xanh), Bị từ chối (đỏ), Đang xử lý… (xám) |

## 3. Bất nhất giữa các vai trò

| Hạng mục | Hiện tại | Đề xuất |
|---|---|---|
| Ô chọn lớp | Thanh trên: "tên khoá học · phòng ban" (ảnh 1: "Staging acceptance — fictional delivery operations…" dù đang học Northstar); Workshop: "mã lớp · phòng ban" | Thống nhất **"Mã lớp · Phòng ban"** (tooltip tên khoá học) ở mọi vai trò |
| Điều hướng | Workshop có **header riêng thứ 2** ("Promptify Control Center", ô cohort riêng, tab All Hubs/Pulse/War Room/Studio) chồng dưới thanh chính; các màn staff khác chỉ có thanh chính | Bỏ header/ô cohort trùng trong Workshop; giữ tab nội bộ làm thanh phụ cùng kiểu |
| Ngôn ngữ | Màn learner song ngữ đầy đủ; màn staff Source nhiều chữ tiếng Anh cố định ("Inspect Prompts", "Broadcast Hint", "Phase 2: Pre-Game…"); tên kỹ thuật lộ ra UI ("UI-05", "Live War Room (UI-09)") | Song ngữ qua cùng `p()/copy()`; bỏ mã UI-xx khỏi nhãn |
| Kiểu nút/thẻ | 3 hệ thống (mục 1.5) | Mục 2 cho tất cả |
| Lỗi/xác nhận | Mỗi màn hiển thị lỗi một kiểu (đỏ góc dưới, `prod-error`, `lv-warning`); xác nhận lúc có lúc không | Toast + hộp xác nhận chung |
| Thư viện prompt | Learner: "Thư viện" ở thanh bài học; Head: Prompt Library ở Analytics với ô "Lý do duyệt" dùng chung cho mọi mẫu | Một component, mỗi mẫu có ô lý do riêng + nút Duyệt (primary) / Từ chối (danger) |

## 4. Sửa theo màn hình

| Màn | Sửa |
|---|---|
| **Workspace học viên (UI05)** | Bỏ nút "Lưu vào thư viện" khỏi tiêu đề trình soạn. Đặt **"Lưu vào thư viện"** ở thanh hành động của thẻ **Kết quả từ mô hình** (cạnh nút Sao chép) vì nó lưu đúng lần thử đang xem; vẫn giữ một nút phụ cạnh "Chạy prompt" khi đã có lần thử. Hộp "Lưu mẫu prompt": tiêu đề + ×, trường Tên/Danh mục, dòng tóm tắt (V8 · Chưa chấm · Temp…), checkbox chia sẻ kèm giải thích "Head sẽ duyệt trước khi cả phòng ban thấy", chân hộp: **[Huỷ] … [Tải file mẫu] [Lưu vào thư viện]** (primary bên phải, gap 12px). Đổi tên nút thanh trên "Thư viện" → **"Thư viện prompt"** để phân biệt "Thư viện SOP" |
| **Đóng góp SOP (UI13)** | Danh sách bài gửi thành thẻ có badge trạng thái; nút **Xem nội dung** (secondary), **Duyệt & index** (primary), **Từ chối** (danger → hộp xác nhận, bắt buộc lý do). Thêm bộ lọc Chờ duyệt / Đã index / Bị từ chối. Màn nền khi đóng modal hiển thị luôn danh sách bài gửi thay vì khối trống "Ingestion Engine" |
| **Quản trị (UI14)** | Form "Chuyển học viên thành facilitator" và "Class access" cùng kiểu thẻ; nút Promote primary + hộp xác nhận chung nêu rõ "người này sẽ không còn vào không gian học viên"; bật/tắt domain dùng toggle có nhãn; nhật ký sửa phòng ban: nút Làm mới secondary |
| **Workshop (UI09)** | Bỏ header trùng; hàng đợi gợi ý + popup dùng `ui-btn` (Duyệt primary, Từ chối danger); "Freeze session" danger + xác nhận; Broadcast: nút primary kèm ô nhập cùng hàng có nhãn |
| **Roster (UI15)**, Cohorts, Access requests | Tất cả nút theo mục 2; "Sync now" primary; "Resolve" đổi nhãn "Đánh dấu đã xử lý" (vì không cấp quyền — L07 audit) |
| **Studio (UI11)** | Thay `transition-all`, thêm focus-visible; nút Huỷ/Lưu theo hàng chuẩn; công tắc "Allow adversarial practice" thành toggle có mô tả |
| **Hub học viên (UI04), Hồ sơ** | Nút Đóng/Dismiss theo `ui-btn ghost`; hộp thông báo giảng viên giữ nguyên |
| **Toàn cục** | Toast tự xoá khi đổi màn; viền focus; loading "…"; nút icon có `aria-label` |

## 5. Kế hoạch & ước lượng

| Đợt | Nội dung | Công sức |
|---|---|---|
| A | Bộ `ui-btn`/`ui-btn-row`, hộp xác nhận chung, toast chung (xoá khi đổi màn); áp vào ~25 nút không style | ~1 ngày |
| B | Sắp lại Workspace (nút Lưu + hộp Lưu mẫu), SOP review, Governance, Workshop (bỏ header trùng), ô chọn lớp thống nhất, song ngữ màn staff | ~1,5 ngày |
| C | Guideline: `transition-all` → thuộc tính cụ thể, `focus-visible`, `aria-label`, "…" | ~0,5 ngày |
| D | Kiểm chứng: test offline + chụp màn hình từng vai trò (Admin, Trainer, Head, Learner) bằng trình duyệt, desktop + mobile; deploy **chỉ Hosting** (không đổi API/DB) | ~0,5 ngày |

Không đổi: luồng nghiệp vụ, API, DB, model, cách chấm; bố cục 3 cột Workspace; màu thương hiệu.

Rủi ro: các file Source rất dày (Studio 82 KB) — sửa nút theo từng file, chạy lại toàn bộ test UI (`verify_learner_ui_state`, `verify_mentor_studio`, `verify_workshop_messaging`) sau mỗi đợt.
