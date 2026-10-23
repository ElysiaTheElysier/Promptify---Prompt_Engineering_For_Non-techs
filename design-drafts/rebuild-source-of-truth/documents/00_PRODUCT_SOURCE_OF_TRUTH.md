# 00 — Nguồn sự thật về sản phẩm Promptify Intrepid

Cập nhật: 06/10/2026. Chỉ ghi sản phẩm/scope có nguồn trực tiếp. Ưu tiên cao nhất: **“Đức’s thoughts”** trong [ghi chú 05/10/2026](archive/business-drafts/STAKEHOLDER_NOTES_2026-10-05.txt). Structured Refinement, BRD 2.0 và PRD 1.0 đi sau phần này không tự trở thành quyết định được duyệt. [03](03_DECISION_LOG.md) phân loại nguồn và trạng thái.

## Target product Phase 1

Một phiên bản Promptify nội bộ dành riêng cho Intrepid, phục vụ đào tạo/thực hành prompt theo công việc từng Business Function/phòng ban. Thu hẹp vision platform để phù hợp nguồn lực ít, kiêm nhiệm và nhu cầu build nhanh.

Stakeholder nêu bối cảnh **27 Business Functions, 6 quốc gia, khoảng 550 tài liệu/video SOP** có thể tiếp cận để xây bài giảng. Đây là quy mô bối cảnh, chưa xác nhận phải rollout đồng loạt hoặc nạp toàn bộ nguồn ở lần phát hành đầu.

## Users

| Nhóm | Nhu cầu và trách nhiệm đã xác nhận |
| --- | --- |
| Learner — nhân viên Intrepid | Học theo group/cohort của Business Function, thực hành trong learning zone phù hợp |
| Trainer — Vo Tu Duc | Trainer chính duy nhất; xem phòng ban/dữ liệu, quản lý lớp/cohort/course/học liệu/lý thuyết |
| Head/Admin/PIC của Business Function | Xem kết quả học phòng ban, xem library prompt chung, xác nhận/cập nhật SOP và cung cấp sample data theo yêu cầu của Đức |

## Core flows

1. **Learner:** corporate SSO → đối chiếu roster → xác nhận email, họ tên, Business Function/phòng ban, quốc gia; yêu cầu sửa nếu sai → zone tương ứng → học/thực hành theo công việc.
2. **Trainer:** SSO → xem phòng ban/dữ liệu → dùng SOP/sample data xây bài giảng/bài tập → quản lý course/cohort/lớp → theo dõi kết quả.
3. **Head/Admin/PIC:** login → xem kết quả học phòng ban và library chung → xác nhận SOP đúng/đủ, gửi cập nhật và sample data thực tế qua form.

Roster đã có bản sao email, họ tên và Business Function; thoughts nêu có thể pre-onboard. Brief trực tiếp người dùng bổ sung xác nhận đây là hướng Phase 1.

## Scope

- Corporate SSO Intrepid, roster/profile confirmation và routing theo phòng ban.
- Group/cohort và learning zone theo Business Function.
- Học liệu, lý thuyết, course và bài tập do Đức xây dựng dựa trên SOP và sample data.
- Form để Head/Admin/PIC gửi dữ liệu, xác nhận/cập nhật thông tin SOP.
- Reporting/analytics sâu hơn, tracking kết quả người học và impact kết hợp business metrics.
- Library prompt chung cho người hỗ trợ; chính sách chia sẻ/chỉnh sửa chi tiết chưa chốt.
- Bản Intrepid ưu tiên tiếng Anh; hỗ trợ EN/VI qua i18n, có khả năng thêm ngôn ngữ sau.
- Mọi user Intrepid được xem là paid; không cần payment/subscription Phase 1.
- Credential AI chung do Intrepid kiểm soát trong môi trường GCP; người học không tự cấp key. Key chỉ được sử dụng bởi user Intrepid khi thực hành trên Promptify.
- Thành công ở Intrepid làm tiền đề tái sử dụng cho doanh nghiệp khác sau này.

## Out-of-scope Phase 1

Theo thoughts và giới hạn Phase 1 trong brief trực tiếp người dùng:

- Generic multi-tenant SaaS, clone Agribank/doanh nghiệp khác và sản phẩm white-label.
- Public registration, BASIC/FREE tier, payment/subscription, Partner Portal, revenue sharing.
- Người học tự cung cấp/quản lý AI API key.
- ERP writeback và workflow automation phức tạp.

## Business constraints

- Nhân sự ít/kiêm nhiệm, Đức là trainer duy nhất: cần sản phẩm nhỏ và vận hành được.
- SOP/sample data phải phản ánh nghiệp vụ thực; Head/Admin/PIC hỗ trợ cập nhật.
- Identity/phòng ban là căn cứ routing và phạm vi xem dữ liệu; brief yêu cầu Head chỉ xem phòng ban mình.
- Privacy key là ràng buộc quan trọng. Thoughts đồng thời yêu cầu ô để user nhìn thấy thông tin key; chưa xác nhận cho phép hiển thị secret thô.
- Reporting/impact đã xác nhận; chưa chốt KPI số, mastery threshold, deadline hay ngân sách usage.
- Theo brief người dùng: phiên bản hiện tại độc lập; Intrepid chuẩn bị riêng, không ghi đè trực tiếp.
