# Learner upgrade — Word audit and production evidence

Updated 10 October 2026. Original HTML reviewed before implementation; combined UI and Promptify emerald theme preserved. No commit, push, reset or stash performed.

| Source | Features connected to runtime/backend |
| --- | --- |
| Word (1), UI-04 | Existing hero/resume/awards/catalog; Department SOP Library in header and catalog; authorized document metadata, indexing/chunks/citation copy; persisted sync request with title/Drive URL/department/lesson/reason/priority; My Requests states; UI-11 approval before Drive fetch/index; shared resource filters |
| Word (2–3), UI-05 v7 | Task/Theory/Hint/Resource/Solution gates; reflection before solution; scaffold micro-learning/insertion/detection; allowed model selection/specs; temperature/top-P/tokens/stops/search controls actually sent to provider; hover/focus help and internal Wiki |
| Word (2–3), context | Private PDF/CSV/TXT extraction/indexing; owner/class/lesson isolation and duplicate protection; selected context used for generation; collapsible editable learner role/style instruction beneath server-controlled facilitator policy |
| Word (2–3), results | Readable Markdown output and Judge buttons; actual usage and public provider thought summaries; full persisted Judge diagnostics; history restores prompt/output/score/settings/context IDs; execution budget; split compare criteria/feedback/settings and matching-attempt restore |
| Word (2–3), library | Save from editor/output; persistent title/category/variables/settings/score/pass metadata; idempotent submission and share request; UI-12 Head approval/rejection |
| User update | New users default English; EN/VI switch and remembered preference; authored bilingual lesson sections selected by locale |

Shared prompt templates remain scoped to the authorized selected cohort, rather than automatically widening enterprise access to assigned SOP content. Locale switching does not overwrite prompts/output or invent translations for English-only authored content. Provider summaries are not raw chain-of-thought.

## Verification

- Local TypeScript/Vite and remote Vercel builds passed; existing chunk-size warning remains.
- Offline HTTP/auth, i18n, run replay, settings, content language and provider-contract tests passed.
- Schema checks passed: RLS/direct-access denial, reflection validation and legacy support-unlock bypass removal.
- Dedicated live QA passed: library persistence/replay/Head review/cross-class denial, reflection, deferred SOP request/rejection, private extraction/embedding/dedup, real Generate/Judge, and saved settings/context/output/score restoration.
- Actual Judge truncation was reproduced, corrected and successfully retested.
- Earlier fictional desktop/mobile preview checked contrast and overflow. Latest learner visual verification is not claimed: current browser account is admin and learner-only access is correctly denied.

## Database and deployment

Applied and recorded migrations, with rollback scripts preserved but not executed:

- 048_learner_prompt_library.sql — SHA-256 05411056463ae4887588d738f3a568db3c42316cb9a61164d1215f1bba68539e.
- 049_learner_library_category_and_replay.sql — SHA-256 dd6fdecf9546b4a515572d99234e2903899e7a2533437d4f0a91dfdf71797043.

Staging source manifest: outputs/learner-upgrade/deployed-source-manifest.json; 169 source/assets files, zero missing/different/extra; no environment files copied.

Deployment dpl_AYEBdafSUo9z1ozxgUa9f24xrPYZ is READY. Vercel inspect of https://promptify-rebuild.vercel.app resolves to this deployment. ProductionApp asset: ProductionApp-he8HhC-u.js.

## External limits

- Google Search grounding is wired and default OFF, but actual provider calls return 429 RESOURCE_EXHAUSTED with quota/billing guidance. Normal Generate/Judge passed. Search is not live-verified until provider quota is available.
- New SOP request persistence and rejection were tested live. Approval/fetch/index of a real approved Drive SOP was not newly exercised because no approved file was supplied.
- The trial still uses the five authorized fictional Basic SOP lessons, not approved Intrepid policy content.

Runtime lives under src/components/rebuild; authorization/validation/provider logic under src/services. Earlier prototype sources and pre-existing checkout changes remain preserved.

## Follow-up: Provider log and Judge reliability

The generic details selector overrode card padding; a scoped provider-log selector now restores padding and wraps long content. Judge errors now appear inside its card and include the known API error detail. The provider response schema now requires one object per canonical criterion with its own weighted score bounds; malformed results still fail without saving fabricated scores.

Evidence: production HTTP Generate/Judge returned 200 for both a task prompt and `hi`; two previous production requests returned 502. One earlier attempt has an unresolved Judge claim and is intentionally not silently retried. Offline Judge schema/run/provider tests and a fresh live Generate/Judge test with the updated schema passed. No learner attempt, identity or score was modified by diagnostics.

Follow-up deployment: dpl_D5UiZxeJCrgAHiddeUpqHpZcAenV READY; production alias verified against this ID.
