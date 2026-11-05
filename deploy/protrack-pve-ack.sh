#!/usr/bin/env bash
set -Eeuo pipefail
exec 9>/run/protrack-pve-ack.lock
flock -n 9 || exit 0
key=/root/.ssh/protrack-backup-vm210
host=root@10.99.9.21
ssh_opts=(-i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10)
request=$(ssh "${ssh_opts[@]}" "$host" 'install -d -m 0700 /var/lib/protrack-deploy; touch /var/lib/protrack-deploy/pve-heartbeat; test ! -f /var/lib/protrack-deploy/backup.request || cat /var/lib/protrack-deploy/backup.request')
[[ -n "$request" ]] || exit 0
read -r name digest extra <<< "$request"
[[ "$name" =~ ^protrack-[0-9]{8}T[0-9]{6}Z\.dump$ && "$digest" =~ ^[a-f0-9]{64}$ && -z "${extra:-}" ]] || { echo 'Invalid backup request' >&2; exit 1; }
ack=$(ssh "${ssh_opts[@]}" "$host" 'test ! -f /var/lib/protrack-deploy/backup.ack || cat /var/lib/protrack-deploy/backup.ack')
[[ "$ack" != "$request" ]] || exit 0
/usr/local/sbin/protrack-pve-pull-backup.sh
path="/var/lib/vz/protrack-backups/$name"
test -s "$path"
[[ "$(sha256sum "$path" | awk '{print $1}')" == "$digest" ]] || { echo 'PVE copy checksum mismatch' >&2; exit 1; }
printf '%s %s\n' "$name" "$digest" | ssh "${ssh_opts[@]}" "$host" 'umask 077; cat > /var/lib/protrack-deploy/backup.ack.tmp; mv /var/lib/protrack-deploy/backup.ack.tmp /var/lib/protrack-deploy/backup.ack'
echo "Verified PVE copy $name"
