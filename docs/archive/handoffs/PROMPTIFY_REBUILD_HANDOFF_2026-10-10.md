# PROMPTIFY REBUILD — HANDOFF CANONICAL, 10/10/2026

Tài liệu tiếp quản hiện hành. Đọc file này trước handoff 08/10: nhiều mục “chưa làm” trong file cũ đã được triển khai sau đó. Đây là bản bàn giao ngữ cảnh, không phải chứng nhận 100% production.

## 1. Mục tiêu và quyết định của người dùng

- Hoàn thiện Promptify dùng thật, giữ UI kết hợp có sẵn, cập nhật theo Word. Người dùng rất không hài lòng khi UI được thay thành landing/workspace tối giản không giống bản gốc.
- Visual foundation là ZIP Promptify_Mockup_x_Combined_Updated.zip, kết hợp theme xanh Promptify. Word cập nhật chức năng/nội dung; thêm thứ thiếu trên foundation, không tự thay cả thiết kế.
- Ba Word mới nâng cấp người học: phải đủ chức năng UI04/UI05 v7, xem HTML gốc trước khi thiết kế. Được phép cải thiện theo theme/style Promptify và dùng skill UI/UX/design.
- Có EN/VI; mặc định English cho người mới và nội dung bài học trước. Lựa chọn VI đã lưu được giữ. Không tự dịch/đổi prompt và AI output của người học.
- User đã cho phép dùng Sheet Table làm thử nghiệm và 5 Basic với SOP HƯ CẤU; phải ghi rõ trial, không giả là SOP Intrepid chính thức.
- User đã cho phép build/deploy production và migrations cần thiết trong quá trình rebuild. Không suy ra quyền commit/push/reset/delete/merge. Giữ tất cả thay đổi chưa commit.
- Multi-agent/Antigravity là yêu cầu cũ, đã bị hủy bằng “bỏ đi”. Không tiếp tục workers, OAuth, orchestration hay điều khoản CLI trong task rebuild này.
- Tiến hành công việc được giao tới hoàn tất, không liên tục hỏi lại permission đã có. Báo lỗi/giới hạn thật, không tuyên bố 100% vì build xanh.

## 2. Checkout và source-of-truth thứ tự ưu tiên

Workspace tuyệt đối: C:\Ki_OJT\PromptforNontech
Shell PowerShell; Node 24.14.0; React19 + TypeScript + Vite6 + Supabase + Vercel.
Branch hiện tại: rebuild
HEAD: d7ac9d1fa28a4038cc922daea8ce20e27a13afd6
Remote canonical: https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs.git
Git status hiện có khoảng 196 entry modified/deleted/untracked; nhiều runtime/migrations nằm UNTRACKED. HEAD/remote KHÔNG chứa toàn bộ rebuild đang deploy. Không checkout main hoặc tạo worktree từ HEAD rồi giả là có bản mới. Không reset/stash/clean/auto-commit. Fetch chỉ khi cần so sánh remote; chưa fetch trong lượt bàn giao này.

Đọc theo thứ tự:
1. AGENTS.md tại root và yêu cầu trực tiếp mới nhất của user.
2. docs/archive/repository/REPOSITORY_GUIDE-two-apps-2026-10-12.md: quy tắc vị trí, generators, migration preservation; mô tả legacy entry không hoàn toàn phản ánh production rebuild mới.
3. docs/reference/PRODUCTION_UI_BASELINE.md: ZIP foundation và precedence Word.
4. docs/Promptify - UI code - for Review.docx: toàn bộ 16 UI và cập nhật facilitator/backend gốc.
5. docs/reference/Promptify - UI code - for Review (1).docx: UI04 hub/SOP library/request/resources.
6. docs/reference/Promptify - UI code - for Review (2).docx: UI05 v7 textual delta.
7. docs/reference/Promptify - UI code - for Review (3).docx: UI05 v7 HTML đầy đủ.
8. docs/archive/pre-gcp/LEARNER_UI_UPGRADE_2026-10-10.md: bảng đối chiếu 3 Word, verification, limitations và Judge follow-up mới nhất.
9. Source runtime + API + migration đã áp dụng là bằng chứng triển khai thật; docs cũ chỉ là lịch sử, cần đối chiếu.

Tất cả Word nằm tại C:\Ki_OJT\PromptforNontech\docs\, tên chính xác ở trên. Hash hiện hành được lưu trong docs/archive/handoffs/REBUILD_HANDOFF_SOURCE_MANIFEST_2026-10-10.json. Nếu user cập nhật Word, đọc lại và đối chiếu, không tin hash cũ.

Nguồn visual:
- outputs/Promptify_Mockup_x_Combined_Updated.zip (41,471,598 bytes), SHA256 1b90bebd785a242981b0e67be3ceaa2695c943f4226076480868a8e166686c29.
- design-drafts/combined-ui/mockup-aligned.tsx, mockup-templates.json, MOCKUP-ALIGNED-README.md.
- design-drafts/review-authority/ và manifest: HTML gốc 16 UI từ Word; final block indices [0,1,2,3,4,7,8,9,10,13,16,24,25,26,27,28].
- outputs/learner-upgrade/(1).txt, (2).txt, (3).txt; (1)-0.html và (3)-0.html là bản trích mới. (2) là delta chữ, không có HTML.
- Prototype/deployed.tsx hoặc entry.tsx cũ KHÔNG mặc nhiên là visual authority; xem baseline.

Tài liệu hỗ trợ, có thể cũ:
- docs/archive/handoffs/PROMPTIFY_REBUILD_HANDOFF_2026-10-08.md: nhiều đoạn append lịch sử; đọc để hiểu quyết định, không dùng backlog cũ làm hiện trạng.
- docs/proposals/PRODUCTION_BACKEND_ARCHITECTURE_PLAN_2026-10-08.md, PRODUCTION_BACKEND_FLOWS_2026-10-08.md.
- docs/archive/pre-gcp/PRODUCTION_TRIAL_RELEASE_2026-10-09.md; PRODUCTION_SETUP_ONCE.md.
- docs/00_PRODUCT_SOURCE_OF_TRUTH.md, 01_CURRENT_STATE.md, 02_IMPLEMENTATION_PLAN.md, 03_DECISION_LOG.md mô tả kế hoạch/audit trước rebuild, không certificate deploy.
- docs/archive/pre-gcp/UI_REBUILD_REVIEW_STATUS.md cũng cần kiểm tra ngày/bằng chứng.

## 3. Skills phải dùng theo tác vụ

User đã yêu cầu dùng UI/UX/design. Đã đọc và áp dụng:
- C:\Ki_OJT\PromptforNontech\.agents\skills\ui-ux-pro-max\SKILL.md: kiểm tra/thiết kế learner UI, contrast, spacing, keyboard, responsive.
- C:\Ki_OJT\PromptforNontech\.agents\skills\design\SKILL.md: hướng brand/theme và route skill phù hợp.
- C:\Ki_OJT\PromptforNontech\.agents\skills\ui-styling\SKILL.md: component styling/accessibility theo hệ hiện có.
- C:\Users\Admin\.agents\skills\deploy-to-vercel\SKILL.md: deployment; giữ linked project và verify alias.
Dùng thêm khi đúng việc: .agents/skills/design-system/SKILL.md cho tokens; skill documents nếu xuất/sửa Word; Google Drive/Sheets skills nếu user yêu cầu cập nhật Sheet. Đọc skill trước khi áp dụng và thông báo lần đầu. Không đưa library mới chỉ vì skill có nhắc.

## 4. Runtime thật và 16 màn hình

src/main.tsx chọn:
- /production hoặc VITE_REBUILD_PRODUCTION=true -> ProductionApp thật.
- /rebuild -> RebuildApp/ReviewScreen prototype, KHÔNG phải evidence production; có template/demo behavior.
- đường khác khi flag không bật -> App legacy. Root production Vercel được cấu hình flag rebuild production.

ProductionApp.tsx quản lý auth, selected class/lesson/attempt, scope, navigation ?ui=00..15, action/generate/refresh, errors, dialogs. API backend là /api/product.

UI00 landing; UI01 Google login; UI02 profile confirm; UI03 access denied; UI04 learner hub; UI05 workspace; UI06 compare; UI07 Judge diagnostic; UI08 SOP inspector; UI09 facilitator workshop; UI10 learner inspector; UI11 Studio directory + editor + SOP requests review; UI12 Head analytics/library approval; UI13 SOP contribution; UI14 admin governance/dual approval rotation; UI15 roster connections.

4 stored roles: learner, instructor (= Facilitator), head, admin. User-designated admins: duonglh.work@gmail.com và kangseobi123@gmail.com. Role phải từ DB/authorization, không lấy từ Sheet hoặc tự cấp quyền để QA. Admin access không đồng nghĩa learner-only route được mở. Phân quyền còn scope class/department/course; không dùng instructor global bypass.

Main components src/components/rebuild:
- ProductionApp.tsx; ProductionEntry1/2/3.tsx; ProductionLanding.tsx.
- ProductionHub.tsx (combined UI04), DepartmentSopLibrary.tsx, LearnerResourceHub.tsx.
- ProductionWorkspace.tsx wrapper draft autosave/PII/SOP search -> ProductionWorkspaceV7.tsx + learner-workspace.css (UI05 ACTIVE).
- ProductionWorkspaceSource.tsx cũ giữ nguyên nhưng không phải workspace đang mount. Không chạy compiler cũ rồi ghi đè V7.
- ProductionCompareSource.tsx UI06, ProductionJudgeSource.tsx UI07, ProductionSopInspectorSource.tsx UI08.
- ProductionWorkshopSource.tsx, ProductionLearnerInspectorSource.tsx, ProductionStudioSource.tsx, ProductionAnalyticsSource.tsx, ProductionSopSource.tsx, ProductionGovernanceSource.tsx, ProductionRosterSource.tsx.
- PromptLibrary.tsx UI05 và UI12; SopRequestReview.tsx appended UI11.
- source-ui.css/production.css cho combined source; learner-workspace.css riêng V7. Shared ProductDialog/MarkdownView/PromptifyMark ở common.
Các Production* native cũ hoặc CombinedProduction* được giữ để lịch sử, không mặc định đang mount. Đọc imports trước sửa.

src/services:
- productionClientService.ts: session JWT, same-origin API, timeout65s, EN/VI; Judge known API error detail được hiển thị.
- productionServerService.ts: snapshot/actions/scope/SOP/library/private context/reflection/studio/governance/roster.
- rebuildRunService.ts: server canonical lesson/SOP/rubric snapshots, generate replay, Judge ownership/claim/persist.
- productionAiService.ts: server key, actual settings, enabled models only, public summaries, search, bilingual weighted Judge.
- learnerSettingsService.ts: validated temp/topP/maxTokens/stops/search/personalInstruction/model.
- learnerContentLanguageService.ts: chỉ chọn authored EN/VI sections, không machine-translate.
- productI18nService.ts, releaseUiTranslations.ts, sourceUiTextService.ts: locale store/fallback/translations. LocalStorage promptify-language; new EN, saved VI preserved; document.lang synced.
- weightedRubricService.ts: weights30/20/20/15/15 default, validated custom5 criteria; total0..10, passThreshold stored per accepted run, default8.
- apiAuthorizationService.ts: canonical JWT/enrollment/lesson checks.
- googleRosterService.ts, rosterWorkerService.ts, driveFolderService.ts, sopIngestionService.ts.
- studioValidationService.ts, piiGuardService.ts, awardDocumentService.ts, governanceTelemetryService.ts.
- src/types/production.ts contracts. src/data/curriculumSeed.ts generated; sources curriculum-specs/curriculum-levels, generators scripts/.

API: api/product.ts(maxDuration60), api/roster-worker.ts, api/generate.ts, api/evaluate.ts. Vite middleware invokes same handlers in dev. Provider deadline50s; not unlimited polling. No raw key sent to UI, no raw chain-of-thought claim.

## 5. Credentials/config — locations ONLY, NEVER values

Project Supabase: aixhryqzgpptuhstiflx (existing rebuild project). Do not confuse with legacy projects.
Files in root, ignored/private:
- .env.rebuild.local: runtime dev/API; Supabase URL/anon/service-role, GEMINI_API_KEY/GEMINI_MODEL, GOOGLE_SERVICE_ACCOUNT_JSON. Historical VITE_* secret-like variable names exist; check presence and actual use, never echo values or bundle secrets.
- .env.production-setup.local: provisioning; SUPABASE_ACCESS_TOKEN, GEMINI_API_KEY, GOOGLE_SERVICE_ACCOUNT_FILE, GOOGLE_OAUTH_CLIENT_ID/SECRET, sampleSheet ID/tab/range.
- .env.roster-worker.local: ROSTER_WORKER_SECRET.
- .env.rotation.local: replacement GEMINI_API_KEY for approved rotation workflow.
- .env: legacy settings; do not assume values are correct/current or safe to expose.
- .env.production-setup.example: nonsecret template.
- outputs/rebuild-audit/qa-identities.local.json: isolated QA identity/password/IDs. NEVER print or include in artifact/Git/worker context.
- outputs/rebuild-deploy/.vercel/project.json: linked Vercel project metadata (not application secret). CLI login uses existing local authenticated account; don't dump global auth file.
Keys may have been pasted/screenshotted by user previously. Do NOT copy chat keys into docs. Gemini replacement dual-approved and applied earlier, but user last explicitly said old key had NOT been deleted. Revocation not verified; PAT/service-account hygiene likewise not certified. Do not revoke/change credentials without correct scope/user/provider action. Google OAuth client belongs to Supabase Google provider; client-secret not client runtime.

Inspect by variable NAME/presence only. VITE_ exposes values to browser; production secrets must be server env only. Deployment prepare excludes .env. Never send repository credentials to workers, paste them in browser, logs, stdout, screenshots or handoff. Do not assume all files hold current Vercel env values; verify selected model/config safely.

SSO previously configured/verified: Site URL https://promptify-rebuild.vercel.app; redirect https://promptify-rebuild.vercel.app/?ui=02. No wildcard required. Admin profile real name must be user supplied; no fabricated identity.

## 6. Trial data and Sheet

https://docs.google.com/spreadsheets/d/1NUv61Mn5TN8kLWWblGQgLD3pV8gmC7JEDP7Ijs0yLCY/edit
Table columns N:Q: ID, Email, Country, Department; adjacent Country/Department tables. User initially called sample, later expressly authorized trial import.
Trial previously provisioned 30 department cohorts, 1,242 enrollments and 30 manual roster connections. Class codes TRIAL-INTREPID-*; verify actual DB when counting, no invented stats. Public Basic PUBLIC-BASIC is separate.
Five fictional Basic lessons/curriculum-specs/public-basic.json; user chose fictional trial. No approved Intrepid SOP/certification claims. Class selector must change data scope; shared credentials are system-level, domain settings enterprise-level, roster/attempt/audit class-level. Same provider config across classes is expected, identical learner data is not.
No unsolicited mail to roster. Sheet Implement Plan edits must be evidence-based; screenshot 50%/24P0 is historical, not current computed completion. Don't mark unverified tasks complete.

## 7. Learner upgrade implemented, what to preserve

UI04 library/header+catalog entry, authorized docs indexed/pending/chunks/citations, sync title/URL/department/lesson/reason/priority modal, own pending/approved-indexing/rejected requests, resource filters. UI11 approver fetches Drive AFTER approval.
UI05 v7 tabs/gates/reflection, model/specs, private PDF/CSV/TXT context extraction+embeddings/selection, personal role/style instruction underneath canonical policy, micro-learning scaffolds, actual validated params/search, hover/focus help/Wiki, full history restore, usage/provider summary, compare, diagnostic scorecard, persistent library category/title/variables/settings/score/pass/share.
Library sharing currently authorized COHORT, not enterprise-wide by default. If Word interpretation requires wider sharing, design explicit reviewed permissions; do not broaden SOP access silently.
Private context <=2MB, owner/class/lesson scoped, hash dedup before consuming budget, PII checked. Selected context IDs snapshotted; server canonical sources remain authority. Settings maxOutputTokens256..4096, temp0..2, topP>0..1, <=5 stop strings, instruction<=2000.
Attempt restore returns actual corresponding output/score/params/context IDs. Locale does not overwrite user text. Reflection20..1000 characters before solution; legacy unlock bypass removed.
Generate persistence/idempotency required; no successful result if save fails. Judge never grades client-forged output/context and never stores fabricated score.

## 8. Migrations and database safety

Preserve 001..049 applied history and supabase/rollback scripts. 027..047 contain rebuild contract, scoped/private access, SOP, roster worker/scheduler, public Basic, awards, validation, atomic policies, dual approval and rotation audit.
Latest applied+recorded:
- 048_learner_prompt_library.sql: private library/context tables+RLS/service-only direct access, reflected support RPC, legacy authenticated unlock revoke. Hash05411056463ae4887588d738f3a568db3c42316cb9a61164d1215f1bba68539e.
- 049_learner_library_category_and_replay.sql: category, preserves live rebuild_begin_run definition and extends settings/context replay conflict. Hashdd6fdecf9546b4a515572d99234e2903899e7a2533437d4f0a91dfdf71797043.
Dry-run/schema validation passed; manual rollback scripts not executed. No migration rewrite, no drop/reseed/rollback as cleanup. Use transactional QA and dedicated identities. A source snapshot is NOT a database backup; no new DB restore proof in this handoff.

## 9. Latest bug report and exact fix

User: Provider log summary sát lề trái; AI Judge “không hoạt động”.
- CSS .learner-v7 details padding14px0 overwrote .lv-card padding24px. Added scoped details.lv-provider-log padding20px24px + wrap + open summary spacing.
- Judge API production had two502 around10:37/10:38. One earlier V1 unresolved claim remains deliberately untouched. Diagnostics only read real learner attempt metadata (no prompt/password exposure).
- Production HTTP dedicated QA generated+graded a proper prompt and `hi`, both200. No evidence click handler itself missing. Added actionError prop into workspace/Judge card so user sees failure beside button instead of only distant fixed toast. productionClientService includes known Judge API error detail.
- productionAiService Judge schema changed from free array to required object per canonical key, each score bounded by criterion weight/10. Validator still rejects malformed results; no fake normalization/passing score.
- New test/verify_judge_provider_schema.ts verifies unique keys/bounds/rejects invalid score. Live updated schema passes. Latest deployed HTTP hi -> Judge200 in8.699s, actual total2.5.
Uncertain claim handling: don't silently retry/delete another learner's claim or mutate evaluation. Explicit429/502 release ONLY current actor's own uncompleted claim; uncertain504 retained. User told refresh Ctrl+Shift+R and try V2; V1 may remain blocked pending investigation. Do not claim all provider failures eliminated.

## 10. Deployment: exact newest evidence

Production https://promptify-rebuild.vercel.app
Vercel user elysiatheelysier, team promptify3, project promptify-rebuild.
Project ID prj_k2ZAOSsUBoPIo2oUFAV3QEFBUc7x; org team_zrq1CEzlDezx7NrsD6hgaiJz.
Latest: dpl_D5UiZxeJCrgAHiddeUpqHpZcAenV, https://promptify-rebuild-6gkzr6m4a-promptify3.vercel.app, READY10/10/2026~10:51 local.
CLI inspect ROOT ALIAS verified latest ID, not merely build/commit success. Previous learner-feature deploy dpl_AYEBdafSUo9z1ozxgUa9f24xrPYZ is superseded.
No Git commit/push; Vercel deploy source is dirty checkout copied to staging.
Cached CLI currently C:/Users/Admin/AppData/Local/npm-cache/_npx/69f9afb961c37556/node_modules/vercel/dist/index.js; if cache unavailable use installed official CLI, don't hardcode indefinitely.

Run from REPO ROOT: node scripts/prepare_production_deploy.mjs
Then workdir outputs/rebuild-deploy: node <cli> deploy --prod --yes --no-wait
Then inspect deployment until actual READY; inspect root domain to prove alias. --no-wait JSON message may say ready while readyState INITIALIZING: do not trust message alone.
Prepare copies src/public/api and configs, excludes secrets. cpSync does NOT remove stale staging files if source removed: verify manifest/extra files before deployment. Do not delete unchecked computed paths.
outputs/learner-upgrade/verify_staging.mjs + deployed-source-manifest.json previously verified169 files zero missing/different/extra before first learner deploy; latest fixes staged/build-tested but old manifest hashes need regenerate for new changes before relying on it.

## 11. Verification and commands

Build npm run build (tsc+Vite) passes latest; chunk>500KB warnings remain. Node dependencies exist; npm ci not needed every turn.
Dev npm run dev -- --mode rebuild --port 5182; open /production?ui=05. No assumption a previous server/session is alive. Root without flag may show legacy; inspect main.
Offline runnable: node node_modules/tsx/dist/cli.mjs <file>
- test/verify_product_http.ts; verify_product_i18n.ts; verify_rebuild_runs.ts.
- test/verify_learner_settings.ts; verify_learner_content_language.ts; verify_learner_provider_contract.ts; verify_judge_provider_schema.ts.
- test/verify_codelab_lifecycle.ts; verify_sop_ingestion.ts; other feature-specific tests after reading.
SQL test/verify_learner_upgrade_schema.sql validates RLS/RPC/reflection; don't run blindly against arbitrary project.
Live scripts/verify_product_live.ts uses dedicated QA; inspect flags first.
Live scripts/verify_learner_upgrade_live.ts: default DB library/Head/replay/cross-class/reflection/request-rejection; --upload paid embeddings; --ai paid generation/Judge. Combined --upload --ai passed earlier. Latest --ai passed after Judge schema change. These scripts persist QA records; not “read-only”. Never use actual roster as QA or rerun paid broad suite unnecessarily.
Ignored probes outputs/learner-upgrade/probe-production-judge.mjs and -hi.mjs exercise real HTTP dedicated QA; read private QA identity file internally but don't log credentials. No reusable credentials inside probe source. Useful execution evidence, migrate reusable probe to scripts only if needed.

## 12. Honest remaining limits / next work

- Google Search checkbox wired/defaultOFF but live grounding returns429 RESOURCE_EXHAUSTED quota/billing. Normal generation/Judge passes. Do not fabricate search sources or say live search works.
- New SOP sync request/rejection live tested. Newly approved REAL Drive SOP fetch/index positive test not executed (no approved file supplied). Existing ingestion implementation retained; test with an approved accessible file when provided.
- Full newest learner desktop/mobile EN/VI browser regression NOT completed. Earlier fictional preview1280/390 verified contrast/no overflow; latest browser session admin correctly denied UI04, production UI12 loaded new library. User's external screenshot is actual learner evidence but not automated proof. No role impersonation/change to bypass.
- Prompt-template sharing scope cohort vs enterprise may need explicit final Word/user acceptance.
- Old keys revocation not confirmed; do not certify hygiene complete.
- Prior dependency/security audit, failure recovery, backup/restore/rehearsal/awards and official SOP readiness need re-audit against source; old backlog may be superseded, don't list as all missing without checking.
- No all16screens/4roles final acceptance certificate; no official pilot sign-off. Trial data/curriculum not production Intrepid policy.
- Latest provider schema improves determinism but Google can still rate-limit/block/timeout. Display errors and preserve evidence, avoid unbounded automatic retries.

## 13. Browser and scratch state

IAB browser2; tabs1 Sheet,2 old Antigravity auth,5 stale localhost preview,6 production admin UI12,7 production root currently signed-out landing. User's screenshot may come from external browser not controllable session. Do not close user tabs, resume old OAuth or copy tokens.
CUA API initialized; after compaction use cua.rewriteDocumentation. Only supported browser APIs, no raw Playwright/OS workaround. Stale preview tab5 navigation previously blocked on data errorpage: do not bypass security policy. Use legitimate new target/state per tool guidance; don't blindly reload oldtab.
Agent-created tabs require markDeliverable/markHandoff to persist per turn. No background jobs/workers/automations scheduled by this handoff.
Outputs are ignored, can be absent on another machine: source Word/runtime/generators/migrations are necessary transfer. Never send private .env/QAfiles with source bundle. Get credentials securely from owner/environment rather than chat.

## 14. Start of next agent turn

1. Read this + AGENTS + baseline + learner audit; git status; identify actual requested next issue.
2. Check latest user Word changes/hashes and live alias; don't restore old uncommitted source over current runtime.
3. Apply relevant skills; inspect current imports and HTML before UI edits.
4. Make bounded changes, preserve existing sources and DB history; build+relevant tests; inspect paid/mutating tests first.
5. If deploying authorized change, refresh staging FROM ROOT, verify source/extras/no envs, deploy existing project, verify READY+alias+real endpoint. No auto commit/push.
6. Report actual outcomes and remaining external blockers in Vietnamese. Keep commentary useful, no extra architecture plans unless requested.

Suggested continuation prompt: “Đọc docs/archive/handoffs/PROMPTIFY_REBUILD_HANDOFF_2026-10-10.md, giữ combined UI và theo 4 Word; kiểm tra lỗi được giao trên source hiện tại, bảo toàn dirty checkout/credentials, kiểm thử rồi deploy nếu được yêu cầu. Không tiếp tục multi-agent.”

## Latest continuation: parallel MVP audit

User explicitly reauthorized parallel agents after this handoff. Three bounded agents completed UI/learner/backend fixes; primary agent corrected polling/session scope and expired-login escape. Read MVP_PARALLEL_BUG_AUDIT_2026-10-10.md for current changes/tests/deployments. The earlier statement that no workers ran applies only to the original handoff, not this later authorized audit. No Antigravity workflow was resumed. Source manifest hashes from handoff predate these edits and must be refreshed before reuse.

Latest production at end of parallel audit: dpl_6fKs2jQKbSohrNK8RxxWRCxR4cy2 (https://promptify-rebuild-6dg9mw43b-promptify3.vercel.app), READY and root alias verified; supersedes IDs in section10. Browser recovered expired SSO and tested UI14 EN/VI desktop/mobile without horizontal overflow, correct vault-tab placement. Read MVP_PARALLEL_BUG_AUDIT_2026-10-10.md before relying on older limitations. External Google Search quota and approved Drive positive test remain.

Latest scoring correction and deployment: see AI_GRADING_FIX_2026-10-10.md. Production dpl_DM6zsjcBVS1Z6bTXPQ3YjGTUoJh8 READY, root alias verified. User prefers Antigravity simple workers/GPT Sol supervisor; isolated test worker blocked on exact command permission, candidate not applied. Existing evaluated attempts preserved.

Antigravity Pro worker VERIFIED: kangseobi123@gmail.com (Google AI Pro), Gemini3.8Flash, telemetry-off onboarding. Exact PROBE_OK3.72s. Code-return task7.57s, independent container gatePASS, Sol reviewAPPROVE, new test/verify_rubric_rounding.ts applied and local rerunPASS. See scripts/multi-agent/README.md and run outputs/multi-agent/promptify-ma-rubric-rounding-795e2b39b4. Direct file-edit CLI mode remains timeoutBLOCKED; default code delivery requires no model tool execution. No app changes/push/deploy.

Latest 22:27 learner UI audit/fixes: see docs/archive/legacy-mvp/MVP_PARALLEL_BUG_AUDIT_2026-10-10.md. READY dpl_9zPEzbBRN5Qa7vKJ4i4dLggFwCfQ / root production alias verified. Footer height and compact expandable Judge feedback fixed; selected-model display and Cmd+Enter fixed. Two Gemini audits attempted: learner static candidate REVISE (not integrated; stronger real handler regression added), backend permission BLOCKED. No worker permissions bypass. Latest real handlers and seven other offline checks passed; build passed. No Git commit/push or migration. Browser admin cannot open learner UI05 by design; learner layout evidence is explicitly fictional offline fixture.
