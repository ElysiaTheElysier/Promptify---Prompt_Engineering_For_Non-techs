# Two-lesson staging acceptance — 2026-10-19

**Resolved in continuation:** [Judge recovery and completed course](STAGING_JUDGE_RECOVERY_2026-10-19.md). Lesson2 V4 passed10/10 after bounded recovery; course2/2,exactly2badges+1certificate, PDF previews/downloads verified. API now `promptify-intrepid-api-jb-1019`. The blocked status below is the preserved earlier checkpoint.

Scope: authenticated `demo.biz@intrepid.asia`, fictional class `4a5a763a-b1b5-4676-88ca-81f4805fb321`, Firebase staging Hosting and staging Cloud Run/SQL only. No IAM, production, rubric, pass threshold, score or award overrides. Browser interaction uses the actual signed learner session; credentials are not extracted.

## Observed course flow

| Check | Actual result |
|---|---|
| Before learning | 0/2 complete, no awards; certificate requirements visible but no certificate download |
| Lesson 1 Run → automatic Judge | PASS: actual Gemini 3.8 Flash response, 10/10; generation 2,258 ms, Judge 9,516 ms; five complete criteria |
| Lesson 1 reload/history | PASS: prompt, ticket 42 table, citation and 10/10 persisted |
| After lesson 1 | PASS: 1/2, one criterion badge; no course certificate issued early |
| Lesson 2 first run | Response saved (4,362 ms); Judge 504 after ~51 s, no score recorded |
| Lesson 2 second independent run | Response saved (8,089 ms); Judge also timed out; neither uncertain claim cleared |
| Lesson 2 post-deploy V3 | Response saved (1,906 ms); Judge 504 at shared 50 s deadline, still no score |
| Personal library | PASS: saved `Fictional course acceptance — ticket 43` privately; Library lists it and Use template restores prompt |
| Compare | PASS: V1 OLDER / V2 NEWER, correct ticket 43 prompts, both explicitly not evaluated, no invented score/delta |
| First badge preview and PDF | PASS: Demo, new course title, 10.00/10, Vietnamese title renders correctly; downloaded one-page PDF, 1,215,974 bytes |
| Learner → Studio URL | PASS: assigned-permissions denial for demo.biz |
| Unenrolled shadow class URL | PASS: access restricted, no lesson/attempt data displayed |
| Two-lesson completion / second badge / certificate PDF | PENDING: cannot count as passed while lesson 2 Judge has no confirmed grade |

Badge record `531b948f-9c60-4571-971f-631cf7a9a9d2`. PDF, render and extracted text are stored under `apps/promptify-intrepid/outputs/staging-release-2026-10-19-access-e2e/`. Read-only course state is recorded there; `course-after-lesson-one.json` preserves the before-final-lesson award gate.

## Defects found and changes

1. Lesson selection was absent from the URL, so refreshing lesson 2 selected lesson 1. Persist/restore `lessonId` during selection, auth initialization and browser navigation.
2. Retry AI Judge depended on transient UI error state and disappeared after reload. Show the existing authorized Judge action for a saved ungraded attempt, keep generation/Judge busy locks and server claim protections.
3. `Promise.all` could reject on a definite worker error before sibling provider outcomes were known. Settle all workers and prioritize uncertain outcomes before permitting existing claim-release handling. No automatic provider retries or score fallback.
4. Add sanitized failure-stage timing/status logs. No prompt, output, reference text, exception message, token or secret is logged. The cause of the first two provider timeouts is not established by the concurrency fix.

Validation: 42/42 offline allowlisted tests PASS; typecheck, lint, boundaries, staging build PASS. Existing type-only Workspace cycle and chunk-size warnings remain. Initial full-suite failures were test harness/old recovery expectations and were corrected. Local smoke initially could not reach localhost in sandbox; rerun with local network access PASS.

Governance/deployment evidence for these changes is under `apps/promptify-intrepid/outputs/staging-release-2026-10-19-course-completion/`. Before inventory captured 29 GCP query groups plus Hosting release/config baselines. Runtime model/provider/deadlines, IAM and database settings are not changed.

Staging release: Cloud Build `1890245e-5a9a-4c27-a221-125e93dc2472` SUCCESS; image `sha256:8d319e7703ee5be6284212b142f42e18d3d1118c69b48500bf65775b0a7e9f52`; API revision `promptify-intrepid-api-course-1019` at 100% staging traffic after candidate 5/5 checks. Hosting version `c159d76ddaf40be0`, served assets/API checks 23/23 PASS. Prior API revision `promptify-intrepid-api-scope-1019` remains available for rollback.

Post-deploy browser verification: direct lesson-2 URL and reload preserve ticket 43; Retry AI Judge remains visible. Retrying the existing uncertain V2 is denied409 by the server without another provider call, preserving the claim. New independent V3 also timed out: supervisor succeeded8,739ms; actionability2,099ms, groundedness4,041ms and format12,863ms succeeded; persona41,263ms and oneshot41,265ms timed out504 within the remaining shared deadline. Total Judge50,005ms. This localizes the failure to two criterion provider requests, but does not establish why the provider delayed them. It is not evidence of a missing IAM grant, invalid model or a need to change rubric thresholds.

Final read-only state: **4 total saved attempts, 1 graded, 1 completed lesson of2, 1 badge, 0 course certificates, 1 personal template**. All four requests use `gemini-3.8-flash`; three lesson-2 Judge claims remain unfinished. No more provider calls were made after this diagnostic failure. Full-course positive issuance and second badge/certificate PDFs remain blocked. Existing safe failure handling is validated; overall availability is not production-ready.

After inventory also captured 29 query groups. Governance comparison 21/21 PASS: IAM, secret metadata/references, SQL configuration, rules, auth domains and default Hosting releases unchanged. Raw old/new revision spec hashes, calculated in memory including redacted environment values and masking only image, match; only hashes retained.

## Production gates

This run is not a production certification. Resolve/retest Judge timeout recovery and finish actual two-lesson certificate issuance first. Additional signed peer/instructor/head object access tests, SOP upload/index/citation acceptance, AI load/consistency tests, dependency advisory disposition, restore/rollback/monitoring and physical-device acceptance remain in `STAGING_ACCESS_E2E_2026-10-19.md`.
