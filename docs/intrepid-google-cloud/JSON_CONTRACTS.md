# JSONB contracts — Intrepid

The SQL constraints and final function bodies in catalog.validated.json are authoritative for DB validation. TypeScript contracts are in apps/promptify-intrepid/src/types/production.ts. This document describes intent and known keys, not a new validator silently replacing existing contracts.

| Field / area | Known contract | Migration rule |
|---|---|---|
| lessons.hints / focus_components | Arrays | Preserve array order and Unicode |
| prompt_attempts.evaluation_json | Historical evaluation formats + weighted-v1 | Keep original JSON; never relabel a historical score as weighted-v1 |
| weighted-v1 evaluation | contract, total, criteria[], strengths[], improvements[], nextHint; optional bilingual feedback | Criterion keys groundedness/persona/format/oneshot/actionability; use valid_evaluation_total and existing rubric validators, not manual totals |
| criteria[] | key, label, description, weight, active, score, max, reason as applicable | Config weight totals 100, active score maxima total 10; preserve disabled criteria semantics |
| product_studio.config | revision/pillar/branch/departments/objectives/competencies; startTime/endTime/state; variables/scaffold/rubric/materials/awards | Retain full object and revision. State DRAFT/ACTIVE/SCHEDULED/ARCHIVED is distinct from SQL lesson status |
| config.variables[] | name,type,sample,mappedTo | No automatic renaming |
| config.scaffold[] | id,name,tag,active,rubricKey | Preserve mapping to rubric keys |
| config.materials[] | id,type,name,url,version,updated,log | Review external URLs without replacing them with fictional GCP paths |
| config.awards | passThreshold, issuance, badges, gamificationLinks, certificate, accessTier where configured | Optional fields remain optional; do not turn certificates on globally |
| awards.issuance | badgeOnPass,certificateOnCompletion,minimumAverageScore,requireAttendance | Preserve exact conditions |
| awards.certificate | title,issuer,eligibility,templateUrl,lastUpdated where present | Config title/issuer are not accreditation; no fake verification URLs |
| product_awards.evidence | rule; certificate completed_lessons/average_score/minimum_average_score/attendance_required/attendance_count/lesson_scores; badge score/studio_revision | Historical evidence must remain unchanged; issued_at and id preserved |
| rebuild_runs.snapshot | Frozen lesson/system/context/rubric/pass policy captured for that run | Do not recompute from current Studio settings |
| rebuild_runs.result | Output/model/latency and saved result payload | Preserve request idempotency |
| product_sop_chunks.embedding | JSONB numeric array, expected 768 dimensions by current ingestion service | Retain vector dimensions/model semantics, validate finite numbers |
| SOP version/contribution metadata | filename,type,pages,bytes,sha256; optional storageBucket/storagePath/driveFileId/versionTag, request fields | Rewrite only reviewed storage locations after checksum-confirmed copy; preserve Drive links and provenance |
| product_learner_context.chunks | position,page,content,optional embedding | Private to owner; migration cannot make it class-wide automatically |
| product_sheet_connections.column_mapping | Source column to expected roster field mapping | Preserve exact header mapping; test Sheets access separately |
| product_sync_logs.result | Import result/counters | Historical logs, not pending work to replay |
| product_governance_config.config | Governance object, versioned | Secrets remain in Secret Manager; assess singleton ownership before import |

Google Cloud service-account credentials, OAuth tokens, passwords and Gemini API keys are NOT application-schema data. Auth provider internal tables and file bytes require separate migration workstreams.
