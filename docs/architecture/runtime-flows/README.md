# Mười luồng nghiệp vụ và runtime

Các diagram dưới đây là source-derived. `build_intrepid_docs.py` render bằng Mermaid CLI local; không dùng CDN. Studio class-local và Trainer scope là quyết định user đã phê duyệt, xem migration mới để đối chiếu bản thực thi. Provider/GCP edges cần staging, chưa đồng nghĩa VERIFIED STAGING.

## 1. Login → identity → permissions

```mermaid
sequenceDiagram
 actor U as Người dùng
 participant UI as React
 participant FB as Firebase Auth
 participant API as API
 participant DB as Cloud SQL
 U->>UI: Đăng nhập Google
 UI->>FB: Login
 FB-->>UI: ID token
 UI->>API: Bearer token + action
 API->>FB: Verify token và revocation
 API->>DB: Resolve issuer/UID → business UUID
 DB-->>API: Actor + legacy subject
 API->>DB: Scoped role + class/course permissions
 DB-->>API: Allow hoặc deny
 API-->>UI: Scoped result / 401 / 403
```

[firebaseServerIdentityService](../../../apps/promptify-intrepid/src/services/firebaseServerIdentityService.ts), [apiAuthorizationService](../../../apps/promptify-intrepid/src/services/apiAuthorizationService.ts), [cloudPostgresService](../../../apps/promptify-intrepid/src/services/cloudPostgresService.ts). Firebase UID không tự tạo quyền lớp; email roster mơ hồ phải chặn.

## 2. Learner Generate

```mermaid
sequenceDiagram
 participant UI as Learner UI
 participant S as Saved run service
 participant DB as Cloud SQL
 participant V as Vertex AI
 UI->>S: Prompt + request ID + class/lesson
 S->>DB: Check access, published lesson, class Studio
 S->>DB: Read admitted SOP + own private context
 S->>DB: rebuild_begin_run (quota/idempotency)
 alt Completed request
  DB-->>S: Saved result
 else New request
  S->>DB: Retrieval + freeze actual context/provenance
  S->>V: Generate(prompt, actual inputContext)
  V-->>S: Output
  S->>DB: rebuild_finish_run
 end
 S-->>UI: Output + saved attempt / safe error
```

[rebuildRunService](../../../apps/promptify-intrepid/src/services/rebuildRunService.ts), [cloudSopRetrievalService](../../../apps/promptify-intrepid/src/services/cloudSopRetrievalService.ts), [productionAiService](../../../apps/promptify-intrepid/src/services/productionAiService.ts). N01 yêu cầu lưu context thực đã gửi provider và Judge dùng cùng evidence; không coi retrieval metadata là proof Generate đã dùng nội dung đó.

## 3. Judge → progress → certificate

```mermaid
sequenceDiagram
 participant UI as Learner UI
 participant S as Saved Judge
 participant DB as Cloud SQL
 participant V as Vertex AI
 UI->>S: Owned attempt ID
 S->>DB: Scope + attempt + frozen run snapshot
 S->>DB: rebuild_claim_judge
 alt Evaluation exists
  DB-->>S: Replay
 else Claim acquired
  S->>V: Prompt/output/rubric/actual evidence
  V-->>S: Validated evaluation
  S->>DB: rebuild_finish_judge
  DB->>DB: Progress semantics + eligible awards
 end
 S-->>UI: Saved evaluation
```

[rebuildRunService](../../../apps/promptify-intrepid/src/services/rebuildRunService.ts), [weightedRubricService](../../../apps/promptify-intrepid/src/services/weightedRubricService.ts), [baseline SQL](../../../apps/promptify-intrepid/gcp/sql/001_baseline.sql). Award issuance/refresh còn phụ thuộc attendance và class config, không phải mọi Judge tự cấp certificate.

## 4. Trainer chỉnh Studio

```mermaid
sequenceDiagram
 participant T as Trainer
 participant API as Product API
 participant DB as Cloud SQL
 T->>API: Class + lesson + config + expected revision
 API->>DB: Assigned management scope
 API->>DB: product_save_studio
 DB->>DB: Validate schema/rubric + revision
 DB->>DB: Store class-local override + audit
 DB->>DB: Queue scoped invalidation
 DB-->>API: New revision / conflict
 API-->>T: Saved selected class only
```

[ProductionStudioSource](../../../apps/promptify-intrepid/src/components/rebuild/ProductionStudioSource.tsx), [006 Studio scope](../../../apps/promptify-intrepid/gcp/sql/006_studio_class_scope.sql). Hai lớp cùng course cần negative test; không ghi toàn bộ lesson canonical vì UI đang chọn một class.

## 5. SOP → publish → embeddings → retrieval

```mermaid
flowchart LR
 A[Upload private object] --> B[Contribution pending review]
 B --> C[Authorized review]
 C --> D[Claim indexing]
 D --> E[Create immutable version and chunks]
 E --> F[Embed configured model space]
 F --> G[Publish version and class lesson binding]
 G --> H[Authorized retrieval + citation]
 F -->|Provider failure| R[Recover claim with evidence]
```

[sopIngestionService](../../../apps/promptify-intrepid/src/services/sopIngestionService.ts), [cloudSqlVectorService](../../../apps/promptify-intrepid/src/services/cloudSqlVectorService.ts), [cloudStorageService](../../../apps/promptify-intrepid/src/services/cloudStorageService.ts). Native/vector/service modes không được trộn dimensions/model provenance; file retention và DB rollback là hai việc riêng.

## 6. Google Sheets roster sync

```mermaid
sequenceDiagram
 participant SCH as Scheduler
 participant W as Roster worker
 participant GS as Sheets
 participant DB as Cloud SQL
 SCH->>W: OIDC private invocation
 W->>DB: Claim eligible connection
 W->>GS: Read approved range
 GS-->>W: Roster rows
 W->>W: Parse/validate domain + duplicates
 W->>DB: Atomic import / reconcile membership
 W->>DB: Finish sync + audit/log
 W-->>SCH: Summary without PII
```

[rosterWorkerService](../../../apps/promptify-intrepid/src/services/rosterWorkerService.ts), [googleRosterService](../../../apps/promptify-intrepid/src/services/googleRosterService.ts). Removed enrollment không tự re-add: giữ ON CONFLICT semantics và report batch failure; không tạo quyền bằng cách bỏ validation.

## 7. Department correction

```mermaid
flowchart TD
 A[Verified learner requests correction] --> B[Check active source membership and client]
 B --> C[Auto-approved department workflow]
 C --> D[Choose target class using existing priority]
 D --> E[Move membership and retain history]
 E --> F[Correction and audit records]
 F --> G[Projection invalidation]
```

[005 correction](../../../apps/promptify-intrepid/gcp/sql/005_department_correction_auto_approval.sql), [productionServerService](../../../apps/promptify-intrepid/src/services/productionServerService.ts). Latest autoapproval supersedes old pending flow. Same course là ordering preference theo source, không tự thay thành restriction mới.

## 8. SQL outbox → Firestore / BigQuery

```mermaid
sequenceDiagram
 participant DB as Cloud SQL transaction
 participant W as Projection worker
 participant FS as Firestore
 participant BQ as BigQuery
 DB->>DB: Business write + outbox event
 W->>DB: SKIP LOCKED claim / stale claim recovery
 DB-->>W: Entity key + revision
 W->>DB: Read current canonical state
 W->>FS: Monotonic scoped invalidation
 opt Warehouse enabled
  W->>BQ: Merge versioned projection / tombstone
 end
 W->>DB: Ack claim, failure backoff / dead letter
```

[cloudProjectionService](../../../apps/promptify-intrepid/src/services/cloudProjectionService.ts), [002 outbox](../../../apps/promptify-intrepid/gcp/sql/002_projection_outbox.sql), [cloudBigQueryService](../../../apps/promptify-intrepid/src/services/cloudBigQueryService.ts). `position` key là column name, không được chứa SQL quote characters. At-least-once delivery cần consumer idempotency, không chỉ worker retry.

## 9. Supabase → Cloud SQL migration

```mermaid
flowchart LR
 A[Approve Intrepid tenant scope] --> B[Read-only source export manifest]
 B --> C[Allowed FK closure + identity mapping]
 C --> D[Checksums / files / model provenance]
 D --> E[Import isolated target]
 E --> F[Constraints + rows + IDs + histories reconcile]
 F --> G[Parity and role negative tests]
 G --> H[User approves cloud cutover]
 H --> I[Observe / rollback if gates fail]
```

[export script](../../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs), [safe migration plan](../../gcp-database-clean-audit/SAFE_CLOUD_SQL_REFACTOR_PLAN.md). Root scope must be explicit; FK closure cannot quietly add another tenant to make import pass. Synthetic dry-run precedes real data handling.

## 10. Failure / retry / rollback

```mermaid
stateDiagram-v2
 [*] --> Requested
 Requested --> Claimed: Request ID / claim
 Claimed --> Complete: Provider and persistence confirmed
 Claimed --> Retryable: Known provider failure
 Claimed --> Uncertain: Timeout or partial save
 Retryable --> Claimed: Approved safe retry
 Uncertain --> Reconciled: Inspect saved evidence
 Reconciled --> Complete: Result found
 Reconciled --> Retryable: No effect proven
 Uncertain --> ManualReview: Cannot prove state
 Complete --> [*]
```

[backend failure tests](../../../apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts), [rebuildRunService](../../../apps/promptify-intrepid/src/services/rebuildRunService.ts), [cloudProjectionService](../../../apps/promptify-intrepid/src/services/cloudProjectionService.ts). Đây là invariant tổng hợp, không khẳng định mọi subsystem có cùng status enum. Sequence rollback không đảo external provider calls; claim uncertainty cần evidence thay vì reset mù.
