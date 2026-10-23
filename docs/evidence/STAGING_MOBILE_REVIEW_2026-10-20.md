# Staging mobile review — 2026-10-20

## Scope and release

Only `apps/promptify-intrepid` frontend changed. Existing theme, logo, colors and fonts retained. No IAM, backend, database migration, rubric, score, or production deployment changes.

Staging: https://ai-transformation-510302-intrepid-staging.web.app

Final Hosting version: `56fef0d5603e5e82`, released `2026-10-20T07:26:59.018Z` by the existing demo.biz cloud session. Baseline rollback version: `68f6d628d37265cb`. One intermediate mobile release preceded the final editor header refinement. Cloud Run remains `promptify-intrepid-api-sopdl-1019`.

## Fixes

- Outcome measurement inherited `width:100%` plus side margins on phones, producing a 16 px page overflow. Explicit width now subtracts the gutters, both expanded and collapsed.
- SOP document card actions touched each other when wrapping. Added spacing between the buttons and between document title/status.
- Source inspector page tabs and close control had undersized touch targets. Mobile controls now have at least 44 px height; close/page buttons also have at least 44 px width. Reduced drawer padding to 16 px and allowed footer actions to wrap.
- Prompt editor heading, Save button and draft badge squeezed into one row. On phones the title/badge share the first row, and the single Save button occupies the next row.

Changed source: `src/components/rebuild/{outcome-measurement.css,learner-workspace.css,source-ui.css,ProductionSopInspectorSource.tsx}`.

## Live browser verification

Used the supported browser viewport capability against the real staging app with the signed-in second learner. No token extraction, fake authentication, paid AI runs or grade mutations. Normal app activity tracking may update the fictional learner's active minutes/draft status.

| Requested viewport | Actual content width with scrollbar | Result |
|---|---:|---|
| 320 × 568 | 314 | No page horizontal overflow |
| 360 × 800 | 354 | No page horizontal overflow |
| 390 × 844 | 384 | No page horizontal overflow |
| 430 × 932 | 424 | No page horizontal overflow |
| 768 × 1024 | 762 | No page horizontal overflow |
| 1024 × 768 | 1018 | No page horizontal overflow |
| 1440 × 900 | 1434 | No page horizontal overflow |

Hub measured at the first six sizes. Workspace measured at all seven; the three selectable Exercise/Prompt/Results panels were individually checked through 768 px, totaling 17 final panel/viewport combinations. Internal lesson tabs intentionally scroll horizontally inside their container; the page itself does not.

Also checked: mobile menu open/close; progress disclosure; Library; Save dialog (opened/closed, no duplicate fixture saved); advanced model/settings; authorized SOP search drawer; department SOP list; PDF source inspector and its footer. At 320 px the Save dialog stayed within x=20..300. At 360 px the corrected outcome card stayed within x=16..338 of a 354 px content area. Source inspector buttons measured 44/44/57/44/44 px tall. Final editor header screenshot visually reviewed.

These are browser viewport simulations, not physical iOS/Android tests. This learner has no attempts, so Compare with populated history, earned award preview, and administrator Workshop/Studio were not reverified in this mobile session. Their earlier acceptance evidence remains separate. An admin sign-in was started using duonglh.work@gmail.com; the Google popup was not exposed to the controller, so a user notification is pending. No role changes were attempted.

## Validation and governance

- Offline allowlist: **47/47 passed**; live tests excluded.
- Final typecheck, lint, architecture boundaries, staging build and dev/API smoke passed. Existing Workspace dependency cycle warning and bundle size warning remain.
- Final Hosting asset/route/unauthenticated API checks: **23/23 passed**. HTTP 200 for an admin route is asset delivery, not proof of signed-in admin behavior.
- Governance: **21/21 unchanged** checks, including IAM policies, Cloud Run service, SQL settings/attachment, Firebase auth provider/domains, Firestore rules, secrets metadata, storage and default Hosting releases. Default site had zero releases before and after; only the named staging site was deployed.
- Before/after inventories contain 29 captured groups plus Hosting releases/configuration. Secret values/tokens are redacted or excluded by the existing capture scripts. This is the available governance inventory, not an assertion that every organization-level GCP resource was accessible.

Evidence directory: `apps/promptify-intrepid/outputs/staging-release-2026-10-20-mobile/` (ignored). Includes raw viewport measurements, final 17-case matrix, screenshots, build/test/deploy logs, inventories, comparison and HTTP checks. ZIP/manifest accompany it.

## Next verification

Complete the pending admin Google sign-in, then check Workshop and Studio directory/editor tabs at 360, 390, 768 and 1024 px without changing published lesson data. Physical mobile keyboard, safe areas and Safari remain device acceptance work; this release does not claim 100% production readiness.
