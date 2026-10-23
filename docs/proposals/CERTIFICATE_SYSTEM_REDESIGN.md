# Certificate system redesign — 12 October 2026

## Scope and audit
Target: apps/promptify-intrepid only. MVP and pre-existing repository changes preserved. No files moved/deleted, no migration/DB write/push/deploy.

Previous renderer: src/services/awardDocumentService.ts, pdf-lib + embedded public/fonts/NotoSans.ttf. It sliced recipient/title/issuer, shrank text to 10pt, omitted course name, and offered no preview. QA-looking text came from the previous offline fixture, not a hardcoded learner in production. Certificate IDs already came from product_awards UUID records.

Flow: prompt_attempts evaluation or attendance updates invoke product_refresh_awards (migration 042). Eligibility requires active/completed enrollment, passing all published lessons, configured average score, optional attendance, and enabled certificate policy with title/issuer. Inserts are idempotent. downloadAward loads the class-scoped record and learner, checks learner ownership, then renders. These rules and immutable SQL remain unchanged. Course title now comes from the authorized classes → courses join; missing real names/titles fail validation instead of creating placeholder documents. The download language is now passed explicitly from the learner UI.

## Design and rendering
Premium academy direction: warm white, emerald, dark green text, generous whitespace, left-aligned typography, one restrained geometric motif. Recipient is the focal point. No signatures, seals, professional accreditation claims, or fabricated authority. Badges retain achievement wording.

One measured vector scene drives inline SVG preview and PDF drawing. Existing pdf-lib is retained instead of adding server-side Chromium: the app already deploys font assets and this avoids a new browser runtime. Noto Sans is embedded in SVG and PDF; text remains searchable vector text in PDF. A4 landscape 841.89 × 595.28 points, exactly one page. Preview and download are generated together by the authorized server, so both use the same record values and measured lines.

## Data contract and limits
CertificateData: recipientName, courseName, certificateTitle, issuedAt, certificateId, issuerName, optional score/verificationUrl/kind.

Limits (Unicode code points before NFC normalization): recipient 120, course 240, title 140, issuer 120, record ID 80. Required fields cannot be blank; control/format characters are rejected. Space runs are normalized. Calendar dates must be valid; date display uses Asia/Ho_Chi_Minh. Scores are finite numbers from 0 to 10. Unsupported font glyphs are rejected explicitly, including emoji outside Noto Sans coverage. Supported Vietnamese/Latin/other glyphs in the bundled font are preserved. The character cap is necessary but not sufficient: fitting must also succeed.

Names use 27–43pt, titles 16–23pt, courses 14–20pt. Actual embedded-font widths are measured. Prefer one line at readable size; otherwise find a balanced word-boundary split into at most two lines and decrease size as needed. Unbreakable or exceptionally wide inputs that cannot fit are rejected with an actionable error; no truncation. Metadata is also width-checked. Existing historical records exceeding limits need correction through the normal authorized data workflow, not silent shortening.

## Verification gap
No public certificate verification route was found. Production mapping sends no verificationUrl and emits no invented URL or QR. The reusable renderer supports an explicit HTTPS verification link in SVG and PDF; the real flow must only populate it when a real backend exists. Public lookup, authenticity/revocation policy, access/privacy decisions and QR integration remain future work. Certificate IDs shown today are the actual stored award IDs, visually subordinate in the footer. Sample IDs belong only to offline fixtures.

## Files changed
- src/types/certificate.ts: dynamic data contract.
- src/services/certificateLayoutService.ts: validation, fitting, shared scene and SVG template.
- src/services/awardDocumentService.ts: vector PDF renderer, embedded font, glyph checks, mapping.
- src/services/productionServerService.ts: authorized course mapping and preview response.
- src/components/common/CertificatePreview.tsx: reusable inline preview.
- src/components/rebuild/ProductionHub.tsx: preview/download UI and language propagation.
- tests/verify_award_pdf.ts: offline fixtures and automated PDF/layout/data validation.
- scripts/verify_certificate_browser.cjs: reusable headless browser check (Playwright supplied by environment).
- docs/proposals/CERTIFICATE_SYSTEM_REDESIGN.md: this report.

## Validation and artifacts
Seven fixtures: An; normal Vietnamese; long Vietnamese; very long Vietnamese + long course; ASCII; decomposed Unicode; two-line stress name. Alternating present/absent score. Sample PNG/PDF/SVG and browser screenshots: apps/promptify-intrepid/outputs/certificates/ (ignored disposable output).

PASS: 25/25 offline tests, typecheck, build, lint (AST + Dependency Cruiser), negative boundary checks, dev/API smoke. Smoke initially failed under sandbox localhost restrictions and passed outside sandbox. Existing Workspace type-cycle warning and Vite chunk-size warning remain unrelated.

Certificate tests assert complete normalized names, mapping, optional score, rejection of invalid data, measured bounds/overlap, one page, A4 dimensions, embedded FontFile2 and ToUnicode, unsupported glyph rejection. Edge headless tested all seven SVG previews after document.fonts.ready; all text boxes stayed within printable bounds. PNGs rendered from all seven PDFs with Poppler and visually inspected as a contact sheet; long-course browser preview also inspected. No live database/provider test was run; authenticated end-to-end testing with a production record remains a release check.

Reproduce from target app: npm test. Render PNGs with pdftoppm -scale-to 1400 -singlefile -png outputs/certificates/sample-N.pdf outputs/certificates/sample-N. For browser check, install/provide Playwright and Edge, set CERTIFICATE_PLAYWRIGHT_MODULE to the module path if needed, then node scripts/verify_certificate_browser.cjs after fixture generation.

## English certificate preference
The production award renderer now uses English certificate labels and completion/achievement wording, independent of UI language. Learner names and stored course/title/issuer values are preserved. Configure English course and certificate titles through the authorized authoring workflow if current records contain Vietnamese titles; this change does not rewrite live records. All seven delivered samples use English titles/course wording with Vietnamese learner names.
