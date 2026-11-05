#!/usr/bin/env bash
set -Eeuo pipefail
sha=fe8f1905d3ce4a286468094bedd0868970729f6f
state=/var/lib/protrack-deploy
[[ "$(cat "$state/BLOCKED")" == "$sha" ]]
cmp "$state/backup.request" "$state/backup.ack"
[[ "$(docker inspect -f '{{.Image}}' deploy-app-1)" == "$(docker image inspect -f '{{.Id}}' "protrack-release:$sha")" ]]
[[ "$(docker inspect -f '{{.State.Health.Status}}' deploy-app-1)" == healthy ]]
chmod 0644 "$state/releases/$sha/dist/release.json"
docker stop protrack-maintenance >/dev/null
if ! docker compose -p deploy --env-file /opt/protrack/.env -f /opt/protrack/deploy/docker-compose.yml -f /etc/protrack-deploy/compose-deploy.yml up -d --no-build --no-deps --force-recreate web; then
  docker stop deploy-web-1 >/dev/null 2>&1 || true
  docker start protrack-maintenance >/dev/null
  exit 1
fi
if ! curl -fsS http://10.99.9.21:8080/release.json | grep -Fq "\"$sha\""; then
  docker stop deploy-web-1 >/dev/null 2>&1 || true
  docker start protrack-maintenance >/dev/null
  exit 1
fi
docker update --restart=unless-stopped deploy-web-1 deploy-app-1 >/dev/null
printf '%s\n' "$sha" > "$state/current-sha.tmp"
mv "$state/current-sha.tmp" "$state/current-sha"
rm -f "$state/BLOCKED" "$state/failed-sha" "$state/approved-schema-sha"
echo "Recovered and verified $sha"
