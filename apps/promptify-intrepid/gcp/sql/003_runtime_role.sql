-- Apply after baseline, with migration-owner permissions. Password is set via psql \password, never committed.
CREATE ROLE promptify_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT authenticated,service_role TO promptify_runtime;
-- In psql run: \password promptify_runtime
-- Cloud Run uses this login; do not use postgres/migration-owner as runtime PGUSER.
