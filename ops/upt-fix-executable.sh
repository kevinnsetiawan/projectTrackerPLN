#!/bin/sh
set -eu
for path in /opt/protrack/api /opt/protrack/server /opt/protrack/deploy /opt/protrack/dist /opt/protrack/ops; do
  find "$path" -type d -exec chmod 755 {} +
  find "$path" -type f -exec chmod 644 {} +
done
chmod 755 /opt/protrack/deploy/*.sh
chmod 644 /opt/protrack/package.json /opt/protrack/package-lock.json
stat -c '%a %n' /opt/protrack/deploy/backup.sh /opt/protrack/deploy/firewall.sh /opt/protrack/deploy/restore-test.sh
