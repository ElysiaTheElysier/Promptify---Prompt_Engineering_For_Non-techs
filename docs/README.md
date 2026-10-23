# Tài liệu Promptify Intrepid

Cập nhật 23/10/2026. Repository chỉ còn **một ứng dụng được hỗ trợ**: `apps/promptify-intrepid`. MVP cũ đã bị gỡ ngày 22/10/2026 (xem [archive/legacy-mvp](archive/legacy-mvp/README.md)).

## Thứ tự đọc

1. [00_PRODUCT_SOURCE_OF_TRUTH.md](00_PRODUCT_SOURCE_OF_TRUTH.md): phạm vi sản phẩm và người dùng.
2. [01_CURRENT_STATE.md](01_CURRENT_STATE.md): những gì đang chạy thật trên staging, đã được kiểm chứng tới đâu.
3. [ARCHITECTURE.md](ARCHITECTURE.md): file chính theo dõi kiến trúc; có sơ đồ tổng thể, flow Run/Judge, module/quyền/dữ liệu, ma trận CODE/OFFLINE/LIVE lịch sử, nhật ký thay đổi và quy tắc cập nhật.
4. [03_DECISION_LOG.md](03_DECISION_LOG.md): các quyết định và nguồn của chúng.
5. [04_OPERATIONS.md](04_OPERATIONS.md): chạy, kiểm tra, deploy/rollback staging, migration.
6. [05_OPEN_ISSUES.md](05_OPEN_ISSUES.md): blocker, câu hỏi cho chủ sản phẩm, việc dọn dẹp còn lại.
7. [DEMO_SCRIPT.md](DEMO_SCRIPT.md): kịch bản demo Admin → Trainer → Head → Learner.
8. Handoff mới nhất: [Judge demo → Claude, 23/10](handoffs/HANDOFF_JUDGE_DEMO_CLAUDE_2026-10-23.md).
9. [Audit hệ thống và roadmap 23/10](audits/REMEDIATION_ROADMAP.md): tổng hợp bằng chứng, production gates và thứ tự khắc phục; [handoff audit](audits/AUDIT_HANDOFF.md) lưu phạm vi kiểm tra và blockers.

[02_IMPLEMENTATION_PLAN.md](02_IMPLEMENTATION_PLAN.md) là kế hoạch pilot lập ngày 06/10, nay đã thành lịch sử. File được giữ đúng đường dẫn cũ vì `scripts/progress-tracker` đọc nó.

## Thư mục

| Thư mục | Nội dung |
| --- | --- |
| `handoffs/` | Handoff phiên làm việc. Bản mới nhất là bản có ngày gần nhất |
| `evidence/` | Báo cáo kiểm thử/release có ngày. Đây là bằng chứng tại một thời điểm, không phải trạng thái hiện tại |
| `proposals/` | Kế hoạch, đề xuất, câu hỏi chưa chốt |
| `audits/` | Bộ audit hệ thống 23/10: inventory, chức năng, kiến trúc, hiệu năng, issue register, roadmap và handoff. Không thay thế file kiến trúc canonical |
| `meetings/` | Biên bản, transcript và kế hoạch rút ra từ các buổi họp |
| `reference/` | Tài liệu thiết kế UI, file Word review, bảng tiến độ |
| `architecture/`, `database/`, `intrepid-google-cloud/`, `gcp/`, `onboarding/` | Tài liệu tham khảo chi tiết theo chủ đề (từ 13–14/10). Khi mâu thuẫn với các file canonical ở trên, file canonical thắng |
| `database-audit-intrepid/`, `gcp-database-clean-audit/`, `repository-audit/`, `separation/` | Bộ audit lịch sử. Giữ nguyên đường dẫn vì có tool tham chiếu tới |
| `archive/` | Tài liệu đã bị thay thế: `pre-gcp/` (thời Vercel/Supabase, 08–13/10), `legacy-mvp/` (MVP và curriculum cũ), `repository/` (tài liệu thời 2 app), `handoffs/`, `as-is-audit/`… |

## File giữ ở vị trí cũ (do script tham chiếu đường dẫn)

Các file sau vẫn nằm ở gốc `docs/`, vì script trong `apps/promptify-intrepid/scripts` (packager evidence, review staging) hoặc template `gcp/*.sh` đọc chúng theo đúng đường dẫn này. Đừng di chuyển nếu chưa sửa các script đó:

- `HANDOFF_STAGING_LIFECYCLE_RESUME_2026-10-21.md`, `HANDOFF_STAGING_LIFECYCLE_ORIGINALS_2026-10-21.md`, `HANDOFF_UI_STAGING_2026-10-20.md`
- `STAGING_LIFECYCLE_LEARNER_ACCEPTANCE_2026-10-21.md`, `STAGING_ROSTER_AND_DRIVE_FIX_REVIEW_2026-10-21.md`, `STAGING_SYNTHETIC_INTEGRATION_REVIEW_2026-10-20.md`, `STAGING_SYNTHETIC_WORKSPACE_2026-10-21.md`, `STAGING_CHANGE_REVIEW_2026-10-17.md`
- `Promptify - UI code - for Review.docx` (đọc bởi `scripts/extract_review_ui.py`), `UI Mockup-20261006T140854Z-1-001/`, `gcp/SETUP_GUIDE.md`, `intrepid-google-cloud/`, `gcp-database-clean-audit/`

Lịch sử di chuyển tài liệu nằm ở [archive/MOVE_MANIFEST.json](archive/MOVE_MANIFEST.json).

## Quy ước mức bằng chứng

**CODE** = có source; **OFFLINE** = có test offline; **LIVE** = đã chạy trên staging và có evidence trong `apps/promptify-intrepid/outputs/` (thư mục này bị ignore, chỉ có ở local); **[?]** = chưa có bằng chứng. Code tồn tại không có nghĩa là tính năng chạy được.
