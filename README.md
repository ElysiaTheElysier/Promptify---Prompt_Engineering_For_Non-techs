# Promptify Intrepid

Internal prompt-engineering training platform for non-technical Intrepid staff. Learners practise prompts against their department's approved SOPs, Gemini generates an answer, and an automatic AI Judge scores it against a five-criterion rubric.

**Only supported application:** [`apps/promptify-intrepid`](apps/promptify-intrepid/README.md). The legacy MVP was retired on 2026-10-22 ([details](docs/archive/legacy-mvp/README.md)).

## Stack (staging)

React 19 + Vite + Tailwind front end on Firebase Hosting. Node 24 API on Cloud Run. Firebase Auth (Google). Cloud SQL PostgreSQL 18 with RLS and pgvector. GCS for private SOP originals. Firestore for change notices only. Vertex AI `gemini-3.8-flash` for generation and Judge. Google Sheets/Drive read-only for roster and SOP sources.

Only a staging environment exists (GCP project `ai-transformation-510302`). See [docs/01_CURRENT_STATE.md](docs/01_CURRENT_STATE.md).

## Architecture and system flows

Start at [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system diagram, Run/Judge flow, module and data boundaries, deployment-evidence matrix and architecture change log. It is the canonical architecture tracker; local candidates are distinguished from dated staging evidence. See the [system audit roadmap](docs/audits/REMEDIATION_ROADMAP.md) for known risks and acceptance gates.

## Run and verify

```powershell
cd apps/promptify-intrepid
npm ci
npm run dev        # http://localhost:5174
npm run lint; npm run typecheck; npm run test:boundaries; npm run build; npm run test:smoke; npm test
```

The root `npm run <task>` (`dev`, `build`, `test`, `typecheck`, `lint`, `check:architecture`, `test:boundaries`, `test:smoke`, `audit:unused`) forwards to the app. The root has no dependencies. Root deployment is blocked on purpose (`vercel.json` → `scripts/refuse_root_deploy.mjs`).

`npm test` runs only the offline allowlist. Live tests, staging scripts, migrations and deploy scripts can cost money or change cloud data, so run them only with explicit authorization ([docs/04_OPERATIONS.md](docs/04_OPERATIONS.md)).

## Repository layout

| Path | Contents |
| --- | --- |
| `apps/promptify-intrepid/` | The application: `src/`, `api/`, `gcp/` (Cloud SQL migrations, Docker/Cloud Build, templates), `scripts/`, `tests/` |
| `supabase/` | Original schema/migration history (provenance for `gcp/sql/001_baseline.sql`; read by an offline test). Not applied to Cloud SQL |
| `design-drafts/` | UI mockups/prototypes; `pre-separation/` is a verbatim source archive. Not an import target |
| `scripts/` | Repository tooling (schema docs, UI review, progress tracker); `historical/` holds retired tools |
| `docs/` | Documentation. Start at [docs/README.md](docs/README.md) |

Read [AGENTS.md](AGENTS.md) before changing anything.
