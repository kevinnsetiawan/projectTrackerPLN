#!/usr/bin/env bash
set -Eeuo pipefail
name=protrack-root-hash-check
docker inspect "$name" >/dev/null 2>&1 && exit 1
trap 'docker rm -fv "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$name" --network none -e POSTGRES_PASSWORD=temporary postgres:17-bookworm >/dev/null
for n in {1..30}; do docker exec "$name" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$name" createdb -U postgres restored
backup=${1:-/var/backups/protrack/protrack-20261105T124510Z.dump}
docker exec -i "$name" pg_restore -U postgres -d restored --no-owner --exit-on-error < "$backup"
before=$(docker exec "$name" psql -U postgres -d restored -Atc "SELECT password_hash FROM users WHERE lower(email)='dilankanjut@gmail.com'")
after=$(docker exec deploy-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT password_hash FROM users"')
[[ -n "$before" && "$before" == "$after" ]]
unset before after
echo 'Root password hash preserved since pre-deploy backup'
