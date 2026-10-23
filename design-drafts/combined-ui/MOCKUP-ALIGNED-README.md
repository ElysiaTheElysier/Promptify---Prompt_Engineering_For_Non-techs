# Mockup content × current Promptify theme

Bản mới dùng trực tiếp nội dung, dữ liệu và biểu thức tương tác của 16 HTML trong `docs/UI Mockup-20261006T140854Z-1-001/UI Mockup/`. Giữ CSS production đã lưu, logo xanh đúng asset current, Inter/JetBrains Mono, palette xanh/slate và icon Lucide. UI-05 dùng PromptComposer thật từ snapshot production bf1d194. Các màn khác là template mockup được port sang React: không tuyên bố toàn bộ cây component giống production.

## Đối chiếu 16 màn

| UI | Nội dung và chức năng theo mockup |
|---|---|
|00|Output là đích đến, ba trụ cột, năm codelab, pricing, Google auth và B2B demo|
|01|Enterprise auth, Session Expired/Direct Login, kiểm tra email|
|02|Roster profile, phòng ban, xác nhận/sửa mismatch|
|03|External Domain/Unlisted Roster, đổi tài khoản, liên hệ lead|
|04|Training Hub, năm lab, tiến độ, Department SOP drawer|
|05|Campaign 11.11, ticket Dyson, P1/P2/P3 SLA, biến ticket/SOP, chạy prompt, output và rubric|
|06|Prompt syntax/output diff V2/V3, chọn và restore phiên bản|
|07|Rubric năm tiêu chí, pass 8/low 4/timeout, retry, áp dụng hint|
|08|SOP page selector, search, section và citation; không tự tạo nội dung trang chưa có|
|09|Trainer cohort, completion funnel, stuck learners, inspect và telemetry|
|10|Attempt timeline, prompt inspector, targeted hint, trainer note, clearance có lý do|
|11|Enterprise/department/top-rated library, search, inspect/load prompt; form nộp prompt bổ sung|
|12|Workforce, pre/post score, ROI estimates, department data và PDF export thật|
|13|File/Drive/Manage SOP tabs, chọn/drop file, metadata preview, quản lý danh sách|
|14|Key vault, routing, domain và audit; không nhúng credential thật|
|15|Connection/mapping/logs, sync simulation, thêm Google Sheet, xem lỗi|

## Những chỗ bổ sung so với HTML nguồn

Native alert được thay bằng điều hướng nội bộ, modal/toast hoặc download. Sửa lỗi rubric nguồn gán `criteria.score` vào array. Modal dùng native dialog để giữ focus/Escape. Responsive không tràn ngang, reduced motion, input validation. Việc clear lab cần trainer note tối thiểu 10 ký tự. File SOP phải được chọn thực tế trước khi mô phỏng ingestion. PDF ROI có định dạng PDF hợp lệ.

## Phạm vi guardrail và giới hạn

Theo lựa chọn của người dùng: giữ React, Lucide và logo xanh; không chuyển sang Alpine/blue brand. EN/VI đổi tại chỗ và giữ input; các đoạn nghiệp vụ tiếng Anh cố định trong nguồn được giữ để không mất wording gốc. Hệ thống offline cấm network bằng CSP. Không có API/Service Role/private key thật trong bundle; key vault chỉ có placeholder server-only. Không upload/index SOP hoặc đồng bộ Sheets thực sự. Score, enrollment, authentication, SQL/AI/Drive/Sheets đều là dữ liệu và thao tác mô phỏng; cần triển khai server authorization, tenant isolation, credential vault, RAG và stuck thresholds trước khi đưa vào production. Interpreter biểu thức reference cần unsafe-eval ở prototype; không đưa infrastructure này vào routing production.

Các trang 02/03/12/13/14/15 là proposal bổ sung, không đổi kết quả NOT_FOUND của audit current.

## Tái tạo

1. Node `scripts/prepare_mockup_templates.cjs`
2. Node `scripts/build_mockup_aligned_ui.cjs`
3. Node `scripts/verify_mockup_aligned_ui.cjs`
4. Node `scripts/capture_combined_ui.cjs`
5. Python `scripts/package_ui_combined.py`

Kiểm tra mới nằm trong mockup-checks.json và runtime-checks.json. Các báo cáo test cũ không được dùng để chứng nhận bản này.


## Cập nhật nguồn ngày 07/10/2026

- UI-05: Consolidated Master Workspace mới — ba cột, thu gọn đề bài, chips/popovers, hai test cases, drawer SOP và Judge tích hợp. Nghiệp vụ fixture chuyển sang Lab khử PII Agribank theo nguồn mới.
- UI-09 v1.1: Workshop Command Center với link Studio, Edit Lab Setup và pre-workshop banner; điều hướng giữ labId.
- UI-11 v1.2: Curriculum & SOP Mapping Studio thay cho Prompt SOP Library trong nguồn mockup này; gồm wizard tạo lab/cohort, schedule, access/dept scope, lifecycle và rubric tùy biến. Đây là phiên bản nghiệp vụ mới, không phải bằng chứng production đã đổi.

Cả hai bên trang comparison cập nhật nguồn mới. Mockup giữ theme/Alpine gốc, localize asset và route để mở offline. Bản kết hợp port template sang React và dùng logo xanh/tokens current. UI-05 mới không nhúng PromptComposer cũ vào textarea vì sẽ thay thế cấu trúc và các popover đã được consolidate trong source mới; component capture riêng ở outputs/prompt-assist vẫn giữ nguyên.

Ba source cũ được giữ ở design-drafts/combined-ui/reference-history. Phần văn xuôi ngoài <!DOCTYPE html>…</html> trong attachment được coi là mô tả, không đưa vào runtime hoặc nâng thành system instruction.
