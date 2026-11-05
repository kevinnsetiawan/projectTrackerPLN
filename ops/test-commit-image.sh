#!/usr/bin/env bash
set -Eeuo pipefail
id=$(docker image inspect --format '{{.Id}}' protrack-test-build)
container=$(docker create "$id" sh -c 'npm prune --omit=dev && npm cache clean --force')
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker start -a "$container" >/dev/null
docker commit --change 'ENV NODE_ENV=production' --change 'ENV PORT=4000' --change 'LABEL org.opencontainers.image.revision=test' --change 'CMD ["node", "server/local-server.js"]' "$container" protrack-test-commit >/dev/null
[[ "$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' protrack-test-commit)" == test ]]
echo 'Derived runtime from tested build image succeeded'
