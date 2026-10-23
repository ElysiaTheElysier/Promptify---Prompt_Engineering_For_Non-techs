# Separation implementation report — 12/10/2026

Implemented on `codex/two-app-isolation`. Two app folders now own independent internal source, configs, API entries, assets, tests, helpers, package files and lockfiles. No shared package, cross-app import, root runtime entry or source symlink is required. This supersedes the previous shared-code proposal.

## Before / after

Before: root `src/main.tsx` selected App/ProductionApp/RebuildApp; root src/api/public/test/config mixed the products. After:

```text
apps/promptify-mvp/       App/Hybrid/Instructor; generate/evaluate; own config/tests/scripts
apps/promptify-intrepid/  ProductionApp/V7/UI00–15/review; product/worker/compat APIs; own config/tests/scripts
supabase/                unchanged schema/migration/rollback authority
design-drafts/           existing design sources plus original pre-separation source archive
scripts/                 repository orchestration/audit + explicit maintenance relocation notices
docs/separation/         mapping, hashes, graphs, audit and verification evidence
```

Original src/api/public/test and five build entry/config files were retired from root only after verifying their archive copies byte-for-byte. 236 individual root paths are recorded in the manifest. No source artifact was deleted without preservation; pre-existing deletions were not recreated as runtime. Original README/AGENTS/repository guide are preserved under docs/archive/repository.

## What changed

- Copied modules according to ownership/dependency closure; 22 common original source/API paths were duplicated inside both apps. Existing common directories are app-private. No automatic sync between copies.
- Created single-app main entries. MVP always runs App; Intrepid runs ProductionApp with its own review route/production-flag precedence. API contracts and `/production` redirects are preserved.
- Removed three unused imports from the Intrepid shell after AST dry-run. No render branches were deleted. Source/hash review confirms runtime differences from baseline are limited to the two main entries and these unused imports; other runtime source bytes match.
- Created local package/lockfiles using baseline resolved dependency versions; app installs run independently. Added pinned Dependency Cruiser 18.6.0 and Knip 6.41.0 as dev tooling. No workspace/shared internal packages or monorepo framework.
- Split dev config ownership and ports; local TS checks cover source/API/config. Duplicated assets and SQL fixtures. Kept baseline CSS classes in each private Tailwind safelist; global compiled CSS hash remains `index-B9vI7Uvi.css`.
- Tests retain existing behavior checks and live tests remain outside an explicit offline allowlist. Fixed the stale MVP menu assertion to existing UI text/filter behavior; no UI or business logic change was made to satisfy tests.
- Added per-app AST/config/file-reference and Dependency Cruiser checks, negative boundary tests, smoke/preview/debug scripts and independent-app CI matrix.
- Root scripts now orchestrate both apps or give explicit owned maintenance destinations. Forty operational/generator scripts were preserved/assigned; they were not executed.
- Curriculum SQL output is staged under the owning app's `outputs/generated-migrations`, never applied history/test fixtures. Deployment staging now includes the app's private Tailwind safelist. Optional review browser tools accept `PLAYWRIGHT_PACKAGE` instead of a fixed machine-specific package path; optional tool execution remains unverified.
- Updated README/app README/AGENTS/current guide/architecture/audit/plan. Root Vercel build refuses ambiguous deployment; live Vercel settings were not changed.

Exact paths, copy hashes, final inventory and modifications: [manifest](../../separation/file-manifest.json), [script ownership](../../separation/script-ownership.json). Dependency graphs and scoped Knip reports: [evidence index](../../separation/README.md).

## Actual verification

| Check | MVP | Intrepid |
| --- | --- | --- |
| Independent lockfile install (`npm ci --ignore-scripts`) | PASS | PASS |
| Typecheck including API/Vite config | PASS | PASS |
| Production build and root orchestration | PASS | PASS |
| AST boundary/config/file references | PASS | PASS |
| Dependency Cruiser | PASS: 0 errors, 0 warnings | PASS boundaries: 0 errors; 1 inherited type-cycle warning |
| Negative architectural tests | PASS | PASS |
| Offline allowlist | 30/31 PASS; access test failed in latest full run | 25/25 PASS |
| Dev startup/assets/routes/anonymous API rejection | PASS | PASS |
| Production preview HTML/assets/production URL | PASS | PASS |
| Debug build/sourcemaps | PASS | PASS |
| Knip before/after | Advisory findings retained | Advisory findings retained |
| Authenticated learner/facilitator/head/admin workflows | NOT VERIFIED | NOT VERIFIED |
| Live OAuth/DB/RLS/roster/SOP/provider integrations | NOT VERIFIED | NOT VERIFIED |
| Vercel Preview/Production deploy and alias | NOT VERIFIED | NOT VERIFIED |

Browser headless comparison against the preserved baseline, external requests blocked: MVP landing, Intrepid landing, Intrepid sign-in and review prototype all matched **text and pixel hash**, with zero page errors. This does not cover authenticated screens or remote-font availability. Raw screenshot evidence is in ignored outputs; hashes/text are retained in [browser verification](../../separation/browser-verification.json).

Latest access failure is the existing local ID collision (`user-${Date.now()}`), reproduced before separation with configured=false. It also passed in other runs, so it remains flaky. No retry-to-green policy, skipped assertion or business fix was introduced. The old menu assertion initially failed before and after; only its stale test expectations were corrected, then the specific test passed. CI preserves access-test failures as failures; future CI may remain red until that separately scoped bug is fixed.

One existing type dependency cycle links Workspace and V7 through Props; no cross-app cycle exists. Large bundle warnings remain. SQL history hashes are unchanged, and no live provider/DB calls occurred in the offline/smoke/browser checks. See [verification summary](../../separation/verification-results.json) for exact test statuses.

## Run / build / test / debug

```powershell
cd apps/promptify-mvp       # or apps/promptify-intrepid
npm ci
Copy-Item .env.example .env.local
npm run dev               # MVP 5173; Intrepid 5174
npm run lint
npm run typecheck
npm run build
npm test
npm run test:boundaries
npm run test:smoke
npm run test:preview
npm run build:debug
```

Root `npm run dev:mvp`/`dev:intrepid` select one app; root `build`, `typecheck`, `lint`, `test` check both and propagate failures. Each app's sourcemaps/stack traces resolve to its source and it has its own dev/API process. No other app server is needed. Do not publish debug sourcemaps inadvertently; normal build omits them.

## Tools / skills actually used

- Dependency Cruiser: baseline and post-separation graphs and permanent import rules. Knip: scoped unused file/export/dependency audits, no auto-delete.
- Existing TypeScript compiler API: import dependency closure, AST unused-import dry-run/removal and supplemental boundary checks. Playwright from bundled external runtime: local headless comparisons with non-local requests blocked.
- Superpowers: evaluated, requested skills were absent from local catalog; equivalent planning/branch isolation/debugging/verification/self-review applied. No claim that a Superpowers skill was invoked. No global skill installation.
- ESLint Boundaries not added because no ESLint stack existed and would duplicate checks. jscodeshift evaluated but not needed: relative directory structure was retained and TypeScript AST covered the small transformations. No Nx/Turborepo/new framework.

Review focused on independent source/config resolution, retained fallback states, exact runtime byte/hash comparison, source preservation, fixture history, lockfile consistency, negative guard tests and public browser output. No external review message or PR was sent.

## Remaining coupling and deployment step

Source is isolated; external resources can still be shared through the same env values. Supabase users/enrollments/lessons/attempts/progress/RPCs and provider budgets remain coupled unless separately provisioned. No schema/data/auth permissions were changed. Maintenance generators/live scripts were relocated/preserved but not executed; optional runtimes/input preparation/live behavior remain unverified.

Before the next Vercel deployment, set the existing rebuild project's Root Directory to `apps/promptify-intrepid`; a separate MVP project uses `apps/promptify-mvp`. Build `npm run build`, output `dist`, Node 24, env per project. Keep domains/OAuth redirect URLs explicit and verify a Preview before Production. Root deploy is deliberately blocked; leaving the old root setting will fail the next build. Existing deployed Production remains untouched because no push/deploy occurred.

Long-term: edit only the owning app, run its architecture/test/build checks, treat duplicated fixes as separate reviewed changes, preserve DB history, and inspect Knip candidates rather than deleting blindly. Rollback restores exact recorded source paths from the archive/snapshot and reverts only separation-owned config/docs; never reset/clean the pre-existing dirty work.
