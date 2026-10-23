"""Build a seed-free Intrepid PostgreSQL candidate from immutable repo migrations.
Requires pglast==8.5; accepts --module-dir for an isolated installation.
No database/network connections, no production data reads, no source migration edits.
"""
from pathlib import Path
import argparse,sys,json,hashlib
args=argparse.ArgumentParser();args.add_argument('--module-dir');opt=args.parse_args()
if opt.module_dir:sys.path.insert(0,opt.module_dir)
from pglast import parse_sql,parser
from pglast.stream import RawStream
root=Path(__file__).resolve().parents[1];out=root/'docs/intrepid-google-cloud';out.mkdir(parents=True,exist_ok=True)
files=[root/'supabase/schema.sql',*sorted((root/'supabase/migrations').glob('*.sql'))]
manifest=[];included=[];excluded=[];objects=[]
data_do={'016_add_server_backed_lesson_progress.sql','040_product_public_basic.sql','041_product_public_basic_curriculum.sql','046_product_isolated_trial_curriculum.sql'}
allowed={'CreateStmt','AlterTableStmt','IndexStmt','CreateFunctionStmt','CreateTrigStmt','CreatePolicyStmt','AlterPolicyStmt','GrantStmt','GrantRoleStmt','CreateSeqStmt','AlterSeqStmt','DropStmt','DoStmt','CommentStmt','RuleStmt','ViewStmt','CompositeTypeStmt','CreateEnumStmt','AlterEnumStmt','RenameStmt'}
for p in files:
 text=p.read_text(encoding='utf-8-sig');raw=parse_sql(text);tree=json.loads(parser.parse_sql_json(text))['stmts'];relative=p.relative_to(root).as_posix();manifest.append({'path':relative,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'statements':len(raw)})
 for i,(node,j) in enumerate(zip(raw,tree)):
  kind=next(iter(j['stmt']));body=j['stmt'][kind];sql=RawStream()(node.stmt)+';';reason=None
  if kind not in allowed:reason='data/transaction/notification/platform statement; not schema DDL'
  if kind=='DoStmt' and (p.name in data_do or p.name=='026_rebuild_message_realtime.sql'):reason='data seed/backfill/diagnostic or Supabase publication block'
  if 'product_dispatch_roster_worker' in sql:reason='Supabase Vault/pg_net dispatcher; replace with Cloud Scheduler OIDC'
  if kind=='CreateExtensionStmt':reason='platform extension; not required for retained application DDL'
  entry={'source':relative,'ordinal':i+1,'kind':kind,'sql':sql}
  if reason:excluded.append({**entry,'reason':reason});continue
  included.append(entry)
  if kind in {'CreateStmt','CreateFunctionStmt','CreateTrigStmt','CreatePolicyStmt','IndexStmt','CreateSeqStmt','ViewStmt','AlterTableStmt','DoStmt','GrantStmt'}:objects.append({**entry,'ast':body})
bootstrap="""-- Intrepid Cloud SQL candidate. Fresh EMPTY staging database only.
-- Source-derived and offline tested; live catalog drift must be checked before cutover.
-- Supabase API/Auth/Storage/Realtime are NOT implemented by this file.
-- Migration owner executes this file. Runtime roles remain NOLOGIN.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
-- These functions consume SERVER-VERIFIED transaction-local claims, not browser input.
-- Preserve legacy UUID subjects for existing RPCs. Firebase/Google subjects need mapping.
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),auth.jwt()->>'sub')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(),auth.uid() TO authenticated,service_role;
"""
sql=bootstrap+'\n'+ '\n\n'.join('-- '+e['source']+' statement '+str(e['ordinal'])+'\n'+e['sql'] for e in included)
# Retain trusted service access without requesting BYPASSRLS (Cloud SQL compatibility).
# This role is backend-only, matching the source service-role trust boundary.
post="""
-- Cloud adaptation: backend-only trusted-service policies (NOT learner policies).
-- No browser, analyst, instructor or learner may receive service_role membership.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('CREATE POLICY gcp_trusted_backend ON %I.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',t.schemaname,t.tablename);
 END LOOP;
END $$;
-- Supabase normally provisions trusted-service grants outside repo migrations.
-- Recreate that backend-only capability explicitly; no BYPASSRLS required.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
-- Prevent default PUBLIC function execution; explicit source role grants remain.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA auth FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- Identity adapter table: preserve business UUIDs and old auth UUID subjects.
-- external_subject is opaque text; never cast a Firebase/Google subject to UUID.
CREATE TABLE public.gcp_identity_bindings (
 issuer text NOT NULL, external_subject text NOT NULL,
 user_id uuid NOT NULL REFERENCES public.users(id),
 legacy_subject uuid NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(issuer,external_subject), UNIQUE(user_id,issuer)
);
ALTER TABLE public.gcp_identity_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcp_identity_bindings FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gcp_identity_bindings TO service_role;
CREATE POLICY gcp_identity_backend ON public.gcp_identity_bindings TO service_role USING(true) WITH CHECK(true);
"""
(out/'cloud-sql-schema.candidate.sql').write_text(sql+post,encoding='utf-8')
(out/'source-schema.ddl.sql').write_text('-- Source-derived DDL only; requires original Supabase platform. NOT a live dump.\n'+'\n\n'.join(e['sql'] for e in included),encoding='utf-8')
(out/'migration-manifest.json').write_text(json.dumps({'status':'repository-derived; not live database schema','files':manifest,'included_statements':len(included),'excluded_statements':[{k:v for k,v in e.items() if k!='sql'} for e in excluded]},indent=2),encoding='utf-8')
(out/'schema-objects.source.json').write_text(json.dumps(objects,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'excluded-statements.review.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2),encoding='utf-8')
# Read-only runtime contract scan. Static candidates; dynamic SQL/functions remain in DDL.
import re
refs={'tables':{},'rpcs':{},'actions':{},'storage_buckets':{}}
for p in (root/'apps/promptify-intrepid').rglob('*'):
 if p.suffix not in {'.ts','.tsx'} or not ('src' in p.relative_to(root/'apps/promptify-intrepid').parts or 'api' in p.relative_to(root/'apps/promptify-intrepid').parts):continue
 if any(x in p.parts for x in ['node_modules','dist','outputs']):continue
 text=p.read_text(encoding='utf-8-sig');rel=p.relative_to(root).as_posix()
 for key,pattern in [('tables',r"\.from\(['\"]([\w-]+)['\"]\)"),('rpcs',r"\.rpc(?:<[^>]+>)?\(['\"]([\w]+)['\"]"),('actions',r"case ['\"]([\w]+)['\"]:")]:
  for name in set(re.findall(pattern,text)):
   target='storage_buckets' if key=='tables' and '-' in name else key
   refs[target].setdefault(name,[]).append(rel)
(out/'runtime-contracts.json').write_text(json.dumps(refs,indent=2),encoding='utf-8')
print(f'{len(files)} source files; {len(included)} retained DDL statements; {len(excluded)} classified omissions. Generated {out}')
