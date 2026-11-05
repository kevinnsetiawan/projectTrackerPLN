#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
sha=${1:?production commit SHA required}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
state=/var/lib/protrack-deploy
repo=$state/repo.git
stage="$state/manual-stage/$sha"
helpers="$state/manual-helpers/$sha"
[[ -d "$state/manual-helpers" && ! -L "$state/manual-helpers" && "$(stat -c '%u:%a' "$state/manual-helpers")" == 0:700 ]]
[[ -d "$helpers" && ! -L "$helpers" && "$(stat -c '%u:%a' "$helpers")" == 0:700 ]]
[[ -f "$helpers/004-stage.sh" && ! -L "$helpers/004-stage.sh" && "$(stat -c '%u:%a' "$helpers/004-stage.sh")" == 0:600 ]]
[[ "$(realpath "$0")" == "$helpers/004-stage.sh" ]]
export GIT_SSH_COMMAND='ssh -i /etc/protrack-deploy/github_readonly_ed25519 -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/protrack-deploy/github_known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15'
exec 9>"$state/deploy.lock"
flock -n 9 || { echo 'Another deployment is active' >&2; exit 1; }
[[ ! -e "$state/BLOCKED" && -s "$state/current-sha" ]]
git --git-dir="$repo" fetch --no-tags origin '+refs/heads/production:refs/remotes/origin/production'
[[ "$(git --git-dir="$repo" rev-parse refs/remotes/origin/production^{commit})" == "$sha" ]]
git --git-dir="$repo" merge-base --is-ancestor "$(cat "$state/current-sha")" "$sha"
[[ "$(df -Pk /var/lib/docker | awk 'NR==2 {print $4}')" -ge 10485760 ]]
[[ ! -e "$stage" ]] || { echo 'Manual stage already exists; inspect it first' >&2; exit 1; }
install -d -m 0700 "$stage/source"
git --git-dir="$repo" archive "$sha" | tar -x -C "$stage/source"
docker build --target build -t "protrack-manual-build:$sha" -f "$stage/source/deploy/Dockerfile" "$stage/source"
build_id=$(docker image inspect --format '{{.Id}}' "protrack-manual-build:$sha")
docker run --rm --network none -e NODE_ENV=test "$build_id" sh -c 'npm test && node test-unit-foundation.mjs && node test-upt-isolation.mjs && node test-gardu-induk-api.mjs && node test-warnoto-import.mjs'
container=$(docker create "$build_id" sh -c 'npm prune --omit=dev && npm cache clean --force')
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker cp "$container:/app/dist" "$stage/dist"
[[ -d "$stage/dist" && ! -L "$stage/dist" ]]
[[ -z "$(find "$stage/dist" ! -type f ! -type d -print -quit)" ]]
printf '{"sha":"%s"}\n' "$sha" > "$stage/dist/release.json"
chmod 0644 "$stage/dist/release.json"
docker start -a "$container"
docker commit --change 'ENV NODE_ENV=production' --change 'ENV PORT=4000' \
  --change "LABEL org.opencontainers.image.revision=$sha" \
  --change 'CMD ["node", "server/local-server.js"]' "$container" "protrack-manual:$sha" >/dev/null
docker rm "$container" >/dev/null
trap - EXIT
printf '%s\n' "$build_id" > "$stage/tested-build-id"
echo "Tested manual stage ready: $sha"
