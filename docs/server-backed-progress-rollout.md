# Server-backed learning progress rollout

## Compatibility matrix

| Application | Database | Expected |
| --- | --- | --- |
| Old code | Old DB | Compatible |
| Old code | DB through 016 | Compatible: legacy direct attempt writes remain granted |
| New code | DB through 016 | Compatible: atomic RPCs and `lesson_progress` exist |
| New code | DB through 017 | Compatible: all writes use RPCs |
| New code | Old DB | Incompatible: required RPCs do not exist |
| Old code | DB through 017 | Incompatible: legacy direct attempt writes are revoked |

Safe order: apply 016, deploy and verify new code on both deployments, then apply 017.

## Direct `prompt_attempts` write audit

- Production learner create: `HybridView` calls `dbService.recordPromptAttemptAndProgress`, which calls the atomic RPC.
- Production evaluation retry: `HybridView` calls `dbService.updatePromptAttemptEvaluation`, which calls the retry RPC.
- Compatibility method `dbService.recordPromptAttempt` delegates to the atomic RPC whenever Supabase is configured; its direct local-store write is test/development-only.
- `test/verify_real_ai_flow.ts` calls the compatibility methods and therefore uses RPCs against configured Supabase.
- No instructor, admin, API route, or production script directly inserts or updates `prompt_attempts` on the current codebase.
- Historical migrations 003/006/010 define the previous grants and RLS policies; they are not runtime call sites.
- `supabase/rollback_english_review.sql` directly deletes English fixture attempts as an explicit manual rollback script; it is not an application write path and migration 017 does not revoke DELETE.

Migration 017 is therefore code-compatible with the current new build, but it must not be applied until both deployed frontends have been upgraded and observed using the RPC paths.

## Evaluation score contract

`evaluation_json` is one `AiEvaluationResult` shape. Its canonical total is `total`, an integer from 0 through 10. The normalizer derives it from exactly five integer `scores` fields (`taskCompletion`, `groundedness`, `formatAdherence`, `constraintCompliance`, `businessUsability`), each from 0 through 2. SQL accepts the score only when `total` is numeric, integral, in range, every criterion is valid, and `total` equals their sum. Malformed or inconsistent evaluation JSON remains on the attempt but contributes no `best_score`.

## Staging/disposable database checklist

1. Snapshot `prompt_attempts` row count, grants, and representative legacy rows.
2. Apply migration 016 and capture every backfill NOTICE.
3. Verify mapped/unmapped counts and manually inspect each reported unmapped sample.
4. With old application code, insert and update an owned `prompt_attempts` row; confirm both still work after 016.
5. With new code, call `record_prompt_attempt_and_progress`; confirm attempt and progress commit together.
6. Submit multiple attempts for one lesson; confirm one progress row, incremented `attempts_count`, latest `last_attempt_id`, and maximum valid `best_score`.
7. Submit attempts for different lessons, classes, and learners; confirm no cross-group aggregation.
8. Force the progress upsert to fail inside a transaction; confirm the attempt is rolled back.
9. Mark enrollment `removed`; confirm record and retry RPCs are denied and neither table changes.
10. As learner A, verify RLS cannot read learner B's progress. Verify authorized instructor reads expected rows.
11. Retry evaluation through the retry RPC; verify evaluation and `best_score` update atomically.
12. Run rollback 016; confirm RPCs/table are gone, historical attempts and original grants are unchanged.
13. Re-apply 016; confirm idempotent schema/backfill result and no duplicate progress rows.
14. Deploy the new build to both VI and EN staging/review environments and execute the cross-domain progress scenario.
15. Apply 017 only after both deployments no longer issue direct table writes. Verify direct INSERT/UPDATE fail while both RPCs still work.
16. Test rollback 017; confirm only INSERT/UPDATE grants are restored, with no wider privilege change.
