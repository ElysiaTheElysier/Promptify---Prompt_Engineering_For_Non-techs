# Rebuild delivery status — 2026-10-08

The requested deliverable is all16 revised UIs with real backend behavior. It is not complete. Rendered prototypes and offline tests are not acceptance evidence.

## Working code added on rebuild

- UI01: native React sign-in dialog, EN/VI wording, existing green logo, real Google OAuth. Local rebuild-only password login uses normal Supabase sessions.
- UI02: profile read/confirmation RPCs derived from auth.uid; name confirmation, read-only identity/role/assigned department. Schema020 activates the confirmation step.
- UI03: session profile-resolution failure screen with retry/logout. This is not yet a domain-whitelist implementation.
- UI04: current class cards with revised wording and a filter based on real enrollment state, plus visible class-opening errors.
- UI05/07: server-sourced lesson snapshot and persisted attempts/evaluation from the initial rebuild commit. Schema021 adds a single Judge claim per attempt. Pending/uncertain claims deliberately do not expire into automatic repeated AI calls; operator review is required.
- UI09/10: current class detail with persisted attempt inspection and targeted hints. Polling/manual refresh; no live typing or group broadcast yet.
- UI12: assigned-class analytics RPC and React panel: enrollment, saved/evaluated attempts, average numerical Judge score and learner rows. No invented pre/post gain, ROI or Head department permissions.

## Remaining scope

### Workshop/roster/SOP continuation

SQL020–021 execution is confirmed by the user's success screenshot. The user also confirmed successful execution of022–025. Database role and concurrency tests remain unverified. Migrations022–025 add:

- Class broadcast with durable message receipts, assigned editor authorization, and retry request keys. Learner delivery currently polls every10 seconds, rather than a realtime subscription.
- CSV roster preview/validation and atomic imports of up to500 rows. Imports preserve existing identity roles and inactive enrollments, create public learner profiles, and do not create Auth passwords or send invitations. Department comes from the selected class; current import format is Email,FullName only.
- Immutable text SOP versions and class/lesson bindings. Learners see only versions bound to published lessons/modules. Generation and Judge use the server snapshot of those bound sources. PDF/Drive ingestion is not implemented.
- Append-only trainer notes and manual clearance records, with request-key retry protection. Clearance is separate from AI scores and does not change automated completion.

Native React panels are mounted in class detail and learner workspace. No claim is made that the full16 revised visual layouts are ported. SQL022–025 execution is user-confirmed, rather than independently verified. Backend generation requires024 and fails closed if source lookup is unavailable. SOP publishing does not yet support request-key recovery after an uncertain network outcome; inspect version history before resubmission.

Migration026 and client subscriptions add Postgres INSERT notifications for durable class broadcasts and private trainer hints. Notifications trigger authoritative reloads, reconnect triggers a catch-up read, and10-second polling remains for reconciliation. Table grants/RLS protect message content; this is not a public client Broadcast channel.026 is not yet applied. Prepared SQL: `outputs/rebuild-setup/06_enable_message_realtime.sql`. A rollback-only scope smoke script is at `outputs/rebuild-setup/07_verify_workshop_scope.sql`; it is prepared, not executed. Actual two-browser delivery/revocation tests are still required. Reference: https://supabase.com/docs/guides/realtime/postgres-changes

| UI | Work remaining before full acceptance |
|---|---|
|00|Port revised mockup wording/functions to public portal; approved plans/onboarding backend|
|01|Resolve staging auth failure; configure production Google OAuth; verify expiry/return routing|
|02|Apply020; validate identity/confirmation with actual accounts and negative cases|
|03|Server-authoritative domain/roster access guard and support workflow|
|04|Port remaining revised learning-hub layout, metrics and SOP drawer with real data|
|05|Port revised workspace interaction hierarchy; SOP bindings, prompt-assist accept/dismiss, citations|
|06|Port revised semantic line diff, version restore and synced scrolling using actual attempt history|
|07|Verify Judge claims/timeout handling on DB; revised scorecard and canonical rubric contract|
|08|Versioned SOP search/citations and department permissions|
|09|Revised Command Center; private realtime, session lifecycle, learner typing consent and broadcast|
|10|Attempt timeline, trainer notes, manual clearance audit and authorization|
|11|Revised curriculum studio, metadata/cohort scheduling, SOP mapping and rubric validation|
|12|Head/L&D authorization, approved pre/post methodology, exports and acceptance tests|
|13|Private SOP upload/ingestion/Drive import, version and confidentiality governance|
|14|Admin credentials/routing/domain controls, budgets and audit; no browser secrets|
|15|Roster schema/mapping/import, validation, sync jobs and event logs|

## Verification and rollout

Build and offline progress/run/CSV validation tests pass. Judge tests assert a busy/complete claim does not invoke the provider again. SQL020/021 execution is confirmed by the user's screenshot, but live authorization/concurrency behavior remains unverified. Supabase dashboard automation remains blocked by browser permissions; no alternate network/API route was used to bypass it. The build still reports a JavaScript bundle larger than500KB.

For the existing staging project ONLY, run `outputs/rebuild-setup/04_upgrade_profiles_and_judge.sql` after019. Do not rerun the empty-database bundle. Keep code and schema rollout coordinated: Judge now needs021. Configure AI credentials server-side only after staging auth works; do not publish secrets as VITE variables.

Evidence still required: learner/trainer/outsider real-session tests, scope isolation, live AI with approved quota, DB concurrency/failure tests, responsive visual review against revised16 UIs, deployment settings/observability and rollback rehearsal. No push or deployment performed.
