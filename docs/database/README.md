# Database Intrepid

[Database explained](DATABASE_EXPLAINED.md) · [Data dictionary](DATA_DICTIONARY.md) · [Explorer và regeneration](schema-explorer/README.md) · [Integrity rules](integrity-rules/README.md) · [Onboarding](../onboarding/README.md)

50 bảng target được giữ nguyên. Không gộp lifecycle/security boundary để làm ERD ít bảng hơn. Native catalog của môi trường synthetic local, source-derived target và live Cloud SQL là ba loại evidence khác nhau; explorer luôn hiển thị provenance. Bản nguồn audit 13/10 chứa 50 bảng/102 FK trước fixes. Composite binding migration mới thêm 2 FK nhưng không thêm bảng. Live source/target count chưa xác minh.

Website local có trang từng bảng, columns/constraints/cardinality, writer/readers/RPC/triggers, lifecycle/privacy, ví dụ synthetic và lý do tách bảng. Domain views giúp đọc từng cụm; full ERD dành cho tra cứu. Nguồn được sinh lại bằng [generator](../../scripts/build_intrepid_docs.py); SchemaSpy native HTML là catalog introspection vào DB isolated, tbls là inventory/ERD/lint.

Ownership chi tiết đã tồn tại tại [register](../gcp-database-clean-audit/DATA_OWNERSHIP_AND_INTEGRITY.md); function/trigger/policy evidence tại [dependency register](../gcp-database-clean-audit/TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md). Navigation này dùng lại evidence, không sao chép báo cáo audit. Semantics đã đổi theo user approval được ghi rõ tại [architecture decisions](../architecture/decisions/README.md).
