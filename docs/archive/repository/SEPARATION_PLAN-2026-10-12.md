# Two-app separation plan — 12/10/2026

User priority: Isolation > Maintainability > Debuggability > Simplicity > Code Reuse. This supersedes the shared-package proposal in audit 09. No shared internal source, cross-app imports, runtime root entry, or automatic deployment.

Baseline: branch `codex/two-app-isolation` created from dirty `rebuild` at d7ac9d1; all pre-existing changes preserved. Working-copy snapshot and hashes are in ignored `outputs/separation-baseline`, without environment files. Supabase migrations/rollback remain untouched at repository root.

## Tasks and verification

1. Audit original imports with Dependency Cruiser, unused candidates with Knip, build and selected offline tests. Record baseline failures, do not repair business logic as part of separation.
2. Create `apps/promptify-mvp` and `apps/promptify-intrepid`, each with its own package/lockfile, source, public assets, API, Vite/TS/Tailwind/Vercel config, tests, scripts and explicit env template.
3. Copy MVP-owned modules and retained MVP historical components; copy Intrepid dependency closure including fallback components. Duplicate all shared source/types internally. Remove only unused import declarations in copied Intrepid shell using TypeScript AST and reference analysis. Preserve original source/prototype in non-runtime design archive before retiring root entries.
4. Give each app one explicit main entry. Keep Intrepid review prototype in its own app folder for `/rebuild` when the production flag is false. Preserve `/production`, `?ui`, endpoint payloads and OAuth behavior. Each app owns matching server endpoints/dev middleware. No changes to DB, API payloads, UI render logic or roles.
5. Place tests per source ownership. Duplicate SQL fixtures for offline tests without changing/applying history. Keep live tests opt-in and excluded from offline runner. Assign generators/operational scripts explicit app working directory and document read-only repo inputs. No generators or live scripts run during separation.
6. Add per-app Dependency Cruiser rules plus supplemental AST/config/file-reference boundary checks. Include static/dynamic imports, package/alias targets and runtime file references. Add negative guard tests and root CI invoking both apps independently.
7. Install each app independently; typecheck, build, offline tests, dependency checks, Knip advisory audit, localhost dev/API/preview smoke checks, and inspect output and remaining imports. Keep pass/fail/not-verified distinct. Review change inventory/hash mapping.
8. Update root/app README, AGENTS, architecture/audit/report. Local source maps and debugging instructions. Vercel Root Directory changes remain instructions, not live changes.

## Old-to-new mapping

| Original | New ownership |
| --- | --- |
| src/App, non-rebuild MVP components/data/services | apps/promptify-mvp/src (relative structure retained) |
| src/components/rebuild + its dependencies | apps/promptify-intrepid/src (relative structure retained) |
| shared UI/auth/i18n/diff/AI/server/types | independent copies in both apps, no package references |
| api/generate, api/evaluate | MVP entries; duplicated in Intrepid for endpoint compatibility |
| api/product, api/roster-worker | Intrepid only |
| public/brand | duplicated in each app |
| public/fonts | Intrepid and any retained test consumer only |
| root src/api/public/test and build config | preserved under design-drafts/pre-separation; root runtime retired after app verification |
| supabase history | retained root, read-only fixtures inside each app for tests |
| app-specific script | app scripts; root launchers select explicit app cwd where necessary |
| documentation/design/generator inputs | retained root; no runtime imports from them |

Rollback: use exact manifest plus preserved source archive/snapshot to restore only files changed by separation; do not reset/clean/stash dirty work. No commit/push/deploy or migration is part of this plan. A Git branch alone does not capture untracked files, which is why the working-copy snapshot is required.

## Tool selection

- Dependency Cruiser 18.6.0: before/after graphs, circular dependencies and permanent import rules; pinned dev tooling.
- Knip 6.41.0: before/after advisory unused file/dependency/export audit. No automatic deletions.
- Existing TypeScript compiler API: AST import removal and supplementary boundary checks; no extra codemod dependency needed, preserve source formatting.
- Superpowers skills requested are not installed in the available local skill catalog. Apply equivalent planning, branch isolation, root-cause analysis, staged execution, verification and review principles; do not claim these skills were invoked. No global skill installation needed for this implementation.
- ESLint Boundaries: not selected, repository has no ESLint setup and Dependency Cruiser covers the import rules. Lint is architecture/dependency lint, not an invented style-lint PASS.
- jscodeshift: evaluated, not selected; relative structure is retained and existing TypeScript AST handles the few repeated import edits with dry-run output.
- No Nx, Turborepo, workspace source sharing or new runtime framework.
