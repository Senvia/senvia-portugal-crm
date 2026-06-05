#!/usr/bin/env bash
# Dumps schema + auth + public data from OLD and restores into NEW.
# Requires: pg_dump / psql (PostgreSQL client 15+) and migration/.env filled in.
# Run STEP 1 (01-extensions.sql) on the NEW project BEFORE this.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$HERE/.env"
mkdir -p "$HERE/dumps"

echo "==> [1/3] Schema (public, structure only)"
pg_dump "$OLD_DB_URL" --schema=public --schema-only --no-owner -f "$HERE/dumps/schema.sql"
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f "$HERE/dumps/schema.sql"

echo "==> [2/3] Auth data (users + identities + mfa_factors, triggers disabled)"
# --disable-triggers stops handle_new_user etc. from firing (which would create
# duplicate profiles that then collide with the public-data restore).
pg_dump "$OLD_DB_URL" --data-only --no-owner --disable-triggers \
  -t auth.users -t auth.identities -t auth.mfa_factors \
  -f "$HERE/dumps/auth.sql"
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f "$HERE/dumps/auth.sql"

echo "==> [3/3] Public data (triggers disabled, so automations/emails don't fire)"
pg_dump "$OLD_DB_URL" --schema=public --data-only --no-owner --disable-triggers \
  -f "$HERE/dumps/data.sql"
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f "$HERE/dumps/data.sql"

echo "==> Data transfer done."
echo "    Next: run sql/50-grants.sql, sql/70-patch-refs.sql, sql/60-realtime.sql,"
echo "    sql/80-crons-export.sql, then deploy-functions.sh and storage-sync.mjs."
