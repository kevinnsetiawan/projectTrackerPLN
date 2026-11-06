#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
state=/var/lib/protrack-deploy
repo=$state/repo.git
current=$state/current-sha
blocked=$state/BLOCKED
root=/opt/protrack
compose=(docker compose -p deploy --env-file "$root/.env" -f "$root/deploy/docker-compose.yml" -f /etc/protrack-deploy/compose-deploy.yml)
export GIT_SSH_COMMAND='ssh -i /etc/protrack-deploy/github_readonly_ed25519 -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/protrack-deploy/github_known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15'
install -d -m 0700 "$state" "$state/releases"
exec 9>"$state/deploy.lock"
flock -n 9 || exit 0
[[ ! -e "$blocked" ]] || { echo 'Deployment blocked; operator intervention required' >&2; exit 1; }
[[ -s "$current" && -d "$repo" ]] || { echo 'Verified baseline not installed' >&2; exit 1; }
old=$(cat "$current")
[[ "$old" =~ ^[0-9a-f]{40}$ ]] || exit 1
git --git-dir="$repo" fetch --no-tags origin '+refs/heads/production:refs/remotes/origin/production'
new=$(git --git-dir="$repo" rev-parse refs/remotes/origin/production^{commit})
[[ "$new" =~ ^[0-9a-f]{40}$ ]] || exit 1
[[ "$new" != "$old" ]] || { echo "Already deployed: $old"; exit 0; }
[[ ! -f "$state/failed-sha" || "$(cat "$state/failed-sha")" != "$new" ]] || { echo 'Candidate previously failed; operator must clear failed-sha' >&2; exit 1; }
container=''
on_exit() {
  local status=$?
  [[ -z "$container" ]] || docker rm -f "$container" >/dev/null 2>&1 || true
  if (( status != 0 )); then
    if [[ -e "$blocked" ]] && declare -F fail_closed >/dev/null; then fail_closed; fi
    printf '%s\n' "$new" > "$state/failed-sha.tmp"
    mv "$state/failed-sha.tmp" "$state/failed-sha"
  fi
}
trap on_exit EXIT
git --git-dir="$repo" merge-base --is-ancestor "$old" "$new" || { echo 'Non-fast-forward deployment refused' >&2; exit 1; }
if [[ -n "$(git --git-dir="$repo" diff --name-only "$old" "$new" -- server/_lib/schema.js server/_lib/db.js server/_lib/seedRunner.js server/scripts server/local-server.js server/local-server-pglite.mjs api/index.js deploy/Dockerfile package.json package-lock.json)" ]]; then
  [[ -f "$state/approved-schema-sha" && "$(cat "$state/approved-schema-sha")" == "$new" ]] || { echo 'Schema/dependency/startup change requires operator approval' >&2; exit 1; }
fi
[[ "$(docker inspect deploy-db-1 --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')" == deploy_postgres_data ]]
[[ "$(stat -c %a "$root/.env")" == 600 ]]
grep -qx 'SEED_DEMO=0' "$root/.env"
[[ "$(df -Pk /var/lib/docker | awk 'NR==2 {print $4}')" -ge 10485760 ]] || { echo 'Insufficient Docker disk space' >&2; exit 1; }
stage="$state/releases/$new"
[[ ! -e "$stage" ]] || { echo 'Release directory already exists; inspect manually' >&2; exit 1; }
install -d -m 0700 "$stage/source"
git --git-dir="$repo" archive "$new" | tar -x -C "$stage/source"
build="protrack-build:$new"
docker build --target build -t "$build" -f "$stage/source/deploy/Dockerfile" "$stage/source"
build_id=$(docker image inspect --format '{{.Id}}' "$build")
docker run --rm --network none -e NODE_ENV=test "$build_id" sh -c 'npm test && node test-unit-foundation.mjs && node test-upt-isolation.mjs && node test-security-matrix.mjs && node test-rbac-read-boundaries.mjs && node src/security-matrix.test.mjs'
container=$(docker create "$build_id" sh -c 'npm prune --omit=dev && npm cache clean --force')
docker cp "$container:/app/dist" "$stage/dist"
[[ -d "$stage/dist" && ! -L "$stage/dist" ]] || { echo 'Invalid dist directory' >&2; exit 1; }
[[ -z "$(find "$stage/dist" ! -type f ! -type d -print -quit)" ]] || { echo 'Dist contains symlink or special file' >&2; exit 1; }
printf '{"sha":"%s"}\n' "$new" > "$stage/dist/release.json"
chmod 0644 "$stage/dist/release.json"
docker start -a "$container"
docker commit --change 'ENV NODE_ENV=production' --change 'ENV PORT=4000' \
  --change "LABEL org.opencontainers.image.revision=$new" \
  --change 'CMD ["node", "server/local-server.js"]' "$container" "protrack-release:$new" >/dev/null
docker rm "$container" >/dev/null
container=''

backup_and_copy() {
  local before backup digest request attempt
  before=$(find /var/backups/protrack -maxdepth 1 -name 'protrack-*.dump' -printf '%f\n' | sort | tail -1)
  systemctl start protrack-backup.service
  backup=$(find /var/backups/protrack -maxdepth 1 -name 'protrack-*.dump' -printf '%f\n' | sort | tail -1)
  [[ -n "$backup" && "$backup" != "$before" ]] || { echo 'Fresh backup missing' >&2; return 1; }
  sha256sum -c "/var/backups/protrack/$backup.sha256"
  digest=$(sha256sum "/var/backups/protrack/$backup" | awk '{print $1}')
  request="$backup $digest"
  printf '%s\n' "$request" > "$state/backup.request.tmp"
  mv "$state/backup.request.tmp" "$state/backup.request"
  for attempt in {1..180}; do
    [[ -f "$state/backup.ack" && "$(cat "$state/backup.ack")" == "$request" ]] && { LAST_BACKUP="/var/backups/protrack/$backup"; return 0; }
    sleep 1
  done
  echo 'PVE backup acknowledgement timed out' >&2
  return 1
}
[[ -n "$(find "$state/pve-heartbeat" -maxdepth 0 -mmin -3 -print 2>/dev/null)" ]] || { echo 'PVE backup acknowledgement service is not ready' >&2; exit 1; }
[[ "$(df -Pk /var/backups/protrack | awk 'NR==2 {print $4}')" -ge 10485760 ]] || { echo 'Insufficient backup disk space' >&2; exit 1; }
# Once this marker exists, all failures require operator intervention.
printf '%s\n' "$new" > "$blocked"
fail_closed() {
  docker update --restart=no deploy-web-1 deploy-app-1 >/dev/null 2>&1 || true
  docker stop deploy-web-1 deploy-app-1 >/dev/null 2>&1 || true
  docker start protrack-maintenance >/dev/null 2>&1 || true
  echo 'Deployment failed; maintenance retained and retry blocked' >&2
}
wait_for_release() {
  local expected="$1" body attempt
  for attempt in {1..30}; do
    if body=$(curl -fsS --max-time 2 http://10.99.9.21:8080/release.json 2>/dev/null) && [[ "$body" == "{\"sha\":\"$expected\"}" ]]; then
      return 0
    fi
    sleep 2
  done
  echo 'Web readiness or release verification timed out' >&2
  return 1
}
docker update --restart=no deploy-web-1 deploy-app-1 >/dev/null
docker stop deploy-web-1 deploy-app-1 >/dev/null
docker start protrack-maintenance >/dev/null
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://10.99.9.21:8080/)" == 503 ]]
backup_and_copy
"$root/deploy/restore-test.sh" "$LAST_BACKUP"
previous="$state/dist-$old"
[[ ! -e "$previous" ]] || { echo 'Previous dist already exists' >&2; exit 1; }
mv "$root/dist" "$previous"
ln -s "$stage/dist" "$root/dist"
docker tag "protrack-release:$new" deploy-app:latest
"${compose[@]}" up -d --no-build --no-deps --force-recreate app
for attempt in {1..60}; do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' deploy-app-1)" == healthy ]] && break
  sleep 2
done
[[ "$(docker inspect -f '{{.State.Health.Status}}' deploy-app-1)" == healthy ]]
[[ "$(docker inspect -f '{{.Image}}' deploy-app-1)" == "$(docker image inspect -f '{{.Id}}' "protrack-release:$new")" ]]
[[ "$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' deploy-app:latest)" == "$new" ]]
docker exec deploy-app-1 node -e 'Promise.all([fetch("http://127.0.0.1:4000/api/auth/config").then(async r=>r.ok && !(await r.json()).registrationOpen),fetch("http://127.0.0.1:4000/api/projects").then(r=>r.status===401)]).then(x=>process.exit(x.every(Boolean)?0:1)).catch(()=>process.exit(1))'
docker exec deploy-db-1 sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null
docker exec deploy-app-1 node --input-type=module -e '
  import { query } from "./server/_lib/db.js";
  import { validatePolicyMatrix } from "./server/_lib/policy.js";
  await query("SELECT 1");
  const column = await query("SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND column_name=$2", ["unit_memberships", "jabatan"]);
  const constraints = await query("SELECT conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN (to_regclass($1), to_regclass($2)) AND conname=ANY($3::text[]) ORDER BY table_name", ["unit_memberships", "users", ["unit_memberships_role_check", "users_role_check"]]);
  if (column.rows.length !== 1 || constraints.rows.length !== 2 || constraints.rows.some((row) => !/asman/i.test(row.definition) || !/logistik/i.test(row.definition))) {
    console.error("Schema role/jabatan verification failed");
    process.exit(1);
  }
  let policies;
  try { policies = await query("SELECT unit_kind, revision, matrix FROM security_matrix_policies WHERE unit_kind IN ('upt','unit_induk') ORDER BY unit_kind"); } catch { console.error("Security matrix policy verification failed"); process.exit(1); }
  let validKinds = policies.rows.length === 2 && policies.rows.every((row) => ['upt','unit_induk'].includes(row.unit_kind) && Number.isInteger(row.revision) && row.revision >= 1 && row.matrix && typeof row.matrix === 'object' && !Array.isArray(row.matrix));
  try { for (const row of policies.rows) if (validKinds) validatePolicyMatrix(row.unit_kind, row.matrix); } catch { validKinds = false; }
  if (!validKinds || new Set(policies.rows.map((row) => row.unit_kind)).size !== 2) {
    console.error("Security matrix policy verification failed");
    process.exit(1);
  }
' 
docker stop protrack-maintenance >/dev/null
if ! "${compose[@]}" up -d --no-build --no-deps --force-recreate web; then
  docker stop deploy-web-1 >/dev/null 2>&1 || true
  docker start protrack-maintenance >/dev/null
  exit 1
fi
if ! wait_for_release "$new"; then
  docker stop deploy-web-1 >/dev/null 2>&1 || true
  docker start protrack-maintenance >/dev/null
  exit 1
fi
docker update --restart=unless-stopped deploy-web-1 deploy-app-1 >/dev/null
printf '%s\n' "$new" > "$current.tmp"
mv "$current.tmp" "$current"
rm -f "$blocked" "$state/approved-schema-sha" "$state/failed-sha"
echo "Deployed $new"
