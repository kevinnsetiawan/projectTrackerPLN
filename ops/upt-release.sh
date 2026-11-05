#!/bin/sh
set -eu
archive=${1:?archive required}
expected=${2:?sha256 required}
printf '%s  %s\n' "$expected" "$archive" | sha256sum -c -
docker inspect protrack-maintenance >/dev/null
docker volume inspect deploy_postgres_data >/dev/null
grep -qx 'SEED_DEMO=0' /opt/protrack/.env
stamp=$(date -u +%Y%m%dT%H%M%SZ)
stage="/opt/protrack-release-$stamp"
previous="/opt/protrack-previous-$stamp"
mkdir "$stage" "$previous"
tar -xzf "$archive" -C "$stage"
docker image tag deploy-app:latest "protrack-precutover:$stamp"
docker build -t "protrack-release:$expected" -f "$stage/deploy/Dockerfile" "$stage"
docker image tag "protrack-release:$expected" deploy-app:latest
for name in api server deploy dist ops package.json package-lock.json; do
  [ ! -e "/opt/protrack/$name" ] || mv "/opt/protrack/$name" "$previous/$name"
  cp -a "$stage/$name" /opt/protrack/
done
cd /opt/protrack
docker compose -p deploy --env-file /opt/protrack/.env -f deploy/docker-compose.yml up -d --no-build --no-deps --force-recreate app
attempt=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' deploy-app-1)" = healthy ]; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 60 ] || { echo 'New app did not become healthy; maintenance remains active' >&2; exit 1; }
  sleep 2
done
docker compose -p deploy --env-file /opt/protrack/.env -f deploy/docker-compose.yml exec -T app node server/scripts/migrate-units.js --promote-verified-root --enforce-not-null
docker cp /opt/protrack/ops/upt-verify.mjs deploy-app-1:/tmp/upt-verify.mjs
docker exec -i deploy-app-1 node /tmp/upt-verify.mjs < /root/protrack-admin.json
printf 'Release staged: %s\nPrevious files: %s\nImage: protrack-release:%s\n' "$stage" "$previous" "$expected"
