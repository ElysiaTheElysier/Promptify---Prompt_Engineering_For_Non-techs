# Working in Promptify Intrepid

## Repository and baseline
- Canonical remote: https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs.git
- Single supported app: `apps/promptify-intrepid`. The MVP was retired on 2026-10-22. Do not recreate it or add a second app without an explicit decision.
- Read `docs/README.md`, `docs/01_CURRENT_STATE.md` and the newest file in `docs/handoffs/` before working.
- Inspect `git status` before editing. Much of the repository is still uncommitted or untracked. Preserve pre-existing changes and untracked files. Never use `git clean`, `git reset --hard` or a destructive checkout.
- Fetch before comparing with `main`. A deployment status does not prove which revision serves traffic; read the live service.

## File placement
- Runtime code lives in `apps/promptify-intrepid/src/`. API entry points are in `api/`. Cloud Run, Cloud Build, Firestore and Cloud SQL assets are in `gcp/`. Maintenance tools are in `scripts/`. Tests are in `tests/`. The root has no runtime entry and no dependencies.
- Domain and integration logic goes in `src/services/`; contracts go in `src/types/`. The frontend must not import server modules or keys.
- Do not add root shared packages, aliases, workspace/file dependencies or source symlinks. The app must resolve everything from its own `node_modules`.
- Current documentation goes in `docs/` (canonical `00`–`05`, `ARCHITECTURE.md`). Dated reports go in `docs/evidence/`, plans in `docs/proposals/`, handoffs in `docs/handoffs/`. Superseded material goes in `docs/archive/`, and you must update links. Some dated docs stay at the `docs/` root because app scripts reference those paths (listed in `docs/README.md`); do not move them without updating those scripts.
- Prototype sources stay in `design-drafts/`. Disposable output goes in ignored `outputs/` or `tmp/`. Retired root tools go in `scripts/historical/`.
- Do not delete code based only on filenames, Knip output or a missing direct import. First inspect entry points, scripts, dynamic usage, Docker/Cloud Build contexts and history.

## Invariants (do not change without separate approval)
- Firebase Auth, roles (learner, instructor/trainer, head, admin), class scoping and RLS.
- Generation and Judge use `gemini-3.8-flash` through Vertex AI. Judge strategy is `parallel-v1`. Scoring is the five-criterion `weighted-v1` contract (0–10). Do not change rubrics, thresholds or identity quotas.
- Roster lifecycle and source ownership rules, SOP ingestion/RAG/citations, and immutable GCS originals.
- Staging configuration and resources in GCP project `ai-transformation-510302`.

## Data and validation
- Cloud SQL migrations live in `apps/promptify-intrepid/gcp/sql` (with `rollback/`). Root `supabase/` is provenance history only. Never rewrite an applied migration; add a new numbered file. Applying a migration needs an owner credential supplied at run time.
- Run checks from the app: `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test`. Baseline on 2026-10-22: 56/56 offline tests, 1 known Workspace cycle warning, 1 known chunk-size warning.
- Tests use the explicit offline allowlist (`tests/offline-tests.json`). Never run every test by glob.
- Live tests, `scripts/verify_*_live.ts`, `probe_staging_*`, `staging_capacity_engine.ts`, `deploy_*`/`promote_*`/`build_staging_*` and migration tools can consume AI credits, mutate data or deploy. Read them first and run them only with explicit authorization.
- Dependency Cruiser and the AST boundary checks are mandatory.
- Do not deploy, change IAM, billing, models, the database or cloud resources, or push, unless the user explicitly asks. Deploy only to staging using the governance capture/compare process in `docs/04_OPERATIONS.md`.
- `apps/promptify-intrepid/outputs/` holds sensitive governance evidence (IAM/secret metadata). Never commit or share it. Never print tokens, passwords, signed URLs, `.env*` contents or learner prompt/output.
- Report what was changed, the checks performed, and any unresolved failures. Keep cleanup separate from behavior changes. Distinguish CODE, OFFLINE and LIVE evidence; code existing does not mean a feature works.
