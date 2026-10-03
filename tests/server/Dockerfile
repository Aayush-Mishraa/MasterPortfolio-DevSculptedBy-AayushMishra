# Apache + PHP 8.2 with .htaccess honoured, close to Hostinger's setup
# (which runs LiteSpeed with Apache-compatible .htaccess).
FROM php:8.2-apache

RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers expires deflate \
 && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
 && echo 'ServerName localhost' > /etc/apache2/conf-available/servername.conf \
 && a2enconf servername
