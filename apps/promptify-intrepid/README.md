# promptify-intrepid

The only supported Promptify application (since 2026-10-22). It contains ProductionApp, WorkspaceV7 and UI00–15. The review prototype is served at /rebuild when VITE_REBUILD_PRODUCTION is false. The runtime is Firebase Hosting/Auth + Cloud Run + Cloud SQL (Postgres 18, pgvector) + GCS + Vertex AI, and only a staging environment exists. Architecture: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). Current state: [docs/01_CURRENT_STATE.md](../../docs/01_CURRENT_STATE.md).

## Run independently

```powershell
cd apps/promptify-intrepid
npm ci
Copy-Item .env.example .env.local
# Set only this app's credentials locally.
npm run dev
```

Dev port: 5174. No root install or other app server/source is required. Do not copy secret .env files into Git or deployment staging.

## Verify and debug

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:boundaries
npm run test:smoke
npm run build:debug
npm run preview -- --host 127.0.0.1
```

Lint enforces architecture/dependencies; this app has no ESLint style suite. Offline tests are an explicit allowlist in tests/offline-tests.json; live tests and SQL are opt-in. Sourcemaps are local debugging artifacts; normal build omits them. Dev/API logs come from this app process; test logs have app-name prefixes. Reproduce an issue by recording this app URL, ui/class/lesson IDs without credentials, local test name and stack trace; start only this dev server.

Inherited warning: Workspace/V7 Props type import cycle. Source contracts and public browser checks pass; authenticated integrations need authorized live testing separately.

## Deploy

Staging only: GCP project ai-transformation-510302, Cloud Build image → Cloud Run promptify-intrepid-api (no-traffic tag, then promote) and Firebase Hosting site ai-transformation-510302-intrepid-staging, with before/after governance capture. See [docs/04_OPERATIONS.md](../../docs/04_OPERATIONS.md). Deploy only with explicit authorization. The Vercel files here (vercel.json, Vercel compat scripts) are legacy and not the current deployment path.

## Maintain

Every module this app needs is owned here. Never import the root, design-drafts or archived code. Cloud SQL migrations live in gcp/sql (never rewrite an applied one). Root supabase/ is provenance history, and tests/fixtures/supabase is immutable offline evidence.

Maintenance tools are in scripts/. Review their source-writing or live effects before running them, and run them from this app directory only. Retired root tools are under the repository's scripts/historical/.
