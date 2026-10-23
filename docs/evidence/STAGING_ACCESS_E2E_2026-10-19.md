# Staging access isolation and course acceptance — 2026-10-19

**Current result:** [Judge recovery and completed course](STAGING_JUDGE_RECOVERY_2026-10-19.md) supersedes the earlier blockers: both lessons passed10/10, two badges and one certificate issued and PDFs verified. Current staging API `promptify-intrepid-api-jb-1019`; IAM/production unchanged. Broader production gates remain open.

**Latest continuation:** learner sign-in is resolved. See [two-lesson live acceptance](STAGING_COURSE_COMPLETION_2026-10-19.md): lesson1 passed10/10 and badge PDF verified, lesson2 responses persist but Judge times out, so overall course completion/certificate remains blocked. API now `promptify-intrepid-api-course-1019`, Hosting `c159d76ddaf40be0`. The account sign-in blocker and deployment IDs below describe the earlier checkpoint.

## Result

Access isolation checks passed at the tested SQL/unauthenticated-HTTP layers. Two SOP submission scope defects were fixed, regression-tested and deployed to staging. **A complete authenticated two-lesson course run is still blocked by learner Google sign-in; it is not marked passed. Production readiness is not certified.**

## Scope and evidence

Project `ai-transformation-510302`, SQL `promptify-staging`, API `promptify-intrepid-api`, Hosting site `ai-transformation-510302-intrepid-staging`. No IAM changes, production operations, SQL migrations, auth-provider reconfiguration, worker or Scheduler activation.

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-19-access-e2e/` (before/after config, live probes, fixture definition/current state, candidate/deployed checks, package audit, image/source hashes and integrity archive). Secrets, Google/Firebase tokens and passwords are not retained.

### Live tests

| Layer | Result | What it proves / limitation |
|---|---|---|
| Real staging PostgreSQL |18/18 PASS|Used the existing demo learner's mapped subject with `authenticated` role. Own enrolled class/progress readable; un-enrolled shadow class hidden; no manage rights; peer attempts/progress hidden; direct attempt writes and server-only tables forbidden. This isolates database policy from Firebase verification.|
| SQL test data cleanup |PASS|Synthetic peer/profile/enrollment/progress/ungraded isolation attempt created inside one transaction, rolled back; explicit checks confirm no peer or attempt remains. No made-up AI scores/awards.|
| Live HTTP authentication |9/9 PASS|Missing bearer, invalid bearer, unsigned fake-admin claims and protected mutation/read actions return401. This does not prove signed peer/instructor/head object-level access.|
| Candidate revision |5/5 PASS|Health/ready, unauthenticated denial, browser cross-origin preflights rejected without ACAO under unchanged same-origin baseline.|
| Promoted API |3/3 PASS|Health/ready and invalid manager bearer denied after promotion. No5xx observed in captured new-revision request log query.|
| Existing Hosting |23/23 PASS|Served assets/routes remain the expected UI bundle; unauthenticated API routes deny access.|

Early probe instrumentation had a text/UUID parameter conflict; it was corrected. A second expected-zero update check instead encountered the stricter live SQL privilege denial; the probe now records that as direct-write denial. Each failed setup rolled back. Initial CORS expectations assumed a configured allowlist, but baseline has no `CORS_ORIGINS`: same-origin Hosting is supported and cross-origin preflights fail405 without ACAO. Expectations were corrected and initial evidence retained; no CORS configuration was changed.

## Bugs fixed

1. **Cross-class SOP request replay:** reusing the same `requestId` for the same actor/shared course lesson in another accessible class could return the original class contribution ID. It did not expose another owner's document in the reviewed path. Replay now compares `class_id` and returns409 for a different class.
2. **Unavailable-lesson submission:** learner SOP submission checked published status but did not apply the same effective schedule/tier/archive admission as lesson snapshots. New learner submissions now require the target lesson to appear in the authorized snapshot before ingestion; managers retain existing course scope.

Changed runtime file: `src/services/productionServerService.ts`. New `tests/verify_sop_submission_scope.ts` covers same-class retries, cross-class conflict, paid/scheduled/archived rejection before ingestion and unchanged contribution count. Full offline allowlist **41/41 PASS**; typecheck/lint/boundaries/build/smoke PASS. Existing type-only cycle and large-bundle warnings remain.

## Deployment

Cloud Build `4f43bdb7-320a-4064-bee7-aa3e540cd718` SUCCESS.
Image digest `sha256:088c45086d0b2a88c93d94bb78da6f21d0b41ff8ee8b5eb91f2723670316bfe3`.
Candidate tested at0%traffic, then promoted: **`promptify-intrepid-api-scope-1019`,100%staging traffic**. Previous `promptify-intrepid-api-g38p-1019` remains available for rollback.
Hosting version remains **4bc15e437b66202a**; no frontend deployment was necessary.

Governance **21/21 PASS**: IAM/rules/secret references/SQL settings/auth domains/default Hosting unchanged; expected staging revision checked. Before and after inventory each captured29querygroups. Additional canonical hashes of full old/new revision specs (including unredacted env values kept only in memory) match after replacing only container image, proving model/provider/service account/resources and other runtime settings are unchanged. Google/Firebase secrets are not exported. Gemini3.8Flash supervisor/parallel criteria pipeline unchanged.

## New course and authentication blocker

Fresh class: `4a5a763a-b1b5-4676-88ca-81f4805fb321`.
Title: **Staging acceptance — fictional delivery operations**.
Two lessons, approved fictional SOP context, published rubric/pass8, badge rules and course certificate requiring both passes and average>=8. Only final lesson configuration requests the course certificate. Existing demo learner enrolled; no user roles changed. Shadow class `b26b1ee6-3932-4c13-bc3d-bfe0515408dc` has no demo enrollment for negative tests.

[Open new course](https://ai-transformation-510302-intrepid-staging.web.app/?ui=04&classId=4a5a763a-b1b5-4676-88ca-81f4805fb321).

Latest read-only verification: **0attempts,0grades,0awards,0library entries**. Never treat fixture preparation as course completion.

Computer-use works again in the in-app browser. The existing admin session was verified as duonglh.work@gmail.com, then signed out to test learner. Google sign-in for demo.biz stayed at “Verifying OAuth Token” with no exposed popup. User was asked to complete actual app sign-in in Chrome; response pending. One attempt to exchange the already-authorized Google Cloud session via the [official Firebase identity-provider API](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithIdp) correctly failed because its OAuth audience belongs to another client/project. No auth configuration or audience allowlist was changed, no custom Firebase token was minted and no browser credentials were extracted.

Next steps after real app sign-in:

1. Verify learner cannot access Studio/governance; verify shadow class URL is denied. Signed HTTP object-ID matrix for another learner and assigned instructor/head still needs suitable real staging sessions; SQL and offline tests are not substitutes.
2. Run each fictional lesson through actual generation→automatic Judge; verify real persisted Gemini model, score/evidence, history, personal Save/Compare.
3. Confirm no certificate before both passes; if a real score is below8, improve only the learner prompt according to the task. Do not lower thresholds, replace scores or clear uncertain judge claims.
4. After both passes, verify expected badge(s) and one course certificate, preview and PDF. Read state with `scripts/verify_staging_acceptance_course.ts --staging-readonly`; do not rerun the guarded seed script.

## Still required before production

- Complete the new-course authenticated path and signed cross-user/cross-role object-ID tests; at present these are blocked by app authentication, not missing Vertex configuration.
- SOP file upload→approval→index/search→authorized citation acceptance, including private/pending source exclusion, needs live integration testing beyond this submission-scope fix.
- Real concurrency and repeated AI latency/score-consistency/failure recovery measurements; no new real AI calls occurred in this round.
- Runtime package audit found one moderate advisory affecting `sprintf-js` via `argparse`/`mammoth` (3affected package entries, no high/critical). Current web extraction invokes `mammoth.extractRawText`; argparse appears in Mammoth's CLI path, not its library path. Dedicated remediation/reachability decision and DOCX regression are still needed; do not blindly apply the audit's suggested Mammoth downgrade.
- Restore/rollback rehearsal, monitoring/alerts/cost limits, remaining external integrations, physical Safari/iPhone/Android acceptance and read-only review of the eventual production configuration remain gates. No permission to modify production is implied.
