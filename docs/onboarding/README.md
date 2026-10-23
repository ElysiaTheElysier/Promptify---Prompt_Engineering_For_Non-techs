# Bắt đầu với Promptify Intrepid

Đọc theo thứ tự: [10 phút](PROJECT_IN_10_MINUTES.md) → [walkthrough developer](DEVELOPER_WALKTHROUGH.md) → [architecture](../architecture/README.md) → [database](../database/README.md). [Từ điển](BUSINESS_GLOSSARY.md) giải thích thuật ngữ bằng ví dụ.

Tài liệu ngày 14/10/2026 mô tả source và target GCP. Diagram không chứng minh cloud đã triển khai. Hai quyết định nghiệp vụ đã được chủ sản phẩm xác nhận: Studio chỉ sửa lớp đang chọn; Trainer chỉ đọc progress trong scope được phân công. Xem migration/test mới trước khi kết luận môi trường đang chạy đã nhận hai thay đổi đó.

Website local được sinh từ chính Markdown và catalog, không sao chép tài liệu thủ công. Chạy `python scripts/build_intrepid_docs.py`, rồi `python -m http.server 8766 --bind 127.0.0.1 --directory outputs/intrepid-docs`. Mở `http://127.0.0.1:8766/`. Tool setup và regeneration ở [architecture](../architecture/README.md).

Theo dõi việc triển khai tại [engineering progress](../evidence/ENGINEERING_PROGRESS.md), [correctness](../evidence/CORRECTNESS_AND_TEST_RESULTS.md), [GCP readiness](../proposals/GCP_DEPLOYMENT_READINESS.md). Các audit cũ là bằng chứng theo thời điểm; không thay cho trạng thái engineering hiện tại.
