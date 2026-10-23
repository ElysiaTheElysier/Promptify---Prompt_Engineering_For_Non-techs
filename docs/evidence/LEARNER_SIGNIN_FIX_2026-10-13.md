# Learner sign-in and profile correction — 2026-10-13

Scope: `apps/promptify-intrepid` only. Existing repository separation changes were preserved.

- UI-00 Google entry opens the account chooser directly. Firebase Google provider forces `prompt=select_account`. Enterprise sign-in clears stale public Basic enrollment intent.
- Server authorization checks verified Google identity against the provisioned users roster. This roster is populated by the existing Google Sheet sync; sign-in does not fetch Sheets live or silently enroll unlisted enterprise users.
- Onboarding snapshots return the profile, authorized class metadata and department names, without loading lessons, attempts, SOPs or Hub analytics. After successful profile confirmation the client requests the full snapshot before opening the Hub.
- Department correction options include departments from classes in the learner's existing client scope, independent of individual enrollment. An Other department field handles departments absent from synchronized class metadata.
- The mismatch toggle and correction form sit inside the profile card, directly below the assigned department. The assigned department stays unchanged while the requested department is selected.
- Per user clarification, corrections remain pending for L&D review. The existing correction RPC stores the department and reason; no enrollment or SOP permissions are changed. Retrying the same form reuses its correction request ID.
- Unlisted users can reopen Google account selection or use the existing support contact. Confirmation errors remain on the confirmation screen, with an option to choose another account.

Validation: app typecheck, build, lint, architecture boundaries, all 28 offline tests and local dev/API smoke passed. Cloud migration integration tests exercise unlisted denial, department options outside enrollment, pending correction persistence, idempotent retries, unchanged access and successful confirmation. Browser verification used a fake Tech learner and verified Functions selection, custom department entry, validation errors and card placement.

Existing warnings: Workspace component cycle and large build chunks. Localhost smoke initially hit sandbox EACCES and passed when rerun outside the sandbox. No push, deployment, migration, real account login or live Sheet/cloud update was performed. Google OAuth/provider latency and the duc.vo account require live validation after cloud access is configured.

## Temporary Vercel release — 13 October 2026

At the user's explicit request, deployed the current Intrepid fixes to the existing Vercel project `promptify3/promptify-rebuild`. Its live Root Directory setting remains `.`; the uploaded root contained only the isolated Intrepid staging package, not the repository root or MVP.

The canonical Cloud runtime was preserved. `apps/promptify-intrepid/scripts/prepare_vercel_compat_deploy.mjs` and its `vercel-compat` templates produce the temporary Supabase transport package. Staged source passed typecheck and the offline SDK contract test `tests/verify_vercel_compat.ts`; architecture checks passed with the existing Workspace cycle warning.

- Prior Production / rollback candidate: `dpl_CW8hHcShohYnrpBRFsxuSoGxoBSN`.
- Preview: `dpl_24GmVY3t8LeMtfGwkGsUdYwrzaaC`, READY.
- Production: `dpl_8JXiisT65C7FeVRdE7FEzh7UjvAN`, READY, built with the existing Production environment before promotion.
- Current URL: https://promptify-rebuild.vercel.app
- Unique URL: https://promptify-rebuild-jpqs3hdft-promptify3.vercel.app

CLI inspection of the public URL resolved to the new Production deployment. Browser verification loaded the public landing page and clicking Sign in with Google navigated directly to Google's account chooser with `prompt=select_account` and the existing Supabase callback. Account selection and confirmation were not submitted. Evidence: `apps/promptify-intrepid/outputs/vercel-production-google-picker.png`.

No Git push, database migration, roster mutation, cloud deployment or environment/OAuth configuration change was performed. Real whitelisted/unlisted sessions and the duc.vo department mismatch still require user acceptance testing. Existing build warnings remain; the Vercel install log also reports dependency audit findings, which were not changed as part of this release.

## API startup hotfix — 13 October 2026

User reported a generic server error after Google sign-in. Vercel runtime logs for `dpl_8JXiisT65C7FeVRdE7FEzh7UjvAN` showed `ERR_MODULE_NOT_FOUND` for extensionless `vertexAiService` imported by `productionServerService.js`. The failure occurred before authorization/whitelist handling. The prior tsx test masked native Node ESM resolution and was insufficient.

Added `scripts/bundle_vercel_api.mjs`: the temporary Vercel package bundles internal API modules into four ESM JavaScript entries while leaving npm packages external. Canonical Cloud source remains unchanged. The compatibility test now imports the exact deployable entries with native Node, exercises anonymous rejection, fake verified whitelist/department/correction contracts, and checks all four handler startups. Staged typecheck and native runtime tests passed; app architecture checks passed with the existing cycle warning.

Hotfix Production `dpl_CZ8d8pbsdDtNgG6dDYcNRa49hSeC` is READY and promoted to https://promptify-rebuild.vercel.app. Unique URL: https://promptify-rebuild-9u04lh85m-promptify3.vercel.app. CLI inspection of the public URL resolved to this deployment.

A real browser request to `/api/product` reached the new function. Vercel logs filtered to status 405 returned this GET request, confirming that the handler started and rejected the unsupported method as designed. Status-500 log filtering found no entries on the new deployment at verification time. The browser itself blocked displaying the JSON error page. The user's external browser/session is unavailable to this chat, so authenticated live UI-02 retry remains the user acceptance step; no account or profile confirmation was submitted by the agent.

## Self-service auto approval — 13 October 2026

The user explicitly superseded the previous pending-approval policy and approved immediate department access with an L&D review log. New submissions use `product_auto_correct_department` from migration 050, added without rewriting applied migration history. The function verifies a provisioned identity and authorized source class, limits target selection to the same client, atomically records old/new department and reason, switches learner enrollment, confirms the profile and returns the target class. Existing requests remain historical. Retries are idempotent even after old active access is removed. Instructor/head privileges are not self-granted; the learner path and an admin's already authorized workspace selection are supported.

An existing active target workspace is preferred, with the same course preferred where possible. For a self-entered name without an active workspace, a class is created in the same client using the existing course; private SOP documents/bindings are not cloned. Previous attempts and completed learning history remain in their original classes. The Sheet is not edited. Snapshot selection prefers the latest authorized auto-approved workspace, preventing the old roster class from becoming the default again.

UI-02 now states auto approval in Vietnamese and English and opens the returned class after successful save. Admin UI-14 includes the latest 100 correction records with learner, old/new department, reason and time. No email or external notification is sent.

Validation: 28/28 offline tests; native Node imports of the four exact bundled Vercel APIs plus fake-SDK correction/log contracts; staged typecheck; architecture/boundary checks; build and local smoke passed. PostgreSQL integration tests exercise access changes, idempotency, invalid/unauthorized rollback, persistence and custom workspace scope. Migration 050 was applied to the existing Supabase project after explicit user approval. A live rollback transaction with fake users/classes passed target access, old access removal, logging, idempotency and custom workspace creation checks; all test rows rolled back. The learner-code sequence can advance during this transaction; no real learner was transferred.

Production `dpl_3gpQNPkxQbzKHFNSjNTUL5uQ9Wdg` is READY and the existing URL https://promptify-rebuild.vercel.app resolves to it. Unique URL: https://promptify-rebuild-m8qzzasgs-promptify3.vercel.app. The canonical Cloud source remains separate; its additional schema migration is `apps/promptify-intrepid/gcp/sql/005_department_correction_auto_approval.sql`. No Git push, Google Sheet edit or Google Cloud deployment occurred.

Browser layout/copy verification used the fake Tech learner and selected Functions: `apps/promptify-intrepid/outputs/department-auto-approval.png`. Real account UI acceptance remains with the user; older open tabs should reload before submitting a new correction.
