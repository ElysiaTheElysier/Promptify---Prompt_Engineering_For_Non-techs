# Prompt for Codex: review and finish the Promptify Intrepid UI refactor

You are taking over an unfinished UI refactor of Promptify Intrepid (`apps/promptify-intrepid`, React 19 + Vite + Tailwind + plain CSS, staging only).
The product owner reviewed the result and says it is still not good enough. Your job is to review it critically and then fix it until it reads as a production SaaS product in both Vietnamese and English.

## Read first
1. `CLAUDE.md`, `AGENTS.md`, and the shared tracker `C:/Users/Admin/AppData/Local/Temp/promptify-coordination/TRACKER.md`. Read the last four Claude entries dated 2026-10-23 and 2026-10-24.
2. `docs/proposals/UI_UX_REVIEW_2026-10-23.md`, which is the original UI proposal (waves A–D).
3. Run `git status`. Large parts of the tree are uncommitted, including other people's work. Preserve everything you did not write.

## Hard constraints
- Frontend only. Do not change the API, DB/migrations, IAM, model (`gemini-3.8-flash`), Judge strategy (`parallel-v1`), scoring (`weighted-v1`), thresholds or quotas.
- Keep every existing button, action, flow and permission check. Rearrange, restyle and rename labels only. Do not delete features.
- Do not deploy, commit or push. Do not run anything that calls Gemini/Vertex, Firebase, Cloud SQL or gcloud.
- Tests find some elements by visible English text, so keep those strings or update the test in the same change:
  - `tests/verify_learner_ui_state.mjs` uses "Save to library", "Download template", "Prompt library", "Run prompt".
  - `tests/verify_mentor_studio.mjs` uses the "Control Center" link, "Save configuration", "Stay in Studio".
  - `tests/verify_app_session_state.mjs` uses "Sign in again".
- Do not reorder the `copy()` dictionary so that Vietnamese-source keys stop matching. See "i18n system" below.

## What exists now (done by Claude, offline-tested, not deployed)
- **Shared kit:**
  - `src/components/common/ui-kit.css`: `.ui-btn` with variants primary, secondary, danger, ghost and sm; `.ui-btn-row`; the confirm dialog; the toast.
  - `src/components/common/UiFeedback.tsx`: `confirmAction()`, `<ConfirmHost/>`, `<Toast/>`.
- **Shell and design layer:** `src/components/common/app-shell.css`, imported by `ProductionApp.tsx`.
  - Tokens: pine `#103b30`, emerald `#047857`, mint `#e1f4eb`, paper `#f3f6f4`, line `#d6e1dc`, ink `#15231e`.
  - Font: Be Vietnam Pro, loaded in `index.html` and set as Tailwind `sans`/`display`.
  - `scoped()` in `ProductionApp.tsx` now renders `<header class="app-bar">`: a top row with brand, class picker and account actions, plus `<nav class="app-tabs">`.
  - Staff panels are styled through `.workspace-shell .prod-card ...` (labels, inputs, grids, tables, details, rows, `.panel-split`).
  - Learner workspace at ≥981px: three viewport-height columns that each scroll, with a sticky Run row.
  - Source-screen overrides: the dark header becomes light, navy/gradient banners become flat pine, `.uppercase` becomes sentence case, `.font-mono` is reset for non-code text.
- **i18n:**
  - `src/services/sourceUiTextService.ts` holds `copy()`/`sourceUiText`.
  - About 20 new pairs were added, plus regex rules for dynamic text.
  - A trailing "..." is normalised to "…".
- **Dev-only preview:** `ui-preview.html` + `ui-preview/main.tsx`.
  - Real components with fake data, a fake session and canned `/api/product` responses.
  - Not a build input.
  - Run `npm run dev:staging` in `apps/promptify-intrepid`, then open `http://127.0.0.1:5195/ui-preview.html?screen=<key>`. Keys: hub, learner, compare, judge, learnersop, workshop, inspector, studio, analytics, roster, sop, governance, feedback.
- Files touched: see `git status`. The UI-relevant set is under `src/components/{common,rebuild}`, `src/index.css`, `src/services/sourceUiTextService.ts`, `tailwind.config.js` and `index.html`.

## Known weaknesses (verify each, then fix)
1. **The layer is fragile.** `app-shell.css` restyles the ported "Source" screens with attribute and Tailwind-class overrides (`.bg-slate-900`, `[class*=bg-gradient-to-]`, `.uppercase`, `.font-mono`). Replace this with real markup and class changes in the Source components where it matters, and delete the override once the markup is fixed.
2. **The staff Source screens are dense mock-up ports.** Studio, Workshop, Governance, Roster, Analytics and SOP all show the same problems:
   - cards nested inside cards
   - KPI rows that repeat the same numbers
   - decorative pills and badges
   - English-only technical copy such as "RLS Isolation Active", "Gateway latency", "Vault keys"
   - every section given equal visual weight

   For each screen, decide the one primary job, lead with it, and demote or collapse everything else.
3. **The Workshop screen still has a second header row** ("Facilitator portal" plus a phase segmented control) under the app bar, and the "Hint requests" card sits above it. Integrate these into one page header with the phase switch.
4. **The learner workspace (UI05) is still busy.**
   - The scaffold chips, the "5 Standard Elements Framework" button and the core-elements badges crowd the editor.
   - The toolbar wraps onto two rows.
   - The attempt history sits under the editor.

   Make the editor and Run the clear focus. Keep every control reachable. Check widths 1280, 1440 and 1920, and the mobile tab mode.
5. **Learner hub (UI04):** the hero, progress strip and filter bar need hierarchy, and the lab cards need a clear status and next action.
6. **Terminology is not consistent.**
   - VI mixes "Codelab", "bài lab" and "bài học".
   - EN mixes "class" and "cohort".

   Pick one term per concept in each language: VI "bài lab" / "lớp học" / "giảng viên" / "học viên"; EN "lab" / "cohort" / "facilitator" / "learner". Apply it everywhere. Hard-coded uppercase literals such as "5-TECHNIQUE COHORT PROGRESS HEATMAP MATRIX:" and "LIVE MASTERCLASS SESSION" should become normal-case copy.
7. **Screens still on the old styling:** Landing (UI00), entry screens UI01–03, and the dialogs rendered through `ProductDialog`, which uses `.prod-app` and the old `prod-card` look. Make them match the new tokens.
8. **Empty and error states are inconsistent.** Some show "—" and others show nothing. Some error strips are full-width red bars, for example "Sign in with your enterprise account." on Analytics. Every panel should have a written empty state that tells the user what to do next, and should report errors through the shared toast or an inline alert inside the panel.

## i18n system (read before editing copy)
- **Components with `p(en, vi)` or a `vi ? … : …` ternary:** edit both strings together.
- **Source screens with `copy("literal")`:** the literal can be either VI or EN.
  - The dictionary blocks are `VI|EN` lines. `en.set(VI, EN)` and `vi.set(EN, VI)`, and later blocks override earlier ones.
  - To change what EN shows for an English literal, add a line `Old English literal|New English text`.
  - To translate a new literal, add `Vietnamese|English`.
  - Never edit the left side of an existing pair unless you also change every literal that uses it.
- **Language check:** in the preview, toggle VI/EN and confirm there is no English sentence in VI mode and no Vietnamese in EN mode. Proper nouns are fine: Promptify, Gemini, Google Sheets, SOP, the class codes, and the mock lesson and learner data. Claude scripted this check over every preview screen. Re-run an equivalent check after your changes.

## Design direction (keep unless you have a better, justified reason)
- **Audience:** Vietnamese enterprise L&D admins, live-workshop facilitators, and non-technical employees learning prompting.
- **Typeface and spacing:** one typeface (Be Vietnam Pro), 1px lines, no card shadows except dialogs, and hierarchy carried by type size and weight.
- **Colour:** emerald for primary actions only. Pine is the only dark surface.
- **Avoid template tells:**
  - all-caps eyebrows
  - gradient hero banners
  - monospace data labels
  - "→" appended to buttons
  - identical rounded cards for everything
  - meta strings chained with " · "
- **Accessibility:** visible keyboard focus, 44px touch targets on mobile, `prefers-reduced-motion` respected, no horizontal scroll at 375px.

## How to work
1. Start the preview and screenshot every screen in VI and EN at 1440px and 375px. Write a short critique per screen in `docs/proposals/UI_REVIEW_CODEX_2026-10-24.md` before you change code.
2. Fix the screens in this order: learner workspace, learner hub, workshop, SOP, studio, governance, roster, analytics, then entry/landing/dialogs.
3. After each screen, re-screenshot it and run `npm run typecheck` and the relevant `node tests/verify_*.mjs|ts`.
4. At the end, run from `apps/promptify-intrepid`: `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test`. The baseline is 74/74 passing with lint at 0 errors (1 known circular-dependency warning).
5. Append a tracker entry with the files changed, the screens done, the screens not done, and the test output. Report evidence as CODE / OFFLINE / LIVE.

## Done means
- Every screen in the preview looks deliberate in both languages, at desktop and mobile widths.
- Every original action is still present and working in the offline tests.
- The language check is clean.
- The fragile class overrides are removed or reduced to documented, minimal rules.
- All offline checks pass. Nothing is deployed or committed.
