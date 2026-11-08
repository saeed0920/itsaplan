#!/bin/sh
set -eu
cd /opt/itsaplan
if ! dig @1.1.1.1 +short plan.apeto.ir A | grep -qx '86.106.142.249'; then
    echo 'DNS not ready: set plan.apeto.ir A -> 86.106.142.249 (DNS only)' >&2
    exit 1
fi
certbot certonly --webroot -w /var/www/letsencrypt -d plan.apeto.ir \
    --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring
cp /etc/nginx/sites-available/itsaplan /etc/nginx/sites-available/itsaplan.previous
cp deploy/nginx.conf /etc/nginx/sites-available/itsaplan
if ! nginx -t; then
    cp /etc/nginx/sites-available/itsaplan.previous /etc/nginx/sites-available/itsaplan
    exit 1
fi
systemctl reload nginx
systemctl enable --now certbot.timer
curl --fail --silent --show-error --resolve plan.apeto.ir:443:127.0.0.1 https://plan.apeto.ir/login >/dev/null
curl --fail --silent --show-error --resolve plan.apeto.ir:443:127.0.0.1 https://plan.apeto.ir/api/ >/dev/null
printf 'HTTPS web + API checks passed. Access remains restricted until owner signup.\n'
