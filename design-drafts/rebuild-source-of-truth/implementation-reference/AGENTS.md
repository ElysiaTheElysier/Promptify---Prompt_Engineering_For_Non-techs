# Working in Promptify

## Repository and baseline
- Canonical remote: https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs.git
- Read `docs/REPOSITORY_GUIDE.md` before reorganizing files.
- Inspect `git status` before editing. Preserve pre-existing changes and untracked source artifacts.
- Fetch before comparing main. A successful Vercel commit status does not prove the current Production alias points to that commit.

## File placement
- Runtime code belongs in `src/`; Vercel entry points belong in `api/`.
- Keep shared UI in `src/components/common/` and feature UI in its existing feature directory.
- Domain and integration logic belongs in `src/services/`; shared types in `src/types/`.
- Current product documents belong in `docs/`; superseded documents belong in `docs/archive/` with links updated.
- Keep prototype source in `design-drafts/`; put disposable render output in ignored `outputs/` or `tmp/`.
- Reusable generators belong in `scripts/`. Do not discard scripts merely because they currently live in `tmp/`.
- Do not delete code based only on filenames or lack of a direct import: inspect entry points, scripts, dynamic usage and historical purpose.

## Data and validation
- Preserve Supabase migration history and rollback scripts. Do not rewrite applied migrations as cleanup.
- `src/data/curriculumSeed.ts` is generated. Edit curriculum sources and use the existing generator when requested; review generated SQL before applying it.
- For runtime changes run `npm run build` and relevant existing tests. Live AI/DB tests can consume credits or mutate data; inspect them before running.
- Do not apply migrations, regenerate production data, push or deploy as part of a file cleanup unless requested.
- Report what was moved/deleted, checks performed, and any unresolved failures. Keep cleanup separate from behavior changes.
