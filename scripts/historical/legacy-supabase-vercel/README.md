# Legacy Supabase/Vercel maintenance scripts (historical)

These root maintenance scripts come from the period before GCP (08–13/10/2026), when the rebuild ran on Vercel with Supabase. They read the root `.env.rebuild.local`, `.env.production-setup.local` or `.env.rotation.local` through Vite `loadEnv(process.cwd())`, so they only work when run from the repository root. They talk to Supabase, Vercel or the Gemini Developer API with an API key. Current Intrepid staging uses Vertex AI with ADC.

Do not run them as part of normal work. They can read credentials, call paid APIs or touch the legacy database.

- `rebuild_database.mjs`: management of the dedicated Supabase rebuild database.
- `inspect_production_readiness.mjs`, `verify_setup_credentials.mjs`: read-only checks against the legacy production setup.
- `check_fallback_model.ts`: calls `generativelanguage.googleapis.com` with `GEMINI_API_KEY` for `gemini-2.5-flash`. This may be one source of the API-key traffic seen in AI Studio; see [the 429/404 investigation](../../../docs/evidence/STAGING_GEMINI_429_404_ROOT_CAUSE_2026-10-22.md).
