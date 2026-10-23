# Staging roster revocation and learner Drive originals — 2026-10-21

## Scope and result

The combined lifecycle API passed ordinary signed-admin roster omission checks and actual Google-authenticated learner revocation/download checks on the two fixed fictional staging companies. No IAM, production, score, completion or AI-model changes were made. No AI generation/indexing was requested during these acceptance probes. The additional ordinary-inspector UI issue was fixed and verified: the original-file action now downloads the canonical private snapshot through authenticated class/version access instead of opening current Drive bytes.

UI original-download status: VERIFIED

Hosting release `8c8ffe04005cc145` replaced staging `b9fed75cb0c32645` with27 files; the API remains `promptify-intrepid-api-life-1021`. The ordinary learner inspector button produced an actual browser download:1072 bytes, exact SHA-256 `62633ee5d1092cd9dbeeff6b8551a4e1b08e3c8d91cbe3e00fe788240f7c8d07`, while remaining on staging. Signed URL and token were not logged. Evidence: `outputs/staging-release-2026-10-21-lifecycle-ui-download/learner-ui-original-download.json/png` under the Intrepid app. The source component is reviewed at SHA256 `35fe1fd0b098e96e8eae3ec03badc1ee03e4272c2740372d17ee33224f7eefe3`; it disables missing snapshots/busy requests and never falls back to Drive after denial. The new busy label currently uses English when no translation entry exists; this is a minor localization gap, not an access failure.

TypeScript/staging build, architecture lint, boundaries, local dev/API smoke and the focused safe-download test passed for the UI change. Existing Workspace cycle and bundle-size warnings remain. Post-release HTTP/assets checks28/28 passed. The complete earlier backend offline allowlist remains53/53; it was not mislabeled as a newly repeated full-suite run for this one-component change.

The initial deployment failed before version creation because DNS was unavailable. A second attempt created the candidate but failed during upload. After confirming candidateCREATED and active release stillb9fed..., the reviewed guarded resume uploaded missing content hashes, finalized and released that exact candidate. Partial checkpoints and both failure logs are retained; no speculative DNS/IAM changes were made.

## Evidence of source-owned revocation

The reviewed local maintenance guard now uses literal case-sensitive executable names, exact staging instance/port and unique loopback listener ownership; Sol independently passed final script hash `e16b98ec1d37573aba8f736cafda3da4c64204c19741f5d95ef0fd876217b6b0`. Read-only preflight verified the fixed eight unlinked fictional learners and two protected real QA grants. The explicit fixture-only adoption changed eight provenance flags and wrote two audit records; it did not modify identity/profile/enrollment status or real QA flags. Before/after snapshots are retained under `outputs/staging-release-2026-10-21-lifecycle-originals/roster-ownership-adoption/2026-10-21T08-56-07-013Z/` in the Intrepid app.

This is an explicitly reviewed exception for those eight test fixtures. Historical manual grants elsewhere remain protected; no general legacy roster ownership was inferred.

| Signed acceptance action | Observed result |
| --- | --- |
| Admin Add → Update → Omission, Northstar | 4 → 4 → 3 active fictional members |
| Admin Add → Update → Omission, Juniper | 4 → 4 → 3 active fictional members |
| Admin Northstar PeerAccess snapshot | 5 source members; real Manh learner added, prior roster-removed learner04 reactivated, manual Demo preserved |
| Actual Manh learner before omission | Northstar canonical original downloaded, 1,072 bytes and exact preserved SHA-256 |
| Admin Northstar Omission snapshot | 3 source members; Manh and reactivated learner04 removed; manual Demo preserved |
| Actual Manh learner after omission | Northstar snapshot403 and the exact previously downloaded Northstar canonical version403 |
| Same Manh session, own Juniper company | Both originals downloaded with exact hashes; admin-only repair403; foreign-company request403 |

Readonly final catalog: 1,260 ownership rows, 1,251 manual-preserved, three source-removal markers, nine source membership rows/six active. Manh's Northstar enrollment is retained as removed/source-owned; its Juniper manual grant remains active. Both original real QA grants remain manual/active. A historical enrollment row still existing is not an active access grant.

The revocation result covers **new authenticated access and download requests**. Previously issued storage signed URLs have a maximum five-minute lifetime; this work does not promise immediate invalidation of an already issued URL or removal of a file already downloaded.

## Learner originals and citation isolation

| Learner/company | Version | Bytes | SHA-256 |
| --- | --- | --- | --- |
| Demo / Northstar | f11375ce-d3c1-4269-8489-588770433d4b | 1072 | 62633ee5d1092cd9dbeeff6b8551a4e1b08e3c8d91cbe3e00fe788240f7c8d07 |
| Demo / Northstar | 41a536c0-8bfd-428d-8b21-e3436d1f796c | 1072 | 1d4696263ab34e578d054212ca466dd024b62817d4a2f8500d6db874fae2c488 |
| Manh / Juniper | 5b5a0075-5de7-4697-9017-0eefeba1cffd | 1070 | 5208601e5d2788a7539ce11664348d058c68f79af4cf3ddc30cdf6bdc7310cf3 |
| Manh / Juniper | c1430456-d618-41ba-af92-629594239068 | 1071 | cc4f66e1e57e9bfe22bd36809337c7228656fca1204167ff7964984f9f1916b4 |

Both actual learners were denied admin-only original repair and foreign-company source access. Refreshed source searches returned each company's two unchanged canonical citation tags, no foreign canary, and foreign class403. The four live Drive fixtures are TXT originals; this result does not by itself certify all native Google Docs/Sheets export formats.

## Evidence locations and governance

Within `apps/promptify-intrepid/outputs/staging-release-2026-10-21-lifecycle-resume/`:

- `roster-adoption-apply.json`; `admin-roster-omission-final.json/png`; `admin-peer-grant.json/png`; `admin-peer-omitted.json/png`.
- `learner-peer-granted.json/png`; `learner-peer-revoked.json/png`; `learner-peer-access-restricted.png`; `learner-a-originals.json/png`; `learner-a-source-isolation.json/png`; `learner-b-source-isolation.json/png`.
- `roster-catalog-after-omissions.json`, `roster-catalog-peer-granted.json`, `roster-catalog-peer-revoked.json`, `roster-catalog-final-learner-checks.json`.
- `admin-drive-originals-replay.json/png`: all four repairs were idempotent (`restored:false`) and all original hashes remained unchanged on the combined image.

Additional fresh governance inventories: `outputs/staging-release-2026-10-21-lifecycle-acceptance/before/` and `after/`. Scoped comparison22/22 passed, including entire Cloud Run service unchanged, IAM/settings/authorized domains and production default Hosting. Data deltas are the eight fixture-only provenance adoptions, ordinary signed roster sync logs/ledgers and temporary peer access followed by revocation. These are recorded separately from unchanged infrastructure checks.

The UI correction has another full before/after checkpoint under `outputs/staging-release-2026-10-21-lifecycle-ui-download/`; its comparison also passed22/22, including entire unchanged Cloud Run service and production default Hosting. All29 named GCP inventory operations completed successfully in the after manifest, with Firebase Hosting version/config inventories captured separately. The intended UI delta is the staging Hosting version8c8ffe04005cc145 only. Local build/recovery/packaging scripts changed without production deployment. Governance snapshots and token/secret-redacted reports are retained; short-lived operator tokens stayed in memory.

## Remaining production gates

This closes the bounded live acceptance for roster omission, four learner Drive originals and the ordinary-inspector download action. It does not certify production-wide legacy ownership policy, scheduled worker/due-job operation,100 distinct concurrent users/100 AI requests, alert delivery, a restore rehearsal or a custom domain. Overlapping grants, validated empty snapshots, transfer and race/fencing cases have offline/native database coverage; do not label every one a signed live test.
