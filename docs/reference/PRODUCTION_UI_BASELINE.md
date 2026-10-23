# Production UI baseline and update precedence

User clarification on 2026-10-08: use `Promptify_Mockup_x_Combined_Updated.zip` as the visual foundation and apply the latest Word updates to it. Add the required features; do not replace the supplied interface with a minimal page or redesign.

- Exact archive: `outputs/Promptify_Mockup_x_Combined_Updated.zip`, 41,471,598 bytes (40,500 KB).
- SHA-256: `1b90bebd785a242981b0e67be3ceaa2695c943f4226076480868a8e166686c29`.
- Archive manifest describes mockup content × current green theme, with React, Lucide, green logo, Inter/JetBrains Mono. It is NOT the earlier `deployed.tsx` composition documented by the older combined-ui README.
- Source for this archive: `design-drafts/combined-ui/mockup-aligned.tsx`, `mockup-templates.json`, `MOCKUP-ALIGNED-README.md`; inspect build script and archive rather than inferring from directory names.
- Latest Word: `docs/Promptify - UI code - for Review.docx`, SHA-256 `666CB5D869ED3AAAF347A5619D1D98A8E36ED650AB07F3AC2F72D5EE25F84E92`.
- Word's final selected source blocks: 0,1,2,3,4,7,8,9,10,13,16,24,25,26,27,28.
- Text comparison of archive source AST and final Word: UI01/02/03/04/07/08/13 unchanged; substantial changes in UI05/09/10/11. Several other blocks change wrappers/spacing, not text. Compare structure as well before assuming exact visual identity.

Implementation: compile vetted source structure to ordinary React components and replace fixture state/actions with authenticated backend adapters. Preserve the archive's green branding and original logo. Prototype eval, mock providers and fabricated data are not production integrations.

All 16 routes now use ordinary React components compiled from the latest Word, with the ZIP branding applied. The combined layout was deployed to production (dpl_6HD9djawKaNxiWA2vhK2Q8mVR8nr), and the public alias was verified in the browser on desktop and mobile. An onboarding fix is being deployed separately: the first administrator had no stored full name and UI-02 omitted its input. Full production compliance is not yet established; see the handoff for remaining gaps.
