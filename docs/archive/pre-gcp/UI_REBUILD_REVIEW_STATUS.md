> Current production integration is tracked in [Production trial release](PRODUCTION_TRIAL_RELEASE_2026-10-09.md). This document describes the earlier review/prototype adapter; its simulation statements apply to /rebuild, not every current production feature.

# Promptify UI rebuild from the Word review

Updated 8 October 2026. This is a UI implementation and verification record, not a production completion certificate.

The controlling input is [Promptify UI code for Review](<../../Promptify - UI code - for Review.docx>). It contains 28 complete HTML examples for 16 screen IDs. The earlier `design-drafts/rebuild-source-of-truth` package does not contain all final updates. This rebuild selects the last complete HTML example for each screen in Word document order. The original app and historical prototypes are preserved.

Run `npm run dev -- --host 127.0.0.1 --port 5178`, then open `/rebuild?view=inventory` for all screens or `/rebuild?ui=00` to start at the landing screen. `/` continues to run the existing application. The rebuild is lazy loaded and uses React, the current green Promptify logo, Lucide icons, Inter and JetBrains Mono, and the document's supplied example data.

## Screen authority

| UI | Final example selected | Implemented screen |
| --- | --- | --- |
| 00 | 1 | Public landing and masterclass portal |
| 01 | 2 | Enterprise authentication |
| 02 | 3 | Profile confirmation and department routing |
| 03 | 4 | Access denied |
| 04 | 5 | Department training hub |
| 05 | 8 | Intrepid workspace with task, composer and output |
| 06 | 9 | Prompt and output comparison |
| 07 | 10 | AI Judge scorecard |
| 08 | 11 | SOP inspector |
| 09 | 14 | Facilitator Control Center with Pulse, Studio and Live phases |
| 10 | 17 | Refined prompt inspector and private coaching |
| 11 | 24 | Five-tab Curriculum and Learning Operations Studio |
| 12 | 25 | L&D impact dashboard |
| 13 | 26 | Department SOP upload |
| 14 | 27 | System governance |
| 15 | 28 | Roster synchronization |

Each source file, original hash, normalized hash and Word paragraph line is recorded in `design-drafts/review-authority/manifest.json`. Markdown escaping before `$event` is removed where necessary. Scripts and CDN dependencies from the HTML examples are excluded from the browser markup. The React renderer evaluates only the bundled, trusted reference bindings; user prompt text is not evaluated as code. This renderer is a review adapter, not the intended production feature architecture.

## Verified behavior

The browser check passed 45 checks with zero JavaScript or React console errors:

- All 16 screens render at 1440 × 1024 and 390 × 844; no horizontal page overflow at the mobile viewport.
- All five final Studio tabs render. Changing a rubric weight to 40 rebalances the other weights to a total of 100.
- Variable add/delete works. Disabling a scaffold disables its corresponding rubric criterion and sets that weight to zero.
- Studio links to the Inspector and back, retaining learner context. Workspace links to comparison.
- Inserting a scaffold preserves text before and after the selected cursor position.
- The supplied simulated prompt run completes without runtime errors.

Screenshots and the machine-readable results are in ignored `outputs/rebuild-audit/`. Desktop screenshots were also inspected as a contact sheet, with detailed inspection of Workspace, Control Center, Studio rubric and mobile Studio.

`npm run build`, the existing text diff check, auth error check and `npm run test:progress` passed. The build still warns about chunks larger than 500 kB. No live AI/database tests, migration application, commit, push or deployment were performed.

## Scope still required for a complete production rebuild

This implementation is **not 100% production completion**. Authentication, model/Judge calls, broadcasts, private coaching, upload/RAG ingestion, Sheet sync, credential rotation and impact metrics in `/rebuild` are document simulations. They are labeled as demo. The existing application still has its own service integrations; they have not been substituted into the final 16-screen design.

The next implementation work must port the verified layouts into the existing feature components and connect canonical, authorized server data and actions. It must cover permission checks, saved attempts and revisions, loading/error/timeout states, session freeze, source versioning, audit persistence, and account/department isolation. The prototype domain checks do not grant real access.

The Word source also has unresolved inconsistencies that prevent an honest 100% conformity claim:

- UI-00 contains the incomplete expression `(score, idx) in (demoTab === 'vague' ? :)`. The missing score arrays are not invented; the UI displays a source-gap note.
- The final standalone UI-07 example uses five equal 2-point criteria, whereas the later facilitator framework and final Studio specify 30/20/20/15/15 weighting. The supplied examples are retained, and the conflict requires a single canonical rubric during production integration.
- Source examples contain success metrics, run times and ROI fixtures. These are not evidence of real operations.
- The shared EN/VI presentation dictionary does not establish complete, reviewed translations of every specialized string in the final examples.
- Secret fixture fields are excluded from the client, and the governance display remains masked. No raw server credentials can be exposed by the source's unmask toggle.

## Rebuild generators

Use the bundled Python/Node runtimes described by the Codex workspace dependency loader:

1. `scripts/extract_review_ui.py` extracts and hashes all final Word examples.
2. `scripts/build_review_templates.cjs` compiles markup and state, checks directive syntax, removes secrets, and records source gaps.
3. `scripts/prepare_review_runtime.py` ports the existing reference renderer to current React components without rewriting historical drafts.
4. `scripts/verify_review_rebuild.cjs` checks rendering and interactions against the running local app. Override the server URL with `REVIEW_UI_URL` when needed.

Only `src/main.tsx` and `tailwind.config.js` were changed among pre-existing tracked runtime/config files. New runtime code lives in `src/components/rebuild/`; generators in `scripts/`; reference source in `design-drafts/review-authority/`. Pre-existing changes and untracked source artifacts were preserved.
