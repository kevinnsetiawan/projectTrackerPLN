# PLN Pro-Track — PHP 8.2 + Apache with SQLite
FROM php:8.2-apache

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip zip libzip-dev libonig-dev \
    && docker-php-ext-install pdo mbstring zip \
    && a2enmod rewrite

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# App code
COPY . .

# PHP config for public_html routing
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && a2enmod headers

# Dependencies + writable dirs
RUN composer install --no-dev --optimize-autoloader \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

CMD ["sh", "start.sh"]