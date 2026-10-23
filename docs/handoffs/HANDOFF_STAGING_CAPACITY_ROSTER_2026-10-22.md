# Staging capacity and roster handoff — 2026-10-22

## Scope and current outcome

Continue the user-authorized staging-only work: assess 100 simultaneous prompt pipelines, enable a scheduled roster sync for two fictional companies, and compare the staging implementation with the Google test log. No production deployment, IAM change, score-rule change, or hosting release was made in this run.

The test reference Google Doc is `Promptify - Test - log`, ID `1_8fj4aaL2SU9hYv18qhzAuXvX7s95ZE6s38oUcfgjk0`. A 24-case implementation/parity review is in `docs/evidence/STAGING_FEATURE_DOC_PARITY_2026-10-22.md` and identifies finished, partial, missing, and changed-stack behavior. The Google Doc itself was read, not edited.

## 100-pipeline result

Two independent 100-pipeline waves were run through the shared production generation/Judge engine in an isolated Cloud Run Job. They were **not** 100 Firebase users, API admissions, or database writes.

- Initial run used a mistaken 256-token generation cap and remains recorded as 61/100 successful, with 39 generation failures (38 HTTP 502, one 504). It did not record provider finish reasons, so truncation is not proven as the cause.
- Corrected run used the app's 4,096-token default and was independently reviewed. It completed 6/100 full task evaluations and 30/500 rubric criteria. Generation returned 98 HTTP 200/STOP and two HTTP 429. Six actual provider 429s occurred across all phases; the circuit halted 88 pipelines before Judge. There were 157 provider requests, seven network/timeout attempts, and 66,967 known tokens; 13 calls lacked usage metadata. Provider capacity remains a release blocker for the requested 100-at-once behavior. Do not run another paid wave or claim 100 capacity without a deployment-wide queue/admission design, provider capacity plan, and agreed completion/queue SLO.

Harness source is `apps/promptify-intrepid/scripts/staging_capacity_engine.ts`, with its offline contract at `apps/promptify-intrepid/tests/verify_staging_capacity_engine.ts`. The 4096 revision was Sol reviewed, built as `sha256:b44eb229cf2cbee2238debc28f5798f32154f495fc7bffe381f6b77b9dd06226`, and used by job `promptify-capacity-staging-1022`, execution `promptify-capacity-staging-1022-wq2n8`. Both batch logs and results are preserved under `apps/promptify-intrepid/outputs/staging-release-2026-10-22-capacity-roster/`.

## Scheduled roster status

The three-file roster OIDC route is Sol reviewed, offline tests pass, and the candidate image is `sha256:dcbce59ce2b0385be404d66cf63b627e96ff39afa5d63c0280d3acab97036ff0`. Candidate revision `promptify-intrepid-api-rs-1022` is tagged `roster-review`, has **0% traffic**, and adds only these reviewed settings: staging flag, exact active-service OIDC audience, existing scheduler service-account email. Negative candidate checks passed: readiness 200, unsigned request 401, wrong method 405, projection route 404, and unauthenticated API request 401. Manual Scheduler identity impersonation was denied to the operator; no IAM was changed.

Two duplicate QA tabs named `ScheduledQA20261022` were created in the existing synthetic Northstar and Juniper Sheets and configured as the respective app workbook source. Each tab starts with the three existing fictional learners and has learner04 copied in from the corresponding synthetic Add tab. Do not alter any other Sheet tabs or rows.

The Cloud Scheduler job `promptify-roster-staging-qa` was created with the existing scheduler service account, OIDC audience fixed to the active API URL, POST `{}` to the zero-traffic candidate route every minute, timezone `Asia/Ho_Chi_Minh`. No natural delivery was observed before handoff: job status remained `code -1`, Cloud Scheduler logs query returned empty, and no candidate authorized request was captured. **The job is now PAUSED.** Both app workbook auto-sync flags remain false. No roster add/omit was imported. The 30 outside connections remain auto-sync off and retain configuration hash `20ef597ceaacd040600602525475856c623b08cd709f234c5d1aa8d236191749`.

Candidate code, deployment evidence, scheduler snapshots, and read-only SQL roster snapshots are stored in the same `outputs/staging-release-2026-10-22-capacity-roster/` folder. `roster-final.json` records the final state. Governance capture was run after the QA setup; the capture/comparison scripts were updated to allowlist and specifically validate only the three roster settings (`scripts/capture_staging_governance.ps1`, `scripts/compare_staging_governance.ps1 -StagingRosterWorker`).

## Checks completed

- Intrepid offline suite: 56/56 pass, live tests excluded by the allowlist.
- Typecheck: pass.
- Architecture boundary tests: pass.
- Build: pass; Vite reports the existing large-chunk warning.
- Smoke: pass, local unauthenticated requests rejected.
- Lint/Dependency Cruiser: no errors; one known circular dependency warning between `ProductionWorkspace.tsx` and `ProductionWorkspaceV7.tsx`.
- Sol independently reviewed the revised harness, first and second batch reconciliation, scheduler plan, and roster worker contract.
- Hosting remains untouched. API active revision remains `promptify-intrepid-api-life-1021` at 100%; candidate `rs-1022` stays at 0%. No IAM changes.

## Next run: exact sequence

1. Start with `git status`; preserve the pre-existing two-app separation changes and untracked sources.
2. Check Cloud Scheduler job state first. Keep paused until the natural Cron OIDC request can be observed safely against the candidate with both source auto-sync flags off. Use logs and candidate response evidence; do not grant `actAs`, token-creator, invoker, or any IAM binding if token creation fails.
3. If natural OIDC is rejected due to token audience/identity behavior, fix candidate configuration/code only after review, rebuild candidate, and repeat negative plus authorized checks. If actual Scheduler cannot mint without IAM, report this as a blocker and leave paused.
4. Only after positive authorized candidate proof and Sol review, promote the roster candidate to staging traffic and update the QA Scheduler URI to the active API URL. Keep only the pinned Northstar/Juniper scope enabled.
5. Read back both `ScheduledQA20261022` tabs and app connections. Through the normal signed admin UI, enable the two fictional connections only. Wait for the natural scheduled import to add learner04 to both; clear only row `I7:M7` in those two QA tabs and wait for natural scheduled omission. Confirm each class returns to three fixture learners and verify no manual grants, history, other class members, or the 30 outside connection configurations changed. Never click `Sync now` for this acceptance.
6. Capture after governance, scheduler/job configuration and delivery logs, API traffic/revision, read-only SQL roster snapshots, and run the Sol review. Then decide whether to keep the two fictional connections enabled for continued staging QA or disable them; document that final choice.
7. Capacity remains a blocker. Design a durable provider-stage queue with deployment-wide concurrency control, bounded backlog/expiry/cancellation, idempotent uncertain-result handling, and clear UI states. Preserve Firebase identity quotas, Gemini 3.8 Flash, rubric thresholds, and the current evaluation contract. Agree the 100-user arrival and completion/queue-wait SLO and confirm provider quota before any new paid measured wave.
8. Update the parity/readiness report from verified evidence. Reference Doc mismatches are catalogued there; do not change the source Doc without a separate request.

## Sensitive evidence handling

The governance evidence folder may include IAM bindings, resource metadata, synthetic fixture identifiers, and API/log details. Keep it local and do not publish/share it. Never include access tokens, passwords, private keys, database connection secrets, raw learner prompt/output, or full signed URLs in the handoff or user-facing report. The local Cloud SQL proxy started for readonly snapshots must be stopped; its process ID was 27136 (`cloud-sql-proxy.x64.exe`).
