# Staging SOP formats and role acceptance 2026 10 20

## Result

PDF, DOCX and XLSX real staging path PASS: signed demo.biz upload, pending exclusion, signed duonglh admin preview/approval/indexing, learner semantic retrieval/citation/original download, and one real Gemini run using all three formats with automatic Judge. Fixed measurement-card spacing and inconsistent PDF inspector page citations; deployed frontend staging only.

The user subsequently explicitly authorized application role changes. kangseobi123@gmail.com changed from application admin to Head with a Head grant to fictional QA class only; manhmanh100127@gmail.com provisioned as learner enrolled in that QA class. Normal Google sign-in and profile confirmation were then completed for both. No Firebase user account/password was created/reset by the agent; no GCP IAM change, production mutation or migration.

## Scope and evidence

Class4a5a763a-b1b5-4676-88ca-81f4805fb321, lesson2 64b6f084-9e93-49cd-a7be-e2ef9e14ff65. Sources are entirely fictional and have unique format canaries.

| Format | Published version | Real extraction/indexing | Learner acceptance |
| --- | --- | --- | --- |
| PDF | ac4ca548-8ba6-4dcc-b496-a0f277e7c94d | 2pages,2chunks,768dim; Vietnamese preserved | Query, page2 inspector, canonical [Page 2] citation, original download hash PASS |
| DOCX | 3b28642d-ccca-4f7c-a20a-5a883feeb33a | 1chunk,768dim; Vietnamese preserved; no invented pages | Query, inspector, citation, original download hash PASS |
| XLSX | ad85c864-a689-46bf-9caa-d4498ba74eaa | 1chunk,768dim; sheet name/cell text/Vietnamese preserved | Query, inspector, citation, original download hash PASS |

Before review, all three remained pending and active source count stayed1. After admin review count4 includes prior TXT. SQL read-only verifier confirms canonical content/chunks/dimensions. PDF fixture rendered to PNG and visually inspected. Word authoring render attempt could not run because LibreOffice unavailable; actual cloud DOCX extraction and learner rendering were verified. Do not claim Word print-layout QA or complex XLSX formula acceptance from this fixture.

Actual V6 run b1a4198a-486e-4cc3-b74b-9300bca512c8 used gemini-3.8-flash, generated2439ms, Judge4541ms, score10/10, supervisor+5workers,6providerattempts,0timeouts. All three version citations and document canaries are present in frozen server context and output; canaries were not supplied in learner prompt. Output cites PDF page2. No grading criteria/threshold/score changes. Metadata in cited-formats-run.json; screenshot cited-three-format-run.png.

Class totals:7savedattempts,4realgrades,2badges+1certificate,3libraryentries (existing demo Personal plus2new authorization fixtures). Old three ungraded timeout attempts unchanged. New learner has0attempts/0completed/0awards; enrolling a second learner makes aggregate class completion50% without changing Demo completion or scores.

## Fixes

1. OutcomeMeasurement now has dedicated app-local CSS. Desktop summary padding16px20px, minimum56px click area; body padding20px; card has page gutters and bottom spacing, visible keyboard focus. Mobile CSS provides16px gutters/padding. Actual desktop measurement verified at1626px; no overflow. Expanded form opens without submitting data. Theme/logo/font/colors retained.
2. PDF inspector copied `... Page 2` while search/library used `... [Page 2]`. It now consistently copies `[SOP:version:v1] [Page 2]`. Broken and fixed clipboard values were directly verified; learner2 confirmed final deployed version.

Mobile visual acceptance **not confirmed**: normal viewport tool reported set but real DOM width stayed1626px; follow-up raw device emulation was denied permission. No bypass attempted. Misnamed first screenshot was renamed outcome-expanded-desktop.png; it is not mobile evidence.

## Roles and permissions

- Explicitly approved staging application role maintenance only. roles-before.json/roles-after.json and role-recovery-plan.md record state and reversal plan. First maintenance attempt without admin SQL context was blocked by the existing privilege trigger and rolled back; second used provisioned app admin duonglh SQL context in the authorized transaction, with cloud operator demo.biz named in audit. No trigger/RLS disabled, no authentication token created/read, no fake signed HTTP claim. Maintenance is not itself an authenticated acceptance test.
- Signed Head kangseobi123: only QA class listed; analytics allowed; peer Pending template visible, peer Personal and Demo Personal excluded. Approved only fictional shared fixture through actual UI; SQL confirms reviewed_by kangseobi123, other Personal remains personal. Studio UI11 denied; unassigned shadow class denied.
- Signed learner manhmanh100127: only QA class listed;0attempts,0/2completed,0badges, no Demo history/output/score. Own Personal and department-shared fixture visible; Demo Personal excluded. Published QA SOPs readable; corrected PDF copy verified. Studio and shadow class denied.
- Two synthetic library rows were seeded explicitly as fixtures, not claimed to have been saved through learner UI. Head review itself was performed through signed UI and independently read-only verified.
- New offline real-handler/PGlite test covers learner self-approval/manager preview denial, peer contribution isolation, foreign/pending/guessed-source download denial before signing, lesson binding search scope and unassigned Head scope. This does not replace all direct-object HTTP fuzzing with live sessions.

## Release validation and governance

- Hosting final version68f6d628d37265cb; intermediate spacing-only versionf40b814a809d9c74. Target ai-transformation-510302-intrepid-staging only. Prior Hosting rollback baseline c159d76ddaf40be0.
- API unchanged: promptify-intrepid-api-sopdl-1019,100%staging; model remains gemini-3.8-flash. No backend image/config/IAM update in this release. Embeddings remain separate gemini-embedding-001.
- Offline47/47 PASS; typecheck/lint/boundary/build(staging)/local-smoke PASS. Existing Workspace cycle and bundle-size warnings unchanged. Final citation-only edit rebuilt/typechecked and validated via actual clipboard.
- Final Hosting/API-asset checks23/23 PASS. Governance21/21 PASS, including entire Cloud Run service unchanged, IAM, SQL settings, Firestore rules and default Hosting releases unchanged. Complete before/after inventories are credential-redacted.
- Scope of data writes:3fictional SOP contributions/indexes/bindings,1real synthetic AI generation+grade, authorized2app-role provisioning actions,2synthetic library fixtures and1signed Head moderation, normal sign-in/profile/activity/audit writes. No production data touched.

## Remaining gates

1. Mobile viewport/device acceptance was blocked; actual iOS/Android and accessibility remain unverified.
2. Full signed direct-object HTTP matrix, token-expiry/revocation/source-replacement races and high-risk file edge cases (encrypted/malformed/very large/complex formulas) not exhaustively covered.
3. Load/consistency/global cost control, alert delivery and isolated restore rehearsal remain production gates in STAGING_PRODUCTION_READINESS_2026-10-19.md. No100%production-readiness claim.
4. A long-lived Head browser tab needed reload after a Hosting release before the new lazy chunks loaded; fresh load passed. Cross-release stale-tab recovery remains a follow-up reliability check.

Evidence: apps/promptify-intrepid/outputs/staging-release-2026-10-20-sop-formats/. No secrets, tokens or signed URLs are retained in the archive. Application emails/UUIDs shown are the explicitly named testing identities and fictional class fixtures.
