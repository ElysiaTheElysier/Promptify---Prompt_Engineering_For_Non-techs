# Synthetic Workspace staging acceptance — 2026-10-21

## Outcome

Created two new fictional companies with native Google Sheets, private Drive folders and four fictional TXT SOPs. GPT-6 Luna prepared fixtures, GPT-6 Luna high packaged evidence, and GPT-6.1 Sol independently reviewed parser, source permissions, live signed results and production gaps. No production deployment, GCP IAM change, role change or score manipulation occurred in this checkpoint.

Drive root: https://drive.google.com/drive/folders/1LQnXu9sQmNm_INUSKav_I8f2LVdb1Sbo

| Company | Native roster Sheet | Staging class |
| --- | --- | --- |
| Northstar Paperworks (fictional) | https://docs.google.com/spreadsheets/d/192FSgBS3yLEDrEaWIpv_sQJ40d2nnuDWGFEbDT7UhRM/edit | 9c32e26b-bcda-4549-bca8-dd4f350c2aaa |
| Juniper Kiteworks (fictional) | https://docs.google.com/spreadsheets/d/19PpiiiA4goQyKqck2Xb-vvFDJZ-MM0dxG1m7B2nJVvw/edit | f6a40278-c5ab-42f2-9948-abb2fd1431bb |

Each Sheet has Table/Add/Update/Omission snapshots, 32 columns, and 3/4/4/3 parsed roster rows. Eight reserved example.test roster rows are synthetic database users with no linked authentication identity; they are not eight signed-in test participants. The two existing QA learner accounts were enrolled in their respective new classes. Original real-company reference Sheet was not imported or modified.

Only the new synthetic Sheets/SOP files and their SOP folders received reader access for the existing runtime service identity. No public/domain grant or GCP IAM change. Independent readback caught and corrected an initial wrong-cell setup error; both failed and corrected evidence are retained.

## Signed live checks

- Admin: both initial syncs and stable replay passed; discovery returned only two intended files per company. Four foreign Sheet/folder requests returned 403.
- Four documents were extracted, approved and indexed, each with one canonical chunk/citation and the expected company canary. Two admin searches returned their own company results without foreign canaries.
- Both real learners passed: own company search returned two expected canonical citations; the foreign class request returned 403; no foreign canary appeared. Evidence is `learner-company-a.json` and `learner-company-b.json` with screenshots.
- Add/Update processed four members in each company. These counts do not certify profile-name update behavior.
- Omission failed the required revocation behavior in both companies: source processed three but four synthetic memberships remained active. This failure was preserved rather than manually repaired.
- All four Drive-original downloads returned 404. Extraction/indexing success does not imply original-download support.

No generation/Judge run or course completion/badge conditions were modified. Document and query embedding calls were bounded by the staging helper.

## Release and governance

Staging API: `promptify-intrepid-api-ws-1020`, 100% traffic; same image digest as previous `ar2-1020`: `sha256:291f2183a0e4dbe78ff0768f34afd85580b1a85685701b69ff6d55305558dfd9`. Expected change is exact per-class Workspace source bindings. Rollback revision: `promptify-intrepid-api-ar2-1020`.

Staging Hosting version: `d910167f87b4a514`, previous `6bc8c6d9bb6c4aa9`. Added staging-only authenticated acceptance helper; production-mode build excludes both QA pages. Only `ai-transformation-510302-intrepid-staging` was released. The roster worker was not deployed or enabled.

Before/after redacted inventory and comparison are retained. All 22 comparison checks passed after verifying expected revision/source-binding deltas; existing IAM, SQL configuration and default Hosting release remain unchanged. Do not interpret the comparator field name `unchanged` as no release/config delta at all.

49/49 allowlisted offline checks, typecheck, architecture lint/boundaries, staging build and smoke passed. Existing type cycle and bundle-size warnings remain. Candidate and active readiness probes passed. Production-mode build was local only.

Evidence: `apps/promptify-intrepid/outputs/staging-release-2026-10-20-synthetic-workspace/`. Filenames retain 2026-10-20 UTC checkpoint naming; report updated 2026-10-21 local time. Read the independent [review](STAGING_SYNTHETIC_INTEGRATION_REVIEW_2026-10-20.md) for detailed limits.

## Production blockers and next work

1. Implement connection-owned, atomic roster reconciliation. Preserve manual/other-connection grants; revoke only exclusively roster-owned access after a validated successful authoritative snapshot. Missing provenance makes blanket deactivation unsafe. Department-transfer failure also has offline actual-handler evidence; it was not repeated live here.
2. Define profile-field ownership. Current SQL retains existing names/details on conflict. Live final names after Omission cannot prove the intermediate Update result; capture stage-specific profile values before asserting live update semantics.
3. Implement authorized private delivery or immutable original snapshots for Drive SOPs. Existing uploaded-file download success from earlier tests does not cover Drive originals.
4. Configure and separately accept the scheduled roster worker, with exact source bindings, due-job/replay/failure/recovery checks. Do not enable historical broad connections.
5. Prove 100 distinct concurrent users and 100 AI submissions with capacity/recovery tests. Earlier single-admin batch admitted 40 under the correct quota and had one Judge 429 and one 504; it is not the required capacity acceptance. Keep Gemini 3.8 Flash and score/quota protections.
6. Verify alert email delivery and restore rehearsal. No domain is owned yet; no purchase or DNS change was made.

This checkpoint proves the scoped two-company manual pipeline and learner isolation. It does not certify production readiness.
