"""Compare a user-supplied catalog export; does not connect to a database."""
from pathlib import Path
import argparse,json,re
p=argparse.ArgumentParser();p.add_argument('live_catalog');p.add_argument('--output',default='tmp/intrepid-live-schema-drift.json');a=p.parse_args()
root=Path(__file__).resolve().parents[1];candidate=json.loads((root/'docs/intrepid-google-cloud/catalog.validated.json').read_text(encoding='utf-8'));live=json.loads(Path(a.live_catalog).read_text(encoding='utf-8-sig'))
report={'status':'differences require review; this script never migrates data','expected_target_additions':['gcp_identity_bindings','gcp_trusted_backend policies','auth shim'], 'differences':{}}
keys={'tables':['tablename'],'columns':['table_name','column_name'],'constraints':['table_name','name'],'indexes':['tablename','indexname'],'functions':['name','arguments'],'policies':['tablename','policyname'],'triggers':['table_name','name']}
for group,keycols in keys.items():
 def filtered(rows):
  return [r for r in rows if r.get('tablename',r.get('table_name'))!='gcp_identity_bindings' and not str(r.get('policyname','')).startswith('gcp_') and r.get('name')!='product_dispatch_roster_worker' and not (group=='constraints' and r.get('type')=='n')]
 def norm(r):return {k:re.sub(r'\s+',' ',v).strip() if isinstance(v,str) else v for k,v in r.items() if k!='ordinal_position'}
 x={tuple(r.get(k) for k in keycols):norm(r) for r in filtered(candidate.get(group,[]))};y={tuple(r.get(k) for k in keycols):norm(r) for r in filtered(live.get(group,[]))}
 report['differences'][group]={'missing_in_live':[list(k) for k in x.keys()-y.keys()],'extra_in_live':[list(k) for k in y.keys()-x.keys()],'changed':[{'key':list(k),'candidate':x[k],'live':y[k]} for k in x.keys()&y.keys() if x[k]!=y[k]]}
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(f'Read-only drift report: {out}')
