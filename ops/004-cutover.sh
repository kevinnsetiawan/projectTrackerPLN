#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
sha=${1:?approved CI-green production commit SHA required}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
state=/var/lib/protrack-deploy
root=/opt/protrack
stage="$state/manual-stage/$sha"
snapshot=/root/protrack-gi-snapshots/warnoto-gi-004.json
expected=5eb87a24e2df5ba049c63585ff475dd999267dcadffebcf13df402709ba9fd90
repo=$state/repo.git
helpers="$state/manual-helpers/$sha"
compose=(docker compose -p deploy --env-file "$root/.env" -f "$root/deploy/docker-compose.yml" -f /etc/protrack-deploy/compose-deploy.yml)
export GIT_SSH_COMMAND='ssh -i /etc/protrack-deploy/github_readonly_ed25519 -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/protrack-deploy/github_known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15'
envfile=''
marked=0
timer_stopped=0
fail_closed() {
  docker update --restart=no deploy-web-1 deploy-app-1 >/dev/null 2>&1 || true
  docker stop deploy-web-1 deploy-app-1 >/dev/null 2>&1 || true
  docker start protrack-maintenance >/dev/null 2>&1 || true
  echo 'Cutover failed: maintenance retained; restore the recorded pre-migration backup before running old code.' >&2
}
on_exit() {
  local status=$?
  [[ -z "$envfile" ]] || rm -f -- "$envfile"
  if (( status != 0 )); then
    if (( marked )); then fail_closed; elif (( timer_stopped )); then systemctl start protrack-autodeploy.timer || true; fi
  fi
}
trap on_exit EXIT
systemctl stop protrack-autodeploy.timer
timer_stopped=1
if systemctl is-active --quiet protrack-autodeploy.service; then echo 'Deployment service is still running' >&2; exit 1; fi
exec 9>"$state/deploy.lock"
flock -n 9 || { echo 'Another deployment is active' >&2; exit 1; }
[[ ! -e "$state/BLOCKED" && -s "$state/current-sha" && -s "$stage/tested-build-id" ]]
old=$(cat "$state/current-sha")
[[ "$old" =~ ^[0-9a-f]{40}$ && "$old" != "$sha" ]]
git --git-dir="$repo" fetch --no-tags origin '+refs/heads/production:refs/remotes/origin/production'
[[ "$(git --git-dir="$repo" rev-parse refs/remotes/origin/production^{commit})" == "$sha" ]]
git --git-dir="$repo" merge-base --is-ancestor "$old" "$sha"
[[ "$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "protrack-manual:$sha")" == "$sha" ]]
[[ -d "$stage/dist" && ! -L "$stage/dist" && -z "$(find "$stage/dist" ! -type f ! -type d -print -quit)" ]]
grep -Fq "\"$sha\"" "$stage/dist/release.json"
[[ "$(sha256sum "$snapshot" | awk '{print $1}')" == "$expected" && "$(stat -c '%u:%a' "$snapshot")" == 0:600 ]]
[[ "$(docker inspect deploy-db-1 --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')" == deploy_postgres_data ]]
[[ "$(docker exec deploy-db-1 printenv POSTGRES_DB)" == protrack ]]
[[ "$(stat -c %a "$root/.env")" == 600 ]]
grep -qx 'SEED_DEMO=0' "$root/.env"
[[ "$(df -Pk /var/backups/protrack | awk 'NR==2 {print $4}')" -ge 10485760 ]]
[[ -n "$(find "$state/pve-heartbeat" -maxdepth 0 -mmin -3 -print 2>/dev/null)" ]]
[[ -d "$state/manual-helpers" && ! -L "$state/manual-helpers" && "$(stat -c '%u:%a' "$state/manual-helpers")" == 0:700 ]]
[[ -d "$helpers" && ! -L "$helpers" && "$(stat -c '%u:%a' "$helpers")" == 0:700 ]]
for file in 004-stage.sh 004-cutover.sh 004-preservation.sql 004-health.mjs 004-verify-backup.sh; do
  [[ -f "$helpers/$file" && ! -L "$helpers/$file" && "$(stat -c '%u:%a' "$helpers/$file")" == 0:600 ]]
done
[[ "$(realpath "$0")" == "$helpers/004-cutover.sh" ]]
previous="$state/dist-$old"
[[ ! -e "$previous" && ! -L "$previous" ]]
url=$(docker exec deploy-app-1 printenv DATABASE_URL)
[[ -n "$url" && "$url" != *$'\n'* ]]
envfile=$(mktemp "$state/.gi-env.XXXXXX")
printf 'GI_MIGRATION_DATABASE_URL=%s\nGI_IMPORT_DATABASE_URL=%s\n' "$url" "$url" > "$envfile"
unset url
chmod 0600 "$envfile"

backup_and_copy() {
  local before backup digest request attempt
  before=$(find /var/backups/protrack -maxdepth 1 -name 'protrack-*.dump' -printf '%f\n' | sort | tail -1)
  systemctl start protrack-backup.service
  backup=$(find /var/backups/protrack -maxdepth 1 -name 'protrack-*.dump' -printf '%f\n' | sort | tail -1)
  [[ -n "$backup" && "$backup" != "$before" ]]
  sha256sum -c "/var/backups/protrack/$backup.sha256"
  digest=$(sha256sum "/var/backups/protrack/$backup" | awk '{print $1}')
  request="$backup $digest"
  printf '%s\n' "$request" > "$state/backup.request.tmp"
  mv "$state/backup.request.tmp" "$state/backup.request"
  for attempt in {1..180}; do
    [[ -f "$state/backup.ack" && "$(cat "$state/backup.ack")" == "$request" ]] && { LAST_BACKUP="/var/backups/protrack/$backup"; return 0; }
    sleep 1
  done
  echo 'PVE acknowledgement timed out' >&2
  return 1
}
fingerprint() {
  docker exec -i deploy-db-1 sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' < "$helpers/004-preservation.sql" > "$1"
}
run_cli() {
  docker run --rm --network deploy_protrack --env-file "$envfile" -v "$snapshot:/snapshot/warnoto.json:ro" \
    "protrack-manual:$sha" node "$@"
}

printf '%s\n' "$sha" > "$state/BLOCKED"
marked=1
docker update --restart=no deploy-web-1 deploy-app-1 >/dev/null
docker stop deploy-web-1 deploy-app-1 >/dev/null
docker start protrack-maintenance >/dev/null
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://10.99.9.21:8080/)" == 503 ]]
fingerprint "$state/004-before.txt"
backup_and_copy
prebackup=$LAST_BACKUP
printf '%s\n' "$prebackup" > "$state/004-pre-migration-backup"
"$root/deploy/restore-test.sh" "$prebackup"
run_cli server/scripts/migrate-warnoto-gi.js --confirm-db=protrack
run_cli server/scripts/migrate-warnoto-gi.js --confirm-db=protrack --apply
run_cli server/scripts/import-warnoto-gi.js --snapshot=/snapshot/warnoto.json --sha256="$expected" --confirm-db=protrack
run_cli server/scripts/import-warnoto-gi.js --snapshot=/snapshot/warnoto.json --sha256="$expected" --confirm-db=protrack --apply
fingerprint "$state/004-after.txt"
cmp "$state/004-before.txt" "$state/004-after.txt"
echo 'Existing users, credentials, units and business data preserved'
mv "$root/dist" "$previous"
ln -s "$stage/dist" "$root/dist"
docker tag "protrack-manual:$sha" deploy-app:latest
"${compose[@]}" up -d --no-build --no-deps --force-recreate app
for attempt in {1..60}; do [[ "$(docker inspect -f '{{.State.Health.Status}}' deploy-app-1)" == healthy ]] && break; sleep 2; done
[[ "$(docker inspect -f '{{.State.Health.Status}}' deploy-app-1)" == healthy ]]
[[ "$(docker inspect -f '{{.Image}}' deploy-app-1)" == "$(docker image inspect -f '{{.Id}}' "protrack-manual:$sha")" ]]
docker cp "$helpers/004-health.mjs" deploy-app-1:/app/.004-health.mjs
docker exec deploy-app-1 node /app/.004-health.mjs
docker exec deploy-app-1 rm /app/.004-health.mjs
docker stop protrack-maintenance >/dev/null
"${compose[@]}" up -d --no-build --no-deps --force-recreate web
curl -fsS http://10.99.9.21:8080/release.json | grep -Fq "\"$sha\""
curl -fsS https://protrack.warnoto.com/release.json | grep -Fq "\"$sha\""
backup_and_copy
postbackup=$LAST_BACKUP
printf '%s\n' "$postbackup" > "$state/004-post-migration-backup"
"$root/deploy/restore-test.sh" "$postbackup"
bash "$helpers/004-verify-backup.sh" "$prebackup" "$postbackup"
docker update --restart=unless-stopped deploy-web-1 deploy-app-1 >/dev/null
printf '%s\n' "$sha" > "$state/current-sha.tmp"
mv "$state/current-sha.tmp" "$state/current-sha"
rm -f "$state/BLOCKED" "$state/failed-sha" "$state/approved-schema-sha"
marked=0
systemctl start protrack-autodeploy.timer
timer_stopped=0
echo "Cutover complete: $sha; pre-backup: $prebackup; post-backup: $postbackup"
