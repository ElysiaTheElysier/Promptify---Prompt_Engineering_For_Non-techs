"""Package Intrepid preparation only; exclude credentials, live exports and dependencies."""
from pathlib import Path
import json,hashlib,zipfile,sys
cloudsql="--cloudsql" in sys.argv
root=Path(__file__).resolve().parents[1]
app=root/'apps/promptify-intrepid'
files=[]
for folder in ['src','api','public','gcp','scripts','tests']:
 for p in (app/folder).rglob('*'):
  if p.is_file() and not p.name.startswith('.env') and p.suffix not in ['.log','.pem','.key'] and not any(x in ['node_modules','outputs','tmp','.firebase'] for x in p.relative_to(app).parts):files.append(p)
for name in ['package.json','package-lock.json','Dockerfile','.dockerignore','.gcloudignore','.gitignore','.env.example','.firebaserc','firebase.json','firebase.emulators.json','index.html','postcss.config.js','tailwind.config.js','tailwind-safelist.json','tsconfig.json','vite.config.ts','.dependency-cruiser.cjs','README.md']:
 files.append(app/name)
if not cloudsql:files.extend(p for p in (root/'docs/intrepid-google-cloud').iterdir() if p.is_file())
for name in ['compare_intrepid_live_catalog.py','build_intrepid_cloud_schema.py','validate_intrepid_cloud_schema.mjs','render_intrepid_schema_docs.py','package_intrepid_schema.py','package_intrepid_migration.py']:files.append(root/'scripts'/name)
# Public rendered settings only: never data-export, blob manifests, source catalog or credentials.
for name in ['deployment.json','bigquery.sql','cloudrun-api.yaml','cloudrun-worker.yaml','storage-cors.json','01-enable-apis.sh','02-create-staging.sh','03-service-iam.sh','04-build-deploy.sh','05-start-schedulers.sh','npm-audit-production.json']:
 files.append(app/'outputs/gcp'/name)
files.append(app/'outputs/offline-test-results.json')
if cloudsql:
 files=[p for p in files if p.name not in ['README.md','bigquery.sql']]
 files.append(app/'outputs/gcp/06-apply-schema.sh')
files=sorted(set(files));assert all(p.is_file() for p in files)
manifest={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
out=root/'outputs/intrepid-google-cloud';out.mkdir(parents=True,exist_ok=True)
target=out/('promptify-intrepid-cloudsql-pgvector-prepared.zip' if cloudsql else 'promptify-intrepid-gcp-migration-prepared.zip')
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(root).as_posix())
 z.writestr('MIGRATION_PACKAGE_SHA256.json',json.dumps(manifest,indent=2))
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 for name,sha in manifest.items():assert hashlib.sha256(z.read(name)).hexdigest()==sha
report={'files':len(files),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'artifact':target.name}
(out/'migration-package.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
