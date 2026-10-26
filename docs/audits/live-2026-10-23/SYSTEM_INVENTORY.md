# SYSTEM INVENTORY — Promptify Intrepid (audit 23/10/2026, bộ bổ sung LIVE)

> Bộ này **bổ sung** cho bộ audit gốc ở `docs/audits/*.md` (commit `99802c6`, viết khi không truy cập được staging). Mã lỗi `Ixx` tham chiếu `docs/audits/ISSUES_REGISTER.md`; mã `Lxx` là phát hiện mới trong `ISSUES_REGISTER.md` của thư mục này.

Audit chỉ đọc. Mức bằng chứng: **LIVE** (staging thật), **OFFLINE** (test local), **CODE** (đọc mã), **UNVERIFIED**.
Bằng chứng thô: `apps/promptify-intrepid/outputs/audit-2026-10-23/` (log Cloud Run 7 ngày, kết quả test offline).

## 1. Nguồn sự thật

| Hạng mục | Thực tế | Bằng chứng |
|---|---|---|
| Git | Nhánh `codex/two-app-isolation`, commit cuối `d7ac9d1` (08/10). **1.838 file untracked, 185 modified, 180 deleted.** Code đang chạy trên staging không tái tạo được từ git | LIVE (`git status`) |
| Ứng dụng | Một app duy nhất `apps/promptify-intrepid` (MVP cũ đã gỡ 22/10) | CODE |
| Môi trường | Chỉ có staging `ai-transformation-510302`. Không có production | LIVE |
| Quy mô mã | `src`+`api`: 143 file, ~8.650 dòng TS/TSX (dày, nhiều dòng một biểu thức); 68 service; 59 component rebuild; 96 file test, 73 trong allowlist offline; 19 file SQL (001–018, có 2 file `006_*`) | CODE |

## 2. Kiến trúc thực tế (đang chạy)

```
Trình duyệt (React 19 + Vite, Firebase Auth Google)
   │  /api/**  ──(Firebase Hosting rewrite)──►  Cloud Run promptify-intrepid-api (Node 24, tsx runtime)
   │  /api/stream ──(gọi thẳng URL run.app, CORS)──► cùng service
   ▼
Cloud Run API (RUNTIME_MODE=api, 1 vCPU/1GiB, concurrency 80, min 0 / max 100, timeout 300s)
   ├─ /api/product  → productionServerService.handleProductRequest (≈50 action)
   ├─ /api/stream   → generationStreamService → rebuildRunService.generateSavedRun (SSE)
   ├─ /api/generate, /api/evaluate, /api/roster-worker  (route tương thích, trình duyệt không gọi)
   ├─ /internal/judge (Cloud Tasks, token theo job)   ├─ /internal/generation (tắt)
   └─ /internal/roster (OIDC, chỉ staging, đang tắt)  └─ /readyz, /health
        │
        ├─ Cloud SQL PostgreSQL 18  db-custom-2-8192, ZONAL, backup + PITR bật (PGPOOL_MAX=5 / instance)
        ├─ Vertex AI gemini-3.8-flash, endpoint global (ADC)   ├─ GCS (SOP gốc immutable)
        ├─ Cloud Tasks promptify-judge-staging (3 job đồng thời, 1/s, 3 lần thử)
        ├─ Firestore (chỉ thông báo invalidation)   ├─ Google Sheets/Drive (roster, SOP)
        └─ Cloud Scheduler promptify-roster-staging-qa (PAUSED)
```

Revision LIVE 23/10: `promptify-intrepid-api-hint3-1023` (100%), image `sha256:eed6c133…` = chuỗi overlay trên `life-1021`. Hosting `e7f637fef72a7263`.

## 3. Cờ cấu hình đang bật trên staging (LIVE)

| Cờ | Giá trị | Ý nghĩa |
|---|---|---|
| `JUDGE_MODE` / `JUDGE_STRATEGY` | `async` / `parallel-v1` | Judge qua Cloud Tasks, Supervisor + 5 Worker |
| `GEMINI_MODEL` / `VERTEX_LOCATION` | `gemini-3.8-flash` / `global` | Không có model dự phòng |
| `ACCESS_EXPIRY_MODE`, `SESSION_TOKEN_CAP`, `INJECTION_GUARD`, `GENERATION_STREAM` | `enforce`, `50000`, `block`, `true` | Phát hành 23/10 |
| `CORS_ORIGINS` | web.app, firebaseapp.com | Cho `/api/stream` |
| `PROVIDER_ADMISSION_MODE`, `GENERATION_MODE`, `AI_WORKER_ISOLATED`, `JUDGE_FENCING_MODE`, `GCP_VECTOR_MODE` | **chưa đặt** | Hàng đợi provider toàn cục **tắt**; 013/014/015 **chưa áp** |

Migration đã áp trên staging: 001–012, 016, 017, 018. **Chưa áp: 013, 014, 015.**

## 4. Module chính

| Vùng | File chính | Vai trò |
|---|---|---|
| HTTP | `src/services/cloudRunServer.ts`, `api/*.ts` | Router, CORS, worker routes, static |
| Định danh | `firebaseServerIdentityService.ts`, `productionServerService.context()` | Firebase token → `users` theo email → `gcp_identity_bindings` |
| Phân quyền | `productionServerService.classScope/classes`, `apiAuthorizationService.assertAiLessonAccess`, RLS + SECURITY DEFINER SQL | 2 đường kiểm tra quyền song song |
| DB | `cloudDatabaseService.ts` (adapter kiểu Supabase, kiểm theo `cloudSchema.json`), `cloudPostgresService.ts` | `sqlTransaction(actor)` → role `authenticated`/`service_role` |
| Run AI | `rebuildRunService.ts`, `productionAiService.ts`, `generationStreamService.ts`, `learnerSafeguardService.ts`, `promptInjectionService.ts` | Sinh câu trả lời, safeguards |
| Judge | `parallelJudgeService.ts`, `judgeQueueService.ts`, `judgeFencingService.ts`, `weightedRubricService.ts` | Chấm `weighted-v1` |
| Admission | `providerAdmissionService.ts`, `admittedModelService.ts` | Hàng đợi provider toàn cục (tắt) |
| Roster | `rosterWorkerService.ts`, `rosterWorkbookService.ts`, `googleRosterService.ts`, `stagingRosterClaimService.ts` | Sheet → học viên |
| SOP/RAG | `sopIngestionService`, `cloudSopRetrievalService`, Drive services | Nạp, index, truy xuất SOP |
| Nhắn tin/hỗ trợ | `mentorFeedbackService.ts`, `workshopSupportService.ts`, `WorkshopMessaging.tsx` | Broadcast, hint, yêu cầu gợi ý |
| Frontend | `ProductionApp.tsx` (các nhánh `scoped(...)` là màn LIVE), `*Source.tsx`, `ProductionWorkspaceV7.tsx` | UI04–UI15 |

Màn hình theo vai: learner UI04 Hub / UI05 Workspace; trainer UI09 Workshop / UI10 Inspector / UI11 Studio; head UI12 Analytics; admin UI13 SOP / UI14 Governance / UI15 Roster.

## 5. Bảng dữ liệu chính (Cloud SQL)

`users`, `learners`, `enrollments` (+`access_expires_at`), `classes`, `courses`, `course_modules`, `lessons`, `product_studio` (rubric, variables theo lớp/bài), `rebuild_runs` (snapshot đóng băng mỗi Run), `prompt_attempts` (+`evaluation_json`), `rebuild_judge_claims`, `product_judge_jobs` (012), `product_ai_sessions`/`_charges`, `product_security_events` (016), `product_hint_requests` (017/018), `workshop_messages`, `trainer_hints`, `product_learner_support`, `product_class_grants`, `product_domains`, `gcp_identity_bindings`, `product_audit`, SOP (`rebuild_sop_*`, `product_sop_*`), roster (`product_sheet_connections`, `product_sync_logs`).

## 6. Tài liệu cũ hoặc mâu thuẫn (CODE)

| Tài liệu | Mâu thuẫn |
|---|---|
| `docs/01_CURRENT_STATE.md` | Ghi "không có streaming", token cap, chỉ đọc khi hết hạn là "Không có" — nay đã có sau cờ; test "56/56" (thực tế 73) |
| `docs/04_OPERATIONS.md`, `CLAUDE.md` | Schema "001…011" (thực tế đến 018, hai file `006_*`); "56/56" |
| `docs/05_OPEN_ISSUES.md` | Vẫn liệt kê SSE/50k/expiry/injection là thiếu; ghi bản sửa Roster vào `ProductionRoster.tsx` (màn không bao giờ render); thiếu `JUDGE_MODE`/`JUDGE_STRATEGY` trong danh sách env |
| `docs/ARCHITECTURE.md:53` | Coi `api/generate`/`api/evaluate` là tương thích nhưng không nói trình duyệt không gọi và chúng kiểm quyền hai lần |
| `docs/evidence/STAGING_GEMINI_429_404_ROOT_CAUSE_2026-10-22.md` | Nói prompt lạc đề chỉ tốn 2 lời gọi Judge — code chạy Supervisor và 5 Worker song song nên vẫn tốn 6 |
| `.env.example` | Thiếu `JUDGE_MODE`, `JUDGE_STRATEGY` (quan trọng), `ROSTER_STAGING_ENABLED`, `WORKSPACE_SOURCE_BINDINGS_JSON` … |

## 7. Không kiểm tra được

Thân hàm của đa số RPC SQL; cấu hình Firebase phía console; đường BigQuery; `max_connections` của Cloud SQL; probe Cloud Run; phần lớn `ProductionStudioSource.tsx` (82 KB).
