# ERD before / after — source-derived, 50 → 50

**Status:** before graph VERIFIED STATIC; after graph REQUIRES APPROVAL, not applied. Live graph NOT VERIFIED. Real tbls **1.96.1** generated both Mermaid diagrams from native JSON adapters. Adapters contain source-derived catalog plus target patches; neither is a dump from a running database. No SQL, schema or cloud change performed.

| Scope | Tables | Foreign keys | Columns | Meaning |
|---|---:|---:|---:|---|
| Source migration business tables | 48 | See historical inventory | See historical inventory | Supabase/source history, not deployed count |
| Source-derived GCP baseline | 49 | See baseline catalog | See baseline catalog | Adds Firebase/business identity binding |
| Current source-derived target after 001–005 | 50 | 102 | 385 | Before graph below; live count unknown |
| Proposed validated F07 guards | 50 | 104 | 385 | After graph, only two additive binding-tuple guard FKs |
| Actual Cloud SQL/source DB | UNKNOWN | UNKNOWN | UNKNOWN | IAM denied catalog access; no zero-table inference |

All existing tables, IDs, boundaries and relationships remain. No roster-profile merge, no private/shared SOP merge, no feature retirement, no move into nine schemas. Documentation domains are in [ownership register](DATA_OWNERSHIP_AND_INTEGRITY.md).

Selected structural difference: binding `(class_id,document_id)` references document `(class_id,id)` and binding `(document_id,version_id)` references version `(document_id,id)`, with two parent unique indexes. Original single-column FKs stay. Approval/data preflight/compatible relation-selector release must precede DDL; the **104** count only applies after adding and validating both guards. The current adapter would otherwise treat same-parent multiple FKs as ambiguous. SQL/release/rollback in [proposal](CLEAN_DATABASE_PROPOSAL.md) and [safe plan](SAFE_CLOUD_SQL_REFACTOR_PLAN.md).

Optional indexing claim timestamp is not included in this selected graph/385-column count; it would add one nullable column after approval, no table. N01 JSON evidence, F02 key normalization and role/ACL changes do not add entity edges. Optional run/attempt uniqueness needs a separate cardinality decision and is not included.

Full generated ERDs: [before](../../outputs/gcp-db-clean-audit/tbls-before.mmd), [proposed after](../../outputs/gcp-db-clean-audit/tbls-after-proposed.mmd). Native inputs: [before JSON](../../outputs/gcp-db-clean-audit/tbls-source-derived.json), [proposed JSON](../../outputs/gcp-db-clean-audit/tbls-proposed-source-derived.json). Actual generated [table documentation](../../outputs/gcp-db-clean-audit/tbls-docs/README.md). These ignored tool artifacts support the durable diagrams below.

Mermaid edge labels describe FK definitions, not measured query cost, ownership or RLS. Columns/types are source-derived; synthetic source comments are not evidence that database COMMENT ON exists. Routine/trigger/policy graph lives in [dependency register](TABLE_FUNCTION_TRIGGER_DEPENDENCIES.md), not as invented ERD FKs.

## Before — current source-derived target

```mermaid
erDiagram

"public.classes" }o--|| "public.clients" : "FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT"
"public.classes" }o--|| "public.courses" : "FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT"
"public.course_instructors" }o--|| "public.courses" : "FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE"
"public.course_instructors" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
"public.course_modules" }o--|| "public.courses" : "FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE"
"public.courses" }o--o| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL"
"public.enrollments" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE"
"public.enrollments" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE"
"public.gcp_identity_bindings" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.learners" |o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
"public.lesson_progress" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE"
"public.lesson_progress" }o--o| "public.prompt_attempts" : "FOREIGN KEY (last_attempt_id) REFERENCES prompt_attempts(id) ON DELETE SET NULL"
"public.lesson_progress" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE"
"public.lesson_progress" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE"
"public.lesson_resources" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE"
"public.lesson_rubric_criteria" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE"
"public.lessons" }o--|| "public.course_modules" : "FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE"
"public.product_attendance" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_attendance" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.product_attendance" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_attendance" }o--|| "public.users" : "FOREIGN KEY (recorded_by) REFERENCES users(id)"
"public.product_audit" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_audit" }o--o| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_awards" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_awards" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.product_awards" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_class_grants" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_class_grants" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_domains" }o--|| "public.clients" : "FOREIGN KEY (client_id) REFERENCES clients(id)"
"public.product_domains" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_governance_config" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_learner_context" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_learner_context" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_learner_context" }o--|| "public.users" : "FOREIGN KEY (owner_id) REFERENCES users(id)"
"public.product_learner_support" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_learner_support" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.product_learner_support" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_profile_corrections" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_profile_corrections" }o--o| "public.classes" : "migration 050 / GCP 005"
"public.product_profile_corrections" }o--o| "public.classes" : "migration 050 / GCP 005"
"public.product_prompt_drafts" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_prompt_drafts" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_prompt_drafts" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_prompt_library" }o--o| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.product_prompt_library" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_prompt_library" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_prompt_library" }o--|| "public.users" : "FOREIGN KEY (owner_id) REFERENCES users(id)"
"public.product_prompt_library" }o--o| "public.users" : "FOREIGN KEY (reviewed_by) REFERENCES users(id)"
"public.product_request_budgets" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_roster_profiles" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_roster_profiles" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_rotation_approvals" }o--|| "public.product_rotation_requests" : "FOREIGN KEY (request_id) REFERENCES product_rotation_requests(id)"
"public.product_rotation_approvals" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_rotation_requests" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_rotation_requests" }o--|| "public.users" : "FOREIGN KEY (requested_by) REFERENCES users(id)"
"public.product_sandbox_runs" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_sandbox_runs" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sandbox_runs" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_session_controls" |o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_session_controls" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_sheet_connections" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sheet_connections" }o--|| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id)"
"public.product_sop_chunks" }o--|| "public.rebuild_sop_versions" : "FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)"
"public.product_sop_contributions" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_sop_contributions" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sop_contributions" }o--o| "public.rebuild_sop_documents" : "FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)"
"public.product_sop_contributions" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_sop_contributions" }o--o| "public.users" : "FOREIGN KEY (reviewed_by) REFERENCES users(id)"
"public.product_sop_contributions" }o--o| "public.rebuild_sop_versions" : "FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)"
"public.product_studio" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_studio" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_studio" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_sync_logs" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_sync_logs" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sync_logs" }o--|| "public.product_sheet_connections" : "FOREIGN KEY (connection_id) REFERENCES product_sheet_connections(id)"
"public.prompt_attempts" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE"
"public.prompt_attempts" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE"
"public.prompt_attempts" }o--o| "public.lessons" : "FOREIGN KEY (lesson_ref_id) REFERENCES lessons(id) ON DELETE SET NULL"
"public.rebuild_judge_claims" |o--|| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.rebuild_roster_imports" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.rebuild_roster_imports" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_runs" }o--o| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.rebuild_runs" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_runs" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.rebuild_sop_bindings" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_sop_bindings" }o--|| "public.rebuild_sop_documents" : "FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)"
"public.rebuild_sop_bindings" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.rebuild_sop_bindings" }o--|| "public.rebuild_sop_versions" : "FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)"
"public.rebuild_sop_documents" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_sop_documents" }o--|| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id)"
"public.rebuild_sop_versions" }o--|| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id)"
"public.rebuild_sop_versions" }o--|| "public.rebuild_sop_documents" : "FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)"
"public.rebuild_trainer_actions" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.rebuild_trainer_actions" }o--|| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.trainer_hints" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.trainer_hints" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.trainer_hints" }o--|| "public.users" : "FOREIGN KEY (trainer_id) REFERENCES users(id)"
"public.user_tutorial_progress" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
"public.workshop_message_receipts" }o--|| "public.workshop_messages" : "FOREIGN KEY (message_id) REFERENCES workshop_messages(id) ON DELETE CASCADE"
"public.workshop_message_receipts" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.workshop_messages" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.workshop_messages" }o--|| "public.users" : "FOREIGN KEY (trainer_id) REFERENCES users(id)"

"public.classes" {
  uuid id
  text class_code
  uuid course_id FK
  uuid client_id FK
  text department
  timestamptz start_date
  timestamptz end_date
  text status
  text enrollment_mode
  timestamptz created_at
}
"public.clients" {
  uuid id
  text name
  text industry
  timestamptz created_at
}
"public.course_instructors" {
  uuid course_id FK
  uuid user_id FK
  text permission
  timestamptz assigned_at
}
"public.course_modules" {
  uuid id
  uuid course_id FK
  text title
  text description
  int4 position
  text status
  timestamptz created_at
  timestamptz updated_at
}
"public.courses" {
  uuid id
  text title
  text description
  text status
  uuid created_by FK
  timestamptz created_at
  timestamptz updated_at
  text slug
  text publication_status
  int4 version
  timestamptz published_at
}
"public.enrollments" {
  uuid id
  uuid learner_id FK
  uuid class_id FK
  text status
  timestamptz joined_at
  timestamptz updated_at
}
"public.gcp_identity_bindings" {
  text issuer
  text external_subject
  uuid user_id FK
  uuid legacy_subject
  timestamptz created_at
}
"public.learners" {
  uuid id
  text learner_code
  uuid user_id FK
  timestamptz created_at
}
"public.lesson_progress" {
  uuid id
  uuid learner_id FK
  uuid class_id FK
  uuid lesson_id FK
  text status
  int4 attempts_count
  numeric best_score
  uuid last_attempt_id FK
  timestamptz started_at
  timestamptz completed_at
  timestamptz updated_at
}
"public.lesson_resources" {
  uuid id
  uuid lesson_id FK
  text resource_type
  text title
  text content
  text url
  int4 position
  timestamptz created_at
  timestamptz updated_at
}
"public.lesson_rubric_criteria" {
  uuid id
  uuid lesson_id FK
  text criterion_key
  text label
  text description
  numeric max_score
  int4 position
  timestamptz created_at
  timestamptz updated_at
}
"public.lessons" {
  uuid id
  uuid module_id FK
  text lesson_key
  text title
  text badge
  text focus_skill
  text scenario
  text task_goal
  text concept_title
  text concept_content
  text system_instruction
  text starter_prompt
  text baseline_prompt
  text improved_prompt
  text sample_input_context
  text prompt_placeholder
  text expected_output_format
  jsonb hints
  jsonb focus_components
  int4 position
  text status
  timestamptz created_at
  timestamptz updated_at
}
"public.product_attendance" {
  uuid class_id FK
  uuid lesson_id FK
  uuid learner_id FK
  bool present
  uuid recorded_by FK
  text reason
  timestamptz updated_at
}
"public.product_audit" {
  uuid id
  uuid class_id FK
  uuid actor_id FK
  text action
  text reason
  timestamptz created_at
}
"public.product_awards" {
  uuid id
  uuid class_id FK
  uuid lesson_id FK
  uuid learner_id FK
  text award_key
  text kind
  text title
  text issuer
  jsonb evidence
  timestamptz issued_at
}
"public.product_class_grants" {
  uuid user_id FK
  uuid class_id FK
  text permission
}
"public.product_domains" {
  uuid client_id FK
  text domain
  bool active
  uuid updated_by FK
  timestamptz updated_at
}
"public.product_enterprise_requests" {
  uuid id
  uuid request_id
  text company
  text tax_id
  text employees
  text email
  text status
  timestamptz created_at
}
"public.product_governance_config" {
  bool id
  jsonb config
  int4 revision
  uuid updated_by FK
  timestamptz updated_at
}
"public.product_learner_context" {
  uuid id
  uuid owner_id FK
  uuid class_id FK
  uuid lesson_id FK
  text title
  text content
  text content_hash
  jsonb chunks
  timestamptz created_at
}
"public.product_learner_support" {
  uuid learner_id FK
  uuid class_id FK
  uuid lesson_id FK
  text kind
  timestamptz created_at
  text reflection
}
"public.product_profile_corrections" {
  uuid id
  uuid user_id FK
  uuid request_id
  text reason
  text status
  timestamptz created_at
  text assigned_department
  text requested_department
  uuid source_class_id FK
  uuid target_class_id FK
  boolean auto_approved
}
"public.product_prompt_drafts" {
  uuid user_id FK
  uuid class_id FK
  uuid lesson_id FK
  text prompt
  int4 revision
  timestamptz updated_at
}
"public.product_prompt_library" {
  uuid id
  uuid owner_id FK
  uuid class_id FK
  uuid lesson_id FK
  uuid attempt_id FK
  uuid request_id
  text title
  text prompt
  jsonb settings
  jsonb variables
  numeric score
  text status
  uuid reviewed_by FK
  text review_reason
  timestamptz created_at
  text category
}
"public.product_request_budgets" {
  uuid actor_id FK
  text operation
  timestamptz bucket
  int4 count
}
"public.product_roster_profiles" {
  uuid user_id FK
  uuid class_id FK
  text country
  text department
  timestamptz updated_at
}
"public.product_rotation_approvals" {
  uuid request_id FK
  uuid user_id FK
  timestamptz created_at
}
"public.product_rotation_requests" {
  uuid id
  uuid class_id FK
  text provider
  text source_fingerprint
  uuid requested_by FK
  text reason
  text status
  timestamptz created_at
  timestamptz applied_at
  text deployment_id
}
"public.product_sandbox_runs" {
  uuid actor_id FK
  uuid request_id
  uuid class_id FK
  uuid lesson_id FK
  text prompt
  jsonb snapshot
  jsonb result
  jsonb evaluation
  uuid judge_claim
  timestamptz created_at
}
"public.product_session_controls" {
  uuid class_id FK
  text state
  int4 revision
  timestamptz updated_at
  uuid updated_by FK
}
"public.product_sheet_connections" {
  uuid id
  uuid class_id FK
  text sheet_id
  text name
  jsonb column_mapping
  text status
  timestamptz last_synced_at
  uuid created_by FK
  bool auto_sync
  timestamptz last_attempt_at
}
"public.product_sop_chunks" {
  uuid version_id FK
  int4 position
  int4 page
  text content
  jsonb embedding
  text model
  timestamptz indexed_at
  vector_768_ embedding_vector
}
"public.product_sop_contributions" {
  uuid id
  uuid actor_id FK
  uuid request_id
  uuid class_id FK
  uuid lesson_id FK
  uuid document_id FK
  text title
  text content
  jsonb metadata
  jsonb chunks
  text status
  uuid version_id FK
  uuid reviewed_by FK
  text review_reason
  uuid indexing_claim
  jsonb indexed_chunks
  timestamptz created_at
}
"public.product_studio" {
  uuid class_id FK
  uuid lesson_id FK
  int4 revision
  jsonb config
  timestamptz updated_at
  uuid updated_by FK
}
"public.product_sync_logs" {
  uuid id
  uuid connection_id FK
  uuid class_id FK
  uuid actor_id FK
  uuid request_id
  text status
  int4 processed
  jsonb result
  text error_code
  timestamptz created_at
  timestamptz finished_at
}
"public.product_worker_invocations" {
  uuid nonce
  timestamptz created_at
}
"public.prompt_attempts" {
  uuid id
  uuid learner_id FK
  uuid class_id FK
  text lesson_id
  int4 attempt_number
  text prompt_text
  text ai_output
  jsonb evaluation_json
  text model
  int4 latency_ms
  timestamptz created_at
  uuid lesson_ref_id FK
  numeric production_pass_threshold
}
"public.rebuild_judge_claims" {
  uuid attempt_id FK
  uuid subject
  uuid claim_id
  timestamptz claimed_at
  timestamptz completed_at
}
"public.rebuild_roster_imports" {
  uuid id
  uuid class_id FK
  uuid actor_id FK
  uuid request_id
  jsonb rows_json
  jsonb result
  timestamptz created_at
}
"public.rebuild_runs" {
  uuid subject
  uuid request_id
  uuid class_id FK
  uuid lesson_id FK
  text prompt
  jsonb snapshot
  uuid attempt_id FK
  jsonb result
  timestamptz created_at
}
"public.rebuild_sop_bindings" {
  uuid class_id FK
  uuid lesson_id FK
  uuid document_id FK
  uuid version_id FK
}
"public.rebuild_sop_documents" {
  uuid id
  uuid class_id FK
  text title
  uuid created_by FK
  timestamptz created_at
}
"public.rebuild_sop_versions" {
  uuid id
  uuid document_id FK
  int4 version
  text content
  uuid created_by FK
  timestamptz created_at
}
"public.rebuild_trainer_actions" {
  uuid id
  uuid attempt_id FK
  uuid actor_id FK
  uuid request_id
  text action
  text reason
  timestamptz created_at
}
"public.trainer_hints" {
  uuid id
  uuid class_id FK
  uuid learner_id FK
  uuid trainer_id FK
  text message
  timestamptz created_at
}
"public.user_tutorial_progress" {
  uuid user_id FK
  text tutorial_key
  timestamptz completed_at
}
"public.users" {
  uuid id
  text email
  text full_name
  text role
  text auth_provider_id
  timestamptz created_at
  timestamptz updated_at
  timestamptz profile_confirmed_at
}
"public.workshop_message_receipts" {
  uuid message_id FK
  uuid user_id FK
  timestamptz read_at
}
"public.workshop_messages" {
  uuid id
  uuid class_id FK
  uuid trainer_id FK
  uuid request_id
  text message
  timestamptz created_at
}
"public.gcp_projection_outbox" {
  int8 id
  uuid event_id
  text entity_table
  jsonb entity_key
  uuid class_id
  uuid learner_id
  uuid previous_version_id
  text operation
  timestamptz created_at
  timestamptz claimed_at
  uuid claim_id
  int4 attempts
  timestamptz available_at
  timestamptz processed_at
  text error_code
  timestamptz dead_letter_at
}
```

## After — proposed F07 guards, no entity removal

```mermaid
erDiagram

"public.classes" }o--|| "public.clients" : "FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT"
"public.classes" }o--|| "public.courses" : "FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT"
"public.course_instructors" }o--|| "public.courses" : "FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE"
"public.course_instructors" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
"public.course_modules" }o--|| "public.courses" : "FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE"
"public.courses" }o--o| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL"
"public.enrollments" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE"
"public.enrollments" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE"
"public.gcp_identity_bindings" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.learners" |o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
"public.lesson_progress" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE"
"public.lesson_progress" }o--o| "public.prompt_attempts" : "FOREIGN KEY (last_attempt_id) REFERENCES prompt_attempts(id) ON DELETE SET NULL"
"public.lesson_progress" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE"
"public.lesson_progress" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE"
"public.lesson_resources" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE"
"public.lesson_rubric_criteria" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE"
"public.lessons" }o--|| "public.course_modules" : "FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE"
"public.product_attendance" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_attendance" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.product_attendance" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_attendance" }o--|| "public.users" : "FOREIGN KEY (recorded_by) REFERENCES users(id)"
"public.product_audit" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_audit" }o--o| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_awards" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_awards" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.product_awards" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_class_grants" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_class_grants" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_domains" }o--|| "public.clients" : "FOREIGN KEY (client_id) REFERENCES clients(id)"
"public.product_domains" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_governance_config" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_learner_context" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_learner_context" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_learner_context" }o--|| "public.users" : "FOREIGN KEY (owner_id) REFERENCES users(id)"
"public.product_learner_support" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_learner_support" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.product_learner_support" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_profile_corrections" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_profile_corrections" }o--o| "public.classes" : "migration 050 / GCP 005"
"public.product_profile_corrections" }o--o| "public.classes" : "migration 050 / GCP 005"
"public.product_prompt_drafts" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_prompt_drafts" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_prompt_drafts" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_prompt_library" }o--o| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.product_prompt_library" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_prompt_library" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_prompt_library" }o--|| "public.users" : "FOREIGN KEY (owner_id) REFERENCES users(id)"
"public.product_prompt_library" }o--o| "public.users" : "FOREIGN KEY (reviewed_by) REFERENCES users(id)"
"public.product_request_budgets" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_roster_profiles" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_roster_profiles" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_rotation_approvals" }o--|| "public.product_rotation_requests" : "FOREIGN KEY (request_id) REFERENCES product_rotation_requests(id)"
"public.product_rotation_approvals" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.product_rotation_requests" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_rotation_requests" }o--|| "public.users" : "FOREIGN KEY (requested_by) REFERENCES users(id)"
"public.product_sandbox_runs" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_sandbox_runs" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sandbox_runs" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_session_controls" |o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_session_controls" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_sheet_connections" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sheet_connections" }o--|| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id)"
"public.product_sop_chunks" }o--|| "public.rebuild_sop_versions" : "FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)"
"public.product_sop_contributions" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_sop_contributions" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sop_contributions" }o--o| "public.rebuild_sop_documents" : "FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)"
"public.product_sop_contributions" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_sop_contributions" }o--o| "public.users" : "FOREIGN KEY (reviewed_by) REFERENCES users(id)"
"public.product_sop_contributions" }o--o| "public.rebuild_sop_versions" : "FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)"
"public.product_studio" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_studio" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.product_studio" }o--|| "public.users" : "FOREIGN KEY (updated_by) REFERENCES users(id)"
"public.product_sync_logs" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.product_sync_logs" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.product_sync_logs" }o--|| "public.product_sheet_connections" : "FOREIGN KEY (connection_id) REFERENCES product_sheet_connections(id)"
"public.prompt_attempts" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE"
"public.prompt_attempts" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE"
"public.prompt_attempts" }o--o| "public.lessons" : "FOREIGN KEY (lesson_ref_id) REFERENCES lessons(id) ON DELETE SET NULL"
"public.rebuild_judge_claims" |o--|| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.rebuild_roster_imports" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.rebuild_roster_imports" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_runs" }o--o| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.rebuild_runs" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_runs" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.rebuild_sop_bindings" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_sop_bindings" }o--|| "public.rebuild_sop_documents" : "FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)"
"public.rebuild_sop_bindings" }o--|| "public.lessons" : "FOREIGN KEY (lesson_id) REFERENCES lessons(id)"
"public.rebuild_sop_bindings" }o--|| "public.rebuild_sop_versions" : "FOREIGN KEY (version_id) REFERENCES rebuild_sop_versions(id)"
"public.rebuild_sop_documents" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.rebuild_sop_documents" }o--|| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id)"
"public.rebuild_sop_versions" }o--|| "public.users" : "FOREIGN KEY (created_by) REFERENCES users(id)"
"public.rebuild_sop_versions" }o--|| "public.rebuild_sop_documents" : "FOREIGN KEY (document_id) REFERENCES rebuild_sop_documents(id)"
"public.rebuild_trainer_actions" }o--|| "public.users" : "FOREIGN KEY (actor_id) REFERENCES users(id)"
"public.rebuild_trainer_actions" }o--|| "public.prompt_attempts" : "FOREIGN KEY (attempt_id) REFERENCES prompt_attempts(id)"
"public.trainer_hints" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.trainer_hints" }o--|| "public.learners" : "FOREIGN KEY (learner_id) REFERENCES learners(id)"
"public.trainer_hints" }o--|| "public.users" : "FOREIGN KEY (trainer_id) REFERENCES users(id)"
"public.user_tutorial_progress" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
"public.workshop_message_receipts" }o--|| "public.workshop_messages" : "FOREIGN KEY (message_id) REFERENCES workshop_messages(id) ON DELETE CASCADE"
"public.workshop_message_receipts" }o--|| "public.users" : "FOREIGN KEY (user_id) REFERENCES users(id)"
"public.workshop_messages" }o--|| "public.classes" : "FOREIGN KEY (class_id) REFERENCES classes(id)"
"public.workshop_messages" }o--|| "public.users" : "FOREIGN KEY (trainer_id) REFERENCES users(id)"
"public.rebuild_sop_bindings" }o--|| "public.rebuild_sop_documents" : "audit_binding_document_class_fk (PROPOSED)"
"public.rebuild_sop_bindings" }o--|| "public.rebuild_sop_versions" : "audit_binding_version_document_fk (PROPOSED)"

"public.classes" {
  uuid id
  text class_code
  uuid course_id FK
  uuid client_id FK
  text department
  timestamptz start_date
  timestamptz end_date
  text status
  text enrollment_mode
  timestamptz created_at
}
"public.clients" {
  uuid id
  text name
  text industry
  timestamptz created_at
}
"public.course_instructors" {
  uuid course_id FK
  uuid user_id FK
  text permission
  timestamptz assigned_at
}
"public.course_modules" {
  uuid id
  uuid course_id FK
  text title
  text description
  int4 position
  text status
  timestamptz created_at
  timestamptz updated_at
}
"public.courses" {
  uuid id
  text title
  text description
  text status
  uuid created_by FK
  timestamptz created_at
  timestamptz updated_at
  text slug
  text publication_status
  int4 version
  timestamptz published_at
}
"public.enrollments" {
  uuid id
  uuid learner_id FK
  uuid class_id FK
  text status
  timestamptz joined_at
  timestamptz updated_at
}
"public.gcp_identity_bindings" {
  text issuer
  text external_subject
  uuid user_id FK
  uuid legacy_subject
  timestamptz created_at
}
"public.learners" {
  uuid id
  text learner_code
  uuid user_id FK
  timestamptz created_at
}
"public.lesson_progress" {
  uuid id
  uuid learner_id FK
  uuid class_id FK
  uuid lesson_id FK
  text status
  int4 attempts_count
  numeric best_score
  uuid last_attempt_id FK
  timestamptz started_at
  timestamptz completed_at
  timestamptz updated_at
}
"public.lesson_resources" {
  uuid id
  uuid lesson_id FK
  text resource_type
  text title
  text content
  text url
  int4 position
  timestamptz created_at
  timestamptz updated_at
}
"public.lesson_rubric_criteria" {
  uuid id
  uuid lesson_id FK
  text criterion_key
  text label
  text description
  numeric max_score
  int4 position
  timestamptz created_at
  timestamptz updated_at
}
"public.lessons" {
  uuid id
  uuid module_id FK
  text lesson_key
  text title
  text badge
  text focus_skill
  text scenario
  text task_goal
  text concept_title
  text concept_content
  text system_instruction
  text starter_prompt
  text baseline_prompt
  text improved_prompt
  text sample_input_context
  text prompt_placeholder
  text expected_output_format
  jsonb hints
  jsonb focus_components
  int4 position
  text status
  timestamptz created_at
  timestamptz updated_at
}
"public.product_attendance" {
  uuid class_id FK
  uuid lesson_id FK
  uuid learner_id FK
  bool present
  uuid recorded_by FK
  text reason
  timestamptz updated_at
}
"public.product_audit" {
  uuid id
  uuid class_id FK
  uuid actor_id FK
  text action
  text reason
  timestamptz created_at
}
"public.product_awards" {
  uuid id
  uuid class_id FK
  uuid lesson_id FK
  uuid learner_id FK
  text award_key
  text kind
  text title
  text issuer
  jsonb evidence
  timestamptz issued_at
}
"public.product_class_grants" {
  uuid user_id FK
  uuid class_id FK
  text permission
}
"public.product_domains" {
  uuid client_id FK
  text domain
  bool active
  uuid updated_by FK
  timestamptz updated_at
}
"public.product_enterprise_requests" {
  uuid id
  uuid request_id
  text company
  text tax_id
  text employees
  text email
  text status
  timestamptz created_at
}
"public.product_governance_config" {
  bool id
  jsonb config
  int4 revision
  uuid updated_by FK
  timestamptz updated_at
}
"public.product_learner_context" {
  uuid id
  uuid owner_id FK
  uuid class_id FK
  uuid lesson_id FK
  text title
  text content
  text content_hash
  jsonb chunks
  timestamptz created_at
}
"public.product_learner_support" {
  uuid learner_id FK
  uuid class_id FK
  uuid lesson_id FK
  text kind
  timestamptz created_at
  text reflection
}
"public.product_profile_corrections" {
  uuid id
  uuid user_id FK
  uuid request_id
  text reason
  text status
  timestamptz created_at
  text assigned_department
  text requested_department
  uuid source_class_id FK
  uuid target_class_id FK
  boolean auto_approved
}
"public.product_prompt_drafts" {
  uuid user_id FK
  uuid class_id FK
  uuid lesson_id FK
  text prompt
  int4 revision
  timestamptz updated_at
}
"public.product_prompt_library" {
  uuid id
  uuid owner_id FK
  uuid class_id FK
  uuid lesson_id FK
  uuid attempt_id FK
  uuid request_id
  text title
  text prompt
  jsonb settings
  jsonb variables
  numeric score
  text status
  uuid reviewed_by FK
  text review_reason
  timestamptz created_at
  text category
}
"public.product_request_budgets" {
  uuid actor_id FK
  text operation
  timestamptz bucket
  int4 count
}
"public.product_roster_profiles" {
  uuid user_id FK
  uuid class_id FK
  text country
  text department
  timestamptz updated_at
}
"public.product_rotation_approvals" {
  uuid request_id FK
  uuid user_id FK
  timestamptz created_at
}
"public.product_rotation_requests" {
  uuid id
  uuid class_id FK
  text provider
  text source_fingerprint
  uuid requested_by FK
  text reason
  text status
  timestamptz created_at
  timestamptz applied_at
  text deployment_id
}
"public.product_sandbox_runs" {
  uuid actor_id FK
  uuid request_id
  uuid class_id FK
  uuid lesson_id FK
  text prompt
  jsonb snapshot
  jsonb result
  jsonb evaluation
  uuid judge_claim
  timestamptz created_at
}
"public.product_session_controls" {
  uuid class_id FK
  text state
  int4 revision
  timestamptz updated_at
  uuid updated_by FK
}
"public.product_sheet_connections" {
  uuid id
  uuid class_id FK
  text sheet_id
  text name
  jsonb column_mapping
  text status
  timestamptz last_synced_at
  uuid created_by FK
  bool auto_sync
  timestamptz last_attempt_at
}
"public.product_sop_chunks" {
  uuid version_id FK
  int4 position
  int4 page
  text content
  jsonb embedding
  text model
  timestamptz indexed_at
  vector_768_ embedding_vector
}
"public.product_sop_contributions" {
  uuid id
  uuid actor_id FK
  uuid request_id
  uuid class_id FK
  uuid lesson_id FK
  uuid document_id FK
  text title
  text content
  jsonb metadata
  jsonb chunks
  text status
  uuid version_id FK
  uuid reviewed_by FK
  text review_reason
  uuid indexing_claim
  jsonb indexed_chunks
  timestamptz created_at
}
"public.product_studio" {
  uuid class_id FK
  uuid lesson_id FK
  int4 revision
  jsonb config
  timestamptz updated_at
  uuid updated_by FK
}
"public.product_sync_logs" {
  uuid id
  uuid connection_id FK
  uuid class_id FK
  uuid actor_id FK
  uuid request_id
  text status
  int4 processed
  jsonb result
  text error_code
  timestamptz created_at
  timestamptz finished_at
}
"public.product_worker_invocations" {
  uuid nonce
  timestamptz created_at
}
"public.prompt_attempts" {
  uuid id
  uuid learner_id FK
  uuid class_id FK
  text lesson_id
  int4 attempt_number
  text prompt_text
  text ai_output
  jsonb evaluation_json
  text model
  int4 latency_ms
  timestamptz created_at
  uuid lesson_ref_id FK
  numeric production_pass_threshold
}
"public.rebuild_judge_claims" {
  uuid attempt_id FK
  uuid subject
  uuid claim_id
  timestamptz claimed_at
  timestamptz completed_at
}
"public.rebuild_roster_imports" {
  uuid id
  uuid class_id FK
  uuid actor_id FK
  uuid request_id
  jsonb rows_json
  jsonb result
  timestamptz created_at
}
"public.rebuild_runs" {
  uuid subject
  uuid request_id
  uuid class_id FK
  uuid lesson_id FK
  text prompt
  jsonb snapshot
  uuid attempt_id FK
  jsonb result
  timestamptz created_at
}
"public.rebuild_sop_bindings" {
  uuid class_id FK
  uuid lesson_id FK
  uuid document_id FK
  uuid version_id FK
}
"public.rebuild_sop_documents" {
  uuid id
  uuid class_id FK
  text title
  uuid created_by FK
  timestamptz created_at
}
"public.rebuild_sop_versions" {
  uuid id
  uuid document_id FK
  int4 version
  text content
  uuid created_by FK
  timestamptz created_at
}
"public.rebuild_trainer_actions" {
  uuid id
  uuid attempt_id FK
  uuid actor_id FK
  uuid request_id
  text action
  text reason
  timestamptz created_at
}
"public.trainer_hints" {
  uuid id
  uuid class_id FK
  uuid learner_id FK
  uuid trainer_id FK
  text message
  timestamptz created_at
}
"public.user_tutorial_progress" {
  uuid user_id FK
  text tutorial_key
  timestamptz completed_at
}
"public.users" {
  uuid id
  text email
  text full_name
  text role
  text auth_provider_id
  timestamptz created_at
  timestamptz updated_at
  timestamptz profile_confirmed_at
}
"public.workshop_message_receipts" {
  uuid message_id FK
  uuid user_id FK
  timestamptz read_at
}
"public.workshop_messages" {
  uuid id
  uuid class_id FK
  uuid trainer_id FK
  uuid request_id
  text message
  timestamptz created_at
}
"public.gcp_projection_outbox" {
  int8 id
  uuid event_id
  text entity_table
  jsonb entity_key
  uuid class_id
  uuid learner_id
  uuid previous_version_id
  text operation
  timestamptz created_at
  timestamptz claimed_at
  uuid claim_id
  int4 attempts
  timestamptz available_at
  timestamptz processed_at
  text error_code
  timestamptz dead_letter_at
}
```

This visual is a proposal, not a verified staging schema. Entity count and column/type preservation do not establish feature parity; all suites must pass on Cloud SQL. See [regression plan](DATABASE_REGRESSION_TEST_PLAN.md).
