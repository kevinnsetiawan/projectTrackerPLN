#!/bin/sh
set -eu
cmp /var/lib/protrack-deploy/backup.request /var/lib/protrack-deploy/backup.ack
echo 'PVE checksum acknowledgement matched'
