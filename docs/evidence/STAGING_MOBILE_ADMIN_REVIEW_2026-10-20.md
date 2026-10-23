# Workshop and Studio mobile verification — 2026-10-20

Continuation of `STAGING_MOBILE_REVIEW_2026-10-20.md`, after the user completed real Google sign-in as the existing staging administrator `duonglh.work@gmail.com`. This completes the previously pending Workshop/Studio browser checks.

## Release

Final staging Hosting version: **`bbac58c8ff52b829`**, released **2026-10-20 07:39:17 UTC**. Baseline for this continuation: `56fef0d5603e5e82`. Only the named `ai-transformation-510302-intrepid-staging` Hosting site was deployed; runtime remains `promptify-intrepid-api-sopdl-1019`.

## Findings and fixes

1. Workshop overflowed by 53 px at a requested 768 px tablet viewport. Studio editor actions overflowed by 37–44 px at the same size. Expanded the scoped narrow-screen layouts through 980 px: compact actions menu, scrolling tab strip and readable card layouts.
2. Studio status filter buttons overflowed by 28 px at 320 px. Filters now wrap, with 44 px touch targets and spacing.
3. Workshop statistics consumed four large rows on phones. They now use a compact two-column grid while retaining the existing colors, icons and typography.
4. Workshop cohort/department/learner-count text was concatenated without separators. Added visible separators; identifiers and lesson data are unchanged.
5. A real stale lazy-module request after deployment left the admin page blank. A manual reload restored it. Added an application error boundary with a visible explanation and an explicit Reload button. It does not automatically reload or loop, and does not promise to recover unsaved edits. The current URL and normal persisted session are reused when reloading.

Files changed in this continuation:

- `src/components/rebuild/ProductionWorkshopSource.tsx`
- `src/components/rebuild/revised-workshop.css`
- `src/components/rebuild/ProductionStudioSource.tsx`
- `src/components/rebuild/revised-studio.css`
- `src/main.tsx`
- `src/components/common/AppLoadBoundary.tsx`
- `src/components/common/app-load-boundary.css`

## Verification

Real signed-in staging browser, fictional acceptance class `4a5a763a-b1b5-4676-88ca-81f4805fb321`; lesson 2 `64b6f084-9e93-49cd-a7be-e2ef9e14ff65`.

Requested sizes: **320×568, 360×800, 390×844, 768×1024, 1024×768**. Measured actual DOM content widths, rather than relying on viewport-set success. Workshop, Studio directory and all five editor tabs: **35 combinations, zero page horizontal overflow after fixes**. Final separator-only release was additionally checked on Workshop at all five sizes with zero overflow.

Verified editor navigation and More actions, scope fields, instructions, SOP source cards, rubric and award settings. Source cards remained readable without dragging a wide table. This class has four source versions and no facilitator-material rows; populated material-row mobile rendering was not retested in this continuation. The editor remained saved/unmodified; no publish, broadcast, freeze, score, rubric or award-rule mutation was performed. The normal profile confirmation after login was completed with the existing name and fields on staging.

The error boundary was exercised in a disposable local Vite HTML fixture using a genuinely rejected React.lazy import. The rendered result was an alert with heading, explanatory text and explicit Reload button; button height 44 px, document width equaled scroll width at 360 px. This verifies the boundary path without breaking a deployed asset or injecting authentication.

Typecheck, lint, boundaries, staging build and dev/API smoke passed. Offline allowlist: **47/47 passed**. Existing Workspace cycle and bundle-size warnings remain. Final route/assets/unauthenticated API verification: **23/23 passed**.

## Governance and limits

Captured before/after GCP inventory and Hosting configuration; **21/21 unchanged** comparisons, including GCP IAM, Cloud Run service, SQL settings/attachment, Firestore rules, secrets metadata, auth domains/provider, storage and default Hosting releases. No IAM changes, migrations, backend deploys or production writes/deploys. Existing redaction excludes tokens/secret values; archive scanned for common credential patterns. Governance covers resources accessible to the operator, not every organization-level resource.

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-20-mobile-admin/`, including before/after viewport matrices, screenshots, local boundary fixture, test/build/deploy logs, governance inventories and HTTP checks. ZIP, SHA256 manifest and archive hash accompany it.

Remaining acceptance limits: real iOS Safari/Android devices, software keyboard/safe areas, zoom/accessibility assistive technologies and broader production operational gates are separate work. Browser viewport checks do not establish universal device compatibility or 100% production readiness.
