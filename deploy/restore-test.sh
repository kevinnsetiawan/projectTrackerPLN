#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/protrack
backup=${1:?usage: restore-test.sh /var/backups/protrack/protrack-*.dump}
test -s "$backup"
name="protrack-restore-test-$(date -u +%Y%m%d%H%M%S)"
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=restore-test postgres:17-bookworm >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
for _ in {1..30}; do
  docker exec "$name" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$name" createdb -U postgres restored
cat "$backup" | docker exec -i "$name" pg_restore -U postgres -d restored --no-owner --exit-on-error
docker exec "$name" psql -U postgres -d restored -Atc "select case when to_regclass('public.users') is not null and (select count(*) from users) > 0 then 1 else 0 end" | grep -qx 1
echo "restore test passed: $backup"
