# Learner SOP acceptance and download fix — 2026-10-19

## Result

Actual signed learner **demo.biz@intrepid.asia** completed source discovery, semantic search, canonical citation copy, a cited generation with automatic Judge, and original download against the real staging backend. A real download defect was reproduced, fixed and deployed staging. No IAM, production, schema, scores, rubric or theme changes.

Scope: class `4a5a763a-b1b5-4676-88ca-81f4805fb321`, lesson2 `64b6f084-9e93-49cd-a7be-e2ef9e14ff65`, SOP version `b405e79d-aec3-4a4c-8f46-089b9efe8c85`.

## Actual acceptance evidence

- User completed normal Google sign-in. Browser showed demo.biz identity on profile confirmation; existing profile fields retained. No auth tokens/storage read or custom credentials minted.
- Department library: one indexed source; inspector displayed exact uploaded fictional content. Local text search and citation-copy clipboard were verified.
- Lesson2 semantic query `ticket 43 update deadline`: returned the published fictional SOP and exact canonical `[SOP:b405e79d-aec3-4a4c-8f46-089b9efe8c85:v1]`.
- Lesson1 same query: no matching sources. Department library intentionally permits browsing admitted class sources; lesson retrieval follows explicit lesson bindings. Do not confuse those two scopes.
- Shadow class `b26b1ee6-3932-4c13-bc3d-bfe0515408dc`: direct navigation rejected signed demo.biz; no shadow content displayed. This UI acceptance does not replace a complete forged-object HTTP role matrix.
- Lesson2 V5 actual attempt `7ccb334e-2b9a-42b2-96ef-7e0fd97cd772`: Gemini3.8Flash output gave normal priority /2businessdays, exact canonical citation, and the document control canary that was not included in the learner prompt. Read-only server evidence confirms citation and canary in frozen generation context and output. Generation1917ms; automaticJudge8060ms; score10/10; supervisor+5workers,6providerattempts,0timeouts. No score modification or requirement reduction.
- Afterward course has6savedattempts,3graded,2/2complete,2badges+1certificate,1personaltemplate. Old three ungraded timeouts untouched; no duplicate awards.

## Reproduced defect and fix

Before fix, sourceDownload passed `{download:true}`, but CloudStorage adapter ignored options. Signed TXT response opened inline in the current tab instead of initiating a download; browser lost the learning view and decoded the inline TXT dash incorrectly. The bytes themselves were valid.

`apps/promptify-intrepid/src/services/cloudStorageService.ts` now signs a `response-content-disposition` attachment override when download requested. It supplies a safe ASCII fallback plus encoded UTF-8 filename, removes CR/LF/quote/backslash from filename, retains private bucket/path checks, signed read action and maximum300second URL lifetime. Source access authorization is unchanged. Ordinary signed views retain prior behavior.

After deployment, actual browser download completed to `fictional-delivery-sop.txt`; SHA256 equals original uploaded fixture, tab remained in app. Signed URL is intentionally not retained in evidence. See `learner-download.json`.

## Validation and release

- Regression `verify_sop_download.ts` invokes real storage adapter with offline signing capture: attachment, UTF-8 filename/header safety, expiry cap, ordinary view behavior, invalid path/bucket denial. Added explicit offline allowlist.
- 46/46 offline tests PASS; typecheck/build PASS after replacing unsupported Array.at with pop; lint/boundary/local-smoke PASS. Existing Workspace cycle and large-bundle warnings remain.
- Build `a93bbde6-d123-4ab6-8640-bde030377140` SUCCESS.
- New revision `promptify-intrepid-api-sopdl-1019`,100%staging traffic.
- Image `sha256:77fa1dd043279d6d57a77b84da375fc574465e9cd75878ac9cfa814568684a72`, based on immutable readiness image with only cloudStorageService.ts copied.
- Rollback `promptify-intrepid-api-ready-1019`. No frontend deployment, dependency upgrade or migration.
- Candidate5/5 and activeAPI5/5 PASS. Raw complete revision spec hashes match after masking image only; secret/env values never written by hash check. Before/after governance stored in release folder; final comparison appended below.
- Gemini generation/Judge model and bounded parallel strategy unchanged; embeddings remain separate gemini-embedding-001.

## Remaining production gates

This closes the signed learner TXT SOP path; it does not establish unrestricted production readiness. Live PDF/DOCX/XLSX ingestion and revoked/replaced-source races remain unverified. Full signed Head/peer/admin object-isolation matrix, capacity/consistency/cost testing, operations alert delivery and isolated restore rehearsal remain gates in STAGING_PRODUCTION_READINESS_2026-10-19.md. No missing Firebase/SQL credential blocked this SOP acceptance. Drive/Sheets identity is still a separate optional-feature configuration gap.

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-19-sop-download/`. Browser screenshots, exact run metadata, download hash, governance snapshots and archive manifests are included; no passwords/tokens/signed URLs included.

Final governance comparison: **21/21 PASS**. Default and staging Hosting releases unchanged. Post-deploy browser original download PASS/hash-match; reload retains V5/citation/canary. Credential-pattern scan and SHA256 archive completed in evidence packaging.

