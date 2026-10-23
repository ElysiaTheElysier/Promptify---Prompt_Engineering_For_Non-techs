# Audit artifact validation — 2026-10-13

Đây là kiểm tra tài liệu/evidence tĩnh, không phải kiểm thử runtime hoặc migration acceptance.

| Check | Result |
|---|---|
| File coverage / SHA-256 | 325 file entries; hashes vẫn khớp khi kết thúc audit |
| PostgreSQL parse-only | 62 SQL files parse thành công; không SQL nào được execute |
| Inventory | 50 sections: 44 KEEP, 1 MERGE CANDIDATE, 2 DEPRECATE CANDIDATE, 3 NEEDS INVESTIGATION |
| Current ERD | 50 entities, 102 physical FK edges; không dangling entity |
| Proposed conditional ERD | 47 entities, 98 physical FK edges; không dangling entity |
| Local Markdown links | Tất cả targets tồn tại |
| GCP baseline vs schema candidate | Byte-identical tại thời điểm audit |
| Chunk outbox key static reproduction | JSON row `position=1` được lookup bằng key chứa dấu nháy `"position"`, kết quả null; lỗi source contract được xác nhận tĩnh |
| FK index candidate scan | 56 FK chưa có full non-partial left-prefix index; chưa đo performance và không tự tạo index |

Không chạy: live catalog/rows/stats, tbls, EXPLAIN, Cloud SQL roles/extensions, IAM/Vertex, Firebase/Firestore/BigQuery, application tests, migration/import/backfill/deploy hoặc rollback drill. Entity Boundaries URL được chỉ định không truy xuất được; report ghi limitation, không giả nhận đã đọc skill.

Helper dùng trong phiên audit: `tmp/audit_intrepid_schema.py` (ignored, chỉ đọc source và tạo report/evidence; không connect DB). Evidence và ERD được giữ trong thư mục này; code/runtime và source migration history không bị sửa.
