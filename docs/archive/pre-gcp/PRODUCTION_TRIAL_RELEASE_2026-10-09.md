# Release update — 2026-10-10

Current production: dpl_DtHtnS3HBwJu9zr2eKGcDLxCuSdz, https://promptify-rebuild-ao9b7gz5e-promptify3.vercel.app; READY and public alias verified on UI14. Added scoped numeric Generate telemetry, UI09 five-second polling and bilingual/profile wording corrections. CLI Vercel is authenticated; MCP OAuth still incomplete. Old Gemini key explicitly not revoked by owner. See current handoff top for tests and outstanding acceptance; no 100% production claim.

---

# Production trial release — 2026-10-09

This records deployed trial behavior and acceptance evidence. It is not a declaration of 100% Word conformity or official Intrepid pilot sign-off.

Latest deployment: dpl_SAPV2zPFkK8EmxjR53tP9GPFFxNb, READY/public alias verified. Browser2/2configured + rotationapplied confirmed afterreload. Handoff stoppedat4%remaining peruser.

## Scope and sources

- Public application: https://promptify-rebuild.vercel.app
- Keep the supplied combined UI; the latest Word remains authoritative. Word SHA256: `666CB5D869ED3AAAF347A5619D1D98A8E36ED650AB07F3AC2F72D5EE25F84E92`.
- Dedicated Supabase: `aixhryqzgpptuhstiflx`; migrations 027–047 applied, history preserved.
- Trial roster explicitly authorized from Sheet `1NUv61Mn5TN8kLWWblGQgLD3pV8gmC7JEDP7Ijs0yLCY`, tab Table. 30 department cohorts, 1242 enrollments, manual connections; no bulk auth accounts or invitations.
- Separate `intrepid-trial-basic` curriculum: five fictional Basic lessons, bilingual source content and an explicit trial banner. It is not approved Intrepid policy or an official certificate.
- Role codes: learner, instructor (Facilitator/Trainer), head, admin. Class grants restrict instructor access; Head reads aggregates without individual attempts.

## Verified behavior

- Gemini rotation request `2b64c32c-51c1-4d5c-87a4-552b9e076e07`: two distinct admin approvals, provider validated, deployment applied; migration 047 atomically stores application state and audit.
- New-key live Generate/Judge EN/VI, run persistence, replay without duplicate attempts, foreign learner denial; new runs capture pass threshold 8. Existing historical QA progress is not retroactively rewritten.
- Workspace score opens baseline UI07; comparison UI06 shows real stored versions. SOP results open the selected UI08 source; private original file download passed through the authenticated browser. Studio copies canonical SOP citation tags, not titles.
- First-time unconfirmed QA Head profile: entered name, clicked Confirm once, reached UI12 after confirmed snapshot. Existing admin one-click production confirmation also passed.
- Head API/browser: assigned class only, no raw attempts; foreign class and class writes rejected.
- Instructor QA: UI09 quick inspector opens full UI10; version V3→V2 changes actual saved prompt/output/feedback. UI11 five authoring tabs render within a 390px viewport; QA save succeeds. Simulated offline save stays in editor and shows an uncertainty error, with no false success.
- Analytics SOP KPI counts published contributions in authorized cohorts, rather than execution attempts. Fixed introductory copy does not claim a 27-department rollout. ROI and hours saved remain unavailable without measured inputs.
- Root HTML is `Cache-Control: no-store, max-age=0`; absent JS returns404 instead of HTML200.
- Build, EN/VI integrity, HTTP authorization, live role/scope/persistence checks passed. Provider fallback, ingestion, worker signature/replay and award PDF checks passed earlier in this work session.

Browser evidence is local and ignored: `outputs/rebuild-audit/studio-browser-checks.json`, `head-scoped-analytics.png`, `studio-offline-save.png`, admin browser smoke and source QA artifacts. QA credentials are isolated in an ignored file: never attach or print it.

## Latest adapter QA

Role-denied known accounts now see the correct EN/VI reason and a role-home button. Governance waits for server data rather than showing false0/2 configuration while loading. Learner hub obeys conditional score labels and actual class counts; UI06/07/08 labels and mobile SOP controls improved. Layout/navigation smoke covered UI09/11/12/14/15 EN/VI at390/1440px; isolated learnerQA covered actual saved comparison/score/source. This does not certify every state on all16screens. Evidence: admin-matrix-current.json, role-view-denied.png, sop-inspector-vi-mobile.png under ignored outputs/rebuild-audit.

## Dependency findings

Current npm audit reports8 findings:5 high in build-time Tailwind/glob dependencies and3 moderate in Mammoth's CLI dependency chain. Production-only audit reports3 moderate, zero high/critical. This is not a zero-finding claim.

Registry verification on09/10: braces3.0.3, sprintf-js1.1.3 and Mammoth1.13.0 are the latest published versions. The offered force fix downgrades Mammoth or migrates Tailwind major versions, so it was not applied blindly. Mammoth runtime ingestion uses `extractRawText` via `lib/index.js`; argparse is imported by `bin/mammoth`, which the API does not invoke. Tailwind content patterns come from checked-in source configuration, not uploaded SOP/prompt input. This is a source reachability assessment, not proof against every future execution path. UUID and selector parser overrides have already remediated separate findings. Recheck advisories before official release.

## Operator runbook

1. Inspect the public alias deployment, not just a Git commit status. Stage using `node scripts/prepare_production_deploy.mjs`; staging deliberately excludes environment secrets.
2. Run `npm run build`, relevant offline tests and isolated live QA. Paid AI switches require deliberate selection; do not rerun them just to repeat evidence.
3. Deploy with `npx vercel deploy --prod --yes --archive=tgz --cwd outputs/rebuild-deploy`. If CLI disconnects, inspect the returned deployment URL and READY/public alias before retrying.
4. Smoke root/cache/assets, authenticated class switching, one learner run/Judge/reload and negative class/role scope. Do not impersonate roster employees or manufacture external Google acceptance.
5. UI/API rollback can point the production alias to a previously verified deployment. Do not restore a pre-rotation secret or bypass the two-admin workflow. Keep database migrations applied; prefer a reviewed forward fix. Database backup/restore rehearsal is a separate operator task and has not been certified here.
6. Google key rotation: create provider key, collect two distinct admin approvals, apply via `scripts/apply_approved_rotation.ts`, confirm applied audit and new-key smoke. The provider owner must then revoke the old key in Google AI Studio. Never paste secret values into chat, Sheet or repository.
7. Sheet trial connections are manual by default. Opt into scheduled sync only when intended; validate mapping and review sync errors first. Do not turn on all30 connections as a test.

## Remaining acceptance items

- Provider owner confirmation that the old Gemini key has been revoked.
- Actual external Google learner/Basic roundtrip and an authorized roster employee's end-to-end trial participation; real Drive folder permissions and opt-in scheduled sync acceptance.
- Complete EN/VI16-screen regression, including remaining mixed prototype copy and independently configured UI/content/AI languages if retained as a separate requirement. Translation dictionaries were expanded; unit tests do not prove complete UI coverage.
- Formal recovery/backup and rollback rehearsal; repeated pilot rehearsal and owner sign-off.
- Official Intrepid release additionally requires approved real SOP/Codelab content and its owner acceptance. Fictional trial content does not meet that separate requirement.

Do not mark these remaining items complete merely because deployment is READY.
