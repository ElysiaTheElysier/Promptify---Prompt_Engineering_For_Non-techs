# Bàn giao source of truth — Promptify Rebuild

Đây là snapshot để copy nguyên thư mục sang workspace mới cho agent khác. Có đủ **16 UI mới nhất, 16 mockup nguồn, flow, guardrail, tài liệu nghiệp vụ, curriculum và code/backend tham khảo**. Bộ UI là prototype; runtime hiện tại chưa hoàn thành toàn bộ 16 màn và chưa được nghiệm thu production.

## Thứ tự ưu tiên khi có mâu thuẫn

1. Yêu cầu đã chốt của người dùng trong [AGENT_BRIEF.md](AGENT_BRIEF.md): nội dung và chức năng theo mockup mới; style/theme/logo xanh và component từ UI current; React được giữ. Áp dụng UX, SOP, song ngữ, bảo mật từ guardrail.
2. [Flow facilitator mới nhất](requirements/facilitator-latest-flow.txt): Observe → Prepare → Execute; liên kết UI-09/10/11 và giữ context. Đây là yêu cầu mới hơn những flow cũ.
3. [16 UI mới nhất](UI_INDEX.md), [thay đổi theo comment](ui/latest/changes.md), và [mockup nguồn](ui/mockup/). UI-05 đã consolidate; UI-09 v1.1; UI-11 v1.2 là Curriculum & SOP Mapping Studio.
4. [Guardrail gốc](requirements/guardrail-latest.txt), hai skill trong `guardrails/skills/`, cùng `ui/source/guardrail-compliance.md`. Yêu cầu Alpine/cấm React trong nguồn không áp dụng vì người dùng đã chọn giữ React.
5. Tài liệu backend và nghiệp vụ trong `documents/` mô tả hướng triển khai. [Delivery status](documents/REBUILD_DELIVERY_STATUS.md) ghi giới hạn; không xem kế hoạch là bằng chứng đã triển khai.
6. `implementation-reference/` là snapshot code đang làm, dùng lại logic phù hợp. Giao diện cũ trong đó không thay thế mục tiêu UI mới.

## Danh sách nguồn

| Nhóm | Nguồn trong gói | Vai trò |
|---|---|---|
| 16 UI interactive | `ui/latest/html/` + [UI index](UI_INDEX.md) | Mục tiêu giao diện mới sau comment |
| Mockup UI-00 đến UI-15 | `ui/mockup/` | Nội dung, wording và chức năng gốc |
| Teacher updates | `requirements/UI-05-teacher-source.txt`, `UI-09-v1.1-teacher-source.txt`, `UI-11-v1.2-teacher-source.txt` | Bản nguồn cập nhật được gửi |
| Prototype source | `ui/source/` | Template/state, React variants, CSS và guardrail |
| Brand current | `ui/source/production-baseline/`, `theme.css`, `fonts.css` | Logo, theme, component tham chiếu |
| Facilitator flow | `requirements/facilitator-latest-flow.txt` | Flow mới, ASCII/Mermaid và contextual navigation |
| Backend flows | [Backend flows](documents/PRODUCTION_BACKEND_FLOWS_2026-10-08.md) | Luồng nghiệp vụ/server đề xuất |
| Kiến trúc | [Architecture plan](documents/PRODUCTION_BACKEND_ARCHITECTURE_PLAN_2026-10-08.md) | Thiết kế production mục tiêu |
| Flow khác | `documents/PROMPTIFY_SEQUENCE_FLOWS.md`, `USER_FLOWS_FROM_UI_MOCKUPS.md` | Tham khảo; phần UI-11 cũ phải nhường bản v1.2 |
| Product/decision | `documents/00_PRODUCT_SOURCE_OF_TRUTH.md`, `02_IMPLEMENTATION_PLAN.md`, `03_DECISION_LOG.md`, `requirements/stakeholder-notes.txt` | Yêu cầu, quyết định và lịch sử |
| Tracker | `documents/Promptify_Intrepid_Progress_06-23_Oct_2026.xlsx` | Checklist tiến độ/yêu cầu, không phải chứng nhận hoàn thành |
| Frontend/backend | `implementation-reference/src/`, `api/`, `supabase/` | Code hiện tại, schema, migration, rollback |
| Curriculum | `implementation-reference/curriculum-specs/`, `curriculum-levels/` | Nguồn giáo trình; seed trong src là generated |
| Kiểm tra/generator | `implementation-reference/test/`, `scripts/` | Kiểm tra và tái tạo; đọc trước khi chạy live |
| Provenance | [Inventory](SOURCE_INVENTORY.json), [Git snapshot](GIT_SNAPSHOT.txt) | Đường dẫn gốc, SHA-256 và trạng thái dirty |

## Đọc và mở thế nào

Đọc AGENT_BRIEF → UI_INDEX → changes → flow mới → delivery status → architecture. Mở HTML từng màn bằng browser để thao tác. Source text gọn nằm trong `ui/source/mockup-templates.json`, `mockup-data.json`, `comment-variants.tsx`, `mockup-aligned.tsx`.

**Không feed toàn bộ HTML vào context của agent/NotebookLM**: mỗi HTML khoảng 4,8 MB vì nhúng bundle/asset; không tương đương 4,8 MB nội dung nghiệp vụ. Đọc source gọn và mở UI trực quan. `ui/source/reference-history/` là lịch sử, không phải bản mục tiêu.

## Những gì còn thiếu hoặc phải xác minh

- CSV comment gốc không còn ở Downloads. Gói giữ `ui/latest/changes.md` và source variants đã sửa; không tự dựng lại comment nguyên văn.
- Screenshots và verification được copy là bằng chứng ở lần tạo prototype, chưa phải kiểm thử lại runtime hiện tại.
- Backend còn thiếu full port 16 UI, lifecycle live session, consent/draft streaming, heatmap, weighted rubric, ingestion/RAG, governance và một số role/permission flows. Xem delivery status chi tiết.
- SQL được người dùng báo đã chạy trên staging; cần kiểm thử quyền bằng session thật, concurrency, realtime và AI trước khi nghiệm thu.
- Không có `.env`, mật khẩu hay khóa cấu hình trong gói. Agent sau phải cấu hình môi trường riêng; không đưa service-role/AI secret vào frontend.
- Không tự áp dụng lại migrations lên project đang có, push hoặc deploy chỉ vì nhận gói này.

Gói có 478 file nguồn được kiểm SHA-256, ngoài các tài liệu bàn giao được viết riêng. Không thay đổi runtime hay database khi đóng gói.
