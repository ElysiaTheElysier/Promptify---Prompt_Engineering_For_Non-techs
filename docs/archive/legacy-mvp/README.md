# Legacy Promptify MVP (đã gỡ ngày 22/10/2026)

Từ ngày 22/10/2026, Promptify Intrepid là ứng dụng duy nhất được hỗ trợ (D39 trong [03_DECISION_LOG](../../03_DECISION_LOG.md)). Thư mục `apps/promptify-mvp` đã bị xóa khỏi working tree.

MVP vẫn còn ở các nơi sau:

- **Git history:** `src/`, `api/`, `test/` ở root tại commit `d7ac9d1` (nhánh `rebuild` / `codex/two-app-isolation`).
- **`design-drafts/pre-separation/`:** bản lưu nguyên văn source trước khi tách app (12/10). Nó trùng byte với các file MVP chưa commit.
- **Backup local đã kiểm chứng:** `C:\Ki_OJT\_backups\promptify-2026-10-22\files\apps\promptify-mvp` (gồm cả các config, test, script riêng của MVP sau khi tách). Xem `BACKUP_README.md` ở đó.

Stack MVP: Supabase Auth và Postgres, Vercel serverless (`api/generate`, `api/evaluate`), Gemini API key (`gemini-2.5-flash`). Khi gỡ, MVP có 30/31 test offline pass (`verify_enrollment_access` fail do ID sinh bằng `Date.now()` bị trùng).

Nội dung trong thư mục này:

- `curriculum/curriculum-levels`, `curriculum/curriculum-specs`: curriculum cũ (22 module, 8 Agribank lab) mà generator seed của MVP dùng. Intrepid dùng bản riêng `apps/promptify-intrepid/curriculum-specs/public-basic.json`.
- `PROMPTIFY_SEQUENCE_FLOWS.md`, `MVP_PARALLEL_BUG_AUDIT_2026-10-10.md`: tài liệu riêng của MVP.

Các script cũ của MVP đã nằm sẵn ở `scripts/historical/pre-separation/`.
