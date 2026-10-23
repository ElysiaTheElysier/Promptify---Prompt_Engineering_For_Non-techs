# Gemini 3.8 Flash and parallel grading — staging 2026-10-19

## Release and configuration

Staging API is now `promptify-intrepid-api-g38p-1019`, receiving 100% of staging API traffic. Frontend Hosting version is `0c0040ef69d2e3ac`. Previous API revision `promptify-intrepid-api-00005-tez` remains available for an explicit staging rollback; production was not deployed or changed.

The original Run prompt 503 had a concrete configuration cause: runtime had the Vertex role but no AI provider/model/location environment settings. Applied only these approved settings, preserving SQL, service identity, CORS, secret references, resource limits and IAM:

| Setting | Applied value |
| --- | --- |
| AI_PROVIDER | vertex |
| GEMINI_MODEL | gemini-3.8-flash |
| VERTEX_LOCATION | global |
| JUDGE_STRATEGY | parallel-v1 |
| GEMINI_FALLBACK_MODEL | absent; no fallback to another model |

Google documents the model ID, global endpoint availability and LOW/MEDIUM/HIGH thinking support: [Gemini 3.8 Flash](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash). No Gemini API key was needed or added. Embedding configuration was not replaced with a text-generation model.

## Grading behavior

1. A supervisor checks task alignment using canonical task, rubric and learner instructions. It cannot change rubric weights or scores. It does not receive generated output that could falsely make an off-task learner prompt look correct.
2. The five active rubric workers execute concurrently using the same pinned model and frozen evidence. They return a bounded criterion score, short English/Vietnamese evidence reasons and an actionable hint.
3. Server code validates every result and sums scores using the saved weights. Scores use the documented 0/25/50/75/100% criterion anchors. Failed or malformed workers produce no partial final score.
4. Feedback is assembled deterministically from the workers, prioritizing the lowest proportional criteria. There is no extra serial feedback model call, no automatic prompt rewrite, and no model authority to raise the aggregate score.

The existing five canonical rubric keys are preserved. Task/constraint requirements are evaluated according to the authored task and rubric; no new unapproved criterion or weight was inserted into the teacher's rubric. Completed grading is replayed from stored evaluation data, not regenerated when the learner reopens history or switches language. One grading attempt uses at most six model requests; the shared grading deadline remains 50 seconds. No infinite agent loop or automatic uncertain-outcome retry was introduced.

## Evidence and latency limits

- Offline suite: **39/39 PASS**. Tests cover actual worker overlap, supervisor gating, invalid/partial-result rejection, evidence injection boundaries, fixed weighted aggregation and bilingual presentation of the same scores.
- Typecheck, lint, boundaries and build: PASS. Existing Workspace cycle and large-bundle warnings remain.
- Local UI browser fixture: 26 captures at mobile/desktop sizes; Save/dirty guard/Compare checks pass. Visible UI-xx labels are removed only from known interface strings; authored SOP/prompt references are retained.
- A direct operator-identity synthetic grading succeeded in about **18.8 seconds**, score 10/10. A subsequent three-repeat batch completed two evaluations before a provider timeout in the third; the batch did not pass as a stability/SLO acceptance test. Do not treat the one-result `scoreSpread: 0` file as statistical consistency proof.
- A temporary Cloud Run job used the **exact release image and runtime service account**, without SQL attachment or database credentials. Initial probe had a 504. Separate diagnostic confirmed runtime metadata authentication and Vertex HTTP200, then the instrumented Generate→Judge recheck passed: **Generate 1,801 ms; Judge 4,745 ms; total score 10**, all five criteria present, all model calls Gemini 3.8 Flash. The job had zero automatic retries and was deleted after collecting evidence.
- Tagged revision smoke: 25/25 checks pass, including SQL readiness and protected APIs. Deployed Hosting smoke: 23/23 checks pass, including exact frontend asset hashes.

The fast runtime sample demonstrates the optimized path, not a guaranteed percentile latency. Intermittent provider timeouts were observed and remain a reliability concern to measure before production signoff. Uncertain outcomes are not silently retried or converted into invented scores.

## Synthetic course and authenticated acceptance

Created exactly one isolated course for the existing demo learner. No user/role changes, prewritten attempts, AI outputs, scores or awards were inserted.

- Course: **Thực hành xử lý yêu cầu giao hàng — dữ liệu mẫu**.
- Class: `56c47e71-ec12-437e-89d2-6862ccb13f8a`; lesson and other IDs are in `course-fixture.json`.
- [Open practice](https://ai-transformation-510302-intrepid-staging.web.app/?ui=05&classId=56c47e71-ec12-437e-89d2-6862ccb13f8a).
- Fictional context, task, example, prompt, saved rubric and real structured badge rule are configured. It uses an authored context reference; this does not prove PDF upload/vector indexing.

At the last recorded database verification, the new class had **0 attempts, 0 scores, 0 awards, 0 library entries**. The user confirmed being signed in as demo.biz on the old lesson and has been asked to run and grade this new lesson. Authenticated end-to-end acceptance is **pending**, not complete. Browser computer-use is unavailable; no browser tokens were extracted or custom login credentials minted to bypass authentication.

After the user's actions, run `scripts/verify_staging_ai_course.ts --staging-readonly` through the existing localhost SQL staging proxy. Verify actual persisted Gemini model, output/grade timing, immutable criteria/score, history and badge evidence. Personal Save/Compare/badge download were verified on prior staging releases, but the full new-course sequence must not be claimed until the new course has actual records.

## Governance and remaining gates

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-19-ai/`.

- Separate before/after GCP and Hosting snapshots for this release, preserving the earlier UI release evidence archive.
- **22/22 governance checks PASS**: IAM, secret metadata/version references, Firestore rules, auth domains, SQL settings/attachment, CORS and all runtime specification outside the exact approved AI env/image changes remain unchanged. Traffic is explicitly checked against the new staging revision. Default Hosting site remains untouched.
- Build IDs, immutable image digest, tagged/deployed HTTP checks, job definitions/executions/logs, direct-provider probe outcomes, UI evidence and scoped course state are retained. Only synthetic probe logs are collected; token/secret payloads are not retained.
- Operator cannot impersonate the runtime service account (`iam.serviceAccounts.getAccessToken` denied). This did **not** require changing IAM: the temporary runtime job tested the real identity instead and passed.

No further generation/Judge credential is known to be missing. Remaining gates are authenticated new-course acceptance, broader latency/failure-rate measurement and separate validation of SOP upload/indexing/other integrations before a production-complete claim. No IAM, production cutover, migration, worker or Scheduler activation was performed.
