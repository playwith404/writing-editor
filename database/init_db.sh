#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-gleey}"
DB_USER="${DB_USER:-gleey}"
DB_PASSWORD="${DB_PASSWORD:-}"
SCHEMA_FILE_DEFAULT="$(cd "$(dirname "$0")" && pwd)/schema.sql"
SCHEMA_FILE="${SCHEMA_FILE:-$SCHEMA_FILE_DEFAULT}"
APPLY_SCHEMA="${APPLY_SCHEMA:-1}"

PSQL_CMD=(psql -v ON_ERROR_STOP=1)
USE_SUDO=0
if [ "$(id -u)" -eq 0 ] && command -v sudo >/dev/null 2>&1; then
  PSQL_CMD=(sudo -u postgres psql -v ON_ERROR_STOP=1)
  USE_SUDO=1
fi

"${PSQL_CMD[@]}" -v db_user="$DB_USER" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')\gexec
SQL

if [ -n "$DB_PASSWORD" ]; then
  "${PSQL_CMD[@]}" -v db_user="$DB_USER" -v db_password="$DB_PASSWORD" <<'SQL'
ALTER ROLE :db_user WITH PASSWORD :'db_password';
SQL
fi

"${PSQL_CMD[@]}" -v db_name="$DB_NAME" -v db_user="$DB_USER" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')\gexec
SQL

if [ "$APPLY_SCHEMA" = "1" ] && [ -f "$SCHEMA_FILE" ]; then
  schema_path="$SCHEMA_FILE"
  tmp_schema=""
  if [ "$USE_SUDO" = "1" ]; then
    tmp_schema=$(mktemp /tmp/gleey-schema-XXXX.sql)
    cp "$SCHEMA_FILE" "$tmp_schema"
    chmod 644 "$tmp_schema"
    schema_path="$tmp_schema"
  fi

  "${PSQL_CMD[@]}" -d "$DB_NAME" -f "$schema_path"

  # When schema is applied via sudo/postgres, created tables can be owned by postgres.
  # Ensure the application role can access (and owns) all objects in public schema.
  "${PSQL_CMD[@]}" -d "$DB_NAME" -v db_user="$DB_USER" <<'SQL'
SELECT format('ALTER TABLE %I.%I OWNER TO %I', schemaname, tablename, :'db_user')
FROM pg_tables
WHERE schemaname = 'public'
\gexec

SELECT format('ALTER SEQUENCE %I.%I OWNER TO %I', sequence_schema, sequence_name, :'db_user')
FROM information_schema.sequences
WHERE sequence_schema = 'public'
\gexec

ALTER SCHEMA public OWNER TO :"db_user";
GRANT USAGE ON SCHEMA public TO :"db_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"db_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"db_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"db_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"db_user";
SQL

  if [ -n "$tmp_schema" ] && [ -f "$tmp_schema" ]; then
    rm -f "$tmp_schema"
  fi
fi

cat <<MSG
Database ready.
- name: ${DB_NAME}
- owner: ${DB_USER}
- schema: ${SCHEMA_FILE}
MSG
