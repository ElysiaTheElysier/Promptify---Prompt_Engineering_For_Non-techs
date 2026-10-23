# Handoff — roster lifecycle and Drive originals — 2026-10-21

> Superseded checkpoint: read [the resumed handoff](HANDOFF_STAGING_LIFECYCLE_RESUME_2026-10-21.md) first. Migration011 has now been applied and combined staging life-1021 deployed. The older state below is historical.

## Why this turn stopped

User explicitly requested work until about 3% quota remains, then a handoff. Usage tool returned primary usedPercent97, secondary47, ordinaryUsageAllowedtrue. Work stopped at that threshold. Do not confuse quota stop with a completed production acceptance. User last reported PostgreSQL SQL Studio authentication completed; this has NOT been independently verified yet. Do not ask again before inspecting the preserved tab.

## Authorization and working tree

Continue fixing roster omission access retention and Drive-original404, verify/deploy staging, full governance logs. GPT-6.1 Sol plans/reviews; GPT-6 Luna high implements bounded tasks (6.1 Luna unavailable in this session). Preserve theme, IAM and production. No GCP IAM changes, password resets, new role grants or production operations are authorized. Database migration within staging is authorized. Preserve extensive pre-existing uncommitted two-app separation work. Do not reset/clean/commit/push. Target app `apps/promptify-intrepid`; read AGENTS and repository guide. No root runtime/shared package edits.

## Current deployed state — Drive only

- Project `ai-transformation-510302`, region `asia-southeast1`, service `promptify-intrepid-api`, Cloud SQL instance `promptify-staging` / database `promptify_db`.
- API revision **`promptify-intrepid-api-drv-1021`**, 100% staging. Image **`sha256:5b252c4dbcb51e43e2e7c74afc28a11964ed8ce3c14462aabf666a0189625314`**.
- Previous / rollback **`promptify-intrepid-api-ws-1020`**, image `sha256:291f2183a0e4dbe78ff0768f34afd85580b1a85685701b69ff6d55305558dfd9`.
- Build **`b3ced37d-85dc-42f5-a2d3-eb33a1c92a24`** SUCCESS. Candidate tag `drive-original-review`, zero traffic before five readiness/auth/CORS checks passed; then promoted. Five active checks passed too.
- Staging Hosting **`2249454171710ce5`**, 27 files; previous **`d910167f87b4a514`**. Default site untouched.
- **Drive-only Dockerfile copies exactly three files:** productionServerService.ts, sopIngestionService.ts, cloudStorageService.ts onto the previous exact image. It intentionally retains old rosterWorkbookService/googleRosterService/rosterTableService from the baseline. Thus deployed roster remains additive; **roster omission is NOT fixed live yet**. No migration was applied and no worker deployed.
- Source Workspace bindings / Gemini3.8Flash / existing environment were retained. No AI generation, grading, threshold or score changes.

## Implemented code

### Drive

`src/services/sopIngestionService.ts`: exact original/export bytes SHA256, optional expected canonical hash, private create-only snapshot under `drive-snapshots/<class>/<file>/<sha>/<filename>`. Supports native Docs TXT and Sheets XLSX exports. New ingestion and sync-request approval pass classId.

`src/services/cloudStorageService.ts`: `putImmutableOriginal` uses GCS ifGenerationMatch0, byte/hash/size checks and duplicate metadata validation; no public Drive fallback.

`src/services/productionServerService.ts`:
- Admin-only, class-scoped `backfillDriveOriginal` requires a bound published version, exact expected canonical sha and current approved file binding. Changed Drive bytes fail409 before storage/metadata mutation.
- Backfill merges only original pointer fields and missing snapshot MIME/kind; preserves canonical name/type/hash/bytes/content/chunks. Concurrent same-object repair can return idempotent false. Audit row records version/hash, never signed URL.
- Legacy pending direct-Drive contributions lacking originals are repaired before approval, using canonical hash; already-indexed pending does not require a new embedding. Every pending Drive approval checks current file binding.
- `sourceDownload` signs stored private path for300sec with canonical filename and does not re-read Drive.
- **Optional metadata issue still noted:** persistDriveOriginal currently drops generation returned from real cloudStorage (it returns `{path}`); injected tests can include it. snapshotGeneration therefore is not recorded for real saves. No source edits after frozen build; consider fixing this before combined rebuild, then review/test/rebuild. Pointer path+create-only code still governs current original delivery.

### Roster — implemented, NOT live

- New **`gcp/sql/011_roster_lifecycle.sql`**, SHA256 **`186642a407c8a9e83d368e0ae65a72a03b67e53478ca8120daa3aca0a44f9dce`**.
- Pre-use rollback **`gcp/sql/rollback/011_roster_lifecycle.sql`**, SHA256 **`34b5156925583d61895d2044dd1958d421663a34f10ab72c93010d06ab5f2e67`**. Refuses rollback after stamped sync use; do not discard provenance after live use.
- Per-connection source membership and enrollment ownership ledgers. Every existing enrollment conservatively manual-preserved. Only new source-owned memberships reconcile automatically; no historical provenance inference/mass revoke.
- Atomic service-only `product_finish_roster_snapshot(p_log,p_rows,p_manifest,p_next_sync)` updates membership, profile extras/contact, manifest, audit, connection and log. Validated full snapshot only,0..500rows. Generic bounded-range imports remain additive and manual-protected.
- Per-connection generations invalidate stale reads/config mappings. Existing log lock → class advisory → connection lock → sorted enrollment locks. Manual preserve helper locks enrollment and requires active state; source removal cannot race into a false manual success. Overlaps/manual/completed/expired/admin-removed access retained as designed; only roster-removed can auto-reactivate.
- Composite connection/class FK, active-source connection deletion/move restrictions, successful exact replay only, failed/stale/conflicting log rejection.
- App-local `rosterWorkbookService.ts` calls new RPC for bundles, maps known schema503 / conflict409. `parseRoster` allowEmpty defaultfalse; full validated workbook/Table permits empty department; V1 reads F502 sentinel and rejects >501 rows. Table already has2002 sentinel/reject>2001.
- Combined Dockerfile **`gcp/Dockerfile.lifecycle-originals`** + build YAML prepared, **not built/deployed**. Requires migration011 first, then candidate tests and review.

## Review and tests

Read [plan](proposals/STAGING_ROSTER_AND_DRIVE_FIX_PLAN_2026-10-21.md) and [Sol checkpoint review](STAGING_ROSTER_AND_DRIVE_FIX_REVIEW_2026-10-21.md).

- An in-flight complete allowlist checkpoint passed52/52 before final SQL/test adjustments. Saved `offline-checkpoint-before-final-review.json`; do not call it the final full suite for the final SQL hash.
- Final focused lifecycle and cloud-migration tests, typecheck passed after SQL corrections. Final full allowlist needs rerun once sources are frozen.
- Sol independently tested exact SQL hash above using **native portable PostgreSQL18.6, two sessions and observed lock waits**: manual grant wins preserves active; omission wins makes waiting manual grant fail instead of falsely report success. Local server55433 was stopped. Evidence `outputs/roster-concurrency-review-2026-10-21/` including native-race-result.json. Not a Cloud SQL concurrency acceptance.
- Drive snapshot/storage/download/authorization tests pass. New `verify_drive_original_backfill.ts` actual handler+PGlite mocks Drive/GCS. Reviewer caught a learner identity mismatch; Luna corrected verifier subject to match user auth_provider_id and added positive learner download. Luna reran test+typecheck PASS; Sol had not independently rerun this final correction before quota stop.
- Lint/boundaries/staging build pass; existing Workspace cycle/bundle warnings. Logs in current release evidence folder.

## Next steps, in order

1. **Verify preserved SQL Studio owner session**, then execute readonly `SELECT current_user, session_user, current_database()` and verify `postgres` / `promptify_db` and expected fictional class baseline before DDL. User says Authenticate completed. Google cloud identity demo.biz is distinct from PostgreSQL owner; runtime has can_createfalse and table ownerpostgres.
2. Reconfirm final migration hash and Sol review. Apply exact011 **before** promoting combined backend, verify new function/tables/RLS/grants/generation triggers/legacy preserved counts and record before/after schema/function hashes. No IAM change. Do not run old empty-target bootstrap or Supabase migration scripts. If owner auth is not actually ready, report exact blocker; do not reset credentials or elevate runtime.
3. Existing8 example.test memberships in the two new fictional classes are legacy-preserved. To test existing omission fixture, create a narrowly guarded maintenance adoption script: exact two class codes/IDs, exact8reservedemails, no auth identity, no real learner/manual ownership conversion, snapshot/audit before+after. Alternatively new source-owned fictional rows/classes. Do not manually revoke to hide failure. Validate preservation of the real demo/manhmanh QA participants.
4. Finish pending small metadata generation decision, final test/review/build. Build combined image with exact current Drive runtime plus new roster services. Existing combined base is old291f digest; COPYincludes all changed Drive+roster files, so do not omit any corrected file. Pin new build/digest/revision guards; existing Drive deploy script is pinned to ws1020 and **cannot be blindly reused**.
5. **Run real admin Drive acceptance now**: helper `/staging-workspace-qa.html`, button `Admin restore and verify originals` under duonglh. This repairs four old published sources using exact hashes, downloads and compares bytes/hash; no AI calls. **Not run yet.** If signed GCS fetch CORS fails, inspect; do not claim backend original unavailable just from browser fetch failure. Never write signed URLs into logs.
6. Run real learner `Learner verify original downloads` for each QA account, positive own file hash and denied backfill/foreign class. Original two SOPs/company must remain canonical. Preserve screenshots/reports.
7. Verify roster Add/Update/Omission, overlaps/manual/re-add/empty/failed+stale reads and actual authenticated access after removal on safely source-owned fixture. Existing main QA participants are manual-preserved, so they must not be used as a fake revocation pass. Offline identity fixtures are not live auth proof.
8. Candidate zero traffic → readiness/auth probes + review → staging promotion → signed acceptance. Rollback image if regression, but do not blindly drop post-use provenance tables.
9. Capture **after** governance + Hosting, compare expected image/revision/Hosting/schema/object deltas with IAM/env/SQLinstance/default-site unchanged. **After capture and comparison are still pending.** Package redacted logs, tests/review, manifests, archive+SHA. Update handoff/report and production blockers.

## Live sources and fixtures

Full previous record: `docs/STAGING_SYNTHETIC_WORKSPACE_2026-10-21.md`.

Northstar: class `9c32e26b-bcda-4549-bca8-dd4f350c2aaa`, code STAGING-SYNTHETIC-20261020-NORTHSTAR, Sheet `192FSgBS3yLEDrEaWIpv_sQJ40d2nnuDWGFEbDT7UhRM`, demo.biz learner. Versions `f11375ce-d3c1-4269-8489-588770433d4b`, `41a536c0-8bfd-428d-8b21-e3436d1f796c`. Connection `86898e57-8562-4de6-852a-d2cb38af60ac`.

Juniper: class `f6a40278-c5ab-42f2-9948-abb2fd1431bb`, code STAGING-SYNTHETIC-20261020-JUNIPER, Sheet `19PpiiiA4goQyKqck2Xb-vvFDJZ-MM0dxG1m7B2nJVvw`, manhmanh learner. Versions `5b5a0075-5de7-4697-9017-0eefeba1cffd`, `c1430456-d618-41ba-af92-629594239068`. Connection `dc4ef4ab-d13c-4226-92b0-36172399cc3e`.

Lesson `64b6f084-9e93-49cd-a7be-e2ef9e14ff65`. Source files/folders exact allowlist and runtime fixture remain in previous release folder. Do not import real company Sheet. No public/domain Drive grants.

## Tool/session state

- CUA browser ID2. Persistent handles: appQaTab tab2 (real duonglh admin, profile confirmation already preserved/confirmed); workspaceQaTab tab7 (new helper loaded, originals button NOTclicked); demoSqlTab tab9 (demo.biz Cloud Console/SQL Studio, postgres authentication user reports complete, NOTverified). All3 marked handoff. Call cua.rewriteDocumentation on resume. Do not re-open old Google SDK password tab1 or reuse OAuth URLs; no credential extraction. sqlStudioTab tab8 was wrong duong CloudConsole permission error and is disposable.
- Browser SQL Studio URL contains transient auth parameters: do not copy raw URL/AX into governance archive. Do not save passwords/tokens/signed URLs.
- SQL proxy55439 existed PID37740 and runtime query worked. Runtime secret only used in memory from existing Secret Manager. Never use runtime credential to pretend owner. No owner password stored/exported.
- Current evidence **`apps/promptify-intrepid/outputs/staging-release-2026-10-21-lifecycle-originals/`**: before inventories/Hosting, drive-build-submitted/build/image, candidate-deploy/promotion/checks, active-checks, Hosting deployment, lint/boundaries/build and initial52testcheckpoint. After inventory, actual original results and final archive pending.
- Reusable scripts: deploy_staging_drive_originals.ps1 (pinned previous baseline/build), verify_staging_drive_originals.mjs candidate/--active; deploy_staging_hosting_rest.ps1 now supports ReleaseDate2026-10-21 + suffix lifecycle-originals, uses captured current Hosting baseline. Build used existing explicit staging source bucket, no default new bucket.

## Remaining production gates

Do not claim full production: roster migration/live acceptance pending, Drive live byte-hash acceptance pending, safe legacy migration policy, worker scheduled-sync acceptance,100 distinct users/100AI pipeline recovery/capacity (historical429/504), alert delivery, restore rehearsal and domain ownership remain open. Keep Gemini3.8Flash and score/condition/quota protections. No .ai purchase/DNS change authorized or performed.
