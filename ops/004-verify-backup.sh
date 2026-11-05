#!/usr/bin/env bash
set -Eeuo pipefail
pre=${1:?pre-migration dump required}
post=${2:?post-migration dump required}
name=protrack-004-restore-check
if docker inspect "$name" >/dev/null 2>&1; then echo 'Restore container exists; refusing to touch it' >&2; exit 1; fi
cleanup() { docker rm -fv "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$name" --network none -e POSTGRES_PASSWORD=temporary-restore-test postgres:17-bookworm >/dev/null
for n in {1..60}; do docker exec "$name" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$name" pg_isready -U postgres >/dev/null
docker exec "$name" createdb -U postgres before_migration
docker exec "$name" createdb -U postgres after_migration
docker exec -i "$name" pg_restore -U postgres -d before_migration --no-owner --exit-on-error < "$pre"
docker exec -i "$name" pg_restore -U postgres -d after_migration --no-owner --exit-on-error < "$post"
before=$(docker exec "$name" psql -U postgres -d before_migration -Atc "SELECT password_hash FROM users WHERE lower(email)='dilankanjut@gmail.com' AND active")
after=$(docker exec "$name" psql -U postgres -d after_migration -Atc "SELECT password_hash FROM users WHERE lower(email)='dilankanjut@gmail.com' AND active")
[[ -n "$before" && "$before" == "$after" ]]
unset before after
result=$(docker exec "$name" psql -U postgres -d after_migration -Atc "SELECT (SELECT count(*) FROM units WHERE source_system='warnoto' AND kind='unit_induk') || ':' || (SELECT count(*) FROM units WHERE source_system='warnoto' AND kind='upt') || ':' || (SELECT count(*) FROM gardu_induk WHERE source_system='warnoto')")
[[ "$result" == 1:6:189 ]]
echo 'Post-migration restore includes canonical master and preserved root credentials'
