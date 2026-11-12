# CLAUDE.md

Follow @AGENTS.md. It holds the repository rules, invariants and safety constraints.

## Session start
1. `git status` and `git log --oneline -5`. Current branch `test/tm-001-tenant-isolation` is pushed to GitHub and holds the newest code; `main` is old.
2. Current truth, newest first: the top sections of `docs/01_CURRENT_STATE.md` and `docs/05_OPEN_ISSUES.md` ("10/11/2026", then "09/11/2026"), `docs/handoffs/UPDATES_2026-11-09_RAG.md`, decisions D44–D47 in `docs/03_DECISION_LOG.md`. Older sections, `docs/archive/`, `outputs/`, `gcp/Dockerfile.*` overlays and handoffs before 04/11 are history: when they disagree with these, the newer files win.
3. Work inside `apps/promptify-intrepid` and run commands from there.

## Quick facts (09/11/2026)
- Single app: Promptify Intrepid on GCP project `ai-transformation-510302`, `asia-southeast1`. Staging serves. Production resources partly exist (SQL `promptify-prod`, queue, bucket, Hosting site) but no prod API or Hosting release; owner said staging only for now.
- Staging (12/11): API `promptify-intrepid-api-rel1-1112` (image built from commit `6e2389a`, 1–10 instances, min 1, pool 15), Hosting `59100aff` (`9dd78a1`). Rollback: `rel3-1111` then `rel2-1111`; Hosting `cc5d24d8` then `e9711f81`.
- 12/11: the staging roster Scheduler syncs every class whose Sheet connection has auto sync on, on the production due rules (workbook schedule, 15-minute floor); before, only the two `STAGING-SYNTHETIC-20261020-*` classes were synced on schedule.
- 10/11 added: admin approves Workspace sources in Governance (025, no per-class redeploy), staff first sign-in needs admin approval (026), SOP/output injection screening, SOP parser child process, admin "create course" with first class (027). See top of `docs/05_OPEN_ISSUES.md`. Flags: Judge async + stream, RAG `GCP_VECTOR_MODE=pgvector` with `text-multilingual-embedding-002`, `CITATION_GATE=on`, `DISABLE_PUBLIC_BASIC=true`. Judge queue 100 concurrent, 50/s.
- API: `src/services/cloudRunServer.ts` → `productionServerService.ts` (`POST /api/product {action}`). AI: `productionAiService.ts`, `parallelJudgeService.ts`, `rebuildRunService.ts`, `citationService.ts`.
- Schema: `gcp/sql/001…027`.
- Owner decisions: 100 learners per session may press Run/Judge at once (D45); certificates are not used by HR (D46); a few seconds of UI refresh delay is fine, no real-time (D47).
- Cloud access: `gcloud` CLI and Cloud Console ask `demo.biz@intrepid.asia` to re-authenticate; Application Default Credentials still work. Staging ops scripts: `apps/promptify-intrepid/tmp/staging-ops/` (git-ignored, see its README).

## Always
- Offline checks: `npm run lint`, `npm run typecheck`, `npm run test:boundaries`, `npm run build`, `npm run test:smoke`, `npm test` (94/94 baseline, 1 known circular-import warning).
- Ask before anything touching production. Ask before Gemini/Vertex calls, Cloud SQL writes, deploys, migrations, commits or pushes unless the user already authorized that kind of action in the session.
- Never change the model (`gemini-3.8-flash`), Judge strategy (`parallel-v1`), scoring contract (`weighted-v1`), thresholds or quotas without explicit approval.
- Label conclusions with their evidence level: CODE / OFFLINE / LIVE / unknown.
- Every actual Gemini call or retry goes through `admittedModelRequest`; never bypass it.
