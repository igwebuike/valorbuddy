#!/usr/bin/env bash
set -euo pipefail
: "${DR_DATABASE_URL:?Set DR_DATABASE_URL to an isolated disposable DR database}"
: "${RESTIC_REPOSITORY:?Set RESTIC_REPOSITORY}"
: "${RESTIC_PASSWORD_FILE:?Set RESTIC_PASSWORD_FILE}"

case "$DR_DATABASE_URL" in
  *staging*|*test*|*dr*) ;;
  *) echo "Refusing restore: DR_DATABASE_URL must identify staging, test, or dr." >&2; exit 2 ;;
esac
if [[ "${DATABASE_URL:-}" == "$DR_DATABASE_URL" ]]; then
  echo "Refusing restore into the source database." >&2
  exit 2
fi

restore_dir="$(mktemp -d)"
cleanup() { rm -f "$restore_dir/valorbuddy.dump"; rmdir "$restore_dir" 2>/dev/null || true; }
trap cleanup EXIT
restic restore latest --tag valorbuddy-postgres --target "$restore_dir"
dump_file="$(find "$restore_dir" -name valorbuddy.dump -type f -print -quit)"
test -n "$dump_file"
pg_restore --dbname="$DR_DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$dump_file"
psql "$DR_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM users;"
psql "$DR_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM partner_organizations;"

