# Hub responsive — staging release 2026-10-19

## Changes

Target app: `apps/promptify-intrepid`. Existing logo, emerald colors and fonts retained. No changes to MVP, AI grading, authentication rules or database schema/data.

- Removed the separate repeated class/department status bar below navigation. Class selection remains available; staging is a small badge in navigation.
- Hub uses available viewport width rather than a fixed central column. Fluid gutters, readable prose widths, adaptive catalog cards and one-column mobile layout.
- Compact welcome/resume, collapsible course-progress and badge overview with key metrics visible. Catalog precedes workshop activities. All existing filters, learning materials, SOP drawer, lesson details, badge PDF and certificate controls remain reachable.
- A single lesson uses the row width; on desktop its descriptive content and SOP/schedule facts form two columns rather than a tall, empty card.
- Mobile welcome guidance is shortened, progress summary has a compact grid, targets remain at least44px. Tablet/mobile navigation has an expandable Menu.
- Independent review caught long fallback email/title overflow; scoped wrapping fixed it and long-text/landscape cases were verified.

## Validation

- Typecheck, architecture lint and boundary guards PASS. Existing type-only Workspace cycle warning remains.
- Explicit offline suite **40/40 PASS**, including grading/run contract and award PDF tests. No live test glob executed.
- Final staging-mode build PASS; existing large-bundle warnings remain. Dev/API smoke PASS, unauthorized local requests rejected.
- Real React components with a local fictional adapter: widths **320,360,390,768,820,1024,1280,1440,1920,2560**. No page horizontal overflow, Hub fills available width, redundant status bar absent, lesson Details and mobile Menu operate.
- Both English and Vietnamese at360/768/1440: seven-lesson catalog, search, pillar filters, materials, expanded progress/badges section, SOP dialog PASS.
- Studio navigation checked at360/768/1280 to catch global-nav regressions.
- Additional320x568 and844x390 (device-scale2) cases with long email and unbroken lesson title PASS. These are browser viewport simulations, not physical-device certification.
- Inspected screenshots at360/768/1440/2560 and tightened remaining spacing before release.

## Staging release

Firebase Hosting version: **4bc15e437b66202a**.
Site: `ai-transformation-510302-intrepid-staging`.
Project: `ai-transformation-510302`.
Only Hosting deployed. Existing Cloud Run API revision remains `promptify-intrepid-api-g38p-1019` with Gemini3.8Flash parallel grading configuration unchanged.

Prior before-handoff inventory preserved under `before-handoff/`; a fresh baseline was captured immediately before this release under `before/`. After inventory, comparisons, deploy result, served asset hashes, build log, source fingerprints, local screenshots and public-browser checks are stored in `apps/promptify-intrepid/outputs/staging-release-2026-10-19-hub-responsive/`.

Tokens were supplied in process memory only and cleared afterwards. Secret payloads were not exported. IAM, Cloud Run, SQL settings, secret references/versions, Firestore rules, CORS, auth domains and default Hosting release list are checked by the governance comparison. No migration, IAM change, worker/Scheduler activation, production deploy or production data write was performed.

Public staging checks at360/768/1440 load Google sign-in without JavaScript errors or horizontal overflow. Authenticated post-deploy Hub behavior cannot be claimed from public checks: computer-use is unavailable, so authenticated layout/interactions were exercised with the isolated fictional local adapter. The user's earlier confirmations for Run/history/Compare/personal templates remain recorded in the handoff; no new AI calls or course-data writes were needed for this UI release.

Governance comparison and HTTP bundle results are appended below after completion.

## Final post-deploy result

- **21/21 governance comparisons PASS**; full Cloud Run service unchanged, as are IAM policies, rules, SQL configuration, auth domains, secret metadata/version references, CORS-containing bucket configuration and default Hosting releases.
- Before/after inventory captured all **29 query groups** in each manifest.
- **23/23 live HTTP/asset checks PASS**; served learner/Hub/Studio routes and JS/CSS match the final staging build, unauthenticated product/generate/evaluate requests correctly return401.
- Public-browser checks at360/768/1440 PASS (sign-in screen visible, no JavaScript error or horizontal overflow).
- Evidence archive: `apps/promptify-intrepid/outputs/staging-release-2026-10-19-hub-responsive-governance.zip`, adjacent SHA256. Source fingerprints, evidence integrity manifest and secret-pattern scan are retained.

Open the existing QA Hub at [staging](https://ai-transformation-510302-intrepid-staging.web.app/?ui=04&classId=229f6de3-140c-452a-a5a7-5d4d17e71c12). Hard-refresh to load the new bundle. Badge actions are inside **Course progress & badges / Tiến độ và huy hiệu**.
