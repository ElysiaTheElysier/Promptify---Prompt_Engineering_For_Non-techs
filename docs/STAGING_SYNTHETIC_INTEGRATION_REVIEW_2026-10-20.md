# Independent synthetic Workspace integration review — 2026-10-20

**Reviewed and updated 2026-10-21 (Asia/Saigon); 2026-10-20 evidence filenames and UTC timestamps are preserved.**

**Final independent conclusion (2026-10-21): the controlled two-company Drive/SOP pipeline and both real learner retrieval/isolation checks pass; production remains blocked.** Signed admin evidence shows initial roster sync/replay, Drive discovery, all four source publications with indexed canaries/citations, and isolated admin queries. Each learner's ordinary signed session retrieves its own two published sources with matching citations and receives 403 for the other company's class. Live omission tests in both companies leave four active synthetic members after processing a three-person source. Drive-original downloads return 404. No automatic reconciliation, scheduled-worker, general tenant-isolation certification or 100-user capacity claim is established.

## Prioritized next plan

1. **Blocker — roster lifecycle:** agree authoritative source ownership, then implement atomic connection-owned reconciliation without revoking manual/other-connection access. Test omission, department transfer, last-person removal, re-addition, overlapping sources, partial reads and concurrent syncs. Current live omission failure and offline transfer failure remain open; no runtime fix is claimed.
2. **Profile contract:** preserve confirmed user-owned values, define how unconfirmed/source-owned fields update, and capture actual name values immediately after the Update stage before any later source restores the original value. Processed/member counts alone do not test profile updates.
3. **Drive originals:** implement authorized private original delivery for Drive-origin sources if required, or clearly expose that limitation. Four actual 404s remain open; successful indexed retrieval does not make originals downloadable.
4. **Scheduled operation:** separately prepare/review the worker revision, source bindings, OIDC/scheduler and recovery tests. Current evidence validates on-demand API sync only. Do not enable schedules until provenance/reconciliation is safe.
5. **Independent production capacity gate:** address provider 429/504 and recovery/queue behavior, then perform the agreed bounded 100-user/100-pipeline acceptance with real authenticated participants or a deliberately isolated authorized harness. Four short SOP indexing operations provide no new evidence for that historical unresolved capacity target.

## Scope and evidence rules

Target: `apps/promptify-intrepid`. Reviewed AGENTS, repository guide, the [earlier staging access/load audit](evidence/STAGING_ACCESS_ROSTER_LOAD_2026-10-20.md), actual Table parser, workbook/manual/worker paths, source policy, Drive extraction/discovery, production handler, and checked-in Cloud SQL routines. Preserved all existing changes. This review made no runtime edits, deployment, database/cloud writes, IAM/role changes, synthetic authentication accounts, or paid provider calls. Its mutations are this document and ignored local review artifacts.

Evidence categories below mean:

- **Offline actual code:** checked-in handler/parser/extractor and SQL run against isolated PGlite, with test identity verification. This is stronger than a mock response and weaker than deployed end-to-end evidence.
- **Historical live report:** the prior audit describes an authenticated deployed result. It is cited as prior evidence, not independently repeated here.
- **Independent live connector read:** this reviewer read the two newly created synthetic Sheets and four SOP file metadata records through the connected owner's account. This proves live file contents/metadata; app/API runtime authorization remains a separate test.
- **Saved signed workflow evidence:** this reviewer inspected the operator's ordinary authenticated helper output and related read-only reconciliation files. The reviewer did not replay those paid/live requests or independently authenticate as those users.
- **Pending live:** an operator setup or planned test, without the full resulting request/state evidence reviewed here.

Artifacts: `apps/promptify-intrepid/outputs/staging-synthetic-integration-review-2026-10-20/`. Runnable local reproductions and JSON results are retained there. Original fictional fixtures remain at `apps/promptify-intrepid/outputs/staging-synthetic-workspace-2026-10-20/`; reusable generator is app-local `scripts/generate_staging_synthetic_roster.mjs`.

## Actionable findings

### 1. Omission and department transfer retain old access

**Confirmed offline through actual handler + SQL.** Initial successful Tech sync imported two people. The next successful sync omitted one. That person's authenticated `snapshot` still selected Tech. Syncing the omitted person into People left both Tech and People enrollments active, and the actual class list exposed both.

**Also confirmed live for omission in both fictional companies:** `admin-roster-mutations.json` records Add=4, Update=4 and Omission processed=3 while active synthetic members remain=4. `roster-live-readonly-reconciliation.json` independently records `learner04` still active in each class. It records no other-company synthetic email in either class and eight roster users with no linked auth identity. Those synthetic DB users are not authenticated test participants. Department-transfer access retention has offline actual-handler proof only; it was not repeated live here.

Source: `gcp/sql/001_baseline.sql:1878`, `product_import_roster`. It inserts absent users/enrollments and upserts scoped roster profiles. It has no absent-row removal branch. The UI explicitly says missing users are not automatically deleted, so this is a known behavior that must not be reported as automatic source-of-truth reconciliation. It blocks acceptance if production requires omission/department transfer to revoke access.

`enrollments` and `product_roster_profiles` contain no source connection provenance. Revoking every enrollment absent from one Sheet would be unsafe: the same person may be manually provisioned or present in another approved connection. Existing inactive membership is deliberately rejected rather than silently reactivated.

**Safe proposed direction, not implemented by this reviewer:** add connection-owned membership provenance, preserve pre-existing/manual memberships, reconcile only membership owned by the successful authoritative snapshot, and deactivate an exclusively roster-owned enrollment only after its last active connection membership disappears. Lock at class/enrollment scope across connections. Keep membership, profile, enrollment, manifest and sync log changes in one transaction. Do not infer historical provenance or mass-revoke old memberships from `product_roster_profiles` alone. Explicit manual grants/reactivations need persistent provenance even if the enrollment is already active. Re-addition must distinguish a prior roster removal from an administrator's lifecycle removal.

The parser currently rejects zero selected-department users (`googleRosterService.ts:26`), and SQL accepts 1–500. Last-person removal therefore needs a specifically validated empty authoritative snapshot policy. Header-only, truncated, malformed, unauthorized or failed reads must never be treated as an empty successful roster.

### 2. Profile update semantics need an explicit ownership contract

**Confirmed offline:** a subsequent roster value changed country to Singapore, but existing `users.full_name`, `product_profile_details.employee_id` and `office_location` retained their original values. User insertion and profile detail insertion both use `ON CONFLICT DO NOTHING`; country/department uses upsert. Tablev2 deliberately supplies blank employee/location values rather than guessing them.

Preserving learner-confirmed names and self-entered details can be correct. The UI/report must describe this behavior accurately; it cannot certify that all roster profile fields update. A future source-owned update policy should store source values separately or update only unconfirmed/source-owned fields, avoiding erasure by blank Tablev2 values. The supplied `update-one` fixture changes FullName only, so it demonstrates this limit, not a successful general profile update.

**Live evidence limit:** each company's final reconciliation lists one name differing from the earlier Update source. However, reconciliation runs after Omission, whose source contains the original names again. That final-state mismatch alone cannot establish what happened immediately after Update; a correct updater could apply the changed name and then restore the original at Omission. Current SQL and the isolated offline reproduction confirm insert-only name semantics. The live Update row's `processed=4/active=4` is membership evidence only. Capture a stage-specific profile read before claiming a live name-update pass or failure, including `profile_confirmed_at` if asserting unconfirmed-profile behavior.

### 3. Roster SOP references, Drive discovery and publication are separate steps

`parseTableRoster` returns SOP references in a workbook manifest. `finishWorkbookSync` persists that manifest; it does not extract, embed, publish or bind documents. `listDriveFolder` returns supported file metadata; it does not ingest or approve those files.

The policy explicitly binds source kind and class: a `folders` approval authorizes discovery only; `files` approvals are still required for direct ingestion or approval-time ingestion of a sync request. A `sheets` approval does not authorize the SOP files listed in it. This is fail-closed behavior, but the operator setup and tests must include all three kinds where used.

**Offline actual code passes:** unknown/foreign source IDs are denied before Workspace reads; foreign class/source/lesson requests are denied; pending/peer/foreign source contents remain scoped; a binding removed during a retrieval race is not returned. Historical signed-session probes in the earlier audit add deployed negative-access evidence. The new saved signed admin workflow adds positive discovery/extraction/publication/indexing/admin retrieval evidence, described below; learner acceptance remains separate.

### 4. Scheduled worker remains a separate acceptance gap

The previous audit explicitly states the roster worker was not deployed/newly enabled. Updating the API image does not update the worker. The worker must run the source-binding check and have matching explicit approved Sheet bindings, existing read identity/delegation and verified scheduler/OIDC audience. The checked-in worker template has Workspace identity configuration but no `WORKSPACE_SOURCE_BINDINGS_JSON`; an unmodified deployment would fail closed for every roster source.

The worker processes at most one connection per tick and uses the connection creator's current editor access during finish. Validate loss of owner permissions, one connection versus backlog timing, stale running logs, failed reads, replay and recovery in an isolated staging workload. Do not turn on schedules as an incidental part of fixture upload.

## Independent fixture validation

**PASS, offline actual parser/extractor:** two fictional companies, eight snapshots total, all JSON/CSV Table pairs equivalent after CSV parsing, exactly 32 columns per row. Each company's actual parsed user counts are 3 → 4 → 4 → 3. Roster upload JSON matches parsed rows. Eight emails are distinct reserved `.example.test` examples. Four SOP canaries are distinct and survive actual TXT extraction/chunking; no company's text contains the other's canaries. Combining both companies' Table rows still returns only the three users for the selected department.

Each snapshot contains two `PendingUpload` SOP references with no Drive ID/URL; both are correctly excluded (`excludedAssets=2`, `unmappedAssets=0`). This is not positive SOP admission. An operator must fill authorized real staging file IDs and an allowed access status in an explicitly approved synthetic Sheet copy before testing ingestion. Fixture `classId` strings are descriptive labels, not canonical API UUIDs; retain an explicit mapping to actual fictional runtime class IDs.

**Live synthetic copy readback:** independently verified the connected profile is `duonglh.work@gmail.com`, both files are native Sheets, and each has visible `Table`, `Add`, `Update`, `Omission` tabs with 32 columns. Metadata shows owner plus a reader grant to the existing runtime service identity and no public/domain permission in the returned records. Four SOP TXT metadata records have the expected company folder parents and the same bounded owner/reader grants.

The first readback found an operator setup error: file approvals were written to `U2:W3`, on Country/Department reference rows, while the actual SOP rows remained pending. All eight actual parses returned zero SOPs. This is not a runtime bug. The operator corrected only those synthetic Sheets: cleared `U2:W3`, bound `U7:W8` in Table/Omission and `U8:W9` in Add/Update. Independent second readback and actual parser validation now pass all eight tabs with counts 3/4/4/3, exactly two own-company SOP references each, and zero excluded/unmapped assets. Both initial and corrected raw/readback/parser evidence are retained. No cloud edits were made by this reviewer.

Read-only source references: [synthetic Northstar workbook](https://docs.google.com/spreadsheets/d/192FSgBS3yLEDrEaWIpv_sQJ40d2nnuDWGFEbDT7UhRM/edit), [synthetic Juniper workbook](https://docs.google.com/spreadsheets/d/19PpiiiA4goQyKqck2Xb-vvFDJZ-MM0dxG1m7B2nJVvw/edit).

## Acceptance matrix

| Check | Evidence now | Required completion |
| --- | --- | --- |
| Table schema, counts, CSV/JSON parity, department scope | PASS offline actual code, independent live readback and signed initial sync | Retain explicit source bindings and business mappings |
| Add one learner, stable identity/enrollment | PASS live signed initial/add counts plus DB reconciliation | No fabricated auth participant inference |
| Country update | PASS offline actual SQL | Synthetic country-change fixture/live state if claimed |
| FullName/employee/location update | Retained old values offline; live name update stage not captured | Agree ownership and capture immediate post-Update profile values |
| Omission/department move revocation | Omission FAIL live in both; transfer FAIL offline | Provenance-aware reconciliation or explicit managed deprovisioning acceptance |
| Same request replay | PASS finished log offline and stable signed response in both classes | Live changed-payload conflict/side-effect audit if claimed |
| Malformed/unauthorized read | PASS relevant offline rejection tests | Ensure no partial imports or access removal |
| Manual/other-connection overlap | Provenance missing | New reconciliation must preserve those independent grants |
| Bound folder discovery | PASS saved signed admin evidence, two intended files per company | New synthetic folder reader grants remain explicit |
| File source binding and extraction | PASS four live canonical file/version/canary checks; foreign Sheet/folder 403 | Preserve class and source-kind binding checks |
| Approval, embeddings and retrieval | PASS four live publications, one indexed chunk/citation each; two isolated admin queries; signed A/B two-source citation queries | Complete for this bounded synthetic acceptance; broader scale/recovery remains separate |
| Drive-original download | FAIL/unsupported, four live 404s | Authorized private delivery or accepted explicit limitation |
| Tenant isolation, reverse canary queries | PASS offline matrix, live foreign-source denials/admin isolated queries, both signed learners' own queries and other-class 403s | Tested two-class/two-participant scope only; retain broader negative/regression tests |
| Auto sync | Blocked worker deployment/config evidence | Separately authorized deployment, scheduler evidence, one due isolated source and logged result |
| Capacity/recovery | Prior live probe exposed 429/504 | 100 distinct users/100-run workload and recovery; quota protections retained |

## Review of the proposed live helper

The fixed staging helper (`src/staging-workspace-qa.tsx`) uses ordinary `productRequest` authentication; no token export, forged identity or bypass was found. It checks staging mode/host, the exact new fictional class code and department, and existing QA account/role. Runtime mapping explicitly identifies Northstar class `9c32e26b-bcda-4549-bca8-dd4f350c2aaa` and Juniper class `f6a40278-c5ab-42f2-9948-abb2fd1431bb`; the maintenance setup is not signed-user acceptance. The candidate source-binding JSON exactly separates the two Sheets, two folders and four files. Five zero-traffic candidate probes pass health/readiness/unauthenticated rejection; they do not establish positive integration.

**Helper corrections inspected:** the helper initially called `sourceDownload` after publishing a Drive-origin contribution. That route only signs uploaded originals with `metadata.storageBucket='product-sop-originals'` and `storagePath`; `extractDriveSop` sets `driveFileId`, so a successfully indexed Drive source would then return 404. The revised helper checks canonical published snapshot/version/content/chunks/citation and records the unsupported Drive-original 404 separately. Drive-original delivery remains a product limitation; correcting the helper does not implement that feature.

The revised helper hard-stops failed initial roster/discovery/foreign-source prerequisites before indexing. It verifies each exact file/version's own expected canary, indexed chunks, lesson binding and citation. Learner retrieval checks nonempty citations plus own/foreign canaries. Its displayed budget now identifies four document-indexing operations, two admin query embeddings and one query embedding per learner probe. This reviewer inspected saved admin execution evidence; the reviewer did not execute the helper or add provider calls.

## Saved signed admin evidence independently inspected

Evidence directory: `apps/promptify-intrepid/outputs/staging-release-2026-10-20-synthetic-workspace/`.

- `admin-initial-sop-workflow.json`: actual actor `duonglh.work@gmail.com · admin`; two initial syncs process three rows with stable same-request replay; both folders return exactly their two intended TXT file IDs; four other-company Sheet/folder requests return 403. Four canonical contributions/version IDs show their exact own canary, one indexed chunk and a nonempty citation. Both admin searches return two results with an own canary and no foreign canary. Four original-download calls remain recorded as failing 404s.
- `admin-roster-mutations.json` plus `roster-live-readonly-reconciliation.json`: live omission fails in both classes as detailed above. The read-only query is scoped to the two guarded fictional classes and reserved example emails. The Update membership rows are not evidence of profile field updates.
- `admin-initial-before-folder-read.json`: the initial run stopped with 422 after the Northstar roster sync and before discovery/publication. The operator then added reader access for the existing runtime service identity to only the two newly created synthetic SOP folders. The successful later discovery is consistent with that correction. Independent connector metadata after the correction shows owner plus that reader, no public/domain entry. These are Drive ACL changes, not GCP IAM changes; do not claim all sharing was unchanged.
- `comparison.json`: 22/22 recorded comparison/expected-state checks pass. Independently inspected the comparison implementation: approved source bindings and revision are expected-state assertions; image is masked from the generic spec comparison. Direct before/after image read confirms the same digest `sha256:291f2183a0e4dbe78ff0768f34afd85580b1a85685701b69ff6d55305558dfd9`, while revision changes from `ar2-1020` to `ws-1020`. GCP IAM, secret versions, storage inventory, SQL settings and default Hosting release comparisons pass; the new explicit bindings and staging release are intended changes, not evidence that the entire system is unchanged.
- `hosting-rest-release.json`: staging version `d910167f87b4a514`, 27 public files, prior `6bc8c6d9bb6c4aa9`; no production Hosting release is claimed. `production-exclusion.json` records a local production compile with both QA HTML entries absent. Five candidate and five active probes plus the final asset/auth-rejection probe are infrastructure checks, separate from the signed workflow.

## Signed learner evidence

`learner-company-a.json` (UTC `2026-10-20T17:37:42.442Z`, local 2026-10-21) records the actual ordinary app actor `demo.biz@intrepid.asia · learner`. Company B's class snapshot returns 403. Company A search returns two results with nonempty citations exactly matching admin-published Northstar versions `f11375ce-d3c1-4269-8489-588770433d4b` and `41a536c0-8bfd-428d-8b21-e3436d1f796c`; no foreign canary is reported. The reviewed helper requires an own canary and citations for its passing result. This establishes the tested learner A path; it does not establish arbitrary-tenant isolation, automatic revocation or load capacity.

`learner-company-b.json` (UTC `2026-10-20T17:40:59.543Z`, local 2026-10-21) records the actual ordinary app actor `manhmanh100127@gmail.com · learner`. Company A's class snapshot returns 403. Company B search returns two results with nonempty citations exactly matching admin-published Juniper versions `5b5a0075-5de7-4697-9017-0eefeba1cffd` and `c1430456-d618-41ba-af92-629594239068`; no foreign canary is reported. This completes the tested reverse direction. The four learner-returned citation version IDs match the four admin canonical publications exactly. These two real participants are distinct from the eight fictional roster database records and do not establish 100-user capacity.

`final-independent-evidence-summary.json` in the review artifact directory records a successful local assertion pass over the saved admin, mutation, reconciliation and A/B learner evidence, plus SHA-256 hashes of seven inputs. It verifies exact per-company published-file/citation matches and keeps the four download failures, two omission failures and ambiguous live Update-stage result visible. This is independent consistency verification of the recorded runs, not a new cloud/API test or a guarantee about later mutable database state.

## Checks performed and remaining limits

Seven explicitly selected inspected offline checks passed: `verify_roster_table.ts`, `verify_workspace_source_policy.ts`, `verify_google_roster.ts`, `verify_roster_worker.ts`, `verify_drive_folder.ts`, `verify_mentor_contracts.ts`, `verify_sop_authorization.ts`. Two additional ignored review reproductions passed: fixture validation/extraction and roster add/update/omission/transfer/replay. A passing reproduction here means it confirmed the observed behavior, including the revocation failure; it does not mean acceptance passed. Typecheck, lint (AST plus Dependency Cruiser) and boundary negative tests pass with the new helper present. The existing Workspace type-cycle warning remains. No full suite/build was run independently for this checkpoint.

The earlier live audit's limits remain: 100 snapshots using one identity do not prove 100 distinct sign-ins; only 40/100 pipelines were admitted under quota, 38 evaluations saved, and 429/504 failures remain unresolved. Alert delivery and restore rehearsal remain unproven. Its infrastructure comparison contains a visible automatically-created private Cloud Build bucket delta; do not describe all inventory as unchanged.

No real company workbook was read/imported in this review; only the newly created synthetic copies were independently read. No real employee data appears in the review fixtures. No files were moved or deleted. Complete production readiness is not established.
