# Google Cloud setup — Intrepid

Ngày kiểm tra: 2026-10-14. Đây là hướng dẫn **người dùng tự thực hiện**. Agent chỉ đã chạy rendering, kiểm tra và tests local; chưa tạo resource, chỉnh IAM, import dữ liệu hay deploy. Ưu tiên hiện tại là [fast staging và migration gates](../proposals/GCP_DEPLOYMENT_READINESS.md); xem [kết quả kiểm tra](../evidence/CORRECTNESS_AND_TEST_RESULTS.md) và [plan](../evidence/ENGINEERING_PROGRESS.md). Các bước bên dưới phục vụ full environment; không cần chạy toàn bộ để boot Cloud Run staging.

Thực hiện từ `apps/promptify-intrepid`. Bash commands chạy trong Cloud Shell với checkout đúng app, Git Bash hoặc Linux; không paste Bash vào PowerShell. JSON/SQL chứa dữ liệu thật và credentials nằm trong `outputs/` bị ignore, không đưa vào Git/chat. Chỉ gửi output đã loại password, tokens, emails và business records. Attached service account + ADC + impersonation đáp ứng runtime; **không cần service-account JSON key**.

## 0. Chuẩn bị local và chốt variables

Mục đích: tạo review bundle đúng environment, không tự chọn semantics/model mới. Console: chưa thao tác. Prerequisites: Node24, npm, Git Bash/Cloud Shell, gcloud, bq, Firebase CLI, psql18, Auth Proxy2; Java cần cho Firestore emulator. IAM: chưa cần để render. Chi phí: không có cloud/provider calls.

```bash
export TASK_PROJECT_ID='REPLACE_PROJECT_ID'
export TASK_REGION='asia-southeast1'
export TASK_INSTANCE='promptify-staging'
export INTREPID_DATABASE_NAME='promptify_db'
export TASK_GENERATION_MODEL='REPLACE_APPROVED_VERTEX_FLASH_MODEL_ID'
export TASK_VERTEX_LOCATION='global'
export TASK_SECRET_VERSION='1'
export TASK_IMAGE_TAG='review-20261014'
npm ci
node scripts/render_gcp_config.mjs "$TASK_PROJECT_ID" "$TASK_REGION" "$TASK_GENERATION_MODEL" "$TASK_VERTEX_LOCATION" "$TASK_INSTANCE" "$INTREPID_DATABASE_NAME" --secret-version="$TASK_SECRET_VERSION" --image-tag="$TASK_IMAGE_TAG"
node scripts/gcp_preflight.mjs
```

Expected: `outputs/gcp/deployment.json`, schema chain+SHA256 manifest, Cloud Run YAML, Firebase config, CORS, BigQuery DDL/IAM và `manual-actions.json`. Verification: `node scripts/verify_gcp_templates.mjs` và `node scripts/verify_migration_scope.mjs`. Lỗi: invalid variables, migration/hash drift → sửa input/source được review, render lại. Partial recovery: outputs có thể ghi lại; source Firebase config không bị thay. Next artifact: review `deployment.json` và mọi manual action. Các shell templates mặc định `--validate`/`--dry-run` dừng **trước mọi cloud/DB call**; chỉ `--execute` chạy mutations. Thứ tự file số không phải thứ tự setup: xem checklist.

## 1. Project, billing, APIs

- Mục đích/Console: Resource Manager → chọn/tạo project; Billing → link billing account, Budgets & alerts; APIs & Services → Enabled APIs. Chọn staging project riêng khi có thể.
- Variables: project, billing account, owner/budget notification recipients. IAM: project creator nếu tạo mới; Billing Account User; Service Usage Admin để enable API. Không dùng Owner làm runtime role.
- Chi phí: API enable không có phí riêng; Cloud SQL dedicated core tính tiền cả khi app không có request. Budget alert **không giới hạn chi tiêu**. Dùng [Pricing Calculator](https://cloud.google.com/products/calculator) với region/tier/backup/disk/model trước khi tạo.
- Command: `bash outputs/gcp/01-enable-apis.sh --execute` sau khi project/billing được chọn. Template giữ Sheets/Drive/BigQuery/Firestore/Scheduler, không cắt capability.
- Expected/verify: `gcloud projects describe "$TASK_PROJECT_ID"`; `gcloud services list --enabled --project="$TASK_PROJECT_ID"`. Lưu API names + project ID.
- Lỗi/partial: 403 → nhờ project admin grant đúng permission; billing disabled → sửa link billing. Rerun API enable an toàn, không tạo project thay thế âm thầm. Next: resource inventory.

## 2. Inventory rồi mới tạo staging resources

- Mục đích/Console: Cloud SQL → Instances; Artifact Registry → Repositories; Storage → Buckets; Firestore → Databases; IAM → Service Accounts; Secret Manager → Secrets. Tránh trùng và giữ resource đã tồn tại.
- Variables: project/region/instance, bucket names từ deployment.json, Firestore `(default)`. IAM: list/get tương ứng; create permissions chỉ ở bước kế tiếp. Chi phí: inventory không tạo resource, không query dữ liệu nghiệp vụ.
- Verify commands: `gcloud sql instances list --project="$TASK_PROJECT_ID"`; `gcloud artifacts repositories list --location="$TASK_REGION" --project="$TASK_PROJECT_ID"`; `gcloud storage buckets list --project="$TASK_PROJECT_ID"`; `gcloud firestore databases list --project="$TASK_PROJECT_ID"`; `gcloud iam service-accounts list --project="$TASK_PROJECT_ID"`; `gcloud secrets list --project="$TASK_PROJECT_ID"`.
- Expected: output list thành công. **403/permission denied không có nghĩa resource không tồn tại**. Partial: dừng phần create bị thiếu inventory, yêu cầu quyền đọc; không xóa để rerun. Next: ghi reviewed inventory ngoài Git và đánh dấu command create nào phải bỏ qua nếu resource đúng đã có.

## 3. Cloud SQL PostgreSQL18 dedicated core + backup

- Mục đích/Console: Cloud SQL → Create instance → PostgreSQL → Enterprise → dedicated 2vCPU/8GiB, region đã review, zonal staging; Connections dùng Cloud SQL connector; Data protection bật automated backups/PITR/deletion protection. HA production là quyết định chi phí riêng.
- Variables: `TASK_INSTANCE`, `TASK_REGION`, database name. IAM: Cloud SQL Admin cho human setup. Chi phí: compute, SSD, backups/WAL/egress; dedicated core cần cho ML integration, không chọn shared-core micro. [Official integration prerequisites](https://docs.cloud.google.com/sql/docs/postgres/integrate-cloud-sql-with-vertex-ai).
- Command: Cloud SQL command trong `outputs/gcp/02-create-staging.sh` có POSTGRES_18, db-custom-2-8192, ML integration setting+flag, daily backup02:00UTC, PITR. Thực hiện từng create đã review; template không tự xóa/patch resource có sẵn.
- Expected/verify: `gcloud sql instances describe "$TASK_INSTANCE" --project="$TASK_PROJECT_ID" --format=json`; `gcloud sql databases list --instance="$TASK_INSTANCE" --project="$TASK_PROJECT_ID"`. Kiểm tra status RUNNABLE, version, tier, region, settings.databaseFlags, enableGoogleMlIntegration, backupConfiguration.
- Lỗi/partial: quota/unsupported region/maintenance → dừng, lưu operation ID; không đổi PostgreSQL/model tùy tiện. Nếu CREATE đã hoàn tất một phần, describe operation/resource rồi **bỏ qua create đã thành công**. Next: instance connectionName và instance **serviceAccountEmailAddress**, khác API service account.

## 4. Network và Auth Proxy

- Mục đích/Console: SQL instance → Connections. Staging template dùng public IP qua connector/Auth Proxy; không mở authorized network0.0.0.0/0. Nếu organization yêu cầu private IP, phải có VPC route từ Run và máy chạy Proxy, cấu hình riêng được review trước setup.
- Variables: instance connectionName, loopback port5433. IAM: human Cloud SQL Client + login DB password; ADC chỉ ở máy tin cậy. Chi phí: DB vẫn chạy; private VPC/egress nếu chọn có phí tương ứng.
- Commands người dùng: `gcloud auth application-default login`; trong terminal riêng `cloud-sql-proxy --address=127.0.0.1 --port=5433 "$TASK_PROJECT_ID:$TASK_REGION:$TASK_INSTANCE"`. Không bind0.0.0.0. [Proxy documentation](https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy).
- Expected/verify: Proxy reports ready; `pg_isready -h127.0.0.1 -p5433`; source `scripts/configure_target_env.sh` để prompt password kín, `psql -X -c 'SELECT current_database(),current_user,version();'`.
- Lỗi/partial: bind conflict → chọn port tương ứng trong PG*/URL; IAM403 → Cloud SQL Client; password mismatch → sửa human credential. Proxy healthy không chứng minh DB password đúng. Stop process khi hết session; không commit ADC. Next: PG* owner environment chỉ dùng migration, không deploy owner credential.

## 5. Schema chain, PostgreSQL roles, extensions

- Mục đích/Console: SQL → Studio chỉ inspect; migration dùng psql qua Proxy. IAM: human SQL setup, DB owner có CREATE/ALTER/role permissions; runtime không phải migration owner. Chi phí: DB IO/index build; không embedding provider call khi chỉ DDL.
- Variables: reviewed schema SHA manifest, target database, PG* owner. Commands: `node scripts/gcp_preflight.mjs`; sau khi target trống được xác nhận `bash outputs/gcp/06-apply-schema.sh --execute`. Chain tự lấy toàn bộ numbered SQL, gồm004 và các forward fixes; `ON_ERROR_STOP` dừng lỗi. Không sửa applied history.
- Expected: 50 business/target tables vẫn được giữ; forward integrity/ownership fixes; vector và google_ml_integration extensions; promptify_runtime LOGIN NOINHERIT/NOBYPASSRLS. Tại `\password promptify_runtime` nhập runtime password không echo.
- Verify: `node scripts/gcp_preflight.mjs --catalog --execute-readonly`; `psql -X -c "SELECT extname,extversion FROM pg_extension;"`; `psql -X -c "SELECT rolname,rolsuper,rolinherit,rolbypassrls FROM pg_roles WHERE rolname IN ('promptify_runtime','service_role','authenticated');"`.
- Lỗi/partial: extension unavailable/role privilege/FK data invalid → dừng. Chain chứa nhiều transaction và baseline, **không atomic toàn chain**. Không rerun baseline trên DB có tables, không DROP schema; đối chiếu catalog/hash/log, backup rồi chỉ chạy forward bước chưa applied sau review. Next: readonly catalog evidence và runtime secret version. Local extension doubles chưa chứng minh Cloud SQL native extension.

## 6. Service accounts và runtime secrets

- Mục đích/Console: IAM → Service Accounts tạo API, worker, scheduler, workspace, build; Secret Manager tạo `intrepid-db-password`. Variables: năm email từ deployment.json, numeric secret version. IAM: Service Account Admin để create, Secret Manager Admin/secretVersionAdder ở secret; runtime chỉ secretAccessor ở secret cụ thể. Chi phí: secret versions/access, không cấp broad project Secret Manager Admin cho runtime.
- Commands: resource/account creates trong02; thêm secret bằng pipe từ password prompt, **không dùng `echo PASSWORD`**:

```bash
read -r -s -p 'Runtime DB password (same as psql): ' task_runtime_password
printf '\n'
printf '%s' "$task_runtime_password" | gcloud secrets versions add intrepid-db-password --data-file=- --project="$TASK_PROJECT_ID"
unset task_runtime_password
gcloud secrets versions list intrepid-db-password --project="$TASK_PROJECT_ID"
```

- Expected/verify: enabled numeric version được pin trong YAML; không gửi `versions access` output. [Secret configuration](https://docs.cloud.google.com/run/docs/configuring/services/secrets). Lỗi/partial: mismatch → add version mới và render đúng số; đừng overwrite/disable version đang phục vụ traffic. IAM eventual consistency → wait/retry describe. Nếu released legacy `/api/roster-worker` còn có caller, tạo secret riêng `intrepid-roster-worker-secret` và add nguyên HMAC value (ít nhất32bytes) bằng cùng password-prompt pipe; cấp API SA accessor trên secret riêng, pin numeric version. Không dùng DB password làm HMAC. Sau API deploy, user chạy optional07 template. Native Scheduler luôn OIDC, không dùng HMAC secret này. Next: explicit version + SA email mapping, không secret.

## 7. API/worker/build IAM; Cloud SQL SA → Vertex predict

- Mục đích/Console: IAM → Grant access; service-account Permissions; artifact/bucket/secret/dataset IAM. Human: project setIamPolicy + relevant scoped setIamPolicy; deployer cần Service Account User trên build/API/worker và create/update Run/Build permissions.
- Variables: all SAs và SQL instance SA lấy bằng `gcloud sql instances describe ... --format='value(serviceAccountEmailAddress)'`. API dùng Vertex user, FirebaseAuth viewer, CloudSQL client, scoped GCS objectAdmin và self TokenCreator cho signed URLs. Worker dùng CloudSQL client/Firestore user; both có scoped Secret accessor, impersonate workspace và BQ jobUser.
- Commands: reviewed03 template **sau BigQuery DDL bước11**. SQL SA riêng có custom role chỉ `aiplatform.endpoints.predict`; role create đã tồn tại → describe/compare rồi bỏ create, không âm thầm replace permission set. Workspace SA không có JSON key.
- Chi phí: IAM không phí riêng; quyền prediction/query cho phép usage tính tiền. Expected/verify: `gcloud projects get-iam-policy "$TASK_PROJECT_ID"`; scoped secret/bucket/service-account get-iam-policy; `gcloud iam roles describe intrepidSqlPredictor --project="$TASK_PROJECT_ID"`. Không dump secrets.
- Lỗi/partial: 403 thiếu setIamPolicy, restricted public invoker, Workspace sharing không giải quyết bằng projectOwner. Additive bindings rerun được; giữ audit artifact từng resource, không reset whole policy. Next: SQL-native provider probe + runtime deployment.

## 8. Cloud SQL ML flags và model readiness

- Mục đích/Console: SQL instance → Edit → Google ML Integration và Flags; Vertex Model Garden → Flash model + endpoint location. Variables: current **full flags map**, SQL service account, model IDs, region/maintenance version. IAM: SQL Admin để change flags, Vertex predictor quyền đã cấp; human SQL role có function execute.
- Setting/flag đều phải đúng. New create đã khai báo; existing instance phải lưu full describe và review patch **bảo toàn mọi flag khác**, có thể restart. Không chạy patch chỉ với một flag lên instance có flags khác. [Official flags](https://docs.cloud.google.com/sql/docs/postgres/flags).
- Verify readonly catalog như bước5; paid probe riêng, user đồng ý cost: `node scripts/check_cloudsql_connection.mjs --execute` (một SQL→Vertex embedding768). Chi phí: embedding tokens và instance IO; rollback transaction không hoàn lại provider bill.
- Expected: native extension/signature đúng, embedding length768 hữu hạn; authorized retrieval/citations đúng. Lỗi/partial: predict403 → SQL SA, chưa chắc API SA; unsupported maintenance/tier → upgrade có review; location/model404 → verify availability, không đổi model để che lỗi.
- Lifecycle checked14Oct2026: **gemini-3.8-flash còn hợp lệ**, 2.5-flash retires20Oct2026; multilingual-002 retires1Apr2027. Giữ current3.8 và002. Model migration là change set riêng, giữ old vectors/provenance, benchmark và approval trước. Availability/quota thực tế chưa chứng minh. [Official lifecycle](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions). Next: sanitized model/extension probe results và readiness gate.

## 9. Firebase Auth, Web App, Hosting

- Mục đích/Console: Firebase → Add Firebase existing project; Project Settings → Add Web App; Authentication → Sign-in method → Google; Settings → Authorized domains. Billing phải đáp ứng Cloud Run integration; [Firebase Hosting integration](https://firebase.google.com/docs/hosting/cloud-run).
- Variables: public apiKey/authDomain/projectId/appId, approved domains/redirects. IAM: Firebase admin/setup, hosting deploy; API uses attached Firebase admin identity for verified tokens. Chi phí: Hosting bandwidth/storage, auth pricing theo usage; review console plan/calculator.
- Commands: web app creation/auth/domain là Console steps. Sau Cloud Run và tests: configure public `VITE_FIREBASE_*` trên terminal build, `npm run build`; `firebase deploy --project "$TASK_PROJECT_ID" --config outputs/gcp/firebase.json --only hosting,firestore:rules,firestore:indexes` **chỉ human release đã approve**.
- Expected/verify: Google sign-in trả verified Firebase token; business users IDs vẫn source IDs qua identity bindings; UI/API permission tests. `firebase hosting:sites:list --project "$TASK_PROJECT_ID"`; kiểm UI00 login/public/trial; không coi login thành công là authorization pass.
- Lỗi/partial: unauthorized-domain → fix domain allowlist; source user mapping ambiguous → không auto đổi business identity. Hosting rollback riêng với Run revision/DB compatibility; retain previous release. Next: public config (không server secrets) + auth role test results.

## 10. GCS SOP originals

- Mục đích/Console: Storage → bucket → uniform access + public access prevention; CORS; Object retention/versioning nếu doanh nghiệp yêu cầu. Variables: private bucket, allowed Hosting/custom domains. IAM: create/update bucket human; API object access+signBlob; file migration human upload permission. Chi phí: object bytes/operations/egress và retained versions.
- Commands: bucket+Cors02 template; check JSON origins trước run, thêm approved custom domain nếu cần. `gcloud storage buckets describe "gs://$TASK_PROJECT_ID-intrepid-sop-staging" --format=json`. File migration ở runbook, SHA256 verify + ifGenerationMatch0; không public objects.
- Expected/verify: original paths/file metadata/checksums giữ, signed URL expiry, authorized upload/download; anonymous/cross-class access deny. Lỗi/partial: Cors403 → origin/method/headers; signBlob403 → API SA TokenCreator; partial uploads → retry checks existing hash, không overwrite differing object. Next: file manifest and integrity results.

## 11. Firestore và BigQuery retained capabilities

- Mục đích/Console: Firestore → Native `(default)` chosen location; Rules/Indexes; BigQuery → three datasets intrepid_raw/analytics/knowledge ở cùng configured BQ location. Variables: immutable Firestore location, BQ location/project IDs. IAM: DB create/Firestore Rules deploy; BQ dataset creator/data owner/jobUser cho human DDL.
- Commands: Firestore create02; `bq --project_id="$TASK_PROJECT_ID" --location="$TASK_REGION" query --use_legacy_sql=false < outputs/gcp/bigquery.sql`; grant additive dataset DCL03/`bigquery-iam.sql`. Không dùng bq add-iam-policy-binding cho dataset; [BigQuery DCL](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-control-language).
- Chi phí: Firestore notice reads/writes/indexes; BQ storage/query/index/egress. Worker/API BQ_MAX_BYTES budget vẫn cần; source table counts không dự báo cloud bill. Expected: raw entities/version_state/chunks + analytics views, worker writer và API viewer, browser chỉ đọc own invalidation notices.
- Verify: `gcloud firestore databases describe --database='(default)' --project="$TASK_PROJECT_ID"`; `bq show --format=prettyjson "$TASK_PROJECT_ID:intrepid_raw"`; synthetic backfill/replay/tombstone + mode parity tests. Initially warehouse disabled until backfill/parity; **capability không bị bỏ**. Trước full-feature cutover render `--warehouse-enabled=true`, deploy reviewed revision và verify BQ worker/query. Primary analytics remains postgres, retrieval pgvector.
- Lỗi/partial: location immutable → dừng trước data, không xóa/recreate; BQ permission404 may indicate location/IAM; vector index có thể không populated trên small dataset, không coi là guaranteed index use. Next: rules/dataset schema + projection lag/replay evidence.

## 12. Workspace Sheets/Drive

- Mục đích/Console: IAM workspace SA + Google Drive/Sheets → Share approved files to SA email; organization sharing policy/admin nếu cần. Variables: file IDs/scopes/service-account email. IAM: API/worker TokenCreator **trên workspace SA**, Sheet/Drive ACL là quyền khác GCP IAM.
- Commands: IAM03; kiểm file sharing trong Workspace UI; token không cần in ra. Runtime dùng ADC→impersonated workspace SA, current read-only Sheets/Drive scopes. Domain-wide delegation chỉ khi business requirement cần, review riêng; không tạo JSON key mặc định.
- Chi phí: Drive/Sheets quotas; request retry/cron có thể tạo Run/SQL cost. Expected/verify: synthetic approved Sheet import, missing/invalid rows, inactive membership, duplicate email và manual/auto-sync behaviors. Lỗi/partial: file403/404 → share đúng file và organization ACL; không cấp projectOwner để khắc phục. Import transaction/log cần inspect, không chạy lặp nhằm ép membership. Next: approved file ACL scope + roster regression results.

## 13. Cloud Build, Run API và worker

- Mục đích/Console: Artifact Registry → repository; Cloud Build → Build history; Run → Services/revisions/IAM. Variables: public FIREBASE_API_KEY/AUTH_DOMAIN/APP_ID, tag, numeric DB secret. IAM: human Build editor/Run admin + actAs chosen SAs; build AR writer/logWriter/build-source bucket reader; runtime IAM bước7.
- Commands: `bash outputs/gcp/04-build-deploy.sh --execute`. Template builds **app directory only**, deploys both YAML, API public transport checked by Firebase+business auth, worker private Cloud Run invoker + application OIDC audience/email. Worker URL gets described then WORKER_AUDIENCE patched by human script.
- Chi phí: builds, image storage, Run CPU/memory/requests; SQL connection steady ceiling ~15 for 2API×5 +1worker×5, revision overlaps/jobs need headroom. Firebase Hosting timeout60s means raising Run timeout alone cannot solve long user request. [Official Hosting timeout](https://firebase.google.com/docs/hosting/cloud-run).
- Expected/verify: `gcloud run services describe promptify-intrepid-api --region="$TASK_REGION" --project="$TASK_PROJECT_ID"`; same worker; unauth worker denied; `/healthz`200 and `/readyz`200 only establish server/DB reachable. Record image digest and deploy pinned digest for approved release; source tags are mutable and insufficient rollback artifact.
- Lỗi/partial: missing secret version/permission/SQL password → inspect revision logs without request contents; old service may still have traffic. Save old revision, inspect rollout, do not delete services. IAM public access organization restriction → resolve reviewed ingress design, do not weaken business auth. Next: Run URL/revision/digest+runtime readiness results.

## 14. Data migration và compatibility

- Mục đích/Console: SQL → backups/logs, Storage originals; thực thi theo [migration runbook](MIGRATION_RUNBOOK.md). Variables: reviewed Intrepid class/client/course/user scope, freeze/cutover window, source readonly connection, empty target owner connection. IAM: source readonly export; target migration owner; real data privacy approval.
- Chi phí: source IO/export, storage, target insertion/indexes, file transfers; re-embedding chỉ separate approved cost. Expected/verify: counts+PK+FK+row hashes+timestamp precision+identity and file checksums, 100% existing features contracts retained; synthetic rehearsal trước real data.
- Lỗi/partial: unapproved FK/correction class → scope review, không tự kéo tenant; semantic binding conflict → repair workflow có approval, không reparent. No DROP/TRUNCATE/source writes. Target import rollback transactional; chain partial recovery khác data transaction. Next: immutable export/file manifests, reconciliation result, new snapshot backup.

## 15. Scheduler — chỉ sau migration/verification

- Mục đích/Console: Scheduler → Create job → HTTP POST private worker `/internal/projections`, `/internal/roster`; OIDC scheduler SA and audience **worker base URL**, không path. Variables: worker URL, scheduler SA, region/time-zone, explicit cutover checks acknowledgment. IAM: Scheduler admin; human actAs scheduler SA; scheduler SA Run invoker scoped worker; Scheduler service agent retains official serviceAgent role.
- Commands: set `INTREPID_CUTOVER_CHECKS_PASSED=yes` **chỉ sau checklist**, `bash outputs/gcp/05-start-schedulers.sh --execute`. Two minute ticks preserve SQL15-minute roster due/auto_sync guards. [OIDC setup](https://docs.cloud.google.com/scheduler/docs/http-target-auth).
- Chi phí: jobs, Run calls, Firestore/BQ projection, provider depending job. Expected/verify: `gcloud scheduler jobs list --location="$TASK_REGION" --project="$TASK_PROJECT_ID"`; recent logs/claims; duplicate invoke idempotent. Lỗi/partial: 401/403 audience/email/invoker; partial create → describe job then skip existing CREATE, never create duplicates. Pause jobs immediately if error: `gcloud scheduler jobs pause JOB --location="$TASK_REGION" --project="$TASK_PROJECT_ID"`. Next: lag/error/idempotency evidence, then approved cutover.

## 16. Backup/PITR, monitoring, alerts và cutover

- Mục đích/Console: SQL → Backups, clone PITR rehearsal; Monitoring → Alerting/Uptime checks; Logs Explorer; Billing → budgets; Run → revision traffic; Firebase → Hosting releases. Variables: RPO/RTO, UTC restore timestamp, backup ID, previous image/secret/schema manifest, alert recipients, approved limits.
- IAM: backup/clone SQL permissions human; Monitoring editor/Log viewer; human approved release. Chi phí: extra restore instance/retained backups, Logging retention, alert/query usage. Commands: `gcloud sql backups create --instance="$TASK_INSTANCE" --project="$TASK_PROJECT_ID"`; `gcloud sql backups list --instance="$TASK_INSTANCE" --project="$TASK_PROJECT_ID"`. Rehearsal `gcloud sql instances clone "$TASK_INSTANCE" REVIEWED_RESTORE_INSTANCE --point-in-time='APPROVED_UTC_TIMESTAMP' --project="$TASK_PROJECT_ID"`.
- Expected/verify: backup SUCCESSFUL, restore **new instance** reconciled + auth/roles/extensions checks; [PITR semantics](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/pitr). Monitor5xx/latency/SQL connections/CPU/disk/deadlocks/outbox oldest age/roster errors/provider429/BQ bytes; create thresholds based on observed staging baseline, do not invent SLO proof. Verify synthetic signal reaches notification recipient.
- Lỗi/partial: never restore over active instance blindly. Failed parity → keep old traffic; after target writes begin, rollback requires delta preservation/reconciliation, not just old UI alias. Cutover and reverse reconciliation require human approval; see runbook. Next: signed release/rollback decision, only then mark CLOUD VALIDATED or READY FOR APPROVAL according to actual evidence.

## Tái kiểm tra trước deployment

Mọi cloud command ở đây là prepared handoff, chưa được agent thực thi. Các `--execute` paths có thể ghi target resources/dữ liệu và phát sinh phí. Validate mode không test credential/region/model quota. User gửi safe outputs theo checklist; sau đó mới có thể kiểm chứng staging. Không gắn nhãn READY FOR PRODUCTION từ template/build PASS.
