#!/bin/sh
set -e

export DB_CONNECTION=sqlite
export DB_DATABASE="${DB_DATABASE:-/data/database.sqlite}"

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

exec php -S 0.0.0.0:"${PORT:-8080}" -t public public/index.php