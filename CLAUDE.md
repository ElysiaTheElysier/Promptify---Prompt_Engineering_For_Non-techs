# CLAUDE.md

Follow @AGENTS.md. It holds the repository rules, invariants and safety constraints.

## Session start
1. `git status`. Large parts of the repo are untracked/uncommitted, so preserve them.
2. Read `docs/README.md`, `docs/01_CURRENT_STATE.md`, `docs/05_OPEN_ISSUES.md` and the newest file in `docs/handoffs/`.
3. Work inside `apps/promptify-intrepid` and run commands from there.

## Quick facts
- Single app: Promptify Intrepid on GCP staging only (`ai-transformation-510302`). No production environment exists yet.
- API: `src/services/cloudRunServer.ts` → `productionServerService.ts` (`POST /api/product {action}`). AI: `productionAiService.ts`, `parallelJudgeService.ts`, `rebuildRunService.ts`.
- Schema: `gcp/sql/001…011`. Known blockers: AI capacity (no global queue), Judge 504 leaves the claim held (409), scheduled roster not live, no alerts.

## Always
- Offline checks only by default: `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test` (56/56 baseline).
- Ask before running anything that calls Gemini/Vertex, Google APIs, Cloud SQL, Firebase or gcloud, or that deploys, migrates, commits or pushes.
- Never change the model (`gemini-3.8-flash`), Judge strategy (`parallel-v1`), scoring contract (`weighted-v1`), thresholds or quotas without explicit approval.
- Label conclusions with their evidence level: CODE / OFFLINE / LIVE / unknown.


## Architecture coordination — 2026-10-23

Read the single shared tracker before editing: `C:/Users/Admin/AppData/Local/Temp/promptify-coordination/TRACKER.md` (outside repository/worktrees). Git metadata is read-only in the current Codex sandbox; checkpoint commits/worktrees are BLOCKED. Scanned text-source snapshots are local under ignored `tmp/architecture-coordination`; do not recreate source from the old HEAD.

Codex owns migrations013/014/015, global provider admission, async Generation/RAG, API/UI worker isolation, metrics and integration. Claude owns Judge/Vertex quality and provider-call reduction. Preserve `productionAiService.ts` integration: `admittedModelRequest` import, AdmissionError503 classification and optional `productionGenerate` deadline. Every actual Gemini call/retry must acquire its own permit; never bypass admission or reserve once for an entire parallel Judge. No model/scoring/identity-quota change.

All new architecture flags defaultOFF; no migration/deployment occurred in this run. Do not infer the live revision from these local files. Deliver a tested Judge diff for integration without changing Codex-owned files or overwriting current uncommitted source. See `docs/DEMO_SCRIPT.md` for the mock evidence limits and `docs/04_OPERATIONS.md` for rollout/rollback gates. Existing session authorization takes precedence over the older ask-before defaults above.
