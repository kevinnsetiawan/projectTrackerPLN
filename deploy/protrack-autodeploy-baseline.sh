#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
state=/var/lib/protrack-deploy
original=/opt/protrack-release-20261105T095813Z
export GIT_SSH_COMMAND='ssh -i /etc/protrack-deploy/github_readonly_ed25519 -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/protrack-deploy/github_known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15'
install -d -m 0700 "$state"
exec 9>"$state/deploy.lock"
flock -n 9 || exit 1
[[ ! -e "$state/current-sha" && ! -e "$state/BLOCKED" ]] || { echo 'Baseline already installed or deployment blocked' >&2; exit 1; }
[[ -d "$original" && -d /opt/protrack/dist && ! -L /opt/protrack/dist ]]
if [[ ! -d "$state/repo.git" ]]; then
  git init --bare "$state/repo.git" >/dev/null
  git --git-dir="$state/repo.git" remote add origin git@github.com:udawidi/projectTrackerPLN.git
fi
git --git-dir="$state/repo.git" fetch --no-tags origin '+refs/heads/production:refs/remotes/origin/production'
sha=$(git --git-dir="$state/repo.git" rev-parse refs/remotes/origin/production^{commit})
[[ "$sha" =~ ^[a-f0-9]{40}$ ]]
tmp=$(mktemp -d "$state/baseline.XXXXXX")
trap 'rm -rf -- "$tmp"' EXIT
mkdir "$tmp/source" "$tmp/image"
git --git-dir="$state/repo.git" archive "$sha" | tar -x -C "$tmp/source"
for path in api server src index.html package.json package-lock.json vite.config.js; do
  diff -qr --strip-trailing-cr "$original/$path" "$tmp/source/$path" >/dev/null || { echo "Baseline mismatch: $path" >&2; exit 1; }
done
diff -qr "$original/dist" /opt/protrack/dist >/dev/null || { echo 'Running dist differs from verified release' >&2; exit 1; }
docker cp deploy-app-1:/app/api "$tmp/image/api"
docker cp deploy-app-1:/app/server "$tmp/image/server"
diff -qr --strip-trailing-cr "$tmp/source/api" "$tmp/image/api" >/dev/null
diff -qr --strip-trailing-cr "$tmp/source/server" "$tmp/image/server" >/dev/null
[[ "$(docker inspect deploy-db-1 --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')" == deploy_postgres_data ]]
printf '%s\n' "$sha" > "$state/current-sha.tmp"
mv "$state/current-sha.tmp" "$state/current-sha"
echo "Verified baseline: $sha"
