# Architecture và operations

[Beginner](../onboarding/PROJECT_IN_10_MINUTES.md) · [Developer](../onboarding/DEVELOPER_WALKTHROUGH.md) · [Database](../database/README.md) · [GCP handoff](../gcp/SETUP_GUIDE.md)

Theo cấu trúc [arc42](https://github.com/arc42/arc42-template), tài liệu này tập trung vào context, building blocks, runtime, deployment, decisions và quality risks. Không dựng thêm một framework hoặc service để diễn đạt kiến trúc.

## Context và building blocks

Nguồn [intrepid.c4](system-context/intrepid.c4) được [LikeC4](https://github.com/likec4/likec4) kiểm tra và build thành website local. Có năm views: context, containers, backend components, database dependencies và GCP deployment. Model là source-derived target, không phải cloud inventory.

UI → `/api/product` → authorization/business service → Cloud SQL là đường chính. Firebase chứng minh identity; SQL identity bridge giữ UUID/history. API và worker là hai runtime modes của cùng app, không phải microservices theo mỗi bảng. Pool/transactions/roles thuộc [cloudPostgresService](../../apps/promptify-intrepid/src/services/cloudPostgresService.ts); business dispatch thuộc [productionServerService](../../apps/promptify-intrepid/src/services/productionServerService.ts).

Tài liệu liên quan: [runtime flows](runtime-flows/README.md), [security và vận hành](deployment/README.md), [decisions](decisions/README.md), [ownership register](../gcp-database-clean-audit/DATA_OWNERSHIP_AND_INTEGRITY.md).

## Regeneration

Tools chỉ nằm trong ignored `tmp/docs-engineering-tools`, không thêm dependency vào app/root manifests:

```powershell
npm.cmd install --prefix tmp/docs-engineering-tools --no-audit --no-fund likec4@1.59.4 @mermaid-js/mermaid-cli@12.0.0 repomix@1.18.1
tmp/docs-engineering-tools/node_modules/.bin/likec4.cmd validate docs/architecture/system-context
tmp/docs-engineering-tools/node_modules/.bin/likec4.cmd build docs/architecture/system-context -o outputs/intrepid-docs/architecture --base ./ --use-hash-history
python scripts/build_intrepid_docs.py
python -m http.server 8766 --bind 127.0.0.1 --directory outputs/intrepid-docs
```

Docs generator dùng Markdown hiện tại, Mermaid CLI để render SVG, nguồn catalog JSON và ownership annotations. Nó chỉ đọc source và ghi docs/output; không kết nối cloud hoặc dùng AI/provider. Chạy lại sau mỗi migration để kiểm tra schema-derived catalog, rồi thay bằng catalog thực khi đã có staging. Xem [database regeneration](../database/schema-explorer/README.md).

Repomix Explorer skill chính thức đã đọc từ [SKILL.md](https://github.com/yamadashy/repomix/blob/main/skills/repomix-explorer/SKILL.md). Repomix tạo XML local với allowlist Intrepid src/api/SQL, excludes env/keys/secrets; output nằm `outputs/intrepid-repomix.xml`, không upload. Đây là nguồn hỗ trợ inventory, không thay đọc hàm/SQL cụ thể hoặc runtime tests. DeepWiki không dùng vì không cần thêm dịch vụ AI/source upload.
