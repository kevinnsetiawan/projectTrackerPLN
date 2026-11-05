#!/bin/sh
set -eu
docker exec -i deploy-app-1 node /tmp/upt-verify.mjs < /root/protrack-admin.json
