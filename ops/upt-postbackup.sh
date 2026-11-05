#!/bin/sh
set -eu
systemctl start protrack-backup.service
backup=$(find /var/backups/protrack -maxdepth 1 -type f -name 'protrack-*.dump' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
sha256sum -c "$backup.sha256"
/opt/protrack/deploy/restore-test.sh "$backup"
name=protrack-upt-compare-restore
if docker inspect "$name" >/dev/null 2>&1; then echo 'Restore resource already exists' >&2; exit 1; fi
cleanup() { docker rm -fv "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$name" --network none -e POSTGRES_PASSWORD=temporary postgres:17-bookworm >/dev/null
attempt=0
until docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1)); [ "$attempt" -lt 60 ] || exit 1; sleep 1
done
docker exec "$name" createdb -U postgres before_cutover
docker exec "$name" createdb -U postgres after_cutover
cat /var/backups/protrack/protrack-20261105T095313Z.dump | docker exec -i "$name" pg_restore -U postgres -d before_cutover --no-owner --exit-on-error
cat "$backup" | docker exec -i "$name" pg_restore -U postgres -d after_cutover --no-owner --exit-on-error
before=$(docker exec "$name" psql -U postgres -d before_cutover -Atc "SELECT password_hash FROM users WHERE lower(email)='dilankanjut@gmail.com'")
after=$(docker exec "$name" psql -U postgres -d after_cutover -Atc "SELECT password_hash FROM users WHERE lower(email)='dilankanjut@gmail.com'")
[ -n "$before" ] && [ "$before" = "$after" ] || { echo 'Root password hash differs' >&2; exit 1; }
unset before after
echo 'Root password hash preserved'
printf 'Post-cutover backup: %s\n' "$backup"
