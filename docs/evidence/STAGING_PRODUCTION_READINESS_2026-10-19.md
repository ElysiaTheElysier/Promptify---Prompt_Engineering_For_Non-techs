## Superseded current status

Read [STAGING_PRODUCTION_READINESS_2026-10-20.md](STAGING_PRODUCTION_READINESS_2026-10-20.md) for the latest verified state, SOP race fix and remaining launch gates. The text below is historical evidence.

## Current update 2026 10 20

Read STAGING_SOP_FORMATS_AND_ROLES_2026-10-20.md first. PDF/DOCX/XLSX signed upload/adminreview/index/search/citation/originaldownload and combined real AI run PASS. Application roles changed with explicit user approval: kangseobi123 Head, manhmanh100127 learner enrolled in fictional QA class. Signed Head moderation/privacy/Studio/shadow denial and peer learner own library/zero history/awards/Studio/shadow denial PASS. No GCP IAM/production changes. Full direct-object HTTP fuzz/races/mobile still not exhaustive. Final Hosting68f6d628d37265cb; APIunchanged sopdl-1019.47tests/governance21/asset23 PASS. Mobile emulation permission denied and not bypassed.
# Production readiness — staging audit, 2026-10-19

Status: **NOT ready for unrestricted production rollout.** This report supersedes earlier readiness assumptions; successful synthetic course completion alone is insufficient.

## Latest update — signed learner SOP accepted

See STAGING_LEARNER_SOP_ACCEPTANCE_2026-10-19.md. Learner semantic search/citation copy/original download/cited AI run have now passed. V5 used canonical SOP and document canary, generation1917ms/Judge8060ms/10of10. Fixed ignored download options; API now sopdl-1019 at100%, rollback ready-1019. Six attempts/three grades, awards still2badges+1certificate. No IAM/production/theme change.

## Closed in readiness release (historical baseline)

1. **P1 personal-library privacy:** assigned Head snapshot previously included peers' personal and rejected templates. Head now receives only own entries plus pending/approved entries within the authorized class. Learner/admin policy unchanged. Regression invokes actual product handler with immutable SQL fixtures; class predicates remain AND-scoped. Signed live Head/peer acceptance still pending.
2. **P1 Judge retry cost:** definite provider errors could release a claim and permit repeated paid grading against the same saved generation. Newly claimed Judge requests now consume an atomic per-actor budget of 40/hour across classes, using the existing SQL budget function. Completed replay and busy duplicate do not consume budget; quota denial releases only the acquired claim. Budget uncertainty fails closed and retains the claim. No migration, fabricated score, lowered rubric, IAM or model change.
3. **Live SOP acceptance:** demo.biz submitted one fictional TXT via private signed upload. While pending, active SOP count was 0. Signed admin duonglh reviewed actual content, approved and indexed it. UI reports published / RAG Ready; read-only SQL confirms one 768-dimensional gemini-embedding-001 chunk, one binding to lesson2 only. Publication evidence: `apps/promptify-intrepid/outputs/staging-readiness-2026-10-19/sop-publication.json`. Learner semantic search, original download and cited AI run subsequently PASS; lesson1 retrieval empty and shadow class UI denied. See latest acceptance report for scope and evidence.

## Release and validation

- Target: project ai-transformation-510302, Cloud Run promptify-intrepid-api, asia-southeast1; SQL promptify-staging. Frontend unchanged.
- Build: 089807cf-3139-4f81-9dc7-a99cec83ea90.
- Revision: promptify-intrepid-api-ready-1019, 100% staging traffic.
- Image: sha256:700cb5d3135560e4502780b9e51fdc430314ca8dfbfd0c098621b4ac0cbda885.
- Rollback revision: promptify-intrepid-api-jb-1019. Do not automatically roll back unrelated data or claims.
- Offline tests **45/45 PASS**. Typecheck, lint, architecture negative checks, production build, local smoke PASS. Known existing Workspace type cycle warning and large frontend bundle warning remain.
- Independent review found no concrete blocker in the two patches. Candidate probes 5/5; active API probes 5/5 (health/readiness/unauthenticated denial/untrusted preflight).
- Complete raw runtime spec hashes match after masking image only; actual env values were processed in memory and not written to evidence. IAM/SQL/Hosting comparisons recorded separately below.
- Gemini generation/supervisor/workers remain gemini-3.8-flash; existing bounded timeout recovery unchanged. Embedding uses its separate 768-dimensional model, not a replacement generation/Judge model.

## Course regression evidence

Read-only snapshot after SOP publication still shows five saved attempts, two real graded attempts (10/10 each), 2/2 completed, two badges plus one certificate, one personal library entry. Old three ungraded timeout attempts/claims remain untouched. No new generation or score was fabricated in this audit. Real course/PDF acceptance was completed in STAGING_JUDGE_RECOVERY_2026-10-19.md; current audit does not claim new learner runs after this backend release.

## Remaining launch gates (priority order)

| Priority | Gate / evidence | Required next step |
| --- | --- | --- |
| P1 | Signed live role/object isolation matrix incomplete | Use already-assigned learner, peer learner, Head and manager sessions; test foreign class/attempt/library/source/award reads and writes. Offline regression is not proof of deployed identities. Do not grant roles or mint custom tokens. |
| P2 / format gate | Signed learner TXT SOP path PASS | Published lesson2 search/citation/download/cited generation PASS; lesson1 search empty, shadow UI denied. Live PDF/DOCX/XLSX and revoked/replaced-source races remain unverified; full direct-object HTTP matrix remains separate. |
| P1 | Operations monitoring absent | Read-only Cloud Monitoring inventory returned 0 alert policies, 0 uptime checks, 0 notification channels, no extra pages. Define operator/recipient and thresholds, then configure staging alert delivery and prove a test notification. No recipient was invented or contacted. |
| P1 | Restore untested | SQL automated backups and PITR enabled, retention7days, recent backups SUCCESSFUL. Agree RPO/RTO and an isolated restore target/cost, rehearse restore and verify data/access. Backup presence is not restore success. |
| P1 | Capacity/AI consistency not measured | Define peak concurrent users, p95/p99 latency/error budget and cost cap; run bounded staging load plus repeated scoring on a fixed rubric set, check score variance/timeouts/idempotency. Actor budgets do not establish global cost/concurrency control or provider SLO. |
| P2 / feature gate | Drive/Sheets/roster not accepted | UI reports unconfigured Google identity. Backend accepts GOOGLE_SERVICE_ACCOUNT_JSON or keyless GOOGLE_WORKSPACE_SERVICE_ACCOUNT; neither is in current runtime env. Supply approved existing workspace identity + staging-only folder/sheet and pre-existing permissions, or explicitly exclude integration from launch. Do not create keys or change IAM automatically. |
| P2 | Dependency advisory residual | npm audit production has 3 moderate entries in one Mammoth CLI chain; no high/critical. Raw DOCX runtime path tested, argparse/sprintf-js absent from loaded modules. No unsafe major override/downgrade applied. Track upstream patched release; inventory is not clean. |
| P2 | Device/accessibility/performance coverage | Existing responsive/browser checks do not establish real iOS/Android coverage. Test keyboard/focus/screen reader, slow network, expired session, reconnect, large files and long content. Resolve or explicitly accept large bundle risk. |
| Launch decision | Production-specific provisioning/rollback/ownership | Staging verification does not authorize production changes. Review production configuration, privacy/retention and owner runbooks separately before any promotion. |

No IAM changes, production writes, production deployment, schema migration, credential reset or frontend/theme changes were performed by this release.

## Evidence locations

- Governance before/after and release: `apps/promptify-intrepid/outputs/staging-release-2026-10-19-readiness/`.
- SOP, operations/backup inventory, dependency review, course snapshot: `apps/promptify-intrepid/outputs/staging-readiness-2026-10-19/`.
- Credentials/tokens must never be included in archives; signed download URLs are transient and excluded.

Governance comparison: **21/21 PASS**. Both default and staging Hosting release lists unchanged. Post-deploy signed admin UI still reports the fictional source published / RAG Ready. Screenshot: apps/promptify-intrepid/outputs/staging-readiness-2026-10-19/sop-published.png.



