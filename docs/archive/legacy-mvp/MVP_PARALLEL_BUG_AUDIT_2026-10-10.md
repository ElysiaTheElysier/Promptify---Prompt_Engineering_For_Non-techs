# MVP parallel bug audit — 10/10/2026

User authorized three agents to audit UI, learner controls and backend independently. Scopes did not overlap; primary agent reviewed changes, tested combined source and deployed. No migration, commit, push, reset, credential change or real roster mutation.

## Fixed issues

| Area | Verified bug | Fix/evidence |
| --- | --- | --- |
| Governance | Rotation panel above original header split UI14 into two pages | Panel placed inside Vault tab; scope notes integrated into main; responsive44px form controls |
| Governance | Confirm Key Rotation merely showed a notice | Opens actual approval section; no fake key replacement |
| Learner | Stop comma removed on each input change | Raw input preserved and synced when restoring history/template; actual control handler test |
| Learner | Template download hardcoded parameters and could include unrelated saved score | Exports active settings, score only if prompt matches graded attempt |
| Learner | Applying template kept previous uploaded private context | Clears context; template/history switching disabled during pending action |
| Learner | File read failures lacked feedback and selected context duplicates possible | Explicit file/extension error and ID dedup; SOP modal has Cancel |
| Backend | Malformed HTTP200 provider JSON/envelope raised generic error, leaving Judge claim locked | Explicit502 error, actor/claim-scoped release; uncertain504 retains claim |
| Backend | Combined sources could exceed cap after context selection; optional absent context crashed | Complete context <=100k before allocating run/budget/provider |
| App | Polling erased action failures | Separate load/action errors; action failure persists |
| App | Account changes reused previous class and prompt | Clears scope/editor/attempt/request and loads newly authenticated user's authorized default |
| App | Expired session screen offered Retry only | Local sign-out + explicit Sign in again escape; handler regression test |

## Checks

- Build TypeScript/Vite PASS on combined code. Existing chunk-size warnings remain.
- 15 selected existing offline checks PASS (HTTP/auth/i18n/run/settings/content/provider/schema/lifecycle/SOP/telemetry/auth-errors/roster/Drive/worker/fallback).
- New verify_learner_ui_state.mjs exercises real transpiled UI handlers; PASS.
- New verify_backend_failure_recovery.ts verifies malformed response, context cap before budget and scoped cleanup; PASS.
- New verify_app_session_state.mjs verifies expired-login escape and account default-scope reset; PASS.
- Staging169files exact source match, zero missing/different/extra, no .env copied.
- Production HTTP dedicated QA: learner-a/b snapshots200, cross-class403, learner/trainer/head governance403, anonymous401. No writes/AI in role test.
- Production Generate/Judge hi returned200,7.792s,total2.25 after combined agent deploy; no fabricated score.

## Deployments and limits

Combined agent fixes dpl_G7fywMcyxnnTaXCN5aWmWihdy5EK READY and root alias verified. Subsequent expired-session escape deployment dpl_6fKs2jQKbSohrNK8RxxWRCxR4cy2 pending final alias verification at document creation.

This is a bounded regression audit, not proof of zero bugs/all16routes/four-role final sign-off. Google Search quota429, positive approved Drive sync, provider uncertain claims and official SOP/curriculum limitations from latest handoff remain. Browser admin session expired during verification; new login escape was implemented rather than bypassing authentication. Browser verification outcomes will be appended below.

Final deployment dpl_6fKs2jQKbSohrNK8RxxWRCxR4cy2 READY; root alias verified. Handoff source hashes refreshed for current files.

Browser production verified expired session offered Sign in again and clicking it returned to UI01 Google SSO. SSO roundtrip verification in progress.

Browser results on final production: expired-session escape and Google SSO roundtrip succeeded; authorized admin Governance loaded. Header precedes hero and approval form; rotation is inside main/Vault and disappears in Gateway tab. Desktop1280 scrollWidth1274; mobile390 scrollWidth384, no horizontal overflow. EN/VI toggling verified; viewport and original English preference restored. Read-only smoke of Workshop, Studio directory(5 lessons) and Roster screens showed expected content. No approval, grant, roster sync or secret mutation during browser QA.

Screenshots: outputs/learner-upgrade/mvp-governance-fixed.png; mvp-governance-desktop.png; mvp-governance-mobile-vi.png. No raw credentials included.

Generator durability verified: compile_production_governance.mjs preserves integrated context, Vault rotation placement and real approval navigation. Isolated generation assertions PASS; parent node --check PASS. Runtime unchanged by generator verification; no additional deployment needed.

## Gemini worker audit and learner layout fixes — 10 October, 22:27

- Two Antigravity `gemini-3.8-flash` workers dispatched concurrently, with separate one-file candidates and read-only source inputs. Account: kangseobi123@gmail.com (Pro), telemetry off; no production credentials mounted.
- Learner-controls audit: candidate static gate passed. Supervisor verdict REVISE: source assertions do not prove events/persistence, and root baseline changed while UI fixes were made. Candidate not integrated. Evidence: outputs/multi-agent/promptify-ma-learner-controls-21263b90d5.
- Run-data audit: BLOCKED by CLI command permission; empty final output rejected. No bypass or integration. Evidence: outputs/multi-agent/promptify-ma-run-data-audit-cea9cdf9be. Supervisor reviewed server wiring and ran existing independent backend/provider tests.
- Fixed footer: shared `.source-ui` min-height:100dvh accidentally applied to ProductUseNotice. Dedicated product-footer override makes its height77px at desktop/mobile preview.
- Fixed long Judge layout: criterion scores remain visible; full feedback is expandable and independently scrolls at440px. Offline fixture15paragraphs scrollHeight1274, displayedheight440. Provider log stays in results column; tablet output/log/Judge explicit grid placement.
- Selected model specifications show active model; Cmd+Enter supported alongside Ctrl+Enter.
- Extended actual transpiled component handler regression: Judge sends saved attempt/lesson IDs; save uses current prompt/settings and does not inherit mismatched score; copy uses actual response; EN/VI callback fires; Cmd+Enter uses actual settings; paused class disables click and keyboard run.
- Existing provider contract verifies temperature/topP/output settings/search passed to actual request; model allowlist enforcement. Judge uses persisted attempt prompt/output and server run snapshot; client score ignored; server finish RPC persists evaluation.
- Checks PASS: npm run build; verify_learner_ui_state.mjs; verify_learner_provider_contract.ts; verify_judge_task_alignment.ts; verify_judge_provider_schema.ts; verify_backend_failure_recovery.ts; verify_product_http.ts; verify_app_session_state.mjs.
- Local browser: EN/VI switch passed, long feedback opens/closes, desktop1280 scrollWidth1274, mobile390 scrollWidth384, no horizontal overflow. Screenshot outputs/learner-upgrade/workspace-layout-fixed.png uses explicitly fictional offline data, not a live scoring result.
- Production deploy dpl_9zPEzbBRN5Qa7vKJ4i4dLggFwCfQ READY; root alias https://promptify-rebuild.vercel.app verified by Vercel inspect. Staging169files: missing0/different0/extra0; no environment secrets copied.
- Production browser: profile confirmation completed with one click; admin direct UI05 denied as expected; Return to workspace succeeded. Learner workspace visual QA used offline fixture because this browser account is admin; no role elevation.
- Limits: this does not certify every button in all16views/fourroles. Static worker findings are not live proof. Old stored hi6.5 attempt remains historic; new greeting scoring regression is0 with no Judge provider call. No applied migrations, credential changes, Git commit/push/reset/stash, roster sync or user invitation in this audit.

## Class-switching fix — 11 October 2026

Workshop polling every5seconds could invalidate a slow class snapshot repeatedly. refresh now deduplicates pending requests for the same class, allows a different selected class to supersede old work, and clears only its own pending token. Actor changes clear pending state. Failed class loads now show loadError and Retry instead of permanent Loading selected cohort. Regression test verify_class_loading.mjs exercises slow poll, rapid A/B switching, stale completion, failure/retry; PASS. Existing app session regression and build PASS. Deployment dpl_CW8hHcShohYnrpBRFsxuSoGxoBSN submitted; READY/alias/browser verification pending below. No role grants, migrations or production data edits.

Instructor routes: UI09 Workshop control, UI10 learner detail from Workshop, UI11 Curriculum Studio, UI12 Learning analytics. Admin also sees these routes plus UI14 governance and UI15 roster connections. Viewing those tabs as admin does not change role.
Production dpl_CW8hHcShohYnrpBRFsxuSoGxoBSN READY/root alias verified. Browser Workshop switch Video Content -> Operations loaded5Codelabs/60learners, then People loaded5Codelabs/35learners. Screenshot outputs/learner-upgrade/operations-workshop-fixed.png. Shared5fictionalBasic lessons across departmental trial cohorts are intentional; rosters and cohort data differ. Browser session left on People Workshop. No data writes beyond normal page navigation.
