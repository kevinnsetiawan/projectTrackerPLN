# PLN Pro-Track — PHP 8.2 CLI + built-in server, SQLite
FROM php:8.2-cli

# System dependencies + PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip zip libzip-dev libonig-dev \
    && docker-php-ext-install pdo mbstring zip \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# App code
COPY . .

# Dependencies + writable dirs
RUN composer install --no-dev --optimize-autoloader \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Railway injects PORT (default 80)
ENV PORT 8080
EXPOSE 8080

CMD ["sh", "start.sh"]