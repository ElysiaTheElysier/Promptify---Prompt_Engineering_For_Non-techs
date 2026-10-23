"""SchemaSpy catalog explorer wrapper; local synthetic default, no rows/cloud mutation."""
from pathlib import Path
import argparse, os, subprocess
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--host',default='127.0.0.1');ap.add_argument('--port',type=int,default=55432);ap.add_argument('--database',default='intrepid_correctness');ap.add_argument('--user',default='postgres');ap.add_argument('--allow-staging',action='store_true');args=ap.parse_args()
if args.host not in ['127.0.0.1','localhost','::1'] and not args.allow_staging:raise SystemExit('Only loopback synthetic by default; reviewed staging needs --allow-staging')
tools=ROOT/'tmp/docs-engineering-tools';jar=tools/'schemaspy-app.jar';driver=tools/'postgresql-42.7.10.jar'
if not jar.exists() or not driver.exists():raise SystemExit('Download official SchemaSpy7.0.2 + PostgreSQL JDBC42.7.10 to tmp/docs-engineering-tools first')
cmd=['java','-jar',str(jar),'-t','pgsql11','-host',args.host,'-port',str(args.port),'-db',args.database,'-u',args.user,'-s','public','-dp',str(driver),'-o',str(ROOT/'outputs/intrepid-docs/schemaspy'),'-norows','-vizjs','-noimplied']
# Use a private config file if password is required, not process arguments/logs.
password=os.environ.get('SCHEMASPY_PASSWORD');config=None
try:
 if password:
  config=tools/'private-schemaspy.properties';config.write_text('schemaspy.p='+password.replace('\\','\\\\').replace('\n','\\n')+'\n',encoding='utf-8');cmd+=['-configFile',str(config)]
 raise SystemExit(subprocess.run(cmd,cwd=ROOT).returncode)
finally:
 if config and config.exists():config.unlink()
