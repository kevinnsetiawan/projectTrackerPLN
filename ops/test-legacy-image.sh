#!/usr/bin/env bash
set -Eeuo pipefail
tmp=$(mktemp -d /tmp/protrack-legacy-test.XXXXXX)
trap 'rm -rf -- "$tmp"' EXIT
id=$(docker image inspect --format '{{.Id}}' protrack-test-build)
printf 'FROM %s\nRUN npm prune --omit=dev\n' "$id" > "$tmp/Dockerfile"
DOCKER_BUILDKIT=0 docker build -t protrack-test-runtime "$tmp"
