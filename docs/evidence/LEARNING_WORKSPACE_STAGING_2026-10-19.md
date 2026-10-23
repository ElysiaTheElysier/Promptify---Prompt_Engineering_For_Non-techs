# Learning workspace staging — 2026-10-19

## Delivered

Target: `apps/promptify-intrepid` only. Existing logo, emerald theme, Inter and monospace editor retained. MVP and database history untouched.

- Desktop at 1024–1440 px: exercise left, prompt editor middle, generated response plus AI Judge right.
- Mobile 360/390 px: Exercise / Prompt / Results tabs, keyboard navigation, one panel visible at a time. Run opens Results and scrolls to its navigation.
- Every Run sends generation once, displays the server-saved output, then grades the exact new attempt ID. A single write lock spans both requests. No effect silently grades historical attempts.
- Grade failure retains generated output; retry grades the saved attempt without regenerating. No score invention, model substitution or rubric changes.
- One Save to library action in the editor. Help explains automatic draft saving versus reusable template saving. Prompt library opens in a closable dialog; no permanent library below the exercise.
- Compare attempts is a secondary button, not an oversized Single/Compare switch. SOP, hints, theory, resources, solution unlock, scaffold help, variables, history and export remain accessible.
- Advanced model/settings/context uploads are collapsed. Judge gives score and next hint directly, with detailed rubric available on request.
- Removed class code and lesson key from workspace heading; authored fictional content is preserved.

Open-source references consulted as design patterns, with no external code/dependency copied: [Langflow Playground](https://docs.langflow.org/concepts-playground), [Microsoft Promptflow](https://github.com/microsoft/promptflow). Skill used: `.agents/skills/ui-ux-pro-max/SKILL.md` (responsive layout, touch targets, progressive disclosure).

## Validation

- Typecheck, architecture lint and boundary checks pass. Existing type-only workspace cycle warning remains.
- 40/40 explicit offline tests pass, including automatic judge sequencing/exact saved attempt/failure preservation. Updated UI regression opens Library dialog before testing template isolation.
- Staging-mode build passes; existing large bundle warnings remain.
- Local dev/API smoke passes: entry/assets load, unauthorized requests rejected; no provider or DB calls.
- Headless Edge with real React components and local fictional adapter: 1440/1280/1024/390/360 px, no page horizontal overflow. Desktop three-column geometry, mobile tabs, exactly one generation and judge request per Run, saved output retained on simulated grading failure.
- Additional 1440/360 px checks: Save, Library dialog open/close, Compare open/close pass.
- Local adapter checks are not authenticated staging acceptance.

## Real staging grading evidence

Read-only SQL check of the two explicitly approved fictional classes found actual old-class V3 saved on 2026-10-19: model `gemini-3.8-flash`, generation 4594 ms, grade **5.95/10**, supervisor/parallel grading 5614 ms. Claim completed successfully. Old V1/V2 are synthetic fixtures and not actual AI grade evidence. New isolated course still had no attempts at this check. The earlier reported Submit grade error could not be reproduced from this completed record; no pending claim was cleared.

## Release and governance

Firebase Hosting staging version: `dbb9859591044d3b`.
Site: `ai-transformation-510302-intrepid-staging`.
Project: `ai-transformation-510302`.
Only Hosting was deployed. Existing API revision `promptify-intrepid-api-g38p-1019` and Gemini/parallel configuration are unchanged. No IAM, SQL schema/data, Firestore rules, CORS, secret versions, worker/Scheduler activation or production release was performed in this UI change.

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-19-workspace/`: before/after GCP+Hosting, comparison, deploy JSON, HTTP/asset hashes, local UI screenshots/checks, scoped read-only grade metadata. No secret payloads, auth tokens, learner prompt/output text are exported in cloud inventory or grade evidence. UI captures contain only local fictional fixtures.

Post-deploy governance and HTTP results are recorded in `comparison.json` / `hosting-live-http-checks.json`; see handoff for final status.

## Remaining acceptance

Browser computer-use is unavailable. Public bundle/route checks and local UI automation do not prove authenticated post-deploy Run→automatic Judge in the user's Chrome. Next acceptance: demo.biz opens the new course, hard refresh, Run once; verify saved output/grade/history, then badge eligibility only if real score meets rule. Never manufacture a passing score or clear uncertain claims blindly. Broader latency consistency and SOP upload/vector indexing remain separate gates before any production-complete claim.

Final post-deploy result: **21/21 governance comparisons PASS**, including byte-for-byte Cloud Run service unchanged and unchanged default Hosting release list. **23/23 live HTTP/asset checks PASS**: all served JS/CSS match the checked staging build, learner/Hub/Studio routes load, unauthenticated API requests return401. Fresh Edge public staging checks at1440/360 show Google sign-in, no JavaScript errors and no horizontal overflow. Authenticated auto-judge acceptance in user Chrome remains pending.
