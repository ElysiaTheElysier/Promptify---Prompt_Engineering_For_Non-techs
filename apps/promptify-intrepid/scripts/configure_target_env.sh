#!/usr/bin/env bash
# Source this file AFTER starting Cloud SQL Auth Proxy on localhost:5433.
# Owner access is for migration tools only. Never deploy this credential to Cloud Run.
read -r -p 'Database owner username [postgres]: ' task_user
task_user=${task_user:-postgres}
read -r -s -p 'Database owner password: ' task_password
printf '\n'
export PGHOST=127.0.0.1 PGPORT=5433 PGDATABASE="${INTREPID_DATABASE_NAME:-promptify_db}" PGUSER="$task_user" PGPASSWORD="$task_password"
export TARGET_DATABASE_URL=$(node -e 'const e=process.env;process.stdout.write(`postgresql://${encodeURIComponent(e.PGUSER)}:${encodeURIComponent(e.PGPASSWORD)}@127.0.0.1:5433/${encodeURIComponent(e.PGDATABASE)}`)')
export DATABASE_URL="$TARGET_DATABASE_URL"
export EMBEDDING_PROVIDER=cloudsql EMBEDDING_MODEL=text-multilingual-embedding-002 GCP_VECTOR_MODE=pgvector
unset task_password task_user
printf 'Target environment configured. Credentials were not written to disk.\n'
