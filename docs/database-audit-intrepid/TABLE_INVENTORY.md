# Table inventory — Intrepid

**Ngày:** 2026-10-13. **Bằng chứng:** repository tĩnh; chưa xác minh production usage/row counts.

48 bảng business nguồn + `gcp_identity_bindings` + `gcp_projection_outbox` = **50 bảng target PostgreSQL**. Baseline catalog có 49 bảng; bổ sung GCP 002/004/005 và source 050 bằng đọc SQL. Không tính bảng hệ thống Auth/Storage, Firestore hoặc BigQuery vào con số này.

`runtime` là vị trí tham chiếu tĩnh, không chứng minh request đã chạy. Function được liệt kê gồm RPC, trigger hoặc policy và helper; `AUDIT_EVIDENCE.json` ghi closure tĩnh. Không tìm thấy consumer là tín hiệu điều tra, không phải chứng minh bảng dư thừa. Các file manifest/export/type metadata không được coi là nghiệp vụ đang chạy.

**Phân loại:** 44 KEEP, 3 NEEDS INVESTIGATION, 2 DEPRECATE CANDIDATE, 1 MERGE CANDIDATE.

## Danh mục và quyết định

| Bảng | Mục đích | Phân loại | Tin cậy |
|---|---|---|---|
| [classes](#classes) | Cohort/workspace theo client, course, department và thời gian; ranh giới truy cập chính. | KEEP | Cao |
| [clients](#clients) | Khách hàng/đơn vị; sở hữu domain và lớp. | KEEP | Cao |
| [course_instructors](#course-instructors) | Phân công instructor ở cấp COURSE, có permission owner/editor/viewer. | KEEP | Cao |
| [course_modules](#course-modules) | Thứ tự module và publication trong course. | KEEP | Cao |
| [courses](#courses) | Curriculum dùng chung, publication/version; không phải bản riêng theo lớp. | KEEP | Cao |
| [enrollments](#enrollments) | Membership learner–class và lifecycle active/completed/removed/expired. | KEEP | Cao |
| [gcp_identity_bindings](#gcp-identity-bindings) | Map issuer + Firebase UID sang user UUID và legacy subject UUID. | KEEP | Cao |
| [learners](#learners) | Subtype learner, learner_code ổn định; nhiều FK lịch sử dùng learner UUID. | KEEP | Cao |
| [lesson_progress](#lesson-progress) | Read model trạng thái/điểm tốt nhất theo learner/class/lesson, cập nhật atomic từ attempts. | KEEP | Cao |
| [lesson_resources](#lesson-resources) | Nhiều tài nguyên có type và thứ tự theo lesson. | KEEP | Cao |
| [lesson_rubric_criteria](#lesson-rubric-criteria) | Rubric lesson dùng chung; Studio lại có rubric theo class trong JSON config. | NEEDS INVESTIGATION | Cao về overlap; thấp về removal |
| [lessons](#lessons) | Nội dung curriculum canonical và publication; có dữ liệu trainer-private. | KEEP | Cao |
| [product_attendance](#product-attendance) | Bằng chứng điểm danh riêng, là điều kiện cấp certificate. | KEEP | Cao |
| [product_audit](#product-audit) | Audit quản trị theo class/actor/action; khác lịch sử chấm điểm. | KEEP | Cao |
| [product_awards](#product-awards) | Bằng chứng cấp badge/certificate, UUID và nội dung tại thời điểm cấp. | KEEP | Cao |
| [product_class_grants](#product-class-grants) | Quyền head/contributor theo CLASS; khác phân công instructor theo course. | KEEP | Cao |
| [product_domains](#product-domains) | Allowlist domain ở cấp client, có active và người cập nhật. | KEEP | Cao |
| [product_enterprise_requests](#product-enterprise-requests) | Lead/form doanh nghiệp trước khi có tài khoản hoặc client. | KEEP | Cao |
| [product_governance_config](#product-governance-config) | Singleton JSON config có revision; hiện không thấy consumer runtime hoặc SQL business. | DEPRECATE CANDIDATE | Trung bình |
| [product_learner_context](#product-learner-context) | Tài liệu upload riêng theo owner/class/lesson, hash chống trùng; không phải SOP dùng chung. | KEEP | Cao |
| [product_learner_support](#product-learner-support) | Bằng chứng mở hints/solution và reflection theo learner/class/lesson/kind. | KEEP | Cao |
| [product_profile_corrections](#product-profile-corrections) | Request sửa hồ sơ/phòng ban, idempotency và lịch sử chuyển workspace. | KEEP | Cao |
| [product_prompt_drafts](#product-prompt-drafts) | Autosave mutable theo user/class/lesson với optimistic revision. | KEEP | Cao |
| [product_prompt_library](#product-prompt-library) | Prompt được lưu, settings/variables/score snapshot và workflow chia sẻ/duyệt. | KEEP | Cao |
| [product_request_budgets](#product-request-budgets) | Bộ đếm quota theo actor/operation/time bucket, cần update atomic. | KEEP | Cao |
| [product_roster_profiles](#product-roster-profiles) | Country/department của roster theo user/class; metadata membership bị tách riêng. | MERGE CANDIDATE | Trung bình |
| [product_rotation_approvals](#product-rotation-approvals) | Nhiều người approve một rotation; không thể thay bằng một approved_by. | NEEDS INVESTIGATION | Trung bình |
| [product_rotation_requests](#product-rotation-requests) | Workflow rotate secret có fingerprint, state và deployment receipt. | NEEDS INVESTIGATION | Trung bình |
| [product_sandbox_runs](#product-sandbox-runs) | Run thử của trainer, không tạo progress/award learner. | KEEP | Cao |
| [product_session_controls](#product-session-controls) | Freeze/end lớp và revision, độc lập lifecycle class. | KEEP | Cao |
| [product_sheet_connections](#product-sheet-connections) | Nguồn roster Sheets, mapping, lịch auto_sync và trạng thái kết nối. | KEEP | Cao |
| [product_sop_chunks](#product-sop-chunks) | Chunk/search projection canonical theo SOP version, vector 768 và model. | KEEP | Cao |
| [product_sop_contributions](#product-sop-contributions) | Staging intake/review/indexing claim trước khi publish SOP version. | KEEP | Cao |
| [product_studio](#product-studio) | Config/rubric/awards/schedule riêng theo class/lesson, revision và validator. | KEEP | Cao |
| [product_sync_logs](#product-sync-logs) | Job đồng bộ Sheets, claim/result/error/timestamp; không đồng nghĩa import ledger. | KEEP | Cao |
| [product_worker_invocations](#product-worker-invocations) | Nonce replay protection của worker; có purge 7 ngày trong RPC. | KEEP | Cao |
| [prompt_attempts](#prompt-attempts) | Sản phẩm run learner: prompt/output/evaluation và threshold đã chụp. | KEEP | Cao |
| [rebuild_judge_claims](#rebuild-judge-claims) | Claim đánh giá một attempt, ngăn provider call trùng; lifecycle riêng. | KEEP | Cao |
| [rebuild_roster_imports](#rebuild-roster-imports) | Ledger idempotency import theo actor/request và original rows/result. | KEEP | Cao |
| [rebuild_runs](#rebuild-runs) | Request/provider lifecycle, snapshot curriculum và request idempotency trước khi có attempt. | KEEP | Cao |
| [rebuild_sop_bindings](#rebuild-sop-bindings) | Pin một version của document vào lesson/class; nhiều lesson có thể dùng chung version. | KEEP | Cao |
| [rebuild_sop_documents](#rebuild-sop-documents) | Identity SOP theo class; title/creator, không gộp với version history. | KEEP | Cao |
| [rebuild_sop_versions](#rebuild-sop-versions) | Nội dung SOP bất biến theo document/version; lịch sử citation. | KEEP | Cao |
| [rebuild_trainer_actions](#rebuild-trainer-actions) | Note/clearance theo attempt có actor/request; không phải global audit. | KEEP | Cao |
| [trainer_hints](#trainer-hints) | Message riêng cho learner, không được gộp broadcast nếu làm yếu recipient policy. | KEEP | Cao |
| [user_tutorial_progress](#user-tutorial-progress) | Tutorial hoàn tất theo user/key; được migration/export giữ nhưng chưa có consumer Intrepid runtime. | DEPRECATE CANDIDATE | Thấp–trung bình |
| [users](#users) | Business identity, global role, email và auth mapping legacy. | KEEP | Cao |
| [workshop_message_receipts](#workshop-message-receipts) | Read receipt theo user/message, inbox SQL đọc trạng thái này. | KEEP | Cao |
| [workshop_messages](#workshop-messages) | Broadcast theo class/trainer/request; khác private hint. | KEEP | Cao |
| [gcp_projection_outbox](#gcp-projection-outbox) | Event delivery cho Firestore/BQ, claim/retry/dead letter; không phải bảng nghiệp vụ hay audit. | KEEP | Cao |

## classes

**KEEP — độ tin cậy Cao.** Cohort/workspace theo client, course, department và thời gian; ranh giới truy cập chính.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** client_id → clients.id; course_id → courses.id.
**Bảng tham chiếu đến:** enrollments, lesson_progress, product_attendance, product_audit, product_awards, product_class_grants, product_learner_context, product_learner_support, product_profile_corrections, product_prompt_drafts, product_prompt_library, product_roster_profiles, product_rotation_requests, product_sandbox_runs, product_session_controls, product_sheet_connections, product_sop_contributions, product_studio, product_sync_logs, prompt_attempts, rebuild_roster_imports, rebuild_runs, rebuild_sop_bindings, rebuild_sop_documents, trainer_hints, workshop_messages.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/components/common/ProductUseNotice.tsx:6](../../apps/promptify-intrepid/src/components/common/ProductUseNotice.tsx): lines 6.
- [apps/promptify-intrepid/src/components/rebuild/ProductionAnalytics.tsx:12](../../apps/promptify-intrepid/src/components/rebuild/ProductionAnalytics.tsx): lines 12, 14, 16.
- [apps/promptify-intrepid/src/components/rebuild/ProductionAnalyticsSource.tsx:15](../../apps/promptify-intrepid/src/components/rebuild/ProductionAnalyticsSource.tsx): lines 15, 17.
- [apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx:103](../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx): lines 103, 122.
- [apps/promptify-intrepid/src/components/rebuild/ProductionEntry1.tsx:16](../../apps/promptify-intrepid/src/components/rebuild/ProductionEntry1.tsx): lines 16, 20.
- [apps/promptify-intrepid/src/components/rebuild/ProductionEntry2.tsx:17](../../apps/promptify-intrepid/src/components/rebuild/ProductionEntry2.tsx): lines 17.
- [apps/promptify-intrepid/src/components/rebuild/ProductionEntry3.tsx:16](../../apps/promptify-intrepid/src/components/rebuild/ProductionEntry3.tsx): lines 16.
- [apps/promptify-intrepid/src/components/rebuild/ProductionStudioSource.tsx:19](../../apps/promptify-intrepid/src/components/rebuild/ProductionStudioSource.tsx): lines 19.
- [apps/promptify-intrepid/src/components/rebuild/ProductionStudioV2.tsx:23](../../apps/promptify-intrepid/src/components/rebuild/ProductionStudioV2.tsx): lines 23.
- [apps/promptify-intrepid/src/components/rebuild/ProductionWorkshopSource.tsx:12](../../apps/promptify-intrepid/src/components/rebuild/ProductionWorkshopSource.tsx): lines 12, 22, 25, 29.
- [apps/promptify-intrepid/src/components/rebuild/ReviewScreen.tsx:17](../../apps/promptify-intrepid/src/components/rebuild/ReviewScreen.tsx): lines 17, 47, 50, 51, 61.
- [apps/promptify-intrepid/src/services/apiAuthorizationService.ts:38](../../apps/promptify-intrepid/src/services/apiAuthorizationService.ts): lines 38.
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:7](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 7, 12, 20.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:8](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 8, 24, 35, 38, 40.
- [apps/promptify-intrepid/src/services/firebaseIdentityService.ts:20](../../apps/promptify-intrepid/src/services/firebaseIdentityService.ts): lines 20.
- [apps/promptify-intrepid/src/services/productI18nService.ts:29](../../apps/promptify-intrepid/src/services/productI18nService.ts): lines 29.
- [apps/promptify-intrepid/src/services/productionServerService.ts:56](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 56, 57, 83, 91, 95, 101, 191, 197.
- [apps/promptify-intrepid/src/services/sourceUiTextService.ts:705](../../apps/promptify-intrepid/src/services/sourceUiTextService.ts): lines 705.
- [apps/promptify-intrepid/src/types/production.ts:16](../../apps/promptify-intrepid/src/types/production.ts): lines 16.

**SQL functions có tham chiếu:** `has_active_class_enrollment`, `has_active_course_enrollment`, `lesson_belongs_to_class`, `product_analytics`, `product_can_read_class`, `product_can_read_course`, `product_can_read_lesson`, `product_claim_roster_sync`, `product_create_cohort`, `product_create_lesson`, `product_enroll_basic`, `product_import_roster`, `product_limit_basic_run`, `product_record_attendance`, `product_refresh_awards`, `product_save_class`, `product_save_domain`, `product_save_studio`, `product_session_control`, `product_set_class_access`, `product_unlock_support`, `rebuild_begin_run`, `rebuild_broadcast`, `rebuild_can_manage_class`, `rebuild_can_teach`, `rebuild_import_roster`, `rebuild_my_profile`, `rebuild_publish_sop`, `rebuild_sop_lesson_options`, `record_prompt_attempt_and_progress`, `self_enroll_public_class`, `sync_lesson_progress_from_prompt_attempt`, `product_auto_correct_department`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/apply_combined_brand.mjs:5](../../apps/promptify-intrepid/scripts/apply_combined_brand.mjs); [apps/promptify-intrepid/scripts/compile_production_analytics.mjs:10](../../apps/promptify-intrepid/scripts/compile_production_analytics.mjs); [apps/promptify-intrepid/scripts/compile_production_entry.mjs:46](../../apps/promptify-intrepid/scripts/compile_production_entry.mjs); [apps/promptify-intrepid/scripts/compile_production_studio.mjs:41](../../apps/promptify-intrepid/scripts/compile_production_studio.mjs); [apps/promptify-intrepid/scripts/compile_production_workshop.mjs:3](../../apps/promptify-intrepid/scripts/compile_production_workshop.mjs); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:8](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/prove_combined_baseline.cjs:6](../../apps/promptify-intrepid/scripts/prove_combined_baseline.cjs); [apps/promptify-intrepid/scripts/reembed_target_sops.ts:2](../../apps/promptify-intrepid/scripts/reembed_target_sops.ts); [apps/promptify-intrepid/scripts/setup_roster_trial.ts:34](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts); [apps/promptify-intrepid/scripts/verify_product_live.ts:33](../../apps/promptify-intrepid/scripts/verify_product_live.ts).

**Keys/constraints:** `UNIQUE (class_code)`; `CHECK ((enrollment_mode = ANY (ARRAY['instructor'::text, 'self_enroll'::text])))`; `PRIMARY KEY (id)`; `CHECK ((status = ANY (ARRAY['active'::text, 'upcoming'::text, 'completed'::text, 'archived'::text])))`.
**Indexes baseline:** `classes_class_code_key`, `classes_pkey`, `idx_classes_client`, `idx_classes_course`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_code text NOT NULL`, `course_id uuid NOT NULL`, `client_id uuid NOT NULL`, `department text NOT NULL`, `start_date timestamp with time zone NOT NULL`, `end_date timestamp with time zone NOT NULL`, `status text NOT NULL`, `enrollment_mode text NOT NULL`, `created_at timestamp with time zone NULL`.

## clients

**KEEP — độ tin cậy Cao.** Khách hàng/đơn vị; sở hữu domain và lớp.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** Không có..
**Bảng tham chiếu đến:** classes, product_domains.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/components/rebuild/ProductionRosterSource.tsx:18](../../apps/promptify-intrepid/src/components/rebuild/ProductionRosterSource.tsx): lines 18.
- [apps/promptify-intrepid/src/services/productionServerService.ts:57](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 57.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/compile_production_roster.mjs:13](../../apps/promptify-intrepid/scripts/compile_production_roster.mjs); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:21](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/setup_roster_trial.ts:31](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts); [apps/promptify-intrepid/scripts/verify_product_live.ts:28](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:28](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `PRIMARY KEY (id)`.
**Indexes baseline:** `clients_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `name text NOT NULL`, `industry text NOT NULL`, `created_at timestamp with time zone NULL`.

## course_instructors

**KEEP — độ tin cậy Cao.** Phân công instructor ở cấp COURSE, có permission owner/editor/viewer.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** course_id → courses.id; user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:40](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 40.
- [apps/promptify-intrepid/src/services/productionServerService.ts:59](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 59.

**SQL functions có tham chiếu:** `product_set_class_access`, `rebuild_can_manage_class`, `rebuild_can_teach`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:22](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/verify_product_live.ts:30](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:33](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `CHECK ((permission = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text])))`; `PRIMARY KEY (course_id, user_id)`.
**Indexes baseline:** `course_instructors_pkey`, `idx_course_instructors_user`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `course_id uuid NOT NULL`, `user_id uuid NOT NULL`, `permission text NOT NULL`, `assigned_at timestamp with time zone NOT NULL`.

## course_modules

**KEEP — độ tin cậy Cao.** Thứ tự module và publication trong course.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** course_id → courses.id.
**Bảng tham chiếu đến:** lessons.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/apiAuthorizationService.ts:54](../../apps/promptify-intrepid/src/services/apiAuthorizationService.ts): lines 54.
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:9](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 9.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:8](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 8, 36, 37.
- [apps/promptify-intrepid/src/services/productionServerService.ts:103](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 103, 303, 349.

**SQL functions có tham chiếu:** `lesson_belongs_to_class`, `product_analytics`, `product_can_read_lesson`, `product_create_lesson`, `product_record_attendance`, `product_refresh_awards`, `product_save_studio`, `product_unlock_support`, `rebuild_begin_run`, `rebuild_class_sops`, `rebuild_publish_sop`, `rebuild_sop_lesson_options`, `record_prompt_attempt_and_progress`, `sync_lesson_progress_from_prompt_attempt`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:22](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/generate_public_basic.mjs:7](../../apps/promptify-intrepid/scripts/generate_public_basic.mjs); [apps/promptify-intrepid/scripts/verify_product_live.ts:31](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:74](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK (("position" > 0))`; `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`; `UNIQUE (course_id, "position")`.
**Indexes baseline:** `course_modules_pkey`, `idx_course_modules_course`, `unique_module_position_per_course`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `course_id uuid NOT NULL`, `title text NOT NULL`, `description text NULL`, `position integer NOT NULL`, `status text NOT NULL`, `created_at timestamp with time zone NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## courses

**KEEP — độ tin cậy Cao.** Curriculum dùng chung, publication/version; không phải bản riêng theo lớp.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** created_by → users.id.
**Bảng tham chiếu đến:** classes, course_instructors, course_modules.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:8](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 8, 20.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:8](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 8, 36, 37.
- [apps/promptify-intrepid/src/services/productionServerService.ts:57](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 57.

**SQL functions có tham chiếu:** `has_active_course_enrollment`, `product_analytics`, `product_create_lesson`, `product_enroll_basic`, `product_limit_basic_run`, `rebuild_begin_run`, `record_prompt_attempt_and_progress`, `self_enroll_public_class`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:21](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/generate_public_basic.mjs:7](../../apps/promptify-intrepid/scripts/generate_public_basic.mjs); [apps/promptify-intrepid/scripts/setup_roster_trial.ts:29](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts); [apps/promptify-intrepid/scripts/verify_product_live.ts:29](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:29](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK ((publication_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`; `CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))`.
**Indexes baseline:** `courses_pkey`, `idx_courses_slug_unique`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `title text NOT NULL`, `description text NULL`, `status text NOT NULL`, `created_by uuid NULL`, `created_at timestamp with time zone NULL`, `updated_at timestamp with time zone NULL`, `slug text NULL`, `publication_status text NOT NULL`, `version integer NOT NULL`, `published_at timestamp with time zone NULL`.

## enrollments

**KEEP — độ tin cậy Cao.** Membership learner–class và lifecycle active/completed/removed/expired.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; learner_id → learners.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/components/common/ProductUseNotice.tsx:6](../../apps/promptify-intrepid/src/components/common/ProductUseNotice.tsx): lines 6.
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:13](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 13, 17, 19, 20.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:9](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 9.
- [apps/promptify-intrepid/src/services/productionServerService.ts:69](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 69, 122, 393.

**SQL functions có tham chiếu:** `has_active_class_enrollment`, `has_active_course_enrollment`, `product_analytics`, `product_can_read_class`, `product_can_read_user`, `product_enroll_basic`, `product_import_roster`, `product_record_attendance`, `product_refresh_awards`, `rebuild_class_analytics`, `rebuild_import_roster`, `rebuild_my_profile`, `self_enroll_public_class`, `product_auto_correct_department`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/setup_roster_trial.ts:47](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts); [apps/promptify-intrepid/scripts/verify_product_live.ts:34](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:31](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts); [apps/promptify-intrepid/tests/verify_vercel_compat.ts:15](../../apps/promptify-intrepid/tests/verify_vercel_compat.ts).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'removed'::text, 'expired'::text])))`; `UNIQUE (learner_id, class_id)`.
**Indexes baseline:** `enrollments_pkey`, `idx_enrollments_class`, `idx_enrollments_learner`, `unique_learner_class`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `learner_id uuid NOT NULL`, `class_id uuid NOT NULL`, `status text NOT NULL`, `joined_at timestamp with time zone NULL`, `updated_at timestamp with time zone NULL`.

## gcp_identity_bindings

**KEEP — độ tin cậy Cao.** Map issuer + Firebase UID sang user UUID và legacy subject UUID.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:21](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 21, 40.
- [apps/promptify-intrepid/src/services/firebaseServerIdentityService.ts:16](../../apps/promptify-intrepid/src/services/firebaseServerIdentityService.ts): lines 16, 26.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/check_export_bundle.mjs:4](../../apps/promptify-intrepid/scripts/check_export_bundle.mjs); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:13](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/import_intrepid_data.mjs:7](../../apps/promptify-intrepid/scripts/import_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_cloud_export.mjs:3](../../apps/promptify-intrepid/tests/verify_cloud_export.mjs); [apps/promptify-intrepid/tests/verify_firebase_identity.ts:10](../../apps/promptify-intrepid/tests/verify_firebase_identity.ts).

**Keys/constraints:** `UNIQUE (legacy_subject)`; `PRIMARY KEY (issuer, external_subject)`; `UNIQUE (user_id, issuer)`.
**Indexes baseline:** `gcp_identity_bindings_legacy_subject_key`, `gcp_identity_bindings_pkey`, `gcp_identity_bindings_user_id_issuer_key`.
**RLS/grants baseline:** gcp_identity_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `issuer text NOT NULL`, `external_subject text NOT NULL`, `user_id uuid NOT NULL`, `legacy_subject uuid NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## learners

**KEEP — độ tin cậy Cao.** Subtype learner, learner_code ổn định; nhiều FK lịch sử dùng learner UUID.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** user_id → users.id.
**Bảng tham chiếu đến:** enrollments, lesson_progress, product_attendance, product_awards, product_learner_support, prompt_attempts, trainer_hints.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/components/rebuild/ProductionAnalytics.tsx:15](../../apps/promptify-intrepid/src/components/rebuild/ProductionAnalytics.tsx): lines 15.
- [apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx:103](../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx): lines 103, 138.
- [apps/promptify-intrepid/src/components/rebuild/ProductionGovernanceSource.tsx:20](../../apps/promptify-intrepid/src/components/rebuild/ProductionGovernanceSource.tsx): lines 20.
- [apps/promptify-intrepid/src/components/rebuild/ProductionLearnerInspectorSource.tsx:12](../../apps/promptify-intrepid/src/components/rebuild/ProductionLearnerInspectorSource.tsx): lines 12, 13, 14, 15, 18, 19.
- [apps/promptify-intrepid/src/components/rebuild/ProductionRosterSource.tsx:21](../../apps/promptify-intrepid/src/components/rebuild/ProductionRosterSource.tsx): lines 21.
- [apps/promptify-intrepid/src/components/rebuild/ProductionWorkshop.tsx:12](../../apps/promptify-intrepid/src/components/rebuild/ProductionWorkshop.tsx): lines 12, 16, 18, 19.
- [apps/promptify-intrepid/src/components/rebuild/ProductionWorkshopSource.tsx:14](../../apps/promptify-intrepid/src/components/rebuild/ProductionWorkshopSource.tsx): lines 14, 15, 22.
- [apps/promptify-intrepid/src/components/rebuild/review-i18n.ts:233](../../apps/promptify-intrepid/src/components/rebuild/review-i18n.ts): lines 233, 235, 241, 243, 361, 372.
- [apps/promptify-intrepid/src/components/rebuild/ReviewScreen.tsx:34](../../apps/promptify-intrepid/src/components/rebuild/ReviewScreen.tsx): lines 34.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:21](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 21.
- [apps/promptify-intrepid/src/services/productionServerService.ts:67](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 67, 101, 115, 122, 123, 152, 206, 290.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:88](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 88.
- [apps/promptify-intrepid/src/services/releaseUiTranslations.ts:15](../../apps/promptify-intrepid/src/services/releaseUiTranslations.ts): lines 15, 410.
- [apps/promptify-intrepid/src/services/sourceUiTextService.ts:231](../../apps/promptify-intrepid/src/services/sourceUiTextService.ts): lines 231, 233, 239, 241, 359, 370, 730, 741.
- [apps/promptify-intrepid/src/types/production.ts:16](../../apps/promptify-intrepid/src/types/production.ts): lines 16.

**SQL functions có tham chiếu:** `has_active_class_enrollment`, `has_active_course_enrollment`, `product_can_read_class`, `product_can_read_user`, `product_enroll_basic`, `product_import_roster`, `product_unlock_support`, `product_unlock_support_reflected`, `rebuild_class_analytics`, `rebuild_class_attempts`, `rebuild_import_roster`, `rebuild_my_profile`, `record_prompt_attempt_and_progress`, `self_enroll_public_class`, `update_prompt_attempt_evaluation_and_progress`, `product_auto_correct_department`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/compile_production_governance.mjs:4](../../apps/promptify-intrepid/scripts/compile_production_governance.mjs); [apps/promptify-intrepid/scripts/compile_production_learner_inspector.mjs:5](../../apps/promptify-intrepid/scripts/compile_production_learner_inspector.mjs); [apps/promptify-intrepid/scripts/compile_production_roster.mjs:3](../../apps/promptify-intrepid/scripts/compile_production_roster.mjs); [apps/promptify-intrepid/scripts/compile_production_workshop.mjs:3](../../apps/promptify-intrepid/scripts/compile_production_workshop.mjs); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:27](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/import_intrepid_data.mjs:20](../../apps/promptify-intrepid/scripts/import_intrepid_data.mjs); [apps/promptify-intrepid/scripts/verify_product_live.ts:26](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts:33](../../apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts); [apps/promptify-intrepid/tests/verify_cloud_export.mjs:7](../../apps/promptify-intrepid/tests/verify_cloud_export.mjs); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:27](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `UNIQUE (learner_code)`; `PRIMARY KEY (id)`; `UNIQUE (user_id)`.
**Indexes baseline:** `learners_learner_code_key`, `learners_pkey`, `learners_user_id_key`.
**RLS/grants baseline:** Learners insert own record or instructor insert [authenticated] INSERT; Learners update by instructor [authenticated] UPDATE; gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `learner_code text NOT NULL`, `user_id uuid NOT NULL`, `created_at timestamp with time zone NULL`.

## lesson_progress

**KEEP — độ tin cậy Cao.** Read model trạng thái/điểm tốt nhất theo learner/class/lesson, cập nhật atomic từ attempts.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; last_attempt_id → prompt_attempts.id; learner_id → learners.id; lesson_id → lessons.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:14](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 14.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:9](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 9.
- [apps/promptify-intrepid/src/services/productionServerService.ts:141](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 141.

**SQL functions có tham chiếu:** `product_analytics`, `record_prompt_attempt_and_progress`, `sync_lesson_progress_from_prompt_attempt`, `update_prompt_attempt_evaluation_and_progress`.
**Maintenance/test/export:** [apps/promptify-intrepid/tests/verify_progress_migration_staging.ts:62](../../apps/promptify-intrepid/tests/verify_progress_migration_staging.ts).

**Keys/constraints:** `CHECK ((attempts_count >= 0))`; `CHECK (((best_score IS NULL) OR ((best_score >= (0)::numeric) AND (best_score <= (10)::numeric))))`; `UNIQUE (learner_id, class_id, lesson_id)`; `PRIMARY KEY (id)`; `CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))`.
**Indexes baseline:** `idx_lesson_progress_class_lesson`, `idx_lesson_progress_learner_class`, `lesson_progress_learner_class_lesson_key`, `lesson_progress_pkey`.
**RLS/grants baseline:** Learners read own lesson progress [authenticated] SELECT; gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `learner_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `status text NOT NULL`, `attempts_count integer NOT NULL`, `best_score numeric NULL`, `last_attempt_id uuid NULL`, `started_at timestamp with time zone NULL`, `completed_at timestamp with time zone NULL`, `updated_at timestamp with time zone NOT NULL`.

## lesson_resources

**KEEP — độ tin cậy Cao.** Nhiều tài nguyên có type và thứ tự theo lesson.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** lesson_id → lessons.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:106](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 106.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:22](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 22, 54.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:41](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts:27](../../apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts); [apps/promptify-intrepid/tests/verify_rebuild_runs.ts:6](../../apps/promptify-intrepid/tests/verify_rebuild_runs.ts).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK (("position" > 0))`; `CHECK ((resource_type = ANY (ARRAY['text'::text, 'data'::text, 'url'::text, 'file'::text, 'reference'::text])))`; `UNIQUE (lesson_id, "position")`.
**Indexes baseline:** `idx_lesson_resources_lesson`, `lesson_resources_pkey`, `unique_resource_position_per_lesson`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `resource_type text NOT NULL`, `title text NOT NULL`, `content text NULL`, `url text NULL`, `position integer NOT NULL`, `created_at timestamp with time zone NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## lesson_rubric_criteria

**NEEDS INVESTIGATION — độ tin cậy Cao về overlap; thấp về removal.** Rubric lesson dùng chung; Studio lại có rubric theo class trong JSON config.

Global rubric và class Studio JSON có scope khác nhau; saveStudio ghi cả hai. Chọn authority và sửa scope trước khi xét giảm bảng.

**Phụ thuộc FK ra:** lesson_id → lessons.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:106](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 106.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:22](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 22, 99.

**SQL functions có tham chiếu:** `product_save_studio`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:41](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_rebuild_runs.ts:17](../../apps/promptify-intrepid/tests/verify_rebuild_runs.ts).

**Keys/constraints:** `CHECK ((max_score > (0)::numeric))`; `PRIMARY KEY (id)`; `CHECK (("position" > 0))`; `UNIQUE (lesson_id, criterion_key)`; `UNIQUE (lesson_id, "position")`.
**Indexes baseline:** `idx_lesson_rubrics_lesson`, `lesson_rubric_criteria_pkey`, `unique_rubric_key_per_lesson`, `unique_rubric_position_per_lesson`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `criterion_key text NOT NULL`, `label text NOT NULL`, `description text NOT NULL`, `max_score numeric NOT NULL`, `position integer NOT NULL`, `created_at timestamp with time zone NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## lessons

**KEEP — độ tin cậy Cao.** Nội dung curriculum canonical và publication; có dữ liệu trainer-private.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** module_id → course_modules.id.
**Bảng tham chiếu đến:** lesson_progress, lesson_resources, lesson_rubric_criteria, product_attendance, product_awards, product_learner_context, product_learner_support, product_prompt_drafts, product_prompt_library, product_sandbox_runs, product_sop_contributions, product_studio, prompt_attempts, rebuild_runs, rebuild_sop_bindings.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/components/common/ProductUseNotice.tsx:6](../../apps/promptify-intrepid/src/components/common/ProductUseNotice.tsx): lines 6.
- [apps/promptify-intrepid/src/components/rebuild/DepartmentSopLibrary.tsx:8](../../apps/promptify-intrepid/src/components/rebuild/DepartmentSopLibrary.tsx): lines 8, 15.
- [apps/promptify-intrepid/src/components/rebuild/LearnerResourceHub.tsx:9](../../apps/promptify-intrepid/src/components/rebuild/LearnerResourceHub.tsx): lines 9, 13.
- [apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx:90](../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx): lines 90, 103, 119, 131, 132.
- [apps/promptify-intrepid/src/components/rebuild/ProductionHub.tsx:22](../../apps/promptify-intrepid/src/components/rebuild/ProductionHub.tsx): lines 22.
- [apps/promptify-intrepid/src/components/rebuild/ProductionLearnerInspectorSource.tsx:12](../../apps/promptify-intrepid/src/components/rebuild/ProductionLearnerInspectorSource.tsx): lines 12, 13, 19.
- [apps/promptify-intrepid/src/components/rebuild/ProductionSop.tsx:8](../../apps/promptify-intrepid/src/components/rebuild/ProductionSop.tsx): lines 8, 29.
- [apps/promptify-intrepid/src/components/rebuild/ProductionSopSource.tsx:13](../../apps/promptify-intrepid/src/components/rebuild/ProductionSopSource.tsx): lines 13, 22.
- [apps/promptify-intrepid/src/components/rebuild/ProductionStudioSource.tsx:18](../../apps/promptify-intrepid/src/components/rebuild/ProductionStudioSource.tsx): lines 18, 24.
- [apps/promptify-intrepid/src/components/rebuild/ProductionStudioV2.tsx:22](../../apps/promptify-intrepid/src/components/rebuild/ProductionStudioV2.tsx): lines 22.
- [apps/promptify-intrepid/src/components/rebuild/ProductionWorkshop.tsx:17](../../apps/promptify-intrepid/src/components/rebuild/ProductionWorkshop.tsx): lines 17.
- [apps/promptify-intrepid/src/components/rebuild/ProductionWorkshopSource.tsx:14](../../apps/promptify-intrepid/src/components/rebuild/ProductionWorkshopSource.tsx): lines 14, 16, 22.
- [apps/promptify-intrepid/src/components/rebuild/review-i18n.ts:102](../../apps/promptify-intrepid/src/components/rebuild/review-i18n.ts): lines 102, 107.
- [apps/promptify-intrepid/src/services/apiAuthorizationService.ts:47](../../apps/promptify-intrepid/src/services/apiAuthorizationService.ts): lines 47, 53.
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:10](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 10, 11, 12.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:8](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 8, 36.
- [apps/promptify-intrepid/src/services/productionServerService.ts:101](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 101, 106, 108, 110, 126, 153, 204, 213, 223, 235, 251, 277, 304, 350.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:22](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 22.
- [apps/promptify-intrepid/src/services/sourceUiTextService.ts:100](../../apps/promptify-intrepid/src/services/sourceUiTextService.ts): lines 100, 105.
- [apps/promptify-intrepid/src/types/database.ts:119](../../apps/promptify-intrepid/src/types/database.ts): lines 119.
- [apps/promptify-intrepid/src/types/production.ts:16](../../apps/promptify-intrepid/src/types/production.ts): lines 16.

**SQL functions có tham chiếu:** `lesson_belongs_to_class`, `product_analytics`, `product_can_read_lesson`, `product_create_lesson`, `product_record_attendance`, `product_refresh_awards`, `product_save_studio`, `product_unlock_support`, `rebuild_begin_run`, `rebuild_class_sops`, `rebuild_publish_sop`, `rebuild_sop_lesson_options`, `record_prompt_attempt_and_progress`, `sync_lesson_progress_from_prompt_attempt`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/compile_production_hub.mjs:51](../../apps/promptify-intrepid/scripts/compile_production_hub.mjs); [apps/promptify-intrepid/scripts/compile_production_learner_inspector.mjs:25](../../apps/promptify-intrepid/scripts/compile_production_learner_inspector.mjs); [apps/promptify-intrepid/scripts/compile_production_sop.mjs:3](../../apps/promptify-intrepid/scripts/compile_production_sop.mjs); [apps/promptify-intrepid/scripts/compile_production_studio.mjs:40](../../apps/promptify-intrepid/scripts/compile_production_studio.mjs); [apps/promptify-intrepid/scripts/compile_production_workshop.mjs:3](../../apps/promptify-intrepid/scripts/compile_production_workshop.mjs); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:22](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/generate_public_basic.mjs:10](../../apps/promptify-intrepid/scripts/generate_public_basic.mjs); [apps/promptify-intrepid/scripts/setup_roster_trial.ts:44](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts); [apps/promptify-intrepid/scripts/verify_product_live.ts:32](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:49](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `CHECK ((jsonb_typeof(focus_components) = 'array'::text))`; `CHECK ((jsonb_typeof(hints) = 'array'::text))`; `PRIMARY KEY (id)`; `CHECK (("position" > 0))`; `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`; `UNIQUE (module_id, lesson_key)`; `UNIQUE (module_id, "position")`.
**Indexes baseline:** `idx_lessons_module`, `lessons_pkey`, `unique_lesson_key_per_module`, `unique_lesson_position_per_module`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `module_id uuid NOT NULL`, `lesson_key text NOT NULL`, `title text NOT NULL`, `badge text NULL`, `focus_skill text NULL`, `scenario text NULL`, `task_goal text NULL`, `concept_title text NULL`, `concept_content text NULL`, `system_instruction text NULL`, `starter_prompt text NULL`, `baseline_prompt text NULL`, `improved_prompt text NULL`, `sample_input_context text NULL`, `prompt_placeholder text NULL`, `expected_output_format text NULL`, `hints jsonb NOT NULL`, `focus_components jsonb NOT NULL`, `position integer NOT NULL`, `status text NOT NULL`, `created_at timestamp with time zone NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## product_attendance

**KEEP — độ tin cậy Cao.** Bằng chứng điểm danh riêng, là điều kiện cấp certificate.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; learner_id → learners.id; lesson_id → lessons.id; recorded_by → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:9](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 9.
- [apps/promptify-intrepid/src/services/productionServerService.ts:144](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 144.

**SQL functions có tham chiếu:** `product_record_attendance`, `product_refresh_awards`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `PRIMARY KEY (class_id, lesson_id, learner_id)`.
**Indexes baseline:** `product_attendance_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `learner_id uuid NOT NULL`, `present boolean NOT NULL`, `recorded_by uuid NOT NULL`, `reason text NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## product_audit

**KEEP — độ tin cậy Cao.** Audit quản trị theo class/actor/action; khác lịch sử chấm điểm.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** actor_id → users.id; class_id → classes.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:321](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 321, 439.

**SQL functions có tham chiếu:** `product_approve_rotation`, `product_create_cohort`, `product_create_lesson`, `product_finish_rotation`, `product_import_roster`, `product_publish_contribution`, `product_record_attendance`, `product_request_rotation`, `product_save_class`, `product_save_domain`, `product_save_sheet`, `product_save_studio`, `product_session_control`, `product_set_class_access`, `product_set_sheet_auto_sync`, `product_auto_correct_department`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/setup_roster_trial.ts:44](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts).

**Keys/constraints:** `PRIMARY KEY (id)`.
**Indexes baseline:** `product_audit_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NULL`, `actor_id uuid NOT NULL`, `action text NOT NULL`, `reason text NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## product_awards

**KEEP — độ tin cậy Cao.** Bằng chứng cấp badge/certificate, UUID và nội dung tại thời điểm cấp.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; learner_id → learners.id; lesson_id → lessons.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:9](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 9.
- [apps/promptify-intrepid/src/services/productionServerService.ts:143](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 143, 289.

**SQL functions có tham chiếu:** `product_refresh_awards`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `UNIQUE (class_id, lesson_id, learner_id, award_key)`; `CHECK ((kind = ANY (ARRAY['badge'::text, 'certificate'::text])))`; `PRIMARY KEY (id)`.
**Indexes baseline:** `product_awards_class_id_lesson_id_learner_id_award_key_key`, `product_awards_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `learner_id uuid NOT NULL`, `award_key text NOT NULL`, `kind text NOT NULL`, `title text NOT NULL`, `issuer text NOT NULL`, `evidence jsonb NOT NULL`, `issued_at timestamp with time zone NOT NULL`.

## product_class_grants

**KEEP — độ tin cậy Cao.** Quyền head/contributor theo CLASS; khác phân công instructor theo course.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:63](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 63.

**SQL functions có tham chiếu:** `product_can_read_class`, `product_set_class_access`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/verify_product_live.ts:35](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:34](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `CHECK ((permission = ANY (ARRAY['head'::text, 'contributor'::text])))`; `PRIMARY KEY (user_id, class_id)`.
**Indexes baseline:** `product_class_grants_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `user_id uuid NOT NULL`, `class_id uuid NOT NULL`, `permission text NOT NULL`.

## product_domains

**KEEP — độ tin cậy Cao.** Allowlist domain ở cấp client, có active và người cập nhật.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** client_id → clients.id; updated_by → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:40](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 40.
- [apps/promptify-intrepid/src/services/productionServerService.ts:75](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 75, 439.

**SQL functions có tham chiếu:** `product_can_read_class`, `product_save_domain`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:22](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_vercel_compat.ts:17](../../apps/promptify-intrepid/tests/verify_vercel_compat.ts).

**Keys/constraints:** `CHECK ((domain ~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$'::text))`; `PRIMARY KEY (client_id, domain)`.
**Indexes baseline:** `product_domains_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `client_id uuid NOT NULL`, `domain text NOT NULL`, `active boolean NOT NULL`, `updated_by uuid NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## product_enterprise_requests

**KEEP — độ tin cậy Cao.** Lead/form doanh nghiệp trước khi có tài khoản hoặc client.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** Không có..
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** `product_submit_enterprise_request`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:12](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `CHECK (((length(company) >= 2) AND (length(company) <= 200)))`; `CHECK ((length(email) <= 254))`; `CHECK ((employees = ANY (ARRAY['50 - 200 staff'::text, '200 - 1,000 staff'::text, '1,000+ staff'::text])))`; `PRIMARY KEY (id)`; `UNIQUE (request_id)`; `CHECK ((status = ANY (ARRAY['pending'::text, 'contacted'::text, 'closed'::text])))`; `CHECK ((length(tax_id) <= 80))`.
**Indexes baseline:** `product_enterprise_email_time`, `product_enterprise_requests_pkey`, `product_enterprise_requests_request_id_key`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `request_id uuid NOT NULL`, `company text NOT NULL`, `tax_id text NOT NULL`, `employees text NOT NULL`, `email text NOT NULL`, `status text NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## product_governance_config

**DEPRECATE CANDIDATE — độ tin cậy Trung bình.** Singleton JSON config có revision; hiện không thấy consumer runtime hoặc SQL business.

Có DDL và export opt-in; không thấy business consumer trong runtime, function closure, trigger/policy. Xác minh external admin/BI và live rows trước retirement.

**Phụ thuộc FK ra:** updated_by → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:12](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:41](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `CHECK (id)`; `PRIMARY KEY (id)`.
**Indexes baseline:** `product_governance_config_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id boolean NOT NULL`, `config jsonb NOT NULL`, `revision integer NOT NULL`, `updated_by uuid NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## product_learner_context

**KEEP — độ tin cậy Cao.** Tài liệu upload riêng theo owner/class/lesson, hash chống trùng; không phải SOP dùng chung.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; lesson_id → lessons.id; owner_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:150](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 150, 227, 230.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:51](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 51.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `CHECK (((length(content) >= 1) AND (length(content) <= 100000)))`; `UNIQUE (owner_id, class_id, lesson_id, content_hash)`; `PRIMARY KEY (id)`.
**Indexes baseline:** `product_learner_context_owner_id_class_id_lesson_id_content_key`, `product_learner_context_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `owner_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `title text NOT NULL`, `content text NOT NULL`, `content_hash text NOT NULL`, `chunks jsonb NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## product_learner_support

**KEEP — độ tin cậy Cao.** Bằng chứng mở hints/solution và reflection theo learner/class/lesson/kind.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; learner_id → learners.id; lesson_id → lessons.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:121](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 121.

**SQL functions có tham chiếu:** `product_unlock_support`, `product_unlock_support_reflected`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/verify_product_live.ts:52](../../apps/promptify-intrepid/scripts/verify_product_live.ts).

**Keys/constraints:** `CHECK ((kind = ANY (ARRAY['hints'::text, 'solution'::text])))`; `PRIMARY KEY (learner_id, class_id, lesson_id, kind)`.
**Indexes baseline:** `product_learner_support_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `learner_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `kind text NOT NULL`, `created_at timestamp with time zone NOT NULL`, `reflection text NULL`.

## product_profile_corrections

**KEEP — độ tin cậy Cao.** Request sửa hồ sơ/phòng ban, idempotency và lịch sử chuyển workspace.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** user_id → users.id; source_class_id → classes.id; target_class_id → classes.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:96](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 96, 186.

**SQL functions có tham chiếu:** `product_request_correction`, `product_auto_correct_department`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/apply_department_correction_migration.mjs:20](../../apps/promptify-intrepid/scripts/apply_department_correction_migration.mjs); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:30](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_cloud_export.mjs:7](../../apps/promptify-intrepid/tests/verify_cloud_export.mjs); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:56](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts); [apps/promptify-intrepid/tests/verify_vercel_compat.ts:13](../../apps/promptify-intrepid/tests/verify_vercel_compat.ts).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK (((length(btrim(reason)) >= 2) AND (length(btrim(reason)) <= 2000)))`; `CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text])))`; `UNIQUE (user_id, request_id)`.
**Indexes baseline:** `product_profile_corrections_pkey`, `product_profile_corrections_user_id_request_id_key`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.
Source 050/GCP 005 thêm assigned_department, requested_department, source_class_id, target_class_id, auto_approved; 2 FK mới không được baseline catalog ghi nhận.

**Cột baseline:** `id uuid NOT NULL`, `user_id uuid NOT NULL`, `request_id uuid NOT NULL`, `reason text NOT NULL`, `status text NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## product_prompt_drafts

**KEEP — độ tin cậy Cao.** Autosave mutable theo user/class/lesson với optimistic revision.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; lesson_id → lessons.id; user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:140](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 140.

**SQL functions có tham chiếu:** `product_save_draft`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `PRIMARY KEY (user_id, class_id, lesson_id)`; `CHECK ((length(prompt) <= 24000))`.
**Indexes baseline:** `product_prompt_drafts_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `user_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `prompt text NOT NULL`, `revision integer NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## product_prompt_library

**KEEP — độ tin cậy Cao.** Prompt được lưu, settings/variables/score snapshot và workflow chia sẻ/duyệt.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** attempt_id → prompt_attempts.id; class_id → classes.id; lesson_id → lessons.id; owner_id → users.id; reviewed_by → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:147](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 147, 211, 213, 218.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `CHECK (((length(btrim(category)) >= 1) AND (length(btrim(category)) <= 160)))`; `UNIQUE (owner_id, request_id)`; `PRIMARY KEY (id)`; `CHECK (((length(prompt) >= 1) AND (length(prompt) <= 24000)))`; `CHECK ((status = ANY (ARRAY['personal'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))`; `CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 200)))`.
**Indexes baseline:** `product_prompt_library_owner_id_request_id_key`, `product_prompt_library_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `owner_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `attempt_id uuid NULL`, `request_id uuid NOT NULL`, `title text NOT NULL`, `prompt text NOT NULL`, `settings jsonb NOT NULL`, `variables jsonb NOT NULL`, `score numeric NULL`, `status text NOT NULL`, `reviewed_by uuid NULL`, `review_reason text NULL`, `created_at timestamp with time zone NOT NULL`, `category text NOT NULL`.

## product_request_budgets

**KEEP — độ tin cậy Cao.** Bộ đếm quota theo actor/operation/time bucket, cần update atomic.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** actor_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** `product_take_budget`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:42](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `PRIMARY KEY (actor_id, operation, bucket)`.
**Indexes baseline:** `product_request_budgets_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `actor_id uuid NOT NULL`, `operation text NOT NULL`, `bucket timestamp with time zone NOT NULL`, `count integer NOT NULL`.

## product_roster_profiles

**MERGE CANDIDATE — độ tin cậy Trung bình.** Country/department của roster theo user/class; metadata membership bị tách riêng.

Có thể đưa country + imported_department vào enrollments sau đối soát orphan, snapshot và mọi import RPC; không xóa department lịch sử.

**Phụ thuộc FK ra:** class_id → classes.id; user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** `product_import_roster`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `PRIMARY KEY (user_id, class_id)`.
**Indexes baseline:** `product_roster_profiles_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `user_id uuid NOT NULL`, `class_id uuid NOT NULL`, `country text NOT NULL`, `department text NOT NULL`, `updated_at timestamp with time zone NOT NULL`.

## product_rotation_approvals

**NEEDS INVESTIGATION — độ tin cậy Trung bình.** Nhiều người approve một rotation; không thể thay bằng một approved_by.

Giữ multi-approver nếu rotation còn dùng; đánh giá cùng requests, không gộp approvals vào singleton config.

**Phụ thuộc FK ra:** request_id → product_rotation_requests.id; user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:439](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 439.

**SQL functions có tham chiếu:** `product_approve_rotation`, `product_finish_rotation`, `product_request_rotation`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/apply_approved_rotation.ts:15](../../apps/promptify-intrepid/scripts/apply_approved_rotation.ts); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:25](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `PRIMARY KEY (request_id, user_id)`.
**Indexes baseline:** `product_rotation_approvals_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `request_id uuid NOT NULL`, `user_id uuid NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## product_rotation_requests

**NEEDS INVESTIGATION — độ tin cậy Trung bình.** Workflow rotate secret có fingerprint, state và deployment receipt.

GCP template dùng IAM cho AI/Workspace nhưng API rotation và maintenance apply còn tồn tại; xác nhận fallback secret có được duy trì.

**Phụ thuộc FK ra:** class_id → classes.id; requested_by → users.id.
**Bảng tham chiếu đến:** product_rotation_approvals.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:433](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 433, 439.

**SQL functions có tham chiếu:** `product_approve_rotation`, `product_finish_rotation`, `product_request_rotation`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/apply_approved_rotation.ts:15](../../apps/promptify-intrepid/scripts/apply_approved_rotation.ts); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:25](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK ((provider = ANY (ARRAY['gemini'::text, 'sheets'::text])))`; `CHECK (((length(btrim(reason)) >= 1) AND (length(btrim(reason)) <= 1000)))`; `CHECK ((source_fingerprint ~ '^[a-f0-9]{64}$'::text))`; `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'applied'::text, 'cancelled'::text])))`.
**Indexes baseline:** `product_rotation_requests_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NOT NULL`, `provider text NOT NULL`, `source_fingerprint text NOT NULL`, `requested_by uuid NOT NULL`, `reason text NOT NULL`, `status text NOT NULL`, `created_at timestamp with time zone NOT NULL`, `applied_at timestamp with time zone NULL`, `deployment_id text NULL`.

## product_sandbox_runs

**KEEP — độ tin cậy Cao.** Run thử của trainer, không tạo progress/award learner.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** actor_id → users.id; class_id → classes.id; lesson_id → lessons.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:347](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 347, 357, 359, 364, 368, 371.

**SQL functions có tham chiếu:** `product_limit_ai_run`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `PRIMARY KEY (actor_id, request_id)`.
**Indexes baseline:** `product_sandbox_runs_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `actor_id uuid NOT NULL`, `request_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `prompt text NOT NULL`, `snapshot jsonb NOT NULL`, `result jsonb NULL`, `evaluation jsonb NULL`, `judge_claim uuid NULL`, `created_at timestamp with time zone NOT NULL`.

## product_session_controls

**KEEP — độ tin cậy Cao.** Freeze/end lớp và revision, độc lập lifecycle class.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; updated_by → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:111](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 111, 439.

**SQL functions có tham chiếu:** `product_guard_new_run`, `product_session_control`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `PRIMARY KEY (class_id)`; `CHECK ((state = ANY (ARRAY['active'::text, 'frozen'::text, 'ended'::text])))`.
**Indexes baseline:** `product_session_controls_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `class_id uuid NOT NULL`, `state text NOT NULL`, `revision integer NOT NULL`, `updated_at timestamp with time zone NOT NULL`, `updated_by uuid NOT NULL`.

## product_sheet_connections

**KEEP — độ tin cậy Cao.** Nguồn roster Sheets, mapping, lịch auto_sync và trạng thái kết nối.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; created_by → users.id.
**Bảng tham chiếu đến:** product_sync_logs.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:137](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 137, 413, 420.

**SQL functions có tham chiếu:** `product_claim_roster_sync`, `product_finish_roster_sync`, `product_save_sheet`, `product_set_sheet_auto_sync`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/setup_roster_trial.ts:43](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts).

**Keys/constraints:** `UNIQUE (class_id, sheet_id)`; `PRIMARY KEY (id)`; `CHECK ((sheet_id ~ '^[A-Za-z0-9_-]+$'::text))`.
**Indexes baseline:** `product_sheet_connections_class_id_sheet_id_key`, `product_sheet_connections_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NOT NULL`, `sheet_id text NOT NULL`, `name text NOT NULL`, `column_mapping jsonb NOT NULL`, `status text NOT NULL`, `last_synced_at timestamp with time zone NULL`, `created_by uuid NOT NULL`, `auto_sync boolean NOT NULL`, `last_attempt_at timestamp with time zone NULL`.

## product_sop_chunks

**KEEP — độ tin cậy Cao.** Chunk/search projection canonical theo SOP version, vector 768 và model.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** version_id → rebuild_sop_versions.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:16](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 16, 34.
- [apps/promptify-intrepid/src/services/cloudSopRetrievalService.ts:12](../../apps/promptify-intrepid/src/services/cloudSopRetrievalService.ts): lines 12.
- [apps/promptify-intrepid/src/services/productionServerService.ts:129](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 129, 254, 258.

**SQL functions có tham chiếu:** `product_publish_contribution`, `intrepid_search_sop`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:24](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/reembed_target_sops.ts:5](../../apps/promptify-intrepid/scripts/reembed_target_sops.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:77](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `CHECK (((length(content) >= 1) AND (length(content) <= 2000)))`; `CHECK (((jsonb_typeof(embedding) = 'array'::text) AND (jsonb_array_length(embedding) = 768)))`; `PRIMARY KEY (version_id, "position")`; `CHECK ((("position" >= 1) AND ("position" <= 60)))`.
**Indexes baseline:** `product_sop_chunks_pkey`.
GCP 004 thêm generated `embedding_vector vector(768)` và HNSW; JSONB gốc vẫn được giữ.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `version_id uuid NOT NULL`, `position integer NOT NULL`, `page integer NULL`, `content text NOT NULL`, `embedding jsonb NOT NULL`, `model text NOT NULL`, `indexed_at timestamp with time zone NOT NULL`.

## product_sop_contributions

**KEEP — độ tin cậy Cao.** Staging intake/review/indexing claim trước khi publish SOP version.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** actor_id → users.id; class_id → classes.id; document_id → rebuild_sop_documents.id; lesson_id → lessons.id; reviewed_by → users.id; version_id → rebuild_sop_versions.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:18](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 18.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:9](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 9, 16, 34.
- [apps/promptify-intrepid/src/services/productionServerService.ts:130](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 130, 132, 196, 236, 238, 301, 320, 324, 326, 329, 334, 338, 341.

**SQL functions có tham chiếu:** `product_publish_contribution`, `intrepid_search_sop`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/diagnose_sop_publish.ts:7](../../apps/promptify-intrepid/scripts/diagnose_sop_publish.ts); [apps/promptify-intrepid/scripts/migrate_sop_files.mjs:7](../../apps/promptify-intrepid/scripts/migrate_sop_files.mjs); [apps/promptify-intrepid/scripts/verify_product_live.ts:47](../../apps/promptify-intrepid/scripts/verify_product_live.ts).

**Keys/constraints:** `UNIQUE (actor_id, request_id)`; `CHECK (((length(content) >= 1) AND (length(content) <= 100000)))`; `PRIMARY KEY (id)`; `CHECK ((status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text])))`; `CHECK (((length(btrim(title)) >= 2) AND (length(btrim(title)) <= 160)))`.
**Indexes baseline:** `product_sop_contributions_actor_id_request_id_key`, `product_sop_contributions_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `actor_id uuid NOT NULL`, `request_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `document_id uuid NULL`, `title text NOT NULL`, `content text NOT NULL`, `metadata jsonb NOT NULL`, `chunks jsonb NOT NULL`, `status text NOT NULL`, `version_id uuid NULL`, `reviewed_by uuid NULL`, `review_reason text NULL`, `indexing_claim uuid NULL`, `indexed_chunks jsonb NULL`, `created_at timestamp with time zone NOT NULL`.

## product_studio

**KEEP — độ tin cậy Cao.** Config/rubric/awards/schedule riêng theo class/lesson, revision và validator.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; lesson_id → lessons.id; updated_by → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:109](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 109, 351.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:31](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 31.

**SQL functions có tham chiếu:** `product_guard_new_run`, `product_refresh_awards`, `product_save_studio`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `PRIMARY KEY (class_id, lesson_id)`.
**Indexes baseline:** `product_studio_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `revision integer NOT NULL`, `config jsonb NOT NULL`, `updated_at timestamp with time zone NOT NULL`, `updated_by uuid NOT NULL`.

## product_sync_logs

**KEEP — độ tin cậy Cao.** Job đồng bộ Sheets, claim/result/error/timestamp; không đồng nghĩa import ledger.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** actor_id → users.id; class_id → classes.id; connection_id → product_sheet_connections.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:138](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 138, 414, 416, 421, 422.

**SQL functions có tham chiếu:** `product_claim_roster_sync`, `product_finish_roster_sync`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/setup_roster_trial.ts:42](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts).

**Keys/constraints:** `UNIQUE (actor_id, request_id)`; `PRIMARY KEY (id)`; `CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'failed'::text])))`.
**Indexes baseline:** `product_sync_logs_actor_id_request_id_key`, `product_sync_logs_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `connection_id uuid NOT NULL`, `class_id uuid NOT NULL`, `actor_id uuid NOT NULL`, `request_id uuid NOT NULL`, `status text NOT NULL`, `processed integer NULL`, `result jsonb NULL`, `error_code text NULL`, `created_at timestamp with time zone NOT NULL`, `finished_at timestamp with time zone NULL`.

## product_worker_invocations

**KEEP — độ tin cậy Cao.** Nonce replay protection của worker; có purge 7 ngày trong RPC.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** Không có..
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** `product_accept_worker_invocation`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:12](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `PRIMARY KEY (nonce)`.
**Indexes baseline:** `product_worker_invocations_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `nonce uuid NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## prompt_attempts

**KEEP — độ tin cậy Cao.** Sản phẩm run learner: prompt/output/evaluation và threshold đã chụp.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; learner_id → learners.id; lesson_ref_id → lessons.id.
**Bảng tham chiếu đến:** lesson_progress, product_prompt_library, rebuild_judge_claims, rebuild_runs, rebuild_trainer_actions.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudAnalyticsService.ts:15](../../apps/promptify-intrepid/src/services/cloudAnalyticsService.ts): lines 15.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:9](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 9, 12.
- [apps/promptify-intrepid/src/services/productionServerService.ts:112](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 112, 398.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:87](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 87.

**SQL functions có tham chiếu:** `product_analytics`, `product_refresh_awards`, `rebuild_claim_judge`, `rebuild_class_analytics`, `rebuild_class_attempts`, `rebuild_finish_judge`, `rebuild_record_trainer_action`, `rebuild_trainer_action_history`, `record_prompt_attempt_and_progress`, `update_prompt_attempt_evaluation_and_progress`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:25](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/verify_product_live.ts:115](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts:33](../../apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:99](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts); [apps/promptify-intrepid/tests/verify_progress_migration_staging.ts:55](../../apps/promptify-intrepid/tests/verify_progress_migration_staging.ts); [apps/promptify-intrepid/tests/verify_rebuild_runs.ts:17](../../apps/promptify-intrepid/tests/verify_rebuild_runs.ts).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK (((production_pass_threshold >= (0)::numeric) AND (production_pass_threshold <= (10)::numeric)))`.
**Indexes baseline:** `idx_prompt_attempts_class_lesson`, `idx_prompt_attempts_created`, `idx_prompt_attempts_learner`, `idx_prompt_attempts_lesson_ref`, `prompt_attempts_pkey`.
**RLS/grants baseline:** Authenticated users can insert prompt attempts [authenticated] INSERT; Instructors can delete prompt attempts [authenticated] DELETE; Learners and instructors can update prompt attempts [authenticated] UPDATE; gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `learner_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id text NOT NULL`, `attempt_number integer NOT NULL`, `prompt_text text NOT NULL`, `ai_output text NOT NULL`, `evaluation_json jsonb NULL`, `model text NOT NULL`, `latency_ms integer NULL`, `created_at timestamp with time zone NULL`, `lesson_ref_id uuid NULL`, `production_pass_threshold numeric NULL`.

## rebuild_judge_claims

**KEEP — độ tin cậy Cao.** Claim đánh giá một attempt, ngăn provider call trùng; lifecycle riêng.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** attempt_id → prompt_attempts.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:99](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 99.

**SQL functions có tham chiếu:** `rebuild_claim_judge`, `rebuild_finish_judge`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:25](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts:34](../../apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts).

**Keys/constraints:** `UNIQUE (claim_id)`; `PRIMARY KEY (attempt_id)`.
**Indexes baseline:** `rebuild_judge_claims_claim_id_key`, `rebuild_judge_claims_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `attempt_id uuid NOT NULL`, `subject uuid NOT NULL`, `claim_id uuid NOT NULL`, `claimed_at timestamp with time zone NOT NULL`, `completed_at timestamp with time zone NULL`.

## rebuild_roster_imports

**KEEP — độ tin cậy Cao.** Ledger idempotency import theo actor/request và original rows/result.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** actor_id → users.id; class_id → classes.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** `product_import_roster`, `rebuild_import_roster`.
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `UNIQUE (actor_id, request_id)`; `PRIMARY KEY (id)`.
**Indexes baseline:** `rebuild_roster_imports_actor_id_request_id_key`, `rebuild_roster_imports_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NOT NULL`, `actor_id uuid NOT NULL`, `request_id uuid NOT NULL`, `rows_json jsonb NOT NULL`, `result jsonb NULL`, `created_at timestamp with time zone NOT NULL`.

## rebuild_runs

**KEEP — độ tin cậy Cao.** Request/provider lifecycle, snapshot curriculum và request idempotency trước khi có attempt.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** attempt_id → prompt_attempts.id; class_id → classes.id; lesson_id → lessons.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/governanceTelemetryService.ts:20](../../apps/promptify-intrepid/src/services/governanceTelemetryService.ts): lines 20.
- [apps/promptify-intrepid/src/services/productionServerService.ts:120](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 120.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:76](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 76, 90.

**SQL functions có tham chiếu:** `product_capture_attempt_threshold`, `product_guard_new_run`, `product_limit_ai_run`, `product_limit_basic_run`, `rebuild_begin_run`, `rebuild_claim_judge`, `rebuild_finish_run`.
**Maintenance/test/export:** [apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts:33](../../apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts); [apps/promptify-intrepid/tests/verify_rebuild_runs.ts:17](../../apps/promptify-intrepid/tests/verify_rebuild_runs.ts).

**Keys/constraints:** `PRIMARY KEY (subject, request_id)`.
**Indexes baseline:** `rebuild_runs_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `subject uuid NOT NULL`, `request_id uuid NOT NULL`, `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `prompt text NOT NULL`, `snapshot jsonb NOT NULL`, `attempt_id uuid NULL`, `result jsonb NULL`, `created_at timestamp with time zone NOT NULL`.

## rebuild_sop_bindings

**KEEP — độ tin cậy Cao.** Pin một version của document vào lesson/class; nhiều lesson có thể dùng chung version.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; document_id → rebuild_sop_documents.id; lesson_id → lessons.id; version_id → rebuild_sop_versions.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:16](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 16, 34.
- [apps/promptify-intrepid/src/services/productionServerService.ts:126](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 126, 252.

**SQL functions có tham chiếu:** `rebuild_class_sops`, `rebuild_publish_sop`.
**Maintenance/test/export:** [apps/promptify-intrepid/tests/verify_cloud_migration.ts:92](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** `PRIMARY KEY (class_id, lesson_id, document_id)`.
**Indexes baseline:** `rebuild_sop_bindings_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `class_id uuid NOT NULL`, `lesson_id uuid NOT NULL`, `document_id uuid NOT NULL`, `version_id uuid NOT NULL`.

## rebuild_sop_documents

**KEEP — độ tin cậy Cao.** Identity SOP theo class; title/creator, không gộp với version history.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; created_by → users.id.
**Bảng tham chiếu đến:** product_sop_contributions, rebuild_sop_bindings, rebuild_sop_versions.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:16](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 16.
- [apps/promptify-intrepid/src/services/productionServerService.ts:125](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 125, 259, 319.

**SQL functions có tham chiếu:** `rebuild_class_sops`, `rebuild_publish_sop`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:24](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/reembed_target_sops.ts:4](../../apps/promptify-intrepid/scripts/reembed_target_sops.ts).

**Keys/constraints:** `PRIMARY KEY (id)`; `CHECK (((length(btrim(title)) >= 2) AND (length(btrim(title)) <= 160)))`.
**Indexes baseline:** `rebuild_sop_documents_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NOT NULL`, `title text NOT NULL`, `created_by uuid NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## rebuild_sop_versions

**KEEP — độ tin cậy Cao.** Nội dung SOP bất biến theo document/version; lịch sử citation.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** created_by → users.id; document_id → rebuild_sop_documents.id.
**Bảng tham chiếu đến:** product_sop_chunks, product_sop_contributions, rebuild_sop_bindings.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:16](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 16, 33, 34.
- [apps/promptify-intrepid/src/services/productionServerService.ts:128](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 128, 259.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:28](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 28, 63, 64, 75.

**SQL functions có tham chiếu:** `rebuild_class_sops`, `rebuild_publish_sop`, `gcp_queue_projection`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:24](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/reembed_target_sops.ts:4](../../apps/promptify-intrepid/scripts/reembed_target_sops.ts).

**Keys/constraints:** `CHECK (((length(content) >= 1) AND (length(content) <= 100000)))`; `UNIQUE (document_id, version)`; `PRIMARY KEY (id)`; `CHECK ((version > 0))`.
**Indexes baseline:** `rebuild_sop_versions_document_id_version_key`, `rebuild_sop_versions_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `document_id uuid NOT NULL`, `version integer NOT NULL`, `content text NOT NULL`, `created_by uuid NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## rebuild_trainer_actions

**KEEP — độ tin cậy Cao.** Note/clearance theo attempt có actor/request; không phải global audit.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** actor_id → users.id; attempt_id → prompt_attempts.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:139](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 139.

**SQL functions có tham chiếu:** `rebuild_record_trainer_action`, `rebuild_trainer_action_history`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:25](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `CHECK ((action = ANY (ARRAY['note'::text, 'clearance'::text])))`; `UNIQUE (actor_id, request_id)`; `PRIMARY KEY (id)`; `CHECK (((length(btrim(reason)) >= 2) AND (length(btrim(reason)) <= 2000)))`.
**Indexes baseline:** `rebuild_trainer_actions_actor_id_request_id_key`, `rebuild_trainer_actions_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `attempt_id uuid NOT NULL`, `actor_id uuid NOT NULL`, `request_id uuid NOT NULL`, `action text NOT NULL`, `reason text NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## trainer_hints

**KEEP — độ tin cậy Cao.** Message riêng cho learner, không được gộp broadcast nếu làm yếu recipient policy.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; learner_id → learners.id; trainer_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/productionServerService.ts:136](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 136, 395.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** Không thấy trong phạm vi app..

**Keys/constraints:** `CHECK (((length(btrim(message)) >= 1) AND (length(btrim(message)) <= 2000)))`; `PRIMARY KEY (id)`.
**Indexes baseline:** `trainer_hints_learner_id_class_id_created_at_idx`, `trainer_hints_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; hint_read [authenticated] SELECT; hint_send [authenticated] INSERT. Authenticated quyền bảng: INSERT, SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NOT NULL`, `learner_id uuid NOT NULL`, `trainer_id uuid NOT NULL`, `message text NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## user_tutorial_progress

**DEPRECATE CANDIDATE — độ tin cậy Thấp–trung bình.** Tutorial hoàn tất theo user/key; được migration/export giữ nhưng chưa có consumer Intrepid runtime.

Không có đường onboarding/tutorial Intrepid ghi/đọc bảng; export vẫn bảo tồn và MVP có thể dùng. Chỉ retirement ở target riêng sau xác nhận feature và preservation.

**Phụ thuộc FK ra:** user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** Không có trong catalog/patch đã đọc..
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:42](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `PRIMARY KEY (user_id, tutorial_key)`; `CHECK ((tutorial_key ~ '^[a-z0-9_]+$'::text))`.
**Indexes baseline:** `user_tutorial_progress_pkey`.
**RLS/grants baseline:** Users insert own tutorial progress [authenticated] INSERT; Users read own tutorial progress [authenticated] SELECT; Users update own tutorial progress [authenticated] UPDATE; gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: INSERT, SELECT, UPDATE.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `user_id uuid NOT NULL`, `tutorial_key text NOT NULL`, `completed_at timestamp with time zone NOT NULL`.

## users

**KEEP — độ tin cậy Cao.** Business identity, global role, email và auth mapping legacy.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** Không có..
**Bảng tham chiếu đến:** course_instructors, courses, gcp_identity_bindings, learners, product_attendance, product_audit, product_class_grants, product_domains, product_governance_config, product_learner_context, product_profile_corrections, product_prompt_drafts, product_prompt_library, product_request_budgets, product_roster_profiles, product_rotation_approvals, product_rotation_requests, product_sandbox_runs, product_session_controls, product_sheet_connections, product_sop_contributions, product_studio, product_sync_logs, rebuild_roster_imports, rebuild_sop_documents, rebuild_sop_versions, rebuild_trainer_actions, trainer_hints, user_tutorial_progress, workshop_message_receipts, workshop_messages.

**Đường code/runtime:**
- [apps/promptify-intrepid/src/components/rebuild/ProductionGovernanceSource.tsx:20](../../apps/promptify-intrepid/src/components/rebuild/ProductionGovernanceSource.tsx): lines 20.
- [apps/promptify-intrepid/src/components/rebuild/review-i18n.ts:56](../../apps/promptify-intrepid/src/components/rebuild/review-i18n.ts): lines 56.
- [apps/promptify-intrepid/src/services/apiAuthorizationService.ts:21](../../apps/promptify-intrepid/src/services/apiAuthorizationService.ts): lines 21.
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:21](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 21, 40.
- [apps/promptify-intrepid/src/services/firebaseServerIdentityService.ts:16](../../apps/promptify-intrepid/src/services/firebaseServerIdentityService.ts): lines 16, 18, 25.
- [apps/promptify-intrepid/src/services/productionServerService.ts:37](../../apps/promptify-intrepid/src/services/productionServerService.ts): lines 37, 42, 122, 186, 290.
- [apps/promptify-intrepid/src/services/rebuildRunService.ts:51](../../apps/promptify-intrepid/src/services/rebuildRunService.ts): lines 51, 88.
- [apps/promptify-intrepid/src/services/releaseUiTranslations.ts:25](../../apps/promptify-intrepid/src/services/releaseUiTranslations.ts): lines 25.
- [apps/promptify-intrepid/src/services/sourceUiTextService.ts:54](../../apps/promptify-intrepid/src/services/sourceUiTextService.ts): lines 54.

**SQL functions có tham chiếu:** `current_user_id`, `is_instructor`, `product_approve_rotation`, `product_can_read_class`, `product_can_read_user`, `product_claim_roster_sync`, `product_enroll_basic`, `product_finish_roster_sync`, `product_import_roster`, `product_request_rotation`, `product_save_domain`, `product_set_class_access`, `rebuild_can_manage_class`, `rebuild_can_teach`, `rebuild_class_analytics`, `rebuild_class_attempts`, `rebuild_confirm_profile`, `rebuild_import_roster`, `rebuild_my_profile`, `self_enroll_public_class`, `product_auto_correct_department`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/check_export_bundle.mjs:8](../../apps/promptify-intrepid/scripts/check_export_bundle.mjs); [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:30](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs); [apps/promptify-intrepid/scripts/setup_roster_trial.ts:26](../../apps/promptify-intrepid/scripts/setup_roster_trial.ts); [apps/promptify-intrepid/scripts/verify_product_live.ts:25](../../apps/promptify-intrepid/scripts/verify_product_live.ts); [apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts:33](../../apps/promptify-intrepid/tests/verify_backend_failure_recovery.ts); [apps/promptify-intrepid/tests/verify_cloud_export.mjs:4](../../apps/promptify-intrepid/tests/verify_cloud_export.mjs); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:26](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts); [apps/promptify-intrepid/tests/verify_firebase_identity.ts:7](../../apps/promptify-intrepid/tests/verify_firebase_identity.ts); [apps/promptify-intrepid/tests/verify_progress_migration_staging.ts:35](../../apps/promptify-intrepid/tests/verify_progress_migration_staging.ts); [apps/promptify-intrepid/tests/verify_rebuild_runs.ts:17](../../apps/promptify-intrepid/tests/verify_rebuild_runs.ts).

**Keys/constraints:** `UNIQUE (email)`; `PRIMARY KEY (id)`; `CHECK ((role = ANY (ARRAY['learner'::text, 'instructor'::text, 'head'::text, 'admin'::text])))`.
**Indexes baseline:** `idx_users_email`, `users_email_key`, `users_pkey`.
**RLS/grants baseline:** Users can insert own profile or instructor insert [authenticated] INSERT; Users can update own profile or instructor update [authenticated] UPDATE; gcp_trusted_backend [service_role] ALL; product_scoped_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `email text NOT NULL`, `full_name text NOT NULL`, `role text NOT NULL`, `auth_provider_id text NULL`, `created_at timestamp with time zone NULL`, `updated_at timestamp with time zone NULL`, `profile_confirmed_at timestamp with time zone NULL`.

## workshop_message_receipts

**KEEP — độ tin cậy Cao.** Read receipt theo user/message, inbox SQL đọc trạng thái này.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** message_id → workshop_messages.id; user_id → users.id.
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** `rebuild_ack_workshop_message`, `rebuild_workshop_inbox`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:25](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `PRIMARY KEY (message_id, user_id)`.
**Indexes baseline:** `workshop_message_receipts_pkey`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `message_id uuid NOT NULL`, `user_id uuid NOT NULL`, `read_at timestamp with time zone NOT NULL`.

## workshop_messages

**KEEP — độ tin cậy Cao.** Broadcast theo class/trainer/request; khác private hint.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** class_id → classes.id; trainer_id → users.id.
**Bảng tham chiếu đến:** workshop_message_receipts.

**Đường code/runtime:**
- Không tìm thấy tham chiếu runtime trực tiếp; kiểm tra RPC/trigger bên dưới.

**SQL functions có tham chiếu:** `rebuild_ack_workshop_message`, `rebuild_broadcast`, `rebuild_workshop_inbox`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/export_intrepid_data.mjs:25](../../apps/promptify-intrepid/scripts/export_intrepid_data.mjs).

**Keys/constraints:** `CHECK (((length(btrim(message)) >= 1) AND (length(btrim(message)) <= 2000)))`; `PRIMARY KEY (id)`; `UNIQUE (trainer_id, request_id)`.
**Indexes baseline:** `workshop_messages_class_id_created_at_idx`, `workshop_messages_pkey`, `workshop_messages_trainer_id_request_id_key`.
**RLS/grants baseline:** gcp_trusted_backend [service_role] ALL; workshop_message_read [authenticated] SELECT. Authenticated quyền bảng: SELECT.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột baseline:** `id uuid NOT NULL`, `class_id uuid NOT NULL`, `trainer_id uuid NOT NULL`, `request_id uuid NOT NULL`, `message text NOT NULL`, `created_at timestamp with time zone NOT NULL`.

## gcp_projection_outbox

**KEEP — độ tin cậy Cao.** Event delivery cho Firestore/BQ, claim/retry/dead letter; không phải bảng nghiệp vụ hay audit.

Có trách nhiệm/lifecycle riêng; không có bằng chứng đủ để gộp hoặc loại.

**Phụ thuộc FK ra:** Không có..
**Bảng tham chiếu đến:** Không có..

**Đường code/runtime:**
- [apps/promptify-intrepid/src/services/cloudProjectionService.ts:46](../../apps/promptify-intrepid/src/services/cloudProjectionService.ts): lines 46, 48, 49.

**SQL functions có tham chiếu:** `gcp_queue_projection`.
**Maintenance/test/export:** [apps/promptify-intrepid/scripts/backfill_gcp_projections.mjs:4](../../apps/promptify-intrepid/scripts/backfill_gcp_projections.mjs); [apps/promptify-intrepid/scripts/import_intrepid_data.mjs:12](../../apps/promptify-intrepid/scripts/import_intrepid_data.mjs); [apps/promptify-intrepid/tests/verify_cloud_migration.ts:94](../../apps/promptify-intrepid/tests/verify_cloud_migration.ts).

**Keys/constraints:** PK(id), UNIQUE(event_id), CHECK operation.
**Indexes baseline:** Không có trong baseline catalog..
GCP 002 thêm partial index `(available_at,id)` cho pending và private service_role policy. `class_id/learner_id/previous_version_id` là routing hints, không có FK (cần giữ event sau deletion).
**RLS/grants baseline:** GCP 002 private outbox policy; chưa có trong catalog baseline.. Authenticated quyền bảng: không có; truy cập qua RPC/trusted backend.
**Bằng chứng thực tế:** Chưa có live catalog, live row counts, query statistics hoặc trace production; mọi quyết định ở đây là kiến trúc/source-level.

**Cột:** Xem GCP 002: event id, entity key, routing hints, operation, timestamps, claim, attempts, availability, processed/dead-letter/error.

## Kho dữ liệu phụ của GCP

Template BigQuery khai báo **3 bảng vật lý**: `intrepid_raw.operational_entities` (mirror JSON theo entity), `intrepid_knowledge.version_state` (tombstone/revision), `intrepid_knowledge.sop_chunks` (search projection); **3 views**: fact_attempt, dim_class, fact_progress. Tất cả **NEEDS INVESTIGATION, tin cậy cao về tồn tại code / thấp về nhu cầu scale**: template runtime warehouse=false, analytics=postgres, vector=pgvector; chưa có workload chứng minh phải bật BQ. Không gộp tombstone vào chunks nếu có thể làm replay phục hồi version đã revoke.

Firestore `userUpdates/{uid}/classes/{classId}` là invalidation projection, **KEEP có điều kiện realtime cần thiết**, không chứa business payload và không tham gia tổng bảng SQL. Nếu polling đủ, có thể trì hoãn consumer/trigger/outbox, nhưng chỉ khi không còn consumer và sau backlog reconciliation. Firebase Auth là identity provider; Cloud Storage giữ bytes, metadata nguồn nằm trong contribution; không tự tạo thêm bảng file.
