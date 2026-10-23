# GCP IAM and Cloud SQL setup review checklist

**Ngày:** 2026-10-13. Inventory/proposal only; no binding/patch/CREATE executed. Published requirements/source declarations **VERIFIED STATIC**; actual IAM/settings **NOT VERIFIED**. Every resource/identity/flag/extension change **REQUIRES APPROVAL** from project owner.

## Bốn lớp danh tính

| Identity | Vai trò | Không được nhầm |
|---|---|---|
| Developer/reviewer | Read project/instance/config; reviewed build/deploy/schema role riêng khi authorized | Active gcloud identity không automatically có project rights; don't reuse owner DB credentials for application |
| Cloud Run API/worker SAs | Connect Cloud SQL transport, verified Firebase/server operations, AI HTTP calls, private Storage/Firestore/BQ theo capability | IAM cloudsql.client không GRANT SELECT/EXECUTE hoặc choose PG business role |
| Cloud SQL instance SA | SQL extension gọi Vertex endpoint/model | Khác promptify-api/worker SA; instance serviceAccountEmailAddress phải lấy actual describe |
| PostgreSQL roles | Login/membership/SET options, table/function ACL/RLS/definer ownership | Khác Google IAM principal; custom service_role name không mang managed Supabase BYPASS semantics |

## Cloud evidence blocked hiện tại

Read-only `gcloud sql instances list --project=ai-transformation-510302` bị client-not-authorized. Không coi error + empty JSON là proof project/instance absent. Chưa có approved staging DB endpoint/credentials/actor tokens. Request owner cung cấp read-only instance/config/catalog evidence hoặc narrowly scoped reader access; **không cần cấp project Owner cho audit**.

Potential reader permissions review: Cloud SQL instance get/list, necessary project/API/IAM-read visibility; role/custom role selection theo org policy, không automatic binding. No credential values/account token printed into reports. Local SDK cache access needed for read command was granted separately; no cloud policy/resource mutation occurred.

## Read-only evidence checklist

- [ ] Confirm approved project ID, instance connection name, edition/tier/region/PG version/maintenance; no same-named wrong project.
- [ ] Inventory SQL Admin/Vertex/Compute APIs enabled and organization restrictions; include allowed model locations/data residency.
- [ ] Instance `enableGoogleMlIntegration` AND flag `cloudsql.enable_google_ml_integration` actual values; record complete flags map.
- [ ] Inventory instance serviceAccountEmailAddress, current endpoint-project predict bindings, custom role permissions, inheritance/conditions.
- [ ] Runtime API/worker/build/scheduler/workspace accounts actual identities, distinct privileges and impersonation/signing targets.
- [ ] Cloud SQL connectivity/socket/private network/proxy path, connection budget, SQL login auth method, separate migration owner and runtime role.
- [ ] `pg_extension`/`pg_available_extensions` actual versions/schema: vector, google_ml_integration; optional test extensions only on approved staging.
- [ ] Roles/owners/memberships SET/INHERIT/ACLs/RLS enable/force/functions EXECUTE/search_path, including normal app NOBYPASSRLS/nonowner.
- [ ] Backup/PITR/HA/deletion protection/restore evidence, not settings checkbox alone.
- [ ] Storage bucket scope/CORS/object generation/signBlob identity; Workspace file ACLs separate from Cloud IAM.
- [ ] Firestore deployed own-UID rules + worker access; BQ dataset read/editor + jobUser only where capability needs.

## ML setup proposal — least privilege

Official integration distinguishes instance and flag enablement and recommends a custom role with **aiplatform.endpoints.predict** for SQL instance SA in endpoint project. PG12+, dedicated cores and sufficient maintenance are prereqs; settings may need restart. [Cloud SQL ML integration](https://docs.cloud.google.com/sql/docs/postgres/integrate-cloud-sql-with-vertex-ai).

Current 02/03 templates already declare dedicated-core instance, both enablement mechanisms and SQL-instance predictor custom role. **VERIFIED STATIC**, not actual grant. Existing create-role command is not idempotent setup for a project that already has role/instance; inspect/diff first. Avoid broad roles/aiplatform.user for SQL instance if reviewed minimal predictor rights suffice. Run API uses broader aiplatform.user declaration for direct generation; evaluate exact API permissions and org conditions separately, không apply SQL predictor role to API and assume equivalent capability.

## Flag/config diff review form

| Field | Before actual | Proposed after | Risk / owner |
|---|---|---|---|
| enableGoogleMlIntegration | NOT VERIFIED | Existing approved target setting; change only if needed | maintenance/network/service behavior owner |
| complete databaseFlags map | NOT VERIFIED | Merge proposed key change into entire preserved map | no omitted flags; evaluate restart/connection loss |
| tier/version/maintenance | NOT VERIFIED | Do not change based on stale micro handbook | cost/downtime/backup approval |
| installed extension/version/schema | NOT VERIFIED | Same approved support contract | extension dependency/privileges; staging first |
| model/endpoint/region | Approval NOT VERIFIED | No default replacement selected | residency, lifecycle, quality, rate/cost |

Không chạy `gcloud sql instances patch --database-flags=...` trong audit. Reviewer must compare complete before/after settings, review backup/config rollback and restart window; flags docs không thay actual instance state. [Database flags](https://docs.cloud.google.com/sql/docs/postgres/flags), [patch reference](https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch).

## Capability-specific IAM parity

| Capability | Required boundary | Source/gap |
|---|---|---|
| API SQL | cloudsql.client transport + secret-specific accessor if password login; PostgreSQL runtime ACL separate | Current template declared; actual NOT VERIFIED |
| SQL embedding | SQL instance SA predict permissions to actual model/endpoint project; integration flags/extension/runtime EXECUTE | Custom predictor template declared; actual NOT VERIFIED |
| API generation | Run SA allowed approved Vertex model/provider; no secret in browser | Existing API aiplatform.user broad role, least-privilege review pending |
| Worker | Private invoke OIDC audience/SA; correct SQL job/claim rights; Firestore consumer rights | Source declared; queue/rollback/consumer tests needed |
| BQ analytics/vector | API dataset viewer + job creation; worker scoped dataset editor + jobs; configured location/bytes | Current IAM script deliberately omits BQ grants while disabled; requested capability activation needs reviewed diff, not deletion |
| Sheets/Drive | Workspace SA impersonation, approved token scopes, file share/read permissions | Cloud IAM cannot grant file access; no key download default |
| GCS signed URLs | Scope-specific object rights and approved signBlob identity; generation=0 writes, private read after app permission | Current objectAdmin/self-tokenCreator template is broad; assess narrower exact functions without breaking upload/download |
| Firebase | Admin token verification/revocation-check rights, verified Google identity, business roster binding | auth.viewer source; actual account/token tests missing |
| Build/deploy | Separate build artifact/log/source access and deployer actAs/invoker permission | No developer owner-role shortcut or runtime project-admin privileges |

After approval: record resource/config diff, actor/owner, change ticket, expected restart/latency/cost, rollback/policy snapshots and test results. No rollout here. An IAM-permitted SQL model call can still fail PostgreSQL EXECUTE/model/extension/region contract; test all four identity layers independently.
