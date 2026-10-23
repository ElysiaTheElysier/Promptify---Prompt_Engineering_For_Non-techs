# Data dictionary và domain views

Dictionary có thể mở tại website local `/database/` sau generation. Mỗi bảng có đầy đủ columns, PK/FK/UNIQUE/CHECK, nullability/default, cardinality khai báo, dependencies, writer/readers/RPC/triggers/lifecycle/privacy. Metadata source-derived không suy đoán số rows, adoption, live ACL hay retention.

| Domain | Vấn đề cần giải quyết | Bảng |
|---|---|---:|
| Identity & Access | Ai là actor và được xem lớp nào? | 8 |
| Curriculum & Studio | Nội dung nền và cấu hình lớp | 6 |
| AI Runs & Evaluation | Generation, snapshot, Judge/retry, drafts/library/sandbox | 6 |
| Learner Progress & Certification | Progress, attendance, support, certificate evidence | 4 |
| Roster & Membership | Classes, enrollments, Sheets/sync/corrections | 8 |
| SOP & Semantic Retrieval | Documents, versions, bindings, contributions, vectors/private context | 6 |
| Workshop & Messaging | Session control, message/receipt, hints/actions | 5 |
| Administration & Audit | Audit, budgets, governance, leads, approvals | 6 |
| Cloud Integration & Projections | Transactional outbox | 1 |

Tổng 50 bảng. Từ source-derived register, purpose/state của vài capability chưa có adoption proof; user yêu cầu feature preservation nên giữ chúng, không diễn đạt “có code” thành business necessity proof. Xem [50-table ownership](../gcp-database-clean-audit/DATA_OWNERSHIP_AND_INTEGRITY.md) và [full dependency evidence](../gcp-database-clean-audit/TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md).

Cardinality được suy từ FK/nullability/unique constraints, không từ mẫu dữ liệu ít hàng. FK độc lập không chứng minh entity tuple hợp lệ; xem [composite integrity](integrity-rules/README.md).
