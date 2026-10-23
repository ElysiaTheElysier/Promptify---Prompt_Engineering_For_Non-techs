-- READ ONLY. Run with a read-only source connection; no application row data exported.
-- Save the JSON result as live-catalog.json for drift comparison.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_build_object(
 'status','live-source catalog snapshot',
 'version',version(),
 'extensions',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',extname,'version',extversion)),'[]'::jsonb) FROM pg_extension),
 'tables',(SELECT coalesce(jsonb_agg(jsonb_build_object('tablename',tablename) ORDER BY tablename),'[]'::jsonb) FROM pg_tables WHERE schemaname='public'),
 'columns',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY table_name,ordinal_position),'[]'::jsonb) FROM (SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public') x),
 'constraints',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY table_name,name),'[]'::jsonb) FROM (SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') x),
 'indexes',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY tablename,indexname),'[]'::jsonb) FROM (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public') x),
 'functions',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY name,arguments),'[]'::jsonb) FROM (SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_function_result(p.oid) AS result,p.prosecdef AS security_definer,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f') x),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY tablename,policyname),'[]'::jsonb) FROM (SELECT * FROM pg_policies WHERE schemaname='public') x),
 'triggers',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY table_name,name),'[]'::jsonb) FROM (SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) x),
 'sequences',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM information_schema.sequences x WHERE sequence_schema='public'),
 'grants',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY table_name,grantee,privilege_type),'[]'::jsonb) FROM (SELECT grantee,table_name,privilege_type FROM information_schema.table_privileges WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role')) x)
);
COMMIT;
