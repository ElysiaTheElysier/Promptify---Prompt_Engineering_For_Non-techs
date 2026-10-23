# Intrepid database audit — 2026-10-13

Audit tĩnh, chỉ đọc source; chưa có live DB verification. Không sửa schema/runtime hoặc chạy migration.

- [DB_AUDIT_REPORT.md](DB_AUDIT_REPORT.md): findings, severity, evidence và hạn chế.
- [TABLE_INVENTORY.md](TABLE_INVENTORY.md): toàn bộ 50 bảng PostgreSQL target, dependencies và phân loại; kho GCP phụ ở cuối.
- [SCHEMA_SIMPLIFICATION_PLAN.md](SCHEMA_SIMPLIFICATION_PLAN.md): kiến trúc, impact, preservation, compatibility, acceptance và rollback.
- [ERD_CURRENT.md](ERD_CURRENT.md): 50 bảng / 102 physical FK source-derived.
- [ERD_PROPOSED.md](ERD_PROPOSED.md): 47 bảng **có điều kiện**; phase cutover vẫn giữ 50.
- [AUDIT_EVIDENCE.json](AUDIT_EVIDENCE.json): coverage/hashes, table references và static index candidates.
- [tbls.audit.yml](tbls.audit.yml): proposed catalog lint config; chưa chạy, không credentials.
- [VALIDATION_RESULTS.md](VALIDATION_RESULTS.md): kết quả kiểm tra artifacts và danh sách chưa xác minh.

Standalone Mermaid sources: [current](ERD_CURRENT.mmd), [proposed](ERD_PROPOSED.mmd). Full ERD lược bỏ non-key columns cho dễ đọc; dictionary/catalog baseline và migration patches là nguồn chi tiết.
