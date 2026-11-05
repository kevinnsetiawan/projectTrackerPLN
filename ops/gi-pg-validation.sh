#!/usr/bin/env bash
set -Eeuo pipefail
network=protrack-gi-test-isolated
db=protrack-gi-test-postgres
snapshot=/root/protrack-gi-snapshots/warnoto-gi-004.json
expected=5eb87a24e2df5ba049c63585ff475dd999267dcadffebcf13df402709ba9fd90
if docker inspect "$db" >/dev/null 2>&1 || docker network inspect "$network" >/dev/null 2>&1; then echo 'Test resource exists; refusing to modify it' >&2; exit 1; fi
[[ "$(sha256sum "$snapshot" | awk '{print $1}')" == "$expected" ]]
stage=$(mktemp -d /tmp/protrack-gi-test.XXXXXX)
cleanup() {
  docker rm -fv "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  [[ "$stage" == /tmp/protrack-gi-test.* ]] && rm -rf -- "$stage"
}
trap cleanup EXIT
tar -xzf /tmp/protrack-gi-tests.tar.gz -C "$stage"
docker network create --internal "$network" >/dev/null
password=$(openssl rand -hex 24)
docker run -d --name "$db" --network "$network" -e POSTGRES_PASSWORD="$password" postgres:17-bookworm >/dev/null
for n in {1..60}; do docker exec "$db" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$db" pg_isready -U postgres >/dev/null
for suite in local unit-foundation upt-isolation gardu-induk-api warnoto-import; do
  database="test_${suite//-/_}"
  docker exec "$db" createdb -U postgres "$database"
  echo "=== PostgreSQL 17: $suite ==="
  docker run --rm --network "$network" -v "$stage:/work" -w /work -e NODE_ENV=test \
    -e UNIT_TEST_PG_URL="postgresql://postgres:$password@$db:5432/$database" --entrypoint sh protrack-test-build \
    -c 'ln -s /app/node_modules /work/node_modules 2>/dev/null || true; node "test-$1.mjs"' sh "$suite"
done
docker exec "$db" createdb -U postgres test_migration_cli
migration_url="postgresql://postgres:$password@$db:5432/test_migration_cli"
docker run --rm --network "$network" -v "$stage:/work" -w /work -e UNIT_TEST_PG_URL="$migration_url" --entrypoint node protrack-test-build ops/init-empty-gi-pg.mjs
docker exec "$db" psql -v ON_ERROR_STOP=1 -U postgres -d test_migration_cli -q -c "INSERT INTO units(id,code,name,kind) VALUES(1,'OLD','Old','upt'); INSERT INTO projects(id,unit_id,kode,nama,tipe,uip,lokasi,kontraktor) VALUES(1,1,'OLD-P','Old','GI','Old','kept','Old'); INSERT INTO lokasis(project_id,unit_id,nama,latitude,longitude) VALUES(1,1,'kept',-7,112); ALTER TABLE lokasis DROP CONSTRAINT lokasis_project_unit_fk; ALTER TABLE lokasis DROP CONSTRAINT lokasis_gardu_unit_fk; ALTER TABLE lokasis DROP COLUMN unit_id;"
for mode in dry apply repeat; do
  args=()
  [[ "$mode" == dry ]] || args+=(--apply)
  docker run --rm --network "$network" -v "$stage:/work" -w /work -e GI_MIGRATION_DATABASE_URL="$migration_url" --entrypoint node protrack-test-build server/scripts/migrate-warnoto-gi.js --confirm-db=test_migration_cli "${args[@]}"
  if [[ "$mode" == dry ]]; then
    [[ "$(docker exec "$db" psql -U postgres -d test_migration_cli -Atc "SELECT count(*) FROM information_schema.columns WHERE table_name='lokasis' AND column_name='unit_id'")" == 0 ]]
  fi
done
[[ "$(docker exec "$db" psql -U postgres -d test_migration_cli -Atc "SELECT count(*) FROM lokasis WHERE unit_id=1 AND nama='kept' AND latitude=-7 AND longitude=112")" == 1 ]]
echo 'Migration CLI dry-run, apply, repeat and legacy location preserved'
docker exec "$db" createdb -U postgres test_actual
url="postgresql://postgres:$password@$db:5432/test_actual"
docker run --rm --network "$network" -v "$stage:/work" -w /work -e UNIT_TEST_PG_URL="$url" --entrypoint node protrack-test-build ops/init-empty-gi-pg.mjs
for mode in dry apply repeat; do
  args=()
  [[ "$mode" == dry ]] || args+=(--apply)
  echo "=== Real snapshot: $mode ==="
  docker run --rm --network "$network" -v "$stage:/work" -v "$snapshot:/snapshot/warnoto.json:ro" -w /work \
    -e GI_IMPORT_DATABASE_URL="$url" --entrypoint node protrack-test-build server/scripts/import-warnoto-gi.js \
    --snapshot=/snapshot/warnoto.json --sha256="$expected" --confirm-db=test_actual "${args[@]}"
  if [[ "$mode" == dry ]]; then
    [[ "$(docker exec "$db" psql -U postgres -d test_actual -Atc 'SELECT count(*) FROM units')" == 0 ]]
  else
    identities=$(docker exec "$db" psql -U postgres -d test_actual -Atc "SELECT md5(string_agg(source_id || ':' || id, ',' ORDER BY source_id)) FROM gardu_induk WHERE source_system='warnoto'")
    if [[ "$mode" == apply ]]; then first_identities=$identities; else [[ "$identities" == "$first_identities" ]]; fi
  fi
done
result=$(docker exec "$db" psql -U postgres -d test_actual -Atc "SELECT (SELECT count(*) FROM units WHERE source_system='warnoto') || ':' || (SELECT count(*) FROM gardu_induk WHERE source_system='warnoto') || ':' || (SELECT count(*) FROM units WHERE source_id='UPT-SBY' AND code='UPT-SBYA')")
[[ "$result" == '7:189:1' ]] || { echo "Unexpected target counts: $result" >&2; exit 1; }
echo 'Real snapshot idempotence and canonical Surabaya code verified'
