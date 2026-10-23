# Separation evidence

- `file-manifest.json`: original paths, per-app copies, duplicated modules, source edits, archived-only modules and retired root paths.
- `script-ownership.json`: maintenance script destinations and preserved originals.
- `dependencies-before.json`, `dependencies-mvp.json`, `dependencies-intrepid.json`: Dependency Cruiser graphs, including type dependencies.
- `knip-before.json`, `knip-mvp.json`, `knip-intrepid.json`: scoped advisory unused audits.
- `tests-before.json`: baseline offline results; app results are retained in `verification-results.json` after final validation.
- `browser-verification.json`: public landing/sign-in/review text and screenshot hashes before/after; authenticated flows are not covered.

Full screenshots, local working-copy backup and transient logs remain in ignored outputs. No environment credential values are included. Re-run graphs with `node scripts/audit_ownership_imports.mjs`; run boundary checks from each app. Historical raw Knip scan included scratch files; the scoped audit here uses src/api project patterns and explicit runtime/API/test entries.
