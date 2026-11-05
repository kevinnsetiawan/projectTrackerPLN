#!/usr/bin/env bash
set -Eeuo pipefail
systemctl start protrack-backup.service
backup=$(find /var/backups/protrack -maxdepth 1 -name 'protrack-*.dump' -printf '%f\n' | sort | tail -1)
sha256sum -c "/var/backups/protrack/$backup.sha256"
digest=$(sha256sum "/var/backups/protrack/$backup" | awk '{print $1}')
printf '%s %s\n' "$backup" "$digest" > /var/lib/protrack-deploy/backup.request.tmp
mv /var/lib/protrack-deploy/backup.request.tmp /var/lib/protrack-deploy/backup.request
echo "Request prepared: $backup"
