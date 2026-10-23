# RPC, triggers và RLS

Định nghĩa cuối cùng (bao gồm DO blocks cập nhật function) có trong catalog.validated.json. Auth shim trong schema auth là adapter GCP riêng.

| Function | Arguments | Return | SECURITY DEFINER |
|---|---|---|---|
| `check_user_privilege_escalation` | `` | `trigger` | True |
| `current_user_id` | `` | `uuid` | True |
| `generate_learner_code` | `` | `text` | False |
| `has_active_class_enrollment` | `target_class_id uuid` | `boolean` | True |
| `has_active_course_enrollment` | `target_course_id uuid` | `boolean` | True |
| `is_instructor` | `` | `boolean` | True |
| `legacy_valid_evaluation_total` | `payload jsonb` | `numeric` | False |
| `lesson_belongs_to_class` | `target_lesson_id uuid, target_class_id uuid` | `boolean` | True |
| `product_accept_worker_invocation` | `p_nonce uuid` | `boolean` | True |
| `product_analytics` | `p_classes uuid[], p_start timestamp with time zone, p_end timestamp with time zone` | `jsonb` | True |
| `product_approve_rotation` | `p_request uuid` | `text` | True |
| `product_awards_after_attempt` | `` | `trigger` | True |
| `product_can_manage` | `p_class uuid` | `boolean` | True |
| `product_can_read_class` | `p_class uuid` | `boolean` | True |
| `product_can_read_course` | `p_course uuid` | `boolean` | True |
| `product_can_read_lesson` | `p_lesson uuid` | `boolean` | True |
| `product_can_read_user` | `p_user uuid` | `boolean` | True |
| `product_capture_attempt_threshold` | `` | `trigger` | True |
| `product_claim_roster_sync` | `` | `jsonb` | True |
| `product_create_cohort` | `p_class uuid, p_code text, p_department text, p_start timestamp with time zone, p_end timestamp with time zone` | `uuid` | True |
| `product_create_lesson` | `p_class uuid, p_title text, p_key text` | `uuid` | True |
| `product_enroll_basic` | `p_subject uuid, p_email text` | `uuid` | True |
| `product_finish_roster_sync` | `p_log uuid, p_rows jsonb, p_error text` | `jsonb` | True |
| `product_finish_rotation` | `p_request uuid, p_fingerprint text, p_deployment text` | `void` | True |
| `product_guard_new_run` | `` | `trigger` | True |
| `product_import_roster` | `p_class uuid, p_request uuid, p_rows jsonb` | `jsonb` | True |
| `product_limit_ai_run` | `` | `trigger` | True |
| `product_limit_basic_run` | `` | `trigger` | True |
| `product_publish_contribution` | `p_contribution uuid, p_chunks jsonb` | `uuid` | True |
| `product_record_attendance` | `p_class uuid, p_lesson uuid, p_learner uuid, p_present boolean, p_reason text` | `void` | True |
| `product_refresh_awards` | `p_class uuid, p_learner uuid` | `void` | True |
| `product_request_correction` | `p_request uuid, p_reason text` | `uuid` | True |
| `product_request_rotation` | `p_class uuid, p_provider text, p_fingerprint text, p_reason text` | `uuid` | True |
| `product_save_class` | `p_class uuid, p_status text, p_reason text` | `void` | True |
| `product_save_domain` | `p_class uuid, p_domain text, p_active boolean` | `void` | True |
| `product_save_draft` | `p_class uuid, p_lesson uuid, p_prompt text, p_expected_revision integer` | `integer` | True |
| `product_save_sheet` | `p_class uuid, p_sheet text, p_name text, p_mapping jsonb` | `uuid` | True |
| `product_save_studio` | `p_class uuid, p_lesson uuid, p_expected_revision integer, p_config jsonb, p_fields jsonb` | `jsonb` | True |
| `product_session_control` | `p_class uuid, p_state text, p_expected_revision integer, p_reason text` | `jsonb` | True |
| `product_set_class_access` | `p_class uuid, p_email text, p_role text, p_permission text` | `uuid` | True |
| `product_set_sheet_auto_sync` | `p_class uuid, p_connection uuid, p_enabled boolean` | `void` | True |
| `product_submit_enterprise_request` | `p_request uuid, p_company text, p_tax text, p_employees text, p_email text` | `jsonb` | True |
| `product_take_budget` | `p_actor uuid, p_operation text, p_limit integer` | `boolean` | True |
| `product_unlock_support` | `p_class uuid, p_lesson uuid, p_kind text` | `void` | True |
| `product_unlock_support_reflected` | `p_class uuid, p_lesson uuid, p_kind text, p_reflection text` | `void` | True |
| `product_validate_studio_config` | `` | `trigger` | False |
| `product_validate_studio_nested` | `` | `trigger` | False |
| `rebuild_ack_workshop_message` | `p_message uuid` | `void` | True |
| `rebuild_begin_run` | `p_subject uuid, p_class uuid, p_lesson uuid, p_request uuid, p_prompt text, p_snapshot jsonb` | `jsonb` | True |
| `rebuild_broadcast` | `p_class uuid, p_request uuid, p_message text` | `uuid` | True |
| `rebuild_can_manage_class` | `p_class uuid` | `boolean` | True |
| `rebuild_can_teach` | `p_class uuid` | `boolean` | True |
| `rebuild_claim_judge` | `p_subject uuid, p_attempt uuid, p_claim uuid` | `jsonb` | True |
| `rebuild_class_analytics` | `p_class uuid` | `jsonb` | True |
| `rebuild_class_attempts` | `p_class uuid` | `jsonb` | True |
| `rebuild_class_sops` | `p_class uuid, p_lesson uuid` | `jsonb` | True |
| `rebuild_confirm_profile` | `p_full_name text` | `jsonb` | True |
| `rebuild_finish_judge` | `p_subject uuid, p_attempt uuid, p_claim uuid, p_evaluation jsonb` | `jsonb` | True |
| `rebuild_finish_run` | `p_subject uuid, p_request uuid, p_result jsonb` | `jsonb` | True |
| `rebuild_import_roster` | `p_class uuid, p_request uuid, p_rows jsonb` | `jsonb` | True |
| `rebuild_my_profile` | `` | `jsonb` | True |
| `rebuild_publish_sop` | `p_class uuid, p_document uuid, p_title text, p_content text, p_lesson uuid` | `uuid` | True |
| `rebuild_record_trainer_action` | `p_attempt uuid, p_request uuid, p_action text, p_reason text` | `uuid` | True |
| `rebuild_save_evaluation` | `p_subject uuid, p_attempt uuid, p_evaluation jsonb` | `jsonb` | True |
| `rebuild_sop_lesson_options` | `p_class uuid` | `jsonb` | True |
| `rebuild_trainer_action_history` | `p_attempt uuid` | `jsonb` | True |
| `rebuild_workshop_inbox` | `p_class uuid` | `jsonb` | True |
| `record_prompt_attempt_and_progress` | `p_class_id uuid, p_lesson_id uuid, p_prompt_text text, p_ai_output text, p_evaluation_json jsonb, p_model text, p_latency_ms integer` | `jsonb` | True |
| `self_enroll_public_class` | `target_class_id uuid` | `TABLE(enrollment_id uuid, learner_id uuid, learner_code text, class_id uuid, enrollment_status text)` | True |
| `sync_lesson_progress_from_prompt_attempt` | `` | `trigger` | True |
| `trigger_set_timestamp` | `` | `trigger` | False |
| `update_prompt_attempt_evaluation_and_progress` | `p_attempt_id uuid, p_evaluation_json jsonb` | `jsonb` | True |
| `valid_evaluation_total` | `payload jsonb` | `numeric` | False |

## Triggers

- `course_modules.set_timestamp_course_modules`: `CREATE TRIGGER set_timestamp_course_modules BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()`
- `courses.set_timestamp_courses`: `CREATE TRIGGER set_timestamp_courses BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()`
- `enrollments.set_timestamp_enrollments`: `CREATE TRIGGER set_timestamp_enrollments BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()`
- `lesson_resources.set_timestamp_lesson_resources`: `CREATE TRIGGER set_timestamp_lesson_resources BEFORE UPDATE ON public.lesson_resources FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()`
- `lesson_rubric_criteria.set_timestamp_lesson_rubrics`: `CREATE TRIGGER set_timestamp_lesson_rubrics BEFORE UPDATE ON public.lesson_rubric_criteria FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()`
- `lessons.set_timestamp_lessons`: `CREATE TRIGGER set_timestamp_lessons BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()`
- `product_sandbox_runs.product_limit_sandbox_run`: `CREATE TRIGGER product_limit_sandbox_run BEFORE INSERT ON public.product_sandbox_runs FOR EACH ROW EXECUTE FUNCTION product_limit_ai_run()`
- `product_studio.product_validate_studio_config`: `CREATE TRIGGER product_validate_studio_config BEFORE INSERT OR UPDATE ON public.product_studio FOR EACH ROW EXECUTE FUNCTION product_validate_studio_config()`
- `product_studio.product_validate_studio_nested`: `CREATE TRIGGER product_validate_studio_nested BEFORE INSERT OR UPDATE ON public.product_studio FOR EACH ROW EXECUTE FUNCTION product_validate_studio_nested()`
- `prompt_attempts.product_attempt_threshold`: `CREATE TRIGGER product_attempt_threshold BEFORE INSERT ON public.prompt_attempts FOR EACH ROW EXECUTE FUNCTION product_capture_attempt_threshold()`
- `prompt_attempts.product_awards_after_attempt`: `CREATE TRIGGER product_awards_after_attempt AFTER INSERT OR UPDATE OF evaluation_json ON public.prompt_attempts FOR EACH ROW EXECUTE FUNCTION product_awards_after_attempt()`
- `prompt_attempts.trg_sync_prompt_attempt_progress_evaluation`: `CREATE TRIGGER trg_sync_prompt_attempt_progress_evaluation AFTER UPDATE OF evaluation_json ON public.prompt_attempts FOR EACH ROW WHEN ((new.evaluation_json IS DISTINCT FROM old.evaluation_json)) EXECUTE FUNCTION sync_lesson_progress_from_prompt_attempt()`
- `prompt_attempts.trg_sync_prompt_attempt_progress_insert`: `CREATE TRIGGER trg_sync_prompt_attempt_progress_insert AFTER INSERT ON public.prompt_attempts FOR EACH ROW EXECUTE FUNCTION sync_lesson_progress_from_prompt_attempt()`
- `rebuild_runs.product_basic_quota`: `CREATE TRIGGER product_basic_quota BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE FUNCTION product_limit_basic_run()`
- `rebuild_runs.product_guard_new_run`: `CREATE TRIGGER product_guard_new_run BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE FUNCTION product_guard_new_run()`
- `rebuild_runs.product_limit_ai_run`: `CREATE TRIGGER product_limit_ai_run BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE FUNCTION product_limit_ai_run()`
- `users.set_timestamp_users`: `CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp()`
- `users.trg_check_user_privilege_escalation`: `CREATE TRIGGER trg_check_user_privilege_escalation BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION check_user_privilege_escalation()`

## Chính sách RLS

gcp_trusted_backend là quyền rộng của backend server-only, không phải quyền của learner. API phải giữ class/domain checks trước mọi query dùng service_role.

- `classes.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `classes.product_scoped_read` — SELECT; roles `['authenticated']`; USING `product_can_read_class(id)`; WITH CHECK `None`
- `clients.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `clients.product_scoped_read` — SELECT; roles `['authenticated']`; USING `(EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.client_id = clients.id) AND product_can_read_class(c.id))))`; WITH CHECK `None`
- `course_instructors.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `course_instructors.product_scoped_read` — SELECT; roles `['authenticated']`; USING `((user_id = current_user_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = current_user_id()) AND (u.role = 'admin'::text)))))`; WITH CHECK `None`
- `course_modules.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `course_modules.product_scoped_read` — SELECT; roles `['authenticated']`; USING `(product_can_read_course(course_id) AND ((status = 'published'::text) OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.course_id = course_modules.course_id) AND rebuild_can_teach(c.id))))))`; WITH CHECK `None`
- `courses.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `courses.product_scoped_read` — SELECT; roles `['authenticated']`; USING `product_can_read_course(id)`; WITH CHECK `None`
- `enrollments.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `enrollments.product_scoped_read` — SELECT; roles `['authenticated']`; USING `(product_can_read_class(class_id) AND (rebuild_can_teach(class_id) OR (EXISTS ( SELECT 1
   FROM learners l
  WHERE ((l.id = enrollments.learner_id) AND (l.user_id = current_user_id()))))))`; WITH CHECK `None`
- `gcp_identity_bindings.gcp_identity_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `learners.Learners insert own record or instructor insert` — INSERT; roles `['authenticated']`; USING `None`; WITH CHECK `((user_id = current_user_id()) OR is_instructor())`
- `learners.Learners update by instructor` — UPDATE; roles `['authenticated']`; USING `is_instructor()`; WITH CHECK `None`
- `learners.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `learners.product_scoped_read` — SELECT; roles `['authenticated']`; USING `product_can_read_user(user_id)`; WITH CHECK `None`
- `lesson_progress.Learners read own lesson progress` — SELECT; roles `['authenticated']`; USING `(is_instructor() OR ((learner_id IN ( SELECT l.id
   FROM learners l
  WHERE (l.user_id = current_user_id()))) AND has_active_class_enrollment(class_id)))`; WITH CHECK `None`
- `lesson_progress.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `lesson_resources.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `lesson_resources.product_scoped_read` — SELECT; roles `['authenticated']`; USING `product_can_read_lesson(lesson_id)`; WITH CHECK `None`
- `lesson_rubric_criteria.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `lesson_rubric_criteria.product_scoped_read` — SELECT; roles `['authenticated']`; USING `product_can_read_lesson(lesson_id)`; WITH CHECK `None`
- `lessons.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `lessons.product_scoped_read` — SELECT; roles `['authenticated']`; USING `product_can_read_lesson(id)`; WITH CHECK `None`
- `product_attendance.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_audit.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_awards.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_class_grants.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_domains.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_enterprise_requests.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_governance_config.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_learner_context.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_learner_support.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_profile_corrections.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_prompt_drafts.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_prompt_library.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_request_budgets.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_roster_profiles.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_rotation_approvals.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_rotation_requests.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_sandbox_runs.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_session_controls.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_sheet_connections.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_sop_chunks.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_sop_contributions.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_studio.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_sync_logs.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `product_worker_invocations.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `prompt_attempts.Authenticated users can insert prompt attempts` — INSERT; roles `['authenticated']`; USING `None`; WITH CHECK `(is_instructor() OR ((learner_id IN ( SELECT learners.id
   FROM learners
  WHERE (learners.user_id = current_user_id()))) AND has_active_class_enrollment(class_id) AND ((lesson_ref_id IS NULL) OR lesson_belongs_to_class(lesson_ref_id, class_id))))`
- `prompt_attempts.Instructors can delete prompt attempts` — DELETE; roles `['authenticated']`; USING `is_instructor()`; WITH CHECK `None`
- `prompt_attempts.Learners and instructors can update prompt attempts` — UPDATE; roles `['authenticated']`; USING `(is_instructor() OR ((learner_id IN ( SELECT learners.id
   FROM learners
  WHERE (learners.user_id = current_user_id()))) AND has_active_class_enrollment(class_id)))`; WITH CHECK `(is_instructor() OR ((learner_id IN ( SELECT learners.id
   FROM learners
  WHERE (learners.user_id = current_user_id()))) AND has_active_class_enrollment(class_id)))`
- `prompt_attempts.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `prompt_attempts.product_scoped_read` — SELECT; roles `['authenticated']`; USING `(product_can_read_class(class_id) AND (rebuild_can_teach(class_id) OR (EXISTS ( SELECT 1
   FROM learners l
  WHERE ((l.id = prompt_attempts.learner_id) AND (l.user_id = current_user_id()))))))`; WITH CHECK `None`
- `rebuild_judge_claims.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `rebuild_roster_imports.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `rebuild_runs.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `rebuild_sop_bindings.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `rebuild_sop_documents.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `rebuild_sop_versions.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `rebuild_trainer_actions.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `trainer_hints.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `trainer_hints.hint_read` — SELECT; roles `['authenticated']`; USING `(product_can_read_class(class_id) AND (rebuild_can_teach(class_id) OR (EXISTS ( SELECT 1
   FROM (learners l
     JOIN enrollments e ON ((e.learner_id = l.id)))
  WHERE ((l.id = trainer_hints.learner_id) AND (l.user_id = current_user_id()) AND (e.class_id = trainer_hints.class_id) AND (e.status = 'active'::text))))))`; WITH CHECK `None`
- `trainer_hints.hint_send` — INSERT; roles `['authenticated']`; USING `None`; WITH CHECK `((trainer_id = current_user_id()) AND rebuild_can_manage_class(class_id) AND product_can_read_class(class_id) AND (EXISTS ( SELECT 1
   FROM enrollments e
  WHERE ((e.learner_id = trainer_hints.learner_id) AND (e.class_id = trainer_hints.class_id) AND (e.status = 'active'::text)))))`
- `user_tutorial_progress.Users insert own tutorial progress` — INSERT; roles `['authenticated']`; USING `None`; WITH CHECK `(user_id = current_user_id())`
- `user_tutorial_progress.Users read own tutorial progress` — SELECT; roles `['authenticated']`; USING `(user_id = current_user_id())`; WITH CHECK `None`
- `user_tutorial_progress.Users update own tutorial progress` — UPDATE; roles `['authenticated']`; USING `(user_id = current_user_id())`; WITH CHECK `(user_id = current_user_id())`
- `user_tutorial_progress.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `users.Users can insert own profile or instructor insert` — INSERT; roles `['authenticated']`; USING `None`; WITH CHECK `(((email = (auth.jwt() ->> 'email'::text)) AND (role = 'learner'::text)) OR is_instructor())`
- `users.Users can update own profile or instructor update` — UPDATE; roles `['authenticated']`; USING `((auth_provider_id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)) OR is_instructor())`; WITH CHECK `(is_instructor() OR (((auth_provider_id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text))) AND (role = 'learner'::text)))`
- `users.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `users.product_scoped_read` — SELECT; roles `['authenticated']`; USING `product_can_read_user(id)`; WITH CHECK `None`
- `workshop_message_receipts.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `workshop_messages.gcp_trusted_backend` — ALL; roles `['service_role']`; USING `true`; WITH CHECK `true`
- `workshop_messages.workshop_message_read` — SELECT; roles `['authenticated']`; USING `product_can_read_class(class_id)`; WITH CHECK `None`
