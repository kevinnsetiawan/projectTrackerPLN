#!/bin/sh
set -eu
cd /opt/protrack
docker stop protrack-maintenance >/dev/null
if ! docker compose -p deploy --env-file /opt/protrack/.env -f deploy/docker-compose.yml up -d --no-build --no-deps web; then
  docker stop deploy-web-1 >/dev/null 2>&1 || true
  docker start protrack-maintenance >/dev/null
  exit 1
fi
code=$(curl -s -o /dev/null -w '%{http_code}' http://10.99.9.21:8080/)
if [ "$code" != 200 ]; then
  docker stop deploy-web-1 >/dev/null
  docker start protrack-maintenance >/dev/null
  echo "Web returned HTTP $code; maintenance restored" >&2
  exit 1
fi
echo 'Web active'
