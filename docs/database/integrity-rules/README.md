# Integrity rules phải giữ

| Invariant | Database/code boundary | Cần negative test |
|---|---|---|
| Studio chỉ lớp chọn | `product_studio` class/lesson config và scoped effective lesson resolver | Hai lớp cùng course, concurrent revision, lesson create/read/snapshot |
| Trainer chỉ scope phân công | Course/class assignments + RLS/helper/API | Direct SQL, RPC, API ngoài lớp/course/client |
| SOP binding tuple đúng | Composite `(class_id,document_id)` và `(document_id,version_id)` FK | Wrong class và wrong version; embedded JSON navigation không ambiguous |
| Evidence Generate = Judge | Frozen actual generation context/hash + immutable rubric snapshot | Context đổi sau retrieval; resources/private context; legacy snapshot fallback |
| Request replay không duplicate | Run request uniqueness + Judge claim ownership | Hai requests cùng ID, provider success/save failure, unknown timeout |
| Completion/certificate đúng thời điểm | Progress/award functions, threshold/provenance | Legacy vs new, attendance, publish state, rounding |
| Private context không lộ | Owner/class/lesson scope + GCS private object policy | Người khác/class khác/requested forged IDs |
| Export không kéo tenant khác | Explicit roots + approved FK closure and manifests | Shared actor/global config parents, orphan/reparent forbidden |
| Projection replay không lùi trạng thái | Entity key normalization, consumer version, tombstone | Reordered events, retry, old quoted keys, DLQ |

Đọc [known issues](../../gcp-database-clean-audit/DATABASE_DESIGN_ISSUES.md) để hiểu root cause và [test tracking](../../evidence/CORRECTNESS_AND_TEST_RESULTS.md) để xem invariant nào đã chạy. Constraints mới không tự sửa rows lịch sử mâu thuẫn; migration phải dừng và xuất reconciliation evidence.
