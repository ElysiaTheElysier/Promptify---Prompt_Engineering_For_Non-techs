# Temporary Vercel compatibility deployment

The canonical Intrepid runtime remains Firebase / Cloud SQL. While cloud access is pending, the existing Vercel project uses Supabase authentication, database and private storage.

From this app directory, run `node scripts/prepare_vercel_compat_deploy.mjs`. It stages only this app in ignored `outputs/vercel-compat-deploy`, copying current source/UI and replacing the two transport adapters using these templates. It excludes the Cloud Run executable from Vercel functions and adapts the private upload signing call to Supabase's API. The generator refuses to reuse an existing staging directory so stale source/secrets are not carried forward.

Validate the staged TypeScript with `node node_modules/typescript/bin/tsc --noEmit --project outputs/vercel-compat-deploy/tsconfig.json`. Run `node tests/verify_vercel_compat.ts outputs/vercel-compat-deploy` to import the exact bundled API entries using native Node (no tsx/Vite) and run an offline Supabase SDK contract check; no live data or provider calls occur. This explicit staging test is separate from the canonical cloud test allowlist.

Deploy the isolated staging directory to the existing project, retaining its project-managed environment. Do not upload local environment files, deploy the repository root, or change live database/OAuth configuration. Confirm the production environment build before assigning the existing public URL. This compatibility package is temporary and does not migrate the cloud source or copy MVP code.

The generator bundles app-local API dependencies into four ESM `.js` entries with esbuild. This prevents Node's native ESM resolver from failing on extensionless TypeScript imports after Vercel compilation. External packages remain external. Only staged TS entries are replaced; the canonical Cloud runtime is preserved. The staged tsconfig allows the generated JavaScript entries while retaining strict TypeScript checks for source. For subsequent releases, pass a fresh directory name, for example `node scripts/prepare_vercel_compat_deploy.mjs vercel-compat-hotfix-20261013`.
