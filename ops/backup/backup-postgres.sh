#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to the production PostgreSQL URL}"
: "${RESTIC_REPOSITORY:?Set an encrypted restic repository}"
: "${RESTIC_PASSWORD_FILE:?Set RESTIC_PASSWORD_FILE}"

backup_dir="$(mktemp -d)"
dump_file="$backup_dir/valorbuddy.dump"
cleanup() { rm -f "$dump_file"; rmdir "$backup_dir" 2>/dev/null || true; }
trap cleanup EXIT

pg_dump --dbname="$DATABASE_URL" --format=custom --compress=9 --file="$dump_file"
pg_restore --list "$dump_file" >/dev/null
restic backup "$dump_file" --tag valorbuddy-postgres --host valorbuddy-production
restic forget --tag valorbuddy-postgres --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
restic check --read-data-subset=5%

