#!/bin/sh
set -eu
network=protrack-upt-test-isolated
db=protrack-upt-test-postgres
stage=/tmp/protrack-upt-test-source
password=$(openssl rand -hex 24)
cleanup() {
  docker rm -fv "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
if docker container inspect "$db" >/dev/null 2>&1 || docker network inspect "$network" >/dev/null 2>&1; then
  echo 'Test resource name already exists; refusing to touch it.' >&2
  trap - EXIT
  exit 1
fi
mkdir -p "$stage"
tar -xzf /tmp/protrack-upt-tests.tar.gz -C "$stage"
docker network create --internal "$network" >/dev/null
docker run -d --name "$db" --network "$network" -e POSTGRES_PASSWORD="$password" postgres:17-bookworm >/dev/null
attempt=0
until docker exec "$db" pg_isready -U postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 60 ] || exit 1
  sleep 1
done
docker exec "$db" createdb -U postgres migration_idempotence
echo '=== PostgreSQL 17: migration idempotence ==='
docker run --rm --network "$network" -v "$stage:/work" -w /work \
  -e NODE_ENV=test -e SEED_DEMO=0 -e DB_DRIVER=pg \
  -e DATABASE_URL="postgresql://postgres:$password@$db:5432/migration_idempotence" \
  --entrypoint sh deploy-app -c '
    set -e
    ln -s /app/node_modules /work/node_modules 2>/dev/null || true
    node --input-type=module -e "const db=await import(\"./server/_lib/db.js\"); await db.query(\"INSERT INTO users(nama,email,password_hash,role) VALUES (\$1,\$2,\$3,\$4)\",[\"Root\",\"dilankanjut@gmail.com\",\"test\",\"admin\"]); await db.getPool().end()"
    node server/scripts/migrate-units.js --promote-verified-root --enforce-not-null
    node server/scripts/migrate-units.js --promote-verified-root --enforce-not-null
  '
result=$(docker exec "$db" psql -U postgres -d migration_idempotence -Atc "SELECT is_superadmin::int || ':' || auth_version || ':' || (SELECT count(*) FROM audit_logs WHERE action='promote_verified_root') FROM users WHERE email='dilankanjut@gmail.com'")
[ "$result" = '1:2:1' ] || { echo "Unexpected migration state: $result" >&2; exit 1; }
echo 'Migration idempotence passed'
for suite in local unit-foundation upt-isolation; do
  database=$(printf '%s' "$suite" | tr '-' '_')
  docker exec "$db" createdb -U postgres "$database"
  echo "=== PostgreSQL 17: $suite ==="
  docker run --rm --network "$network" -v "$stage:/work" -w /work \
    -e NODE_ENV=test -e UNIT_TEST_PG_URL="postgresql://postgres:$password@$db:5432/$database" \
    --entrypoint sh deploy-app -c 'ln -s /app/node_modules /work/node_modules 2>/dev/null || true; node "test-$1.mjs"' sh "$suite"
done
