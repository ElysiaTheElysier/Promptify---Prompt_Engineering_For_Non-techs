# Cloud SQL compatibility matrix

**Ngày:** 2026-10-13. VERIFIED STATIC là declared implementation/documentation; actual installed/live values đều NOT VERIFIED nếu không có evidence khác. Mọi setup/DDL/IAM/flag change là REQUIRES APPROVAL.

## Runtime/platform

| Item | Repository evidence | Official requirement / compatibility assessment | Status / gate |
|---|---|---|---|
| Project | START_HERE ghi ai-transformation-510302; templates dùng placeholder renderer | Read-only gcloud list bị IAM deny; không kết luận project không tồn tại hoặc zero SQL instances | VERIFIED STATIC ID declaration; live NOT VERIFIED |
| Instance/region | SQL_INSTANCE placeholder; default asia-southeast1 trong renderer hướng dẫn | Approved region/residency, instance name và model availability phải lấy actual config | NOT VERIFIED; REQUIRES APPROVAL |
| PG version/tier | Create template POSTGRES_18, Enterprise, db-custom-2-8192, zonal | Current template dedicated-core phù hợp prerequisite; handbook db-f1-micro khác template và không hợp ML integration | VERIFIED STATIC drift; installed tier/version NOT VERIFIED |
| ML instance setting | Create template --enable-google-ml-integration | Instance setting enableGoogleMlIntegration và database flag phải cùng inventory | VERIFIED STATIC declaration; live NOT VERIFIED |
| ML flag | Create template cloudsql.enable_google_ml_integration=on | Không overwrite other flags; compare full current flag array/restart requirement trước patch | NOT VERIFIED config; change REQUIRES APPROVAL |
| vector extension | 004 CREATE vector; generated vector(768); HNSW cosine | Published Cloud SQL support vector 0.8.5 cho PG13+; verify pg_available_extensions/pg_extension actual | VERIFIED STATIC docs/source; installed NOT VERIFIED |
| google_ml_integration | 004 creates public extension; calls public.embedding | Published support PG12+ version 1.4.3; actual signature/schema/permissions must inventory | VERIFIED STATIC docs; installed NOT VERIFIED |
| plpgsql_check | Chưa target DDL install | Published Cloud SQL support PG14+, version 2.8; Tracer unsupported. Use function checks only if staging approved | NOT VERIFIED installed; REQUIRES APPROVAL |
| pgTAP | Chưa target DDL install | Published support 1.3.0; upstream docs may be newer, use deployed signatures | NOT VERIFIED installed; staging install REQUIRES APPROVAL |
| DB name | Templates/configure_target_env use promptify_db; handbook dùng promptify_intrepid | Choose one approved target name in manifest, deployment env và operator guide; don't rename existing DB here | VERIFIED STATIC mismatch |
| Schema order | 06-apply-schema applies 001–005; START_HERE commands omit 004 | 004 wrappers/vector needed by current pgvector mode. Need reviewed handoff order; no ad-hoc replay on nonempty target | VERIFIED STATIC compatibility blocker |
| Firebase binding | Admin verified Google token; issuer/UID map to UUIDs | Opaque UID stays text; legacy subject remains UUID. Need actual issuer/audience/provider/domain/identity mapping tests | VERIFIED STATIC; live NOT VERIFIED |
| PostgreSQL RLS | Source policies + GCP backend policies, explicit login role | Generic PostgreSQL RLS applies; role names/auth shims are app compatibility, not managed Supabase runtime semantics | VERIFIED STATIC design; ACL/owner/enable flags NOT VERIFIED |
| Runtime role | promptify_runtime LOGIN NOINHERIT/NOBYPASSRLS, member authenticated/service_role | Not owner/superuser normal queries; SET membership/options and definer owners need actual checks. Narrow trusted path without changing allowed behavior | VERIFIED STATIC; staging NOT VERIFIED |
| Pool | pg max=5; SET LOCAL role/claims; tx commit/rollback/release | Preserve transaction-local context, actual pool >1 concurrency tests; no new pooler required by default | VERIFIED STATIC implementation; isolation NOT VERIFIED |
| Cloud Run connection | Attached Cloud SQL socket, password secret, runtime SQL user | Cloud SQL Client IAM/connection transport khác SQL privileges; verify network/socket/db credential and SA independently | NOT VERIFIED deployed |
| SQL→Vertex | embedThroughSql uses intrepid_embed_text; extension RPC public.embedding | Database instance SA calls Vertex; not Cloud Run ADC identity for this operation | VERIFIED STATIC source; actual invocation NOT VERIFIED |
| Firestore | own UID notices, no client writes; worker datastore role declaration | Preserve invalidation/revocation/lag contracts; broad trigger graph retained until parity optimization proven | VERIFIED STATIC; deployed rules/consumer NOT VERIFIED |
| BigQuery | schema/3 tables/3 views + SDK/vector functions exist; flag false/template IAM omits BQ roles | Preserve requested capability; activation needs dataset/job rights + query/replay parity; disabled initial mode not feature removal | VERIFIED STATIC gap; activation REQUIRES APPROVAL |
| GCS | Signed v4 size/generation guards, private buckets | Preserve authorized original paths/checksums; IAM signing and object ACL/dataset scope must verify | NOT VERIFIED deployed |
| Sheets/Drive | Workspace impersonation; files shared to workspace SA | GCP IAM alone không file permission; distinguish Workspace identity and file ACLs | VERIFIED STATIC wiring; live NOT VERIFIED |
| Backup/PITR | Template deletion protection; no proven restore | Need actual backup/PITR/HA policy/restore drill; do not infer from create settings | NOT VERIFIED |

Published extension versions are documentation, **not installed versions**. Source: [Cloud SQL extensions](https://docs.cloud.google.com/sql/docs/postgres/extensions). ML prereq/version/dedicated-core/maintenance and setting separation: [integration](https://docs.cloud.google.com/sql/docs/postgres/integrate-cloud-sql-with-vertex-ai). Managed network/Run identity reference: [connect Run](https://docs.cloud.google.com/sql/docs/postgres/connect-run).

## Tool compatibility/execution

| Tool | Used here | Staging-only prerequisite / caveat | Status |
|---|---|---|---|
| tbls 1.96.1 | Native source-derived JSON → docs/ERD + lint 37 findings | Live datasource role read-only + catalog visibility; tbls markdown diff not complete ACL/function-body drift proof | VERIFIED STATIC; live diff NOT VERIFIED |
| Squawk 2.68.0 | 62 explicit SQL files, PG18 parser mode; 296 warnings | Does not execute SQL or validate PL/pgSQL semantics/actual locks; classify fresh-create vs online ALTER | VERIFIED STATIC |
| pglast | Parse draft SQL blocks/proposals, no DB | Version differences/query/function binding runtime unresolved | VERIFIED STATIC syntax only |
| pgTAP | SQL templates produced; not executed | Approved staging extension/version; fixtures and real non-owner roles; pg_prove or TAP runner | NOT VERIFIED execution |
| plpgsql_check | Function/trigger-context checking queries produced | Actual extension/schema/signatures; dynamic SQL/TG_ARGV/external calls need behavior tests beyond linter | NOT VERIFIED execution |
| PGlite/mock existing tests | Read as historical coverage | Cannot certify Cloud SQL roles/extensions/IAM/model/pool/BQ; not rerun as a migration substitute | NOT VERIFIED new runtime/staging |

## Read-only inventory package cần thu thập

Không chỉ dump public tables: `pg_extension`/`pg_available_extensions`, `pg_proc` signatures/language/owner/proconfig/ACL, roles membership SET/INHERIT options, table/column grants, relrowsecurity/relforcerowsecurity, constraints/index definitions/validity, triggers/enabled state, sequence values, applied migration ledger, normalized stats. Scope excludes raw prompts/keys/PII rows. GCP instance JSON cần settings.tier/version/maintenanceVersion/enableGoogleMlIntegration/databaseFlags, serviceAccountEmailAddress, backup/PITR, networking; API/IAM inventory ở owner-approved read scope.

Flags đề xuất phải có **before full map → after full map → changed keys → restart/connection/rollback impact**. Không đưa runnable “patch chỉ một ML flag” vào audit; [flags](https://docs.cloud.google.com/sql/docs/postgres/flags) và [gcloud patch](https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch) là reference, không lệnh được chạy.
