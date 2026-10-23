# Resume update — 2026-10-10: Vercel setup and recorded Generate telemetry

Sheet presentation update 10/10: user requested actual progress, app guide, detailed role flows and presentation stories in the same spreadsheet. Added APP GUIDE (gid8101001, A1:E25), USER FLOWS (gid8101002, A1:D19, four vertical role lanes and branches), DEMO STORIES (gid8101003, A1:E24, 12–15 minute script, user stories/AC, Q&A and failure fallback). Existing STORY source preserved; FLOWS placeholders now link to current flows. Updated latest deployment notes I9/I55/I63, H58 and H62 to Đang làm with partial evidence, not complete. Tracker formulas remain 50%/24 P0 incomplete. No runtime/deploy changes in this task. Content explicitly labels trial/fictional SOP and distinguishes draft autosave, click Generate/Judge and 5s class polling.

User asked to fetch https://vercel.com/get-started.md and follow it. Official guide fetched. Vercel CLI 63.1.0 authenticated as elysiatheelysier. Plugin marketplace install unavailable; official fallback vercel-labs/agent-skills installed globally for Codex (9 skills). Global MCP vercel entry added at https://mcp.vercel.com, but OAuth timed out: NOT authenticated. CLI deployment works independently. Expired consent tab closed; no security grant clicked. Do not claim MCP connected.

Latest verified release before final small masking correction: dpl_BSG9JCcdPDhncA69GvLKuBo4sGgJ, https://promptify-rebuild-1nbi3ykin-promptify3.vercel.app aliased to public production. Snapshot initially showed uncertain-request error; reload restored snapshot and governance with HTTP200. No evidence of server crash (error logs empty), so do not assert root cause. Final release dpl_DtHtnS3HBwJu9zr2eKGcDLxCuSdz https://promptify-rebuild-ao9b7gz5e-promptify3.vercel.app is READY and aliased to https://promptify-rebuild.vercel.app. Build passed; final public browser UI14 verified configured2/2, rotation applied2/2, masked tokens and recorded telemetry scope. Screenshot outputs/rebuild-audit/production-vercel-ready-2026-10-10.png. Previous BSG deployment remains rollback candidate.

Changes: governanceTelemetryService queries numeric rebuild_runs metadata only, selected class and Vietnam day, 10,000 cap, unknown values remain null. UI14 refreshes visible page every15s; no Judge cost/usage measurement. UI09 snapshot polling5s. Prompt typing still drafts/autosave, Generate/Judge are click-triggered; no typed realtime grading claimed. EN/VI count labels, profile correction helper now says access changes only after approval; reason required. Fake footer claims removed. Credential handling policy replaces Unmask label; final correction keeps table tokens masked rather than policy text.

Validation: npm run build passes (chunk-size warnings). Offline i18n/HTTP/auth/lifecycle/fallback/telemetry tests and isolated live QA pass; learner/head governance denial and class telemetry isolation checked. No paid AI calls or DB migrations today. Live QA writes only existing isolated QA fixtures. Production browser UI02 final helper verified, UI14 2/2configured and applied rotation confirmed; learner390px UI04/05/06/08 partial checks. NOT full16-screen acceptance. Existing migration history027–047 preserved, no commit/push.

Implementation Plan notes I9,I14,I28,I44,I53,I54,I55,I58,I59,I61,I63 updated; headers A5/A6 corrected to 30trial classes/1242 enrollments/30manual connections/fictional5Basic. Status formulas and formats unchanged; do not equate tracker progress with production acceptance.

User explicitly confirmed old Gemini key NOT deleted today. Owner must revoke it in Google AI Studio. Other remaining acceptance: external Google learner + authorized roster, real Drive folder/scheduled sync, full EN/VI16UI, recovery/rollback rehearsal, dependency remediation, owner signoff and approved official SOP. Trial fictional content remains explicitly labeled. Production npm audit3moderate/nohighcritical; all deps8 including5build highs, no force fix. Current quota36%5h used/6%weekly; stop at user4%remaining threshold when reached.

---

# Resume update — 2026-10-09: role denial, loading truth and learner adapters

User said “tiep di”; keep combined UI + Word. STOPPED at user threshold: final quota96%used5h (4%remaining),92%weekly. Handoff saved; resume only when user asks.

- New changes: ProductionApp passes role-denial context to original UI03. Recognized account outside view permission no longer claims missing roster; EN/VI return-home button uses authorized role home. Actual production admin openedUI05, saw correct denial, returnedUI14; screenshot outputs/rebuild-audit/role-view-denied.png.
- UI14 now waits for governance data before rendering configuration/rotation. Previously initial pending request falsely showed0/2 providers and no rotations. Error shows Retry. No credential/permission change.
- LearnerUI04 compiler honors template x-if (previously Not evaluated rendered alongside an actual score). Learning-path count and department derive from current class in both languages; QAclassA now1Codelab, no false ungraded label. Historical completed status not rewritten.
- EN/VI labels corrected on UI06 restore/comparing/run headings, UI07 Needs Revision/close labels, UI08page/render/sync labels. MobileSOP Library and close drawer buttons now have accessible names. SOP content/citation/user prompts stay original.
- Runtime + reusable compilers both edited; all source regeneration used existing generators/brand pass. No migration, seed regeneration, commit/push. Lastbuildpassed; existing i18n/HTTP/auth-error/lifecycle/fallback checks passed, no paidAI rerun.
- Browser current session: productionadmin duonglh.work@gmail.com became available after initial hydration. Mobile390 anddesktop1440 EN/VI UI09/11/12/14/15 loaded without horizontal overflow. UI13modal blocks underlying navigation by design; close before navigating. Matrix evidence outputs/rebuild-audit/admin-matrix-current.json is layout/navigation smoke, not complete all-tab acceptance. LearnerQA localUI04/05/06/07/08 checked; VI mobileUI08 screenshot sop-inspector-vi-mobile.png. Partial learner layout matrix stored; don't claim full16-screen acceptance.
- Browser2 tab3 production, tab4 isolatedQA learner. Both markedhandoff and viewportoverridescleared. Fresh directHTTP localhost worked; earlier binding to an error dataURL was blocked. Do not bypassURLpolicy. Vite session72398 may survive; if connectionrefused restart normal server. QA credentials ignored outputs/rebuild-audit/qa-identities.local.json; neverprint. No real profiles or employees modified this resume.
- Last confirmed deployed before final package: dpl_5P1KfBkm8UpPp4bXhNtwEHeexV2X https://promptify-rebuild-6btcysdin-promptify3.vercel.app (role-denial + governance loader). FINAL production dpl_SAPV2zPFkK8EmxjR53tP9GPFFxNb https://promptify-rebuild-c8782u8zn-promptify3.vercel.app: CLI inspect READY, publicalias promptify-rebuild.vercel.app confirmed. Browser reload showed new loading state, then actual2/2configured +2/2applied. Screenshot latest-production-governance.png. Latest build/i18n/HTTPpassed. Rollbackcandidate5P1 retainsrole+loader but lackslastlearnerfixes.
- Further completed labels: UI08Page/Lastsync translated; mobileworkspaceSOPbuttonaccessible; comparison staticheading translated. Remainingmixedcopy still exists, e.g.Unmask API Secrets, some countunits; completefulli18nregression next. No paidAI/DBmutationthisresume other than normalQA authsession.
- No Sheet writes this resume; ImplementationPlan deployment notes stillolder. Keep statuses evidence-based. Remaining items in docs/archive/pre-gcp/PRODUCTION_TRIAL_RELEASE_2026-10-09.md still apply: owneroldkeyrevocation, externalGooglelearner/Basic/Drive/scheduledsync/recoveryacceptance, complete bilingual16screens, officialapprovedcontent/signoff. Do not claim100%.

---

# Active handoff update — 2026-10-09: two-admin rotation APPLIED and QA fixes deployed

Continue the user's production completion task; this is not a pause request. Keep combined UI and latest Word. Latest production: **dpl_Ds6FiepdQvQMptUS9CwcGnnDWz7g**, https://promptify-rebuild-n67vyjqqx-promptify3.vercel.app, CLI READY and aliased to https://promptify-rebuild.vercel.app. Previous rollback candidate dpl_9zsoYYcrjPJBgQfPZPReszDL9kyY. No commit/push; preserve extensive pre-existing changes.

- User said “đã duyệt”; DB confirmed two distinct admin approvals for request 2b64c32c-51c1-4d5c-87a4-552b9e076e07. Applied new Gemini key, validated provider and live bilingual Generate/Judge/replay. Rotation status applied with audit. Migration047 adds atomic service-role RPC finish; SQL single-approval denial and two-approval application rollback checks passed. Local ignored rebuild/setup configs updated without secret output. Old provider key revocation is still waiting for owner confirmation; do not claim it is revoked.
- Latest UI fixes: header wrapping and note min-height; HTML no-store/missing assets404; rotation controls before original body. Workspace score→UI07, comparison accessible label; SOP result selection→correct UI08 and original-file download. UI09 compiler had unreachable body condition hiding “Open full learner inspector”; fixed, UI10 route/V3→V2 tested. UI11 SOP status no longer undefined; copies canonical citation, sample-run link pointsUI10. Expanded EN/VI dictionaries without altering original SOP/prompt/output.
- Analytics published SOP count corrected from attempt count, with authorized class IDs only; Head test asserts classA-only totals and no raw attempts, classB/write denied. Removed fixed100-minute/27-department rollout claim from dynamic report. Legacy QA completed progress remains historical; new release run captured threshold8.
- QA browser: initial unconfirmed Head profile entered name and one Confirm click→UI12; no real profiles reset. Learner private original download success; UI06/10/11 mobile390 no horizontal overflow. Five Studio tabs render; QA Studio save success. CDP offline save stayed in editor, displayed uncertainty error, no false success; network restored. Canonical citation clipboard assertion passed. Evidence outputs/rebuild-audit/studio-browser-checks.json, head-scoped-analytics.png, studio-offline-save.png.
- Build, verify_product_i18n/HTTP and live role/scope checks passed. Prior this session: new-key live AI bilingual/replay, ingestion/fallback/worker/PDF tests passed. QA trainer-only Studio save changes only isolated QA curriculum. QA Head name changed only for profile test.
- Sheet Implementation Plan updated18 evidence-based rows through Google Drive connector; other tabs, formats/dates/owners/formulas preserved. First-time profile and trial curriculum rows nowcomplete; external Google/Drive/auto-sync/fullscreen acceptance remain pending. Latest Sheet deployment ID may still be previous9zso release; refresh when next updating.
- Current audit8 (5high build-time Tailwind/glob,3moderate Mammoth CLI); production-only3moderate. Registry latest braces3.0.3/sprintf-js1.1.3 are still unpatched; do not force downgrade Mammoth or migrate Tailwind4 blindly. Source reachability assessment in docs/archive/pre-gcp/PRODUCTION_TRIAL_RELEASE_2026-10-09.md. It is not a zero-vulnerability attestation.
- Trial retains30 departmentclasses/1242enrollments/30manualSheetconnections +5fictionalBasic lessons with trial banner. User authorized this roster and fictional content; no invitations or bulk auth users created.
- Read docs/archive/pre-gcp/PRODUCTION_TRIAL_RELEASE_2026-10-09.md for runbook and precise unverified acceptance items. Remaining: owner revokeoldkey, real external learner/Basic Google roundtrip, Drive folder and opt-in scheduled sync, full16-screen EN/VI regression, independent language settings if retained, backup/rollback rehearsal and official owner sign-off. Official real Intrepid content remains separate from authorized fictional trial. Do not claim100% production/Word conformity.
- Quota user preference: stop and save handoff at4%remaining. Last checked45%used5h/84%usedweekly. No goal tool active. Do not spawn agents; user has not requested delegation.

---

# Resume 2026-10-09 16:12 — cache fix deployed
User resumed full production completion, quota reset to 99% remaining. Fixed vercel.json: root/index.html/production HTML Cache-Control no-store; SPA rewrite restricted to /production, missing assets now 404 rather than HTML 200. Build passed. Deployment dpl_Fo1tbQbjoM1CFYED3zWEpBEtRS2g READY and public alias verified. Live HTTP confirmed no-store header and absent .js 404. No browser acceptance sweep yet. No secret change or migration. Remaining: real second-admin rotation approval/operator atomic audit, full bilingual/mobile 16-screen QA, dependency remediation, actual employee SSO, Sheet plan refresh. Do not claim 100% production acceptance. Combined UI and Word retained. Realtime/automatic judging discussed but NOT authorized as specific feature change and not implemented.

---# UI whitespace fix — 2026-10-09 (read first)

User requested fixing blank-looking trial UI and saving handoff when quota reaches about 4%. Starting usage: 90% used / 10% remaining (5-hour window), weekly 76% used.

Root cause confirmed via actual production DOM: trial paragraph has `.source-ui` with `min-height:100dvh`; role=note height was 804px at 804px viewport. This pushes the combined UI below the fold; it is not missing content or an approval gate.

Fix in src/components/rebuild/source-ui.css: `.source-ui[role="note"]{min-height:0}`; page wrappers retain their full-height behavior and combined UI stays intact. npm run build passed. Deployment dpl_GMJkfXQERS1P8tNiv7AAC2T8DbMx / https://promptify-rebuild-mpm5uxu49-promptify3.vercel.app confirmed READY, public alias verified. Actual production DOM note min-height is now 0px and height 96px at narrow viewport (was 804px). Screenshot outputs/rebuild-audit/trial-whitespace-fixed.png shows governance immediately below notice, no full-screen empty space.

Important additional finding: browser reload initially reused old cached HTML referencing index-C1qoLK_f.js; production now uses index-DINrAocv.js. Old asset URL falls through SPA rewrite and returns HTML (200), causing empty body without JS errors. Visiting https://promptify-rebuild.vercel.app/?ui=14&release=GMJkfXQERS1P8tNiv7AAC2T8DbMx loaded fresh HTML and confirmed the fix. Next turn: implement reviewed HTML no-cache headers / asset 404 behavior and verify refresh across deployments. No DB migration, no key replacement, no commit/push in this fix. Gemini approval remains 1/2 pending on Video Content trial cohort. Candidate secret only in ignored .env.rotation.local.

---
# Current trial release — 2026-10-09 10:52 (read first)

User explicitly authorized importing Table roster and using five fictional Basic lessons. This supersedes historical sample-import prohibition below.

- Imported 1,242 active trial enrollments into 30 department classes under `Intrepid — THỬ NGHIỆM / TRIAL (fictional Basic)`. No invitations or Google identities fabricated. Auto sync remains off; manual Sheet connections recorded.
- Dedicated course `intrepid-trial-basic` contains five copied fictional bilingual lessons, separate from official Intrepid authored curriculum and public Basic. Trial banner explicitly states fictional SOP and no official Intrepid certification.
- Applied migrations 044 (atomic class/domain audit + nested Studio validation), 045 (two distinct admin rotation approvals), 046 (isolated trial curriculum and shared Basic daily quota). Never rewrite applied history.
- Added privacy/use notice, labeled token estimate, workspace draft retry/conflict recovery, additional EN/VI source translations, real profile identity in governance, explicit 429/503 provider fallback with shared deadline. Full 16-screen bilingual/mobile acceptance remains pending.
- Existing and new offline tests/build pass. Live QA `verify_product_live.ts --private --ai --bilingual` passed private original SOP upload/approval/download and foreign-class denial, Generate/Judge EN/VI, scoped replay/session checks. No real employee browser roundtrip proven yet.
- npm audit now 8 findings (5 high, 3 moderate), down from 12. Remaining Tailwind build-chain and Mammoth CLI transitive dependencies need reviewed remediation, no blind force upgrade.
- User-supplied Gemini candidate securely saved in ignored `.env.rotation.local`, validated by model metadata. Never print value. NOT installed in production; real distinct second-admin approval required. Admins: duonglh.work@gmail.com and kangseobi123@gmail.com. Actual authenticated admin created a Gemini rotation request on production UI14. Browser readback confirms 1/2 pending. Second distinct admin must log in, select Video Content trial cohort TRIAL-INTREPID-F7903B05, and approve. Proof: outputs/rebuild-audit/rotation-pending-proof.png.
- Rotation operator script exists but needs atomic applied-state audit and robust Vercel Ready inspection before use. Old provider key revocation remains a real provider-owner action.
- Vercel fallback env `GEMINI_FALLBACK_MODEL=gemini-2.5-flash` saved. Browser verified new trial UI11 shows 5 Codelabs and scoped 5 enrolled Video Content learners; UI14 shows configured 2/2 providers and pending rotation. Latest deployment dpl_BTqJUsca7oYRau3T1BJEof9nHB5k at https://promptify-rebuild-20hty075m-promptify3.vercel.app uploaded with --archive=tgz and built successfully; CLI lost connection. Follow-up inspect confirmed READY and public alias https://promptify-rebuild.vercel.app points to this deployment. Prior rollback target: dpl_28u2QXMA4bsFvTc8NjGSKZdQ67Lj.
- Preserve combined UI baseline and Word hash 666CB5D869ED3AAAF347A5619D1D98A8E36ED650AB07F3AC2F72D5EE25F84E92. No commit/push; extensive pre-existing working changes preserved.
- Implementation Plan Sheet last updated 47% before these trial changes, now needs evidence-based refresh. Do not claim full final production acceptance yet.

---
# UI feedback fixes — 2026-10-09

User reported cramped profile name, repeated confirmation, disconnected white navigation, and identical-looking class content.
- Entry compiler replaces profile identity row with separate full-width name label/input below avatar/email/SSO badge; no input nested in h2/truncate/flex row.
- Profile confirmation now awaits parent fresh snapshot verification before navigation; invalidates older in-flight loads and blocks poll during verification. Re-entry while submitting is ignored. Fresh snapshot committed with navigation, preventing old unconfirmed profile redirect.
- Workspace navigation now branded emerald theme, navy for governance, selected-tab pills, responsive select; class context shows code/department/lesson/enrollment counts. Old content hidden until selected snapshot matches requested class.
- Governance server controls/audit previously global, now filter class_id. Provider credentials remain global and domains are client-scoped, explicitly explained bilingually.
- DB read-only check: Intrepid 0 lessons/0 enrollment/0 Sheet connections; Basic 5/0/0. Other cohorts vary (historical and QA retained). No sample import or fake class data.
- Build and existing EN/VI test passed. Deploy dpl_28u2QXMA4bsFvTc8NjGSKZdQ67Lj READY and aliased to public production, verified via vercel inspect after CLI connection loss. Production UI02 screenshot confirms separate full-width name input. Existing EN/VI/HTTP checks passed. Authenticated production QA: separate name input screenshot verified; exactly one confirmation click (existing confirmed admin, unchanged name) navigated UI02→UI14. Class selector Basic→Intrepid showed loading state then Intrepid context0 lessons; UI11 directory0 confirmed. First-time unconfirmed-account race fixed structurally but not tested by resetting any real profile. New branded navy/emerald navigation screenshot verified at narrow viewport. Earlier dpl_CFLjQ6aZGzkKed7zTRahq1XTy25E also CLI connection loss.
- Restarted local Vite rebuild server session27912 at127.0.0.1:5182; in-app local tab2 remains on connection-error page, browser refused data-error navigation. Production tab1 remains authenticated. No credentials printed or modifications to identities.

---

# Latest resume — 2026-10-09 (active work)

User resumed full production work. Preserve combined ZIP baseline and latest Word; EN/VI required. Older paused entries below are historical.

## Implemented since prior pause
- Applied and recorded migrations 038–043: signed scheduled roster worker, scheduler/replay guard, public Basic enrollment/quota, five fictional bilingual Basic lessons, awards/attendance, Studio DB validation. Do not rewrite applied files.
- Scheduler job promptify-roster-worker runs every minute, claims only opt-in due connections (15-minute eligibility). Connections remain zero; no sample roster imported. HMAC timestamp/nonce prevents permanent secret entering pg_net queue. Secret resides in ignored local worker env, Vercel server env and Supabase Vault; never print it.
- Drive folder scan supports bounded formats/size/count/depth, 30-second listing deadline, review queue per file and idempotent retry. Switching target lesson resets submission markers. No real shared-folder test yet.
- Public Basic Google onboarding, five source-matched techniques with fictional bilingual SOP context, 10 accepted executions per calendar day Asia/Ho_Chi_Minh. Rollback tests cover enrollment idempotency, removed enrollment and quota/replay. No real external Google Basic roundtrip yet.
- Configurable automatic badges and completion certificates require valid weighted production attempts; attendance recorded by authorized class editors. Real award records and authorized PDF download. Vietnamese embedded Noto Sans works with subset:false (variable font subset causes missing glyphs). Font license retained, server bundle includeFiles configured. QA-only PDF rendered and visually checked.
- Workspace authorized context, search states, draft conflict recovery; Hub active filter; entry copy corrected to verified Google and scoped provisioning.
- Workshop now exposes existing cohort lifecycle/create controls within combined UI. Published lessons without Studio display ACTIVE; Studio action routes to editor instead of silent no-op. Ended sessions do not resume through freeze toggle.
- saveClass validates audit reason before mutation; class update and audit still separate requests (atomic RPC remains follow-up).

## Validation and deployment
Build passed. Offline roster signature, Drive formats/limits, EN/VI, PDF structural tests passed. DB rollback tests for worker claims/import/replay, Basic quota/enrollment and awards/attendance passed. No paid AI runs or real roster imports in this resumed turn.
Worker deployment dpl_2bLzvoCzJDZiKZsYxXLLDFTpmW6m was READY and signed invocation/replay verified. Full deployment dpl_Bn1XM63uj873sPeo6HVFwt11W3tv is READY and aliased; authenticated production UI13/11/09 loaded. Worker signature/replay and anonymous API checks passed after deployment. A follow-up deployment for Studio translation, Basic tier, class counts/code display and enrollment role-denial recovery is READY: dpl_BtrER5r6rnHN9jaMQDNjKAtKer7q, https://promptify-rebuild-mxh01nfwa-promptify3.vercel.app; CLI confirmed public alias. Two transient fetch failures preceded successful upload. Staging full src/public/api and package/lock/vercel copied; no secret config uploaded.

User explicitly designated kangseobi123@gmail.com as second administrator. scripts/provision_second_admin.sql applied transactionally: admin role, blank name, profile_confirmed=false; identity binds only through verified Google SSO. Do not fabricate or log in as this person. No message sent to them. Provider rotation still not implemented; do not imply it is operational.

## Still pending before full acceptance
Actual browser QA of new Studio, roster, awards, Basic and all 16 screens both languages/mobile. External Google consent publishing status, real Drive permissions, original published SOP download, provider-key operational rotation/dual approval/fallback, legal footer, remaining hardcoded source claims and full translation audit. Intrepid still has no published authored Codelabs; do not fabricate company course content or identities. npm audit still 12 issues (5 high/7 moderate); no blind force fix.

User production tab1 now authenticated at UI13 (observed after previously expired session); CUA handle resumedProduction. Reacquire documentation after compaction. No commit/push; preserve pre-existing changes/untracked artifacts. Latest Word hash remains 666CB5D869ED3AAAF347A5619D1D98A8E36ED650AB07F3AC2F72D5EE25F84E92.

---

# Latest resume point — user requested pause for quota (2026-10-08)

Read this section first; older entries below describe historical states.

- User explicitly requested saving handoff and stopping. Do not continue implementation until resumed.
- Preserve the original combined UI ZIP as the visual baseline, apply latest Word updates, keep EN/VI. Do not redesign or route the older native replacement UI into production.
- Latest production deployment: **dpl_BgDdRtDkpV6iqHrL7TWChY76kfo6**, READY; unique URL https://promptify-rebuild-m74b3d44l-promptify3.vercel.app. Public alias https://promptify-rebuild.vercel.app returned HTTP 200 and served the new entry asset `index-BVxJyZTR.js` (verified after deployment).
- This deployment includes prior local UI06 actual comparison diagnostics and governance fixture-removal fixes, plus the current Studio create-Codelab dialog and correct datetime-local formatting, editable existing Sheet mapping, class access form, enable/disable domain controls, and server sync-log `result` selection.
- Department-head access is displayed with viewer permission only; SQL currently uses a head grant and ignores an instructor-style permission. Do not imply head can edit.
- New labels received EN/VI dictionary entries. Build, `verify_product_i18n.ts`, and `verify_codelab_lifecycle.ts` passed. These tests do not prove all source copy or all16 UI flows are complete.
- The new mapping/security overrides were checked against actual template tab keys. Browser end-to-end verification of these newly deployed forms is still pending. No real permissions, Sheet connections or roster imports were submitted in this turn.
- No new migration was applied. No git commit/push. Pre-existing changes/deletions/untracked sources were preserved. Staging copied full src/public and api/product.ts, no secret config.

## Continue here

1. Verify latest deployed Studio dialog, mapping editor, class-access UI, domain controls and UI06 on actual authorized sessions, EN/VI and responsive layouts. Do not grant arbitrary real users during QA.
2. Scheduled roster worker remains **not implemented**. Read-only readiness check: pg_net and pg_cron are available but not installed; supabase_vault installed 0.3.1. `product_sheet_connections` count is 0. Ignored SQL probes under outputs/rebuild-audit/worker-extensions.sql and worker-readiness.sql. No worker code, secret, cron schedule or extension installation exists yet.
3. Remaining substantive gaps from the prior handoff still apply: public Basic onboarding/curriculum and daily quota, automated Sheet synchronization, Drive-folder ingestion, automatic awards/certificate artifacts, operational provider-key rotation/dual approval, legal footer content, residual fake roster claims, Hub filters, SOP search states and complete UI translation audit.
4. Real Intrepid course has modules but no published Codelabs. Admin can author in Studio; never fabricate employee identities or automatically import the supplied sample Sheet.
5. Private original SOP uploads and archive limits were previously implemented and tested; original-file download still needs positive published-source verification. Review queues and scheduled lesson windows require end-to-end QA.
6. npm audit remains 12 vulnerabilities (5 high/7 moderate); deliberate remediation required, do not use blind `audit fix --force`. Bundle warning remains.

## Access and environment

- Admin: duonglh.work@gmail.com; actual Google login/profile confirmation succeeded, full name Lam Hai Duong supplied by user.
- Supabase project aixhryqzgpptuhstiflx; use .env.rebuild.local and .env.production-setup.local only, never print credentials. Service account JSON private path is C:/Users/Admin/.promptify/sheets-service-account.json. Earlier chat screenshots exposed credentials: never copy secret values into handoff or chat.
- Production SSO Site URL and exact redirect /?ui=02 are already saved and verified. No wildcard redirect is needed.
- Dev server was running on localhost:5182 with mode rebuild (session 88027); verify availability before reuse.
- User production browser tab8 is authenticated and currently UI13; QA local tab9 was trainer. CUA bindings may need fresh acquisition after restart. Call cua.rewriteDocumentation() after context compaction. Keep user tabs and do not invent identities.
- Rebuild deployment staging outputs/rebuild-deploy is disposable ignored output; scripts and src are canonical implementation. Inspect git status before edits.

---

# Promptify rebuild handoff — 2026-10-08

## User instruction
User explicitly asked to stop because quota is nearly exhausted. Resume only when user requests. Objective remains full production rebuild strictly following latest docs/Promptify - UI code - for Review.docx, all 16 combined screens, later document updates, full EN/VI i18n. Do not claim completion: native production still has gaps against the Word source.

## Workspace and preservation
Workspace C:/Ki_OJT/PromptforNontech. Read AGENTS.md and docs/archive/repository/REPOSITORY_GUIDE-two-apps-2026-10-12.md. Many pre-existing changes, deleted files and untracked sources: preserve all. No commit/push performed. Do not overwrite applied migrations. No subagents authorized. Do not log credentials.

## Deployment actually created and checked
New Vercel project promptify-rebuild, project id prj_k2ZAOSsUBoPIo2oUFAV3QEFBUc7x, team team_zrq1CEzlDezx7NrsD6hgaiJz (promptify3).
Production alias https://promptify-rebuild.vercel.app
Deployment dpl_8xSaZBKQCPPxus4nPGDwc393Aagq; https://promptify-rebuild-kqz2my6yk-promptify3.vercel.app
First CLI deployment automatically assigned production despite intended verification deployment. READY, alias verified by HTTP: root200; anonymous POST /api/product401 JSON Please sign in. No authenticated remote/API/Google SSO test yet. Do not equate READY with production acceptance.
Clean uploaded staging directory outputs/rebuild-deploy copies src/public, build configs, package files and ONLY api/product.ts. No source documents, environment files or credentials included in uploaded source. Vercel environment configured public Supabase variables, VITE_REBUILD_PRODUCTION=true, server Supabase service key, Gemini model/key and Google service account JSON. Supabase PAT and Google OAuth secret not uploaded to Vercel. Vercel credentials remain in existing CLI auth file; never print.
Staging deployed at end of this turn; includes analytics client scoping and Studio shape validation. After any further code changes, refresh staging before deploying; use --prod for intentional alias promotion. Root production flag is set.

## Database and identities
Dedicated Supabase ref aixhryqzgpptuhstiflx. Do not use legacy .env database. Server config .env.rebuild.local, setup .env.production-setup.local (both ignored). SA file outside repository C:/Users/Admin/.promptify/sheets-service-account.json.
First admin duonglh.work@gmail.com provisioned, unconfirmed profile/no invented full name. Google provider enabled and readback verified. Actual Google SSO roundtrip not tested. Supabase Management Auth config PATCH previously403: PAT lacks project_admin_write; database query works201. Need set Site URL to actual rebuild production domain and allowed redirects manually or with a properly scoped token; current Google OAuth callback Supabase URL already configured.
Intrepid Asia client/course intrepid-promptify-masterclass, 3 published pillar modules, course published/active, cohort INTREPID-SETUP-2026 upcoming. NO real curriculum lessons or learner roster imported. Cohort activation/create controls now wired native UI9/11/14/15. Admin sees preserved historical and QA courses too. Analytics all-cohort report now filtered by selected client.
Sample Sheet id 1NUv61Mn5TN8kLWWblGQgLD3pV8gmC7JEDP7Ijs0yLCY tab Table. Read-only SAMPLE, no automatic production import. Adjacent N:Q User columns ID,Email,Country,Department, no full name. User granted SA Sheets access; read200 verified. Drive API ingestion not live verified.

## Credentials
User provided new Gemini key in chat; it was saved to .env.production-setup.local and .env.rebuild.local and uploaded as server environment to Vercel. Models-list verification HTTP200. NEVER copy key into handoff or response. Supabase PAT rotation was requested but user has not confirmed; old screenshot-exposed token may remain. Service account screenshot contained private-key prefix; no full private key in handoff. Inspect configuration by presence only. Handle credential hygiene honestly before full production acceptance, without repeatedly stopping independent work.

## Source authority
DOCX SHA256 666CB5D869ED3AAAF347A5619D1D98A8E36ED650AB07F3AC2F72D5EE25F84E92.
29 HTML blocks, selected final indexes [0,1,2,3,4,7,8,9,10,13,16,24,25,26,27,28]. Exact source design-drafts/review-authority/UI-00..15.html and manifest. Word primary blue #0B57D0, background#F8FAFC, text#0F172A, borders#CBD5E1; production.css corrected green primary colors this turn.
Review AST engine /rebuild is bundled prototype/newFunction/demo fixtures, NOT production. Native /production and root VITE_REBUILD_PRODUCTION use real API. Weighted later rubric30/20/20/15/15 supersedes old equal2 points. SourceUI00 malformed score expression: do not invent missing scores.

## Implemented native pieces
ProductionApp role navigation/auth/profile, class selection race fixed, polling and Realtime broadcasts/coaching. ProductionStudioV2 five source-order tabs, saved metadata/system/variables/scaffold/materials/weighted rubric/sandbox/award config. Explicit passThreshold0..10 added this turn, default8. ProductionSop file/Drive submissions, pending trainer review, real embeddings and publication versions. ProductionWorkshop phases/freeze/end/broadcast/learner drawer. ProductionAnalytics real full aggregates/CSV/print, no invented ROI. ProductionGovernance domains/grants/audit/provider links. ProductionRoster mappings/manual sync/logs. ProductionWorkspace task/theory/gated hints and solution, controlled prompt, cursor chips, server draft autosave, PII user redaction, semantic SOP drawer, output/Judge; mobile panel CSS added. New ProductionCompare side-by-side/unified bounded line diff, prompt/output, restore saved prompt. New ProductionCohorts status audit reason/create cohort controls. Main unlock modal now uses focus-trapping ProductDialog. Learner dashboard launch restores existing server draft rather than overriding starter. Admin profile confirmation now uses role home.
Server files productionServerService, productionAiService, rebuildRunService, googleRosterService, sopIngestionService, weightedRubricService, piiGuardService, studioValidationService. New Studio shape validation protects arrays/string lengths/awards passing threshold/URLs (only API layer; direct authenticated RPC may still require DB-side deep checks). PII check added BEFORE rebuild_begin_run, avoiding stranded claims for rejected personal identifiers.

## Applied migration history
027..034 previously applied and recorded, preserve files. 035_product_weighted_completion.sql applied this turn, SHA256 d5e37343ebf1c70bdc12fe9580ab44f3a810b6d98b91120ab272d6e1017c56cd.
035 adds prompt_attempts.production_pass_threshold captured by BEFORE INSERT from accepted rebuild run snapshot/request_id. rebuild_finish_run sets request context. Replaces canonical progress sync: new production generation in_progress until valid weighted Judge reaches captured threshold; prior completed remains completed; historical thresholdNULL retains legacy completion behavior. No production-data rewrite. Transactional dry run and rollback QA confirmed generation status in_progress/threshold8; still add explicit below-threshold and above-threshold Judge tests. Source old016 marked every INSERT completed; now fixed for future accepted runs.
New migrations private content/scoped RLS, rate budgets, draft optimistic RPC, sandbox/SOP/contributions/analytics/domain/grants/logs. Service-only business data writes; read RPC class/domain scoping. Recovery/rollback documentation for027+ remains to write.

## Checks completed
Repeated npm run build passes including latest main changes; initial JS~226KB, lazy legacy/review chunks still >500KB warnings. Native production~86KB beforegzip.
Offline npx tsx test/verify_rebuild_runs.ts (DI no provider), test/verify_product_i18n.ts, test/verify_sop_ingestion.ts passed.
New test/verify_product_http.ts passes method405, malformedJSON400, anonymous401, oversize413 and no-store; no providers.
Live npx tsx scripts/verify_product_live.ts --ai --bilingual --sop --sandbox passed after035: sessions/assigned scope/learner denial/unlock/session revision, SOP embedding/publish/replay, teacher-only sandbox bilingual no learner analytics mutation, persisted generation/Judge/replay/foreign learner denial. Existing requests reused, no new generation for replay. QA identities outputs/rebuild-audit/qa-identities.local.json secret file NEVER print passwords.
New outputs/rebuild-audit/verify-completion.sql rollback test passed (test SQL rollback does not leave attempts). Reusable migration QA should be moved into test/script with safe parameter loading instead of discarding.
Latest Vercel cloud build passes; root HTTP200 and anonAPI401. Authenticated deployedAPI and SSO not tested.
Npm audit still12 vulnerabilities (5high7moderate) in Tailwind transitives, mammothCLI and exceljs deps. Do NOT blindly npm audit fix --force (breaking/downgrades); inspect and remediate deliberately. Parse2MB compressed DOCX/XLSX still lacks zipbomb decompression bounds.

## Remaining work before full completion (important)
1. Verify/authconfigure production SSO redirects/siteURL, login admin Google roundtrip, authenticated deployed API. Project PAT lacks Auth config write; do not falsely claim ready.
2. Native source fidelity still incomplete UI00(public marketing/free-tier/enterprise request),01/02/03,04learner hub,07scorecard,08SOP inspector,10learner inspector. UI06 functional compare now added but exact layout not proven. Check all16ENVI screenshots/roles/mobile. docs/archive/pre-gcp/UI_REBUILD_REVIEW_STATUS.md outdated, do not use as completion certificate.
3. UI9 drawer Open inspector does not propagate selected learner; fix callback selection. Drawer focus/accessibility still to inspect.
4. Draft conflict keeps local text but no resolve/retry UI; provide explicit conflict handling.
5. Actual timed Sheet sync (source15interval) not implemented; manual only. Roster mappings employeeId/jobTitle not implemented source laterUI15. Sample should stay read-only until actual production roster explicitly selected.
6. Published actual curriculum absent; course/modules only. Do not fabricate business lessons or import sample people. Trainer can author Studio; verify lifecycle and schedules.
7. Badge/certificate configuration saved but no automatic award/certificate artifact. Original SOP file archival/storage not implemented (canonical extracted text/chunks only). Operational recovery for unknown/pending provider/indexing claims missing.
8. Studio deep shape checks DB-side required to defend direct authenticated RPC; snapshot config data validation as needed. Profile confirmation server preflight for all AI to inspect. Duplicate lesson/global edits across class studios revision collisions unresolved.
9. Completion QA below/above threshold and full course completion analytics semantics. Rate budgets/REST scope/head grants and source citation privacy tests.
10. Security dependency and archive decompression hardening, environment sanity/secret bundle scans. Token hygiene outstanding.
11. Final source review, honest status doc/update migration rollback notes, redeploy clean staging --prod if changed, verify actual current alias matches tested deployment. No commit/push until scope/preserved changes reviewed.

## Browser/server state at pause
CUA documentation restored this turn. Browser id2 iab, prior productionCheck tab7 localhost5180/production?ui=11 currently had connection-refused error; handle not usable until navigation to running server. Existing5180 port is occupied but browser connection failed; newly started npm dev --mode rebuild --port5180 chose5181, exec session33290. User Supabase dashboard tabs should not be closed. Agent-created tabs can be cleaned when resuming. No browser SSO interaction or screenshot this turn. Do not assume old tab QA session alive.

## How to resume
Read this file, git status and relevant source. Continue required implementation/verification, do not ask user to reauthorize existing build/deploy scope or repeat secrets. Keep commentary every60sec. Stop request is explicit; no background work/automation has been scheduled.


## Resumed implementation and exact ZIP authority
User clarified the exact baseline: outputs/Promptify_Mockup_x_Combined_Updated.zip (41,471,598 bytes), mockup-aligned green UI, not older deployed.tsx composition. See PRODUCTION_UI_BASELINE.md. All 16 production routes now use compiled latest Word source layouts with ordinary React/real server adapters. No eval or fixture provider in production actions.

New source compilers and shared compiler/branding scripts are in scripts/. Source components in src/components/rebuild/Production*Source.tsx. A briefly attempted native component composition is preserved but unmounted (CombinedProductionHub/Workspace); do not reroute it.

Deploy dpl_6HD9djawKaNxiWA2vhK2Q8mVR8nr was READY and aliased to https://promptify-rebuild.vercel.app. Desktop and mobile browser verification confirmed combined layout. Screenshots: outputs/rebuild-audit/production-combined-ui-desktop.png and production-combined-ui-mobile.png. User completed real Google SSO and reached UI-02, exposing a missing full-name input. Fixed in compile_production_entry.mjs and generated UI-02, verified the input and profile confirmation on QA trainer. Urgent deployment dpl_DVLzdwoQaGdLCLKLBJaVcCDunv2F is READY and the production alias was verified: the full-name input is visible on the actual admin session. Screenshot outputs/rebuild-audit/production-profile-input-fixed.png. The user must enter their own name and confirm; do not submit invented information.

With explicit user confirmation, Supabase Site URL was saved to https://promptify-rebuild.vercel.app and exact redirect https://promptify-rebuild.vercel.app/?ui=02. Browser readback verified both. No wildcard redirects. Proof: outputs/rebuild-audit/production-sso-urls.png. Admin duonglh.work@gmail.com must enter their real full name; do not invent it.

Applied migration 037_product_private_sop_storage.sql (hash f91c2d98dcddaec7009d64179e29b473d7ad4e6b954102d9e5c51574e24b7808): private product-sop-originals bucket, 25 MB, signed upload via prepareSopUpload with class/lesson/actor/request path validation and upload budget. Client uploads directly to Storage, then submits path; extraction rejects >64 MB expanded Office archives and >2000 entries. Actual >2 MB QA DOCX upload, duplicate-request replay, foreign path rejection, >25 MB rejection and anonymous private download rejection passed without AI. test/verify_product_private_upload.ts writes a QA-only pending contribution; do not rerun unnecessarily. sourceDownload uses authorized published version metadata for 5-minute signed download. Positive sourceDownload still untested against a published uploaded original.

Recent checks: npm run build; verify_product_http.ts (anonymous storage/authoring actions); verify_product_i18n.ts; verify_sop_ingestion.ts; verify_codelab_lifecycle.ts. No paid AI calls this resumed work. codelabLifecycleService enforces scheduled start/end windows in learner snapshot and saved-run context. Manual browser QA: real learner dashboard/workspace with stored bilingual Judge, trainer Studio directory/scope/instructions, SOP dialog Escape, Sheet source screen. Role/class navigation added and source component state keyed by class.

Still required before saying full production complete: remove remaining fixture claims and statistics in UI06 comparison diagnostics, UI14 governance labels; ensure all source UI EN/VI copy (audit_source_i18n.ts reports untranslated static copy to ignored output JSON); original source01/02/03 enterprise roster claims must reflect actual provisioning and admin exception; scheduled input local/UTC display; remaining Hub filter and SOP search loading states; proper create-Codelab modal; mapping-edit UI; class access UI; public Basic onboarding and real curriculum; automatic roster worker (currently real manual sync); Drive folder ingestion (currently file links only); automated badge/certificate issuance; actual vault rotation/dual approval and legal footer content. These are substantive gaps, do not mark ready based on a passing build or all 16 routes existing. No real sample Sheet import was performed. Real Intrepid setup course still has no published Codelabs. Preserved older data and all untracked artifacts. No git commit/push.

Dev server: npm run dev -- --mode rebuild --port 5182, session 88027. Browser QA tab9 localhost, trainer QA session; user production tab8 has real admin SSO session. No password/token may be printed. Reset any temporary viewport override after testing. Keep user tabs. Source staging outputs/rebuild-deploy contains only src/public/api/product.ts and build manifests, no secrets/docs. Copy changed sources before intentional deploy.

Additional local-only fixes after the urgent deployment: UI06 diagnostics now use actual selected attempts and per-criterion feedback, score delta is derived; UI14 some false gateway/vault/usage claims replaced by configuration/unknown metadata. Build passed. These two generated components have NOT yet been copied into deployment staging/redeployed. Remaining wording still needs audit.

## Navigation viewport-height regression
User reported large blank space above UI-14. The shared .source-ui min-height:100dvh also applied to the new flex navigation, vertically centering its items in a full viewport and pushing all source pages below it. ProductionApp navigation now carries source-scope-nav; source-ui.css overrides only that navigation min-height to 0. Build passed. Local browser measured navigation 69px/min-height 0 versus deployed old 804px/min-height 804px. Layout-only deployment dpl_FpfsmBrNdAnrdWik8on824LMGCzM is READY and aliased. Only ProductionApp.tsx/source-ui.css were copied into staging; prior local comparison/governance fixes remain undeployed. Production browser verified UI-14 navigation at top 0, height 69px, min-height 0; the governance content appears immediately below it. Proof: outputs/rebuild-audit/production-navigation-spacing-fixed.png.

## Handoff hiện hành — 10/10/2026

Đọc [PROMPTIFY_REBUILD_HANDOFF_2026-10-10.md](PROMPTIFY_REBUILD_HANDOFF_2026-10-10.md) trước khi tiếp tục. Tài liệu này giữ lịch sử; các phần còn thiếu/đã deploy phía trên có thể đã được thay thế. Bản mới có source-of-truth, 4 Word, nhánh dirty checkout, credential locations, skills, runtime mapping, migrations048/049 và deployment mới nhất.
