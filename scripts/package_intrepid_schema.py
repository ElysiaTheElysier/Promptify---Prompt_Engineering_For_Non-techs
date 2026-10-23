"""Package reviewed schema docs/tools, never .env, live data or dependencies."""
from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parents[1];folder=root/'docs/intrepid-google-cloud'
scripts=['build_intrepid_cloud_schema.py','validate_intrepid_cloud_schema.mjs','render_intrepid_schema_docs.py','compare_intrepid_live_catalog.py','package_intrepid_schema.py']
files=sorted(p for p in folder.iterdir() if p.is_file() and p.name!='PACKAGE_SHA256.json')+[root/'scripts'/name for name in scripts]
manifest={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(folder/'PACKAGE_SHA256.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
files.append(folder/'PACKAGE_SHA256.json');out=root/'outputs/intrepid-google-cloud';out.mkdir(parents=True,exist_ok=True);target=out/'promptify-intrepid-cloud-sql-schema.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
 for p in files:archive.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(target) as archive:
 assert archive.testzip() is None
 for path,digest in manifest.items():assert hashlib.sha256(archive.read(path)).hexdigest()==digest
print(f'PASS: {len(files)} packaged files; ZIP integrity and SHA-256 verified; {target}')
