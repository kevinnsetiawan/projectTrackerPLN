#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/protrack
umask 077
backup_dir=/var/backups/protrack
mkdir -p "$backup_dir"
free_kib=$(df -Pk "$backup_dir" | awk 'NR==2 {print $4}')
if [[ -z "$free_kib" || "$free_kib" -lt 10485760 ]]; then
  echo "backup aborted: less than 10 GiB free" >&2
  exit 1
fi
stamp=$(date -u +%Y%m%dT%H%M%SZ)
tmp="$backup_dir/.protrack-${stamp}.dump.tmp"
out="$backup_dir/protrack-${stamp}.dump"
trap 'rm -f -- "$tmp"' EXIT
compose_file=/opt/protrack/deploy/docker-compose.yml
docker compose --env-file /opt/protrack/.env -f "$compose_file" exec -T db pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$tmp"
test -s "$tmp"
mv -n "$tmp" "$out"
sha256sum "$out" > "$out.sha256"
if [[ "${PVE_BACKUP_REQUIRED:-1}" != 1 ]]; then
  mapfile -t dumps < <(find "$backup_dir" -maxdepth 1 -type f -name 'protrack-*.dump' -printf '%T@ %p\n' | sort -nr | awk 'NR>7 {print $2}')
  for dump in "${dumps[@]}"; do rm -f -- "$dump" "$dump.sha256"; done
fi
