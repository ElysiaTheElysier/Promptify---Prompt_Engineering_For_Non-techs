# Two-app separation tooling (historical)

These scripts built and verified the 12/10/2026 split into `apps/promptify-mvp` and `apps/promptify-intrepid`. The MVP was retired on 22/10/2026 and Intrepid is now the only app, so they are kept only as provenance and are not maintained. Many of them assume both apps exist, write to `docs/separation/`, or expect to run from the repository root. Read a script before running it.

- `separate_apps.mjs`, `finalize_separation_audit.mjs`, `audit_ownership_imports.mjs`, `route_maintenance_scripts.mjs`, `verify_separation_browser.cjs`: separation build and audit.
- `run_offline_checks.py`: offline runner that looped over both apps.
- `templates/`: per-app check templates. Intrepid keeps its own copies in `apps/promptify-intrepid/scripts` and `apps/promptify-intrepid/tests`.

Evidence from the separation: [docs/separation](../../../docs/separation/README.md) and [docs/archive/repository](../../../docs/archive/repository/).
