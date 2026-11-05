#!/bin/sh
set -eu
docker exec -i -e VERIFY_BASE=https://protrack.warnoto.com deploy-app-1 node /tmp/upt-verify.mjs < /root/protrack-admin.json
