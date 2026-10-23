# Repository guide — after two-app separation

Start with [architecture](ARCHITECTURE-two-apps-2026-10-12.md), [separation report](SEPARATION_REPORT-2026-10-12.md), and [AGENTS](../../../AGENTS.md).

Runtime source and Vercel entries now live under each `apps/promptify-*` folder, in `src/` and `api/`. Every app owns its configs, assets, tests, helpers and lockfile. There is no root application entry and no shared internal source package. Existing app-local `components/common` stays local.

MVP: `App → auth/classes → LearnerHome/LearnerDashboard → HybridView`; InstructorViewShell owns the instructor UI. Intrepid: `ProductionApp → ProductionEntry/Hub/WorkspaceV7/UI00–15`; client actions go through its own `/api/product`. Each has its own duplicated persisted AI run/Judge services.

Root `supabase` is immutable migration/rollback history. App `tests/fixtures/supabase` contains offline test copies, not production migration authority. App-local curriculum sources are preserved for existing tests/generators; do not regenerate/apply SQL in cleanup.

Root docs/design sources stay in `docs`/`design-drafts`. `design-drafts/pre-separation` is a verbatim non-runtime source archive. Outputs are ignored, including app outputs. Reusable maintenance scripts are retained with ownership in [script manifest](../../separation/script-ownership.json); originals under `scripts/historical/pre-separation`. Root notices intentionally refuse ambiguous legacy execution rather than silently reading the wrong app.

App commands: `npm ci`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:boundaries`, `npm run test:smoke`. Tests are allowlisted offline; live scripts/SQL are opt-in. Root commands orchestrate both apps and return nonzero if either fails.

Earlier documentation may refer to `src/App.tsx` at repository root or describe a future Intrepid scope. Treat it as time-stamped context; the app folders and current report define source ownership. [Original guide](REPOSITORY_GUIDE-before-separation.md) is preserved for history.
