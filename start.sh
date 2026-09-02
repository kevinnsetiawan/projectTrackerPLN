#!/bin/sh
set -e

export DB_CONNECTION=sqlite
export DB_DATABASE="${DB_DATABASE:-/data/database.sqlite}"

# Debug mode during troubleshooting so the JS/fatal source is visible.
export APP_ENV=production
export APP_DEBUG=true

# Ensure DB file exists and is migrated/seeded on a volume-backed path.
if [ ! -f "$DB_DATABASE" ]; then
    mkdir -p "$(dirname "$DB_DATABASE")"
    touch "$DB_DATABASE"
    php artisan migrate --force
    php artisan db:seed --force
fi

# Storage directory for uploaded files (dokumentasi).
mkdir -p storage/app/public
php artisan storage:link --force 2>/dev/null || true
php artisan config:clear

# Start PHP built-in server (routing handled by public/index.php as router).
# -d display_errors makes fatal errors visible in Railway logs during debug.
exec php -d display_errors=1 -d error_reporting='E_ALL' -S 0.0.0.0:"${PORT:-8080}" -t public public/index.php