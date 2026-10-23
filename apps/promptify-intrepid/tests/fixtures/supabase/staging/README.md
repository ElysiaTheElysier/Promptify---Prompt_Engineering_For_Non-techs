# Staging validation for server-backed progress

Use a disposable Supabase project only. Never point these steps or environment variables at production.

## Pre-016 schema chain

This repository has no `001` migration. The baseline is:

1. `supabase/schema.sql`
2. `supabase/migrations/002_add_grants_and_rls.sql`
3. `003_create_prompt_attempts.sql`
4. `004_course_content_management.sql`
5. `005_seed_curriculum_specs.sql`
6. `006_enforce_course_enrollment_access.sql`
7. `007_user_tutorial_progress.sql`
8. `008_seed_tester_course.sql`
9. `009_fill_tester_sample_prompts.sql`
10. `010_allow_update_prompt_attempts.sql`
11. `011_update_agribank_curriculum.sql`
12. `012_public_testing_class_self_enrollment.sql`
13. `013_align_tester_solution_prompts.sql`
14. `014_improve_tester_theory_content.sql`
15. `015_remove_seed_mock_users.sql`

Apply them in this exact order. The standalone English seed and rollback files are not part of the pre-016 migration chain.

## Fixture and expected backfill

Apply `server_backed_progress_fixture.sql` after migration 015 and before 016.

Expected fixture result after 016:

- 9 historical `prompt_attempts`
- 8 deterministically mapped attempts
- 1 unmapped attempt: `b9000000-0000-4000-8000-000000000005`
- 7 `lesson_progress` rows
- One grouped row has two attempts and `best_score=9`
- One mapped row has malformed evaluation and `best_score=NULL`
- Cross-class and cross-learner rows remain separate

The complete machine-readable expected rows are in `server_backed_progress_expected.json`.

## Staging-only environment

Set these only in the terminal used for staging verification:

```text
STAGING_PROGRESS_CONFIRM=PROMPTIFY_STAGING_ONLY
STAGING_PROGRESS_PHASE=016
STAGING_SUPABASE_URL=https://<staging-project>.supabase.co
STAGING_SUPABASE_ANON_KEY=<staging anon key>
STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging service role key>
STAGING_TEST_USER_PASSWORD=<synthetic staging password>
```

Do not put these values in `.env`, source control, screenshots, or reports. The verifier refuses to run when `STAGING_SUPABASE_URL` equals `VITE_SUPABASE_URL`.

## Exact execution order

1. Create a disposable/staging Supabase project.
2. Apply `schema.sql`, then migrations 002 through 015 in order.
3. Apply `server_backed_progress_fixture.sql`.
4. Record the `prompt_attempts` count and existing grants.
5. Apply `016_add_server_backed_lesson_progress.sql`; save its NOTICE output.
6. Run `verify_016_database.sql` in SQL Editor. It proves structural/grant compatibility plus forced rollback for both legacy direct INSERT and RPC INSERT without retaining probe data.
7. Set the staging-only environment variables with `STAGING_PROGRESS_PHASE=016` and run `npm run test:progress:staging`.
8. Compare the migration NOTICE: total fixture attempts 9, mapped 8, unmapped 1, and the expected unmapped ID.
9. Run rollback 016. Confirm fixture attempts are byte-for-byte unchanged and pre-016 grants remain.
10. Re-apply 016, re-run both verifiers, and confirm the same seven progress rows with no duplicates.
11. Configure temporary VI and EN staging deployments against this same staging project. Never reuse production credentials.
12. Execute the same-account/same-class cross-deployment, refresh, and incognito scenarios manually.
13. Confirm browser/network traffic uses the two RPC endpoints. Also confirm a deliberate legacy direct write is synchronized by the compatibility trigger during the transition window.
14. Apply migration 017.
15. Run `verify_017_grants.sql`.
16. Set `STAGING_PROGRESS_PHASE=017` and run `npm run test:progress:staging`; direct insert must fail and RPC tests must pass.
17. Exercise learner run/retry and instructor activity/history through both deployed builds.
18. Run rollback 017. Confirm only INSERT and UPDATE were restored.
19. Re-run phase 016 verifier to prove the restored direct-write compatibility state.

Production 016 remains blocked until every staging check is recorded as PASS.
