# Decisions và giữ contract

| Decision | Lý do | Hệ quả cần kiểm thử |
|---|---|---|
| Studio edits chỉ lớp đang chọn | Chủ sản phẩm xác nhận 14/10/2026 | Hai lớp cùng course không đổi chéo; đọc lesson/Generate/award/projection phải áp dụng override cùng cách |
| Trainer chỉ progress scope phân công | Chủ sản phẩm xác nhận 14/10/2026 | Direct SQL RLS, RPC và API negative tests ngoài lớp/course |
| Giữ UI00–15 và 50 bảng | User yêu cầu feature preservation | Không áp dụng feature-cut proposal B/C từ audit cũ |
| Cloud SQL writable authority | Transactions/integrity/history nhất quán | Firestore/BQ là projections, replay phải giữ version/tombstone |
| Hai app độc lập | Repo ownership đã tách | Không shared internal modules hoặc import chéo MVP/Intrepid |
| Không đổi model trong correctness refactor | Model space/output contract khác migration schema | Model availability và re-embedding có change set riêng |
| Source-derived explorer khi chưa cloud catalog | Không có staging đã xác minh | Không diễn đạt source schema là DB live; refresh native catalog sau setup |

Không coi số bảng hoặc code usage là bằng chứng feature bắt buộc; ở change set hiện tại user đã yêu cầu giữ toàn bộ feature, nên giữ contract và sửa defects có chứng cứ. [Audit trước](../../gcp-database-clean-audit/GCP_DATABASE_ARCHITECTURE_AUDIT.md) giúp tìm evidence, [tracking correctness](../../evidence/CORRECTNESS_AND_TEST_RESULTS.md) ghi kết quả hiện tại.
