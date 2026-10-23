# Roster lifecycle and Drive-original fix plan — 2026-10-21

Scope: Intrepid only, staging deployment and guarded synthetic acceptance only. No production, IAM, role, score, quota or scheduled-worker enablement changes. Preserve existing source changes and the earlier acceptance evidence. The [independent review](../STAGING_SYNTHETIC_INTEGRATION_REVIEW_2026-10-20.md) remains the baseline; this plan does not claim that either bug is already fixed.

## Roster ownership and lifecycle

Use one new additive app-local Cloud SQL migration, `apps/promptify-intrepid/gcp/sql/011_roster_lifecycle.sql` (final filename may be descriptive). Do not rewrite baseline/applied migrations. Add two service-only, RLS-protected ledgers:

- Connection membership: connection ID, class ID, learner/user identity, active membership, last-seen log and timestamps. Unique connection/person; enforce that connection and enrollment belong to the same class with composite constraints or checked foreign-key joins. Membership remains as history when inactive.
- Enrollment ownership: enrollment ID, `manual_preserved` and `removed_by_roster`, plus audit timestamps. Backfill **every existing enrollment** as manual/unknown protected. Lack of evidence is not permission to revoke.

New complete-workbook syncs may own an enrollment only when they actually create it; an existing enrollment is protected unless explicitly reviewed/adopted. An enrollment trigger preserves manual ownership on inserts and status updates outside the trusted service-only finalizer, including `active → active`. Do not rely on the trigger for a manual `INSERT ... ON CONFLICT DO NOTHING`: audit those entry points and explicitly mark their independent grant. Current examples are legacy roster import and Basic enrollment. Self-enrollment and department correction have update branches that must remain protected. A transaction-local `promptify.roster_sync_connection` context is an internal server convention, never a client payload or an authorization check; verify log/connection/class/actor inside the finalizer and restore the prior context before returning.

Apply a successful complete snapshot to **that connection only**. Upsert present membership, mark absent previous membership inactive, then lock affected enrollment rows in a deterministic order and recompute eligibility:

| Current state | Snapshot effect |
| --- | --- |
| Person has no enrollment | Create active source-owned enrollment and active membership |
| Active, independently manual/legacy protected | Preserve access when this source omits them |
| Active, source-owned, another active connection includes them | Preserve access |
| Active, source-owned, no remaining active connection | Set enrollment to removed and `removed_by_roster=true`; retain users, history, progress and awards |
| Previously removed by roster, source-owned, present again | Reactivate and clear roster-removal marker |
| Manually removed, expired or completed | Never automatically reactivate; report blocked/preserved count rather than silently override lifecycle |

Source memberships and enrollment grants are separate facts. A source can still list a manually blocked person without granting them access. A successful old-department snapshot removing an exclusively owned membership revokes that class; the new department snapshot grants only its own class. Do not revoke unrelated/manual/other-source classes merely because a new department has the same email. Separate class syncs are not a cross-class atomic transfer; acceptance must run the valid old/new snapshots and describe that boundary.

## Atomic API/worker contract

New service-only RPC:

`product_finish_roster_snapshot(p_log uuid, p_rows jsonb, p_manifest jsonb, p_next_sync timestamptz) → jsonb`

Recommended result contract: `{processed, classId, added, reactivated, removed, retainedManual, blockedInactive}`. `processed` is source row count, not a claim that every listed inactive person was reactivated. Store and replay the same result for a completed log. Save/check the request's frozen rows/payload through `rebuild_roster_imports` or a dedicated payload field; a changed direct replay must conflict. A same app request should return its recorded result without refetching a changed Sheet.

The RPC verifies log → connection → class and current assigned-editor authority for the log actor, complete-workbook mapping type, active/upcoming class, all row fields/duplicates and bounded size. It commits membership changes, enrollment changes, existing source profile behavior, manifest/next sync, audit and success log together. `finishWorkbookSync` becomes a thin call to this RPC; no manifest/profile writes may follow a replay/failed/stale result. Keep the old generic additive importer and existing error-recording RPC compatible.

Serialize source snapshots at class scope and use connection generations to reject old in-flight reads. Minimal integration: add connection `sync_generation` and log `connection_generation`; a before-log-insert trigger locks the matching connection, increments its generation and stamps the new log. Existing manual and worker claim paths both benefit before reading Google. A mapping/Sheet/class change increments the generation only when values actually differ. The finalizer compares the stamped/current generation and rejects stale work before changes. Follow the existing log-first lock order, then class serialization and connection, then sorted enrollment rows; do not introduce connection → existing-log inversion against stale-log cleanup. No network read belongs inside the SQL transaction. A newer failed attempt must not cause an older snapshot to overwrite newer intent.

`productionServerService.syncSheet` and `rosterWorkerService.runRosterWorker` must both use the new complete-workbook finalizer. Generic bounded ranges remain additive and cannot delete memberships. No worker service or schedule is enabled in this release.

## Valid empty and bounded reads

Keep `parseRoster(..., allowEmpty=false)` by default. Only complete `parseWorkbook`/`parseTableRoster` paths pass true after schema/reference validation. A valid V1 Users header with no people is an authoritative empty roster only when the other five required tabs and selected department validate. A valid Table with selected department/reference structure and no scoped people may be empty. Headerless, malformed, missing reference, unauthorized, timeout and truncated reads fail without any reconciliation.

Preserve the Table sentinel: request through row 2002 and reject more than 2001 returned rows. Read V1 through row 502 while retaining the 501-row parser bound, so an over-limit workbook is rejected rather than silently truncated. Enforce the 500 selected-user limit. Empty generic/custom ranges remain rejected.

## Legacy and the existing synthetic fixtures

No migration may infer that all pre-existing `product_roster_profiles` are exclusively Sheet-owned. Preserve them. For the two known synthetic classes only, a separate reviewed maintenance adoption may mark the eight existing `.example.test` enrollments as connection-owned after exact class code/connection/Sheet/import-log/email-set/no-linked-auth checks. Persist before/after ownership and an audit reason. Do not delete/reinsert the enrollments or manually revoke them to manufacture an omission pass. The existing real QA learner enrollments remain protected manual grants.

Recommended live sequence: new code syncs Add to populate four connection memberships in each class, guarded adoption assigns only the eight known fictional rows, then ordinary signed app Omission must reduce exclusively source-owned synthetic active members from four to three. Capture actual learner access denial separately with an existing authorized QA participant only if their provenance was deliberately source-owned in an isolated additional fixture; never fabricate Firebase identities.

## Drive-original delivery

Store an immutable private copy of the exact bytes used by extraction. Refactor the Drive read/extract helper without returning raw bytes into contribution JSON, browser responses or logs. Existing metadata stays compatible: `filename`, `bytes`, `sha256`, `driveFileId`, and `storageBucket='product-sop-originals'`/server-generated `storagePath`. Add source MIME and snapshot kind so native Google Docs TXT and Sheets XLSX exports are described as ingestion exports rather than native editable originals.

Use a deterministic class/file/hash-scoped object key, a create-if-absent storage precondition and existing bucket/runtime permissions only. If the object exists or an earlier write outcome is uncertain, verify hash/size before reuse; never overwrite. Record the storage generation when practical. Fail before publication if the immutable original cannot be persisted. A DB failure after object creation may leave an unreachable orphan; retain it for reviewed cleanup rather than deleting potentially shared evidence during error handling.

Both direct Drive submissions and approval-time Drive sync requests must enforce the current class/file binding, read once, extract and snapshot once, and persist canonical metadata before publication. Keep existing uploaded-file behavior intact. `sourceDownload` accepts only canonical class/version IDs, resolves a currently published bound source through the actor's ordinary class scope, and signs only its immutable private snapshot with a safe filename and the existing five-minute cap. It must never accept arbitrary Drive IDs/storage paths or expose service tokens.

For the four already published Drive sources, use an explicit admin-only scoped backfill action, not a learner-triggered refetch. The server derives file ID and expected 64-character SHA-256 from the canonical published contribution, checks current class/version/lesson binding and exact file approval, refetches within the existing byte/time bounds, and compares hash **before** storing. Changed bytes return conflict; do not silently attach today's source to yesterday's published version or reindex. Native exports that cannot reproduce the prior byte hash require a new reviewed version rather than an invented match. Persist the new storage metadata only on the exact still-published class/version/file/hash row without an existing snapshot and with a still-current binding; concurrent/replayed backfills return the same canonical snapshot. Recheck current binding before signing. Existing immutable originals need not remain readable in Drive once stored, subject to the agreed app source approval policy.

## File ownership for implementation

| Area | Files/functions |
| --- | --- |
| SQL owner | New `gcp/sql/011_*`; focused app-local lifecycle PGlite tests; additive rollback instructions preserving ledgers/data |
| Parent call paths | `productionServerService.ts` sync, submit/review, sourceDownload/admin backfill; `rosterWorkbookService.ts` thin atomic wrapper; `rosterWorkerService.ts` complete-bundle use |
| Parent parser/UI | `googleRosterService.ts`, `rosterTableService.ts`, `rosterWorkbookService.ts`; roster copy describing owned omission; staging helper and actual before/after captures |
| Drive owner | `sopIngestionService.ts`, `cloudStorageService.ts`/bounded Drive snapshot helper; offline immutable storage/hash/export tests |
| Review | New RPC privilege/tenant/replay/concurrency audit; negative handler tests; independent staging evidence reconciliation |

## Required acceptance before staging promotion/completion

| Test | Required observation |
| --- | --- |
| New source 3 → 4 → 3 | One stable enrollment per email; final omitted source-owned access removed; history retained |
| Re-add after automatic omission | Same enrollment returns active; no duplicated identity/history |
| Manual/legacy overlap | Omission retains explicit and unknown historical grants, including same-status manual updates |
| Two approved source connections | Removing from one preserves the other; removing the last removes only an exclusively source-owned active enrollment |
| Manual removal/completed/expired | Subsequent source presence does not override those states; count is visible |
| Department transfer | Valid old department omission removes owned old access; new source grants new class; other grants/history preserved |
| Valid empty and sentinel overflow | Valid full snapshot can remove final owned membership; malformed/partial/over-limit cannot change access |
| Concurrent snapshots/mapping edit | Older generation cannot overwrite newer intent; concurrent manual grant is preserved; one atomic final state |
| Failure/replay | Any SQL failure rolls back membership/profile/manifest/log success together; successful request replay is stable; changed payload conflicts |
| Authorization | Learner/foreign class cannot finish/adopt/backfill; service-only helpers and ledgers unavailable to public roles |
| New Drive source | Exact extracted bytes stored once; published source downloads privately with safe filename and matching hash |
| Four legacy Drive backfills | Same published versions/citations/embeddings retained; four own originals become downloadable; no new paid indexing needed |
| Changed/currently unapproved Drive source | Hash conflict or source-binding denial; no wrong snapshot/signing or publication |
| Storage retry/limits | No overwrite, matching object reuse, mismatch rejection, streamed size cap, timeout outcome preserved |
| Cross-company source/original probes | Both real QA learners get their own originals and 403 for foreign/pending/guessed versions; no token/public sharing |
| Release | Target app typecheck, lint/AST/Dependency Cruiser, focused and full offline allowlist, boundaries, staging build/smoke; local production build excludes QA pages; inspect migration/live catalog then only staging API/Hosting changes |

Deploy only after local review and bounded staging schema preflight/backups using existing permissions. Keep the previous compatible staging API revision as rollback. Rollback leaves new ledgers, originals and history intact; forward repair functions or restore the prior API, rather than destructive down migrations. Compare expected release/schema deltas separately from unchanged IAM/roles/production. The worker, general profile-name policy and historical 100-user/100-AI capacity gate remain separate work.

## Current migration prerequisite

Read-only deployment-path inspection found that the existing runtime database login is not the owner and cannot create the new schema objects. The earlier successful 006/010 rollout, documented in `STAGING_APPLY_RESULT_2026-10-17.md`, used a user-supplied owner credential held only in process memory; it was intentionally not saved. The checked-in 06 schema template requires a configured owner connection and is empty-target bootstrap, not an upgrade path for this populated staging database. The legacy Supabase management migration script targets the old Supabase backend and is not a Cloud SQL fallback.

Therefore migration 011 needs an authorized owner connection securely configured by the user or a DBA applying the exact reviewed migration. Do not reset a password, grant IAM/roles/storage ACLs, use runtime as migration owner, or repurpose security-definer application functions to bypass this prerequisite. Offline work and independently compatible Drive-only staging verification may continue. Do not promote roster code requiring 011 before catalog verification confirms that migration is applied.
