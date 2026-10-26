# UI refactor acceptance — 24–25 October 2026

Owner: Claude (frontend UI). Builds on Astra/Codex's learner workspace and hub pass (`docs/proposals/UI_REVIEW_CODEX_2026-10-24.md`).
Scope: frontend only. No API, database, auth, IAM, model, Judge/scoring, quota, deployment or business-rule change. Nothing committed, pushed or deployed.

Evidence levels used below: **CODE** (read in source), **OFFLINE** (local checks/tests and the dev-only preview with fake data), **LIVE** (staging). This pass has **no LIVE evidence**: every screen was checked through `ui-preview.html` with fixtures.

## Design system (short spec)

| Area | Decision |
|---|---|
| Palette | Pine `#103b30` (header, the only dark surface) · Emerald `#047857` (primary actions) · Mint `#e1f4eb` (selection) · Paper `#f3f6f4` (page) · Line `#d6e1dc` · Ink `#15231e` · Muted `#56675f`. Tailwind `m3-*` tokens remapped to these, so every ported screen inherits them. |
| Type | Be Vietnam Pro for all UI (Google Fonts, already loaded). Monospace only for prompt text and code. Minimum 12px; headings 17–24px, weights 600/700. Sentence case, no all-caps labels. |
| Shape | Two radii: 16px sections, 12px inner surfaces/controls (8px inputs). Shadows only on overlays (dialogs, drawers, toasts). |
| Navigation | Top header (pine): brand + Staging + cohort picker + VI/EN + profile + sign out. Second row: role tabs with icons, grouped by job with dividers; the open tab takes the page colour (signature element). Tabs scroll horizontally on narrow screens and keep the open one in view. `document.title` follows the page. Skip link to main content. |
| Primitives | `ui-btn` variants, `ui-btn-row`, confirm dialog + toast (`UiFeedback.tsx`), `ProductDialog` restyle (bottom sheet on mobile), `pi-segmented`, `pi-status` (active/pending/rejected…), `pi-page-header`, `pi-section-header`, `pi-toolbar`, `pi-empty` (`ui-kit.css`), `PageHeader`/`SectionHeader`/`StatusBadge`/`EmptyState` (`common/ui.tsx`). |
| Motion | Colour/background transitions ≤150ms on controls, one dialog entrance; all disabled under `prefers-reduced-motion`. No decorative pulse/ping. |
| States | Written empty states that say what to do next; "No data yet" instead of `—%`/`—h`; errors through the shared toast. |

## Route-by-route status

| Route | Change | Status |
|---|---|---|
| Shell (all signed-in routes) | New `AppShell` (top header + role tabs), replaces two-row bar; profile/language/sign-out handlers unchanged | Done · OFFLINE |
| UI04 Learning space (hub) | Astra: next action, lab status, fixture dates. Claude: title unified; 25/10 owner-requested layout v2 after the reference: pine welcome hero with resume card, quiz/poll strip under it, certificate progress + badges always visible, labs as a 3-column card grid. No new features: SOP library drawer, sync requests, ADVANCE access request already existed. Reference demo-only parts (tier toggle, vector-chunk counts, gradients) not built | Done · OFFLINE |
| UI05 Lab workspace | Astra: editor first, writing guide disclosure, history with results, Run+Save footer. Claude: columns follow new header height | Done · OFFLINE |
| UI06 Compare / UI07 Judge | Class normalisation; Judge labels translated ("Passed / Đạt chuẩn", points), no monospace labels | Done · OFFLINE |
| UI09 Workshop | One header (session status + view switch, visible on mobile), hint queue under it, live room before metrics, phase names without conflicting numbers, light intro instead of dark banner | Done · OFFLINE |
| UI10 Learner inspector | Labels translated, locale dates, coaching placeholder bilingual | Done · OFFLINE |
| UI11 Studio | Search + directory first, stats after; "Create lab" label; translated aria-labels/placeholder | Done · OFFLINE |
| UI12 Analytics | Light intro; "No data yet" KPIs; empty leaderboard message; event names readable | Done · OFFLINE |
| UI13 SOP (staff + learner) | Lands on page header + recent submissions with status; dialog opens on request; plain-language dialog copy | Done · OFFLINE |
| UI14 Governance | Opens on "Access & domains"; tabs unnumbered; no fake masked key ("Stored on the server"); status cards moved under "System status" | Done · OFFLINE |
| UI15 Roster | Connected sources first, setup panel and access requests after; locale dates; calmer status cards | Done · OFFLINE |
| UI00 Landing, UI01–03 Entry | Token/class normalisation, translated labels and sample prompt; added to preview | Done · OFFLINE (visual only) |
| ProductDialog / confirm / toast | Restyled; bottom sheet on mobile; preview demo bilingual | Done · OFFLINE |

## Bilingual check

- Headless `--dump-dom` scan of 17 preview screens × VI/EN, text plus `placeholder`/`aria-label`/`title` (`tmp/ui-refactor-2026-10-24/lang_scan.py`).
- **Result:** no wrong-language UI copy remains. The only hits are model parameter names (Temperature, Top P, Max tokens, Stop sequences, Search grounding), the unit "tokens" and the brand "Google Workspace". These are deliberately kept: the parameter labels are also the Wiki lookup keys (`showWiki(label)`).
- **Reported modal-language defect:** reproduced as a preview artefact, not an app bug. The preview remounted the screen on a language change, which closed the dialog. After the fix, an open SOP dialog switches EN → VI in place (OFFLINE).
- **Locale-aware formatting:** dates in Roster, Learner inspector, the attempt picker and the prompt counter now pass `vi-VN` or `en-GB`/`en-US`.

## Functionality preservation

`tmp/ui-refactor-2026-10-24/ui_inventory.mjs` extracts each component's `onAction`/`productRequest` names, `navigate()` targets, buttons, dialogs, confirms and role guards. Running it before and after the refactor gives:

- **No action, API request, navigation target or guard was lost.**
- 320 buttons before and 320 after. Four moved from `ProductionApp` into `AppShell`: tab, language, profile, sign out.
- Behaviour changes that are intentional and reachable:
  - SOP dialog starts closed. The page offers "Upload a new SOP" and "Review submissions", plus the header toggle.
  - Governance opens on "Access & domains". The other three tabs are unchanged.
  - Workshop phase switch is now visible on mobile; it was `hidden md:flex` before.

Matrix (after refactor; buttons before → after):

| Component | Buttons | Actions | API requests | Navigates to | Guards | Parity |
|---|---|---|---|---|---|---|
| common/AppLoadBoundary.tsx | 1 → 1 | — | — | — | — | kept |
| common/AppShell.tsx | 0 → 4 | — | — | — | — | kept |
| common/ProductUseNotice.tsx | 2 → 2 | — | — | — | — | kept |
| common/UiFeedback.tsx | 3 → 3 | — | — | — | — | kept |
| AccessRequestInbox.tsx | 1 → 1 | — | accessRequests, reviewAccessRequest | — | — | kept |
| AccessSupport.tsx | 1 → 1 | — | accessRequest | — | — | kept |
| DepartmentCorrectionLog.tsx | 1 → 1 | — | departmentCorrections | — | — | kept |
| DepartmentSopLibrary.tsx | 6 → 6 | requestSopSync | — | — | readOnly | kept |
| LearnerProfile.tsx | 2 → 2 | saveProfileDetails | — | — | — | kept |
| LearnerSafeguards.tsx | 3 → 3 | resetAiSession, setAccessExpiry | — | — | readOnly | kept |
| OutcomeMeasurement.tsx | 1 → 1 | recordOutcome | — | — | — | kept |
| ProductionAnalytics.tsx | 3 → 3 | — | analytics | — | — | kept |
| ProductionAnalyticsSource.tsx | 2 → 2 | — | analytics | — | — | kept |
| ProductionApp.tsx | 22 → 18 | — | — | 0, 1, 10, 5, 9 | accessible, can_manage, isLearner, profile.role === 'learner', profile.role==='admin', profile.role==='head', profile.role==='learner' | kept |
| ProductionCohorts.tsx | 2 → 2 | createCohort, saveClass | — | — | — | kept |
| ProductionCompare.tsx | 3 → 3 | — | — | — | — | kept |
| ProductionCompareSource.tsx | 5 → 5 | — | — | 5 | — | kept |
| ProductionEntry1.tsx | 2 → 2 | — | confirmProfile, profileCorrection | — | — | kept |
| ProductionEntry2.tsx | 4 → 4 | — | confirmProfile, profileCorrection, saveProfileDetails | — | — | kept |
| ProductionEntry3.tsx | 2 → 2 | — | confirmProfile, profileCorrection | — | — | kept |
| ProductionGovernance.tsx | 4 → 4 | saveDomain, setAccess | governance | — | role==='instructor' | kept |
| ProductionGovernanceSource.tsx | 18 → 18 | saveDomain, setAccess | governance | — | — | kept |
| ProductionHub.tsx | 18 → 18 | accessRequest | downloadAward | — | — | kept |
| ProductionJudgeSource.tsx | 6 → 6 | — | — | — | — | kept |
| ProductionLanding.tsx | 12 → 12 | — | — | — | — | kept |
| ProductionLearnerInspectorSource.tsx | 5 → 5 | privateHint, recordAttendance, trainerAction | — | 9 | can_manage | kept |
| ProductionRoster.tsx | 6 → 6 | saveSheet, syncSheet | — | — | — | kept |
| ProductionRosterSource.tsx | 11 → 11 | saveSheet, setSheetAutoSync, syncSheet | — | — | — | kept |
| ProductionRotation.tsx | 2 → 2 | approveRotation, requestRotation | — | — | — | kept |
| ProductionSop.tsx | 5 → 5 | reviewSop, submitSop | — | — | can_manage | kept |
| ProductionSopInspectorSource.tsx | 7 → 7 | — | sourceDownload | — | — | kept |
| ProductionSopSource.tsx | 21 → 21 | reviewSop, reviewSopPreview, submitSop | listDriveFolder, prepareSopUpload | — | can_manage | kept |
| ProductionStudioSource.tsx | 33 → 33 | createLesson, sandboxGenerate, sandboxJudge, saveStudio | — | 10, 13, 9 | readOnly | kept |
| ProductionStudioV2.tsx | 18 → 18 | createLesson, sandboxGenerate, sandboxJudge, saveStudio | — | — | readOnly | kept |
| ProductionWorkshop.tsx | 7 → 7 | broadcast, sessionControl | — | 10, 11 | — | kept |
| ProductionWorkshopSource.tsx | 12 → 12 | broadcast, privateHint, saveStudio, sessionControl | — | 11 | can_manage | kept |
| ProductionWorkspace.tsx | 0 → 0 | — | saveDraft, searchSop, snapshot | — | — | kept |
| ProductionWorkspaceV7.tsx | 42 → 42 | judge, savePromptLibrary, uploadLearnerContext | — | 13, 4, 7 | — | kept |
| PromoteLearnerForm.tsx | 1 → 1 | promoteLearner | — | — | profile.role!=='admin' | kept |
| PromptLibrary.tsx | 3 → 3 | reviewPromptLibrary | — | — | reviewer | kept |
| ReviewScreen.tsx | 5 → 5 | — | — | 13, 3, 5 | readOnly | kept |
| RosterWorkbookPanel.tsx | 3 → 3 | saveSheet, setSheetAutoSync | — | — | — | kept |
| SopRequestReview.tsx | 2 → 2 | reviewSop | — | — | — | kept |
| SopSourceCard.tsx | 2 → 2 | — | — | — | — | kept |
| WorkshopMessaging.tsx | 10 → 10 | ackMessage, requestHint, reviewHintRequest | — | — | can_manage, profile.role!=='learner' | kept |
| WorkspacePreferences.tsx | 1 → 1 | saveWorkspacePreferences | — | — | — | kept |

## Tests and build (OFFLINE, `apps/promptify-intrepid`)

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 1 known circular-dependency warning |
| `npm run typecheck` | pass |
| `npm run test:boundaries` | pass |
| `npm run build` | pass (known large-chunk warning) |
| `npm run test:smoke` | pass |
| `npm test` | 74/74 |

`tests/verify_workshop_messaging.ts` had a source-string assertion for the Workshop wiring. It now asserts the queue is rendered inside the Workshop screen. `tests/verify_learner_ui_state.mjs` was updated earlier for the "Prompt library" label.

## Screenshots

These images are not part of the repository. Folders under `tmp/ui-refactor-2026-10-24/`:

| Folder | Contents |
|---|---|
| `final/` | 17 screens × VI/EN at 1440px, plus VI at 768px |
| `pass1/`, `pass2/` | Intermediate review images |
| `tmp/ui-review-2026-10-24/before/` | Astra's 52 "before" images |

Mobile (375px) is not in these folders. Headless Chrome has a minimum window width of about 500px, so its 375px captures are cropped and not used. Instead, 375px was checked in the browser pane: the document width equals the viewport on all screens, with no horizontal overflow.

## Remaining issues

| Severity | Issue |
|---|---|
| Medium | No LIVE verification. The fake-data preview cannot show long real names, many cohorts, or real error states. Check the signed-in screens on staging after a Hosting deploy (not authorised in this pass). |
| Medium | `app-shell.css` still remaps colours inside two semantic classes (`pi-on-light`, `pi-intro`) for blocks ported from dark designs. It is scoped and documented, but a full markup rewrite of those Source blocks would remove it. |
| Low | Source screens (Studio 78 KB, Governance, Roster) keep their dense internal layouts. Hierarchy, colour, type and order were fixed; the inner component structure was not rewritten. |
| Low | EN mode shows some data-driven status words in their raw form ("active", "ACTIVE" in Studio selects). |
| Low | Governance shows domains twice: source cards with a scope check, and enable/disable rows. Both are existing features. |
| Low | The Landing gradient hero was flattened by token normalisation. It has not had a dedicated marketing design pass. |

## Changed files (this refactor, including Astra's learner workspace + hub)

New:
- `src/components/common/AppShell.tsx`
- `src/components/common/ui.tsx`
- `src/components/common/app-shell.css` (created in round 1 and rewritten here)
- `ui-preview.html`, `ui-preview/main.tsx` (dev-only; not a build input)

Modified:
- `index.html` (font), `tailwind.config.js` (tokens), `src/index.css`
- `src/components/common/{ui-kit.css,MarkdownView.tsx,app-load-boundary.css}`
- `src/services/sourceUiTextService.ts`, `src/services/releaseUiTranslations.ts` (copy pairs only)
- `src/components/rebuild/`:
  - App: `ProductionApp.tsx`
  - Learner: `ProductionWorkspaceV7.tsx`, `ProductionHub.tsx`, `learner-workspace.css`, `revised-hub.css`
  - Screens: `ProductionWorkshopSource.tsx`, `ProductionSopSource.tsx`, `ProductionStudioSource.tsx`, `ProductionGovernanceSource.tsx`, `ProductionRosterSource.tsx`, `ProductionAnalyticsSource.tsx`, `ProductionLearnerInspectorSource.tsx`, `ProductionJudgeSource.tsx`, `ProductionCompareSource.tsx`, `ProductionSopInspectorSource.tsx`
  - Signed-out and entry: `ProductionLanding.tsx`, `ProductionEntry1-3.tsx`
  - Shared panels: `RosterWorkbookPanel.tsx`, `PromptLibrary.tsx`, `AccessRequestInbox.tsx`, `FeedbackReport.tsx`, `PromoteLearnerForm.tsx`, `WorkspacePreferences.tsx`
  - CSS: `production.css`, `review.css`, `source-ui.css`
- `tests/verify_workshop_messaging.ts` (wiring assertion)

## Checkpoint (to resume)

Scripts in `tmp/ui-refactor-2026-10-24/`:

| Script | Purpose |
|---|---|
| `ui_inventory.mjs` | Parity check |
| `lang_scan.py` | Language scan |
| `capture.sh` | Screenshots |
| `normalize_classes.py` | Idempotent class normalisation |

Prerequisite: start the dev server with `npm run dev:staging` (port 5195).

Next steps, in order:
1. Deploy to staging Hosting (needs approval), then do a LIVE signed-in pass per role.
2. Replace the `pi-on-light` remap with markup.
3. Do a dedicated Landing design pass.
