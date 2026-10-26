-- STAGING LOAD TEST ONLY, on the DEDICATED Cloud SQL instance `promptify-loadtest` (never promptify-staging).
-- Creates database `promptify_loadtest`, the runtime login (003; you type its password at the \password prompt and store
-- the same value in secret promptify-loadtest-db-password), migrations 001..020, and synthetic seed data.
-- Run from apps/promptify-intrepid/gcp/loadtest, as postgres on the `postgres` database of promptify-loadtest:
--   psql -h 127.0.0.1 -p <proxy port> -U postgres -d postgres -L setup.log -f setup_loadtest_db.sql
\set ON_ERROR_STOP on
SET statement_timeout='120s';
-- Refuse the staging instance: it is the only one that holds promptify_db.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_database WHERE datname='promptify_db') THEN RAISE EXCEPTION 'This is not the dedicated load-test instance'; END IF; END $$;
SHOW max_connections;
SELECT 'CREATE DATABASE promptify_loadtest' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='promptify_loadtest')\gexec
\connect promptify_loadtest
DO $$ BEGIN IF current_database()<>'promptify_loadtest' THEN RAISE EXCEPTION 'wrong database'; END IF;
 IF to_regclass('public.users') IS NOT NULL THEN RAISE EXCEPTION 'promptify_loadtest already migrated; use reset_and_verify.sql'; END IF; END $$;
\i ../sql/001_baseline.sql
\i ../sql/002_projection_outbox.sql
\i ../sql/003_runtime_role.sql
\password promptify_runtime
\i ../sql/004_pgvector_vertex.sql
\i ../sql/005_department_correction_auto_approval.sql
\i ../sql/006_mentor_feedback.sql
\i ../sql/006_studio_class_scope.sql
\i ../sql/007_sop_binding_integrity.sql
\i ../sql/008_scoped_progress_rls.sql
\i ../sql/009_projection_and_indexing_recovery.sql
\i ../sql/010_structured_badge_rules.sql
\i ../sql/011_roster_lifecycle.sql
\i ../sql/012_judge_jobs.sql
\i ../sql/013_provider_admission.sql
\i ../sql/014_generation_jobs.sql
\i ../sql/015_judge_dispatch_fencing.sql
\i ../sql/016_learner_safeguards.sql
\i ../sql/017_hint_requests.sql
\i ../sql/018_hint_requests_multiple.sql
\i ../sql/019_promote_learner_to_instructor.sql
\i ../sql/020_judge_stage_results.sql
GRANT CONNECT ON DATABASE promptify_loadtest TO promptify_runtime;
\i seed_loadtest.sql
\echo === verify ===
SELECT current_database(),(SELECT count(*) FROM users WHERE email LIKE '%@loadtest.invalid') AS synthetic_users,
 (SELECT count(*) FROM users WHERE email NOT LIKE '%@loadtest.invalid') AS other_users,(SELECT count(*) FROM prompt_attempts) AS attempts,
 (SELECT concurrency||'/'||tokens_per_minute FROM product_provider_budget) AS admission;
