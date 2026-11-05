#!/usr/bin/env bash
set -Eeuo pipefail
source_dir=/opt/protrack-release-20261105T095813Z
docker build --target build -t protrack-test-build -f "$source_dir/deploy/Dockerfile" "$source_dir"
id=$(docker image inspect --format '{{.Id}}' protrack-test-build)
docker run --rm --network none -e NODE_ENV=test "$id" sh -c 'npm test && node test-unit-foundation.mjs && node test-upt-isolation.mjs' >/tmp/protrack-build-test.log 2>&1 || { tail -30 /tmp/protrack-build-test.log; exit 1; }
tmp=$(mktemp -d /tmp/protrack-image-test.XXXXXX)
trap 'rm -rf -- "$tmp"' EXIT
printf 'FROM %s\nRUN npm prune --omit=dev\n' "$id" > "$tmp/Dockerfile"
docker build -t protrack-test-runtime "$tmp"
echo 'Tested build image and derived runtime succeeded'
