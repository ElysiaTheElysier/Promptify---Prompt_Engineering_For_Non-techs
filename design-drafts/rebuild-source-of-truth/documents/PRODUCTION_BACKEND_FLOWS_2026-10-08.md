# Promptify — full backend flows production (đề xuất)

Đi kèm [kế hoạch kiến trúc](PRODUCTION_BACKEND_ARCHITECTURE_PLAN_2026-10-08.md). Các sơ đồ là mục tiêu triển khai, không phải flow đã có trong backend. UI-11 dùng nghĩa mới Curriculum Studio; Library không bị gán lại vào số này.

## 1. Đăng nhập và điều hướng mọi vai trò

```mermaid
flowchart TD
  Guest[Khách truy cập] --> UI00[UI00 Landing]
  UI00 --> UI01[UI01 Google OAuth]
  UI01 --> Verify[Server verify identity và verified email]
  Verify --> Member{Domain allowed và membership active?}
  Member -->|Không| Denied[UI03 Denied và hỗ trợ]
  Denied --> UI01
  Member -->|Có| Profile[UI02 Profile từ roster]
  Profile --> Correction{Thông tin sai?}
  Correction -->|Có| Pending[Correction pending: không đổi quyền]
  Pending --> Confirm[Xác nhận theo scope hiện tại]
  Correction -->|Không| Confirm
  Confirm --> Role{Capabilities từ DB}
  Role -->|Learner| Hub[UI04 Hub]
  Role -->|Trainer| Trainer[UI09 Home và workshop]
  Role -->|Head read only| Head[UI12 Department view]
  Role -->|L and D Analyst| LD[UI12 Tenant aggregate]
  Role -->|SOP contributor| Upload[UI13 SOP submission]
  Role -->|System admin| Admin[UI14 Governance]
  Role -->|Roster capability| Roster[UI15 Sync]
```

## 2. Learner: run, Judge, retry và compare

```mermaid
sequenceDiagram
  participant L as Learner UI05
  participant API as API
  participant DB as PostgreSQL
  participant Q as Outbox và Cloud Tasks
  participant W as Cloud Run worker
  participant AI as Approved provider
  participant RT as Private realtime
  L->>API: Submit prompt + lesson/session/test-case IDs + idempotency key
  API->>DB: Check membership, published revision, control/time và budget
  alt Session frozen/ended hoặc scope sai
    API-->>L: Reject có mã lỗi, không enqueue
  else Hợp lệ
    API->>DB: Atomic reserve + run + job + outbox
    API-->>L: 202 run_id queued
    DB->>Q: Dispatcher lease và enqueue
    Q->>W: Job ID với service identity
    W->>DB: Claim lease, load canonical resource/system/rubric
    W->>AI: Generate
    AI-->>W: Output + actual model/usage
    W->>DB: Atomic generated output + attempt + usage + outbox
    DB->>RT: Dispatcher run.generated
    RT-->>L: ID và revision; learner fetch result
    W->>Q: Judge job qua outbox
    Q->>W: Judge cùng run/output hash
    W->>AI: Evaluate canonical snapshot
    AI-->>W: Structured result
    alt JSON/score không hợp lệ hoặc provider lỗi
      W->>DB: evaluation_failed; output giữ nguyên
      L->>API: Retry Judge theo run_id
      API->>DB: New evaluation job, không thêm attempt
    else Valid
      W->>DB: Atomic evaluation + progress + outbox
      DB->>RT: Dispatcher run.evaluated
      RT-->>L: Refresh UI07 feedback
    end
    L->>API: UI06 load run A/B đúng lesson và owner
    API-->>L: Immutable prompt/output/evaluation snapshots
    L->>API: Restore B thành draft revision mới
    API->>DB: Draft với source_run_id; history unchanged
  end
```

Run được accepted trước end có thể hoàn tất với late marker; run mới sau end bị chặn. Transport/worker có thể giao trùng; DB side effects idempotent. Provider timeout có trạng thái uncertain, không hứa exactly-once AI call.

## 3. Trainer: authoring → workshop → kết thúc

```mermaid
flowchart TD
  Home[UI09 Trainer home] --> Phase{Chọn công việc}
  Phase -->|Authoring| Studio[UI11 Curriculum Studio]
  Studio --> Draft[Draft lesson revision: metadata, variables, SOP, rubric]
  Draft --> Gate{Weights, resource, scope, dates hợp lệ?}
  Gate -->|Không| Fix[Field errors: không publish]
  Fix --> Draft
  Gate -->|Có| Sandbox[Sandbox real provider, không learner progress]
  Sandbox --> Publish[Publish immutable revision và assign]
  Publish --> Scheduled[Schedule live session]
  Scheduled --> Active[ACTIVE theo server time hoặc trainer action]
  Phase -->|Live workshop| Active
  Active --> Monitor[UI09 Snapshot và event summaries]
  Monitor --> Inspect[UI10 đúng participant/run]
  Inspect --> Hint[Private hint, note, manual clearance audited]
  Monitor --> Broadcast[Broadcast all/selected/stuck recipients]
  Hint --> Learner[UI05 inbox và feedback]
  Broadcast --> Learner
  Monitor --> Freeze[Freeze/unfreeze: control revision và API guard]
  Freeze --> Learner
  Learner --> Monitor
  Monitor --> End[End session hoặc đến deadline]
  End --> Lock[Server block new submit; learner read only]
  Lock --> Archived[Archive và aggregates]
  Archived --> Reports[UI12 Head hoặc L and D đúng scope]
```

Clearance không sửa AI score. Stuck dùng cấu hình failed evaluated runs/PII riêng, không suy từ tổng attempts. Weekly timeline/adaptive hero cần bổ sung vào trainer home dù prototype UI09 hiện chỉ workshop.

## 4. Draft preview và notification delivery

```mermaid
sequenceDiagram
  participant T as Assigned trainer
  participant API as Authorized API
  participant D as DB
  participant R as Private realtime
  participant L as Learner workspace
  T->>API: Watch selected participant
  API->>D: Check scope + monitoring policy
  API-->>T: Short watch lease
  API-->>L: Visible monitoring notice
  L->>API: Debounced draft revision khi được watch
  API->>API: Validate/redact, payload limit, coalesce
  API->>R: Private draft topic
  R-->>T: Latest advisory preview
  T->>API: Send hint/broadcast với target
  API->>D: Atomic message + resolved recipients + outbox
  API-->>T: Accepted; không khẳng định mọi learner đã nhận
  D->>R: Dispatcher inbox event
  alt Learner online
    R-->>L: Notification ID
    L->>API: Fetch authorized message
    L->>API: Client received và viewed ack riêng
  else Learner offline
    L->>API: Reconnect: fetch inbox cursor và session snapshot
    API-->>L: Pending messages + current controls
  end
```

Learner không publish control/score/hint. API ingestion xử lý draft là endpoint có auth, không phải task queue cho mỗi lần gõ. Checkpoint persistence và ephemeral preview khác nhau; raw PII policy phải được duyệt.

## 5. SOP và roster

```mermaid
flowchart LR
  Contributor[SOP contributor UI13] --> Intent[Authorized upload intent]
  Intent --> Store[Private quarantine storage]
  Store --> Ingest[Scan, parse, chunk, index worker]
  Ingest --> Result{Thành công?}
  Result -->|Không| Error[Job failed và retry]
  Result -->|Có| Ready[Ready version]
  Ready --> Review[Approve và assign lesson revision UI11]
  Review --> Context[Server context cho UI05]
  Review --> Viewer[UI08 version/page/citation]
  Trainer[Trainer roster capability UI15] --> Sheet[Private Sheet snapshot]
  Sheet --> Validate[Normalize và row validation]
  Validate --> Preview[Preview diff]
  Preview --> Commit[Atomic idempotent import]
  Commit --> Member[Membership và enrollment]
  Member --> Auth[Login/access resolution]
```

SOP ready khác approved; Head read-only không mặc định là contributor. Import fail không xóa snapshot/progress cũ; role không đọc từ roster.

## 6. Governance và vận hành

```mermaid
flowchart TD
  Admin[UI14 scoped admin] --> Usage[Usage ledger, queue health, audits]
  Admin --> Policy[Quota/throttle config revision]
  Policy --> RunGate[Enqueue/provider call budget gate]
  Admin --> Rotation[Rotation request với secret reference]
  Rotation --> Secret[Secret manager/IAM; không browser plaintext]
  Events[Domain transactions] --> Outbox[Outbox + dispatcher]
  Outbox --> Delivery[Realtime và worker jobs]
  Delivery --> Metrics[Delivery, latency, errors, costs]
  Metrics --> Alert[Alerts và operator runbooks]
  Backup[Backups và restore drill] --> Recovery[Recovery gate trước go live]
```
