# Staging Judge recovery and completed course — 2026-10-19

## Result

**The signed learner completed both fictional lessons. Both best scores are10/10; exactly two badges and one course certificate exist. The new badge and certificate preview/download PDFs passed.** No manual scores, threshold changes, IAM changes, migrations, production operations or user-role changes were made.

Class `4a5a763a-b1b5-4676-88ca-81f4805fb321`, learner `demo.biz@intrepid.asia`. Browser actions used the actual learner session. No Firebase custom token, browser credential extraction or auth bypass. Theme/UI assets and model `gemini-3.8-flash` unchanged.

## What changed

The original all-or-nothing Judge waited up to the shared50s deadline for any straggling provider request, then discarded the incomplete evaluation. A three-worker experiment did not resolve this: the slow criterion varied, and queuing consumed the last criterion's recovery window. That experiment was not promoted.

The final code keeps supervisor→five parallel criterion workers, the existing canonical rubric/anchors, bilingual feedback, exact frozen generation evidence and shared50s deadline. Each pure, tool-free Judge inference has a12s first window and at most one24s recovery window, capped by the remaining shared deadline. Generation requests still have no automatic uncertain-outcome retry.

Recovery runs inside the same application Judge claim with identical evidence. It never releases/replaces an old uncertain claim, edits an existing score, substitutes a partial rubric or switches model. No retry is triggered by malformed JSON, wrong model/key/score or other definite failures. If the complete aggregate still fails after any timeout, the result remains504/uncertain and no grade is saved. Concurrent workers settle before the application returns. Metadata records per-stage attempts, provider-attempt counts and timed-out-attempt counts.

`productionAiService.ts` now respects each stage's window within the existing deadline and treats response-body abort/timeout as uncertain504 rather than invalid-response502. Only these two backend runtime files changed: `parallelJudgeService.ts` and `productionAiService.ts`.

This recovery can incur a second inference charge for a timed-out request whose remote outcome is unknown. There are at most12 logical provider attempts per complete supervisor+five-criteria pipeline; known usage from successful responses is not a complete billing record for aborted calls. The application score is committed once through the existing claim/RPC protections.

Google documents `low`, `medium`, `high` for Gemini3.8Flash; `LOW` was retained rather than substituting an unsupported minimal mode. [Google thinking-level documentation](https://ai.google.dev/gemini-api/docs/thinking?hl=en).

## Actual app acceptance

After candidate checks and staging promotion, the existing starter prompt was run once in lesson2. Its contents and the rubric were not changed to obtain a pass.

| Item | Observed result |
|---|---|
| Attempt | lesson2 V4, `83fbb2fc-7e01-49b7-adc8-7423ab1918e8` |
| Generation | Gemini3.8Flash,2,046ms, correct ticket43 Markdown table and approved citation |
| Automatic Judge | Gemini3.8Flash,23,444ms,8 provider attempts including2 recovered timeouts |
| Supervisor |2,089ms,1attempt |
| Persona |2,673ms,1attempt,2/2 |
| Groundedness |2,975ms,1attempt,3/3 |
| Format |3,324ms,1attempt,2/2 |
| Actionability |14,124ms,2attempts,1.5/1.5 |
| One-shot |21,353ms,2attempts,1.5/1.5 |
| Total / persistence |10/10; reload preserves lesson2, prompt, table, citation and grade |
| Course |2/2completed,average10/10,minimum8unchanged |
| Award gate | Earlier lesson1-only state had no certificate; certificate issued only after lesson2 pass |
| Deduplication | After reload and previews: exactly2badges+1certificate, no extra attempts/awards |

Final read-only state:5saved attempts,2complete grades (one per lesson),3older ungraded lesson2 transport failures preserved,3awards,1personal library entry. No old claim was reset. No more AI calls were made after successful app acceptance.

## PDF verification

All files are one page, rendered and visually inspected; recipient Demo, correct fictional course,19/10/2026 and10.00/10. Vietnamese badge title renders correctly.

| Record | PDF | Bytes |
|---|---|---:|
| Badge1 `531b948f-9c60-4571-971f-631cf7a9a9d2` | `badge-lesson-one.pdf` |1,215,974|
| Badge2 `23edde27-8da0-4e89-9db2-3880f291760f` | `badge-lesson-two.pdf` |1,215,976|
| Certificate `1fc8e72e-62cf-4b2c-a16c-286175138d78` | `course-certificate.pdf` |1,216,042|

Certificate title: `Fictional course completion — STAGING ONLY`; issuer: `Promptify synthetic QA`. Certificate evidence records both lesson scores,completed_lessons2,minimum_average_score8 and the fixture's original attendance_required=false. The fixture is self-paced; this is not an attendance-required certificate test.

## Deployment and governance

- Cloud Build final `5425dbce-20b3-4a5a-ac10-f66b1658b0b2` SUCCESS.
- Image `sha256:1463152f62983258efb86e7b10f820ef66f735a47cb23563fbae4e3d203d6958`.
- Backend-only image patch uses verified prior staging digest `sha256:8d319e7703ee5be6284212b142f42e18d3d1118c69b48500bf65775b0a7e9f52`, copies only the two reviewed backend files; dependency lockfile, runtime user, command and UI assets unchanged.
- Candidate `promptify-intrepid-api-jb-1019` tested at0%traffic,5/5PASS, then100%staging. Prior `promptify-intrepid-api-course-1019` remains for rollback.
- Hosting remains `c159d76ddaf40be0`; no Hosting deploy needed.23/23served asset/API checksPASS.
- Before/after inventories each captured29GCP query groups plus Hosting release/config snapshots. Governance21/21PASS; raw revision spec hashes match after masking image only, including actual env values compared only in memory. IAM, SQL, secrets/references, rules, auth configuration, model and default Hosting unchanged.
-43/43offline allowlisted testsPASS; typecheck/lint/boundaries/build/local smokePASS. Existing type-only Workspace cycle and large-chunk warnings remain.

Evidence folder: `apps/promptify-intrepid/outputs/staging-release-2026-10-19-judge-bounded/`; governance archive/SHA256 alongside it. Includes failed experiments, final course state, PDF/text/renders, image/source hashes, inventories and request status/timing logs. Credentials are not retained.

## Limits and remaining production work

The real app run proves recovery of two genuine timed-out calls and completes the requested course flow. Synthetic provider experiments also encountered failures, including a supervisor straggler; this is not evidence of an outage-free provider or a production latency SLO. Exhausted recovery continues to fail closed. Load/consistency testing and provider capacity/latency investigation remain production gates. No missing IAM grant or model configuration was identified, and no extra cloud privileges are needed for this completed acceptance path.

Existing production gates in `STAGING_ACCESS_E2E_2026-10-19.md` remain: broader signed cross-user/role object tests, SOP ingestion/index/citation acceptance, restore/rollback/monitoring/cost controls, dependency-advisory disposition and physical-device testing. Minor existing UI wording counts all3awards as “3badges”; the actual records are2badges+1certificate. That label is not an extra award or issuance defect and was not changed in this backend release.
