#!/usr/bin/env bash
set -Eeuo pipefail
[[ -e /var/lib/protrack-deploy/BLOCKED ]] || exit 0
docker update --restart=no deploy-web-1 deploy-app-1 >/dev/null 2>&1 || true
docker stop deploy-web-1 deploy-app-1 >/dev/null 2>&1 || true
docker start protrack-maintenance >/dev/null
