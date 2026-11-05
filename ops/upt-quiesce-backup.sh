#!/bin/sh
set -eu
docker inspect deploy-web-1 deploy-app-1 deploy-db-1 >/dev/null
docker volume inspect deploy_postgres_data >/dev/null
mkdir -p /opt/protrack-maintenance
cat > /opt/protrack-maintenance/default.conf <<'EOF'
server {
  listen 8080;
  location / { default_type text/plain; return 503 'Pro-Track sedang dalam pemeliharaan. Silakan coba kembali nanti.\n'; }
}
EOF
docker stop deploy-web-1 deploy-app-1 >/dev/null
docker run -d --name protrack-maintenance --restart unless-stopped -p 10.99.9.21:8080:8080 -v /opt/protrack-maintenance/default.conf:/etc/nginx/conf.d/default.conf:ro nginx:1.28.0-alpine >/dev/null
code=$(curl -s -o /dev/null -w '%{http_code}' http://10.99.9.21:8080/)
[ "$code" = 503 ] || { echo "Maintenance HTTP $code" >&2; exit 1; }
echo 'Maintenance active'
systemctl start protrack-backup.service
backup=$(find /var/backups/protrack -maxdepth 1 -type f -name 'protrack-*.dump' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
[ -n "$backup" ]
sha256sum -c "$backup.sha256"
/opt/protrack/deploy/restore-test.sh "$backup"
printf 'Pre-cutover backup: %s\n' "$backup"
