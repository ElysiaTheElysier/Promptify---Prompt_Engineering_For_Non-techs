# Intrepid — Data dictionary đã dựng trên PostgreSQL

Nguồn: schema gốc + migrations 002–049; không phải dump database live. 48 bảng nguồn + 1 bảng GCP đề xuất. Kiểu/default/constraints bên dưới lấy từ catalog PostgreSQL sau khi dựng candidate, không suy đoán từ TypeScript.

| Bảng | Mục đích | Cột |
|---|---|---|
| `classes` | Lần triển khai một khóa cho một doanh nghiệp/phòng ban. | 10 |
| `clients` | Doanh nghiệp sở hữu các lớp đào tạo. | 4 |
| `course_instructors` | Phân công giảng viên và permission trên khóa. | 4 |
| `course_modules` | Các module trong khóa và thứ tự hiển thị. | 8 |
| `courses` | Chương trình đào tạo, version và trạng thái phát hành. | 11 |
| `enrollments` | Ghi danh học viên vào lớp và trạng thái truy cập. | 6 |
| `gcp_identity_bindings` | BẢNG ĐỀ XUẤT MỚI: map issuer/external subject Google → user UUID và legacy auth subject UUID. | 5 |
| `learners` | Hồ sơ học viên gắn với user, mã học viên nghiệp vụ. | 4 |
| `lesson_progress` | Tiến độ học tập server-backed của học viên theo bài/lớp. | 11 |
| `lesson_resources` | Học liệu/reference của một bài. | 9 |
| `lesson_rubric_criteria` | Tiêu chí rubric và điểm tối đa. | 9 |
| `lessons` | Codelab, tình huống, nội dung, prompt mẫu và trạng thái. | 23 |
| `product_attendance` | Điểm danh theo lớp/bài/học viên. | 7 |
| `product_audit` | Audit nghiệp vụ theo người thao tác/lớp. | 6 |
| `product_awards` | Record badge/certificate thật, issuer và evidence. | 10 |
| `product_class_grants` | Quyền head/contributor theo lớp. | 3 |
| `product_domains` | Domain được phép theo doanh nghiệp. | 5 |
| `product_enterprise_requests` | Yêu cầu B2B từ landing; dữ liệu lead, không mặc nhiên thuộc Intrepid. | 8 |
| `product_governance_config` | Cấu hình governance singleton; cần review khi tách dữ liệu. | 5 |
| `product_learner_context` | Context riêng do học viên upload, chunks và content hash. | 9 |
| `product_learner_support` | Lịch sử mở hint/solution/reflection. | 6 |
| `product_profile_corrections` | Yêu cầu sửa hồ sơ có trạng thái xử lý. | 6 |
| `product_prompt_drafts` | Nháp prompt theo user/lớp/bài và revision. | 6 |
| `product_prompt_library` | Thư viện prompt cá nhân/chia sẻ và review status. | 16 |
| `product_request_budgets` | Counters quota theo actor/operation/time bucket. | 4 |
| `product_roster_profiles` | Thông tin nhân sự bổ sung từ roster. | 5 |
| `product_rotation_approvals` | Danh sách người phê duyệt rotation. | 3 |
| `product_rotation_requests` | Yêu cầu rotation provider và audit deployment. | 10 |
| `product_sandbox_runs` | Bằng chứng chạy/thử Judge trong authoring sandbox. | 10 |
| `product_session_controls` | Trạng thái active/frozen/ended của workshop. | 5 |
| `product_sheet_connections` | Kết nối Google Sheet, mapping và trạng thái sync. | 10 |
| `product_sop_chunks` | Các đoạn SOP và embeddings gắn với version. | 7 |
| `product_sop_contributions` | Đóng góp/yêu cầu SOP, review và metadata file. | 17 |
| `product_studio` | JSON config giáo trình, rubric, awards và revision. | 6 |
| `product_sync_logs` | Kết quả/lỗi/idempotency của đồng bộ roster. | 11 |
| `product_worker_invocations` | Nonce chống replay của worker hiện tại. | 2 |
| `prompt_attempts` | Prompt, output, evaluation, model và thời gian từng lần thử. | 13 |
| `rebuild_judge_claims` | Claim chấm điểm nhằm tránh chấm trùng/đồng thời. | 5 |
| `rebuild_roster_imports` | Lịch sử/idempotency import roster. | 7 |
| `rebuild_runs` | Request idempotency và snapshot chạy AI; giữ nguyên subject UUID. | 9 |
| `rebuild_sop_bindings` | Gắn version SOP vào bài/lớp. | 4 |
| `rebuild_sop_documents` | Danh tính tài liệu SOP thuộc lớp. | 5 |
| `rebuild_sop_versions` | Nội dung/version SOP; không ghi đè lịch sử. | 6 |
| `rebuild_trainer_actions` | Ghi chú/hành động can thiệp có bằng chứng. | 7 |
| `trainer_hints` | Coaching riêng theo học viên/lớp. | 6 |
| `user_tutorial_progress` | Trạng thái tutorial kế thừa; giữ để không mất tương thích. | 3 |
| `users` | Tài khoản nghiệp vụ và role; không chứa password/session của Identity Platform. | 8 |
| `workshop_message_receipts` | Trạng thái nhận/đọc thông báo. | 3 |
| `workshop_messages` | Thông báo workshop theo lớp. | 6 |

## classes

Lần triển khai một khóa cho một doanh nghiệp/phòng ban.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_code` | `text` | NO | `—` |
| `course_id` | `uuid` | NO | `—` |
| `client_id` | `uuid` | NO | `—` |
| `department` | `text` | NO | `—` |
| `start_date` | `timestamptz` | NO | `—` |
| `end_date` | `timestamptz` | NO | `—` |
| `status` | `text` | NO | `'active'::text` |
| `enrollment_mode` | `text` | NO | `'instructor'::text` |
| `created_at` | `timestamptz` | YES | `now()` |

Constraints:

- `classes_class_code_key`: `UNIQUE (class_code)`
- `classes_class_code_not_null`: `NOT NULL class_code`
- `classes_client_id_fkey`: `FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT`
- `classes_client_id_not_null`: `NOT NULL client_id`
- `classes_course_id_fkey`: `FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT`
- `classes_course_id_not_null`: `NOT NULL course_id`
- `classes_department_not_null`: `NOT NULL department`
- `classes_end_date_not_null`: `NOT NULL end_date`
- `classes_enrollment_mode_check`: `CHECK ((enrollment_mode = ANY (ARRAY['instructor'::text, 'self_enroll'::text])))`
- `classes_enrollment_mode_not_null`: `NOT NULL enrollment_mode`
- `classes_id_not_null`: `NOT NULL id`
- `classes_pkey`: `PRIMARY KEY (id)`
- `classes_start_date_not_null`: `NOT NULL start_date`
- `classes_status_check`: `CHECK ((status = ANY (ARRAY['active'::text, 'upcoming'::text, 'completed'::text, 'archived'::text])))`
- `classes_status_not_null`: `NOT NULL status`

Indexes:

- `classes_class_code_key`: `CREATE UNIQUE INDEX classes_class_code_key ON public.classes USING btree (class_code)`
- `classes_pkey`: `CREATE UNIQUE INDEX classes_pkey ON public.classes USING btree (id)`
- `idx_classes_client`: `CREATE INDEX idx_classes_client ON public.classes USING btree (client_id)`
- `idx_classes_course`: `CREATE INDEX idx_classes_course ON public.classes USING btree (course_id)`

## clients

Doanh nghiệp sở hữu các lớp đào tạo.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `name` | `text` | NO | `—` |
| `industry` | `text` | NO | `—` |
| `created_at` | `timestamptz` | YES | `now()` |

Constraints:

- `clients_id_not_null`: `NOT NULL id`
- `clients_industry_not_null`: `NOT NULL industry`
- `clients_name_not_null`: `NOT NULL name`
- `clients_pkey`: `PRIMARY KEY (id)`

Indexes:

- `clients_pkey`: `CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id)`

## course_instructors

Phân công giảng viên và permission trên khóa.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `course_id` | `uuid` | NO | `—` |
| `user_id` | `uuid` | NO | `—` |
| `permission` | `text` | NO | `'editor'::text` |
| `assigned_at` | `timestamptz` | NO | `now()` |

Constraints:

- `course_instructors_assigned_at_not_null`: `NOT NULL assigned_at`
- `course_instructors_course_id_fkey`: `FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE`
- `course_instructors_course_id_not_null`: `NOT NULL course_id`
- `course_instructors_permission_check`: `CHECK ((permission = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text])))`
- `course_instructors_permission_not_null`: `NOT NULL permission`
- `course_instructors_pkey`: `PRIMARY KEY (course_id, user_id)`
- `course_instructors_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `course_instructors_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `course_instructors_pkey`: `CREATE UNIQUE INDEX course_instructors_pkey ON public.course_instructors USING btree (course_id, user_id)`
- `idx_course_instructors_user`: `CREATE INDEX idx_course_instructors_user ON public.course_instructors USING btree (user_id)`

## course_modules

Các module trong khóa và thứ tự hiển thị.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `course_id` | `uuid` | NO | `—` |
| `title` | `text` | NO | `—` |
| `description` | `text` | YES | `—` |
| `position` | `int4` | NO | `1` |
| `status` | `text` | NO | `'draft'::text` |
| `created_at` | `timestamptz` | NO | `now()` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `course_modules_course_id_fkey`: `FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE`
- `course_modules_course_id_not_null`: `NOT NULL course_id`
- `course_modules_created_at_not_null`: `NOT NULL created_at`
- `course_modules_id_not_null`: `NOT NULL id`
- `course_modules_pkey`: `PRIMARY KEY (id)`
- `course_modules_position_check`: `CHECK (("position" > 0))`
- `course_modules_position_not_null`: `NOT NULL "position"`
- `course_modules_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`
- `course_modules_status_not_null`: `NOT NULL status`
- `course_modules_title_not_null`: `NOT NULL title`
- `course_modules_updated_at_not_null`: `NOT NULL updated_at`
- `unique_module_position_per_course`: `UNIQUE (course_id, "position")`

Indexes:

- `course_modules_pkey`: `CREATE UNIQUE INDEX course_modules_pkey ON public.course_modules USING btree (id)`
- `idx_course_modules_course`: `CREATE INDEX idx_course_modules_course ON public.course_modules USING btree (course_id, "position")`
- `unique_module_position_per_course`: `CREATE UNIQUE INDEX unique_module_position_per_course ON public.course_modules USING btree (course_id, "position")`

## courses

Chương trình đào tạo, version và trạng thái phát hành.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `title` | `text` | NO | `—` |
| `description` | `text` | YES | `—` |
| `status` | `text` | NO | `'active'::text` |
| `created_by` | `uuid` | YES | `—` |
| `created_at` | `timestamptz` | YES | `now()` |
| `updated_at` | `timestamptz` | YES | `now()` |
| `slug` | `text` | YES | `—` |
| `publication_status` | `text` | NO | `'draft'::text` |
| `version` | `int4` | NO | `1` |
| `published_at` | `timestamptz` | YES | `—` |

Constraints:

- `courses_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
- `courses_id_not_null`: `NOT NULL id`
- `courses_pkey`: `PRIMARY KEY (id)`
- `courses_publication_status_check`: `CHECK ((publication_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`
- `courses_publication_status_not_null`: `NOT NULL publication_status`
- `courses_status_check`: `CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))`
- `courses_status_not_null`: `NOT NULL status`
- `courses_title_not_null`: `NOT NULL title`
- `courses_version_not_null`: `NOT NULL version`

Indexes:

- `courses_pkey`: `CREATE UNIQUE INDEX courses_pkey ON public.courses USING btree (id)`
- `idx_courses_slug_unique`: `CREATE UNIQUE INDEX idx_courses_slug_unique ON public.courses USING btree (slug) WHERE (slug IS NOT NULL)`

## enrollments

Ghi danh học viên vào lớp và trạng thái truy cập.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `learner_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `status` | `text` | NO | `'active'::text` |
| `joined_at` | `timestamptz` | YES | `now()` |
| `updated_at` | `timestamptz` | YES | `now()` |

Constraints:

- `enrollments_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE`
- `enrollments_class_id_not_null`: `NOT NULL class_id`
- `enrollments_id_not_null`: `NOT NULL id`
- `enrollments_learner_id_fkey`: `FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE`
- `enrollments_learner_id_not_null`: `NOT NULL learner_id`
- `enrollments_pkey`: `PRIMARY KEY (id)`
- `enrollments_status_check`: `CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'removed'::text, 'expired'::text])))`
- `enrollments_status_not_null`: `NOT NULL status`
- `unique_learner_class`: `UNIQUE (learner_id, class_id)`

Indexes:

- `enrollments_pkey`: `CREATE UNIQUE INDEX enrollments_pkey ON public.enrollments USING btree (id)`
- `idx_enrollments_class`: `CREATE INDEX idx_enrollments_class ON public.enrollments USING btree (class_id)`
- `idx_enrollments_learner`: `CREATE INDEX idx_enrollments_learner ON public.enrollments USING btree (learner_id)`
- `unique_learner_class`: `CREATE UNIQUE INDEX unique_learner_class ON public.enrollments USING btree (learner_id, class_id)`

## gcp_identity_bindings

BẢNG ĐỀ XUẤT MỚI: map issuer/external subject Google → user UUID và legacy auth subject UUID.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `issuer` | `text` | NO | `—` |
| `external_subject` | `text` | NO | `—` |
| `user_id` | `uuid` | NO | `—` |
| `legacy_subject` | `uuid` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `gcp_identity_bindings_created_at_not_null`: `NOT NULL created_at`
- `gcp_identity_bindings_external_subject_not_null`: `NOT NULL external_subject`
- `gcp_identity_bindings_issuer_not_null`: `NOT NULL issuer`
- `gcp_identity_bindings_legacy_subject_key`: `UNIQUE (legacy_subject)`
- `gcp_identity_bindings_legacy_subject_not_null`: `NOT NULL legacy_subject`
- `gcp_identity_bindings_pkey`: `PRIMARY KEY (issuer, external_subject)`
- `gcp_identity_bindings_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
- `gcp_identity_bindings_user_id_issuer_key`: `UNIQUE (user_id, issuer)`
- `gcp_identity_bindings_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `gcp_identity_bindings_legacy_subject_key`: `CREATE UNIQUE INDEX gcp_identity_bindings_legacy_subject_key ON public.gcp_identity_bindings USING btree (legacy_subject)`
- `gcp_identity_bindings_pkey`: `CREATE UNIQUE INDEX gcp_identity_bindings_pkey ON public.gcp_identity_bindings USING btree (issuer, external_subject)`
- `gcp_identity_bindings_user_id_issuer_key`: `CREATE UNIQUE INDEX gcp_identity_bindings_user_id_issuer_key ON public.gcp_identity_bindings USING btree (user_id, issuer)`

## learners

Hồ sơ học viên gắn với user, mã học viên nghiệp vụ.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `learner_code` | `text` | NO | `generate_learner_code()` |
| `user_id` | `uuid` | NO | `—` |
| `created_at` | `timestamptz` | YES | `now()` |

Constraints:

- `learners_id_not_null`: `NOT NULL id`
- `learners_learner_code_key`: `UNIQUE (learner_code)`
- `learners_learner_code_not_null`: `NOT NULL learner_code`
- `learners_pkey`: `PRIMARY KEY (id)`
- `learners_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `learners_user_id_key`: `UNIQUE (user_id)`
- `learners_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `learners_learner_code_key`: `CREATE UNIQUE INDEX learners_learner_code_key ON public.learners USING btree (learner_code)`
- `learners_pkey`: `CREATE UNIQUE INDEX learners_pkey ON public.learners USING btree (id)`
- `learners_user_id_key`: `CREATE UNIQUE INDEX learners_user_id_key ON public.learners USING btree (user_id)`

## lesson_progress

Tiến độ học tập server-backed của học viên theo bài/lớp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `learner_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `status` | `text` | NO | `'not_started'::text` |
| `attempts_count` | `int4` | NO | `0` |
| `best_score` | `numeric` | YES | `—` |
| `last_attempt_id` | `uuid` | YES | `—` |
| `started_at` | `timestamptz` | YES | `—` |
| `completed_at` | `timestamptz` | YES | `—` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `lesson_progress_attempts_count_check`: `CHECK ((attempts_count >= 0))`
- `lesson_progress_attempts_count_not_null`: `NOT NULL attempts_count`
- `lesson_progress_best_score_check`: `CHECK (((best_score IS NULL) OR ((best_score >= (0)::numeric) AND (best_score <= (10)::numeric))))`
- `lesson_progress_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE`
- `lesson_progress_class_id_not_null`: `NOT NULL class_id`
- `lesson_progress_id_not_null`: `NOT NULL id`
- `lesson_progress_last_attempt_id_fkey`: `FOREIGN KEY (last_attempt_id) REFERENCES prompt_attempts(id) ON DELETE SET NULL`
- `lesson_progress_learner_class_lesson_key`: `UNIQUE (learner_id, class_id, lesson_id)`
- `lesson_progress_learner_id_fkey`: `FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE`
- `lesson_progress_learner_id_not_null`: `NOT NULL learner_id`
- `lesson_progress_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE`
- `lesson_progress_lesson_id_not_null`: `NOT NULL lesson_id`
- `lesson_progress_pkey`: `PRIMARY KEY (id)`
- `lesson_progress_status_check`: `CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))`
- `lesson_progress_status_not_null`: `NOT NULL status`
- `lesson_progress_updated_at_not_null`: `NOT NULL updated_at`

Indexes:

- `idx_lesson_progress_class_lesson`: `CREATE INDEX idx_lesson_progress_class_lesson ON public.lesson_progress USING btree (class_id, lesson_id)`
- `idx_lesson_progress_learner_class`: `CREATE INDEX idx_lesson_progress_learner_class ON public.lesson_progress USING btree (learner_id, class_id)`
- `lesson_progress_learner_class_lesson_key`: `CREATE UNIQUE INDEX lesson_progress_learner_class_lesson_key ON public.lesson_progress USING btree (learner_id, class_id, lesson_id)`
- `lesson_progress_pkey`: `CREATE UNIQUE INDEX lesson_progress_pkey ON public.lesson_progress USING btree (id)`

## lesson_resources

Học liệu/reference của một bài.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `lesson_id` | `uuid` | NO | `—` |
| `resource_type` | `text` | NO | `'text'::text` |
| `title` | `text` | NO | `—` |
| `content` | `text` | YES | `—` |
| `url` | `text` | YES | `—` |
| `position` | `int4` | NO | `1` |
| `created_at` | `timestamptz` | NO | `now()` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `lesson_resources_created_at_not_null`: `NOT NULL created_at`
- `lesson_resources_id_not_null`: `NOT NULL id`
- `lesson_resources_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE`
- `lesson_resources_lesson_id_not_null`: `NOT NULL lesson_id`
- `lesson_resources_pkey`: `PRIMARY KEY (id)`
- `lesson_resources_position_check`: `CHECK (("position" > 0))`
- `lesson_resources_position_not_null`: `NOT NULL "position"`
- `lesson_resources_resource_type_check`: `CHECK ((resource_type = ANY (ARRAY['text'::text, 'data'::text, 'url'::text, 'file'::text, 'reference'::text])))`
- `lesson_resources_resource_type_not_null`: `NOT NULL resource_type`
- `lesson_resources_title_not_null`: `NOT NULL title`
- `lesson_resources_updated_at_not_null`: `NOT NULL updated_at`
- `unique_resource_position_per_lesson`: `UNIQUE (lesson_id, "position")`

Indexes:

- `idx_lesson_resources_lesson`: `CREATE INDEX idx_lesson_resources_lesson ON public.lesson_resources USING btree (lesson_id, "position")`
- `lesson_resources_pkey`: `CREATE UNIQUE INDEX lesson_resources_pkey ON public.lesson_resources USING btree (id)`
- `unique_resource_position_per_lesson`: `CREATE UNIQUE INDEX unique_resource_position_per_lesson ON public.lesson_resources USING btree (lesson_id, "position")`

## lesson_rubric_criteria

Tiêu chí rubric và điểm tối đa.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `lesson_id` | `uuid` | NO | `—` |
| `criterion_key` | `text` | NO | `—` |
| `label` | `text` | NO | `—` |
| `description` | `text` | NO | `—` |
| `max_score` | `numeric` | NO | `2` |
| `position` | `int4` | NO | `1` |
| `created_at` | `timestamptz` | NO | `now()` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `lesson_rubric_criteria_created_at_not_null`: `NOT NULL created_at`
- `lesson_rubric_criteria_criterion_key_not_null`: `NOT NULL criterion_key`
- `lesson_rubric_criteria_description_not_null`: `NOT NULL description`
- `lesson_rubric_criteria_id_not_null`: `NOT NULL id`
- `lesson_rubric_criteria_label_not_null`: `NOT NULL label`
- `lesson_rubric_criteria_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE`
- `lesson_rubric_criteria_lesson_id_not_null`: `NOT NULL lesson_id`
- `lesson_rubric_criteria_max_score_check`: `CHECK ((max_score > (0)::numeric))`
- `lesson_rubric_criteria_max_score_not_null`: `NOT NULL max_score`
- `lesson_rubric_criteria_pkey`: `PRIMARY KEY (id)`
- `lesson_rubric_criteria_position_check`: `CHECK (("position" > 0))`
- `lesson_rubric_criteria_position_not_null`: `NOT NULL "position"`
- `lesson_rubric_criteria_updated_at_not_null`: `NOT NULL updated_at`
- `unique_rubric_key_per_lesson`: `UNIQUE (lesson_id, criterion_key)`
- `unique_rubric_position_per_lesson`: `UNIQUE (lesson_id, "position")`

Indexes:

- `idx_lesson_rubrics_lesson`: `CREATE INDEX idx_lesson_rubrics_lesson ON public.lesson_rubric_criteria USING btree (lesson_id, "position")`
- `lesson_rubric_criteria_pkey`: `CREATE UNIQUE INDEX lesson_rubric_criteria_pkey ON public.lesson_rubric_criteria USING btree (id)`
- `unique_rubric_key_per_lesson`: `CREATE UNIQUE INDEX unique_rubric_key_per_lesson ON public.lesson_rubric_criteria USING btree (lesson_id, criterion_key)`
- `unique_rubric_position_per_lesson`: `CREATE UNIQUE INDEX unique_rubric_position_per_lesson ON public.lesson_rubric_criteria USING btree (lesson_id, "position")`

## lessons

Codelab, tình huống, nội dung, prompt mẫu và trạng thái.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `module_id` | `uuid` | NO | `—` |
| `lesson_key` | `text` | NO | `—` |
| `title` | `text` | NO | `—` |
| `badge` | `text` | YES | `—` |
| `focus_skill` | `text` | YES | `—` |
| `scenario` | `text` | YES | `—` |
| `task_goal` | `text` | YES | `—` |
| `concept_title` | `text` | YES | `—` |
| `concept_content` | `text` | YES | `—` |
| `system_instruction` | `text` | YES | `—` |
| `starter_prompt` | `text` | YES | `—` |
| `baseline_prompt` | `text` | YES | `—` |
| `improved_prompt` | `text` | YES | `—` |
| `sample_input_context` | `text` | YES | `—` |
| `prompt_placeholder` | `text` | YES | `—` |
| `expected_output_format` | `text` | YES | `—` |
| `hints` | `jsonb` | NO | `'[]'::jsonb` |
| `focus_components` | `jsonb` | NO | `'[]'::jsonb` |
| `position` | `int4` | NO | `1` |
| `status` | `text` | NO | `'draft'::text` |
| `created_at` | `timestamptz` | NO | `now()` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `lessons_created_at_not_null`: `NOT NULL created_at`
- `lessons_focus_components_is_array`: `CHECK ((jsonb_typeof(focus_components) = 'array'::text))`
- `lessons_focus_components_not_null`: `NOT NULL focus_components`
- `lessons_hints_is_array`: `CHECK ((jsonb_typeof(hints) = 'array'::text))`
- `lessons_hints_not_null`: `NOT NULL hints`
- `lessons_id_not_null`: `NOT NULL id`
- `lessons_lesson_key_not_null`: `NOT NULL lesson_key`
- `lessons_module_id_fkey`: `FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE`
- `lessons_module_id_not_null`: `NOT NULL module_id`
- `lessons_pkey`: `PRIMARY KEY (id)`
- `lessons_position_check`: `CHECK (("position" > 0))`
- `lessons_position_not_null`: `NOT NULL "position"`
- `lessons_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`
- `lessons_status_not_null`: `NOT NULL status`
- `lessons_title_not_null`: `NOT NULL title`
- `lessons_updated_at_not_null`: `NOT NULL updated_at`
- `unique_lesson_key_per_module`: `UNIQUE (module_id, lesson_key)`
- `unique_lesson_position_per_module`: `UNIQUE (module_id, "position")`

Indexes:

- `idx_lessons_module`: `CREATE INDEX idx_lessons_module ON public.lessons USING btree (module_id, "position")`
- `lessons_pkey`: `CREATE UNIQUE INDEX lessons_pkey ON public.lessons USING btree (id)`
- `unique_lesson_key_per_module`: `CREATE UNIQUE INDEX unique_lesson_key_per_module ON public.lessons USING btree (module_id, lesson_key)`
- `unique_lesson_position_per_module`: `CREATE UNIQUE INDEX unique_lesson_position_per_module ON public.lessons USING btree (module_id, "position")`

## product_attendance

Điểm danh theo lớp/bài/học viên.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `learner_id` | `uuid` | NO | `—` |
| `present` | `bool` | NO | `—` |
| `recorded_by` | `uuid` | NO | `—` |
| `reason` | `text` | NO | `—` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_attendance_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_attendance_class_id_not_null`: `NOT NULL class_id`
- `product_attendance_learner_id_fkey`: `FOREIGN KEY (learner_id) REFERENCES learners(id)`
- `product_attendance_learner_id_not_null`: `NOT NULL learner_id`
- `product_attendance_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_attendance_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_attendance_pkey`: `PRIMARY KEY (class_id, lesson_id, learner_id)`
- `product_attendance_present_not_null`: `NOT NULL present`
- `product_attendance_reason_not_null`: `NOT NULL reason`
- `product_attendance_recorded_by_fkey`: `FOREIGN KEY (recorded_by) REFERENCES users(id)`
- `product_attendance_recorded_by_not_null`: `NOT NULL recorded_by`
- `product_attendance_updated_at_not_null`: `NOT NULL updated_at`

Indexes:

- `product_attendance_pkey`: `CREATE UNIQUE INDEX product_attendance_pkey ON public.product_attendance USING btree (class_id, lesson_id, learner_id)`

## product_audit

Audit nghiệp vụ theo người thao tác/lớp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | YES | `—` |
| `actor_id` | `uuid` | NO | `—` |
| `action` | `text` | NO | `—` |
| `reason` | `text` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_audit_action_not_null`: `NOT NULL action`
- `product_audit_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `product_audit_actor_id_not_null`: `NOT NULL actor_id`
- `product_audit_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_audit_created_at_not_null`: `NOT NULL created_at`
- `product_audit_id_not_null`: `NOT NULL id`
- `product_audit_pkey`: `PRIMARY KEY (id)`
- `product_audit_reason_not_null`: `NOT NULL reason`

Indexes:

- `product_audit_pkey`: `CREATE UNIQUE INDEX product_audit_pkey ON public.product_audit USING btree (id)`

## product_awards

Record badge/certificate thật, issuer và evidence.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `learner_id` | `uuid` | NO | `—` |
| `award_key` | `text` | NO | `—` |
| `kind` | `text` | NO | `—` |
| `title` | `text` | NO | `—` |
| `issuer` | `text` | NO | `—` |
| `evidence` | `jsonb` | NO | `—` |
| `issued_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_awards_award_key_not_null`: `NOT NULL award_key`
- `product_awards_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_awards_class_id_lesson_id_learner_id_award_key_key`: `UNIQUE (class_id, lesson_id, learner_id, award_key)`
- `product_awards_class_id_not_null`: `NOT NULL class_id`
- `product_awards_evidence_not_null`: `NOT NULL evidence`
- `product_awards_id_not_null`: `NOT NULL id`
- `product_awards_issued_at_not_null`: `NOT NULL issued_at`
- `product_awards_issuer_not_null`: `NOT NULL issuer`
- `product_awards_kind_check`: `CHECK ((kind = ANY (ARRAY['badge'::text, 'certificate'::text])))`
- `product_awards_kind_not_null`: `NOT NULL kind`
- `product_awards_learner_id_fkey`: `FOREIGN KEY (learner_id) REFERENCES learners(id)`
- `product_awards_learner_id_not_null`: `NOT NULL learner_id`
- `product_awards_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_awards_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_awards_pkey`: `PRIMARY KEY (id)`
- `product_awards_title_not_null`: `NOT NULL title`

Indexes:

- `product_awards_class_id_lesson_id_learner_id_award_key_key`: `CREATE UNIQUE INDEX product_awards_class_id_lesson_id_learner_id_award_key_key ON public.product_awards USING btree (class_id, lesson_id, learner_id, award_key)`
- `product_awards_pkey`: `CREATE UNIQUE INDEX product_awards_pkey ON public.product_awards USING btree (id)`

## product_class_grants

Quyền head/contributor theo lớp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `user_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `permission` | `text` | NO | `—` |

Constraints:

- `product_class_grants_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_class_grants_class_id_not_null`: `NOT NULL class_id`
- `product_class_grants_permission_check`: `CHECK ((permission = ANY (ARRAY['head'::text, 'contributor'::text])))`
- `product_class_grants_permission_not_null`: `NOT NULL permission`
- `product_class_grants_pkey`: `PRIMARY KEY (user_id, class_id)`
- `product_class_grants_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
- `product_class_grants_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `product_class_grants_pkey`: `CREATE UNIQUE INDEX product_class_grants_pkey ON public.product_class_grants USING btree (user_id, class_id)`

## product_domains

Domain được phép theo doanh nghiệp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `client_id` | `uuid` | NO | `—` |
| `domain` | `text` | NO | `—` |
| `active` | `bool` | NO | `true` |
| `updated_by` | `uuid` | NO | `—` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_domains_active_not_null`: `NOT NULL active`
- `product_domains_client_id_fkey`: `FOREIGN KEY (client_id) REFERENCES clients(id)`
- `product_domains_client_id_not_null`: `NOT NULL client_id`
- `product_domains_domain_check`: `CHECK ((domain ~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$'::text))`
- `product_domains_domain_not_null`: `NOT NULL domain`
- `product_domains_pkey`: `PRIMARY KEY (client_id, domain)`
- `product_domains_updated_at_not_null`: `NOT NULL updated_at`
- `product_domains_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES users(id)`
- `product_domains_updated_by_not_null`: `NOT NULL updated_by`

Indexes:

- `product_domains_pkey`: `CREATE UNIQUE INDEX product_domains_pkey ON public.product_domains USING btree (client_id, domain)`

## product_enterprise_requests

Yêu cầu B2B từ landing; dữ liệu lead, không mặc nhiên thuộc Intrepid.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `request_id` | `uuid` | NO | `—` |
| `company` | `text` | NO | `—` |
| `tax_id` | `text` | NO | `''::text` |
| `employees` | `text` | NO | `—` |
| `email` | `text` | NO | `—` |
| `status` | `text` | NO | `'pending'::text` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_enterprise_requests_company_check`: `CHECK (((length(company) >= 2) AND (length(company) <= 200)))`
- `product_enterprise_requests_company_not_null`: `NOT NULL company`
- `product_enterprise_requests_created_at_not_null`: `NOT NULL created_at`
- `product_enterprise_requests_email_check`: `CHECK ((length(email) <= 254))`
- `product_enterprise_requests_email_not_null`: `NOT NULL email`
- `product_enterprise_requests_employees_check`: `CHECK ((employees = ANY (ARRAY['50 - 200 staff'::text, '200 - 1,000 staff'::text, '1,000+ staff'::text])))`
- `product_enterprise_requests_employees_not_null`: `NOT NULL employees`
- `product_enterprise_requests_id_not_null`: `NOT NULL id`
- `product_enterprise_requests_pkey`: `PRIMARY KEY (id)`
- `product_enterprise_requests_request_id_key`: `UNIQUE (request_id)`
- `product_enterprise_requests_request_id_not_null`: `NOT NULL request_id`
- `product_enterprise_requests_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'contacted'::text, 'closed'::text])))`
- `product_enterprise_requests_status_not_null`: `NOT NULL status`
- `product_enterprise_requests_tax_id_check`: `CHECK ((length(tax_id) <= 80))`
- `product_enterprise_requests_tax_id_not_null`: `NOT NULL tax_id`

Indexes:

- `product_enterprise_email_time`: `CREATE INDEX product_enterprise_email_time ON public.product_enterprise_requests USING btree (email, created_at)`
- `product_enterprise_requests_pkey`: `CREATE UNIQUE INDEX product_enterprise_requests_pkey ON public.product_enterprise_requests USING btree (id)`
- `product_enterprise_requests_request_id_key`: `CREATE UNIQUE INDEX product_enterprise_requests_request_id_key ON public.product_enterprise_requests USING btree (request_id)`

## product_governance_config

Cấu hình governance singleton; cần review khi tách dữ liệu.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `bool` | NO | `true` |
| `config` | `jsonb` | NO | `'{}'::jsonb` |
| `revision` | `int4` | NO | `1` |
| `updated_by` | `uuid` | NO | `—` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_governance_config_config_not_null`: `NOT NULL config`
- `product_governance_config_id_check`: `CHECK (id)`
- `product_governance_config_id_not_null`: `NOT NULL id`
- `product_governance_config_pkey`: `PRIMARY KEY (id)`
- `product_governance_config_revision_not_null`: `NOT NULL revision`
- `product_governance_config_updated_at_not_null`: `NOT NULL updated_at`
- `product_governance_config_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES users(id)`
- `product_governance_config_updated_by_not_null`: `NOT NULL updated_by`

Indexes:

- `product_governance_config_pkey`: `CREATE UNIQUE INDEX product_governance_config_pkey ON public.product_governance_config USING btree (id)`

## product_learner_context

Context riêng do học viên upload, chunks và content hash.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `owner_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `title` | `text` | NO | `—` |
| `content` | `text` | NO | `—` |
| `content_hash` | `text` | NO | `—` |
| `chunks` | `jsonb` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_learner_context_chunks_not_null`: `NOT NULL chunks`
- `product_learner_context_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_learner_context_class_id_not_null`: `NOT NULL class_id`
- `product_learner_context_content_check`: `CHECK (((length(content) >= 1) AND (length(content) <= 100000)))`
- `product_learner_context_content_hash_not_null`: `NOT NULL content_hash`
- `product_learner_context_content_not_null`: `NOT NULL content`
- `product_learner_context_created_at_not_null`: `NOT NULL created_at`
- `product_learner_context_id_not_null`: `NOT NULL id`
- `product_learner_context_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_learner_context_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_learner_context_owner_id_class_id_lesson_id_content_key`: `UNIQUE (owner_id, class_id, lesson_id, content_hash)`
- `product_learner_context_owner_id_fkey`: `FOREIGN KEY (owner_id) REFERENCES users(id)`
- `product_learner_context_owner_id_not_null`: `NOT NULL owner_id`
- `product_learner_context_pkey`: `PRIMARY KEY (id)`
- `product_learner_context_title_not_null`: `NOT NULL title`

Indexes:

- `product_learner_context_owner_id_class_id_lesson_id_content_key`: `CREATE UNIQUE INDEX product_learner_context_owner_id_class_id_lesson_id_content_key ON public.product_learner_context USING btree (owner_id, class_id, lesson_id, content_hash)`
- `product_learner_context_pkey`: `CREATE UNIQUE INDEX product_learner_context_pkey ON public.product_learner_context USING btree (id)`

## product_learner_support

Lịch sử mở hint/solution/reflection.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `learner_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `kind` | `text` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |
| `reflection` | `text` | YES | `—` |

Constraints:

- `product_learner_support_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_learner_support_class_id_not_null`: `NOT NULL class_id`
- `product_learner_support_created_at_not_null`: `NOT NULL created_at`
- `product_learner_support_kind_check`: `CHECK ((kind = ANY (ARRAY['hints'::text, 'solution'::text])))`
- `product_learner_support_kind_not_null`: `NOT NULL kind`
- `product_learner_support_learner_id_fkey`: `FOREIGN KEY (learner_id) REFERENCES learners(id)`
- `product_learner_support_learner_id_not_null`: `NOT NULL learner_id`
- `product_learner_support_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_learner_support_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_learner_support_pkey`: `PRIMARY KEY (learner_id, class_id, lesson_id, kind)`

Indexes:

- `product_learner_support_pkey`: `CREATE UNIQUE INDEX product_learner_support_pkey ON public.product_learner_support USING btree (learner_id, class_id, lesson_id, kind)`

## product_profile_corrections

Yêu cầu sửa hồ sơ có trạng thái xử lý.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `user_id` | `uuid` | NO | `—` |
| `request_id` | `uuid` | NO | `—` |
| `reason` | `text` | NO | `—` |
| `status` | `text` | NO | `'pending'::text` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_profile_corrections_created_at_not_null`: `NOT NULL created_at`
- `product_profile_corrections_id_not_null`: `NOT NULL id`
- `product_profile_corrections_pkey`: `PRIMARY KEY (id)`
- `product_profile_corrections_reason_check`: `CHECK (((length(btrim(reason)) >= 2) AND (length(btrim(reason)) <= 2000)))`
- `product_profile_corrections_reason_not_null`: `NOT NULL reason`
- `product_profile_corrections_request_id_not_null`: `NOT NULL request_id`
- `product_profile_corrections_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text])))`
- `product_profile_corrections_status_not_null`: `NOT NULL status`
- `product_profile_corrections_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
- `product_profile_corrections_user_id_not_null`: `NOT NULL user_id`
- `product_profile_corrections_user_id_request_id_key`: `UNIQUE (user_id, request_id)`

Indexes:

- `product_profile_corrections_pkey`: `CREATE UNIQUE INDEX product_profile_corrections_pkey ON public.product_profile_corrections USING btree (id)`
- `product_profile_corrections_user_id_request_id_key`: `CREATE UNIQUE INDEX product_profile_corrections_user_id_request_id_key ON public.product_profile_corrections USING btree (user_id, request_id)`

## product_prompt_drafts

Nháp prompt theo user/lớp/bài và revision.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `user_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `prompt` | `text` | NO | `—` |
| `revision` | `int4` | NO | `1` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_prompt_drafts_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_prompt_drafts_class_id_not_null`: `NOT NULL class_id`
- `product_prompt_drafts_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_prompt_drafts_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_prompt_drafts_pkey`: `PRIMARY KEY (user_id, class_id, lesson_id)`
- `product_prompt_drafts_prompt_check`: `CHECK ((length(prompt) <= 24000))`
- `product_prompt_drafts_prompt_not_null`: `NOT NULL prompt`
- `product_prompt_drafts_revision_not_null`: `NOT NULL revision`
- `product_prompt_drafts_updated_at_not_null`: `NOT NULL updated_at`
- `product_prompt_drafts_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
- `product_prompt_drafts_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `product_prompt_drafts_pkey`: `CREATE UNIQUE INDEX product_prompt_drafts_pkey ON public.product_prompt_drafts USING btree (user_id, class_id, lesson_id)`

## product_prompt_library

Thư viện prompt cá nhân/chia sẻ và review status.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `owner_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `attempt_id` | `uuid` | YES | `—` |
| `request_id` | `uuid` | NO | `—` |
| `title` | `text` | NO | `—` |
| `prompt` | `text` | NO | `—` |
| `settings` | `jsonb` | NO | `'{}'::jsonb` |
| `variables` | `jsonb` | NO | `'[]'::jsonb` |
| `score` | `numeric` | YES | `—` |
| `status` | `text` | NO | `'personal'::text` |
| `reviewed_by` | `uuid` | YES | `—` |
| `review_reason` | `text` | YES | `—` |
| `created_at` | `timestamptz` | NO | `now()` |
| `category` | `text` | NO | `'General'::text` |

Constraints:

- `product_prompt_library_attempt_id_fkey`: `FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)`
- `product_prompt_library_category_check`: `CHECK (((length(btrim(category)) >= 1) AND (length(btrim(category)) <= 160)))`
- `product_prompt_library_category_not_null`: `NOT NULL category`
- `product_prompt_library_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_prompt_library_class_id_not_null`: `NOT NULL class_id`
- `product_prompt_library_created_at_not_null`: `NOT NULL created_at`
- `product_prompt_library_id_not_null`: `NOT NULL id`
- `product_prompt_library_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_prompt_library_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_prompt_library_owner_id_fkey`: `FOREIGN KEY (owner_id) REFERENCES users(id)`
- `product_prompt_library_owner_id_not_null`: `NOT NULL owner_id`
- `product_prompt_library_owner_id_request_id_key`: `UNIQUE (owner_id, request_id)`
- `product_prompt_library_pkey`: `PRIMARY KEY (id)`
- `product_prompt_library_prompt_check`: `CHECK (((length(prompt) >= 1) AND (length(prompt) <= 24000)))`
- `product_prompt_library_prompt_not_null`: `NOT NULL prompt`
- `product_prompt_library_request_id_not_null`: `NOT NULL request_id`
- `product_prompt_library_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES users(id)`
- `product_prompt_library_settings_not_null`: `NOT NULL settings`
- `product_prompt_library_status_check`: `CHECK ((status = ANY (ARRAY['personal'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))`
- `product_prompt_library_status_not_null`: `NOT NULL status`
- `product_prompt_library_title_check`: `CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 200)))`
- `product_prompt_library_title_not_null`: `NOT NULL title`
- `product_prompt_library_variables_not_null`: `NOT NULL variables`

Indexes:

- `product_prompt_library_owner_id_request_id_key`: `CREATE UNIQUE INDEX product_prompt_library_owner_id_request_id_key ON public.product_prompt_library USING btree (owner_id, request_id)`
- `product_prompt_library_pkey`: `CREATE UNIQUE INDEX product_prompt_library_pkey ON public.product_prompt_library USING btree (id)`

## product_request_budgets

Counters quota theo actor/operation/time bucket.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `actor_id` | `uuid` | NO | `—` |
| `operation` | `text` | NO | `—` |
| `bucket` | `timestamptz` | NO | `—` |
| `count` | `int4` | NO | `—` |

Constraints:

- `product_request_budgets_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `product_request_budgets_actor_id_not_null`: `NOT NULL actor_id`
- `product_request_budgets_bucket_not_null`: `NOT NULL bucket`
- `product_request_budgets_count_not_null`: `NOT NULL count`
- `product_request_budgets_operation_not_null`: `NOT NULL operation`
- `product_request_budgets_pkey`: `PRIMARY KEY (actor_id, operation, bucket)`

Indexes:

- `product_request_budgets_pkey`: `CREATE UNIQUE INDEX product_request_budgets_pkey ON public.product_request_budgets USING btree (actor_id, operation, bucket)`

## product_roster_profiles

Thông tin nhân sự bổ sung từ roster.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `user_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `country` | `text` | NO | `—` |
| `department` | `text` | NO | `—` |
| `updated_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_roster_profiles_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_roster_profiles_class_id_not_null`: `NOT NULL class_id`
- `product_roster_profiles_country_not_null`: `NOT NULL country`
- `product_roster_profiles_department_not_null`: `NOT NULL department`
- `product_roster_profiles_pkey`: `PRIMARY KEY (user_id, class_id)`
- `product_roster_profiles_updated_at_not_null`: `NOT NULL updated_at`
- `product_roster_profiles_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
- `product_roster_profiles_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `product_roster_profiles_pkey`: `CREATE UNIQUE INDEX product_roster_profiles_pkey ON public.product_roster_profiles USING btree (user_id, class_id)`

## product_rotation_approvals

Danh sách người phê duyệt rotation.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `request_id` | `uuid` | NO | `—` |
| `user_id` | `uuid` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_rotation_approvals_created_at_not_null`: `NOT NULL created_at`
- `product_rotation_approvals_pkey`: `PRIMARY KEY (request_id, user_id)`
- `product_rotation_approvals_request_id_fkey`: `FOREIGN KEY (request_id) REFERENCES product_rotation_requests(id)`
- `product_rotation_approvals_request_id_not_null`: `NOT NULL request_id`
- `product_rotation_approvals_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
- `product_rotation_approvals_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `product_rotation_approvals_pkey`: `CREATE UNIQUE INDEX product_rotation_approvals_pkey ON public.product_rotation_approvals USING btree (request_id, user_id)`

## product_rotation_requests

Yêu cầu rotation provider và audit deployment.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | NO | `—` |
| `provider` | `text` | NO | `—` |
| `source_fingerprint` | `text` | NO | `—` |
| `requested_by` | `uuid` | NO | `—` |
| `reason` | `text` | NO | `—` |
| `status` | `text` | NO | `'pending'::text` |
| `created_at` | `timestamptz` | NO | `now()` |
| `applied_at` | `timestamptz` | YES | `—` |
| `deployment_id` | `text` | YES | `—` |

Constraints:

- `product_rotation_requests_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_rotation_requests_class_id_not_null`: `NOT NULL class_id`
- `product_rotation_requests_created_at_not_null`: `NOT NULL created_at`
- `product_rotation_requests_id_not_null`: `NOT NULL id`
- `product_rotation_requests_pkey`: `PRIMARY KEY (id)`
- `product_rotation_requests_provider_check`: `CHECK ((provider = ANY (ARRAY['gemini'::text, 'sheets'::text])))`
- `product_rotation_requests_provider_not_null`: `NOT NULL provider`
- `product_rotation_requests_reason_check`: `CHECK (((length(btrim(reason)) >= 1) AND (length(btrim(reason)) <= 1000)))`
- `product_rotation_requests_reason_not_null`: `NOT NULL reason`
- `product_rotation_requests_requested_by_fkey`: `FOREIGN KEY (requested_by) REFERENCES users(id)`
- `product_rotation_requests_requested_by_not_null`: `NOT NULL requested_by`
- `product_rotation_requests_source_fingerprint_check`: `CHECK ((source_fingerprint ~ '^[a-f0-9]{64}$'::text))`
- `product_rotation_requests_source_fingerprint_not_null`: `NOT NULL source_fingerprint`
- `product_rotation_requests_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'applied'::text, 'cancelled'::text])))`
- `product_rotation_requests_status_not_null`: `NOT NULL status`

Indexes:

- `product_rotation_requests_pkey`: `CREATE UNIQUE INDEX product_rotation_requests_pkey ON public.product_rotation_requests USING btree (id)`

## product_sandbox_runs

Bằng chứng chạy/thử Judge trong authoring sandbox.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `actor_id` | `uuid` | NO | `—` |
| `request_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `prompt` | `text` | NO | `—` |
| `snapshot` | `jsonb` | NO | `—` |
| `result` | `jsonb` | YES | `—` |
| `evaluation` | `jsonb` | YES | `—` |
| `judge_claim` | `uuid` | YES | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_sandbox_runs_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `product_sandbox_runs_actor_id_not_null`: `NOT NULL actor_id`
- `product_sandbox_runs_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_sandbox_runs_class_id_not_null`: `NOT NULL class_id`
- `product_sandbox_runs_created_at_not_null`: `NOT NULL created_at`
- `product_sandbox_runs_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_sandbox_runs_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_sandbox_runs_pkey`: `PRIMARY KEY (actor_id, request_id)`
- `product_sandbox_runs_prompt_not_null`: `NOT NULL prompt`
- `product_sandbox_runs_request_id_not_null`: `NOT NULL request_id`
- `product_sandbox_runs_snapshot_not_null`: `NOT NULL snapshot`

Indexes:

- `product_sandbox_runs_pkey`: `CREATE UNIQUE INDEX product_sandbox_runs_pkey ON public.product_sandbox_runs USING btree (actor_id, request_id)`

## product_session_controls

Trạng thái active/frozen/ended của workshop.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `class_id` | `uuid` | NO | `—` |
| `state` | `text` | NO | `—` |
| `revision` | `int4` | NO | `1` |
| `updated_at` | `timestamptz` | NO | `now()` |
| `updated_by` | `uuid` | NO | `—` |

Constraints:

- `product_session_controls_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_session_controls_class_id_not_null`: `NOT NULL class_id`
- `product_session_controls_pkey`: `PRIMARY KEY (class_id)`
- `product_session_controls_revision_not_null`: `NOT NULL revision`
- `product_session_controls_state_check`: `CHECK ((state = ANY (ARRAY['active'::text, 'frozen'::text, 'ended'::text])))`
- `product_session_controls_state_not_null`: `NOT NULL state`
- `product_session_controls_updated_at_not_null`: `NOT NULL updated_at`
- `product_session_controls_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES users(id)`
- `product_session_controls_updated_by_not_null`: `NOT NULL updated_by`

Indexes:

- `product_session_controls_pkey`: `CREATE UNIQUE INDEX product_session_controls_pkey ON public.product_session_controls USING btree (class_id)`

## product_sheet_connections

Kết nối Google Sheet, mapping và trạng thái sync.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | NO | `—` |
| `sheet_id` | `text` | NO | `—` |
| `name` | `text` | NO | `—` |
| `column_mapping` | `jsonb` | NO | `—` |
| `status` | `text` | NO | `'configured'::text` |
| `last_synced_at` | `timestamptz` | YES | `—` |
| `created_by` | `uuid` | NO | `—` |
| `auto_sync` | `bool` | NO | `false` |
| `last_attempt_at` | `timestamptz` | YES | `—` |

Constraints:

- `product_sheet_connections_auto_sync_not_null`: `NOT NULL auto_sync`
- `product_sheet_connections_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_sheet_connections_class_id_not_null`: `NOT NULL class_id`
- `product_sheet_connections_class_id_sheet_id_key`: `UNIQUE (class_id, sheet_id)`
- `product_sheet_connections_column_mapping_not_null`: `NOT NULL column_mapping`
- `product_sheet_connections_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id)`
- `product_sheet_connections_created_by_not_null`: `NOT NULL created_by`
- `product_sheet_connections_id_not_null`: `NOT NULL id`
- `product_sheet_connections_name_not_null`: `NOT NULL name`
- `product_sheet_connections_pkey`: `PRIMARY KEY (id)`
- `product_sheet_connections_sheet_id_check`: `CHECK ((sheet_id ~ '^[A-Za-z0-9_-]+$'::text))`
- `product_sheet_connections_sheet_id_not_null`: `NOT NULL sheet_id`
- `product_sheet_connections_status_not_null`: `NOT NULL status`

Indexes:

- `product_sheet_connections_class_id_sheet_id_key`: `CREATE UNIQUE INDEX product_sheet_connections_class_id_sheet_id_key ON public.product_sheet_connections USING btree (class_id, sheet_id)`
- `product_sheet_connections_pkey`: `CREATE UNIQUE INDEX product_sheet_connections_pkey ON public.product_sheet_connections USING btree (id)`

## product_sop_chunks

Các đoạn SOP và embeddings gắn với version.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `version_id` | `uuid` | NO | `—` |
| `position` | `int4` | NO | `—` |
| `page` | `int4` | YES | `—` |
| `content` | `text` | NO | `—` |
| `embedding` | `jsonb` | NO | `—` |
| `model` | `text` | NO | `'gemini-embedding-001'::text` |
| `indexed_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_sop_chunks_content_check`: `CHECK (((length(content) >= 1) AND (length(content) <= 2000)))`
- `product_sop_chunks_content_not_null`: `NOT NULL content`
- `product_sop_chunks_embedding_check`: `CHECK (((jsonb_typeof(embedding) = 'array'::text) AND (jsonb_array_length(embedding) = 768)))`
- `product_sop_chunks_embedding_not_null`: `NOT NULL embedding`
- `product_sop_chunks_indexed_at_not_null`: `NOT NULL indexed_at`
- `product_sop_chunks_model_not_null`: `NOT NULL model`
- `product_sop_chunks_pkey`: `PRIMARY KEY (version_id, "position")`
- `product_sop_chunks_position_check`: `CHECK ((("position" >= 1) AND ("position" <= 60)))`
- `product_sop_chunks_position_not_null`: `NOT NULL "position"`
- `product_sop_chunks_version_id_fkey`: `FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)`
- `product_sop_chunks_version_id_not_null`: `NOT NULL version_id`

Indexes:

- `product_sop_chunks_pkey`: `CREATE UNIQUE INDEX product_sop_chunks_pkey ON public.product_sop_chunks USING btree (version_id, "position")`

## product_sop_contributions

Đóng góp/yêu cầu SOP, review và metadata file.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `actor_id` | `uuid` | NO | `—` |
| `request_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `document_id` | `uuid` | YES | `—` |
| `title` | `text` | NO | `—` |
| `content` | `text` | NO | `—` |
| `metadata` | `jsonb` | NO | `—` |
| `chunks` | `jsonb` | NO | `—` |
| `status` | `text` | NO | `'pending'::text` |
| `version_id` | `uuid` | YES | `—` |
| `reviewed_by` | `uuid` | YES | `—` |
| `review_reason` | `text` | YES | `—` |
| `indexing_claim` | `uuid` | YES | `—` |
| `indexed_chunks` | `jsonb` | YES | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_sop_contributions_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `product_sop_contributions_actor_id_not_null`: `NOT NULL actor_id`
- `product_sop_contributions_actor_id_request_id_key`: `UNIQUE (actor_id, request_id)`
- `product_sop_contributions_chunks_not_null`: `NOT NULL chunks`
- `product_sop_contributions_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_sop_contributions_class_id_not_null`: `NOT NULL class_id`
- `product_sop_contributions_content_check`: `CHECK (((length(content) >= 1) AND (length(content) <= 100000)))`
- `product_sop_contributions_content_not_null`: `NOT NULL content`
- `product_sop_contributions_created_at_not_null`: `NOT NULL created_at`
- `product_sop_contributions_document_id_fkey`: `FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)`
- `product_sop_contributions_id_not_null`: `NOT NULL id`
- `product_sop_contributions_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_sop_contributions_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_sop_contributions_metadata_not_null`: `NOT NULL metadata`
- `product_sop_contributions_pkey`: `PRIMARY KEY (id)`
- `product_sop_contributions_request_id_not_null`: `NOT NULL request_id`
- `product_sop_contributions_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES users(id)`
- `product_sop_contributions_status_check`: `CHECK ((status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text])))`
- `product_sop_contributions_status_not_null`: `NOT NULL status`
- `product_sop_contributions_title_check`: `CHECK (((length(btrim(title)) >= 2) AND (length(btrim(title)) <= 160)))`
- `product_sop_contributions_title_not_null`: `NOT NULL title`
- `product_sop_contributions_version_id_fkey`: `FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)`

Indexes:

- `product_sop_contributions_actor_id_request_id_key`: `CREATE UNIQUE INDEX product_sop_contributions_actor_id_request_id_key ON public.product_sop_contributions USING btree (actor_id, request_id)`
- `product_sop_contributions_pkey`: `CREATE UNIQUE INDEX product_sop_contributions_pkey ON public.product_sop_contributions USING btree (id)`

## product_studio

JSON config giáo trình, rubric, awards và revision.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `revision` | `int4` | NO | `1` |
| `config` | `jsonb` | NO | `—` |
| `updated_at` | `timestamptz` | NO | `now()` |
| `updated_by` | `uuid` | NO | `—` |

Constraints:

- `product_studio_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_studio_class_id_not_null`: `NOT NULL class_id`
- `product_studio_config_not_null`: `NOT NULL config`
- `product_studio_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `product_studio_lesson_id_not_null`: `NOT NULL lesson_id`
- `product_studio_pkey`: `PRIMARY KEY (class_id, lesson_id)`
- `product_studio_revision_not_null`: `NOT NULL revision`
- `product_studio_updated_at_not_null`: `NOT NULL updated_at`
- `product_studio_updated_by_fkey`: `FOREIGN KEY (updated_by) REFERENCES users(id)`
- `product_studio_updated_by_not_null`: `NOT NULL updated_by`

Indexes:

- `product_studio_pkey`: `CREATE UNIQUE INDEX product_studio_pkey ON public.product_studio USING btree (class_id, lesson_id)`

## product_sync_logs

Kết quả/lỗi/idempotency của đồng bộ roster.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `connection_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `actor_id` | `uuid` | NO | `—` |
| `request_id` | `uuid` | NO | `—` |
| `status` | `text` | NO | `—` |
| `processed` | `int4` | YES | `—` |
| `result` | `jsonb` | YES | `—` |
| `error_code` | `text` | YES | `—` |
| `created_at` | `timestamptz` | NO | `now()` |
| `finished_at` | `timestamptz` | YES | `—` |

Constraints:

- `product_sync_logs_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `product_sync_logs_actor_id_not_null`: `NOT NULL actor_id`
- `product_sync_logs_actor_id_request_id_key`: `UNIQUE (actor_id, request_id)`
- `product_sync_logs_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `product_sync_logs_class_id_not_null`: `NOT NULL class_id`
- `product_sync_logs_connection_id_fkey`: `FOREIGN KEY (connection_id) REFERENCES product_sheet_connections(id)`
- `product_sync_logs_connection_id_not_null`: `NOT NULL connection_id`
- `product_sync_logs_created_at_not_null`: `NOT NULL created_at`
- `product_sync_logs_id_not_null`: `NOT NULL id`
- `product_sync_logs_pkey`: `PRIMARY KEY (id)`
- `product_sync_logs_request_id_not_null`: `NOT NULL request_id`
- `product_sync_logs_status_check`: `CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'failed'::text])))`
- `product_sync_logs_status_not_null`: `NOT NULL status`

Indexes:

- `product_sync_logs_actor_id_request_id_key`: `CREATE UNIQUE INDEX product_sync_logs_actor_id_request_id_key ON public.product_sync_logs USING btree (actor_id, request_id)`
- `product_sync_logs_pkey`: `CREATE UNIQUE INDEX product_sync_logs_pkey ON public.product_sync_logs USING btree (id)`

## product_worker_invocations

Nonce chống replay của worker hiện tại.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `nonce` | `uuid` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `product_worker_invocations_created_at_not_null`: `NOT NULL created_at`
- `product_worker_invocations_nonce_not_null`: `NOT NULL nonce`
- `product_worker_invocations_pkey`: `PRIMARY KEY (nonce)`

Indexes:

- `product_worker_invocations_pkey`: `CREATE UNIQUE INDEX product_worker_invocations_pkey ON public.product_worker_invocations USING btree (nonce)`

## prompt_attempts

Prompt, output, evaluation, model và thời gian từng lần thử.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `learner_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `text` | NO | `—` |
| `attempt_number` | `int4` | NO | `1` |
| `prompt_text` | `text` | NO | `—` |
| `ai_output` | `text` | NO | `—` |
| `evaluation_json` | `jsonb` | YES | `—` |
| `model` | `text` | NO | `'gemini-2.5-flash'::text` |
| `latency_ms` | `int4` | YES | `0` |
| `created_at` | `timestamptz` | YES | `now()` |
| `lesson_ref_id` | `uuid` | YES | `—` |
| `production_pass_threshold` | `numeric` | YES | `—` |

Constraints:

- `prompt_attempts_ai_output_not_null`: `NOT NULL ai_output`
- `prompt_attempts_attempt_number_not_null`: `NOT NULL attempt_number`
- `prompt_attempts_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE`
- `prompt_attempts_class_id_not_null`: `NOT NULL class_id`
- `prompt_attempts_id_not_null`: `NOT NULL id`
- `prompt_attempts_learner_id_fkey`: `FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE`
- `prompt_attempts_learner_id_not_null`: `NOT NULL learner_id`
- `prompt_attempts_lesson_id_not_null`: `NOT NULL lesson_id`
- `prompt_attempts_lesson_ref_id_fkey`: `FOREIGN KEY (lesson_ref_id) REFERENCES lessons(id) ON DELETE SET NULL`
- `prompt_attempts_model_not_null`: `NOT NULL model`
- `prompt_attempts_pkey`: `PRIMARY KEY (id)`
- `prompt_attempts_production_pass_threshold_check`: `CHECK (((production_pass_threshold >= (0)::numeric) AND (production_pass_threshold <= (10)::numeric)))`
- `prompt_attempts_prompt_text_not_null`: `NOT NULL prompt_text`

Indexes:

- `idx_prompt_attempts_class_lesson`: `CREATE INDEX idx_prompt_attempts_class_lesson ON public.prompt_attempts USING btree (class_id, lesson_id)`
- `idx_prompt_attempts_created`: `CREATE INDEX idx_prompt_attempts_created ON public.prompt_attempts USING btree (created_at DESC)`
- `idx_prompt_attempts_learner`: `CREATE INDEX idx_prompt_attempts_learner ON public.prompt_attempts USING btree (learner_id)`
- `idx_prompt_attempts_lesson_ref`: `CREATE INDEX idx_prompt_attempts_lesson_ref ON public.prompt_attempts USING btree (lesson_ref_id)`
- `prompt_attempts_pkey`: `CREATE UNIQUE INDEX prompt_attempts_pkey ON public.prompt_attempts USING btree (id)`

## rebuild_judge_claims

Claim chấm điểm nhằm tránh chấm trùng/đồng thời.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `attempt_id` | `uuid` | NO | `—` |
| `subject` | `uuid` | NO | `—` |
| `claim_id` | `uuid` | NO | `—` |
| `claimed_at` | `timestamptz` | NO | `now()` |
| `completed_at` | `timestamptz` | YES | `—` |

Constraints:

- `rebuild_judge_claims_attempt_id_fkey`: `FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)`
- `rebuild_judge_claims_attempt_id_not_null`: `NOT NULL attempt_id`
- `rebuild_judge_claims_claim_id_key`: `UNIQUE (claim_id)`
- `rebuild_judge_claims_claim_id_not_null`: `NOT NULL claim_id`
- `rebuild_judge_claims_claimed_at_not_null`: `NOT NULL claimed_at`
- `rebuild_judge_claims_pkey`: `PRIMARY KEY (attempt_id)`
- `rebuild_judge_claims_subject_not_null`: `NOT NULL subject`

Indexes:

- `rebuild_judge_claims_claim_id_key`: `CREATE UNIQUE INDEX rebuild_judge_claims_claim_id_key ON public.rebuild_judge_claims USING btree (claim_id)`
- `rebuild_judge_claims_pkey`: `CREATE UNIQUE INDEX rebuild_judge_claims_pkey ON public.rebuild_judge_claims USING btree (attempt_id)`

## rebuild_roster_imports

Lịch sử/idempotency import roster.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | NO | `—` |
| `actor_id` | `uuid` | NO | `—` |
| `request_id` | `uuid` | NO | `—` |
| `rows_json` | `jsonb` | NO | `—` |
| `result` | `jsonb` | YES | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `rebuild_roster_imports_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `rebuild_roster_imports_actor_id_not_null`: `NOT NULL actor_id`
- `rebuild_roster_imports_actor_id_request_id_key`: `UNIQUE (actor_id, request_id)`
- `rebuild_roster_imports_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `rebuild_roster_imports_class_id_not_null`: `NOT NULL class_id`
- `rebuild_roster_imports_created_at_not_null`: `NOT NULL created_at`
- `rebuild_roster_imports_id_not_null`: `NOT NULL id`
- `rebuild_roster_imports_pkey`: `PRIMARY KEY (id)`
- `rebuild_roster_imports_request_id_not_null`: `NOT NULL request_id`
- `rebuild_roster_imports_rows_json_not_null`: `NOT NULL rows_json`

Indexes:

- `rebuild_roster_imports_actor_id_request_id_key`: `CREATE UNIQUE INDEX rebuild_roster_imports_actor_id_request_id_key ON public.rebuild_roster_imports USING btree (actor_id, request_id)`
- `rebuild_roster_imports_pkey`: `CREATE UNIQUE INDEX rebuild_roster_imports_pkey ON public.rebuild_roster_imports USING btree (id)`

## rebuild_runs

Request idempotency và snapshot chạy AI; giữ nguyên subject UUID.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `subject` | `uuid` | NO | `—` |
| `request_id` | `uuid` | NO | `—` |
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `prompt` | `text` | NO | `—` |
| `snapshot` | `jsonb` | NO | `—` |
| `attempt_id` | `uuid` | YES | `—` |
| `result` | `jsonb` | YES | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `rebuild_runs_attempt_id_fkey`: `FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)`
- `rebuild_runs_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `rebuild_runs_class_id_not_null`: `NOT NULL class_id`
- `rebuild_runs_created_at_not_null`: `NOT NULL created_at`
- `rebuild_runs_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `rebuild_runs_lesson_id_not_null`: `NOT NULL lesson_id`
- `rebuild_runs_pkey`: `PRIMARY KEY (subject, request_id)`
- `rebuild_runs_prompt_not_null`: `NOT NULL prompt`
- `rebuild_runs_request_id_not_null`: `NOT NULL request_id`
- `rebuild_runs_snapshot_not_null`: `NOT NULL snapshot`
- `rebuild_runs_subject_not_null`: `NOT NULL subject`

Indexes:

- `rebuild_runs_pkey`: `CREATE UNIQUE INDEX rebuild_runs_pkey ON public.rebuild_runs USING btree (subject, request_id)`

## rebuild_sop_bindings

Gắn version SOP vào bài/lớp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `class_id` | `uuid` | NO | `—` |
| `lesson_id` | `uuid` | NO | `—` |
| `document_id` | `uuid` | NO | `—` |
| `version_id` | `uuid` | NO | `—` |

Constraints:

- `rebuild_sop_bindings_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `rebuild_sop_bindings_class_id_not_null`: `NOT NULL class_id`
- `rebuild_sop_bindings_document_id_fkey`: `FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)`
- `rebuild_sop_bindings_document_id_not_null`: `NOT NULL document_id`
- `rebuild_sop_bindings_lesson_id_fkey`: `FOREIGN KEY (lesson_id) REFERENCES lessons(id)`
- `rebuild_sop_bindings_lesson_id_not_null`: `NOT NULL lesson_id`
- `rebuild_sop_bindings_pkey`: `PRIMARY KEY (class_id, lesson_id, document_id)`
- `rebuild_sop_bindings_version_id_fkey`: `FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)`
- `rebuild_sop_bindings_version_id_not_null`: `NOT NULL version_id`

Indexes:

- `rebuild_sop_bindings_pkey`: `CREATE UNIQUE INDEX rebuild_sop_bindings_pkey ON public.rebuild_sop_bindings USING btree (class_id, lesson_id, document_id)`

## rebuild_sop_documents

Danh tính tài liệu SOP thuộc lớp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | NO | `—` |
| `title` | `text` | NO | `—` |
| `created_by` | `uuid` | NO | `current_user_id()` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `rebuild_sop_documents_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `rebuild_sop_documents_class_id_not_null`: `NOT NULL class_id`
- `rebuild_sop_documents_created_at_not_null`: `NOT NULL created_at`
- `rebuild_sop_documents_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id)`
- `rebuild_sop_documents_created_by_not_null`: `NOT NULL created_by`
- `rebuild_sop_documents_id_not_null`: `NOT NULL id`
- `rebuild_sop_documents_pkey`: `PRIMARY KEY (id)`
- `rebuild_sop_documents_title_check`: `CHECK (((length(btrim(title)) >= 2) AND (length(btrim(title)) <= 160)))`
- `rebuild_sop_documents_title_not_null`: `NOT NULL title`

Indexes:

- `rebuild_sop_documents_pkey`: `CREATE UNIQUE INDEX rebuild_sop_documents_pkey ON public.rebuild_sop_documents USING btree (id)`

## rebuild_sop_versions

Nội dung/version SOP; không ghi đè lịch sử.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `document_id` | `uuid` | NO | `—` |
| `version` | `int4` | NO | `—` |
| `content` | `text` | NO | `—` |
| `created_by` | `uuid` | NO | `current_user_id()` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `rebuild_sop_versions_content_check`: `CHECK (((length(content) >= 1) AND (length(content) <= 100000)))`
- `rebuild_sop_versions_content_not_null`: `NOT NULL content`
- `rebuild_sop_versions_created_at_not_null`: `NOT NULL created_at`
- `rebuild_sop_versions_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id)`
- `rebuild_sop_versions_created_by_not_null`: `NOT NULL created_by`
- `rebuild_sop_versions_document_id_fkey`: `FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)`
- `rebuild_sop_versions_document_id_not_null`: `NOT NULL document_id`
- `rebuild_sop_versions_document_id_version_key`: `UNIQUE (document_id, version)`
- `rebuild_sop_versions_id_not_null`: `NOT NULL id`
- `rebuild_sop_versions_pkey`: `PRIMARY KEY (id)`
- `rebuild_sop_versions_version_check`: `CHECK ((version > 0))`
- `rebuild_sop_versions_version_not_null`: `NOT NULL version`

Indexes:

- `rebuild_sop_versions_document_id_version_key`: `CREATE UNIQUE INDEX rebuild_sop_versions_document_id_version_key ON public.rebuild_sop_versions USING btree (document_id, version)`
- `rebuild_sop_versions_pkey`: `CREATE UNIQUE INDEX rebuild_sop_versions_pkey ON public.rebuild_sop_versions USING btree (id)`

## rebuild_trainer_actions

Ghi chú/hành động can thiệp có bằng chứng.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `attempt_id` | `uuid` | NO | `—` |
| `actor_id` | `uuid` | NO | `current_user_id()` |
| `request_id` | `uuid` | NO | `—` |
| `action` | `text` | NO | `—` |
| `reason` | `text` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `rebuild_trainer_actions_action_check`: `CHECK ((action = ANY (ARRAY['note'::text, 'clearance'::text])))`
- `rebuild_trainer_actions_action_not_null`: `NOT NULL action`
- `rebuild_trainer_actions_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `rebuild_trainer_actions_actor_id_not_null`: `NOT NULL actor_id`
- `rebuild_trainer_actions_actor_id_request_id_key`: `UNIQUE (actor_id, request_id)`
- `rebuild_trainer_actions_attempt_id_fkey`: `FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)`
- `rebuild_trainer_actions_attempt_id_not_null`: `NOT NULL attempt_id`
- `rebuild_trainer_actions_created_at_not_null`: `NOT NULL created_at`
- `rebuild_trainer_actions_id_not_null`: `NOT NULL id`
- `rebuild_trainer_actions_pkey`: `PRIMARY KEY (id)`
- `rebuild_trainer_actions_reason_check`: `CHECK (((length(btrim(reason)) >= 2) AND (length(btrim(reason)) <= 2000)))`
- `rebuild_trainer_actions_reason_not_null`: `NOT NULL reason`
- `rebuild_trainer_actions_request_id_not_null`: `NOT NULL request_id`

Indexes:

- `rebuild_trainer_actions_actor_id_request_id_key`: `CREATE UNIQUE INDEX rebuild_trainer_actions_actor_id_request_id_key ON public.rebuild_trainer_actions USING btree (actor_id, request_id)`
- `rebuild_trainer_actions_pkey`: `CREATE UNIQUE INDEX rebuild_trainer_actions_pkey ON public.rebuild_trainer_actions USING btree (id)`

## trainer_hints

Coaching riêng theo học viên/lớp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | NO | `—` |
| `learner_id` | `uuid` | NO | `—` |
| `trainer_id` | `uuid` | NO | `current_user_id()` |
| `message` | `text` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `trainer_hints_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `trainer_hints_class_id_not_null`: `NOT NULL class_id`
- `trainer_hints_created_at_not_null`: `NOT NULL created_at`
- `trainer_hints_id_not_null`: `NOT NULL id`
- `trainer_hints_learner_id_fkey`: `FOREIGN KEY (learner_id) REFERENCES learners(id)`
- `trainer_hints_learner_id_not_null`: `NOT NULL learner_id`
- `trainer_hints_message_check`: `CHECK (((length(btrim(message)) >= 1) AND (length(btrim(message)) <= 2000)))`
- `trainer_hints_message_not_null`: `NOT NULL message`
- `trainer_hints_pkey`: `PRIMARY KEY (id)`
- `trainer_hints_trainer_id_fkey`: `FOREIGN KEY (trainer_id) REFERENCES users(id)`
- `trainer_hints_trainer_id_not_null`: `NOT NULL trainer_id`

Indexes:

- `trainer_hints_learner_id_class_id_created_at_idx`: `CREATE INDEX trainer_hints_learner_id_class_id_created_at_idx ON public.trainer_hints USING btree (learner_id, class_id, created_at)`
- `trainer_hints_pkey`: `CREATE UNIQUE INDEX trainer_hints_pkey ON public.trainer_hints USING btree (id)`

## user_tutorial_progress

Trạng thái tutorial kế thừa; giữ để không mất tương thích.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `user_id` | `uuid` | NO | `—` |
| `tutorial_key` | `text` | NO | `—` |
| `completed_at` | `timestamptz` | NO | `now()` |

Constraints:

- `user_tutorial_progress_completed_at_not_null`: `NOT NULL completed_at`
- `user_tutorial_progress_pkey`: `PRIMARY KEY (user_id, tutorial_key)`
- `user_tutorial_progress_tutorial_key_check`: `CHECK ((tutorial_key ~ '^[a-z0-9_]+$'::text))`
- `user_tutorial_progress_tutorial_key_not_null`: `NOT NULL tutorial_key`
- `user_tutorial_progress_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `user_tutorial_progress_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `user_tutorial_progress_pkey`: `CREATE UNIQUE INDEX user_tutorial_progress_pkey ON public.user_tutorial_progress USING btree (user_id, tutorial_key)`

## users

Tài khoản nghiệp vụ và role; không chứa password/session của Identity Platform.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `email` | `text` | NO | `—` |
| `full_name` | `text` | NO | `—` |
| `role` | `text` | NO | `'learner'::text` |
| `auth_provider_id` | `text` | YES | `—` |
| `created_at` | `timestamptz` | YES | `now()` |
| `updated_at` | `timestamptz` | YES | `now()` |
| `profile_confirmed_at` | `timestamptz` | YES | `—` |

Constraints:

- `users_email_key`: `UNIQUE (email)`
- `users_email_not_null`: `NOT NULL email`
- `users_full_name_not_null`: `NOT NULL full_name`
- `users_id_not_null`: `NOT NULL id`
- `users_pkey`: `PRIMARY KEY (id)`
- `users_role_check`: `CHECK ((role = ANY (ARRAY['learner'::text, 'instructor'::text, 'head'::text, 'admin'::text])))`
- `users_role_not_null`: `NOT NULL role`

Indexes:

- `idx_users_email`: `CREATE INDEX idx_users_email ON public.users USING btree (email)`
- `users_email_key`: `CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)`
- `users_pkey`: `CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)`

## workshop_message_receipts

Trạng thái nhận/đọc thông báo.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `message_id` | `uuid` | NO | `—` |
| `user_id` | `uuid` | NO | `—` |
| `read_at` | `timestamptz` | NO | `now()` |

Constraints:

- `workshop_message_receipts_message_id_fkey`: `FOREIGN KEY (message_id) REFERENCES workshop_messages(id) ON DELETE CASCADE`
- `workshop_message_receipts_message_id_not_null`: `NOT NULL message_id`
- `workshop_message_receipts_pkey`: `PRIMARY KEY (message_id, user_id)`
- `workshop_message_receipts_read_at_not_null`: `NOT NULL read_at`
- `workshop_message_receipts_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
- `workshop_message_receipts_user_id_not_null`: `NOT NULL user_id`

Indexes:

- `workshop_message_receipts_pkey`: `CREATE UNIQUE INDEX workshop_message_receipts_pkey ON public.workshop_message_receipts USING btree (message_id, user_id)`

## workshop_messages

Thông báo workshop theo lớp.

| Cột | Kiểu PostgreSQL | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `class_id` | `uuid` | NO | `—` |
| `trainer_id` | `uuid` | NO | `current_user_id()` |
| `request_id` | `uuid` | NO | `—` |
| `message` | `text` | NO | `—` |
| `created_at` | `timestamptz` | NO | `now()` |

Constraints:

- `workshop_messages_class_id_fkey`: `FOREIGN KEY (class_id) REFERENCES classes(id)`
- `workshop_messages_class_id_not_null`: `NOT NULL class_id`
- `workshop_messages_created_at_not_null`: `NOT NULL created_at`
- `workshop_messages_id_not_null`: `NOT NULL id`
- `workshop_messages_message_check`: `CHECK (((length(btrim(message)) >= 1) AND (length(btrim(message)) <= 2000)))`
- `workshop_messages_message_not_null`: `NOT NULL message`
- `workshop_messages_pkey`: `PRIMARY KEY (id)`
- `workshop_messages_request_id_not_null`: `NOT NULL request_id`
- `workshop_messages_trainer_id_fkey`: `FOREIGN KEY (trainer_id) REFERENCES users(id)`
- `workshop_messages_trainer_id_not_null`: `NOT NULL trainer_id`
- `workshop_messages_trainer_id_request_id_key`: `UNIQUE (trainer_id, request_id)`

Indexes:

- `workshop_messages_class_id_created_at_idx`: `CREATE INDEX workshop_messages_class_id_created_at_idx ON public.workshop_messages USING btree (class_id, created_at DESC)`
- `workshop_messages_pkey`: `CREATE UNIQUE INDEX workshop_messages_pkey ON public.workshop_messages USING btree (id)`
- `workshop_messages_trainer_id_request_id_key`: `CREATE UNIQUE INDEX workshop_messages_trainer_id_request_id_key ON public.workshop_messages USING btree (trainer_id, request_id)`
